import React, { useState } from 'react';
import { Image, Linking, View, useWindowDimensions } from 'react-native';
import { Button, Text } from '@/components/ui';
import { DetailsPanel } from './DetailsPanel';
import { exerciseGuides } from './exerciseGuides';
import {
  CATALOG_SOURCE,
  LEGACY_CATALOG_SOURCE,
  CatalogReference,
  imageUrl,
  resolveCatalogReference,
} from './exerciseCatalog';
export function CatalogImage({
  path,
  name,
  height = 160,
}: {
  path: string;
  name: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(path);
  return !url || failed ? (
    <Text variant="caption">Imagem indisponível.</Text>
  ) : (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`Demonstração de ${name}`}
      resizeMode="contain"
      style={{ height, width: '100%', backgroundColor: '#F4F4F1', borderRadius: 12 }}
      onError={() => setFailed(true)}
    />
  );
}
export function ExerciseDemonstration({
  catalog: storedCatalog,
  name,
}: {
  catalog?: CatalogReference;
  name: string;
}) {
  const catalog = resolveCatalogReference(storedCatalog);
  const { width } = useWindowDimensions();
  if (!catalog || !['free-exercise-db', 'exercisedb'].includes(catalog.provider)) return null;
  const animated = catalog.provider === 'exercisedb';
  const guide = exerciseGuides[catalog.id];
  const original = catalog.instructions?.trim();
  const images = (Array.isArray(catalog.images) ? catalog.images : [])
    .filter((path) => typeof path === 'string')
    .slice(0, animated ? 1 : 2);
  return (
    <View style={{ gap: 14 }}>
      {images.map((path) => (
        <CatalogImage
          key={path}
          path={path}
          name={name}
          height={animated ? Math.min(320, width - 48) : 220}
        />
      ))}
      <View style={{ gap: 10, padding: 14, borderRadius: 14, backgroundColor: '#1C2717' }}>
        <Text variant="title">Como fazer</Text>
        {guide?.map((step, index) => (
          <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: '#2B4022',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text color="#C9F78C">{index + 1}</Text>
            </View>
            <Text style={{ flex: 1 }}>{step}</Text>
          </View>
        ))}
        {!guide && !original ? (
          <Text variant="caption">Este exercício ainda está sem instruções no catálogo.</Text>
        ) : null}
        {original ? (
          <DetailsPanel title="Instruções originais do catálogo">
            <Text>{original}</Text>
          </DetailsPanel>
        ) : null}
      </View>
      <Button
        title={animated ? 'Fonte · ExerciseDB' : 'Fonte · Free Exercise DB'}
        variant="ghost"
        onPress={() => void Linking.openURL(animated ? CATALOG_SOURCE : LEGACY_CATALOG_SOURCE)}
      />
    </View>
  );
}
