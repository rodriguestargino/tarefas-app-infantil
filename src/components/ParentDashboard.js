import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import {
  loadStarBalance,
  saveStarBalance,
  loadRewardsList,
  saveRewardsList,
  loadRedemptionRequests,
  saveRedemptionRequests,
  loadTasks,
  saveTasks,
  saveOrder,
  loadDone,
  saveDone,
  loadCalendarEvents,
  loadSchoolAgenda,
  loadPackedBooks,
  getChildName,
  setChildName
} from '../services/storage.js';
import {
  getFamilyCode,
  setFamilyCode,
  generateFamilyCode,
  joinFamily,
  pullCloudData,
  syncLocalToCloud,
  supabase
} from '../services/supabase.js';

let gateNum1 = 0;
let gateNum2 = 0;
let gateAnswer = 0;

// ─── Parental Gate ────────────────────────────────────────────────────────────

export function openParentGate() {
  const modal = document.getElementById('parentGateModal');
  if (!modal) return;

  gateNum1 = Math.floor(Math.random() * 5) + 5; // 5–9
  gateNum2 = Math.floor(Math.random() * 7) + 3; // 3–9
  gateAnswer = gateNum1 * gateNum2;

  const questionEl = document.getElementById('parentGateQuestion');
  if (questionEl) questionEl.textContent = `${gateNum1} × ${gateNum2} = ?`;

  const inputEl = document.getElementById('parentGateInput');
  if (inputEl) {
    inputEl.value = '';
    inputEl.placeholder = 'Sua resposta...';
    setTimeout(() => inputEl.focus(), 150);
  }

  modal.classList.add('show');
  triggerHapticImpact();
}

export function closeParentGate() {
  const modal = document.getElementById('parentGateModal');
  if (modal) {
    modal.classList.remove('show');
    triggerHapticImpact();
  }
}

export function checkParentGateAnswer() {
  const inputEl = document.getElementById('parentGateInput');
  if (!inputEl) return;

  const userAnswer = parseInt(inputEl.value.trim(), 10);

  if (userAnswer === gateAnswer) {
    triggerHapticSuccess();
    closeParentGate();
    openParentDashboard();
  } else {
    triggerHapticImpact();
    inputEl.classList.add('shake');
    setTimeout(() => inputEl.classList.remove('shake'), 400);
    inputEl.value = '';
    inputEl.placeholder = 'Errado! Tente de novo 🤔';
    showToast('Resposta incorreta! Tente novamente 🛡️');
  }
}

// ─── Parent Dashboard ─────────────────────────────────────────────────────────

let activeTab = 'reports';

export function openParentDashboard() {
  const modal = document.getElementById('parentDashboardModal');
  if (!modal) return;

  const nameInput = document.getElementById('parentKidNameInput');
  if (nameInput) {
    const name = getChildName();
    nameInput.value = name === 'Supercriança!' ? '' : name;
  }

  modal.classList.add('show');
  triggerHapticImpact();

  if (!supabase) {
    const syncTab = document.querySelector('.parent-tab-btn[data-tab="sync"]');
    if (syncTab) syncTab.style.display = 'none';
  }

  setParentTab('reports');
}

export function closeParentDashboard() {
  const modal = document.getElementById('parentDashboardModal');
  if (modal) {
    modal.classList.remove('show');
    triggerHapticImpact();
    if (window.renderTasks) window.renderTasks();
  }
}

