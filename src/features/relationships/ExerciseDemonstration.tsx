import React, { useState } from 'react';
import { Image, Linking, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import {
  CATALOG_SOURCE,
  LEGACY_CATALOG_SOURCE,
  CatalogReference,
  imageUrl,
  resolveCatalogReference,
} from './exerciseCatalog';
export function CatalogImage({ path, name }: { path: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(path);
  return !url || failed ? (
    <Text variant="caption">Imagem indisponível.</Text>
  ) : (
    <Image
      source={{ uri: url }}
      accessibilityLabel={`Demonstração de ${name}`}
      resizeMode="contain"
      style={{ height: 160, width: '100%', backgroundColor: '#F4F4F1', borderRadius: 12 }}
      onError={() => setFailed(true)}
    />
  );
}
export function ExerciseDemonstration({
  catalog: storedCatalog,
  name,
  initiallyOpen = false,
}: {
  catalog?: CatalogReference;
  name: string;
  initiallyOpen?: boolean;
}) {
  const catalog = resolveCatalogReference(storedCatalog);
  const [open, setOpen] = useState(initiallyOpen);
  if (!catalog || !['free-exercise-db', 'exercisedb'].includes(catalog.provider)) return null;
  const animated = catalog.provider === 'exercisedb';
  return (
    <View style={{ gap: 8 }}>
      <Button
        title={
          open
            ? 'Recolher demonstração'
            : animated
              ? 'Ver movimento animado e instruções'
              : 'Ver imagens e instruções do exercício'
        }
        variant="outline"
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          {(Array.isArray(catalog.images) ? catalog.images : [])
            .slice(0, 2)
            .filter((path) => typeof path === 'string')
            .map((path) => (
              <CatalogImage key={path} path={path} name={name} />
            ))}
          <Text variant="caption">
            {animated
              ? 'GIF 180p e instruções em inglês · ExerciseDB / AscendAPI'
              : 'Instruções originais em inglês · Free Exercise DB'}
          </Text>
          {typeof catalog.instructions === 'string' && catalog.instructions ? (
            <Text>{catalog.instructions}</Text>
          ) : (
            <Text>Sem instruções disponíveis.</Text>
          )}
          <Button
            title="Consultar fonte do catálogo"
            variant="ghost"
            onPress={() => void Linking.openURL(animated ? CATALOG_SOURCE : LEGACY_CATALOG_SOURCE)}
          />
        </>
      ) : null}
    </View>
  );
}
