import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { saveDone } from '../services/storage.js';

let dragSrc = null;
let touchSrc       = null;
let touchGhost     = null;
let touchOffX      = 0;
let touchOffY      = 0;

export function renderTasks(tasks, doneSaved, onToggleDone, onOpenTimer, onSwapCards) {
  const grid = document.getElementById('tasksGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  tasks.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id    = t.id;
    card.dataset.color = t.color;
    card.draggable = true;

    card.innerHTML = `
      <div class="grip"><span></span><span></span><span></span></div>
      <div class="task-emoji-col">
        <div class="task-emoji">${t.emoji}</div>
        <div class="task-time">⏰ ${t.timeLabel}</div>
      </div>
      <div class="task-info">
        <div class="task-name">${t.name}</div>
        ${t.duration ? `<button class="timer-start-btn" data-tid="${t.id}">⏱️ Iniciar</button>` : ''}
      </div>
      <div class="card-right">
        <div class="check-circle">
          <span class="check-icon">✓</span>
        </div>
      </div>`;

    // Connect custom listeners
    const startBtn = card.querySelector('.timer-start-btn');
    if (startBtn) {
      startBtn.onclick = (e) => {
        if (onOpenTimer) onOpenTimer(e, startBtn);
      };
    }
    
    card.querySelector('.check-circle').onclick = (e) => {
      if (onToggleDone) onToggleDone(e, card);
    };

    // Desktop drag
    card.addEventListener('dragstart',  (e) => onDragStart(e, card));
    card.addEventListener('dragend',    () => onDragEnd(card));
    card.addEventListener('dragover',   (e) => onDragOver(e, card));
    card.addEventListener('dragleave',  () => onDragLeave(card));
    card.addEventListener('drop',       (e) => onDrop(e, card, onSwapCards));

    // Touch drag
    card.addEventListener('touchstart', (e) => onTouchStart(e, card), { passive:true });
    card.addEventListener('touchmove',  (e) => onTouchMove(e, onSwapCards),  { passive:false });
    card.addEventListener('touchend',   (e) => onTouchEnd(e, onSwapCards));

    // Restore done state from doneSaved Set
    if (doneSaved.has(t.id)) card.classList.add('done');

    grid.appendChild(card);
  });
}

/* ── Desktop Drag & Drop ── */
function onDragStart(e, card) {
  dragSrc = card;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
  triggerHapticImpact();
}

function onDragEnd(card) {
  card.classList.remove('dragging');
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  dragSrc = null;
}

function onDragOver(e, card) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (card !== dragSrc) {
    document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  }
}

function onDragLeave(card) {
  card.classList.remove('drag-over');
}

function onDrop(e, card, onSwapCards) {
  e.stopPropagation();
  if (dragSrc && dragSrc !== card) {
    if (onSwapCards) onSwapCards(dragSrc, card);
  }
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
}

/* ── Touch Drag ── */
function onTouchStart(e, card) {
  const grip = e.target.closest('.grip');
  if (!grip) return;

  triggerHapticImpact();
  touchSrc = card;

  const rect = card.getBoundingClientRect();
  touchOffX = e.touches[0].clientX - rect.left;
  touchOffY = e.touches[0].clientY - rect.top;

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

function onTouchMove(e, onSwapCards) {
  if (!touchGhost) return;

  e.preventDefault();
  const tx = e.touches[0].clientX;
  const ty = e.touches[0].clientY;

  touchGhost.style.left = (tx - touchOffX) + 'px';
  touchGhost.style.top  = (ty - touchOffY) + 'px';

  touchGhost.style.visibility = 'hidden';
  const el = document.elementFromPoint(tx, ty);
  touchGhost.style.visibility = 'visible';

  const target = el?.closest('.task-card');
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
  if (target && target !== touchSrc) {
    if (!target.classList.contains('drag-over')) {
      triggerHapticImpact();
    }
    target.classList.add('drag-over');
  }
}

function onTouchEnd(e, onSwapCards) {
  if (!touchGhost || !touchSrc) { cleanup(); return; }

  const touch = e.changedTouches[0];
  touchGhost.style.visibility = 'hidden';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const target = el?.closest('.task-card');

  if (target && target !== touchSrc) {
    if (onSwapCards) onSwapCards(touchSrc, target);
  }
  cleanup();
}

function cleanup() {
  if (touchGhost) { touchGhost.remove(); touchGhost = null; }
  if (touchSrc)   { touchSrc.classList.remove('dragging'); touchSrc = null; }
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
}
