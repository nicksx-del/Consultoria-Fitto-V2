import React, { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen, Text } from '@/components/ui';
import { CatalogReference, imageUrl, resolveCatalogReference } from './exerciseCatalog';
import { ExerciseDemonstration } from './ExerciseDemonstration';
export function SelectedExercisePreview({
  name,
  catalog: storedCatalog,
  compact = false,
}: {
  compact?: boolean;
  name: string;
  catalog?: CatalogReference;
}) {
  const catalog = resolveCatalogReference(storedCatalog);
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false);
  if (!catalog) return null;
  const uri = catalog.images[0] ? imageUrl(catalog.images[0]) : null;
  const animated = catalog.provider === 'exercisedb';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conferir ${name}${animated ? ' e GIF' : ''}`}
        accessibilityHint="Abre a demonstração do exercício"
        onPress={() => setOpen(true)}
        style={{
          flexDirection: compact ? 'column' : 'row',
          alignItems: 'center',
          gap: compact ? 2 : 12,
          padding: compact ? 0 : 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#35462B',
          backgroundColor: '#20291A',
          minHeight: compact ? 44 : 76,
          width: compact ? 48 : undefined,
        }}
      >
        <View
          style={{
            width: compact ? 42 : 60,
            height: compact ? 42 : 60,
            borderRadius: 8,
            backgroundColor: '#F4F4F1',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {uri && !failed ? (
            <Image
              source={{ uri }}
              accessibilityLabel={`Prévia de ${name}`}
              resizeMode="contain"
              style={{ width: compact ? 42 : 60, height: compact ? 42 : 60 }}
              onError={() => setFailed(true)}
            />
          ) : (
            <Ionicons name="play-circle-outline" size={28} color="#35462B" />
          )}
        </View>
        {compact ? (
          <Text color="#C9F78C" style={{ fontSize: 10, lineHeight: 14 }}>
            {animated ? 'GIF' : 'Ver'}
          </Text>
        ) : null}
        {!compact ? (
          <>
            <View style={{ flex: 1, gap: 4 }}>
              <Text color="#B7F34A">
                {animated ? 'Conferir exercício e GIF' : 'Conferir exercício'}
              </Text>
              <Text variant="caption">Toque para avaliar o movimento</Text>
            </View>
            <Ionicons name="expand-outline" size={20} color="#B7F34A" />
          </>
        ) : null}
      </Pressable>
      {open ? (
        <Modal visible animationType="slide" onRequestClose={() => setOpen(false)}>
          <Screen scrollable contentContainerStyle={{ paddingVertical: 24 }}>
            <View style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar ao exercício"
                  onPress={() => setOpen(false)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: '#26351F',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="arrow-back" size={22} color="#C9F78C" />
                </Pressable>
                <Text variant="title" style={{ flex: 1 }}>
                  {name}
                </Text>
              </View>
              <ExerciseDemonstration key={catalog.id} catalog={catalog} name={name} />
            </View>
          </Screen>
        </Modal>
      ) : null}
    </>
  );
}
