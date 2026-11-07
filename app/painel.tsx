import { PlansPanel, PlanUpgradeCard } from '@/features/relationships/PlansPanel';
import { ProfessionalHome } from '@/features/relationships/ProfessionalHome';
import { rememberProfile } from '@/features/auth/lastProfile';
import { NutritionDashboard } from '@/features/nutrition/NutritionDashboard';
import { StudentRoster } from '@/features/relationships/StudentRoster';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, View } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { Button, Text, TextField } from '@/components/ui';
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
  const [credential, setCredential] = useState('');
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
        if (data.role === 'student' && pending) setCredential(pending);
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
    return (
      <View
        key={link.id}
        style={{ gap: 10, padding: 16, borderWidth: 1, borderColor: '#343434', borderRadius: 12 }}
      >
        <Text variant="title">
          {link.name}
          {link.is_self ? ' · Seu próprio perfil' : ''}
        </Text>
        <Text variant="bodyMuted">@{link.username}</Text>
        {link.specialties.length ? <Text>{link.specialties.join(' · ')}</Text> : null}
        <Text>{labels[link.status]}</Text>
        <Text variant="caption">
          Solicitação: {new Date(link.created_at).toLocaleDateString('pt-BR')}
        </Text>
        {isProfessional && link.status === 'pending' ? (
          <>
            <Button
              title="Aprovar aluno"
              disabled={busy || (!link.is_self && countedActive >= (dashboard?.limit || 1))}
              onPress={() => {
                void run(() => mutate('approve', link));
              }}
            />
            {!link.is_self && countedActive >= (dashboard?.limit || 1) ? (
              <Text>Limite do plano atingido. A solicitação continuará pendente.</Text>
            ) : null}
            <Button
              title="Recusar solicitação"
              variant="outline"
              disabled={busy}
              onPress={() => setConfirmation({ action: 'reject', link })}
            />
          </>
        ) : null}
        {link.status === 'active' ? (
          <>
            {isProfessional ? (
              <Button
                title="Abrir painel do aluno →"
                disabled={busy}
                onPress={() =>
                  router.push({
                    pathname: '/aluno',
                    params: {
                      profile: profile!.id,
                      link: link.id,
                    },
                  })
                }
              />
            ) : profile && link.specialties.includes('Treinador') ? (
              <Workouts profileId={profile.id} linkId={link.id} trainer={false} />
            ) : null}
            {!isProfessional && link.whatsapp ? (
              <Button
                title="Falar pelo WhatsApp"
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
            {!isProfessional && !link.whatsapp ? (
              <Text variant="caption">O profissional ainda não cadastrou o WhatsApp.</Text>
            ) : null}
            <Button
              title="Encerrar vínculo"
              variant="outline"
              disabled={busy}
              onPress={() => setConfirmation({ action: 'end', link })}
            />
          </>
        ) : null}
      </View>
    );
  }
  return (
    <DashboardShell
      hideIntro={
        (isProfessional && (tab === 'relationships' || tab === 'plans')) || tab === 'nutrition'
      }
      profile={profile}
      navigationKey={planNavigation}
      tab={tab}
      onTab={(next) => {
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
            <>
              {isProfessional ? (
                <Button
                  title="Planos e capacidade de alunos"
                  variant="outline"
                  disabled={busy}
                  onPress={() => setTab('plans')}
                />
              ) : null}
              <View
                style={{
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#30372A',
                  borderRadius: 18,
                  backgroundColor: '#191E16',
                  gap: 12,
                }}
              >
                <Ionicons name="person-circle-outline" size={36} color="#D3FB69" />
                <Text variant="title">{profile.display_name}</Text>
                <Text variant="bodyMuted">
                  @{profile.username} · {isProfessional ? 'Profissional' : 'Aluno'}
                </Text>
                <Button
                  title="Contas · trocar ou adicionar perfil"
                  variant="outline"
                  disabled={busy}
                  onPress={() => router.replace('/contas')}
                />
              </View>
              {isProfessional ? (
                <View
                  style={{
                    gap: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#30372A',
                    borderRadius: 18,
                    backgroundColor: '#191E16',
                  }}
                >
                  <Text variant="title">Atendimento</Text>
                  <TextField
                    label="WhatsApp de atendimento"
                    placeholder="5511999999999"
                    helperText="Código do país + DDD + número. Só será mostrado aos seus alunos aprovados."
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 15))}
                    keyboardType="phone-pad"
                    editable={!busy}
                  />
                  <Button
                    title="Salvar WhatsApp"
                    variant="outline"
                    disabled={busy}
                    onPress={() => {
                      void run(async () => {
                        await relationshipApi('contact', profileId!, { whatsapp: phone });
                        setNotice(phone ? 'WhatsApp salvo.' : 'WhatsApp removido.');
                      });
                    }}
                  />
                </View>
              ) : null}
              <Button
                title="Sair da conta"
                variant="ghost"
                loading={busy}
                onPress={() => {
                  void run(async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) throw new Error('Não foi possível sair. Tente novamente.');
                    router.replace('/entrar');
                  });
                }}
              />
            </>
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
                <Text variant="heading">
                  {isProfessional ? 'Meus alunos' : 'Meus profissionais'}
                </Text>
                {active.length ? (
                  active.map(card)
                ) : (
                  <Text>
                    {isProfessional
                      ? 'Você ainda não tem alunos ativos. Gere um convite para começar.'
                      : 'Você ainda não tem profissionais vinculados.'}
                  </Text>
                )}

                <Button
                  title="Atualizar acompanhamentos"
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    void run(refresh);
                  }}
                />
                {isProfessional ? (
                  <>
                    <Text variant="title">
                      {dashboard.limit === 1 ? 'Plano gratuito' : 'Plano atual'} · {countedActive}/
                      {dashboard.limit} alunos ativos
                    </Text>
                    <Text>
                      Solicitações pendentes não ocupam vaga. Cada profissional tem seu próprio
                      limite.
                    </Text>
                    <Button
                      title={invite ? 'Gerar outro convite' : 'Gerar convite de aluno'}
                      disabled={busy}
                      onPress={() => {
                        if (invite && !expired) setConfirmation({ action: 'invite' });
                        else void run(createInvite);
                      }}
                    />
                    {invite ? (
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
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text variant="title">Adicionar profissional</Text>
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
                    <Text>
                      Use o QR Code do profissional pela câmera do celular ou digite os seis dígitos
                      abaixo.
                    </Text>
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
                            await relationshipApi<Preview>('preview', profileId!, { credential }),
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
                          Confirme se este é o profissional que você deseja vincular. Ele precisará
                          aprovar sua solicitação.
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
                              await refresh();
                              setNotice(
                                'Solicitação enviada. Aguarde a aprovação do profissional.',
                              );
                            });
                          }}
                        />
                      </View>
                    ) : null}
                  </>
                )}
                <Text variant="heading">
                  {isProfessional ? 'Solicitações de vínculo' : 'Solicitações pendentes'}
                </Text>
                {pending.length ? pending.map(card) : <Text>Nenhuma solicitação pendente.</Text>}
                {dashboard.links.some((l) => l.status === 'rejected' || l.status === 'ended') ? (
                  <>
                    <Text variant="heading">Histórico de vínculos</Text>
                    {dashboard.links
                      .filter((l) => l.status === 'rejected' || l.status === 'ended')
                      .map(card)}
                  </>
                ) : null}
              </>
            )}
          </View>
        </>
      )}
    </DashboardShell>
  );
}
