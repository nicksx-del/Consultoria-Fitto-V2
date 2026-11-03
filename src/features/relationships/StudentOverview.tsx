import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
export type StudentSection =
  'overview' | 'workouts' | 'intake' | 'history' | 'feedback' | 'nutrition';
export type StudentOverviewData = {
  plan: string | null;
  drafts: number;
  completed: number;
  lastWorkout: string | null;
  pendingFeedback: number;
};
export function StudentOverview({
  data,
  loading,
  onSection,
}: {
  data: StudentOverviewData | null;
  loading: boolean;
  onSection: (s: StudentSection) => void;
}) {
  return (
    <View style={{ gap: 18 }}>
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
        <Text variant="title">
          {loading ? 'Carregando o resumo…' : data?.plan || 'Treino ainda não publicado'}
        </Text>
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
      <Text variant="title">O que deseja acompanhar?</Text>
      {(
        [
          {
            section: 'workouts',
            title: 'Treino',
            description: 'Visualizar a ficha, editar ou montar um novo treino.',
            icon: 'barbell-outline',
            badge: data?.drafts ? `${data.drafts} rascunho(s)` : undefined,
          },
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
      ).map((item) => (
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
      <Text variant="caption">O resumo considera os 50 registros de execução mais recentes.</Text>
    </View>
  );
}
