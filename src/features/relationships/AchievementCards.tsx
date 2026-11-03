import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
import type { PersonalRecord } from './trainingAchievements';

export function TrainingAchievements({
  records,
  milestone,
  complete = false,
}: {
  records: PersonalRecord[];
  milestone?: number | null;
  complete?: boolean;
}) {
  if (!records.length && !milestone && !complete) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Ionicons name="trophy-outline" size={22} color="#F7CC6A" />
        <Text variant="title">Suas conquistas</Text>
      </View>
      {records.map((record, i) => (
        <View
          key={i}
          style={{
            padding: 16,
            gap: 6,
            borderRadius: 16,
            backgroundColor: '#342C17',
            borderWidth: 1,
            borderColor: '#78622F',
          }}
        >
          <Text color="#F7CC6A" style={{ fontWeight: '700' }}>
            PR RECENTE ·{' '}
            {record.type === 'load' ? 'Maior carga registrada' : 'Mais repetições na mesma carga'}
          </Text>
          <Text>{record.exercise}</Text>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>
            {record.value.toLocaleString('pt-BR')} {record.type === 'load' ? 'kg' : 'repetições'}
          </Text>
          <Text variant="caption">
            Antes: {record.before.toLocaleString('pt-BR')}{' '}
            {record.type === 'load'
              ? 'kg'
              : `repetições com ${record.weight?.toLocaleString('pt-BR')} kg`}
          </Text>
        </View>
      ))}
      {milestone ? (
        <View style={{ padding: 14, gap: 4, borderRadius: 14, backgroundColor: '#283A1D' }}>
          <Text color="#C0F568">
            {milestone === 1 ? 'Primeiro treino concluído' : `${milestone} treinos concluídos`}
          </Text>
          <Text variant="caption">Mais um marco no seu acompanhamento.</Text>
        </View>
      ) : null}
      {complete ? (
        <View style={{ padding: 14, gap: 4, borderRadius: 14, backgroundColor: '#283A1D' }}>
          <Text color="#C0F568">Missão cumprida · 100% das séries</Text>
          <Text variant="caption">Todas as séries desta sessão foram concluídas.</Text>
        </View>
      ) : null}
      {records.length ? (
        <Text variant="caption">
          Comparação com até 50 sessões recentes deste acompanhamento. Carga e repetições são marcas
          separadas; siga a prescrição do treinador.
        </Text>
      ) : null}
    </View>
  );
}
