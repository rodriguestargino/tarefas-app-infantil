import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

/* ═══════════════ CAPACITOR NATIVE INTEGRATIONS ═══════════════ */
async function triggerHapticImpact() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Fail silently in browser
  }
}

async function triggerHapticSuccess() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // Fail silently in browser
  }
}

async function initializeStatusBar() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#b8e4ff' }); // Sky blue header matching gradient
  } catch (e) {
    // Fail silently in browser
  }
}

// Call on startup
initializeStatusBar();

/* ═══════════════ SAFE STORAGE WRAPPER ═══════════════
   Chrome on Android blocks localStorage on file:// with a SecurityError.
   This wrapper silently falls back to an in-memory store so the app
   always renders, and persists whenever the browser allows it.
*/
const store = (() => {
  const mem = {};                          // in-memory fallback
  let ok = false;
  try { localStorage.setItem('__t','1'); localStorage.removeItem('__t'); ok = true; }
  catch(e) { ok = false; }

  return {
    get(k)    { try { return ok ? localStorage.getItem(k)    : (mem[k]??null); } catch{ return mem[k]??null; } },
    set(k, v) { try { if(ok)  localStorage.setItem(k, v);   else mem[k]=v;   } catch{ mem[k]=v; } },
    del(k)    { try { if(ok)  localStorage.removeItem(k);   else delete mem[k]; } catch{ delete mem[k]; } },
    persistent: ok   // lets us show a warning if needed
  };
})();

/* ═══════════════ TASK DATA ═══════════════ */
const TASKS_DEFAULT = [
  { id:1, name:'Almoçar',          emoji:'🍽️', color:'orange', duration:0,    timeLabel:'12h00'        },
  { id:2, name:'Telas',            emoji:'📱', color:'purple', duration:3600, timeLabel:'1 horinha'    },
  { id:3, name:'Arrumar o Quarto', emoji:'🛏️', color:'blue',   duration:900,  timeLabel:'15 minutos'   },
  { id:4, name:'Jantar',           emoji:'🍜', color:'yellow', duration:0,    timeLabel:'19h00'        },
  { id:5, name:'Tomar Banho',      emoji:'🛁', color:'teal',   duration:900,  timeLabel:'15 minutos'   },
  { id:6, name:'Escovar os Dentes',emoji:'🦷', color:'pink',   duration:120,  timeLabel:'2 minutinhos' },
  { id:7, name:'Dormir',           emoji:'🌙', color:'mint',   duration:0,    timeLabel:'20h – 21h'    },
  { id:8, name:'Fazer Tarefas',    emoji:'📚', color:'red',    duration:1800, timeLabel:'30 minutos'   },
];

