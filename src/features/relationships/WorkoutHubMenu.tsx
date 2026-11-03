import React from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import type { Plan } from './workoutModel';
const card = {
  gap: 12,
  padding: 18,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#35432C',
  backgroundColor: '#191E16',
} as const;
export function WorkoutHubMenu({
  plans,
  loading,
  error,
  onView,
  onEdit,
  onCreate,
  onManage,
  onRefresh,
}: {
  plans: Plan[];
  loading: boolean;
  error: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onManage: () => void;
  onRefresh: () => void;
}) {
  const published = plans.find((p) => p.status === 'published'),
    drafts = plans.filter((p) => p.status === 'draft'),
    archives = plans.filter((p) => p.status === 'archived');
  return (
    <View style={{ gap: 16 }}>
      <Text variant="heading">Treino</Text>
      <Text variant="bodyMuted">Escolha uma ação para continuar.</Text>
      {error ? (
        <>
          <Text accessibilityRole="alert" color="#FF6B5A">
            {error}
          </Text>
          <Button title="Tentar novamente" onPress={onRefresh} />
        </>
      ) : null}
      {loading ? (
        <Text>Carregando fichas…</Text>
      ) : (
        <>
          <View style={card}>
            <Text variant="caption">TREINO ATUAL</Text>
            <Text variant="title">{published?.published?.title || 'Nenhum treino publicado'}</Text>
            <Text variant="caption">
              {published?.published_at
                ? `Publicado em ${new Date(published.published_at).toLocaleDateString('pt-BR')}`
                : 'Comece uma ficha e publique quando estiver pronta.'}
            </Text>
            {published ? (
              <>
                <Button
                  title="Visualizar treino do aluno"
                  variant="outline"
                  onPress={() => onView(published.id)}
                />
                <Button title="Editar treino" onPress={() => onEdit(published.id)} />
                <Text variant="caption">As alterações passam por revisão antes da publicação.</Text>
              </>
            ) : null}
          </View>
          <Button title="+ Criar novo treino" onPress={onCreate} />
          {drafts.length ? (
            <View style={{ gap: 10 }}>
              <Text variant="title">Rascunhos</Text>
              {drafts.map((p) => (
                <View key={p.id} style={card}>
                  <Text variant="title">{p.draft.title}</Text>
                  <Text variant="caption">Ainda não publicado para o aluno</Text>
                  <Button title={`Continuar ${p.draft.title}`} onPress={() => onEdit(p.id)} />
                  <Button
                    title="Visualizar rascunho"
                    variant="ghost"
                    onPress={() => onView(p.id)}
                  />
                </View>
              ))}
            </View>
          ) : null}
          <View style={card}>
            <Text variant="title">Modelos e versões</Text>
            <Text variant="caption">
              Reaproveite uma ficha, recupere alterações ou consulte versões anteriores.
            </Text>
            <Button title="Abrir modelos e gerenciamento" variant="outline" onPress={onManage} />
          </View>
          {archives.length ? (
            <DetailsPanel title={`Fichas arquivadas · ${archives.length}`}>
              {archives.map((p) => (
                <Button
                  key={p.id}
                  title={`Visualizar ${p.draft.title}`}
                  variant="outline"
                  onPress={() => onView(p.id)}
                />
              ))}
            </DetailsPanel>
          ) : null}
          <Button title="Atualizar treinos" variant="ghost" onPress={onRefresh} />
        </>
      )}
    </View>
  );
}
