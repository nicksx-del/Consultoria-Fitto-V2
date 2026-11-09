import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { Profile } from './api';
import { MinimizedWorkoutBar } from './MinimizedWorkout';

export type DashboardTab =
  'home' | 'relationships' | 'nutrition' | 'profile' | 'settings' | 'plans';
export function DashboardShell({
  profile,
  tab,
  onTab,
  pendingCount,
  disabled,
  children,
  navigationKey,
  hideIntro = false,
  editorMode = false,
}: {
  profile: Profile | null;
  tab: DashboardTab;
  onTab: (tab: DashboardTab) => void;
  pendingCount: number;
  disabled: boolean;
  children: React.ReactNode;
  navigationKey?: number;
  hideIntro?: boolean;
  editorMode?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1100;
  const [accountMenu, setAccountMenu] = useState(false);
  const router = useRouter();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [navigationKey, tab]);
  const tabs: {
    id: DashboardTab;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    activeIcon: React.ComponentProps<typeof Ionicons>['name'];
  }[] = [
    { id: 'home', label: 'Início', icon: 'home-outline', activeIcon: 'home' },
    {
      id: 'relationships',
      label: profile?.role === 'professional' ? 'Alunos' : 'Equipe',
      icon: 'people-outline',
      activeIcon: 'people',
    },
    { id: 'nutrition', label: 'Alimentação', icon: 'restaurant-outline', activeIcon: 'restaurant' },
    { id: 'profile', label: 'Perfil', icon: 'person-circle-outline', activeIcon: 'person-circle' },
    { id: 'settings', label: 'Configurações', icon: 'settings-outline', activeIcon: 'settings' },
  ];
  const title =
    tab === 'plans'
      ? 'Planos'
      : tab === 'home'
        ? 'Seu espaço Fitto'
        : tab === 'nutrition'
          ? 'Alimentação'
          : tab === 'profile'
            ? 'Meu perfil'
            : tab === 'settings'
              ? 'Configurações'
              : profile?.role === 'professional'
                ? 'Meus alunos'
                : 'Meu acompanhamento';
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <View style={styles.topbar}>
        <View style={[styles.topbarInner, desktop && { maxWidth: 1440 }]}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="fitness" size={23} color="#111" />
            </View>
            <Text style={styles.wordmark}>
              fitto<Text color="#D3FB69">.</Text>
            </Text>
          </View>
          <View style={styles.identity}>
            <View style={styles.role}>
              <View style={styles.dot} />
              <Text style={styles.roleText}>
                {profile?.role === 'professional' ? 'Profissional' : 'Aluno'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Menu da conta"
              accessibilityState={{ expanded: accountMenu }}
              disabled={disabled}
              onPress={() => setAccountMenu((value) => !value)}
              style={styles.avatar}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={{ width: 34, height: 34, borderRadius: 17 }}
                  accessibilityLabel="Sua foto"
                />
              ) : (
                <Text style={styles.initial}>
                  {profile?.display_name.charAt(0).toUpperCase() || 'F'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
      {accountMenu ? (
        <View
          style={{
            position: 'absolute',
            right: 20,
            top: 70 + insets.top,
            zIndex: 100,
            backgroundColor: '#20291A',
            borderColor: '#45543B',
            borderWidth: 1,
            borderRadius: 14,
            padding: 8,
            width: 220,
            gap: 4,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAccountMenu(false);
              onTab('profile');
            }}
            style={{ padding: 14 }}
          >
            <Text>Meu perfil</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAccountMenu(false);
              router.push({ pathname: '/contas', params: { trocar: '1' } });
            }}
            style={{ padding: 14 }}
          >
            <Text>Trocar perfil</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {desktop && !editorMode ? (
          <View
            style={{
              width: 208,
              padding: 16,
              gap: 8,
              borderRightWidth: 1,
              borderColor: '#30382B',
              backgroundColor: '#151B12',
            }}
          >
            <Text variant="caption" style={{ padding: 12 }}>
              SEU ESPAÇO
            </Text>
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: tab === item.id, disabled }}
                disabled={disabled}
                onPress={() => {
                  setAccountMenu(false);
                  onTab(item.id);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: tab === item.id ? '#2A3A20' : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Ionicons
                  name={tab === item.id ? item.activeIcon : item.icon}
                  size={21}
                  color={tab === item.id ? '#C0F568' : '#B1BCAA'}
                />
                <Text color={tab === item.id ? '#C0F568' : '#D0D8CA'} style={{ fontSize: 14 }}>
                  {item.label}
                </Text>
                {item.id === 'relationships' && pendingCount ? (
                  <Text color="#C0F568">{pendingCount}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView
          ref={scroll}
          key={tab}
          style={{
            flex: 1,
            ...(editorMode && Platform.OS === 'web'
              ? ({ transform: 'none' } as unknown as import('react-native').ViewStyle)
              : {}),
          }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.content,
              profile?.role === 'professional' &&
                ['home', 'relationships', 'profile'].includes(tab) && { maxWidth: 1280 },
            ]}
          >
            {!hideIntro && !editorMode ? (
              <>
                <Text style={styles.eyebrow}>
                  {tab === 'home'
                    ? `OLÁ, ${profile?.display_name.split(' ')[0].toUpperCase() || 'BEM-VINDO'}`
                    : 'SEU PAINEL'}
                </Text>
                <Text style={styles.title}>{title}</Text>
                <Text variant="bodyMuted" style={{ marginTop: 8, marginBottom: 28 }}>
                  {tab === 'home'
                    ? 'Tudo para acompanhar sua jornada, em um só lugar.'
                    : tab === 'profile'
                      ? 'Sua identidade, do seu jeito.'
                      : tab === 'settings'
                        ? 'Gerencie seu perfil e suas preferências de atendimento.'
                        : 'Seus vínculos e solicitações, organizados aqui.'}
                </Text>
              </>
            ) : null}
            <View style={{ gap: 16 }}>{children}</View>
          </View>
        </ScrollView>
      </View>
      {profile?.role === 'student' ? (
        <MinimizedWorkoutBar profileId={profile.id} disabled={disabled} />
      ) : null}
      {!desktop && !editorMode ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {tabs.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: tab === item.id, disabled }}
                disabled={disabled}
                onPress={() => {
                  onTab(item.id);
                  scroll.current?.scrollTo({ y: 0, animated: false });
                }}
                style={styles.tab}
              >
                <View style={[styles.tabIcon, tab === item.id && styles.selectedIcon]}>
                  <Ionicons
                    name={tab === item.id ? item.activeIcon : item.icon}
                    size={23}
                    color={tab === item.id ? '#D3FB69' : '#92968D'}
                  />
                  {item.id === 'relationships' && pendingCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.tabLabel, tab === item.id && { color: '#D3FB69' }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function DashboardHome() {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="home-outline" size={34} color="#D3FB69" />
      </View>
      <View style={styles.status}>
        <View style={styles.dot} />
        <Text style={styles.statusText}>EM PREPARAÇÃO</Text>
      </View>
      <Text style={styles.emptyTitle}>Aguardando configuração</Text>
      <Text variant="bodyMuted" style={styles.emptyDescription}>
        Estamos preparando seu início. Em breve, seus treinos e sua rotina estarão por aqui.
      </Text>
      <View style={styles.emptyFooter}>
        <Ionicons name="time-outline" size={16} color="#91968B" />
        <Text style={styles.footerText}>Seu próximo passo começa aqui.</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10120F' },
  topbar: {
    borderBottomWidth: 1,
    borderBottomColor: '#252923',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  topbarInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#D3FB69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { fontSize: 27, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -1.5 },
  identity: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  role: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30372A',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  roleText: { fontSize: 11, color: '#C2C9B9' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D3FB69' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2A3024',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#D3FB69', fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: '#A7B193', fontFamily: 'Manrope_600SemiBold' },
  title: {
    marginTop: 9,
    fontSize: 28,
    lineHeight: 36,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -1,
  },
  bottomBar: {
    backgroundColor: '#171A15',
    borderTopWidth: 1,
    borderTopColor: '#2B3025',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  tabs: { flexDirection: 'row', width: '100%', maxWidth: 720, alignSelf: 'center' },
  tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabIcon: {
    width: 60,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: { backgroundColor: '#2A3420' },
  tabLabel: { fontSize: 10, color: '#92968D', fontFamily: 'Manrope_600SemiBold' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 6,
    backgroundColor: '#D3FB69',
    borderRadius: 9,
    minWidth: 16,
    paddingHorizontal: 3,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, color: '#111' },
  emptyCard: {
    backgroundColor: '#191E16',
    borderWidth: 1,
    borderColor: '#303A27',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 22,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: '#2C3721',
    borderWidth: 1,
    borderColor: '#455531',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 26,
  },
  status: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#252E1E',
    marginBottom: 16,
  },
  statusText: { fontSize: 9, letterSpacing: 1.2, color: '#C5E09C' },
  emptyTitle: {
    fontSize: 21,
    lineHeight: 29,
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 22,
    maxWidth: 330,
    marginTop: 12,
  },
  emptyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#2C3426',
    marginTop: 32,
    paddingTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  footerText: { fontSize: 10, color: '#91968B' },
});
