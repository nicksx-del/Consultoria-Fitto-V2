import React, { useState } from 'react';
import { Image, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import { PhotoPicker } from './PhotoPicker';
import { AccountRolePicker } from './AccountRolePicker';
import { AccountRole, suggestedUsername } from './registration';
export type ProfileSetup = {
  role: AccountRole;
  display_name: string;
  username: string;
  bio: string;
  specialties: string[];
  avatar_url: string | null;
};
export function ProfileSetupForm({
  initialRole,
  onSave,
  onBack,
}: {
  initialRole: AccountRole;
  onSave: (data: ProfileSetup) => Promise<void>;
  onBack: () => void;
}) {
  const [role, setRole] = useState(initialRole),
    [name, setName] = useState(''),
    [username, setUsername] = useState(''),
    [customUsername, setCustomUsername] = useState(false),
    [bio, setBio] = useState(''),
    [photo, setPhoto] = useState<string | null>(null),
    [specialties, setSpecialties] = useState<string[]>([]),
    [extras, setExtras] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const nameError = name.trim().length < 2 ? 'Digite seu nome com pelo menos 2 caracteres.' : '';
  const userError = !/^[a-z0-9_]{3,24}$/.test(username)
    ? 'Use de 3 a 24 letras, números ou _.'
    : '';
  const specialtyError =
    role === 'professional' && !specialties.length ? 'Selecione sua área de atuação.' : '';
  async function save() {
    if (busy) return;
    setSubmitted(true);
    setError('');
    if (nameError || userError || specialtyError) return;
    setBusy(true);
    try {
      await onSave({
        role,
        display_name: name.trim(),
        username,
        bio: bio.trim(),
        specialties: role === 'professional' ? specialties : [],
        avatar_url: photo,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text variant="caption">ÚLTIMO PASSO · SEU PERFIL</Text>
        <View style={{ height: 4, borderRadius: 4, backgroundColor: '#B7F34A' }} />
      </View>
      <AccountRolePicker value={role} onChange={setRole} disabled={busy} />
      <TextField
        label="Como podemos chamar você?"
        placeholder="Seu nome"
        autoComplete="name"
        textContentType="name"
        value={name}
        editable={!busy}
        maxLength={80}
        error={submitted ? nameError : undefined}
        onChangeText={(v) => {
          setName(v);
          if (!customUsername) setUsername(suggestedUsername(v));
        }}
      />
      <TextField
        label="Seu nome de usuário"
        placeholder="seu_nome"
        value={username}
        editable={!busy}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
        error={submitted ? userError : undefined}
        helperText="Essa será sua identificação no Fitto. Você pode editar a sugestão."
        onChangeText={(v) => {
          setCustomUsername(true);
          setUsername(v.toLowerCase().replace(/^@/, ''));
        }}
      />
      {role === 'professional' ? (
        <View style={{ gap: 8 }}>
          <Text variant="title">Qual é sua área?</Text>
          <Text variant="caption">Você pode selecionar mais de uma.</Text>
          {['Treinador', 'Nutricionista'].map((item) => (
            <Button
              key={item}
              title={`${specialties.includes(item) ? '✓ ' : ''}${item}`}
              disabled={busy}
              variant={specialties.includes(item) ? 'primary' : 'outline'}
              onPress={() =>
                setSpecialties((xs) =>
                  xs.includes(item) ? xs.filter((x) => x !== item) : [...xs, item],
                )
              }
            />
          ))}
          {submitted && specialtyError ? (
            <Text accessibilityRole="alert" color="#FF6B5A">
              {specialtyError}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Button
        title={extras ? 'Recolher foto e apresentação' : 'Adicionar foto e apresentação · opcional'}
        variant="ghost"
        disabled={busy}
        onPress={() => setExtras(!extras)}
      />
      {extras ? (
        <View
          style={{ gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#35432C' }}
        >
          <Text variant="caption">
            Você também pode preencher isso depois, nas configurações do perfil.
          </Text>
          <PhotoPicker onChange={setPhoto} onError={setError} disabled={busy}>
            {photo ? (
              <Image
                source={{ uri: photo }}
                accessibilityLabel="Sua foto. Toque para trocar."
                style={{ width: 88, height: 88, borderRadius: 44 }}
              />
            ) : (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: '#252F1C',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera-outline" size={30} color="#B7F34A" />
              </View>
            )}
          </PhotoPicker>
          {photo ? (
            <Button
              title="Remover foto"
              variant="ghost"
              disabled={busy}
              onPress={() => setPhoto(null)}
            />
          ) : (
            <Text variant="caption">Toque na câmera para escolher uma foto.</Text>
          )}
          <TextField
            label="Uma breve apresentação"
            placeholder="Conte um pouco sobre você"
            value={bio}
            onChangeText={setBio}
            editable={!busy}
            multiline
            maxLength={280}
          />
          <Text variant="caption">{bio.length}/280 caracteres</Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      <Button title="Criar perfil e continuar" loading={busy} onPress={() => void save()} />
      <Button title="Voltar para minhas contas" variant="ghost" disabled={busy} onPress={onBack} />
    </View>
  );
}
