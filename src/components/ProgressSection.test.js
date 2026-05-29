import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateProgress, updateStars } from './ProgressSection.js';

vi.mock('../services/haptics.js', () => {
  return {
    triggerHapticSuccess: vi.fn(),
    triggerHapticImpact: vi.fn(),
  };
});

describe('ProgressSection Component Tests', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="doneCount">0</div>
      <div id="totalCount">0</div>
      <div id="progressFill" style="width: 0%"></div>
      <div id="starsRow"></div>
      <div id="celebration" class=""></div>
      <div id="tasksGrid"></div>
    `;
  });

  it('should update stars row based on tasks length', () => {
    updateStars(3);
    const starsRow = document.getElementById('starsRow');
    expect(starsRow.children.length).toBe(3);
    expect(starsRow.children[0].textContent).toBe('⭐');
  });

  it('should update progress text, fill percentage and lit stars', () => {
    const tasks = [
      { id: 1, name: 'Task 1' },
      { id: 2, name: 'Task 2' },
      { id: 3, name: 'Task 3' },
    ];
    
    updateStars(tasks.length);
    
    const grid = document.getElementById('tasksGrid');
    const card1 = document.createElement('div');
    card1.className = 'task-card done';
    grid.appendChild(card1);
    
    const card2 = document.createElement('div');
    card2.className = 'task-card';
    grid.appendChild(card2);
    
    updateProgress(tasks);
    
    expect(document.getElementById('doneCount').textContent).toBe('1');
    expect(document.getElementById('totalCount').textContent).toBe('3');
    expect(document.getElementById('progressFill').style.width).toBe('33.33333333333333%');
    
    const stars = document.querySelectorAll('.star-item');
    expect(stars[0].classList.contains('lit')).toBe(true);
    expect(stars[1].classList.contains('lit')).toBe(false);
  });

  it('should handle division by zero (empty tasks list)', () => {
    updateProgress([]);
    
    expect(document.getElementById('doneCount').textContent).toBe('0');
    expect(document.getElementById('totalCount').textContent).toBe('0');
    expect(document.getElementById('progressFill').style.width).toBe('0%');
  });

  it('should trigger celebration class and confetti when all tasks are done', () => {
    const tasks = [{ id: 1, name: 'Task 1' }];
    updateStars(1);
    
    const grid = document.getElementById('tasksGrid');
    const card = document.createElement('div');
    card.className = 'task-card done';
    grid.appendChild(card);
    
    updateProgress(tasks);
    
    expect(document.getElementById('celebration').classList.contains('show')).toBe(true);
  });
});
