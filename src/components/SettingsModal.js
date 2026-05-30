import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { getChildName, setChildName, saveTasks } from '../services/storage.js';
import {
  getFamilyCode,
  generateFamilyCode,
  joinFamily,
  pullCloudData,
  setFamilyCode
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
    renderCloudSyncSection();
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

export function renderCloudSyncSection() {
  const statusEl = document.getElementById('cloudSyncStatus');
  const actionsEl = document.getElementById('cloudSyncActions');
  if (!statusEl || !actionsEl) return;

  const code = getFamilyCode();

  if (code) {
    statusEl.innerHTML = `Conectado à Família: <span style="color: #FFD166; font-size: 1.15rem; font-weight: 900; letter-spacing: 1px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">${code}</span> 👨‍👩‍👧‍👦`;
    actionsEl.innerHTML = `
      <div style="display: flex; gap: 8px;">
        <button class="settings-save-btn" onclick="window.disconnectFamily()" style="background: rgba(255,107,107,0.2); border: 2.5px solid #FF6B6B; color: #FF6B6B; box-shadow: none;">Desconectar 🔌</button>
        <button class="settings-save-btn" onclick="window.forceCloudPull()" style="background: #20c997; flex: 1.5;">Atualizar 🔄</button>
      </div>
    `;
  } else {
    statusEl.innerHTML = `Operando localmente (sem sincronização).`;
    actionsEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 8px;">
          <input type="text" id="joinFamilyCodeInput" placeholder="Ex: SUPER-123456" maxlength="12" class="settings-name-input" style="margin-bottom: 0; text-transform: uppercase;">
          <button class="settings-save-btn" onclick="window.connectFamily()" style="width: auto; white-space: nowrap;">Conectar</button>
        </div>
        <div style="text-align: center; margin-top: 4px;">
          <span style="font-size: 0.8rem; color: rgba(255,255,255,0.55); font-weight: 600; display: block; margin-bottom: 6px;">Ou crie um novo grupo para esta família:</span>
          <button class="settings-save-btn" onclick="window.createFamilyGroup()" style="background: linear-gradient(135deg, #7048E8, #C5A3FF); box-shadow: 0 4px 12px rgba(112,72,232,0.3);">Criar Novo Grupo 👨‍👩‍👧‍👦</button>
        </div>
      </div>
    `;
  }
}

window.disconnectFamily = () => {
  if (confirm('Tem certeza que quer desconectar deste grupo? Seus dados voltarão a ser apenas locais no aparelho! 🥺')) {
    setFamilyCode(null);
    triggerHapticImpact();
    renderCloudSyncSection();
    showToast('🔌 Desconectado com sucesso!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
};

window.connectFamily = async () => {
  const input = document.getElementById('joinFamilyCodeInput');
  if (!input) return;
  const code = input.value.trim();
  if (!code) {
    showToast('⚠️ Por favor, digite o código de família!');
    return;
  }

  showToast('🔌 Conectando...');
  const res = await joinFamily(code);
  if (res.success) {
    triggerHapticSuccess();
    showToast('👨‍👩‍👧‍👦 Conectado à família com sucesso!');
    
    // Pull the latest remote data to populate localStorage
    await pullCloudData();
    
    renderCloudSyncSection();
    
    // Reload the application to start real-time updates and apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  } else {
    triggerHapticImpact();
    alert(res.error);
  }
};

window.createFamilyGroup = async () => {
  showToast('⚡ Criando grupo...');
  const code = await generateFamilyCode();
  if (code) {
    triggerHapticSuccess();
    alert(`🎉 Grupo criado com sucesso!\n\nO seu Código de Família é: ${code}\n\nGuarde esse código e digite-o nos outros aparelhos para sincronizar tudo! 😍`);
    
    // Perform initial sync of existing local state
    // Read local cache and upload to the newly created family group
    const tasks = localStorage.getItem('tarefas_custom_list');
    const order = localStorage.getItem('tarefas_order');
    const agenda = localStorage.getItem('tarefas_school_agenda');
    const events = localStorage.getItem('tarefas_events_calendar');
    const childName = localStorage.getItem('tarefas_child_name');
    const done = localStorage.getItem('tarefas_done');
    const packedBooks = localStorage.getItem('tarefas_packed_books');
    
    const { syncLocalToCloud } = await import('../services/supabase.js');
    if (tasks) await syncLocalToCloud('tasks', JSON.parse(tasks));
    if (order) await syncLocalToCloud('order', JSON.parse(order));
    if (agenda) await syncLocalToCloud('agenda', JSON.parse(agenda));
    if (events) await syncLocalToCloud('events', JSON.parse(events));
    if (childName) await syncLocalToCloud('child_name', childName);
    if (done) await syncLocalToCloud('done', JSON.parse(done));
    if (packedBooks) await syncLocalToCloud('packed_books', JSON.parse(packedBooks));
    
    renderCloudSyncSection();
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else {
    triggerHapticImpact();
    alert('Erro ao criar grupo na nuvem. Verifique sua conexão com a internet ou se as credenciais do Supabase estão configuradas! 🥺');
  }
};

window.forceCloudPull = async () => {
  showToast('🔄 Atualizando...');
  const hasChanges = await pullCloudData();
  triggerHapticSuccess();
  showToast('💾 Sincronizado com a nuvem!');
  if (hasChanges) {
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } else {
    renderCloudSyncSection();
  }
};
