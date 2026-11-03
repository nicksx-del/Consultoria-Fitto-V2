import { supabase } from '@/lib/supabase';
export async function nutritionApi<T>(
  profileId: string,
  linkId: string,
  action: string,
  payload: object = {},
): Promise<T> {
  const { data, error } = await supabase.rpc('nutrition_api', {
    profile_id: profileId,
    link_id: linkId,
    action,
    payload,
  });
  if (error)
    throw new Error(
      error.code === 'P0001'
        ? error.message
        : 'Não foi possível concluir. Confira a conexão e tente novamente.',
    );
  return data as T;
}
