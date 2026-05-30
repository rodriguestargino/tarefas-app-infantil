import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { playTick, playDoneSound } from '../services/audio.js';
import { loadCalendarEvents, saveCalendarEvents } from '../services/storage.js';

// In-memory states
let selectedType = 'exam'; // Default type for new event
let isFormVisible = false;

function getDaysRemaining(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Parse event date in local timezone
  const eventDate = new Date(dateStr + 'T00:00:00');
  
  const diffTime = eventDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateBr(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function renderEvents() {
  const container = document.getElementById('slideEvents');
  if (!container) return;

  const events = loadCalendarEvents();
  
  // Sort events by date (closest first)
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  // Split into future/today vs past
  const activeEvents = sortedEvents.filter(e => getDaysRemaining(e.date) >= 0);
  const pastEvents = sortedEvents.filter(e => getDaysRemaining(e.date) < 0);

  const CATEGORY_LABELS = {
    exam: '📝 Prova',
    party: '🎂 Festa',
    school: '🎒 Escola',
    other: '🎨 Outros'
  };

  let html = `
    <div class="container">
      <!-- Top Navigation Bar -->
      <div class="top-nav-bar">
        <button class="top-nav-btn" data-tab="tasks" onclick="window.slideToTasks()">🌟 Tarefas</button>
        <button class="top-nav-btn" data-tab="agenda" onclick="window.slideToAgenda()">🎒 Agenda</button>
        <button class="top-nav-btn active" data-tab="events" onclick="window.slideToEvents()">📅 Provas e Festas</button>
      </div>

      <!-- Header -->
      <div class="header" style="margin-bottom: 18px;">
        <span class="sun-icon">📅</span>
        <div class="title-box" style="background: linear-gradient(135deg, #C5A3FF, #FF9DC1, #FFD166)">
          <h1>✨ Provas e Festas! ✨</h1>
          <div class="subtitle">Não perca nenhuma data especial! 🎈</div>
        </div>
      </div>

      <!-- Main Section -->
      <div class="events-section">
        
        <!-- BUTTON TO OPEN FORM -->
        <div class="agenda-config-bar" style="margin-bottom: 6px;">
          <button class="agenda-config-btn" onclick="window.toggleEventsEditor()" style="background: #F3F0FF; border-color: #C5A3FF; color: #7048E8; box-shadow: 0 4px 12px rgba(197,163,255,0.15);">
            ${isFormVisible ? '❌ Fechar Cadastro' : '⚙️ Adicionar Nova Data'}
          </button>
        </div>

        <!-- NEW EVENT FORM (Collapsible) -->
        <div class="event-form-card" id="eventFormBox" style="display: ${isFormVisible ? 'block' : 'none'}; animation: popIn 0.3s cubic-bezier(.34,1.56,.64,1);">
          <div class="event-form-title">✏️ Cadastrar Data Especial</div>
          
          <div class="agenda-editor-box">
            <div class="agenda-edit-group">
              <label class="agenda-edit-label">O que vai acontecer? (Título):</label>
              <input type="text" id="eventTitleInput" class="agenda-edit-input" placeholder="Ex: Prova de História, Niver da Gabi...">
            </div>

            <div class="agenda-edit-group">
              <label class="agenda-edit-label">Quando? (Data):</label>
              <input type="date" id="eventDateInput" class="agenda-edit-input">
            </div>

            <div class="agenda-edit-group">
              <label class="agenda-edit-label">Qual é o tipo?</label>
              <div class="event-type-options">
                <button class="event-type-btn ${selectedType === 'exam' ? 'active' : ''}" data-type="exam" onclick="window.selectEventType('exam')">📝 Prova</button>
                <button class="event-type-btn ${selectedType === 'party' ? 'active' : ''}" data-type="party" onclick="window.selectEventType('party')">🎂 Festa</button>
                <button class="event-type-btn ${selectedType === 'school' ? 'active' : ''}" data-type="school" onclick="window.selectEventType('school')">🎒 Escola</button>
                <button class="event-type-btn ${selectedType === 'other' ? 'active' : ''}" data-type="other" onclick="window.selectEventType('other')">🎨 Outros</button>
              </div>
            </div>

            <div class="form-btns-row" style="margin-top: 10px;">
              <button class="form-btn form-btn-cancel" onclick="window.toggleEventsEditor()">Fechar</button>
              <button class="form-btn form-btn-save" onclick="window.saveNewCalendarEvent()" style="background:#C5A3FF; border-color:#C5A3FF;">Salvar 💾</button>
            </div>
          </div>
        </div>

        <!-- EVENTS TIMELINE -->
        <div class="events-list">
          ${
            activeEvents.length > 0
              ? activeEvents.map(event => {
                  const daysLeft = getDaysRemaining(event.date);
                  let badgeText = '';
                  let badgeClass = '';
                  
                  if (daysLeft === 0) {
                    badgeText = 'É HOJE! 🎉';
                  } else if (daysLeft === 1) {
                    badgeText = 'Amanhã! ⏰';
                  } else {
                    badgeText = `Faltam ${daysLeft} dias!`;
                  }

                  return `
                    <div class="event-card ${event.type}">
                      <div class="event-info">
                        <span class="event-title">${event.title}</span>
                        <div class="event-date-text">
                          📅 ${formatDateBr(event.date)} &bull; ${CATEGORY_LABELS[event.type]}
                        </div>
                      </div>
                      <div class="event-right">
                        <span class="event-days-badge">${badgeText}</span>
                        <button class="event-delete-btn" onclick="window.deleteCalendarEvent('${event.id}')" title="Excluir">🗑️</button>
                      </div>
                    </div>
                  `;
                }).join('')
              : `
                <div class="no-items-msg" style="border-color: #C5A3FF;">
                  Nenhuma data especial cadastrada! Que tal adicionar uma? 😍
                </div>
              `
          }
        </div>

        <!-- PAST EVENTS (Collapsible / Optional subtle list) -->
        ${
          pastEvents.length > 0
            ? `
              <div style="margin-top: 16px; opacity: 0.65;">
                <div class="section-title" style="font-size: 1.05rem; color: #777;">🍃 Datas que já passaram:</div>
                <div class="events-list">
                  ${
                    pastEvents.map(event => `
                      <div class="event-card ${event.type}" style="transform: none; box-shadow: none; filter: grayscale(0.5); opacity: 0.6;">
                        <div class="event-info">
                          <span class="event-title" style="text-decoration: line-through;">${event.title}</span>
                          <div class="event-date-text">
                            📅 ${formatDateBr(event.date)}
                          </div>
                        </div>
                        <div class="event-right">
                          <span class="event-days-badge" style="background: #999; box-shadow: none;">Já passou!</span>
                          <button class="event-delete-btn" onclick="window.deleteCalendarEvent('${event.id}')">🗑️</button>
                        </div>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
            `
            : ''
        }

      </div>

      <div class="grass-footer" style="filter: hue-rotate(280deg) drop-shadow(0 -4px 8px rgba(0,0,0,.08))">🌿🎈🌿🎂🌿✏️🌿🎓🌿</div>
    </div>
  `;

  container.innerHTML = html;

  // Keep today's date as default in date input if form is open
  const dateInput = document.getElementById('eventDateInput');
  if (dateInput && !dateInput.value) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
  }
}

export function toggleEventsEditor() {
  isFormVisible = !isFormVisible;
  triggerHapticImpact();
  renderEvents();
  
  if (isFormVisible) {
    const box = document.getElementById('eventFormBox');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function selectEventType(type) {
  selectedType = type;
  triggerHapticImpact();
  renderEvents();
}

export function saveNewCalendarEvent() {
  const titleInput = document.getElementById('eventTitleInput');
  const dateInput = document.getElementById('eventDateInput');
  if (!titleInput || !dateInput) return;

  const title = titleInput.value.trim();
  const date = dateInput.value;

  if (!title) {
    alert('Por favor, dê um título divertido para a sua data especial! ✍️');
    return;
  }

  if (!date) {
    alert('Por favor, escolha um dia no calendário! 📅');
    return;
  }

  const newEvent = {
    id: 'evt-' + Date.now(),
    title,
    date,
    type: selectedType,
    notified: false
  };

  const events = loadCalendarEvents();
  events.push(newEvent);
  saveCalendarEvents(events);

  triggerHapticSuccess();
  playDoneSound();

  // Reset states
  titleInput.value = '';
  isFormVisible = false;
  selectedType = 'exam';

  renderEvents();

  // Show dynamic toast
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = '📅 Nova data especial salva com sucesso!';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }
}

export function deleteCalendarEvent(id) {
  if (confirm('Tem certeza que quer apagar esta data especial? 🥺')) {
    const events = loadCalendarEvents();
    const filtered = events.filter(e => e.id !== id);
    saveCalendarEvents(filtered);

    triggerHapticImpact();
    renderEvents();

    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '🗑️ Data especial excluída!';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    }
  }
}

// Bind to window for HTML accessibility
window.toggleEventsEditor = () => toggleEventsEditor();
window.selectEventType = (type) => selectEventType(type);
window.saveNewCalendarEvent = () => saveNewCalendarEvent();
window.deleteCalendarEvent = (id) => deleteCalendarEvent(id);
