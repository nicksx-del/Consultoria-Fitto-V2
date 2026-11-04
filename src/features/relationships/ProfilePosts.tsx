import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import { PhotoPicker } from '@/features/auth/PhotoPicker';

type WorkoutPost = { id: string; title: string; minutes: number | null; exercises: number };
type Post = { id: string; photo: string; caption: string; date: string; workout?: WorkoutPost };
const surface = '#191E16';
const accent = '#C0F568';

function WorkoutTile({ workout }: { workout: WorkoutPost }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        gap: 6,
        backgroundColor: '#29391E',
      }}
    >
      <Ionicons name="barbell-outline" color={accent} size={26} />
      <Text numberOfLines={2} style={{ textAlign: 'center', fontWeight: '700' }}>
        {workout.title}
      </Text>
      <Text variant="caption" style={{ textAlign: 'center' }}>
        {workout.exercises} exercícios
        {workout.minutes === null ? '' : ' · ' + workout.minutes + ' min'}
      </Text>
    </View>
  );
}

export function ProfilePosts({ profileId, workout }: { profileId: string; workout?: WorkoutPost }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState(false);
  const [viewing, setViewing] = useState<Post | null>(null);
  const [photo, setPhoto] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const key = 'fitto.profile-posts.v1:' + profileId;
  function read(): Post[] {
    return JSON.parse(window.localStorage.getItem(key) || '[]') as Post[];
  }
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const refresh = () => {
      try {
        setPosts(JSON.parse(window.localStorage.getItem(key) || '[]'));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(key, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(key, refresh);
    };
  }, [key]);
  if (Platform.OS !== 'web') return null;

  const shared = workout && posts.some((post) => post.workout?.id === workout.id);
  function save(next: Post[]) {
    window.localStorage.setItem(key, JSON.stringify(next));
    setPosts(next);
    window.dispatchEvent(new Event(key));
  }
  function publish() {
    if (!photo && !workout) return;
    try {
      const current = read();
      if (!workout || !current.some((post) => post.workout?.id === workout.id)) {
        save([
          {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            caption: caption.trim(),
            photo,
            workout,
          },
          ...current,
        ]);
      }
      close();
    } catch {
      setError(
        'Não foi possível salvar. Verifique o espaço do navegador ou escolha uma foto menor.',
      );
    }
  }
  function close() {
    setEditing(false);
    setViewing(null);
    setPhoto('');
    setCaption('');
    setError('');
  }
  const previewPhoto = viewing ? viewing.photo : photo;
  const previewWorkout = viewing ? viewing.workout : workout;
  return (
    <View style={{ gap: 12 }}>
      {storageError ? (
        <Text accessibilityRole="alert">As postagens estão indisponíveis neste navegador.</Text>
      ) : workout ? (
        shared ? (
          <Text color={accent}>Treino publicado no seu perfil neste navegador.</Text>
        ) : (
          <Button title="Publicar no perfil" variant="outline" onPress={() => setEditing(true)} />
        )
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ flex: 1, minWidth: 150, gap: 4 }}>
              <Text variant="title">Publicações</Text>
              <Text variant="caption">
                {posts.length} {posts.length === 1 ? 'publicação' : 'publicações'} · Privado neste
                navegador
              </Text>
            </View>
            <Button title="+ Nova postagem" onPress={() => setEditing(true)} />
          </View>
          {posts.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {posts.map((post) => (
                <Pressable
                  key={post.id}
                  accessibilityRole="button"
                  accessibilityLabel={post.workout?.title || post.caption || 'Abrir foto'}
                  onPress={() => setViewing(post)}
                  style={{
                    width: '32%',
                    aspectRatio: 1,
                    overflow: 'hidden',
                    borderRadius: 8,
                    backgroundColor: surface,
                  }}
                >
                  {post.photo ? (
                    <Image
                      source={{ uri: post.photo }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : post.workout ? (
                    <WorkoutTile workout={post.workout} />
                  ) : null}
                  {post.photo && post.workout ? (
                    <Ionicons
                      name="barbell-outline"
                      color={accent}
                      size={18}
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: 6,
                        backgroundColor: surface,
                        padding: 4,
                        borderRadius: 6,
                      }}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={{
                alignItems: 'center',
                gap: 8,
                padding: 26,
                borderRadius: 18,
                backgroundColor: surface,
              }}
            >
              <Ionicons name="camera-outline" size={32} color={accent} />
              <Text variant="title">Sua primeira postagem</Text>
              <Text variant="caption" style={{ textAlign: 'center' }}>
                Adicione uma foto ou compartilhe o resumo ao concluir um treino.
              </Text>
            </View>
          )}
        </>
      )}
      <Modal visible={editing || Boolean(viewing)} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#121510' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18 }}>
            <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <Text variant="title">{viewing ? 'Publicação' : 'Nova postagem'}</Text>
                <Button title="Fechar" variant="ghost" onPress={close} />
              </View>
              {previewPhoto ? (
                <Image
                  source={{ uri: previewPhoto }}
                  resizeMode="contain"
                  style={{
                    width: '100%',
                    aspectRatio: 1,
                    backgroundColor: surface,
                    borderRadius: 12,
                  }}
                />
              ) : null}
              {previewWorkout ? (
                <View style={{ minHeight: 120, borderRadius: 12, overflow: 'hidden' }}>
                  <WorkoutTile workout={previewWorkout} />
                </View>
              ) : null}
              {viewing ? (
                <>
                  {viewing.caption ? <Text>{viewing.caption}</Text> : null}
                  <Text variant="caption">
                    {new Date(viewing.date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Button
                    title="Excluir postagem"
                    variant="ghost"
                    onPress={() => {
                      if (!window.confirm('Excluir esta postagem do seu perfil neste navegador?'))
                        return;
                      try {
                        save(read().filter((post) => post.id !== viewing.id));
                        close();
                      } catch {
                        setError('Não foi possível excluir a postagem.');
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <PhotoPicker
                    onChange={(value) => {
                      setPhoto(value);
                      setError('');
                    }}
                    onError={setError}
                  />
                  {photo ? (
                    <Button title="Remover foto" variant="ghost" onPress={() => setPhoto('')} />
                  ) : null}
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={500}
                    multiline
                    accessibilityLabel="Legenda"
                    placeholder="Escreva uma legenda…"
                    placeholderTextColor="#A8B09F"
                    style={{
                      minHeight: 86,
                      padding: 12,
                      color: '#F3F5EE',
                      backgroundColor: surface,
                      borderRadius: 12,
                      textAlignVertical: 'top',
                    }}
                  />
                  <Text variant="caption">
                    Visível apenas neste navegador · {caption.length}/500
                  </Text>
                  <Button title="Publicar" disabled={!photo && !workout} onPress={publish} />
                </>
              )}
              {error ? (
                <Text accessibilityRole="alert" color="#FFB87A">
                  {error}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
