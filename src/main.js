import { TASKS_DEFAULT } from './data/defaultTasks.js';
import {
  store,
  loadTasks,
  saveTasks,
  saveOrder,
  loadDone,
  saveDone,
  todayStr,
  resetPackedBooks
} from './services/storage.js';
import { triggerHapticImpact, triggerHapticSuccess } from './services/haptics.js';
import { renderAgenda, getSelectedDayIdx, setSelectedDayIdx } from './components/AgendaSection.js';
import { warmUpAudio } from './services/audio.js';
import { renderTasks } from './components/TaskCard.js';
import { updateStars, updateProgress } from './components/ProgressSection.js';
import {
  openTimer,
  restoreTimer,
  pauseTimer,
  stopTimer,
  finishTimer,
  closeTimerModal,
  getActiveTaskId
} from './components/TimerModal.js';
import {
  initChildName,
  saveKidName,
  openSettingsModal,
  closeSettingsModal,
  renderSettingsTasksList,
  showTaskForm,
  hideTaskForm,
  saveTaskDetails
} from './components/SettingsModal.js';

/* ═══════════════ APP STATE ═══════════════ */
let TASKS = loadTasks();
const doneSaved = loadDone();
const grid = document.getElementById('tasksGrid');

/* ═══════════════ CORE HANDLERS ═══════════════ */
function toggleDone(e, card) {
  if (e) e.stopPropagation();
  const wasDone = card.classList.contains('done');
  card.classList.toggle('done');
  
  const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
  saveDone(ids);
  updateProgress(TASKS);
  
  if (!wasDone) {
    triggerHapticSuccess();
  } else {
    triggerHapticImpact();
  }
}

function handleOpenTimer(e, btn) {
  openTimer(e, btn, TASKS, (finishedId) => {
    // When timer finishes naturally (reaches 0)
    const card = grid.querySelector(`.task-card[data-id="${finishedId}"]`);
    if (card) {
      card.classList.add('done');
      const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
      saveDone(ids);
      updateProgress(TASKS);
    }
  });
}

function swapCards(card1, card2) {
  const list = [...grid.querySelectorAll('.task-card')];
  const i1 = list.indexOf(card1);
  const i2 = list.indexOf(card2);
  if (i1 === -1 || i2 === -1 || i1 === i2) return;

  const parent = card1.parentNode;
  const next2 = card2.nextSibling;
  if (next2 === card1) {
    parent.insertBefore(card1, card2);
  } else {
    parent.insertBefore(card2, card1);
    parent.insertBefore(card1, next2);
  }

  const ids = [...grid.querySelectorAll('.task-card')].map(c => parseInt(c.dataset.id));
  saveOrder(ids);

  // Update memory order
  const map = Object.fromEntries(TASKS.map(t => [t.id, t]));
  TASKS = ids.map(id => map[id]).filter(Boolean);

  triggerHapticImpact();
}

function handleEditTask(taskId) {
  showTaskForm(taskId, TASKS);
}