/* ═══════════════ PERSISTENCE ═══════════════ */
const LS_ORDER      = 'tarefas_order';
const LS_DONE       = 'tarefas_done';
const LS_DATE       = 'tarefas_date';
const LS_TIMER      = 'tarefas_timer';
const LS_TASKS_LIST = 'tarefas_custom_list';
const LS_CHILD_NAME = 'tarefas_child_name';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadTasks() {
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

function saveTasks(list) {
  try {
    store.set(LS_TASKS_LIST, JSON.stringify(list));
  } catch (e) {}
}

function saveOrder() {
  try {
    const ids = [...grid.querySelectorAll('.task-card')].map(c => parseInt(c.dataset.id));
    store.set(LS_ORDER, JSON.stringify(ids));
  } catch {}
}

function loadDone() {
  try {
    const date = store.get(LS_DATE);
    if (date !== todayStr()) return new Set();
    const raw = store.get(LS_DONE);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveDone() {
  try {
    const ids = [...document.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
    store.set(LS_DONE, JSON.stringify(ids));
    store.set(LS_DATE, todayStr());
  } catch {}
}

// Initialise from storage
let TASKS       = loadTasks();
const doneSaved = loadDone();

/* ═══════════════ RENDER ═══════════════ */
const grid = document.getElementById('tasksGrid');

function renderTasks() {
  grid.innerHTML = '';
  TASKS.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id    = t.id;
    card.dataset.color = t.color;
    card.draggable = true;

    card.innerHTML = `
      <div class="grip"><span></span><span></span><span></span></div>
      <div class="task-emoji">${t.emoji}</div>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        <div class="task-time">⏰ ${t.timeLabel}</div>
      </div>
      <div class="card-right">
        ${t.duration ? `<button class="timer-start-btn" data-tid="${t.id}" onclick="openTimer(event,this)">⏱️ Iniciar</button>` : ''}
        <div class="check-circle" onclick="toggleDone(event,this.closest('.task-card'))">
          <span class="check-icon">✓</span>
        </div>
      </div>`;

    // Desktop drag
    card.addEventListener('dragstart',  onDragStart);
    card.addEventListener('dragend',    onDragEnd);
    card.addEventListener('dragover',   onDragOver);
    card.addEventListener('dragleave',  onDragLeave);
    card.addEventListener('drop',       onDrop);

    // Touch drag
    card.addEventListener('touchstart', onTouchStart, { passive:true });
    card.addEventListener('touchmove',  onTouchMove,  { passive:false });
    card.addEventListener('touchend',   onTouchEnd);

    // Restore done state from localStorage
    if (doneSaved.has(t.id)) card.classList.add('done');

    grid.appendChild(card);
  });

  updateStars();
  updateTimerButtons();
}

function updateStars() {
  const sr = document.getElementById('starsRow');
  sr.innerHTML = '';
  for (let i = 0; i < TASKS.length; i++) {
    const s = document.createElement('span');
    s.className = 'star-item';
    s.textContent = '⭐';
    sr.appendChild(s);
  }
}

/* ═══════════════ PROGRESS ═══════════════ */
document.getElementById('totalCount').textContent = TASKS.length;

const dayBtns = document.querySelectorAll('.day-btn');
const todayIdx = new Date().getDay(); // 0=Sun
const btnIdx = todayIdx === 0 ? 6 : todayIdx - 1;
dayBtns[btnIdx]?.classList.add('active');

function setDay(btn) {
  dayBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  triggerHapticImpact();
}

function toggleDone(e, card) {
  e.stopPropagation();
  const wasDone = card.classList.contains('done');
  card.classList.toggle('done');
  saveDone();
  updateProgress();
  
  if (!wasDone) {
    triggerHapticSuccess();
  } else {
    triggerHapticImpact();
  }
}

function updateProgress() {
  const done = document.querySelectorAll('.task-card.done').length;
  const total = TASKS.length;
  document.getElementById('doneCount').textContent = done;
  document.getElementById('progressFill').style.width = (done / total * 100) + '%';
  const stars = document.querySelectorAll('.star-item');
  const lit = Math.round(done / total * stars.length);
  stars.forEach((s, i) => i < lit ? s.classList.add('lit') : s.classList.remove('lit'));
  const cel = document.getElementById('celebration');
  if (done === total) {
    cel.classList.add('show');
    launchConfetti();
    triggerHapticSuccess();
  }
  else cel.classList.remove('show');
}

function resetAll() {
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('done'));
  saveDone();
  updateProgress();
  stopTimer();
  triggerHapticImpact();
  showToast('🔄 Recomeçado!');
}

/* ═══════════════ CONFETTI ═══════════════ */
function launchConfetti() {
  const emo = ['🎊','⭐','🌟','💫','🎉','🏆','❤️','🥳'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.textContent = emo[Math.floor(Math.random()*emo.length)];
    el.style.cssText = `position:fixed;font-size:${1+Math.random()*1.5}rem;left:${Math.random()*100}vw;top:-40px;z-index:9999;animation:fall ${1.5+Math.random()*2}s ease-in forwards;animation-delay:${Math.random()}s;pointer-events:none`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

/* ═══════════════ DESKTOP DRAG & DROP ═══════════════ */
let dragSrc = null;

function onDragStart(e) {
  dragSrc = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
  triggerHapticImpact();
}
function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  dragSrc = null;
}
function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this !== dragSrc) {
    document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
    this.classList.add('drag-over');
  }
}
function onDragLeave() {
  this.classList.remove('drag-over');
}
function onDrop(e) {
  e.stopPropagation();
  if (dragSrc && dragSrc !== this) {
    swapCards(dragSrc, this);
  }
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
}

