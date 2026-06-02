import { TASKS_DEFAULT } from '../data/defaultTasks.js';
import { syncLocalToCloud } from './supabase.js';

const LS_ORDER      = 'tarefas_order';
const LS_DONE       = 'tarefas_done';
const LS_DATE       = 'tarefas_date';
const LS_TIMER      = 'tarefas_timer';
const LS_TASKS_LIST = 'tarefas_custom_list';
const LS_CHILD_NAME = 'tarefas_child_name';
const LS_AGENDA       = 'tarefas_school_agenda';
const LS_PACKED_BOOKS = 'tarefas_packed_books';
const LS_EVENTS       = 'tarefas_events_calendar';
const LS_STAR_BALANCE = 'tarefas_star_balance';
const LS_REWARDS_LIST = 'tarefas_rewards_list';
const LS_REDEMPTIONS  = 'tarefas_redemption_requests';

export const store = (() => {
  const mem = {};
  let ok = false;
  try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); ok = true; }
  catch(e) { ok = false; }

  return {
    get(k)    { try { return ok ? localStorage.getItem(k)    : (mem[k]??null); } catch{ return mem[k]??null; } },
    set(k, v) { try { if(ok)  localStorage.setItem(k, v);   else mem[k]=v;   } catch{ mem[k]=v; } },
    del(k)    { try { if(ok)  localStorage.removeItem(k);   else delete mem[k]; } catch{ delete mem[k]; } },
    persistent: ok
  };
})();

export function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadTasks() {
  let list = [];
  try {
    const raw = store.get(LS_TASKS_LIST);
    list = raw ? JSON.parse(raw) : [...TASKS_DEFAULT];
  } catch (e) {
    list = [...TASKS_DEFAULT];
  }
  
  // Sort according to LS_ORDER if it exists
  try {
    const rawOrder = store.get(LS_ORDER);
    const savedOrder = rawOrder ? JSON.parse(rawOrder) : null;
    if (savedOrder && Array.isArray(savedOrder)) {
      const map = Object.fromEntries(list.map(t => [t.id, t]));
      const ordered = savedOrder.map(id => map[id]).filter(Boolean);
      list.forEach(t => { if (!savedOrder.includes(t.id)) ordered.push(t); });
      return ordered;
    }
  } catch (e) {}
  
  return list;
}

export function saveTasks(list) {
  try {
    store.set(LS_TASKS_LIST, JSON.stringify(list));
    syncLocalToCloud('tasks', list);
  } catch (e) {}
}

export function saveOrder(ids) {
  try {
    store.set(LS_ORDER, JSON.stringify(ids));
    syncLocalToCloud('order', ids);
  } catch {}
}

