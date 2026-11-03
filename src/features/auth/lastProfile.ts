export function readLastProfile(userId: string): string | null {
  try {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(`fitto.last-profile:${userId}`);
  } catch {
    return null;
  }
}
export function rememberProfile(userId: string, profileId: string) {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(`fitto.last-profile:${userId}`, profileId);
  } catch {
    /* Storage is optional. */
  }
}