/* ═══════════════ TOUCH DRAG ═══════════════ */
let touchSrc       = null;
let touchGhost     = null;
let touchOffX      = 0;
let touchOffY      = 0;

function onTouchStart(e) {
  // Only start drag if touch was on grip handle or its children
  const grip = e.target.closest('.grip');
  if (!grip) return;

  const card = this;
  
  // Instant haptic feedback for drag start
  triggerHapticImpact();
  
  touchSrc = card;

  const rect = card.getBoundingClientRect();
  touchOffX = e.touches[0].clientX - rect.left;
  touchOffY = e.touches[0].clientY - rect.top;

  // Create ghost clone
  touchGhost = card.cloneNode(true);
  touchGhost.id = 'touchGhost';
  touchGhost.style.cssText = `
    position:fixed; z-index:9998; pointer-events:none;
    width:${rect.width}px; left:${rect.left}px; top:${rect.top}px;
    border-radius:22px; box-shadow:0 16px 48px rgba(0,0,0,.4);
    opacity:.92; transform:scale(1.06) rotate(2deg);
  `;
  document.body.appendChild(touchGhost);
  card.classList.add('dragging');
}

function onTouchMove(e) {
  if (!touchGhost) return;

  e.preventDefault();
  const tx = e.touches[0].clientX;
  const ty = e.touches[0].clientY;

  touchGhost.style.left = (tx - touchOffX) + 'px';
  touchGhost.style.top  = (ty - touchOffY) + 'px';

  // Find card under finger
  touchGhost.style.visibility = 'hidden';
  const el = document.elementFromPoint(tx, ty);
  touchGhost.style.visibility = 'visible';

  const target = el?.closest('.task-card');
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  if (target && target !== touchSrc) {
    if (!target.classList.contains('drag-over')) {
      triggerHapticImpact(); // gentle tap when hovering over a new swap target
    }
    target.classList.add('drag-over');
  }
}

function onTouchEnd(e) {
  if (!touchGhost || !touchSrc) { cleanup(); return; }

  const touch = e.changedTouches[0];
  touchGhost.style.visibility = 'hidden';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const target = el?.closest('.task-card');

  if (target && target !== touchSrc) {
    swapCards(touchSrc, target);
  }
  cleanup();
}

function cleanup() {
  if (touchGhost) { touchGhost.remove(); touchGhost = null; }
  if (touchSrc)   { touchSrc.classList.remove('dragging'); touchSrc = null; }
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
}

/* ═══════════════ SWAP / REORDER ═══════════════ */
function swapCards(src, dst) {
  const cards = [...grid.querySelectorAll('.task-card')];
  const si = cards.indexOf(src);
  const di = cards.indexOf(dst);

  // Determine insertion point
  if (si < di) {
    grid.insertBefore(src, dst.nextSibling);
  } else {
    grid.insertBefore(src, dst);
  }

  // Animate the moved card
  src.style.animation = 'none';
  src.offsetHeight; // reflow
  src.style.animation = 'cardLand .3s cubic-bezier(.34,1.56,.64,1)';

  // Persist new order
  saveOrder();
  triggerHapticImpact();
  showToast('💾 Ordem salva!');
}

/* ═══════════════ TIMER ═══════════════ */
let timerInterval  = null;
let timerRemaining = 0;
let timerTotal     = 0;
let timerPaused    = false;
let activeCard     = null;
let activeTimerBtn = null;
let activeTaskId   = null;   // track by id so restore can find card/btn
let audioCtx       = null;

/* ── Audio ── */
function getACtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
document.addEventListener('pointerdown', function warmUp() {
  const c = getACtx(); if (c.state === 'suspended') c.resume();
  document.removeEventListener('pointerdown', warmUp);
}, true);

