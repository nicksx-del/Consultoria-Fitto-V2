import type { NutritionData } from '@/features/nutrition/nutritionModel';
import type { Plan } from './workoutModel';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
export type StudentSection =
  'overview' | 'workouts' | 'intake' | 'history' | 'feedback' | 'nutrition';
export type StudentOverviewData = {
  plans: Plan[];
  completed: number;
  lastWorkout: string | null;
  pendingFeedback: number;
};
export function StudentOverview({
  data,
  loading,
  trainer,
  nutritionist,
  nutrition,
  nutritionError,
  workoutError,
  onSection,
}: {
  data: StudentOverviewData | null;
  loading: boolean;
  trainer: boolean;
  nutritionist: boolean;
  nutrition: NutritionData | null;
  nutritionError: boolean;
  workoutError: boolean;
  onSection: (s: StudentSection) => void;
}) {
  const wide = useWindowDimensions().width >= 900;
  const plans = data?.plans || [];
  const published = plans.reduce<Plan | undefined>((latest, plan) => {
    if (plan.status !== 'published' || !plan.published) return latest;
    return !latest || (plan.published_at || '') > (latest.published_at || '') ? plan : latest;
  }, undefined);
  const diet = nutrition?.plan;
  const cards = [
    {
      section: 'workouts',
      title: 'Treino',
      icon: 'barbell-outline',
      enabled: trainer,
      ready: !loading && Boolean(data) && !workoutError,
      error: workoutError,
      publishedTitle: published?.published?.title,
      publishedAt: published?.published_at,
      drafts: plans.filter(
        (plan) => !plan.published || JSON.stringify(plan.draft) !== JSON.stringify(plan.published),
      ).length,
      action:
        plans.length > 1
          ? 'Gerenciar treinos'
          : plans.length === 1
            ? 'Editar treino'
            : 'Montar treino',
    },
    {
      section: 'nutrition',
      title: 'Alimentação',
      icon: 'restaurant-outline',
      enabled: nutritionist,
      ready: Boolean(nutrition),
      error: nutritionError,
      publishedTitle: diet?.published?.title,
      publishedAt: diet?.published_at,
      drafts: diet && (!diet.published || diet.version !== diet.published_version) ? 1 : 0,
      action: diet ? 'Editar plano alimentar' : 'Criar plano alimentar',
    },
  ] as const;
  return (
    <View style={{ gap: 18 }}>
      <Text variant="title">Prescrição individual</Text>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14 }}>
        {cards
          .filter((card) => card.enabled)
          .map((card) => (
            <View
              key={card.section}
              style={{
                flex: wide ? 1 : undefined,
                gap: 10,
                padding: 18,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#35432C',
                backgroundColor: '#191E16',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name={card.icon} size={22} color="#B7F34A" />
                <Text variant="title">{card.title}</Text>
              </View>
              <View style={{ flexGrow: 1, gap: 4 }}>
                {card.ready ? (
                  <>
                    <Text variant="caption" color={card.publishedTitle ? '#B7F34A' : undefined}>
                      {card.publishedTitle ? 'Publicado' : 'Sem plano publicado'}
                    </Text>
                    {card.publishedTitle ? <Text>{card.publishedTitle}</Text> : null}
                    {card.publishedTitle && card.publishedAt ? (
                      <Text variant="caption">
                        Publicado em {new Date(card.publishedAt).toLocaleDateString('pt-BR')}
                      </Text>
                    ) : null}
                    {card.drafts > 0 ? (
                      <Text variant="caption">
                        {card.drafts === 1 ? '1 rascunho' : card.drafts + ' rascunhos'}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text variant="caption">
                    {card.error ? 'Não foi possível carregar o status.' : 'Carregando…'}
                  </Text>
                )}
              </View>
              <Button
                title={card.error ? 'Tentar novamente' : card.ready ? card.action : 'Carregando…'}
                disabled={!card.error && !card.ready}
                onPress={() => onSection(card.error ? 'overview' : card.section)}
              />
            </View>
          ))}
      </View>
      {trainer ? (
        <View
          style={{
            gap: 10,
            padding: 18,
            borderRadius: 18,
            backgroundColor: '#191E16',
            borderWidth: 1,
            borderColor: '#35432C',
          }}
        >
          <Text variant="caption">ACOMPANHAMENTO</Text>
          <Text variant="title">{loading ? 'Carregando o resumo…' : 'Atividade recente'}</Text>
          <Text variant="bodyMuted">
            {data?.lastWorkout
              ? `Último treino: ${new Date(data.lastWorkout).toLocaleDateString('pt-BR')}`
              : 'Acompanhe a prescrição e os próximos passos deste aluno.'}
          </Text>
          {data ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
              <View>
                <Text variant="title">{data.completed}</Text>
                <Text variant="caption">Treinos recentes concluídos</Text>
              </View>
              <View>
                <Text variant="title">{data.pendingFeedback}</Text>
                <Text variant="caption">Feedbacks pendentes</Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      <Text variant="title">Prescrição e acompanhamento</Text>
      {(
        [
          {
            section: 'intake',
            title: 'Ficha do aluno',
            description: 'Objetivo, experiência, disponibilidade e preferências.',
            icon: 'clipboard-outline',
          },
          {
            section: 'history',
            title: 'Evolução e histórico',
            description: 'Consultar cargas, frequência e treinos realizados.',
            icon: 'stats-chart-outline',
          },
          {
            section: 'feedback',
            title: 'Feedback dos exercícios',
            description: 'Revisar dúvidas, dificuldade e relatos de desconforto.',
            icon: 'chatbubbles-outline',
            badge: data?.pendingFeedback ? `${data.pendingFeedback} para revisar` : undefined,
          },
        ] as const
      )
        .filter(() => trainer)
        .map((item) => (
          <Pressable
            key={item.section}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onSection(item.section)}
            style={{
              padding: 18,
              borderWidth: 1,
              borderColor: '#35432C',
              backgroundColor: '#191E16',
              borderRadius: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              minHeight: 96,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: '#28351F',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} size={24} color="#B7F34A" />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text variant="title">{item.title}</Text>
              <Text variant="caption">{item.description}</Text>
              {'badge' in item && item.badge ? (
                <Text color="#B7F34A" variant="caption">
                  {item.badge}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A3AD99" />
          </Pressable>
        ))}
      {trainer && data ? (
        <Text variant="caption">O resumo considera os 50 registros de execução mais recentes.</Text>
      ) : null}
    </View>
  );
}
