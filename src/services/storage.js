import { TASKS_DEFAULT } from '../data/defaultTasks.js';

const LS_ORDER      = 'tarefas_order';
const LS_DONE       = 'tarefas_done';
const LS_DATE       = 'tarefas_date';
const LS_TIMER      = 'tarefas_timer';
const LS_TASKS_LIST = 'tarefas_custom_list';
const LS_CHILD_NAME = 'tarefas_child_name';
const LS_AGENDA       = 'tarefas_school_agenda';
const LS_PACKED_BOOKS = 'tarefas_packed_books';

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
  } catch (e) {}
}

export function loadPackedBooks() {
  try {
    const date = store.get(LS_DATE);
    if (date !== todayStr()) return [];
    const raw = store.get(LS_PACKED_BOOKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePackedBooks(books) {
  try {
    store.set(LS_PACKED_BOOKS, JSON.stringify(books));
    store.set(LS_DATE, todayStr());
  } catch {}
}

export function resetPackedBooks() {
  savePackedBooks([]);
}