function playTick() {
  const c = getACtx();
  const play = () => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = 1100;
    g.gain.setValueAtTime(.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .08);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + .09);
  };
  c.state === 'suspended' ? c.resume().then(play) : play();
}
function playDoneSound() {
  const c = getACtx();
  const play = () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = c.currentTime + i * .2;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(.35, t + .05);
      g.gain.exponentialRampToValueAtTime(.001, t + 1.0);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 1.0);
    });
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = 'sine'; o2.frequency.value = 1568;
    const t2 = c.currentTime + .75;
    g2.gain.setValueAtTime(0, t2); g2.gain.linearRampToValueAtTime(.2, t2+.05);
    g2.gain.exponentialRampToValueAtTime(.001, t2+1.2);
    o2.connect(g2); g2.connect(c.destination);
    o2.start(t2); o2.stop(t2+1.2);
  };
  c.state === 'suspended' ? c.resume().then(play) : play();
}

/* ── Timer localStorage ── */
function saveTimerState() {
  if (activeTaskId === null) { store.del(LS_TIMER); return; }
  store.set(LS_TIMER, JSON.stringify({
    taskId:    activeTaskId,
    remaining: timerRemaining,
    total:     timerTotal,
    paused:    timerPaused,
    savedAt:   Date.now()          // wall-clock so we can compute elapsed
  }));
}
function clearTimerState() { store.del(LS_TIMER); }

/* ── Core countdown loop ── */
function startCountdown() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerInterval = setInterval(() => {
    if (timerPaused) { saveTimerState(); return; }
    timerRemaining--;
    updateHourglass(timerRemaining / timerTotal);
    updateCountdown(timerRemaining);
    saveTimerState();                               // persist every second
    if (timerRemaining <= 10 && timerRemaining > 0) {
      document.getElementById('countdownDisplay').classList.add('warning');
      playTick();
      triggerHapticImpact(); // vibrate slightly on final countdown ticks
    }
    if (timerRemaining <= 0) {
      clearInterval(timerInterval); timerInterval = null;
      clearTimerState();
      setSandVisible(false);
      timerDone();
    }
  }, 1000);
}

/* ── Open timer from button click ── */
function openTimer(e, btn) {
  e.stopPropagation();
  const c = getACtx(); if (c.state === 'suspended') c.resume();

  const card = btn.closest('.task-card');
  const tid  = parseInt(btn.dataset.tid);
  const task = TASKS.find(t => t.id === tid);
  if (!task || !task.duration) return;

  triggerHapticImpact();

  // If this task has an active timer and is already selected, resume it
  if (activeTaskId === task.id && timerRemaining > 0) {
    renderTimerModal(task, timerPaused);
    if (!timerPaused) startCountdown();
    updateTimerButtons();
    return;
  }

  // If another timer is running, stop it first
  if (activeTaskId !== null && activeTaskId !== task.id) {
    stopTimer(false);
  }

  activeCard    = card;
  activeTimerBtn = btn;
  activeTaskId  = task.id;
  timerTotal    = task.duration;
  timerRemaining = task.duration;
  timerPaused   = false;

  renderTimerModal(task, false);
  saveTimerState();
  startCountdown();
  updateTimerButtons();
}

