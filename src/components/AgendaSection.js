import { triggerHapticImpact, triggerHapticSuccess } from '../services/haptics.js';
import { playTick, playDoneSound } from '../services/audio.js';
import {
  loadSchoolAgenda,
  saveSchoolAgenda,
  loadPackedBooks,
  savePackedBooks
} from '../services/storage.js';

const DAY_NAMES = [
  "Segunda-feira ☀️",
  "Terça-feira 🌈",
  "Quarta-feira 🌸",
  "Quinta-feira ⭐",
  "Sexta-feira 🎉",
  "Sábado 🎮",
  "Domingo 🌙"
];

// In memory states
let agenda = loadSchoolAgenda();
let packedItems = loadPackedBooks();
let selectedDayIdx = null;

export function getSelectedDayIdx() {
  if (selectedDayIdx === null) {
    const todayIdx = new Date().getDay();
    return todayIdx === 0 ? 6 : todayIdx - 1;
  }
  return selectedDayIdx;
}

export function setSelectedDayIdx(idx) {
  selectedDayIdx = idx;
}

export function renderAgenda() {
  const container = document.getElementById('slideAgenda');
  if (!container) return;

  // Retrieve current active day index (defaults to today)
  const dayIdx = getSelectedDayIdx();

  // Retrieve today's data
  agenda = loadSchoolAgenda();
  packedItems = loadPackedBooks();
  const todayData = agenda[dayIdx] || { subjects: "", books: [] };

  // Parse subjects
  const subjectsArray = todayData.subjects
    ? todayData.subjects.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Parse books
  const booksArray = todayData.books || [];

  // Calculate progress
  const totalBooks = booksArray.length;
  const packedCount = booksArray.filter(b => packedItems.includes(b)).length;
  const progressPct = totalBooks > 0 ? Math.round((packedCount / totalBooks) * 100) : 0;

  // Build the complete HTML
  let html = `
    <div class="container">
      <!-- Botão Minhas Tarefas no Canto Superior Direito -->
      <button class="agenda-trigger-btn" onclick="window.slideToTasks()" style="border-color: #FF9DC1; color: #E64980; box-shadow: 0 4px 12px rgba(255,157,193,0.15);">🌟 Minhas Tarefas</button>

      <!-- Header -->
      <div class="header" style="margin-bottom: 18px;">
        <span class="sun-icon">🎒</span>
        <div class="title-box" style="background: linear-gradient(135deg, #74C0FC, #A5D8FF, #C5A3FF)">
          <h1>✨ Agenda Escolar ✨</h1>
          <div class="subtitle" id="agendaTodayName">${DAY_NAMES[dayIdx]}</div>
        </div>
      </div>

      <!-- Seleção de Dias para Teste da Agenda -->
      <div class="days-row" id="agendaDaysRow" style="margin-bottom: 18px;">
        <button class="day-btn ${dayIdx === 0 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(0)">☀️ Seg</button>
        <button class="day-btn ${dayIdx === 1 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(1)">🌈 Ter</button>
        <button class="day-btn ${dayIdx === 2 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(2)">🌸 Qua</button>
        <button class="day-btn ${dayIdx === 3 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(3)">⭐ Qui</button>
        <button class="day-btn ${dayIdx === 4 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(4)">🎉 Sex</button>
        <button class="day-btn ${dayIdx === 5 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(5)">🎮 Sáb</button>
        <button class="day-btn ${dayIdx === 6 ? 'active' : ''}" onclick="window.setAgendaSelectedDay(6)">🌙 Dom</button>
      </div>

      <!-- Main Agenda Section -->
      <div class="agenda-section">
        
        <!-- SUBJECTS CARD -->
        <div class="subjects-card">
          <div class="section-title">📚 Matérias de Hoje</div>
          <div class="subjects-list">
            ${
              subjectsArray.length > 0
                ? subjectsArray.map(sub => `<span class="subject-badge">${sub}</span>`).join('')
                : `<div class="no-subjects-msg">Nenhuma matéria para hoje! 🪁</div>`
            }
          </div>
        </div>

        <!-- BACKPACK PACKING CARD -->
        <div class="backpack-card">
          <div class="section-title">🎒 Livros na Mochila!</div>
          
          ${
            booksArray.length > 0
              ? `
                <div class="backpack-progress">
                  <span>Colocados na mochila: <b>${packedCount}</b> de <b>${totalBooks}</b></span>
                  <span class="pct">${progressPct}%</span>
                </div>
                
                <div class="progress-track" style="margin-bottom: 16px;">
                  <div class="progress-fill" style="width: ${progressPct}%; background: linear-gradient(90deg, #FF6CAB, #FFD166);"></div>
                </div>

                <div class="backpack-items-list">
                  ${
                    booksArray.map((book, index) => {
                      const isPacked = packedItems.includes(book);
                      return `
                        <div class="backpack-item ${isPacked ? 'packed' : ''}" onclick="window.toggleBackpackItem('${book.replace(/'/g, "\\'")}')">
                          <div class="backpack-checkbox">${isPacked ? '✓' : '🎒'}</div>
                          <span class="backpack-item-name">${book}</span>
                        </div>
                      `;
                    }).join('')
                  }
                </div>
              `
              : `<div class="no-items-msg">Nenhum livro para organizar hoje! Aproveite! 😎</div>`
          }
        </div>

        <!-- AGENDA CONFIG BUTTON AND BOX -->
        <div class="agenda-config-bar">
          <button class="agenda-config-btn" onclick="window.toggleAgendaEditor()">⚙️ Personalizar Agenda Semanal</button>
        </div>

        <!-- Hidden editor box by default -->
        <div class="backpack-card" id="agendaEditorBox" style="display: none; animation: popIn 0.3s cubic-bezier(.34,1.56,.64,1);">
          <div class="section-title">✏️ Cadastro da Agenda Semanal</div>
          
          <div class="agenda-editor-box">
            <div class="agenda-edit-group">
              <label class="agenda-edit-label">Selecione o Dia:</label>
              <select id="editAgendaDaySelect" class="agenda-day-select" onchange="window.loadSelectedDayToEditor()">
                <option value="0">Segunda-feira</option>
                <option value="1">Terça-feira</option>
                <option value="2">Quarta-feira</option>
                <option value="3">Quinta-feira</option>
                <option value="4">Sexta-feira</option>
                <option value="5">Sábado</option>
                <option value="6">Domingo</option>
              </select>
            </div>

            <div class="agenda-edit-group">
              <label class="agenda-edit-label">Matérias (separadas por vírgula):</label>
              <input type="text" id="editAgendaSubjectsInput" class="agenda-edit-input" placeholder="Ex: Matemática, Português, Ciências">
            </div>

            <div class="agenda-edit-group">
              <label class="agenda-edit-label">Itens/Livros da Mochila (um por linha):</label>
              <textarea id="editAgendaBooksInput" class="agenda-edit-textarea" placeholder="Ex:\nLivro de Matemática\nLivro de Português\nLancheira"></textarea>
              <small class="agenda-edit-hint">Dica: Escreva cada material em uma linha diferente!</small>
            </div>

            <div class="form-btns-row" style="margin-top: 10px;">
              <button class="form-btn form-btn-cancel" onclick="window.toggleAgendaEditor()">Fechar</button>
              <button class="form-btn form-btn-save" onclick="window.saveAgendaEditorDetails()" style="background:#74C0FC; border-color:#74C0FC;">Salvar 💾</button>
            </div>
          </div>
        </div>

      </div>

      <div class="grass-footer">🌿🎒🌿🎓🌿🍎🌿🖊️🌿</div>
    </div>
  `;

  container.innerHTML = html;

  // Set the selected day select to today's dayIdx
  const select = document.getElementById('editAgendaDaySelect');
  if (select) {
    select.value = dayIdx;
    loadSelectedDayToEditor();
  }
}