export function setParentTab(tabName) {
  activeTab = tabName;
  triggerHapticImpact();

  document.querySelectorAll('.parent-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  renderActiveTabContent();
}

function renderActiveTabContent() {
  const contentEl = document.getElementById('parentTabContent');
  if (!contentEl) return;
  contentEl.innerHTML = '';

  if (activeTab === 'reports')    renderReports(contentEl);
  else if (activeTab === 'rewards')    renderRewardsAdmin(contentEl);
  else if (activeTab === 'activities') renderActivitiesAdmin(contentEl);
  else if (activeTab === 'sync')       renderSyncAdmin(contentEl);
}

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

function renderReports(container) {
  const doneSet      = loadDone();
  const tasks        = loadTasks();
  const starBalance  = loadStarBalance();
  const events       = loadCalendarEvents();
  const packedBooks  = loadPackedBooks();
  const agenda       = loadSchoolAgenda();

  const today  = new Date();
  const dayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const todayBooks = agenda[dayIdx]?.books || [];

  const totalTasksCount     = tasks.length;
  const completedTasksCount = doneSet.size;
  const taskCompletionPct   = totalTasksCount > 0
    ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const booksPackedCount   = packedBooks.length;
  const totalBooksCount    = todayBooks.length;
  const booksCompletionPct = totalBooksCount > 0
    ? Math.round((booksPackedCount / totalBooksCount) * 100) : 0;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date().setHours(0, 0, 0, 0)).length;

  container.innerHTML = `
    <h3 style="color:white; margin-bottom:12px; font-weight:800;">📊 Relatório Diário</h3>

    <div class="report-grid">
      <div class="report-widget">
        <div class="report-desc">Tarefas de Hoje</div>
        <div class="report-val">${completedTasksCount}/${totalTasksCount}</div>
        <div class="report-desc">${taskCompletionPct}% concluído</div>
      </div>

      <div class="report-widget">
        <div class="report-desc">Estrelas Acumuladas</div>
        <div class="report-val" style="color:#FFE066;">⭐ ${starBalance}</div>
        <div class="report-desc">Saldo do Cofrinho</div>
      </div>

      <div class="report-widget">
        <div class="report-desc">Mochila Escolar</div>
        <div class="report-val" style="color:#74C0FC;">🎒 ${booksPackedCount}/${totalBooksCount}</div>
        <div class="report-desc">${totalBooksCount > 0 ? `${booksCompletionPct}% organizado` : 'Sem livros hoje'}</div>
      </div>

      <div class="report-widget">
        <div class="report-desc">Datas Especiais</div>
        <div class="report-val" style="color:#FF9DC1;">📅 ${upcomingEvents}</div>
        <div class="report-desc">Próximos eventos</div>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.05); border-radius:18px; padding:14px; border:1.5px solid rgba(255,255,255,0.08); margin-top:12px;">
      <h4 style="color:#FFF3BF; margin-bottom:6px; font-weight:800;">💡 Dica do Orientador</h4>
      <p style="color:rgba(255,255,255,0.7); font-size:0.85rem; line-height:1.4; margin:0;">
        ${taskCompletionPct >= 80
          ? 'Sensacional! Seu filho está com desempenho de super-herói hoje! Que tal recompensá-lo com um elogio caloroso? 🦸‍♂️'
          : taskCompletionPct >= 40
            ? 'Muito bom! A rotina está em andamento. Lembre a criança de que cada tarefa soma estrelas para trocar por prêmios! 🌟'
            : 'Começo de jornada! Ajude a criança a iniciar a primeira tarefa. O reforço positivo faz milagres! ❤️'}
      </p>
    </div>
  `;
}

// ─── Tab: Rewards ─────────────────────────────────────────────────────────────