/* ── Restore timer on page load ── */
function restoreTimerState() {
  try {
    const raw = store.get(LS_TIMER);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const task  = TASKS.find(t => t.id === saved.taskId);
    if (!task) { clearTimerState(); return; }

    // Calculate how much time passed while the page was closed
    let remaining = saved.remaining;
    const elapsed = Math.floor((Date.now() - saved.savedAt) / 1000);

    if (!saved.paused && elapsed > 0) remaining -= elapsed;

    if (remaining <= 0) {
      // Timer finished while away — mark task done and notify
      clearTimerState();
      const card = document.querySelector(`.task-card[data-id="${task.id}"]`);
      if (card && !card.classList.contains('done')) {
        card.classList.add('done');
        saveDone(); updateProgress();
      }
      showToast(`⏰ ${task.name} terminou enquanto você estava fora!`);
      triggerHapticSuccess();
      return;
    }

    // Restore state
    activeTaskId   = task.id;
    timerTotal     = saved.total;
    timerRemaining = remaining;
    timerPaused    = saved.paused;

    // Reconnect card reference
    activeCard     = document.querySelector(`.task-card[data-id="${task.id}"]`);

    renderTimerModal(task, saved.paused);
    if (!saved.paused) startCountdown();
    updateTimerButtons();

    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedSec = elapsed % 60;
    const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${elapsedMin}min ${elapsedSec}s`;
    showToast(`⏱️ Timer restaurado! (${elapsedStr} decorrido${saved.paused ? ' — pausado' : ''})`);

  } catch { clearTimerState(); }
}

/* ── Shared modal renderer ── */
function renderTimerModal(task, paused) {
  document.getElementById('modalEmoji').textContent = task.emoji;
  document.getElementById('modalLabel').textContent = task.name;
  document.getElementById('timerBtns').style.display = 'flex';
  document.getElementById('timerDoneMsg').classList.remove('show');
  document.getElementById('pauseBtn').textContent = paused ? '▶ Continuar' : '⏸ Pausar';
  document.getElementById('countdownDisplay').classList.remove('warning');
  document.getElementById('timerLabel').textContent = paused ? '⏸ pausado' : 'em andamento...';
  updateHourglass(timerRemaining / timerTotal);
  updateCountdown(timerRemaining);
  document.getElementById('timerModal').classList.add('show');
  setSandVisible(!paused);
}

/* ── Pause / Stop / Done ── */
function pauseTimer() {
  timerPaused = !timerPaused;
  document.getElementById('pauseBtn').textContent = timerPaused ? '▶ Continuar' : '⏸ Pausar';
  document.getElementById('timerLabel').textContent = timerPaused ? '⏸ pausado' : 'em andamento...';
  setSandVisible(!timerPaused);
  saveTimerState();
  updateTimerButtons();
  triggerHapticImpact();
}

function stopTimer(close = true) {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  timerPaused = false; activeCard = null; activeTaskId = null;
  setSandVisible(false);
  clearTimerState();
  updateTimerButtons();
  triggerHapticImpact();
  if (close) document.getElementById('timerModal').classList.remove('show');
}

function timerDone() {
  playDoneSound(); updateHourglass(0);
  triggerHapticSuccess();
  document.getElementById('timerBtns').style.display = 'none';
  document.getElementById('timerDoneMsg').classList.add('show');
  document.getElementById('timerLabel').textContent = '🎊 concluído!';
  document.getElementById('countdownDisplay').textContent = '00:00';
  
  // Show toast if the modal was closed/hidden
  const modal = document.getElementById('timerModal');
  if (!modal.classList.contains('show')) {
    const task = TASKS.find(t => t.id === activeTaskId);
    if (task) {
      showToast(`🎉 ${task.name} concluído!`);
    }
  }

  activeTaskId = null;
  updateTimerButtons();
}

function finishTimer() {
  if (activeCard) { activeCard.classList.add('done'); saveDone(); updateProgress(); }
  activeTaskId = null;
  triggerHapticSuccess();
  stopTimer(true);
}

function closeTimerModal() {
  document.getElementById('timerModal').classList.remove('show');
  triggerHapticImpact();
}

function updateTimerButtons() {
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

/* ── Save state on page hide / close ── */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveTimerState();
});
window.addEventListener('beforeunload', saveTimerState);

/* Hourglass SVG */
function updateHourglass(p) {
  p = Math.max(0, Math.min(1, p));
  // top chamber: apex y=84, top y=13, halfW=40
  const tY  = 13 + (1-p)*71, tX = 40*p;
  document.getElementById('topSand').setAttribute('points',
    `${50-tX},${tY} ${50+tX},${tY} 50,84`);
  // bottom chamber: apex y=96, base y=167, halfW=40
  const filled = 1-p;
  const bY = 167 - filled*71, bX = 40*filled;
  document.getElementById('bottomSand').setAttribute('points',
    `${50-bX},${bY} ${50+bX},${bY} 90,167 10,167`);
}
function updateCountdown(s) {
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const r = (s%60).toString().padStart(2,'0');
  document.getElementById('countdownDisplay').textContent = `${m}:${r}`;
}
function setSandVisible(v) {
  ['sp1','sp2','sp3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.visibility = v ? 'visible' : 'hidden';
  });
}

/* ═══════════════ TOAST ═══════════════ */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ═══════════════ SETTINGS LOGIC ═══════════════ */
function initChildName() {
  const savedName = store.get(LS_CHILD_NAME) || 'Supercriança!';
  const span = document.getElementById('childNameSpan');
  if (span) span.textContent = savedName;
  
  const input = document.getElementById('kidNameInput');
  if (input) input.value = savedName === 'Supercriança!' ? '' : savedName;
}

function saveKidName() {
  const input = document.getElementById('kidNameInput');
  if (!input) return;
  const name = input.value.trim() || 'Supercriança!';
  store.set(LS_CHILD_NAME, name);
  
  const span = document.getElementById('childNameSpan');
  if (span) span.textContent = name;
  
  triggerHapticSuccess();
  showToast(`Olá, ${name}! 🦸`);
  closeSettingsModal();
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
    initChildName();
    renderSettingsTasksList();
    hideTaskForm();
    triggerHapticImpact();
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
    triggerHapticImpact();
  }
}

function renderSettingsTasksList() {
  const listContainer = document.getElementById('settingsTasksList');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  
  TASKS.forEach(t => {
    const item = document.createElement('div');
    item.className = 'settings-task-item';
    item.innerHTML = `
      <div class="settings-task-left">
        <span class="settings-task-emoji">${t.emoji}</span>
        <span class="settings-task-name">${t.name}</span>
      </div>
      <div class="settings-task-actions">
        <button class="action-btn btn-edit" onclick="editTask(${t.id})" title="Editar">✏️</button>
        <button class="action-btn btn-delete" onclick="deleteTask(${t.id})" title="Excluir">🗑️</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

function initColorSelectors() {
  const container = document.getElementById('formColorOptions');
  if (!container) return;
  container.querySelectorAll('.color-dot').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      btn.classList.add('active');
      triggerHapticImpact();
    };
  });
}