export function togglePackedItem(itemName) {
  packedItems = loadPackedBooks();
  const wasPacked = packedItems.includes(itemName);

  if (wasPacked) {
    packedItems = packedItems.filter(item => item !== itemName);
    triggerHapticImpact();
    playTick();
  } else {
    packedItems.push(itemName);
    triggerHapticSuccess();
    
    // Check if everything is packed today to play big sound
    const dayIdx = getSelectedDayIdx();
    const booksArray = agenda[dayIdx]?.books || [];
    const isAllPackedNow = booksArray.every(b => packedItems.includes(b));
    
    if (isAllPackedNow) {
      playDoneSound();
    } else {
      playTick();
    }
  }

  savePackedBooks(packedItems);
  renderAgenda();
}

export function toggleAgendaEditor() {
  const box = document.getElementById('agendaEditorBox');
  if (!box) return;
  
  if (box.style.display === 'none') {
    box.style.display = 'block';
    triggerHapticImpact();
    // Scroll editor into view
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    box.style.display = 'none';
    triggerHapticImpact();
  }
}

export function loadSelectedDayToEditor() {
  const select = document.getElementById('editAgendaDaySelect');
  const subjectsInput = document.getElementById('editAgendaSubjectsInput');
  const booksInput = document.getElementById('editAgendaBooksInput');
  if (!select || !subjectsInput || !booksInput) return;

  const dayVal = parseInt(select.value);
  agenda = loadSchoolAgenda();
  const dayData = agenda[dayVal] || { subjects: "", books: [] };

  subjectsInput.value = dayData.subjects || "";
  booksInput.value = (dayData.books || []).join('\n');
}

export function saveAgendaEditorDetails() {
  const select = document.getElementById('editAgendaDaySelect');
  const subjectsInput = document.getElementById('editAgendaSubjectsInput');
  const booksInput = document.getElementById('editAgendaBooksInput');
  if (!select || !subjectsInput || !booksInput) return;

  const dayVal = parseInt(select.value);
  const subjects = subjectsInput.value.trim();
  const booksText = booksInput.value.trim();
  
  // Parse lines to array
  const books = booksText
    ? booksText.split('\n').map(line => line.trim()).filter(Boolean)
    : [];

  agenda = loadSchoolAgenda();
  agenda[dayVal] = { subjects, books };
  saveSchoolAgenda(agenda);

  triggerHapticSuccess();
  
  // Close the editor box
  const box = document.getElementById('agendaEditorBox');
  if (box) box.style.display = 'none';
  
  // Re-render
  renderAgenda();

  // Show a visual success toast
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = '💾 Agenda salva com sucesso!';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  }
}

// Bind to window for HTML accessibility
window.toggleBackpackItem = (itemName) => {
  togglePackedItem(itemName);
};

window.toggleAgendaEditor = () => {
  toggleAgendaEditor();
};

window.loadSelectedDayToEditor = () => {
  loadSelectedDayToEditor();
};

window.saveAgendaEditorDetails = () => {
  saveAgendaEditorDetails();
};
