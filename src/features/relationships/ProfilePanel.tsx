import { ProfilePosts } from './ProfilePosts';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Text, TextField, Screen } from '@/components/ui';
import { PhotoPicker } from '@/features/auth/PhotoPicker';
import { authError, supabase } from '@/lib/supabase';
import type { Profile } from './api';
import { TrainingIntake } from './TrainingIntake';
import {
  profileChecklist,
  profileDraft,
  profileLink,
  profilePresentation,
  validateProfile,
  type ProfileDraft,
} from './profilePresentation';

const columns = 'id,role,display_name,username,specialties,bio,avatar_url,location,website,focus';
type Section = 'identity' | 'about' | 'contact';
const accent = '#C0F568';
function CardTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Ionicons name={icon} size={20} color={accent} />
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
    </View>
  );
}
function Avatar({
  profile,
  small = false,
}: {
  profile: Pick<Profile, 'display_name' | 'avatar_url'>;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = small ? 72 : 96;
  const initials =
    profile.display_name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'F';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#283B20',
        borderWidth: 3,
        borderColor: accent,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {profile.avatar_url && !failed ? (
        <Image
          source={{ uri: profile.avatar_url }}
          accessibilityLabel="Foto do seu perfil"
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text
          style={{ fontSize: small ? 24 : 30, fontWeight: '800', letterSpacing: 1 }}
          color={accent}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
export function ProfilePanel({
  profile,
  activeCount,
  onSaved,
  onBusy,
}: {
  profile: Profile;
  activeCount: number;
  onSaved: (profile: Profile) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1100;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState<Section>('identity');
  const [draft, setDraft] = useState(() => profileDraft(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [notice, setNotice] = useState('');
  const [discard, setDiscard] = useState(false);
  const [preview, setPreview] = useState(false);
  const lock = useRef(false);
  const professional = profile.role === 'professional';
  const dirty = JSON.stringify(draft) !== JSON.stringify(profileDraft(profile));
  useEffect(() => {
    if (Platform.OS !== 'web' || !editing || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing, dirty]);
  const checklist = profileChecklist(profileDraft(profile));
  const complete = checklist.filter((item) => item.done).length;
  const percent = Math.round((complete / checklist.length) * 100);
  function openEditor(next: Section = 'identity') {
    setDraft(profileDraft(profile));
    setSection(next);
    setFieldErrors({});
    setError('');
    setNotice('');
    setDiscard(false);
    setPreview(false);
    setEditing(true);
    onBusy(true);
  }
  function change<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError('');
    setDiscard(false);
  }
  function closeEditor() {
    setEditing(false);
    setDiscard(false);
    setError('');
    setDraft(profileDraft(profile));
    onBusy(false);
  }
  function requestClose() {
    if (saving) return;
    if (dirty) setDiscard(true);
    else closeEditor();
  }
  async function persist(values: Partial<ProfileDraft>, photoOnly = false) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError('');
    setNotice('');
    let succeeded = false;
    try {
      const { data, error: failure } = await supabase
        .from('profiles')
        .update(values)
        .eq('id', profile.id)
        .select(columns)
        .single();
      if (failure) throw failure;
      succeeded = true;
      onSaved(data);
      setDraft(profileDraft(data));
      setEditing(false);
      setDiscard(false);
      setNotice(photoOnly ? 'Foto atualizada.' : 'Seu perfil foi atualizado.');
    } catch (e) {
      const failure = e as { code?: string };
      if (failure.code === '23505') {
        setFieldErrors({ username: 'Este nome de usuário já está em uso. Escolha outro.' });
        setSection('identity');
      } else setError(authError(e));
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(!succeeded && editing);
    }
  }
  function save() {
    const { values, errors } = validateProfile(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSection(
        errors.display_name || errors.username
          ? 'identity'
          : errors.bio || errors.focus
            ? 'about'
            : 'contact',
      );
      setPreview(false);
      return;
    }
    void persist(values);
  }
  async function copyText(text: string, success: string) {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard)
        await navigator.clipboard.writeText(text);
      else {
        const result = await Share.share({ message: text });
        if (result.action === Share.dismissedAction) return;
      }
      setNotice(Platform.OS === 'web' ? success : 'Texto pronto para compartilhar.');
    } catch {
      setError('Não foi possível copiar agora. Tente novamente.');
    }
  }
  function openWebsite() {
    try {
      const url = profileLink(profile.website);
      if (url) void Linking.openURL(url).catch(() => setError('Não foi possível abrir o link.'));
    } catch {
      setError('Edite seu contato para atualizar este link.');
    }
  }
  const focusSuggestions = professional
    ? [
        'Hipertrofia e força',
        'Emagrecimento e saúde',
        'Qualidade de vida',
        'Performance esportiva',
        'Condicionamento físico',
      ]
    : ['Ganhar força', 'Criar consistência', 'Melhorar o condicionamento', 'Cuidar da saúde'];
  const previewProfile = { ...profile, ...draft };
  return (
    <View style={{ gap: 20 }}>
      {error && !editing ? (
        <Text color="#FFAF71" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <View style={styles.notice}>
          <Ionicons name="checkmark-circle" size={20} color={accent} />
          <Text color={accent} accessibilityLiveRegion="polite" style={{ flex: 1 }}>
            {notice}
          </Text>
        </View>
      ) : null}
      <View style={styles.hero}>
        <View style={styles.cover}>
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Ionicons
              name={professional ? 'briefcase-outline' : 'fitness-outline'}
              color="#D9F9BB"
              size={16}
            />
            <Text style={styles.eyebrow}>
              {professional ? 'PROFISSIONAL FITTO' : 'SUA JORNADA FITTO'}
            </Text>
          </View>
          <Text style={styles.coverWord}>fitto.</Text>
        </View>
        <View style={{ paddingHorizontal: desktop ? 28 : 20, paddingBottom: 24, gap: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: -38,
            }}
          >
            <PhotoPicker
              disabled={saving}
              onError={setError}
              onChange={(value) => void persist({ avatar_url: value }, true)}
            >
              <View>
                <Avatar key={profile.avatar_url || 'empty'} profile={profile} />
                <View style={styles.camera}>
                  <Ionicons name="camera" size={16} color="#16200F" />
                </View>
              </View>
            </PhotoPicker>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar perfil"
              onPress={() => openEditor()}
              disabled={saving}
              style={styles.editPill}
            >
              <Ionicons name="create-outline" size={17} color={accent} />
              <Text style={{ fontSize: 13 }} color={accent}>
                Editar perfil
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: 5 }}>
            <Text style={styles.name}>{profile.display_name}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar nome de usuário"
              onPress={() => void copyText(`@${profile.username}`, 'Nome de usuário copiado.')}
              style={{
                flexDirection: 'row',
                gap: 7,
                alignItems: 'center',
                alignSelf: 'flex-start',
                minHeight: 30,
              }}
            >
              <Text color="#AFBFA3" style={{ fontSize: 14 }}>
                @{profile.username}
              </Text>
              <Ionicons name="copy-outline" color="#AFBFA3" size={13} />
            </Pressable>
          </View>
          {professional && profile.specialties.length ? (
            <View style={styles.chips}>
              {profile.specialties.map((item) => (
                <View key={item} style={styles.chip}>
                  <Ionicons
                    name={item === 'Nutricionista' ? 'nutrition-outline' : 'barbell-outline'}
                    size={14}
                    color={accent}
                  />
                  <Text color={accent} style={{ fontSize: 12 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.bio}>
            {profile.bio ||
              (professional
                ? 'Sua experiência merece uma boa apresentação. Conte como você ajuda seus alunos.'
                : 'Apresente-se e conte o que te move no treino.')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {profile.location ? (
              <View style={styles.detail}>
                <Ionicons name="location-outline" size={16} color="#B4C2A9" />
                <Text variant="caption">{profile.location}</Text>
              </View>
            ) : null}
            <View style={styles.detail}>
              <Ionicons name="people-outline" size={16} color="#B4C2A9" />
              <Text variant="caption">
                {activeCount}{' '}
                {professional
                  ? activeCount === 1
                    ? 'aluno ativo'
                    : 'alunos ativos'
                  : activeCount === 1
                    ? 'profissional vinculado'
                    : 'profissionais vinculados'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Button
                title="Copiar apresentação"
                variant="outline"
                onPress={() =>
                  void copyText(
                    profilePresentation(profile),
                    'Apresentação copiada. Você pode colar onde quiser.',
                  )
                }
              />
            </View>
            {profile.website ? (
              <View style={{ flex: 1, minWidth: 160 }}>
                <Button title="Abrir meu contato" onPress={openWebsite} />
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View
        style={{ flexDirection: desktop ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}
      >
        <View style={{ flex: 1, minWidth: 0, width: desktop ? undefined : '100%', gap: 18 }}>
          <View style={styles.card}>
            <CardTitle
              icon={professional ? 'briefcase-outline' : 'flag-outline'}
              title={professional ? 'Meu atendimento' : 'Meu objetivo'}
              subtitle={
                professional
                  ? 'O que você oferece e para quem.'
                  : 'O que você quer construir com a sua rotina.'
              }
            />
            {profile.focus ? (
              <Text style={{ fontSize: 17, lineHeight: 26, fontWeight: '600' }}>
                {profile.focus}
              </Text>
            ) : (
              <>
                <Text variant="bodyMuted">
                  {professional
                    ? 'Destaque seu foco, seu público e a transformação que você busca com seus alunos.'
                    : 'Defina seu foco para dar mais intenção à sua jornada.'}
                </Text>
                <Button
                  title={
                    professional ? '+ Definir meu foco de atendimento' : '+ Adicionar meu objetivo'
                  }
                  variant="outline"
                  onPress={() => openEditor('about')}
                />
              </>
            )}
            {professional ? (
              <View style={{ gap: 8, borderTopWidth: 1, borderColor: '#34412D', paddingTop: 14 }}>
                <Text variant="caption">ÁREAS DE ATUAÇÃO</Text>
                <Text>
                  {profile.specialties.join(' · ') ||
                    'Complete suas áreas no cadastro profissional.'}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.card}>
            <CardTitle
              icon="chatbubble-ellipses-outline"
              title="Contato e localização"
              subtitle="Facilite o próximo contato."
            />
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <Ionicons name="location-outline" size={20} color={accent} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>Cidade / região</Text>
                <Text variant="caption">{profile.location || 'Ainda não informada'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar localização"
                onPress={() => openEditor('contact')}
                style={styles.smallAction}
              >
                <Ionicons name="create-outline" size={18} color="#BDCAA9" />
              </Pressable>
            </View>
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <Ionicons name="link-outline" size={20} color={accent} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>Site ou rede social</Text>
                <Text variant="caption" numberOfLines={2}>
                  {profile.website
                    ? profile.website.replace(/^https:\/\//, '')
                    : 'Adicione seu canal de contato'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Editar link de contato"
                onPress={() => openEditor('contact')}
                style={styles.smallAction}
              >
                <Ionicons name="create-outline" size={18} color="#BDCAA9" />
              </Pressable>
            </View>
            {profile.website ? (
              <Button title="Acessar link de contato" variant="ghost" onPress={openWebsite} />
            ) : (
              <Button
                title="+ Adicionar contato"
                variant="outline"
                onPress={() => openEditor('contact')}
              />
            )}
          </View>
        </View>
        <View style={{ width: desktop ? 290 : '100%', gap: 18 }}>
          <View style={styles.card}>
            <CardTitle icon="sparkles-outline" title="Sua apresentação" />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 30, fontWeight: '800' }} color={accent}>
                {percent}%
              </Text>
              <Text variant="caption">
                {complete} de {checklist.length} itens
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Itens preenchidos na apresentação"
              accessibilityValue={{ min: 0, max: checklist.length, now: complete }}
              style={{ height: 5, backgroundColor: '#34412D', borderRadius: 5, overflow: 'hidden' }}
            >
              <View style={{ height: 5, width: `${percent}%`, backgroundColor: accent }} />
            </View>
            <Text variant="caption">
              Sugestões para uma apresentação mais completa. Os campos extras são opcionais.
            </Text>
            {checklist.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${item.done ? 'preenchido' : 'adicionar'}`}
                onPress={() => openEditor(item.section)}
                style={{ flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 36 }}
              >
                <Ionicons
                  name={item.done ? 'checkmark-circle' : 'add-circle-outline'}
                  size={18}
                  color={item.done ? accent : '#96A88A'}
                />
                <Text
                  variant="caption"
                  style={{ flex: 1 }}
                  color={item.done ? '#CED9C4' : '#A8B89B'}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#839576" />
              </Pressable>
            ))}
          </View>
          <View style={styles.card}>
            <CardTitle icon="options-outline" title="Seu espaço" />
            <Button
              title={professional ? 'Ir para meus alunos' : 'Ver minha equipe'}
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/painel',
                  params: { profile: profile.id, tab: 'relationships' },
                })
              }
            />
            <Button
              title="Conta e preferências"
              variant="ghost"
              onPress={() =>
                router.push({
                  pathname: '/painel',
                  params: { profile: profile.id, tab: 'settings' },
                })
              }
            />
          </View>
        </View>
      </View>
      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={15} color="#98AA8B" />
        <Text variant="caption" style={{ flex: 1, fontSize: 12 }}>
          Esta é sua apresentação no Fitto. Copiar o texto não cria uma página pública. Os perfis de
          aluno e profissional são independentes.
        </Text>
      </View>
      {!professional ? <ProfilePosts key={profile.id} profileId={profile.id} /> : null}
      {!professional ? (
        <TrainingIntake profileId={profile.id} onBusy={onBusy} disabled={saving} />
      ) : null}
      {editing ? (
        <Modal visible animationType="slide" onRequestClose={requestClose}>
          <Screen
            scrollable
            contentContainerStyle={{
              paddingVertical: 18,
              gap: 16,
              width: '100%',
              maxWidth: 760,
              alignSelf: 'center',
              paddingBottom: 32,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="title">Editar meu perfil</Text>
                <Text variant="caption">
                  {dirty ? 'Alterações ainda não salvas' : 'Seu perfil, do seu jeito.'}
                </Text>
              </View>
              <Button title="Fechar" variant="ghost" disabled={saving} onPress={requestClose} />
            </View>
            {discard ? (
              <Modal
                visible
                transparent
                animationType="fade"
                onRequestClose={() => setDiscard(false)}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#000000AA',
                    padding: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={[styles.card, { borderColor: '#9B7548', width: '100%', maxWidth: 420 }]}
                  >
                    <Text style={{ fontWeight: '600' }}>Descartar suas alterações?</Text>
                    <Text variant="caption">
                      As informações salvas no seu perfil serão mantidas.
                    </Text>
                    <Button title="Continuar editando" onPress={() => setDiscard(false)} />
                    <Button title="Descartar alterações" variant="outline" onPress={closeEditor} />
                  </View>
                </View>
              </Modal>
            ) : null}
            {error ? (
              <Text accessibilityRole="alert" color="#FFAF71">
                {error}
              </Text>
            ) : null}
            <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6 }}>
              {(
                [
                  { id: 'identity', label: 'Identidade' },
                  { id: 'about', label: professional ? 'Atendimento' : 'Sobre mim' },
                  { id: 'contact', label: 'Contato' },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: section === item.id }}
                  disabled={saving}
                  onPress={() => {
                    setSection(item.id);
                    setPreview(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderBottomWidth: 2,
                    borderColor: section === item.id ? accent : '#34412D',
                  }}
                >
                  <Text style={{ fontSize: 13 }} color={section === item.id ? accent : '#A4B299'}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {section === 'identity' ? (
              <View style={{ gap: 16 }}>
                <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Avatar
                    key={draft.avatar_url || 'draft-empty'}
                    profile={{ display_name: draft.display_name, avatar_url: draft.avatar_url }}
                    small
                  />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontWeight: '600' }}>Sua foto</Text>
                    <Text variant="caption">JPG, PNG ou WebP · até 2 MB</Text>
                    <PhotoPicker
                      disabled={saving}
                      onError={setError}
                      onChange={(value) => change('avatar_url', value)}
                    />
                    {draft.avatar_url ? (
                      <Button
                        title="Remover foto"
                        variant="ghost"
                        disabled={saving}
                        onPress={() => change('avatar_url', null)}
                      />
                    ) : null}
                  </View>
                </View>
                <TextField
                  label="Nome de exibição"
                  value={draft.display_name}
                  onChangeText={(value) => change('display_name', value)}
                  editable={!saving}
                  maxLength={80}
                  error={fieldErrors.display_name}
                  autoComplete="name"
                />
                <TextField
                  label="Nome de usuário"
                  value={draft.username}
                  onChangeText={(value) =>
                    change('username', value.toLowerCase().replace(/^@/, ''))
                  }
                  editable={!saving}
                  maxLength={24}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.username}
                  helperText="Seu @ é exclusivo. Use letras, números ou _."
                />
              </View>
            ) : section === 'about' ? (
              <View style={{ gap: 16 }}>
                <TextField
                  label="Sobre você"
                  value={draft.bio}
                  onChangeText={(value) => change('bio', value)}
                  editable={!saving}
                  maxLength={280}
                  multiline
                  error={fieldErrors.bio}
                  helperText={`${draft.bio.length}/280 · Conte sua experiência, sua abordagem ou o que te motiva.`}
                />
                <TextField
                  label={professional ? 'Foco do atendimento' : 'Meu foco / objetivo'}
                  value={draft.focus}
                  onChangeText={(value) => change('focus', value)}
                  editable={!saving}
                  maxLength={160}
                  error={fieldErrors.focus}
                  helperText={`${draft.focus.length}/160 · Seja específico e direto.`}
                />
                <Text variant="caption">Sugestões para usar como ponto de partida</Text>
                <View style={styles.chips}>
                  {focusSuggestions.map((value) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      disabled={saving}
                      onPress={() => change('focus', value)}
                      style={[styles.chip, { minHeight: 38 }]}
                    >
                      <Ionicons name="add" size={14} color={accent} />
                      <Text color={accent} style={{ fontSize: 12 }}>
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {professional ? (
                  <View style={styles.card}>
                    <Text variant="caption">Áreas do seu cadastro profissional</Text>
                    <Text>{profile.specialties.join(' · ')}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <TextField
                  label="Cidade / estado"
                  value={draft.location}
                  onChangeText={(value) => change('location', value)}
                  editable={!saving}
                  maxLength={80}
                  error={fieldErrors.location}
                  placeholder="Ex.: Itajubá, MG"
                  helperText="Informe uma cidade ou região. Não é necessário colocar seu endereço."
                />
                <TextField
                  label="Site ou rede social"
                  value={draft.website}
                  onChangeText={(value) => change('website', value)}
                  editable={!saving}
                  maxLength={250}
                  error={fieldErrors.website}
                  placeholder="instagram.com/seuperfil"
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  helperText="Pode ser seu site, Instagram ou link de atendimento. Adicionamos https:// quando necessário."
                />
              </View>
            )}
            <Button
              title={preview ? 'Fechar prévia da apresentação' : 'Prévia da apresentação'}
              variant="outline"
              disabled={saving}
              onPress={() => setPreview(!preview)}
            />
            {preview ? (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                  <Avatar
                    key={draft.avatar_url || 'preview-empty'}
                    profile={previewProfile}
                    small
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="title">{draft.display_name || 'Seu nome'}</Text>
                    <Text variant="caption">@{draft.username || 'seuusuario'}</Text>
                  </View>
                </View>
                <Text>{draft.bio || 'Sua apresentação aparecerá aqui.'}</Text>
                {draft.focus ? <Text color={accent}>{draft.focus}</Text> : null}
                {draft.location ? <Text variant="caption">{draft.location}</Text> : null}
                {draft.website ? <Text variant="caption">{draft.website}</Text> : null}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  disabled={saving}
                  onPress={requestClose}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Salvar perfil" loading={saving} disabled={!dirty} onPress={save} />
              </View>
            </View>
          </Screen>
        </Modal>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#192116',
    borderWidth: 1,
    borderColor: '#3A4A30',
  },
  cover: {
    height: 126,
    backgroundColor: '#2D4420',
    paddingHorizontal: 24,
    paddingTop: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orbitLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: '#6B914A',
    right: -35,
    top: -160,
    opacity: 0.4,
  },
  orbitSmall: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 24,
    borderColor: '#3D5C2B',
    right: 95,
    top: -105,
    opacity: 0.6,
  },
  coverWord: { color: '#C0F568', fontWeight: '800', fontSize: 24, opacity: 0.65 },
  eyebrow: { color: '#D6E9C5', fontSize: 10, letterSpacing: 1.4, fontWeight: '600' },
  name: { color: '#F2F5ED', fontSize: 27, lineHeight: 35, fontFamily: 'Manrope_800ExtraBold' },
  bio: { color: '#D2DCCB', fontSize: 15, lineHeight: 24 },
  card: {
    padding: 20,
    gap: 14,
    borderRadius: 20,
    backgroundColor: '#192116',
    borderWidth: 1,
    borderColor: '#34422C',
  },
  camera: {
    position: 'absolute',
    right: -1,
    bottom: 1,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#192116',
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    minHeight: 40,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4C633C',
    borderRadius: 12,
    backgroundColor: '#202D19',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#2C3E22',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  contactRow: { flexDirection: 'row', gap: 11, alignItems: 'center', paddingVertical: 6 },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#293A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAction: { width: 38, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  notice: {
    padding: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24361A',
    borderRadius: 14,
  },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
});