function showTaskForm(taskId = null) {
  const box = document.getElementById('taskFormBox');
  if (!box) return;
  
  box.style.display = 'block';
  initColorSelectors();
  triggerHapticImpact();
  
  const titleEl = document.getElementById('formTitle');
  const idInput = document.getElementById('formTaskId');
  const nameInput = document.getElementById('formTaskName');
  const emojiInput = document.getElementById('formTaskEmoji');
  const durationInput = document.getElementById('formTaskDuration');
  const colorContainer = document.getElementById('formColorOptions');
  
  if (taskId) {
    // Edit existing
    const t = TASKS.find(item => item.id === taskId);
    if (!t) return;
    titleEl.textContent = 'Editar Atividade ✏️';
    idInput.value = t.id;
    nameInput.value = t.name;
    emojiInput.value = t.emoji;
    durationInput.value = Math.round(t.duration / 60);
    
    // Select color
    colorContainer.querySelectorAll('.color-dot').forEach(d => {
      if (d.dataset.color === t.color) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  } else {
    // Create new
    titleEl.textContent = 'Nova Atividade ➕';
    idInput.value = '';
    nameInput.value = '';
    emojiInput.value = '🧸';
    durationInput.value = '0';
    
    // Select default color (yellow)
    colorContainer.querySelectorAll('.color-dot').forEach((d, idx) => {
      if (idx === 0) d.classList.add('active');
      else d.classList.remove('active');
    });
  }
  
  // Scroll to form
  box.scrollIntoView({ behavior: 'smooth' });
}

function hideTaskForm() {
  const box = document.getElementById('taskFormBox');
  if (box) box.style.display = 'none';
  triggerHapticImpact();
}

function saveTaskDetails() {
  const idVal = document.getElementById('formTaskId').value;
  const name = document.getElementById('formTaskName').value.trim();
  const emoji = document.getElementById('formTaskEmoji').value.trim() || '🧸';
  const durationMin = parseInt(document.getElementById('formTaskDuration').value) || 0;
  
  if (!name) {
    showToast('⚠️ Por favor, digite o nome da atividade!');
    return;
  }
  
  const colorActive = document.querySelector('#formColorOptions .color-dot.active');
  const color = colorActive ? colorActive.dataset.color : 'yellow';
  const durationSec = durationMin * 60;
  
  // Calculate dynamic time labels
  let timeLabel = '';
  if (durationSec === 0) {
    timeLabel = 'Livre';
  } else if (durationSec === 3600) {
    timeLabel = '1 horinha';
  } else if (durationSec < 60) {
    timeLabel = `${durationSec} segundos`;
  } else if (durationSec % 3600 === 0) {
    timeLabel = `${durationMin / 60} horas`;
  } else {
    timeLabel = `${durationMin} minutos`;
  }
  
  if (idVal) {
    // Edit mode
    const tid = parseInt(idVal);
    const idx = TASKS.findIndex(t => t.id === tid);
    if (idx !== -1) {
      TASKS[idx].name = name;
      TASKS[idx].emoji = emoji;
      TASKS[idx].color = color;
      TASKS[idx].duration = durationSec;
      TASKS[idx].timeLabel = timeLabel;
    }
  } else {
    // Create mode
    const newId = TASKS.length > 0 ? Math.max(...TASKS.map(t => t.id)) + 1 : 1;
    const newTask = {
      id: newId,
      name: name,
      emoji: emoji,
      color: color,
      duration: durationSec,
      timeLabel: timeLabel
    };
    TASKS.push(newTask);
  }
  
  // Persist and Refresh
  saveTasks(TASKS);
  saveOrder(); // ensure order reflects current state
  renderTasks();
  updateProgress();
  renderSettingsTasksList();
  hideTaskForm();
  
  triggerHapticSuccess();
  showToast('💾 Salvo com sucesso!');
}

function editTask(id) {
  showTaskForm(id);
}

function deleteTask(id) {
  if (confirm('Quer mesmo excluir esta atividade?')) {
    const idx = TASKS.findIndex(t => t.id === id);
    if (idx !== -1) {
      // If the active timer is running for this task, stop it
      if (activeTaskId === id) {
        stopTimer(true);
      }
      
      TASKS.splice(idx, 1);
      
      // Remove from doneSaved if present
      if (doneSaved.has(id)) {
        doneSaved.delete(id);
        saveDone();
      }
      
      saveTasks(TASKS);
      saveOrder();
      renderTasks();
      updateProgress();
      renderSettingsTasksList();
      hideTaskForm();
      
      triggerHapticSuccess();
      showToast('🗑️ Atividade excluída!');
    }
  }
}

/* ═══════════════ GLOBAL REGISTRATION FOR INLINE ONCLICK HANDLERS ═══════════════ */
window.closeTimerModal = closeTimerModal;
window.pauseTimer = pauseTimer;
window.stopTimer = stopTimer;
window.finishTimer = finishTimer;
window.resetAll = resetAll;
window.setDay = setDay;
window.openTimer = openTimer;
window.toggleDone = toggleDone;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveKidName = saveKidName;
window.showTaskForm = showTaskForm;
window.hideTaskForm = hideTaskForm;
window.saveTaskDetails = saveTaskDetails;
window.editTask = editTask;
window.deleteTask = deleteTask;

/* ═══════════════ INIT ═══════════════ */
initChildName();
renderTasks();
updateProgress();       // restore stars/bar from saved done state
updateHourglass(1);
setSandVisible(false);
updateCountdown(0);
restoreTimerState();    // reopen timer if it was running when page closed
