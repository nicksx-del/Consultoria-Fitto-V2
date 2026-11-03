import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
type Summary = {
  shared: boolean;
  goal?: string;
  experience?: string;
  days?: string[];
  minutes?: number;
  place?: string;
  equipment?: string;
  preferences?: string;
  difficulties?: string;
};
export function StudentTrainingSummary({
  profileId,
  linkId,
}: {
  profileId: string;
  linkId: string;
}) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void supabase
      .rpc('training_intake_api', {
        action: 'read',
        profile_id: profileId,
        payload: { link_id: linkId },
      })
      .then(({ data: result, error: failure }) => {
        if (!live) return;
        if (failure) {
          setData(null);
          setError(
            'Não foi possível consultar o resumo. Use a ficha completa para tentar novamente.',
          );
        } else {
          setData(result);
          setError('');
        }
      });
    return () => {
      live = false;
    };
  }, [profileId, linkId]);
  if (error) return <Text>{error}</Text>;
  if (!data) return <Text variant="caption">Consultando informações compartilhadas…</Text>;
  if (!data.shared)
    return <Text variant="caption">O aluno ainda não compartilhou sua ficha de treino.</Text>;
  const experience = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };
  const place = {
    gym: 'Academia',
    home: 'Casa',
    outdoors: 'Ao ar livre',
    mixed: 'Locais variados',
  };
  return (
    <View style={{ gap: 6 }}>
      <Text>Objetivo: {data.goal || 'não informado'}</Text>
      <Text>
        {experience[data.experience as keyof typeof experience] || 'Experiência não informada'} ·{' '}
        {place[data.place as keyof typeof place] || 'Local não informado'}
      </Text>
      <Text>
        Disponibilidade: {data.days?.join(', ') || 'não informada'} ·{' '}
        {data.minutes ? `${data.minutes} min` : 'tempo não informado'}
      </Text>
      <Text>Equipamentos: {data.equipment || 'não informados'}</Text>
      {data.preferences ? <Text>Preferências: {data.preferences}</Text> : null}
      {data.difficulties ? <Text>Dificuldades: {data.difficulties}</Text> : null}
    </View>
  );
}
