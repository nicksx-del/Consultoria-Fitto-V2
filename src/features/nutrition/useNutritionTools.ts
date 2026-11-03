import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { emptyTools, NutritionTools } from './nutritionTools';
export async function toolsApi<T>(
  profileId: string,
  action: string,
  payload: object = {},
): Promise<T> {
  const { data, error } = await supabase.rpc('nutrition_tools', {
    profile_id: profileId,
    action,
    payload,
  });
  if (error)
    throw new Error(
      error.code === 'P0001'
        ? error.message
        : 'Não foi possível carregar ou salvar os atalhos. Tente novamente.',
    );
  return data as T;
}
export function useNutritionTools(profileId?: string) {
  const [content, setContent] = useState(emptyTools),
    [ready, setReady] = useState(!profileId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const current = useRef({ content: emptyTools(), version: 0 }),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (profileId)
      void toolsApi<{ content: NutritionTools; version: number }>(profileId, 'read')
        .then((value) => {
          if (alive.current) {
            current.current = value;
            setContent(value.content);
            setReady(true);
          }
        })
        .catch((e) => {
          if (alive.current) setError(e.message);
        });
    return () => {
      alive.current = false;
    };
  }, [profileId]);
  async function update(change: (value: NutritionTools) => NutritionTools) {
    if (lock.current || !ready)
      throw new Error('Aguarde os atalhos carregarem ou reabra o editor.');
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = change(current.current.content);
      const result = profileId
        ? await toolsApi<{ content: NutritionTools; version: number }>(profileId, 'save', {
            content: next,
            version: current.current.version,
          })
        : { content: next, version: current.current.version + 1 };
      current.current = result;
      if (alive.current) setContent(result.content);
    } catch (e) {
      if (alive.current) setError((e as Error).message);
      throw e;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { content, ready, busy, error, update };
}
