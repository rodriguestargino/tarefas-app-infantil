import { describe, it, expect, beforeEach } from 'vitest';
import {
  store,
  todayStr,
  loadTasks,
  saveTasks,
  saveOrder,
  loadDone,
  saveDone,
  saveTimerState,
  loadTimerState,
  clearTimerState,
  getChildName,
  setChildName
} from './storage.js';

describe('Storage Service Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default tasks if storage is empty', () => {
    const tasks = loadTasks();
    expect(tasks).toBeInstanceOf(Array);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]).toHaveProperty('name');
  });

  it('should save and load custom tasks', () => {
    const customList = [
      { id: 99, name: 'Test Task', emoji: '🧪', color: 'blue', duration: 0, timeLabel: 'Livre' }
    ];
    saveTasks(customList);
    const loaded = loadTasks();
    expect(loaded).toEqual(customList);
  });

  it('should save and load order correctly', () => {
    const tasks = loadTasks();
    const originalIds = tasks.map(t => t.id);
    const reversedIds = [...originalIds].reverse();

    saveOrder(reversedIds);

    const loadedOrdered = loadTasks();
    const loadedIds = loadedOrdered.map(t => t.id);
    expect(loadedIds).toEqual(reversedIds);
  });

  it('should manage child name', () => {
    expect(getChildName()).toBe('Supercriança!');
    setChildName('Maria');
    expect(getChildName()).toBe('Maria');
  });

  it('should save, load, and clear timer state', () => {
    const state = { taskId: 1, remaining: 100, total: 200, paused: false, savedAt: Date.now() };
    saveTimerState(state);
    expect(loadTimerState()).toEqual(state);

    clearTimerState();
    expect(loadTimerState()).toBeNull();
  });

  it('should load and save done tasks for today', () => {
    const doneIds = [1, 3];
    saveDone(doneIds);
    
    const loaded = loadDone();
    expect(loaded).toBeInstanceOf(Set);
    expect(loaded.has(1)).toBe(true);
    expect(loaded.has(3)).toBe(true);
    expect(loaded.has(2)).toBe(false);
  });
});
