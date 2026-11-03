import { supabase } from '@/lib/supabase';
import type { WorkoutContent } from './workoutModel';
export type TrainingFeedback = {
  execution_id: string;
  exercise_index: number;
  difficulty: number | null;
  discomfort: boolean;
  message: string;
  alternative: string;
  reviewed: boolean;
  updated_at: string;
};
export type TrainingBlock = { id: string; name: string; content: WorkoutContent };
export async function trainingTools<T>(
  profileId: string,
  linkId: string,
  action: string,
  payload: object = {},
): Promise<T> {
  const { data, error } = await supabase.rpc('training_tools_api', {
    profile_id: profileId,
    link_id: linkId,
    action,
    payload,
  });
  if (error)
    throw new Error(
      error.code === 'P0001'
        ? error.message
        : 'Não foi possível salvar. Confira a conexão e tente novamente.',
    );
  return data as T;
}
