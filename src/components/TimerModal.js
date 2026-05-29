import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { playTick, playDoneSound } from '../services/audio.js';
import { saveTimerState, clearTimerState, loadTimerState } from '../services/storage.js';

let timerInterval  = null;
let timerRemaining = 0;
let timerTotal     = 0;
let timerPaused    = false;
let activeCard     = null;
let activeTimerBtn = null;
let activeTaskId   = null;

export function getActiveTaskId() {
  return activeTaskId;
}

export function isTimerPaused() {
  return timerPaused;
}

export function isTimerRunning() {
  return timerInterval !== null;
}

export function saveCurrentTimerState() {
  if (activeTaskId === null) {
    clearTimerState();
    return;
  }
  saveTimerState({
    taskId:    activeTaskId,
    remaining: timerRemaining,
    total:     timerTotal,
    paused:    timerPaused,
    savedAt:   Date.now()
  });
}

function startCountdown(tasks, onTimerFinished) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerInterval = setInterval(() => {
    if (timerPaused) { saveCurrentTimerState(); return; }
    timerRemaining--;
    updateHourglass(timerRemaining / timerTotal);
    updateCountdown(timerRemaining);
    saveCurrentTimerState();
    if (timerRemaining <= 10 && timerRemaining > 0) {
      const display = document.getElementById('countdownDisplay');
      if (display) display.classList.add('warning');
      playTick();
      triggerHapticImpact();
    }
    if (timerRemaining <= 0) {
      clearInterval(timerInterval); timerInterval = null;
      clearTimerState();
      setSandVisible(false);
      timerDone(tasks, onTimerFinished);
    }
  }, 1000);
}

export function openTimer(e, btn, tasks, onTimerFinished) {
  if (e) e.stopPropagation();

  const card = btn.closest('.task-card');
  const tid  = parseInt(btn.dataset.tid);
  const task = tasks.find(t => t.id === tid);
  if (!task || !task.duration) return;

  triggerHapticImpact();

  if (activeTaskId === task.id && timerRemaining > 0) {
    renderTimerModal(task, timerPaused);
    if (!timerPaused) startCountdown(tasks, onTimerFinished);
    updateTimerButtons();
    return;
  }

  if (activeTaskId !== null && activeTaskId !== task.id) {
    stopTimer(false);
  }

  activeCard     = card;
  activeTimerBtn = btn;
  activeTaskId   = task.id;
  timerTotal     = task.duration;
  timerRemaining = task.duration;
  timerPaused    = false;

  renderTimerModal(task, false);
  saveCurrentTimerState();
  startCountdown(tasks, onTimerFinished);
  updateTimerButtons();
}