function handleDeleteTask(taskId) {
  if (confirm('Tem certeza que quer excluir esta atividade? 🥺')) {
    TASKS = TASKS.filter(t => t.id !== taskId);
    saveTasks(TASKS);
    
    // Save order
    const updatedIds = TASKS.map(t => t.id);
    saveOrder(updatedIds);
    
    // If the deleted task was the active timer task, stop it
    if (getActiveTaskId() === taskId) {
      stopTimer(true);
    }
    
    // Re-render settings list
    renderSettingsTasksList(TASKS, handleEditTask, handleDeleteTask);
    
    // Re-render main list
    const currentDone = loadDone();
    renderTasks(TASKS, currentDone, toggleDone, handleOpenTimer, swapCards);
    updateStars(TASKS.length);
    updateProgress(TASKS);
    
    triggerHapticImpact();
    showToast('🗑️ Atividade excluída!');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

/* ═══════════════ GLOBAL WINDOW BINDINGS ═══════════════ */
window.closeTimerModal = () => {
  closeTimerModal();
};

window.pauseTimer = () => {
  pauseTimer();
};

window.stopTimer = () => {
  stopTimer(true);
};

window.finishTimer = () => {
  finishTimer((finishedId) => {
    // When completed via "Marcar como feita!" button in modal
    const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
    saveDone(ids);
    updateProgress(TASKS);
  });
};

window.closeSettingsModal = () => {
  closeSettingsModal();
};

window.saveKidName = () => {
  saveKidName();
};

window.openSettingsModal = () => {
  openSettingsModal(TASKS, () => {
    renderSettingsTasksList(TASKS, handleEditTask, handleDeleteTask);
  });
};

window.showTaskForm = () => {
  showTaskForm(null, TASKS);
};

window.hideTaskForm = () => {
  hideTaskForm();
};

window.saveTaskDetails = () => {
  saveTaskDetails(TASKS, () => {
    hideTaskForm();
    
    const updatedIds = TASKS.map(t => t.id);
    saveOrder(updatedIds);
    
    renderSettingsTasksList(TASKS, handleEditTask, handleDeleteTask);
    
    const currentDone = loadDone();
    renderTasks(TASKS, currentDone, toggleDone, handleOpenTimer, swapCards);
    updateStars(TASKS.length);
    updateProgress(TASKS);
  });
};

let lastCheckDate = todayStr();

function updateDayHighlight() {
  const dayBtns = document.querySelectorAll('#slideTasks .day-btn');
  dayBtns.forEach(b => b.classList.remove('active'));
  const todayIdx = new Date().getDay(); // 0 = Sunday
  const btnIdx = todayIdx === 0 ? 6 : todayIdx - 1; // 0 = Seg, ..., 6 = Dom
  if (dayBtns[btnIdx]) {
    dayBtns[btnIdx].classList.add('active');
  }
}

window.setAgendaSelectedDay = (idx) => {
  setSelectedDayIdx(idx);
  renderAgenda();
  triggerHapticImpact();
  const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
  showToast(`📅 Dia selecionado: ${dayNames[idx]}!`);
};

function checkDateChange() {
  const currentToday = todayStr();
  if (currentToday !== lastCheckDate) {
    lastCheckDate = currentToday;
    
    // Reset manual override on date transition
    setSelectedDayIdx(null);
    
    // Automatically reset tasks
    grid.querySelectorAll('.task-card').forEach(c => c.classList.remove('done'));
    saveDone([]);
    resetPackedBooks();
    updateProgress(TASKS);
    stopTimer(true);
    
    // Update the day of the week highlight
    updateDayHighlight();
    
    // Re-render today's agenda
    renderAgenda();
    
    showToast('🌅 Novo dia começou! Tarefas reiniciadas! 🌟');
  }
}

/* ═══════════════ SLIDING NAVIGATION & GESTURES ═══════════════ */
let currentSlide = 0;

window.slideToSlide = (index) => {
  const slides = document.getElementById('appSlides');
  const dots = document.querySelectorAll('.nav-dot');
  if (!slides) return;

  currentSlide = index;
  slides.style.transform = `translateX(-${index * 50}%)`;
  
  dots.forEach((dot, idx) => {
    if (idx === index) dot.classList.add('active');
    else dot.classList.remove('active');
  });

  triggerHapticImpact();
};

window.slideToTasks = () => window.slideToSlide(0);
window.slideToAgenda = () => window.slideToSlide(1);

let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
  const diffX = touchStartX - e.changedTouches[0].screenX;
  const diffY = touchStartY - e.changedTouches[0].screenY;

  // Swipe left: diffX > 0 -> go to slide 1 (Agenda)
  // Swipe right: diffX < 0 -> go to slide 0 (Tasks)
  if (Math.abs(diffX) > 60 && Math.abs(diffY) < 60) {
    if (diffX > 0 && currentSlide === 0) {
      window.slideToSlide(1);
    } else if (diffX < 0 && currentSlide === 1) {
      window.slideToSlide(0);
    }
  }
}

window.resetAll = () => {
  grid.querySelectorAll('.task-card').forEach(c => c.classList.remove('done'));
  saveDone([]);
  updateProgress(TASKS);
  stopTimer(true);
  triggerHapticImpact();
  showToast('🔄 Recomeçado!');
};

/* ═══════════════ INITIALIZATION ═══════════════ */
function init() {
  // Warm up audio context on first user interaction
  document.addEventListener('pointerdown', () => {
    warmUpAudio();
  }, { once: true });

  // Init UI parts
  initChildName();
  renderTasks(TASKS, doneSaved, toggleDone, handleOpenTimer, swapCards);
  updateStars(TASKS.length);
  updateProgress(TASKS);

  // Render agenda
  renderAgenda();

  // Initialize and update day highlight (strictly automatic system date for Tasks slide)
  updateDayHighlight();

  // Setup swipe listeners
  const viewport = document.querySelector('.app-viewport');
  if (viewport) {
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewport.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // Setup periodic check and focus listeners to reset tasks on day changes
  setInterval(checkDateChange, 10000);
  document.addEventListener('visibilitychange', checkDateChange);
  window.addEventListener('focus', checkDateChange);

  // Restore running timer if any
  restoreTimer(TASKS, (finishedId) => {
    const card = grid.querySelector(`.task-card[data-id="${finishedId}"]`);
    if (card) {
      card.classList.add('done');
      const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
      saveDone(ids);
      updateProgress(TASKS);
    }
  });
}

// Start
init();
