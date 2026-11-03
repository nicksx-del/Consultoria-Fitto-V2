import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  role: 'student' | 'professional';
  display_name: string;
  username: string;
  specialties: string[];
  bio: string;
  avatar_url: string | null;
  location: string;
  website: string;
  focus: string;
};
export type Relationship = {
  is_self?: boolean;
  id: string;
  status: 'pending' | 'active' | 'rejected' | 'ended';
  name: string;
  username: string;
  specialties: string[];
  created_at: string;
  whatsapp: string | null;
};
export type Dashboard = {
  links: Relationship[];
  limit: number;
  whatsapp: string | null;
  blocked_until: string | null;
};
export type Invite = { code: string; token: string; expires_at: string };
export type Preview = { name: string; username: string; specialties: string[] };

export class RelationshipError extends Error {
  constructor(
    message: string,
    public blockedUntil?: string,
  ) {
    super(message);
  }
}
export async function relationshipApi<T>(
  action: string,
  profileId: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.rpc('relationship_api', {
    action,
    payload: { ...payload, profile_id: profileId },
  });
  if (error)
    throw new Error(
      error.code === 'P0001'
        ? error.message
        : 'Não foi possível concluir. Verifique a conexão e tente novamente.',
    );
  if (data?.error)
    throw new RelationshipError(
      data.error + (data.remaining != null ? ` Tentativas restantes: ${data.remaining}.` : ''),
      data.blocked_until,
    );
  return data as T;
}
export const pendingInvite = {
  get: () =>
    typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('fitto.pendingInvite'),
  set: (token: string) => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('fitto.pendingInvite', token);
  },
  clear: () => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('fitto.pendingInvite');
  },
};
