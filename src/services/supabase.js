import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Serviço de nuvem não configurado 🔌' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getUserSession() {
  if (!supabase) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session.user;
}

export async function recoverFamilyCode() {
  if (!supabase) return null;
  const user = await getUserSession();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from('families')
      .select('code')
      .eq('owner_id', user.id)
      .single();

    if (error || !data) return null;
    setFamilyCode(data.code);
    return data.code;
  } catch (e) {
    console.error('Erro ao recuperar código:', e);
    return null;
  }
}

const LS_FAMILY_CODE = 'tarefas_family_code';

export function getFamilyCode() {
  return localStorage.getItem(LS_FAMILY_CODE) || null;
}

export function setFamilyCode(code) {
  if (code) {
    localStorage.setItem(LS_FAMILY_CODE, code.toUpperCase());
  } else {
    localStorage.removeItem(LS_FAMILY_CODE);
  }
}

export async function generateFamilyCode() {
  if (!supabase) return null;

  const user = await getUserSession();
  if (!user) {
    alert("Você precisa fazer login com Google para gerar um novo código.");
    return null;
  }

  const code = 'SUPER-' + Math.floor(100000 + Math.random() * 900000);
  try {
    const { error } = await supabase.from('families').insert([{ code, owner_id: user.id }]);
    if (error) {
      // Retry in case of collision
      return generateFamilyCode();
    }
    setFamilyCode(code);
    return code;
  } catch (e) {
    console.error('Falha ao gerar código de família:', e);
    return null;
  }
}

export async function joinFamily(code) {
  if (!supabase) return { success: false, error: 'Serviço de nuvem não configurado 🔌' };
  const formattedCode = code.trim().toUpperCase();
  try {
    const { data, error } = await supabase
      .from('families')
      .select('code')
      .eq('code', formattedCode)
      .single();
      
    if (error || !data) {
      return { success: false, error: 'Código de Família não encontrado! 🥺' };
    }
    
    setFamilyCode(formattedCode);
    return { success: true, code: formattedCode };
  } catch (e) {
    console.error('Falha ao conectar à família:', e);
    return { success: false, error: 'Erro de conexão com a nuvem' };
  }
}

export async function syncLocalToCloud(key, data) {
  const code = getFamilyCode();
  if (!supabase || !code) return; // Silent fallback if offline-only
  
  try {
    const { error } = await supabase
      .from('family_data')
      .upsert({
        family_code: code,
        data_key: key,
        payload: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'family_code,data_key' });
      
    if (error) {
      console.error(`Erro ao sincronizar chave ${key}:`, error);
    }
  } catch (e) {
    console.error(`Falha na conexão de sincronização para ${key}:`, e);
  }
}

function getLocalStorageKey(dataKey) {
  const keys = {
    tasks: 'tarefas_custom_list',
    order: 'tarefas_order',
    agenda: 'tarefas_school_agenda',
    events: 'tarefas_events_calendar',
    child_name: 'tarefas_child_name',
    done: 'tarefas_done',
    packed_books: 'tarefas_packed_books',
    star_balance: 'tarefas_star_balance',
    rewards: 'tarefas_rewards_list',
    redemptions: 'tarefas_redemption_requests'
  };
  return keys[dataKey] || null;
}

export async function pullCloudData() {
  const code = getFamilyCode();
  if (!supabase || !code) return false;
  
  try {
    const { data, error } = await supabase
      .from('family_data')
      .select('data_key, payload')
      .eq('family_code', code);
      
    if (error || !data) return false;
    
    let hasChanges = false;
    data.forEach(item => {
      const lsKey = getLocalStorageKey(item.data_key);
      if (lsKey) {
        const rawValue = JSON.stringify(item.payload);
        const localValue = localStorage.getItem(lsKey);
        if (localValue !== rawValue) {
          localStorage.setItem(lsKey, rawValue);
          hasChanges = true;
        }
      }
    });
    
    return hasChanges;
  } catch (e) {
    console.error('Falha ao puxar dados da nuvem:', e);
    return false;
  }
}

let subscription = null;

export function subscribeToChanges(onUpdate) {
  const code = getFamilyCode();
  if (!supabase || !code) return;
  
  if (subscription) {
    supabase.removeChannel(subscription);
  }
  
  subscription = supabase
    .channel('family-sync-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'family_data',
        filter: `family_code=eq.${code}`
      },
      async (payload) => {
        if (!payload.new || !payload.new.data_key) return;
        const dataKey = payload.new.data_key;
        const lsKey = getLocalStorageKey(dataKey);
        if (lsKey) {
          localStorage.setItem(lsKey, JSON.stringify(payload.new.payload));
          onUpdate(dataKey);
        }
      }
    )
    .subscribe();
}
