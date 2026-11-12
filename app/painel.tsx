import { SettingsPanel } from '@/features/relationships/SettingsPanel';
import { PlansPanel, PlanUpgradeCard } from '@/features/relationships/PlansPanel';
import { ProfessionalHome } from '@/features/relationships/ProfessionalHome';
import { rememberProfile } from '@/features/auth/lastProfile';
import { NutritionDashboard } from '@/features/nutrition/NutritionDashboard';
import { StudentRoster } from '@/features/relationships/StudentRoster';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DashboardShell,
  DashboardHome,
  DashboardTab,
} from '@/features/relationships/DashboardShell';
import {
  Dashboard,
  Invite,
  Preview,
  Profile,
  Relationship,
  RelationshipError,
  pendingInvite,
  relationshipApi,
} from '@/features/relationships/api';
import { InviteQr } from '@/features/relationships/InviteQr';
import { ProfilePanel } from '@/features/relationships/ProfilePanel';
import { QrScanner } from '@/features/relationships/QrScanner';
import { Workouts } from '@/features/relationships/Workouts';
import { DetailsPanel } from '@/features/relationships/DetailsPanel';
import { TodayWorkout } from '@/features/relationships/TodayWorkout';
import { supabase } from '@/lib/supabase';

const labels = {
  pending: 'Aguardando aprovação do profissional',
  active: 'Acompanhamento ativo',
  rejected: 'Solicitação recusada',
  ended: 'Vínculo encerrado',
};
type Confirmation = { action: 'reject' | 'end' | 'invite'; link?: Relationship };
export default function DashboardScreen() {
  const { profile: profileId, tab: initialTab } = useLocalSearchParams<{
    profile?: string;
    tab?: string;
  }>();
  return (
    <DashboardContent
      key={`${profileId}:${initialTab}`}
      profileId={profileId}
      initialTab={initialTab}
    />
  );
}
function DashboardContent({ profileId, initialTab }: { profileId?: string; initialTab?: string }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [planNavigation, setPlanNavigation] = useState(0);
  const [tab, setTab] = useState<DashboardTab>(() =>
    pendingInvite.get()
      ? 'relationships'
      : ['home', 'relationships', 'nutrition', 'profile', 'settings', 'plans'].includes(
            initialTab || '',
          )
        ? (initialTab as DashboardTab)
        : 'home',
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [credential, setCredential] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const request = useRef(0);
  const actionLock = useRef(false);
  const load = useCallback(() => {
    const id = ++request.current;
    if (!session || !profileId) {
      setFetching(false);
      return;
    }
    setFetching(true);
    setError('');
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id,role,display_name,username,specialties,bio,avatar_url,location,website,focus')
          .eq('id', profileId)
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (error || !data)
          throw new Error('Perfil indisponível. Volte para Contas e selecione um perfil.');
        const next = await relationshipApi<Dashboard>('dashboard', profileId);
        if (id !== request.current) return;
        setProfile(data);
        rememberProfile(session.user.id, data.id);
        setDashboard(next);
        setPhone(next.whatsapp || '');
        setBlockedUntil(next.blocked_until);
        const pending = pendingInvite.get();
        if (data.role === 'student' && pending) {
          setCredential(pending);
          setInviteOpen(true);
        }
      } catch (e) {
        if (id === request.current) setError(e instanceof Error ? e.message : 'Falha ao carregar.');
      } finally {
        if (id === request.current) setFetching(false);
      }
    })();
    return () => {
      request.current++;
    };
  }, [session, profileId]);
  useFocusEffect(load);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil(((blockedUntil ? Date.parse(blockedUntil) : 0) - now) / 1000),
  );
  const expired = !!invite && Date.parse(invite.expires_at) <= now;
  const isProfessional = profile?.role === 'professional';
  async function run(work: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.');
      if (e instanceof RelationshipError && e.blockedUntil) setBlockedUntil(e.blockedUntil);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    const data = await relationshipApi<Dashboard>('dashboard', profileId!);
    setDashboard(data);
    setBlockedUntil(data.blocked_until);
  }
  async function createInvite() {
    const result = await relationshipApi<Invite>('invite', profileId!);
    setInvite(result);
    setConfirmation(null);
  }
  async function mutate(action: string, link: Relationship) {
    await relationshipApi(action, profileId!, { link_id: link.id });
    setConfirmation(null);
    await refresh();
    setNotice(
      action === 'approve'
        ? 'Aluno aprovado.'
        : action === 'reject'
          ? 'Solicitação recusada.'
          : 'Vínculo encerrado. A conta e os demais acompanhamentos foram preservados.',
    );
  }
  if (!loading && !session) return <Redirect href="/entrar" />;
  const inviteUrl = invite
    ? ExpoLinking.createURL('/convite', { queryParams: { token: invite.token } })
    : '';
  const active = dashboard?.links.filter((l) => l.status === 'active') || [];
  const countedActive = active.filter((link) => !link.is_self).length;
  const pending = dashboard?.links.filter((l) => l.status === 'pending') || [];
  function card(link: Relationship) {
    const activeLink = link.status === 'active';
    return (
      <View
        key={link.id}
        style={{
          gap: 6,
          padding: 12,
          backgroundColor: '#192219',
          borderWidth: 1,
          borderColor: '#34432D',
          borderRadius: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#293A22',
            }}
          >
            <Ionicons name="person-outline" size={19} color="#C9F78C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title">{link.name}</Text>
            <Text variant="caption">{link.specialties.join(' · ') || '@' + link.username}</Text>
          </View>
        </View>
        {!activeLink ? <Text variant="caption">{labels[link.status]}</Text> : null}
        {activeLink && profile ? (
          <>
            {link.specialties.includes('Treinador') ? (
              <DetailsPanel
                title="Treinos e histórico"
                leading={<Ionicons name="barbell-outline" size={18} color="#C9F78C" />}
              >
                <Workouts profileId={profile.id} linkId={link.id} trainer={false} />
              </DetailsPanel>
            ) : null}
            {link.whatsapp || link.specialties.includes('Nutricionista') ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {link.specialties.includes('Nutricionista') ? (
                  <StudentAction
                    title="Alimentação"
                    icon="restaurant-outline"
                    disabled={busy}
                    onPress={() => setTab('nutrition')}
                  />
                ) : null}
                {link.whatsapp ? (
                  <StudentAction
                    title="WhatsApp"
                    icon="logo-whatsapp"
                    disabled={busy}
                    onPress={() => {
                      void run(async () => {
                        await Linking.openURL(
                          `https://wa.me/${link.whatsapp}?text=${encodeURIComponent('Olá! Sou seu aluno no Fitto.')}`,
                        );
                      });
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            <DetailsPanel title="Gerenciar vínculo">
              <Text variant="caption">@{link.username}</Text>
              <Button
                title="Encerrar vínculo"
                variant="outline"
                disabled={busy}
                onPress={() => setConfirmation({ action: 'end', link })}
              />
            </DetailsPanel>
          </>
        ) : null}
      </View>
    );
  }
  return (
    <DashboardShell
      hideIntro={
        (isProfessional && (tab === 'relationships' || tab === 'plans')) ||
        tab === 'nutrition' ||
        tab === 'settings'
      }
      profile={profile}
      navigationKey={planNavigation}
      tab={tab}
      onTab={(next) => {
        setEditingPhone(false);
        setTab(next);
      }}
      pendingCount={pending.length}
      disabled={busy}
    >
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {notice ? <Text accessibilityRole="alert">{notice}</Text> : null}
      {fetching || loading ? (
        <Text>Carregando painel...</Text>
      ) : !profile || !dashboard ? (
        <Button
          title="Tentar novamente"
          onPress={() => {
            load();
          }}
        />
      ) : (
        <>
          {tab === 'home' ? (
            profile.role === 'professional' ? (
              <View style={{ gap: 20 }}>
                <PlanUpgradeCard
                  count={countedActive}
                  limit={dashboard.limit}
                  onPress={() => setTab('plans')}
                />
                <ProfessionalHome
                  profile={profile}
                  links={active}
                  pendingCount={pending.length}
                  onStudents={() => setTab('relationships')}
                />
              </View>
            ) : profile.role === 'student' &&
              active.some((l) => l.specialties.includes('Treinador')) ? (
              <View style={{ gap: 18 }}>
                <Text variant="heading">Vamos treinar, {profile.display_name.split(' ')[0]}?</Text>
                {active
                  .filter((l) => l.specialties.includes('Treinador'))
                  .map((l) => (
                    <TodayWorkout
                      key={l.id}
                      profileId={profile.id}
                      linkId={l.id}
                      trainerName={l.name}
                    />
                  ))}
              </View>
            ) : profile.role === 'student' &&
              active.some((l) => l.specialties.includes('Nutricionista')) ? (
              <NutritionDashboard
                profile={profile}
                links={dashboard.links}
                onProfileUpdated={setProfile}
              />
            ) : (
              <DashboardHome />
            )
          ) : null}
          {tab === 'nutrition' ? (
            <NutritionDashboard profile={profile} links={dashboard.links} />
          ) : null}
          {tab === 'profile' ? (
            <ProfilePanel
              profile={profile}
              activeCount={active.length}
              onSaved={setProfile}
              onBusy={setBusy}
            />
          ) : null}
          {tab === 'plans' && isProfessional ? (
            <PlansPanel
              count={countedActive}
              limit={dashboard.limit}
              pending={
                dashboard.links.filter((link) => link.status === 'pending' && !link.is_self).length
              }
              onStudents={() => setTab('relationships')}
              onActivate={async (capacity) => {
                const next = await relationshipApi<Dashboard>('set_plan', profile.id, { capacity });
                setDashboard(next);
              }}
              onBusy={setBusy}
              onNavigate={() => setPlanNavigation((n) => n + 1)}
              onBack={() => setTab('home')}
            />
          ) : null}
          {tab === 'settings' ? (
            <SettingsPanel
              profile={profile}
              busy={busy}
              count={countedActive}
              limit={dashboard.limit}
              savedPhone={dashboard.whatsapp || ''}
              phone={phone}
              editingPhone={editingPhone}
              onPhoneChange={setPhone}
              onTogglePhone={() => {
                setPhone(dashboard.whatsapp || '');
                setEditingPhone(!editingPhone);
              }}
              onSavePhone={() => {
                void run(async () => {
                  await relationshipApi('contact', profile.id, { whatsapp: phone });
                  setDashboard((current) =>
                    current ? { ...current, whatsapp: phone || null } : current,
                  );
                  setEditingPhone(false);
                  setNotice(phone ? 'WhatsApp salvo.' : 'WhatsApp removido.');
                });
              }}
              onPlans={() => {
                setEditingPhone(false);
                setTab('plans');
              }}
              onAccounts={() => router.replace('/contas')}
              onSignOut={() => {
                void run(async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw new Error('Não foi possível sair. Tente novamente.');
                  router.replace('/entrar');
                });
              }}
            />
          ) : null}
          <View style={{ display: tab === 'relationships' ? 'flex' : 'none', gap: 16 }}>
            {confirmation ? (
              <Modal
                visible
                transparent
                animationType="fade"
                onRequestClose={() => {
                  if (!busy) setConfirmation(null);
                }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 24,
                  }}
                >
                  <View
                    accessibilityRole="alert"
                    style={{
                      backgroundColor: '#161616',
                      width: '100%',
                      maxWidth: 480,
                      gap: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#FF6B5A',
                      borderRadius: 12,
                    }}
                  >
                    <Text variant="title">
                      {confirmation.action === 'invite'
                        ? 'Gerar um novo convite?'
                        : confirmation.action === 'reject'
                          ? 'Recusar solicitação de vínculo?'
                          : 'Encerrar este vínculo?'}
                    </Text>
                    <Text>
                      {confirmation.action === 'invite'
                        ? 'O convite anterior deixará de funcionar.'
                        : confirmation.action === 'reject'
                          ? `${confirmation.link?.name} não será vinculado ao seu acompanhamento.`
                          : `O acompanhamento com ${confirmation.link?.name} será encerrado. Nenhuma conta será apagada.`}
                    </Text>
                    <Button
                      title="Cancelar"
                      variant="outline"
                      disabled={busy}
                      onPress={() => setConfirmation(null)}
                    />
                    <Button
                      title={
                        confirmation.action === 'invite'
                          ? 'Gerar novo convite'
                          : confirmation.action === 'reject'
                            ? 'Confirmar recusa'
                            : 'Confirmar encerramento'
                      }
                      loading={busy}
                      onPress={() => {
                        void run(() =>
                          confirmation.action === 'invite'
                            ? createInvite()
                            : mutate(confirmation.action, confirmation.link!),
                        );
                      }}
                    />
                  </View>
                </View>
              </Modal>
            ) : null}
            {isProfessional ? (
              <StudentRoster
                trainer={profile.specialties.includes('Treinador')}
                nutritionist={profile.specialties.includes('Nutricionista')}
                links={dashboard.links}
                limit={dashboard.limit}
                onPlans={() => setTab('plans')}
                busy={busy}
                onOpen={(link, section) =>
                  router.push({
                    pathname: '/aluno',
                    params: {
                      profile: profile!.id,
                      link: link.id,
                      ...(section ? { section } : {}),
                    },
                  })
                }
                onInvite={() => {
                  if (invite && !expired) setConfirmation({ action: 'invite' });
                  else void run(createInvite);
                }}
                onRefresh={() => void run(refresh)}
                onApprove={(link) => void run(() => mutate('approve', link))}
                onReject={(link) => setConfirmation({ action: 'reject', link })}
                onEnd={(link) => setConfirmation({ action: 'end', link })}
                inviteContent={
                  invite ? (
                    <View style={{ gap: 12 }}>
                      <Text variant="heading" style={{ textAlign: 'center' }}>
                        {invite.code.slice(0, 3)} {invite.code.slice(3)}
                      </Text>
                      {!expired ? <InviteQr value={inviteUrl} /> : null}
                      <Text>
                        {expired
                          ? 'Convite expirado. Gere outro para continuar.'
                          : `Válido até ${new Date(invite.expires_at).toLocaleString('pt-BR')}. Uso único. Gerar outro invalida este.`}
                      </Text>
                      {!expired ? <Text selectable>{inviteUrl}</Text> : null}
                    </View>
                  ) : null
                }
              />
            ) : (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <Text variant="title">Meus profissionais</Text>
                  <Button
                    title="Atualizar"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => void run(refresh)}
                  />
                </View>
                {active.length ? (
                  active.map(card)
                ) : (
                  <Text variant="caption">Você ainda não tem profissionais vinculados.</Text>
                )}
                <StudentAction
                  title="Adicionar profissional"
                  icon="person-add-outline"
                  disabled={busy}
                  onPress={() => {
                    setError('');
                    setNotice('');
                    setInviteOpen(true);
                  }}
                />
                {inviteOpen && tab === 'relationships' ? (
                  <Modal
                    visible
                    animationType="slide"
                    onRequestClose={() => {
                      if (!busy) setInviteOpen(false);
                    }}
                  >
                    <Screen scrollable contentContainerStyle={{ paddingVertical: 16 }}>
                      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <StudentAction
                            title="Voltar"
                            icon="arrow-back"
                            disabled={busy}
                            onPress={() => setInviteOpen(false)}
                          />
                          <Text variant="title" style={{ flex: 1 }}>
                            Adicionar profissional
                          </Text>
                        </View>
                        {error ? (
                          <Text accessibilityRole="alert" color="#FF6B5A">
                            {error}
                          </Text>
                        ) : null}
                        {notice ? <Text accessibilityLiveRegion="polite">{notice}</Text> : null}
                        <QrScanner
                          disabled={busy || remaining > 0}
                          onScan={(value) => {
                            setCredential(value);
                            setPreview(null);
                            setError('');
                            setNotice(
                              'QR Code lido. Consulte o convite para conferir o profissional e confirmar o vínculo.',
                            );
                          }}
                        />
                        <TextField
                          label={
                            credential.length === 64
                              ? 'Convite recebido por QR Code'
                              : 'Código do convite'
                          }
                          value={
                            credential.length === 64
                              ? 'Convite recebido por QR Code'
                              : credential.length > 3
                                ? `${credential.slice(0, 3)} ${credential.slice(3)}`
                                : credential
                          }
                          placeholder="123 456"
                          editable={!busy && remaining === 0}
                          keyboardType="number-pad"
                          onChangeText={(v) => {
                            setCredential(v.replace(/\D/g, '').slice(0, 6));
                            setPreview(null);
                          }}
                        />
                        {credential.length === 64 ? (
                          <Button
                            title="Usar outro código"
                            variant="ghost"
                            disabled={busy}
                            onPress={() => {
                              setCredential('');
                              setPreview(null);
                              pendingInvite.clear();
                            }}
                          />
                        ) : null}
                        {remaining > 0 ? (
                          <Text accessibilityRole="alert">
                            Novas tentativas em {Math.floor(remaining / 60)}:
                            {String(remaining % 60).padStart(2, '0')}
                          </Text>
                        ) : null}
                        <Button
                          title="Consultar convite"
                          loading={busy}
                          disabled={remaining > 0 || ![6, 64].includes(credential.length)}
                          onPress={() => {
                            void run(async () => {
                              setPreview(null);
                              setPreview(
                                await relationshipApi<Preview>('preview', profileId!, {
                                  credential,
                                }),
                              );
                            });
                          }}
                        />
                        {preview ? (
                          <View
                            style={{
                              gap: 12,
                              padding: 16,
                              borderWidth: 1,
                              borderColor: '#343434',
                              borderRadius: 12,
                            }}
                          >
                            <Text variant="title">{preview.name}</Text>
                            <Text>@{preview.username}</Text>
                            <Text>{preview.specialties.join(' · ')}</Text>
                            <Text>
                              Confirme se este é o profissional que você deseja vincular. Ele
                              precisará aprovar sua solicitação.
                            </Text>
                            <Button
                              title="Confirmar solicitação de vínculo"
                              disabled={busy || remaining > 0}
                              onPress={() => {
                                void run(async () => {
                                  await relationshipApi('request', profileId!, { credential });
                                  pendingInvite.clear();
                                  setPreview(null);
                                  setCredential('');
                                  setInviteOpen(false);
                                  await refresh();
                                  setNotice(
                                    'Solicitação enviada. Aguarde a aprovação do profissional.',
                                  );
                                });
                              }}
                            />
                          </View>
                        ) : null}
                      </View>
                    </Screen>
                  </Modal>
                ) : null}
                {pending.length ? (
                  <DetailsPanel title={`Solicitações pendentes · ${pending.length}`}>
                    {pending.map(card)}
                  </DetailsPanel>
                ) : null}
                {dashboard.links.some((l) => l.status === 'rejected' || l.status === 'ended') ? (
                  <DetailsPanel title="Histórico de vínculos">
                    {dashboard.links
                      .filter((l) => l.status === 'rejected' || l.status === 'ended')
                      .map(card)}
                  </DetailsPanel>
                ) : null}
              </>
            )}
          </View>
        </>
      )}
    </DashboardShell>
  );
}

function StudentAction({
  title,
  icon,
  disabled,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        borderRadius: 10,
        opacity: disabled ? 0.55 : 1,
        backgroundColor: '#293A22',
      }}
    >
      <Ionicons name={icon} size={17} color="#C9F78C" />
      <Text color="#D9E7D0" style={{ fontSize: 13 }}>
        {title}
      </Text>
    </Pressable>
  );
}
