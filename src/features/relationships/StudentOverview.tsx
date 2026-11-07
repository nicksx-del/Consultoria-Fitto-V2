import type { NutritionData } from '@/features/nutrition/nutritionModel';
import type { Plan } from './workoutModel';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';

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
  onSection: (section: StudentSection) => void;
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
      draftTitle: plans.length === 1 ? plans[0].draft.title : undefined,
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
      title: 'Dieta',
      icon: 'restaurant-outline',
      enabled: nutritionist,
      ready: Boolean(nutrition) && !nutritionError,
      error: nutritionError,
      publishedTitle: diet?.published?.title,
      draftTitle: diet?.draft?.title,
      publishedAt: diet?.published_at,
      drafts: diet && (!diet.published || diet.version !== diet.published_version) ? 1 : 0,
      action: diet ? 'Editar dieta' : 'Criar dieta',
    },
  ] as const;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 10 }}>
        {cards
          .filter((card) => card.enabled)
          .map((card) => (
            <View
              key={card.section}
              style={{
                flex: wide ? 1 : undefined,
                gap: 10,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#34462A',
                backgroundColor: '#1B2616',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center' }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    backgroundColor: '#2C4021',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={card.icon} size={19} color="#C0F568" />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700' }}>{card.title}</Text>
                {card.ready ? (
                  <Text
                    style={{ fontSize: 11 }}
                    color={card.publishedTitle ? '#C0F568' : '#CFB983'}
                  >
                    {card.publishedTitle ? '● Publicado' : 'Sem publicação'}
                  </Text>
                ) : null}
              </View>
              <View style={{ gap: 4, flexGrow: 1 }}>
                <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '600' }}>
                  {card.error
                    ? 'Não foi possível atualizar'
                    : !card.ready
                      ? 'Carregando…'
                      : card.publishedTitle ||
                        card.draftTitle ||
                        (card.drafts ? 'Prescrição em preparação' : 'Aguardando sua prescrição')}
                </Text>
                {card.ready ? (
                  <Text variant="caption">
                    {card.publishedTitle && card.publishedAt
                      ? 'Publicado em ' + new Date(card.publishedAt).toLocaleDateString('pt-BR')
                      : 'O aluno ainda não recebeu um plano.'}
                    {card.drafts
                      ? ' · ' + card.drafts + (card.drafts === 1 ? ' rascunho' : ' rascunhos')
                      : ''}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={card.error ? 'Atualizar ' + card.title : card.action}
                accessibilityState={{ disabled: !card.error && !card.ready }}
                disabled={!card.error && !card.ready}
                onPress={() => onSection(card.error ? 'overview' : card.section)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 44,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: pressed ? '#405B2D' : '#304623',
                  opacity: !card.error && !card.ready ? 0.5 : 1,
                })}
              >
                <Text color="#C0F568" style={{ fontSize: 13, fontWeight: '600' }}>
                  {card.error ? 'Tentar novamente' : card.ready ? card.action : 'Carregando…'}
                </Text>
                <Ionicons name="arrow-forward" size={17} color="#C0F568" />
              </Pressable>
            </View>
          ))}
      </View>
      {trainer ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              gap: 1,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: '#192114',
              borderWidth: 1,
              borderColor: '#303E27',
            }}
          >
            <View style={{ flex: 1, gap: 3, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                {loading ? '…' : workoutError ? '—' : (data?.completed ?? '—')}
              </Text>
              <Text style={{ fontSize: 11 }} color="#A8B59E">
                Treinos concluídos
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                gap: 3,
                paddingHorizontal: 12,
                borderLeftWidth: 1,
                borderLeftColor: '#34432B',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700' }}>
                {loading
                  ? '…'
                  : workoutError
                    ? '—'
                    : data?.lastWorkout
                      ? new Date(data.lastWorkout).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                        })
                      : '—'}
              </Text>
              <Text style={{ fontSize: 11 }} color="#A8B59E">
                Último treino
              </Text>
            </View>
          </View>
          <View
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#303E27',
              backgroundColor: '#182014',
              overflow: 'hidden',
            }}
          >
            {(
              [
                {
                  section: 'intake',
                  title: 'Ficha do aluno',
                  description: 'Objetivo e preferências',
                  icon: 'clipboard-outline',
                },
                {
                  section: 'history',
                  title: 'Evolução e histórico',
                  description: 'Cargas e sessões',
                  icon: 'stats-chart-outline',
                },
                {
                  section: 'feedback',
                  title: 'Feedbacks',
                  description: 'Dúvidas e relatos',
                  icon: 'chatbubbles-outline',
                },
              ] as const
            ).map((item, index) => (
              <Pressable
                key={item.section}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => onSection(item.section)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 58,
                  backgroundColor: pressed ? '#26351D' : 'transparent',
                  borderTopWidth: index ? 1 : 0,
                  borderTopColor: '#2C3A24',
                })}
              >
                <Ionicons name={item.icon} size={20} color="#B7C7AB" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>{item.title}</Text>
                  <Text style={{ fontSize: 11 }} color="#A8B59E">
                    {item.description}
                  </Text>
                </View>
                {item.section === 'feedback' &&
                data &&
                !loading &&
                !workoutError &&
                data.pendingFeedback > 0 ? (
                  <Text color="#C0F568" style={{ fontSize: 12 }}>
                    {data.pendingFeedback} pendentes
                  </Text>
                ) : null}
                <Ionicons name="chevron-forward" size={15} color="#91A283" />
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 11 }} color="#91A283">
            Resumo dos últimos 50 registros de treino.
          </Text>
        </>
      ) : null}
    </View>
  );
}