export function restoreTimer(tasks, onTimerFinished) {
  try {
    const saved = loadTimerState();
    if (!saved) return;
    const task = tasks.find(t => t.id === saved.taskId);
    if (!task) { clearTimerState(); return; }

    let remaining = saved.remaining;
    const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);

    if (!saved.paused && elapsed > 0) remaining -= elapsed;

    if (remaining <= 0) {
      clearTimerState();
      const card = document.querySelector(`.task-card[data-id="${task.id}"]`);
      if (card && !card.classList.contains('done')) {
        card.classList.add('done');
        if (onTimerFinished) onTimerFinished(task.id);
      }
      showToast(`⏰ ${task.name} terminou enquanto você estava fora!`);
      triggerHapticSuccess();
      return;
    }

    activeTaskId   = task.id;
    timerTotal     = saved.total;
    timerRemaining = remaining;
    timerPaused    = saved.paused;
    activeCard     = document.querySelector(`.task-card[data-id="${task.id}"]`);

    renderTimerModal(task, saved.paused);
    if (!saved.paused) startCountdown(tasks, onTimerFinished);
    updateTimerButtons();

    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${elapsedMin}min ${elapsedSec}s`;
    showToast(`⏱️ Timer restaurado! (${elapsedStr} decorrido${saved.paused ? ' — pausado' : ''})`);

  } catch (e) { clearTimerState(); }
}

function renderTimerModal(task, paused) {
  const modalEmojiEl = document.getElementById('modalEmoji');
  const modalLabelEl = document.getElementById('modalLabel');
  const timerBtnsEl = document.getElementById('timerBtns');
  const timerDoneMsgEl = document.getElementById('timerDoneMsg');
  const pauseBtnEl = document.getElementById('pauseBtn');
  const displayEl = document.getElementById('countdownDisplay');
  const timerLabelEl = document.getElementById('timerLabel');
  const modalEl = document.getElementById('timerModal');

  if (modalEmojiEl) modalEmojiEl.textContent = task.emoji;
  if (modalLabelEl) modalLabelEl.textContent = task.name;
  if (timerBtnsEl) timerBtnsEl.style.display = 'flex';
  if (timerDoneMsgEl) timerDoneMsgEl.classList.remove('show');
  if (pauseBtnEl) pauseBtnEl.textContent = paused ? '▶ Continuar' : '⏸ Pausar';
  if (displayEl) displayEl.classList.remove('warning');
  if (timerLabelEl) timerLabelEl.textContent = paused ? '⏸ pausado' : 'em andamento...';
  
  updateHourglass(timerRemaining / timerTotal);
  updateCountdown(timerRemaining);
  
  if (modalEl) modalEl.classList.add('show');
  setSandVisible(!paused);
}

export function pauseTimer() {
  timerPaused = !timerPaused;
  const pauseBtnEl = document.getElementById('pauseBtn');
  const timerLabelEl = document.getElementById('timerLabel');
  if (pauseBtnEl) pauseBtnEl.textContent = timerPaused ? '▶ Continuar' : '⏸ Pausar';
  if (timerLabelEl) timerLabelEl.textContent = timerPaused ? '⏸ pausado' : 'em andamento...';
  setSandVisible(!timerPaused);
  saveCurrentTimerState();
  updateTimerButtons();
  triggerHapticImpact();
}

export function stopTimer(close = true) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerPaused = false; activeCard = null; activeTaskId = null;
  setSandVisible(false);
  clearTimerState();
  updateTimerButtons();
  triggerHapticImpact();
  const modalEl = document.getElementById('timerModal');
  if (close && modalEl) modalEl.classList.remove('show');
}

function timerDone(tasks, onTimerFinished) {
  playDoneSound(); updateHourglass(0);
  triggerHapticSuccess();
  const timerBtnsEl = document.getElementById('timerBtns');
  const timerDoneMsgEl = document.getElementById('timerDoneMsg');
  const timerLabelEl = document.getElementById('timerLabel');
  const displayEl = document.getElementById('countdownDisplay');

  if (timerBtnsEl) timerBtnsEl.style.display = 'none';
  if (timerDoneMsgEl) timerDoneMsgEl.classList.add('show');
  if (timerLabelEl) timerLabelEl.textContent = '🎊 concluído!';
  if (displayEl) displayEl.textContent = '00:00';
  
  const modal = document.getElementById('timerModal');
  if (modal && !modal.classList.contains('show')) {
    const task = tasks.find(t => t.id === activeTaskId);
    if (task) {
      showToast(`🎉 ${task.name} concluído!`);
    }
  }

  const finishedId = activeTaskId;
  activeTaskId = null;
  updateTimerButtons();
  
  if (onTimerFinished) onTimerFinished(finishedId);
}

export function finishTimer(onDoneMarked) {
  if (activeCard) {
    activeCard.classList.add('done');
    if (onDoneMarked) onDoneMarked(activeTaskId);
  }
  activeTaskId = null;
  triggerHapticSuccess();
  stopTimer(true);
}

export function closeTimerModal() {
  const modal = document.getElementById('timerModal');
  if (modal) modal.classList.remove('show');
  triggerHapticImpact();
}

export function updateTimerButtons() {
  document.querySelectorAll('.timer-start-btn').forEach(btn => {
    btn.textContent = '⏱️ Iniciar';
    btn.className = 'timer-start-btn';
  });
  if (activeTaskId !== null) {
    const activeBtn = document.querySelector(`.timer-start-btn[data-tid="${activeTaskId}"]`);
    if (activeBtn) {
      if (timerPaused) {
        activeBtn.textContent = '⏱️ Retomar';
        activeBtn.classList.add('paused');
      } else {
        activeBtn.textContent = '⏱️ Rodando';
        activeBtn.classList.add('running');
      }
    }
  }
}

function updateHourglass(p) {
  p = Math.max(0, Math.min(1, p));
  const tY  = 13 + (1-p)*71, tX = 40*p;
  const topSand = document.getElementById('topSand');
  if (topSand) topSand.setAttribute('points', `${50-tX},${tY} ${50+tX},${tY} 50,84`);
  
  const filled = 1-p;
  const bY = 167 - filled*71, bX = 40*filled;
  const bottomSand = document.getElementById('bottomSand');
  if (bottomSand) bottomSand.setAttribute('points', `${50-bX},${bY} ${50+bX},${bY} 90,167 10,167`);
}

function updateCountdown(s) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const r = (s%60).toString().padStart(2,'0');
  const display = document.getElementById('countdownDisplay');
  if (display) display.textContent = `${m}:${r}`;
}

function setSandVisible(v) {
  ['sp1','sp2','sp3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.visibility = v ? 'visible' : 'hidden';
  });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}
