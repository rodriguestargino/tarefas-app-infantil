import { triggerHapticSuccess } from '../services/haptics.js';

export function launchConfetti() {
  const emo = ['🎊','⭐','🌟','💫','🎉','🏆','❤️','🥳'];
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('div');
    el.textContent = emo[Math.floor(Math.random()*emo.length)];
    el.style.cssText = `position:fixed;font-size:${1+Math.random()*1.5}rem;left:${Math.random()*100}vw;top:-40px;z-index:9999;animation:fall ${1.5+Math.random()*2}s ease-in forwards;animation-delay:${Math.random()}s;pointer-events:none`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

export function updateStars(tasksLength) {
  const sr = document.getElementById('starsRow');
  if (!sr) return;
  sr.innerHTML = '';
  for (let i = 0; i < tasksLength; i++) {
    const s = document.createElement('span');
    s.className = 'star-item';
    s.textContent = '⭐';
    sr.appendChild(s);
  }
}

export function updateProgress(tasks) {
  const done = document.querySelectorAll('.task-card.done').length;
  const total = tasks.length;
  
  const doneCountEl = document.getElementById('doneCount');
  const totalCountEl = document.getElementById('totalCount');
  const progressFillEl = document.getElementById('progressFill');
  const celebrationEl = document.getElementById('celebration');
  
  if (doneCountEl) doneCountEl.textContent = done;
  if (totalCountEl) totalCountEl.textContent = total;
  
  const pct = total > 0 ? (done / total * 100) : 0;
  if (progressFillEl) progressFillEl.style.width = pct + '%';
  
  const stars = document.querySelectorAll('.star-item');
  const lit = total > 0 ? Math.round(done / total * stars.length) : 0;
  stars.forEach((s, i) => i < lit ? s.classList.add('lit') : s.classList.remove('lit'));
  
  if (celebrationEl) {
    if (total > 0 && done === total) {
      celebrationEl.classList.add('show');
      launchConfetti();
      triggerHapticSuccess();
    } else {
      celebrationEl.classList.remove('show');
    }
  }
}
