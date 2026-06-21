import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  App.addListener('appUrlOpen', async (event) => {
    if (event.url.includes('access_token=')) {
      try {
        const url = new URL(event.url);
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch (e) {
        console.error('Error parsing app link:', e);
      }
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (window.location.hash.includes('access_token')) {
        // Remove hash fragment to clean up URL
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        
        // Let the user know and open the dashboard
        setTimeout(() => {
          if (window.showToast) {
            window.showToast('Login realizado com sucesso! 🎉');
          }
          if (window.openParentDashboard) {
            window.openParentDashboard();
          }
        }, 500);
      }
    }
  });
}

export async function signInWithGoogle() {
  if (!supabase) return { error: 'Serviço de nuvem não configurado 🔌' };

  let redirectTo = window.location.origin;
  if (Capacitor.isNativePlatform()) {
    redirectTo = 'com.tarefas.crianca://login-callback';
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  setFamilyCode(null);
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

export async function claimFamilyCode(code) {
  if (!supabase) return null;
  const user = await getUserSession();
  if (!user || !code) return null;

  const formattedCode = code.toUpperCase();
  try {
    const { data: family, error: fetchError } = await supabase
      .from('families')
      .select('owner_id')
      .eq('code', formattedCode)
      .single();

    if (fetchError || !family) {
      console.warn('Código não encontrado ou erro de leitura no banco:', fetchError);
      return null;
    }

    if (family.owner_id === null) {
      const { error: updateError } = await supabase
        .from('families')
        .update({ owner_id: user.id })
        .eq('code', formattedCode);

      if (!updateError) {
        console.log(`Sucesso: Código ${formattedCode} agora pertence a ${user.email}`);
        return true;
      } else {
        console.error('Erro ao registrar proprietário do código legado:', updateError);
      }
    }
  } catch (e) {
    console.error('Falha ao tentar reivindicar código:', e);
  }
  return false;
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

export async function deleteAccount() {
  if (!supabase) return { success: false, error: 'Serviço de nuvem não configurado 🔌' };
  
  try {
    const { error } = await supabase.rpc('delete_user_and_data');
    if (error) {
      return { success: false, error: error.message };
    }
    setFamilyCode(null);
    return { success: true };
  } catch (e) {
    console.error('Falha ao deletar conta:', e);
    return { success: false, error: 'Falha de conexão com o servidor' };
  }
}

