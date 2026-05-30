import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { getChildName, setChildName, saveTasks } from '../services/storage.js';
import {
  getFamilyCode,
  generateFamilyCode,
  joinFamily,
  pullCloudData,
  setFamilyCode,
  supabase
} from '../services/supabase.js';

export function initChildName() {
  const name = getChildName();
  const span = document.getElementById('childNameSpan');
  if (span) span.textContent = name;
  
  const input = document.getElementById('kidNameInput');
  if (input) input.value = name === 'Supercriança!' ? '' : name;
}

export function saveKidName() {
  const input = document.getElementById('kidNameInput');
  if (!input) return;
  const name = input.value.trim() || 'Supercriança!';
  setChildName(name);
  
  const span = document.getElementById('childNameSpan');
  if (span) span.textContent = name;
  
  triggerHapticSuccess();
  showToast(`Olá, ${name}! 🦸`);
  closeSettingsModal();
}

export function openSettingsModal(tasks, renderSettingsTasksListFn) {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
    initChildName();
    if (renderSettingsTasksListFn) renderSettingsTasksListFn();
    hideTaskForm();
    triggerHapticImpact();
  }
}

export function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
    triggerHapticImpact();
  }
}

export function renderSettingsTasksList(tasks, onEditClick, onDeleteClick) {
  const listContainer = document.getElementById('settingsTasksList');
  if (!listContainer) return;
  listContainer.innerHTML = '';
  
  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'settings-task-item';
    item.innerHTML = `
      <div class="settings-task-left">
        <span class="settings-task-emoji">${t.emoji}</span>
        <span class="settings-task-name">${t.name}</span>
      </div>
      <div class="settings-task-actions">
        <button class="action-btn btn-edit" title="Editar">✏️</button>
        <button class="action-btn btn-delete" title="Excluir">🗑️</button>
      </div>
    `;
    
    // Bind listeners
    item.querySelector('.btn-edit').onclick = () => {
      if (onEditClick) onEditClick(t.id);
    };
    item.querySelector('.btn-delete').onclick = () => {
      if (onDeleteClick) onDeleteClick(t.id);
    };
    
    listContainer.appendChild(item);
  });
}

export function initColorSelectors() {
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

export function showTaskForm(taskId = null, tasks) {
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
    const t = tasks.find(item => item.id === taskId);
    if (!t) return;
    titleEl.textContent = 'Editar Atividade ✏️';
    idInput.value = t.id;
    nameInput.value = t.name;
    emojiInput.value = t.emoji;
    durationInput.value = Math.round(t.duration / 60);
    
    colorContainer.querySelectorAll('.color-dot').forEach(d => {
      if (d.dataset.color === t.color) d.classList.add('active');
      else d.classList.remove('active');
    });
  } else {
    titleEl.textContent = 'Nova Atividade ➕';
    idInput.value = '';
    nameInput.value = '';
    emojiInput.value = '🧸';
    durationInput.value = '0';
    
    colorContainer.querySelectorAll('.color-dot').forEach((d, idx) => {
      if (idx === 0) d.classList.add('active');
      else d.classList.remove('active');
    });
  }
  
  box.scrollIntoView({ behavior: 'smooth' });
}

export function hideTaskForm() {
  const box = document.getElementById('taskFormBox');
  if (box) box.style.display = 'none';
  triggerHapticImpact();
}

export function saveTaskDetails(tasks, onSaveSuccess) {
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
    const tid = parseInt(idVal);
    const idx = tasks.findIndex(t => t.id === tid);
    if (idx !== -1) {
      tasks[idx].name = name;
      tasks[idx].emoji = emoji;
      tasks[idx].color = color;
      tasks[idx].duration = durationSec;
      tasks[idx].timeLabel = timeLabel;
    }
  } else {
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const newTask = {
      id: newId,
      name: name,
      emoji: emoji,
      color: color,
      duration: durationSec,
      timeLabel: timeLabel
    };
    tasks.push(newTask);
  }
  
  saveTasks(tasks);
  
  triggerHapticSuccess();
  showToast('💾 Salvo com sucesso!');
  
  if (onSaveSuccess) onSaveSuccess();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}
