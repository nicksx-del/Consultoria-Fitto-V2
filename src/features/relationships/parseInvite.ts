export function parseInvite(value: string, origin: string): string | null {
  const raw = value.trim();
  if (/^\d{3}\s?\d{3}$/.test(raw)) return raw.replace(/\s/g, '');
  if (/^[a-f0-9]{64}$/.test(raw)) return raw;
  try {
    const url = new URL(raw, origin);
    const allowed = [
      origin,
      'https://consultoria-fitto-v2.vercel.app',
      'https://consultoria-fitto-v2-nicolas-ss-projects.vercel.app',
    ];
    if (
      !allowed.includes(url.origin) ||
      url.username ||
      url.password ||
      url.pathname.replace(/\/$/, '') !== '/convite'
    )
      return null;
    const token = url.searchParams.get('token');
    return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
