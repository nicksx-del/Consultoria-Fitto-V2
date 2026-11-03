let context: AudioContext | null = null;
let preferences = { sound: false, vibration: false };
export const canPlayRestSound = typeof window !== 'undefined' && 'AudioContext' in window;
export function readRestAlerts() {
  try {
    const saved = JSON.parse(localStorage.getItem('fitto.restAlerts.v1') || '{}');
    preferences = { sound: saved.sound === true, vibration: saved.vibration === true };
  } catch {
    /* Preferences are optional. */
  }
  return preferences;
}
export async function setRestAlerts(next: typeof preferences) {
  if (next.sound && canPlayRestSound) {
    try {
      context ??= new AudioContext();
      await context.resume();
      if (context.state !== 'running') return false;
    } catch {
      return false;
    }
  }
  preferences = next;
  try {
    localStorage.setItem('fitto.restAlerts.v1', JSON.stringify(next));
  } catch {
    /* Storage may be unavailable. */
  }
  return true;
}
export function playRestAlert() {
  if (
    preferences.vibration &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  )
    try {
      navigator.vibrate([180, 100, 180]);
    } catch {
      /* Vibration may be blocked by the device. */
    }
  if (!preferences.sound || !context || context.state !== 'running') return;
  try {
    for (let i = 0; i < 2; i++) {
      const tone = context.createOscillator(),
        gain = context.createGain(),
        time = context.currentTime + i * 0.28;
      tone.frequency.value = 880;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
      tone.start(time);
      tone.stop(time + 0.22);
    }
  } catch {
    /* A blocked alert must never interrupt the workout. */
  }
}
