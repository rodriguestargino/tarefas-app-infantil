import { TASKS_DEFAULT } from '../data/defaultTasks.js';

const LS_ORDER      = 'tarefas_order';
const LS_DONE       = 'tarefas_done';
const LS_DATE       = 'tarefas_date';
const LS_TIMER      = 'tarefas_timer';
const LS_TASKS_LIST = 'tarefas_custom_list';
const LS_CHILD_NAME = 'tarefas_child_name';

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
  return new Date().toISOString().slice(0, 10);
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
  } catch (e) {}
}

export function saveOrder(ids) {
  try {
    store.set(LS_ORDER, JSON.stringify(ids));
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
  } catch {}
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
  return store.get(LS_CHILD_NAME) || 'Supercriança!';
}

export function setChildName(name) {
  store.set(LS_CHILD_NAME, name);
}