export function loadDone() {
  try {
    const date = store.get(LS_DATE);
    if (date !== todayStr()) return new Set();
    const raw = store.get(LS_DONE);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function saveDone(ids) {
  try {
    store.set(LS_DONE, JSON.stringify(ids));
    store.set(LS_DATE, todayStr());
    syncLocalToCloud('done', ids);
  } catch {}
}

export function processPastDaysStars() {
  try {
    const savedDate = store.get(LS_DATE);
    const today = todayStr();
    
    if (savedDate && savedDate !== today) {
      const rawDone = store.get(LS_DONE);
      if (rawDone) {
        const doneList = JSON.parse(rawDone);
        if (Array.isArray(doneList) && doneList.length > 0) {
          const currentBal = loadStarBalance();
          saveStarBalance(currentBal + doneList.length);
        }
      }
      store.set(LS_DATE, today);
      store.set(LS_DONE, JSON.stringify([]));
      syncLocalToCloud('done', []);
    }
  } catch (e) {
    console.error('Error processing past stars:', e);
  }
}

export function saveTimerState(state) {
  if (state === null) { store.del(LS_TIMER); return; }
  store.set(LS_TIMER, JSON.stringify(state));
}

export function loadTimerState() {
  try {
    const raw = store.get(LS_TIMER);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearTimerState() {
  store.del(LS_TIMER);
}

export function getChildName() {
  const raw = store.get(LS_CHILD_NAME);
  if (!raw) return 'Supercriança!';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
  } catch (e) {}
  return raw;
}

export function setChildName(name) {
  store.set(LS_CHILD_NAME, name);
  syncLocalToCloud('child_name', name);
}

const DEFAULT_AGENDA = {
  0: { subjects: "Português 📝, Matemática 🔢", books: ["Trilhas modulo 2"] },
  1: { subjects: "Porgugues, Matematica, História, Ed. Física, Informatica", books: ["Livro de Inglês", "Trilhas modulo 2"] },
  2: { subjects: "Matemática, Ingles, Portugues", books: ["Trilhas modulo 2", "Ingles"] },
  3: { subjects: "Ingles, Produção de Texto, Geografia", books: ["Ingles", "Trilhas modulo 2"] },
  4: { subjects: "Projeto de Vida, Ciencias, Projeto de Leitura, Arte", books: ["Projeto de Vida", "Trilhas modulo 2", "Arte"] },
  5: { subjects: "Dia de Descanso! 🎮", books: ["Aproveitar o fim de semana!"] },
  6: { subjects: "Preparar para a semana! 🎒", books: ["Organizar uniforme e mochila!"] }
};

export function loadSchoolAgenda() {
  try {
    const raw = store.get(LS_AGENDA);
    return raw ? JSON.parse(raw) : DEFAULT_AGENDA;
  } catch (e) {
    return DEFAULT_AGENDA;
  }
}

export function saveSchoolAgenda(agenda) {
  try {
    store.set(LS_AGENDA, JSON.stringify(agenda));
    syncLocalToCloud('agenda', agenda);
  } catch (e) {}
}

export function loadPackedBooks() {
  try {
    const raw = store.get(LS_PACKED_BOOKS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const d = new Date();
      const todayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      return { [todayIdx]: parsed };
    }
    return parsed || {};
  } catch {
    return {};
  }
}

export function savePackedBooks(booksDict) {
  try {
    store.set(LS_PACKED_BOOKS, JSON.stringify(booksDict));
    store.set(LS_DATE, todayStr());
    syncLocalToCloud('packed_books', booksDict);
  } catch {}
}

export function cleanOldPackedBooks() {
  try {
    const dict = loadPackedBooks();
    const d = new Date();
    const todayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const tomorrowIdx = (todayIdx + 1) % 7;
    const newDict = {};
    if (dict[todayIdx]) newDict[todayIdx] = dict[todayIdx];
    if (dict[tomorrowIdx]) newDict[tomorrowIdx] = dict[tomorrowIdx];
    savePackedBooks(newDict);
  } catch(e){}
}

function getOffsetDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEFAULT_EVENTS = [
  {
    id: 'default-exam',
    title: 'Prova de Ciências 🧪',
    date: getOffsetDateStr(2),
    type: 'exam',
    notified: false
  },
  {
    id: 'default-party',
    title: 'Aniversário da Ana 🎂',
    date: getOffsetDateStr(5),
    type: 'party',
    notified: false
  }
];

export function loadCalendarEvents() {
  try {
    const raw = store.get(LS_EVENTS);
    return raw ? JSON.parse(raw) : DEFAULT_EVENTS;
  } catch (e) {
    return DEFAULT_EVENTS;
  }
}

export function saveCalendarEvents(events) {
  try {
    store.set(LS_EVENTS, JSON.stringify(events));
    syncLocalToCloud('events', events);
  } catch (e) {}
}

export function loadStarBalance() {
  try {
    const raw = store.get(LS_STAR_BALANCE);
    return raw ? parseInt(raw) : 0;
  } catch {
    return 0;
  }
}

export function saveStarBalance(balance) {
  try {
    store.set(LS_STAR_BALANCE, String(balance));
    syncLocalToCloud('star_balance', balance);
  } catch {}
}

const DEFAULT_REWARDS = [
  { id: 'rwd-videogame', title: 'Jogar videogame 🎮', cost: 10 },
  { id: 'rwd-icecream', title: 'Sorvete no Domingo 🍦', cost: 15 },
  { id: 'rwd-park', title: 'Passear no Parque 🌳', cost: 25 }
];

export function loadRewardsList() {
  try {
    const raw = store.get(LS_REWARDS_LIST);
    return raw ? JSON.parse(raw) : DEFAULT_REWARDS;
  } catch {
    return DEFAULT_REWARDS;
  }
}

export function saveRewardsList(list) {
  try {
    store.set(LS_REWARDS_LIST, JSON.stringify(list));
    syncLocalToCloud('rewards', list);
  } catch {}
}

export function loadRedemptionRequests() {
  try {
    const raw = store.get(LS_REDEMPTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRedemptionRequests(list) {
  try {
    store.set(LS_REDEMPTIONS, JSON.stringify(list));
    syncLocalToCloud('redemptions', list);
  } catch {}
}
