import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/haptics', () => {
  return {
    Haptics: {
      impact: vi.fn().mockResolvedValue(undefined),
      notification: vi.fn().mockResolvedValue(undefined),
    },
    ImpactStyle: {
      Light: 'LIGHT'
    },
    NotificationType: {
      Success: 'SUCCESS'
    }
  };
});

import { Haptics } from '@capacitor/haptics';
import { triggerHapticImpact, triggerHapticSuccess } from './haptics.js';

describe('Haptics Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger Haptics.impact with Light style', async () => {
    await triggerHapticImpact();
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('should trigger Haptics.notification with Success type', async () => {
    await triggerHapticSuccess();
    expect(Haptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });
});
