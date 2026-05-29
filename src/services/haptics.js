import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export async function triggerHapticImpact() {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (e) {
    // Fail silently in browser
  }
}

export async function triggerHapticSuccess() {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch (e) {
    // Fail silently in browser
  }
}