function renderRewardsAdmin(container) {
  const redemptions      = loadRedemptionRequests();
  const pendingRequests  = redemptions.filter(r => r.status === 'pending');
  const processedRequests = redemptions.filter(r => r.status !== 'pending').slice(-5).reverse();
  const rewards          = loadRewardsList();

  let pendingHtml = pendingRequests.length === 0
    ? `<div style="text-align:center; padding:16px; color:rgba(255,255,255,0.4); font-size:0.85rem; font-weight:700;">Nenhuma solicitação pendente! 😊</div>`
    : pendingRequests.map(req => `
        <div class="redemption-item">
          <div class="redemption-left">
            <span class="redemption-title">${req.rewardTitle}</span>
            <span class="redemption-date">Custo: ⭐ ${req.cost} &bull; ${req.date}</span>
          </div>
          <div class="redemption-actions">
            <button class="action-btn btn-approve" onclick="window.handleRedemptionApproval('${req.id}', true)" title="Aprovar">✓</button>
            <button class="action-btn btn-reject"  onclick="window.handleRedemptionApproval('${req.id}', false)" title="Recusar">✕</button>
          </div>
        </div>`).join('');

  let processedHtml = processedRequests.map(req => {
    const isApproved = req.status === 'approved';
    const badge = isApproved
      ? `<span style="color:#63E6BE; font-size:0.8rem; font-weight:800; background:rgba(99,230,190,0.15); padding:2px 8px; border-radius:10px;">Aprovado</span>`
      : `<span style="color:#FF6B6B; font-size:0.8rem; font-weight:800; background:rgba(255,107,107,0.15); padding:2px 8px; border-radius:10px;">Recusado</span>`;
    return `
      <div class="redemption-item" style="opacity:0.65; border-style:dotted;">
        <div class="redemption-left">
          <span class="redemption-title" style="${!isApproved ? 'text-decoration:line-through;' : ''}">${req.rewardTitle}</span>
          <span class="redemption-date">Custo: ⭐ ${req.cost}</span>
        </div>
        <div>${badge}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:20px;">
      <h3 style="color:white; margin-bottom:8px; font-weight:800;">🔔 Solicitações de Resgate</h3>
      <div class="pending-redemptions-list">${pendingHtml}</div>
    </div>

    <hr style="border:none; border-top:1.5px solid rgba(255,255,255,0.08); margin:16px 0;">

    <div style="margin-bottom:20px;">
      <h3 style="color:white; margin-bottom:8px; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
        🎁 Prêmios Cadastrados
        <button class="add-task-btn" onclick="window.showAddRewardForm()" style="font-size:0.75rem; padding:4px 10px;">➕ Novo Prêmio</button>
      </h3>

      <div id="rewardFormBox" style="display:none; background:rgba(0,0,0,0.2); border:2px dashed rgba(255,255,255,0.15); border-radius:18px; padding:12px; margin-bottom:12px;">
        <h4 style="color:white; margin-top:0; margin-bottom:8px; font-weight:800;" id="rewardFormTitle">Adicionar Prêmio</h4>
        <input type="hidden" id="editRewardId">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" id="rewardTitleInput" class="settings-name-input" placeholder="Ex: 30 min de videogame, Sorvete..." style="background:rgba(255,255,255,0.1); color:white; margin-bottom:0;">
          <div style="display:flex; gap:8px;">
            <input type="number" id="rewardCostInput" class="settings-name-input" placeholder="Custo em Estrelas (Ex: 10)" style="background:rgba(255,255,255,0.1); color:white; margin-bottom:0; flex:1;" min="1">
            <button class="settings-save-btn" onclick="window.saveRewardDetails()" style="width:auto; white-space:nowrap; background:#FF8787;">Salvar</button>
            <button class="settings-save-btn" onclick="window.hideRewardForm()" style="width:auto; white-space:nowrap; background:transparent; border:2px solid rgba(255,255,255,0.3); color:white;">Fechar</button>
          </div>
        </div>
      </div>

      <div class="pending-redemptions-list" style="max-height:150px;">
        ${rewards.map(rwd => `
          <div class="redemption-item">
            <div class="redemption-left">
              <span class="redemption-title">${rwd.title}</span>
              <span class="redemption-date">Custa: ⭐ ${rwd.cost} estrelas</span>
            </div>
            <div class="redemption-actions">
              <button class="event-delete-btn" onclick="window.editReward('${rwd.id}')" title="Editar" style="border-color:rgba(255,255,255,0.2); color:#E6FCF5; margin-right:4px;">✏️</button>
              <button class="event-delete-btn" onclick="window.deleteReward('${rwd.id}')" title="Excluir" style="border-color:rgba(255,107,107,0.4); color:#FF6B6B;">🗑️</button>
            </div>
          </div>`).join('')}
      </div>
    </div>

    ${processedRequests.length > 0 ? `
      <hr style="border:none; border-top:1.5px solid rgba(255,255,255,0.08); margin:16px 0;">
      <div>
        <h3 style="color:rgba(255,255,255,0.6); margin-bottom:8px; font-weight:800; font-size:0.95rem;">📜 Histórico Recente</h3>
        <div class="pending-redemptions-list" style="max-height:120px;">${processedHtml}</div>
      </div>` : ''}
  `;
}

// ─── Tab: Activities ──────────────────────────────────────────────────────────

function renderActivitiesAdmin(container) {
  container.innerHTML = `
    <h3 style="color:white; margin-bottom:12px; font-weight:800;">⚙️ Gerenciador de Atividades</h3>

    <div style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.06); border-radius:20px; padding:14px; margin-bottom:16px;">
      <div class="tasks-header-row" style="margin-bottom:10px;">
        <h4 style="color:#FFE066; margin:0; font-weight:800;">🌟 Atividades Diárias</h4>
        <button class="add-task-btn" onclick="window.parentShowTaskForm()">➕ Nova Tarefa</button>
      </div>

      <div class="settings-tasks-list" id="parentTasksList" style="max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
        <!-- Filled by renderParentTasksList() -->
      </div>
    </div>

    <div style="text-align:center; margin-top:16px;">
      <p style="color:rgba(255,255,255,0.5); font-size:0.78rem; margin:0 0 8px 0; font-weight:600;">Para configurar Matérias ou Calendário de Provas:</p>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button class="settings-save-btn" onclick="window.closeParentDashboard(); window.slideToAgenda();" style="background:rgba(116,192,252,0.15); border:2px solid #74C0FC; color:#74C0FC; width:auto; font-size:0.8rem; padding:6px 12px; box-shadow:none;">🎒 Ir para Agenda</button>
        <button class="settings-save-btn" onclick="window.closeParentDashboard(); window.slideToEvents();" style="background:rgba(255,157,193,0.15); border:2px solid #FF9DC1; color:#FF9DC1; width:auto; font-size:0.8rem; padding:6px 12px; box-shadow:none;">📅 Ir para Eventos</button>
      </div>
    </div>
  `;

  renderParentTasksList();
}

function renderParentTasksList() {
  const listContainer = document.getElementById('parentTasksList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const tasks = loadTasks();

  if (tasks.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; padding:16px; color:rgba(255,255,255,0.4); font-size:0.85rem; font-weight:700;">Nenhuma tarefa cadastrada.</div>`;
    return;
  }

  tasks.forEach(t => {
    const item = document.createElement('div');
    item.className = 'redemption-item';
    item.style.padding = '8px 12px';
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.3rem;">${t.emoji}</span>
        <span style="font-weight:700; color:white; font-size:0.9rem;">${t.name}</span>
      </div>
      <div class="redemption-actions">
        <button class="event-delete-btn" onclick="window.parentEditTask(${t.id})" title="Editar" style="border-color:rgba(255,255,255,0.2); color:#FFF; margin-right:4px;">✏️</button>
        <button class="event-delete-btn" onclick="window.parentDeleteTask(${t.id})" title="Excluir" style="border-color:rgba(255,107,107,0.4); color:#FF6B6B;">🗑️</button>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// ─── Tab: Cloud Sync ──────────────────────────────────────────────────────────

function renderSyncAdmin(container) {
  container.innerHTML = `
    <h3 style="color:white; margin-bottom:12px; font-weight:800;">☁️ Sincronização em Família</h3>
    <p style="color:rgba(255,255,255,0.6); font-size:0.85rem; line-height:1.4; margin-top:0; margin-bottom:16px;">
      Sincronize tarefas e prêmios em tempo real entre o celular dos pais e o tablet das crianças!
    </p>

    <div style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.06); border-radius:20px; padding:16px; margin-bottom:16px;">
      <div id="parentCloudStatus" style="font-size:0.9rem; margin-bottom:12px; font-weight:700; color:rgba(255,255,255,0.85);">
        Carregando status...
      </div>
      <div id="parentCloudActions"></div>
    </div>

    <div style="background:rgba(255,255,255,0.03); border-radius:18px; padding:12px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
      <span style="font-size:0.75rem; color:rgba(255,255,255,0.4); font-weight:600;">
        🛡️ Seus dados são salvos localmente primeiro e criptografados em trânsito.
      </span>
    </div>
  `;

  renderParentCloudSyncDetails();
}

function renderParentCloudSyncDetails() {
  const statusEl  = document.getElementById('parentCloudStatus');
  const actionsEl = document.getElementById('parentCloudActions');
  if (!statusEl || !actionsEl) return;

  const code = getFamilyCode();

  if (!supabase) {
    statusEl.innerHTML = `Sincronização na nuvem desligada. Operando offline.`;
    actionsEl.innerHTML = `
      <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; text-align:center;">
        <span style="font-size:0.85rem; color:rgba(255,255,255,0.6);">
          Para ativar a sincronização entre dispositivos, você precisa configurar as credenciais do Supabase. O aplicativo continuará funcionando perfeitamente 100% offline.
        </span>
      </div>
    `;
    return;
  }

  if (code) {
    statusEl.innerHTML = `Conectado à Família: <span style="color:#FFD166; font-size:1.15rem; font-weight:900; letter-spacing:1px;">${code}</span> 👨‍👩‍👧‍👦`;
    actionsEl.innerHTML = `
      <div style="display:flex; gap:8px;">
        <button class="settings-save-btn" onclick="window.parentDisconnectFamily()" style="background:rgba(255,107,107,0.15); border:2px solid #FF6B6B; color:#FF6B6B; box-shadow:none;">Desconectar 🔌</button>
        <button class="settings-save-btn" onclick="window.parentForceCloudPull()" style="background:#20c997; flex:1.5;">Atualizar Agora 🔄</button>
      </div>`;
  } else {
    statusEl.innerHTML = `Nuvem desligada. Operando no modo local offline-first.`;
    actionsEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; gap:8px;">
          <input type="text" id="parentJoinCodeInput" placeholder="Ex: SUPER-123456" maxlength="12" class="settings-name-input" style="background:rgba(255,255,255,0.1); color:white; margin-bottom:0; text-transform:uppercase; flex:1;">
          <button class="settings-save-btn" onclick="window.parentConnectFamily()" style="width:auto; white-space:nowrap; background:#20c997;">Conectar</button>
        </div>
        <div style="text-align:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:12px;">
          <span style="font-size:0.8rem; color:rgba(255,255,255,0.5); font-weight:600; display:block; margin-bottom:8px;">Quer criar um novo grupo para sua família?</span>
          <button class="settings-save-btn" onclick="window.parentCreateFamilyGroup()" style="background:linear-gradient(135deg,#7048E8,#C5A3FF); box-shadow:0 4px 12px rgba(112,72,232,0.3); width:auto; padding:6px 16px;">Criar Novo Grupo Família 👨‍👩‍👧‍👦</button>
        </div>
      </div>`;
  }
}

// ─── Window bindings — Rewards ────────────────────────────────────────────────

window.handleRedemptionApproval = (reqId, approved) => {
  const list = loadRedemptionRequests();
  const req  = list.find(r => r.id === reqId);
  if (!req) return;

  req.status = approved ? 'approved' : 'rejected';

  if (approved) {
    triggerHapticSuccess();
    showToast('🏆 Prêmio aprovado! Divirta-se!');
  } else {
    const balance = loadStarBalance();
    saveStarBalance(balance + req.cost);
    triggerHapticSuccess();
    showToast('❌ Solicitação recusada. Estrelas devolvidas!');
  }

  saveRedemptionRequests(list);
  renderActiveTabContent();

  if (window.renderRewardsShopShelf) window.renderRewardsShopShelf();
};

window.showAddRewardForm = () => {
  const box     = document.getElementById('rewardFormBox');
  const title   = document.getElementById('rewardFormTitle');
  const editId  = document.getElementById('editRewardId');
  const titleIn = document.getElementById('rewardTitleInput');
  const costIn  = document.getElementById('rewardCostInput');
  if (!box || !title || !editId || !titleIn || !costIn) return;

  box.style.display   = 'block';
  title.textContent   = 'Adicionar Prêmio 🎁';
  editId.value        = '';
  titleIn.value       = '';
  costIn.value        = '';
  titleIn.focus();
  triggerHapticImpact();
};

window.hideRewardForm = () => {
  const box = document.getElementById('rewardFormBox');
  if (box) { box.style.display = 'none'; triggerHapticImpact(); }
};

window.saveRewardDetails = () => {
  const editId  = document.getElementById('editRewardId').value;
  const title   = document.getElementById('rewardTitleInput').value.trim();
  const cost    = parseInt(document.getElementById('rewardCostInput').value.trim(), 10) || 0;

  if (!title) { alert('Por favor, digite o nome do prêmio! 🎁'); return; }
  if (cost <= 0) { alert('O prêmio precisa custar pelo menos 1 Estrela! ⭐'); return; }

  const list = loadRewardsList();

  if (editId) {
    const item = list.find(r => r.id === editId);
    if (item) { item.title = title; item.cost = cost; }
  } else {
    list.push({ id: 'rwd-' + Date.now(), title, cost });
  }

  saveRewardsList(list);
  triggerHapticSuccess();
  window.hideRewardForm();
  renderActiveTabContent();
  if (window.renderRewardsShopShelf) window.renderRewardsShopShelf();
};

window.editReward = (rwdId) => {
  const list = loadRewardsList();
  const item = list.find(r => r.id === rwdId);
  if (!item) return;

  const box     = document.getElementById('rewardFormBox');
  const title   = document.getElementById('rewardFormTitle');
  const editId  = document.getElementById('editRewardId');
  const titleIn = document.getElementById('rewardTitleInput');
  const costIn  = document.getElementById('rewardCostInput');
  if (!box || !title || !editId || !titleIn || !costIn) return;

  box.style.display = 'block';
  title.textContent = 'Editar Prêmio ✏️';
  editId.value      = item.id;
  titleIn.value     = item.title;
  costIn.value      = item.cost;
  titleIn.focus();
  triggerHapticImpact();
};

window.deleteReward = (rwdId) => {
  if (!confirm('Tem certeza que deseja apagar este prêmio da vitrine? 🥺')) return;
  const filtered = loadRewardsList().filter(r => r.id !== rwdId);
  saveRewardsList(filtered);
  triggerHapticImpact();
  renderActiveTabContent();
  if (window.renderRewardsShopShelf) window.renderRewardsShopShelf();
};

// ─── Window bindings — Activities ────────────────────────────────────────────

window.saveParentKidName = () => {
  const input = document.getElementById('parentKidNameInput');
  if (!input) return;
  const name = input.value.trim() || 'Supercriança!';
  setChildName(name);

  const span = document.getElementById('childNameSpan');
  if (span) span.textContent = name;

  triggerHapticSuccess();
  showToast(`Nome atualizado para: ${name}! 🦸`);
};

window.parentShowTaskForm = () => {
  closeParentDashboard();
  const tasks = loadTasks();
  import('./SettingsModal.js').then(m => {
    m.openSettingsModal(tasks, () => {
      m.renderSettingsTasksList(tasks, window.parentEditTask, window.parentDeleteTask);
    });
    m.showTaskForm(null, tasks);
  });
};

window.parentEditTask = (taskId) => {
  closeParentDashboard();
  const tasks = loadTasks();
  import('./SettingsModal.js').then(m => {
    m.openSettingsModal(tasks, () => {
      m.renderSettingsTasksList(tasks, window.parentEditTask, window.parentDeleteTask);
    });
    m.showTaskForm(taskId, tasks);
  });
};

window.parentDeleteTask = (taskId) => {
  if (!confirm('Quer mesmo apagar esta tarefa da rotina? 🥺')) return;

  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== taskId);
  saveTasks(tasks);

  const updatedIds = tasks.map(t => t.id);
  saveOrder(updatedIds);

  const done = loadDone();
  if (done.has(taskId)) {
    done.delete(taskId);
    saveDone(Array.from(done));
  }

  triggerHapticImpact();
  showToast('🗑️ Tarefa excluída!');

  renderParentTasksList();

  if (window.refreshChildView) window.refreshChildView();
};

// ─── Window bindings — Cloud Sync ────────────────────────────────────────────

window.parentDisconnectFamily = () => {
  if (!confirm('Tem certeza que quer desconectar deste grupo? Seus dados voltarão a ser apenas locais! 🥺')) return;
  setFamilyCode(null);
  triggerHapticImpact();
  renderActiveTabContent();
  showToast('🔌 Desconectado com sucesso!');
  setTimeout(() => window.location.reload(), 1000);
};

window.parentConnectFamily = async () => {
  const input = document.getElementById('parentJoinCodeInput');
  if (!input) return;
  const code = input.value.trim();
  if (!code) { showToast('⚠️ Por favor, digite o código de família!'); return; }

  showToast('🔌 Conectando...');
  const res = await joinFamily(code);
  if (res.success) {
    triggerHapticSuccess();
    showToast('👨‍👩‍👧‍👦 Conectado à família com sucesso!');
    await pullCloudData();
    renderActiveTabContent();
    setTimeout(() => window.location.reload(), 1200);
  } else {
    triggerHapticImpact();
    alert(res.error);
  }
};

window.parentCreateFamilyGroup = async () => {
  showToast('⚡ Criando grupo...');
  const code = await generateFamilyCode();
  if (code) {
    triggerHapticSuccess();
    alert(`🎉 Grupo criado com sucesso!\n\nSeu Código de Família: ${code}\n\nGuarde-o e use nos outros aparelhos para sincronizar! 😍`);

    const upload = (key, lsKey, parse = true) => {
      const raw = localStorage.getItem(lsKey);
      if (raw) return syncLocalToCloud(key, parse ? JSON.parse(raw) : raw);
    };

    await Promise.allSettled([
      upload('tasks',       'tarefas_custom_list'),
      upload('order',       'tarefas_order'),
      upload('agenda',      'tarefas_school_agenda'),
      upload('events',      'tarefas_events_calendar'),
      upload('child_name',  'tarefas_child_name', false),
      upload('done',        'tarefas_done'),
      upload('packed_books','tarefas_packed_books'),
      upload('star_balance','tarefas_star_balance'),
      upload('rewards',     'tarefas_rewards_list'),
      upload('redemptions', 'tarefas_redemption_requests'),
    ]);

    renderActiveTabContent();
    setTimeout(() => window.location.reload(), 1000);
  } else {
    triggerHapticImpact();
    alert('Erro ao criar grupo na nuvem. Verifique sua conexão!');
  }
};

window.parentForceCloudPull = async () => {
  showToast('🔄 Sincronizando...');
  const hasChanges = await pullCloudData();
  triggerHapticSuccess();
  showToast('💾 Sincronizado com a nuvem!');
  if (hasChanges) {
    setTimeout(() => window.location.reload(), 1000);
  } else {
    renderActiveTabContent();
  }
};

// ─── Public window bindings ───────────────────────────────────────────────────

window.openParentGate        = openParentGate;
window.closeParentGate       = closeParentGate;
window.checkParentGateAnswer = checkParentGateAnswer;
window.openParentDashboard   = openParentDashboard;
window.closeParentDashboard  = closeParentDashboard;
window.setParentTab          = setParentTab;

// ─── Local toast helper ───────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
