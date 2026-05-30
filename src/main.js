import { TASKS_DEFAULT } from './data/defaultTasks.js';
import {
  store,
  loadTasks,
  saveTasks,
  saveOrder,
  loadDone,
  saveDone,
  todayStr,
  resetPackedBooks,
  loadCalendarEvents,
  saveCalendarEvents,
  loadStarBalance,
  saveStarBalance,
  loadRewardsList,
  loadRedemptionRequests,
  saveRedemptionRequests
} from './services/storage.js';
import { triggerHapticImpact, triggerHapticSuccess } from './services/haptics.js';
import { renderAgenda, getSelectedDayIdx, setSelectedDayIdx } from './components/AgendaSection.js';
import { renderEvents } from './components/EventsSection.js';
import { pullCloudData, subscribeToChanges, getFamilyCode } from './services/supabase.js';
import { warmUpAudio, playDoneSound } from './services/audio.js';
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
import './components/ParentDashboard.js';

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
    saveStarBalance(loadStarBalance() + 1);
  } else {
    triggerHapticImpact();
    saveStarBalance(Math.max(0, loadStarBalance() - 1));
  }
  
  window.renderRewardsShopShelf();
}

function handleOpenTimer(e, btn) {
  openTimer(e, btn, TASKS, (finishedId) => {
    // When timer finishes naturally (reaches 0)
    const card = grid.querySelector(`.task-card[data-id="${finishedId}"]`);
    if (card) {
      const wasDone = card.classList.contains('done');
      if (!wasDone) {
        card.classList.add('done');
        const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
        saveDone(ids);
        updateProgress(TASKS);
        saveStarBalance(loadStarBalance() + 1);
        window.renderRewardsShopShelf();
      }
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
    const card = grid.querySelector(`.task-card[data-id="${finishedId}"]`);
    if (card) {
      const wasDone = card.classList.contains('done');
      if (!wasDone) {
        const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
        saveDone(ids);
        updateProgress(TASKS);
        saveStarBalance(loadStarBalance() + 1);
        window.renderRewardsShopShelf();
      }
    }
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
  resetPackedBooks();
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

  const slideTasks = document.getElementById('slideTasks');
  const slideAgenda = document.getElementById('slideAgenda');
  const slideEvents = document.getElementById('slideEvents');

  // Prepare all slides to be visible during transition
  if (slideTasks) slideTasks.classList.remove('inactive-slide');
  if (slideAgenda) slideAgenda.classList.remove('inactive-slide');
  if (slideEvents) slideEvents.classList.remove('inactive-slide');

  currentSlide = index;
  slides.style.transform = `translateX(-${index * 33.333}%)`;
  
  dots.forEach((dot, idx) => {
    if (idx === index) dot.classList.add('active');
    else dot.classList.remove('active');
  });

  // After transition completes (400ms), hide the inactive slides to avoid extra scroll height
  setTimeout(() => {
    if (currentSlide === index) {
      if (index === 0) {
        if (slideAgenda) slideAgenda.classList.add('inactive-slide');
        if (slideEvents) slideEvents.classList.add('inactive-slide');
      } else if (index === 1) {
        if (slideTasks) slideTasks.classList.add('inactive-slide');
        if (slideEvents) slideEvents.classList.add('inactive-slide');
      } else if (index === 2) {
        if (slideTasks) slideTasks.classList.add('inactive-slide');
        if (slideAgenda) slideAgenda.classList.add('inactive-slide');
      }
    }
  }, 400);

  triggerHapticImpact();
};

window.slideToTasks = () => window.slideToSlide(0);
window.slideToAgenda = () => window.slideToSlide(1);
window.slideToEvents = () => window.slideToSlide(2);

let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
  const diffX = touchStartX - e.changedTouches[0].screenX;
  const diffY = touchStartY - e.changedTouches[0].screenY;

  // Swipe left: diffX > 0 -> go forward
  // Swipe right: diffX < 0 -> go backward
  if (Math.abs(diffX) > 60 && Math.abs(diffY) < 60) {
    if (diffX > 0) {
      if (currentSlide === 0) window.slideToSlide(1);
      else if (currentSlide === 1) window.slideToSlide(2);
    } else if (diffX < 0) {
      if (currentSlide === 1) window.slideToSlide(0);
      else if (currentSlide === 2) window.slideToSlide(1);
    }
  }
}



// Exposed for external components (e.g. ParentDashboard) to refresh the child's task view
window.refreshChildView = () => {
  TASKS = loadTasks();
  const currentDone = loadDone();
  renderTasks(TASKS, currentDone, toggleDone, handleOpenTimer, swapCards);
  updateStars(TASKS.length);
  updateProgress(TASKS);
};


function checkEventNotifications() {
  const events = loadCalendarEvents();
  const today = todayStr();
  
  // Calculate tomorrow's date string in local timezone
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrow = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Find events for today or tomorrow that haven't been notified yet
  const pending = events.filter(e => !e.notified && (e.date === today || e.date === tomorrow));
  if (pending.length === 0) return;

  // Process the first pending notification
  const event = pending[0];
  const isToday = event.date === today;
  const whenLabel = isToday ? 'HOJE! 🌟' : 'AMANHÃ! ⏰';
  const emoji = event.type === 'exam' ? '📝' : event.type === 'party' ? '🎂' : event.type === 'school' ? '🎒' : '🎨';

  const popupHtml = `
    <div class="event-popup-backdrop" id="eventNotificationPopup">
      <div class="event-popup-box">
        <span class="event-popup-emoji">${emoji}</span>
        <div class="event-popup-title">${isToday ? 'É hoje, Campeão! 🎉' : 'Amanhã tem Aventura! ⏰'}</div>
        <div class="event-popup-message">
          Você tem um compromisso marcado para <b>${whenLabel}</b>:<br><br>
          <span style="font-size: 1.25rem; color: #E67E22; font-weight: 800;">"${event.title}"</span>
        </div>
        <button class="event-popup-btn" onclick="window.closeEventNotificationPopup()">Eba! Entendido! 👍</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', popupHtml);
  triggerHapticSuccess();
  
  // Wait a small bit to play sound
  setTimeout(() => {
    playDoneSound();
  }, 100);

  // Mark notified and save
  event.notified = true;
  saveCalendarEvents(events);
}

window.closeEventNotificationPopup = () => {
  const popup = document.getElementById('eventNotificationPopup');
  if (popup) {
    popup.remove();
    triggerHapticImpact();
  }
};

/* ═══════════════ LOJA DE RECOMPENSAS (REWARDS) ═══════════════ */
window.renderRewardsShopShelf = () => {
  const shelfContainer = document.getElementById('rewardShelfContainer');
  const balanceSpan = document.getElementById('starBalanceSpan');
  if (!shelfContainer || !balanceSpan) return;

  const balance = loadStarBalance();
  balanceSpan.textContent = `⭐ ${balance} ${balance === 1 ? 'Estrela' : 'Estrelas'}`;

  const rewards = loadRewardsList();
  const redemptions = loadRedemptionRequests();

  shelfContainer.innerHTML = '';

  if (rewards.length === 0) {
    shelfContainer.innerHTML = `<div style="text-align:center; padding:12px; color:#888; font-size:0.9rem; font-weight:700;">Nenhum prêmio cadastrado ainda! Fale com seus pais 🦸‍♂️</div>`;
    return;
  }

  rewards.forEach(rwd => {
    const activeReq = redemptions.find(r => r.rewardId === rwd.id && r.status !== 'rejected');
    
    let actionHtml = '';
    if (activeReq) {
      if (activeReq.status === 'pending') {
        actionHtml = `<span class="reward-status-label pending">⏳ Pendente</span>`;
      } else if (activeReq.status === 'approved') {
        actionHtml = `<span class="reward-status-label approved" onclick="window.clearApprovedRedemption('${activeReq.id}')" style="cursor:pointer;" title="Clique para limpar e usar novamente!">🎉 Liberado!</span>`;
      }
    } else {
      if (balance >= rwd.cost) {
        actionHtml = `<button class="top-nav-btn" onclick="window.redeemReward('${rwd.id}')" style="background:#FF8787; border:none; padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.8rem; color:white; cursor:pointer; box-shadow: 0 3px 6px rgba(255,135,135,0.3);">Resgatar! 🎁</button>`;
      } else {
        actionHtml = `<button class="top-nav-btn" style="background:#ccc; border:none; padding:6px 14px; border-radius:12px; font-weight:800; font-size:0.85rem; color:white; cursor:not-allowed;" disabled>Falta ⭐ ${rwd.cost - balance}</button>`;
      }
    }

    const card = document.createElement('div');
    card.className = 'reward-item-card';
    card.innerHTML = `
      <div class="reward-title-box">
        <span class="reward-item-title">${rwd.title}</span>
        <span class="reward-cost-tag">⭐ ${rwd.cost}</span>
      </div>
      <div style="flex-shrink:0;">
        ${actionHtml}
      </div>
    `;
    shelfContainer.appendChild(card);
  });
};

window.redeemReward = (rwdId) => {
  const rewards = loadRewardsList();
  const rwd = rewards.find(r => r.id === rwdId);
  if (!rwd) return;

  const balance = loadStarBalance();
  if (balance < rwd.cost) {
    showToast('⚠️ Estrelas insuficientes!');
    return;
  }

  // Deduct stars immediately
  saveStarBalance(balance - rwd.cost);

  // Add request
  const list = loadRedemptionRequests();
  const newReq = {
    id: 'req-' + Date.now(),
    rewardId: rwdId,
    rewardTitle: rwd.title,
    cost: rwd.cost,
    status: 'pending',
    date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
  };
  list.push(newReq);
  saveRedemptionRequests(list);

  triggerHapticSuccess();
  playDoneSound();
  showToast('🎁 Pedido enviado aos pais! Torcendo! 😍');
  window.renderRewardsShopShelf();
};

window.clearApprovedRedemption = (reqId) => {
  if (confirm('Já aproveitou seu prêmio? Vamos tirá-lo do baú para você poder conquistar outros! 😍')) {
    const list = loadRedemptionRequests();
    const filtered = list.filter(r => r.id !== reqId);
    saveRedemptionRequests(filtered);
    triggerHapticImpact();
    window.renderRewardsShopShelf();
  }
};

/* ═══════════════ INITIALIZATION ═══════════════ */
async function init() {
  // Warm up audio context on first user interaction
  document.addEventListener('pointerdown', () => {
    warmUpAudio();
  }, { once: true });

  const code = getFamilyCode();
  if (code) {
    // Pull latest data from remote Supabase cloud
    await pullCloudData();
    // Reload state in memory
    TASKS = loadTasks();
  }

  // Init UI parts
  initChildName();
  renderTasks(TASKS, loadDone(), toggleDone, handleOpenTimer, swapCards);
  updateStars(TASKS.length);
  updateProgress(TASKS);

  // Render agenda
  renderAgenda();

  // Render events calendar
  renderEvents();

  // Initialize and update day highlight (strictly automatic system date for Tasks slide)
  updateDayHighlight();

  // Hide inactive slides initially to prevent extra scrolling height
  const slideAgenda = document.getElementById('slideAgenda');
  if (slideAgenda) slideAgenda.classList.add('inactive-slide');

  const slideEvents = document.getElementById('slideEvents');
  if (slideEvents) slideEvents.classList.add('inactive-slide');

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
      const wasDone = card.classList.contains('done');
      if (!wasDone) {
        card.classList.add('done');
        const ids = [...grid.querySelectorAll('.task-card.done')].map(c => parseInt(c.dataset.id));
        saveDone(ids);
        updateProgress(TASKS);
        saveStarBalance(loadStarBalance() + 1);
        window.renderRewardsShopShelf();
      }
    }
  });

  // Check for upcoming event notifications
  checkEventNotifications();

  // Setup real-time listeners for database mutations from other devices in the family
  if (code) {
    subscribeToChanges((dataKey) => {
      triggerHapticSuccess();
      
      if (dataKey === 'tasks' || dataKey === 'done' || dataKey === 'order') {
        TASKS = loadTasks();
        const currentDone = loadDone();
        renderTasks(TASKS, currentDone, toggleDone, handleOpenTimer, swapCards);
        updateStars(TASKS.length);
        updateProgress(TASKS);
      } else if (dataKey === 'agenda' || dataKey === 'packed_books') {
        renderAgenda();
      } else if (dataKey === 'events') {
        renderEvents();
      } else if (dataKey === 'child_name') {
        initChildName();
      } else if (dataKey === 'star_balance' || dataKey === 'rewards' || dataKey === 'redemptions') {
        window.renderRewardsShopShelf();
        
        // If parent dashboard is open, refresh active tab
        const activeTabBtn = document.querySelector('.parent-tab-btn.active');
        if (activeTabBtn && window.setParentTab) {
          window.setParentTab(activeTabBtn.dataset.tab);
        }
      }
      
      showToast('✨ Sincronizado em tempo real!');
    });
  }

  // Render rewards shop shelf initially
  window.renderRewardsShopShelf();
  
  // Set app version
  const versionEl = document.getElementById('appVersionDisplay');
  if (versionEl) {
    versionEl.textContent = `v${__APP_VERSION__}`;
  }
}

// Start
init();
