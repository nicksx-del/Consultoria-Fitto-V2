import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Executions } from './Executions';
import { WorkoutPreview } from './WorkoutPreview';
import { WorkoutStudio } from './WorkoutStudio';
import { WorkoutContent } from './workoutModel';

type Props = {
  profileId: string;
  linkId: string;
  trainer: boolean;
  onBusy?: (v: boolean) => void;
  onEditing?: (v: boolean) => void;
};
type Published = { id: string; content: WorkoutContent; published_at: string };
export function Workouts(props: Props) {
  return props.trainer ? (
    <WorkoutStudio
      profileId={props.profileId}
      linkId={props.linkId}
      onBusy={props.onBusy}
      onEditing={props.onEditing}
    />
  ) : (
    <StudentWorkouts key={props.linkId} profileId={props.profileId} linkId={props.linkId} />
  );
}
function StudentWorkouts({ profileId, linkId }: { profileId: string; linkId: string }) {
  const [plans, setPlans] = useState<Published[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function fetchPlans() {
    const { data, error: failure } = await supabase.rpc('workout_api', {
      action: 'list',
      profile_id: profileId,
      link_id: linkId,
      payload: {},
    });
    if (failure)
      throw new Error(
        failure.code === 'P0001'
          ? failure.message
          : 'Não foi possível consultar os treinos. Tente novamente.',
      );
    return data as Published[];
  }
  useEffect(() => {
    let live = true;
    void fetchPlans()
      .then((p) => {
        if (live) setPlans(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, linkId]);
  return (
    <View style={{ gap: 16 }}>
      <Text variant="heading">Meus treinos</Text>
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      <Button
        title="Atualizar treino"
        variant="outline"
        disabled={loading}
        onPress={() => {
          setLoading(true);
          setError('');
          void fetchPlans()
            .then(setPlans)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
        }}
      />
      {loading ? (
        <Text>Carregando treinos…</Text>
      ) : plans.length ? (
        plans.map((p) => (
          <View
            key={p.id}
            style={{
              gap: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#35432C',
              borderRadius: 18,
            }}
          >
            <Text variant="caption">
              Publicado em {new Date(p.published_at).toLocaleString('pt-BR')}
            </Text>
            <WorkoutPreview content={p.content} />
          </View>
        ))
      ) : (
        <Text>Seu treinador ainda não publicou uma ficha.</Text>
      )}
      <Executions profileId={profileId} linkId={linkId} plans={plans} />
    </View>
  );
}
