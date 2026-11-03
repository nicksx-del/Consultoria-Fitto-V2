import type { Profile } from './api';
export type ProfileDraft = Pick<
  Profile,
  'display_name' | 'username' | 'bio' | 'avatar_url' | 'location' | 'website' | 'focus'
>;
export function profileDraft(profile: Profile): ProfileDraft {
  return {
    display_name: profile.display_name || '',
    username: profile.username || '',
    bio: profile.bio || '',
    avatar_url: profile.avatar_url,
    location: profile.location || '',
    website: profile.website || '',
    focus: profile.focus || '',
  };
}
export function profileLink(value: string): string {
  const text = value.trim();
  if (!text) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.includes('.') ||
      url.username ||
      url.password ||
      /\s/.test(text)
    )
      throw Error();
    return url.href;
  } catch {
    throw new Error('Use um link válido e seguro, como https://seusite.com.br.');
  }
}
export function validateProfile(draft: ProfileDraft) {
  const values = {
    ...draft,
    display_name: draft.display_name.trim(),
    username: draft.username.trim().toLowerCase().replace(/^@/, ''),
    bio: draft.bio.trim(),
    focus: draft.focus.trim(),
    location: draft.location.trim(),
    website: draft.website.trim(),
  };
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};
  if (values.display_name.length < 2 || values.display_name.length > 80)
    errors.display_name = 'Use de 2 a 80 caracteres no nome.';
  if (!/^[a-z0-9_]{3,24}$/.test(values.username))
    errors.username = 'Use de 3 a 24 letras minúsculas, números ou _.';
  if (values.bio.length > 280) errors.bio = 'A biografia pode ter até 280 caracteres.';
  if (values.focus.length > 160) errors.focus = 'Use até 160 caracteres para seu foco.';
  if (values.location.length > 80) errors.location = 'Use até 80 caracteres para a localização.';
  try {
    values.website = profileLink(values.website);
    if (values.website.length > 250) errors.website = 'Use um link de até 250 caracteres.';
  } catch (e) {
    errors.website = (e as Error).message;
  }
  return { values, errors };
}
export function profileChecklist(profile: ProfileDraft) {
  return [
    {
      key: 'display_name',
      label: 'Nome e identificação',
      done: !!profile.display_name.trim() && !!profile.username.trim(),
      section: 'identity',
    },
    { key: 'avatar_url', label: 'Foto de perfil', done: !!profile.avatar_url, section: 'identity' },
    {
      key: 'bio',
      label: 'Uma apresentação sobre você',
      done: !!profile.bio.trim(),
      section: 'about',
    },
    { key: 'focus', label: 'Foco ou objetivo', done: !!profile.focus.trim(), section: 'about' },
    {
      key: 'location',
      label: 'Cidade ou região',
      done: !!profile.location.trim(),
      section: 'contact',
    },
    {
      key: 'website',
      label: 'Um link de contato',
      done: !!profile.website.trim(),
      section: 'contact',
    },
  ] as const;
}
export function profilePresentation(profile: Profile) {
  return [
    profile.display_name,
    `@${profile.username}`,
    profile.role === 'professional' ? profile.specialties.join(' · ') : 'Perfil de aluno Fitto',
    profile.bio,
    profile.focus ? `Foco: ${profile.focus}` : '',
    profile.location,
    profile.website,
  ]
    .filter(Boolean)
    .join('\n');
}
