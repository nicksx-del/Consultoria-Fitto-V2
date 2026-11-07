import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Button, Text } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Profile, Relationship } from './api';
import type { Plan } from './workoutModel';
import { trainingTools, type TrainingFeedback } from './trainingToolsApi';

type Summary = { link: Relationship; drafts: Plan[]; feedback: number; failed: boolean };
const card = {
  padding: 18,
  gap: 12,
  borderRadius: 18,
  backgroundColor: '#1B2318',
  borderWidth: 1,
  borderColor: '#35432D',
} as const;
export function ProfessionalHome({
  profile,
  links,
  pendingCount,
  onStudents,
}: {
  profile: Profile;
  links: Relationship[];
  pendingCount: number;
  onStudents: () => void;
}) {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const trainer = profile.specialties.includes('Treinador');
  const signature = links.map((link) => link.id).join(',');
  useEffect(() => {
    let alive = true;
    async function read(link: Relationship): Promise<Summary> {
      try {
        const [plans, tools] = await Promise.all([
          supabase.rpc('workout_api', {
            action: 'list',
            profile_id: profile.id,
            link_id: link.id,
            payload: {},
          }),
          trainingTools<{ feedback: TrainingFeedback[] }>(profile.id, link.id, 'read'),
        ]);
        if (plans.error) throw plans.error;
        return {
          link,
          drafts: (plans.data as Plan[]).filter((plan) => plan.status === 'draft'),
          feedback: tools.feedback.filter((item) => !item.reviewed).length,
          failed: false,
        };
      } catch {
        return { link, drafts: [], feedback: 0, failed: true };
      }
    }
    void (async () => {
      const result: Summary[] = [];
      if (trainer)
        for (let i = 0; i < links.length; i += 4)
          result.push(...(await Promise.all(links.slice(i, i + 4).map(read))));
      if (alive) {
        setSummaries(result);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // Link identity controls refresh without depending on a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, trainer, signature, revision]);
  function open(link: Relationship, section = 'workouts', plan?: string) {
    router.push({
      pathname: '/aluno',
      params: { profile: profile.id, link: link.id, section, ...(plan ? { plan } : {}) },
    });
  }
  const failed = summaries.some((item) => item.failed);
  const drafts = summaries.flatMap((item) =>
    item.drafts.map((plan) => ({ link: item.link, plan })),
  );
  const feedbacks = summaries.filter((item) => item.feedback > 0);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          {
            title: 'Alunos ativos',
            value: String(links.filter((link) => !link.is_self).length),
            onPress: onStudents,
          },
          { title: 'Pedidos', value: String(pendingCount), onPress: onStudents },
          ...(trainer
            ? [
                {
                  title: 'Rascunhos',
                  value: loading ? '…' : String(drafts.length) + (failed ? '+' : ''),
                  onPress: undefined,
                },
                {
                  title: 'Feedbacks',
                  value: loading
                    ? '…'
                    : String(feedbacks.reduce((sum, item) => sum + item.feedback, 0)) +
                      (failed ? '+' : ''),
                  onPress: undefined,
                },
              ]
            : []),
        ].map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole={item.onPress ? 'button' : undefined}
            onPress={item.onPress}
            style={{ ...card, flex: 1, minWidth: 135 }}
          >
            <Text variant="heading" color="#C0F568">
              {item.value}
            </Text>
            <Text variant="caption">{item.title}</Text>
          </Pressable>
        ))}
      </View>
      {failed ? (
        <View style={card}>
          <Text variant="caption" accessibilityRole="alert">
            Parte do resumo não carregou. Os totais exibidos são parciais.
          </Text>
          <Button
            title="Atualizar resumo"
            variant="outline"
            onPress={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          />
        </View>
      ) : null}
      <View style={card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="people-outline" size={24} color="#C0F568" />
          <Text variant="title">Seu acompanhamento</Text>
        </View>
        <Text variant="bodyMuted">
          {links.length
            ? 'Abra um aluno ou continue uma prescrição.'
            : 'Convide seu primeiro aluno para começar o acompanhamento.'}
        </Text>
        <Button
          title={links.length ? 'Ver meus alunos' : 'Convidar primeiro aluno'}
          onPress={onStudents}
        />
      </View>
      {trainer && drafts.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text variant="title">Continuar prescrições</Text>
          {drafts.map(({ link, plan }) => (
            <View key={plan.id} style={card}>
              <Text style={{ fontWeight: '600' }}>{plan.draft.title || 'Treino sem título'}</Text>
              <Text variant="caption">{link.name} · rascunho</Text>
              <Button
                title="Continuar rascunho"
                variant="outline"
                onPress={() => open(link, 'workouts', plan.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
      {feedbacks.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text variant="title">Precisam da sua atenção</Text>
          {feedbacks.map(({ link, feedback }) => (
            <Button
              key={link.id}
              title={`${link.name} · ${feedback} feedback(s)`}
              variant="outline"
              onPress={() => open(link, 'feedback')}
            />
          ))}
        </View>
      ) : null}
      {links.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text variant="title">Acesso rápido aos alunos</Text>
          {links.slice(0, 6).map((link) => (
            <Pressable
              key={link.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${link.name}`}
              onPress={() => open(link, 'overview')}
              style={{ ...card, flexDirection: 'row', alignItems: 'center' }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#304425',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text color="#C0F568">{link.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text>{link.name}</Text>
                <Text variant="caption">Abrir perfil do aluno</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#B7C5AC" />
            </Pressable>
          ))}
        </View>
      ) : null}
      {loading && trainer ? (
        <Text variant="caption" accessibilityLiveRegion="polite">
          Atualizando prescrições e feedbacks…
        </Text>
      ) : null}
    </View>
  );
}
