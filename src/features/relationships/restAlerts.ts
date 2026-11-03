import { Vibration } from 'react-native';
let preferences = { sound: false, vibration: false };
export const canPlayRestSound = false;
export function readRestAlerts() {
  return preferences;
}
export async function setRestAlerts(next: typeof preferences) {
  preferences = next;
  return true;
}
export function playRestAlert() {
  if (preferences.vibration) Vibration.vibrate([0, 180, 100, 180]);
}
