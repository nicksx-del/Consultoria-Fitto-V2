import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type UserRole = 'student' | 'trainer' | null;

// ── Card de perfil ────────────────────────────────────────────────────────────
interface RoleCardProps {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  reduceMotion: boolean;
  accent: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accessibilityLabel: string;
  accessibilityHint: string;
}

function RoleCard({
  title,
  subtitle,
  selected,
  onPress,
  iconName,
  reduceMotion,
  accent,
  surface,
  border,
  text,
  textMuted,
  accessibilityLabel,
  accessibilityHint,
}: RoleCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(selected ? 1.02 : 1);
      glowOpacity.setValue(selected ? 1 : 0);
      return;
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: selected ? 1.02 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }),
      Animated.timing(glowOpacity, {
        toValue: selected ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selected, reduceMotion]);

  const handlePressIn = () => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  const handlePressOut = () => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: selected ? 1.02 : 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: selected }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Animated.View style={[cardStyles.glowBorder, { borderColor: accent, opacity: glowOpacity }]} />
        <View style={[cardStyles.card, { backgroundColor: surface, borderColor: selected ? accent : border }]}>
          {selected && <View style={[cardStyles.accentBar, { backgroundColor: accent }]} />}
          <View style={cardStyles.content}>
            <View style={[cardStyles.iconContainer, {
              backgroundColor: selected ? accent + '22' : border + '88',
              borderColor: selected ? accent + '44' : 'transparent',
            }]}>
              <Ionicons name={iconName} size={26} color={selected ? accent : textMuted} />
            </View>
            <View style={cardStyles.textBlock}>
              <Text variant="title" style={{ color: selected ? accent : text }}>{title}</Text>
              <Text variant="bodyMuted" style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: textMuted }}>
                {subtitle}
              </Text>
            </View>
            <View style={[cardStyles.radio, { borderColor: selected ? accent : border }]}>
              {selected && <View style={[cardStyles.radioInner, { backgroundColor: accent }]} />}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function RoleSelectionScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);

      if (enabled) {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        logoScale.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(logoPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ]),
      );
      pulse.start();
    });
  }, []);

  const handleSelectStudent = () => setSelectedRole('student');
  const handleSelectTrainer = () => setSelectedRole('trainer');
  const handleNavigateToLogin = () => router.push('/entrar');

  return (
    <Screen scrollable contentContainerStyle={styles.screenContent}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* LOGO */}
        <View style={styles.brandSection}>
          <Animated.View style={[styles.logoRing, { borderColor: theme.colors.accent + '44', transform: [{ scale: logoPulse }] }]}>
            <Animated.View style={[styles.logoInner, { backgroundColor: theme.colors.accent, transform: [{ scale: logoScale }] }]}>
              <Text style={{ fontSize: 28, fontFamily: theme.fontFamily.extraBold, color: theme.colors.onAccent, letterSpacing: -1 }}>F</Text>
            </Animated.View>
          </Animated.View>
          <Text style={{ fontSize: 13, fontFamily: theme.fontFamily.semiBold, color: theme.colors.accent, letterSpacing: 4, marginTop: theme.spacing.md, textTransform: 'uppercase' }}>
            Fitto
          </Text>
        </View>

        {/* HEADLINE */}
        <View style={styles.headlineSection}>
          <Text variant="heading" style={{ marginBottom: theme.spacing.xs, textAlign: 'center', lineHeight: 40 }}>
            Como vai usar{' '}
            <Text variant="heading" style={{ color: theme.colors.accent }}>o app?</Text>
          </Text>
          <Text variant="bodyMuted" style={{ textAlign: 'center', lineHeight: 22, paddingHorizontal: theme.spacing.lg }}>
            Escolha seu perfil para começar.
          </Text>
        </View>

        {/* CARDS */}
        <View
          style={[styles.cardsSection, { rowGap: theme.spacing.md }]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Selecione seu perfil"
        >
          <RoleCard
            title="Aluno"
            subtitle="Acesse seus treinos e acompanhe sua evolução."
            selected={selectedRole === 'student'}
            onPress={handleSelectStudent}
            iconName="barbell-outline"
            reduceMotion={reduceMotion}
            accessibilityLabel="Aluno"
            accessibilityHint={selectedRole === 'student' ? 'Selecionado' : 'Toque para selecionar o perfil Aluno'}
            accent={theme.colors.accent}
            surface={theme.colors.surface}
            border={theme.colors.border}
            text={theme.colors.text}
            textMuted={theme.colors.textMuted}
          />
          <RoleCard
            title="Treinador"
            subtitle="Gerencie alunos e prescreva treinos e dietas."
            selected={selectedRole === 'trainer'}
            onPress={handleSelectTrainer}
            iconName="clipboard-outline"
            reduceMotion={reduceMotion}
            accessibilityLabel="Treinador"
            accessibilityHint={selectedRole === 'trainer' ? 'Selecionado' : 'Toque para selecionar o perfil Treinador'}
            accent={theme.colors.accent}
            surface={theme.colors.surface}
            border={theme.colors.border}
            text={theme.colors.text}
            textMuted={theme.colors.textMuted}
          />
        </View>

        {/* CTA */}
        <View style={styles.footerSection}>
          <Pressable
            onPress={() => { /* TODO: navegar conforme perfil */ }}
            disabled={!selectedRole}
            accessibilityRole="button"
            accessibilityLabel={selectedRole ? 'Continuar' : 'Selecione um perfil para continuar'}
            accessibilityState={{ disabled: !selectedRole }}
            style={({ pressed }) => [
              styles.ctaButton,
              {
                backgroundColor: selectedRole ? theme.colors.accent : theme.colors.surface,
                borderColor: selectedRole ? 'transparent' : theme.colors.border,
                borderWidth: selectedRole ? 0 : 1,
                opacity: pressed && !!selectedRole ? 0.85 : 1,
              },
            ]}
          >
            <Text variant="button" style={{ color: selectedRole ? theme.colors.onAccent : theme.colors.textMuted }}>
              {selectedRole ? 'Continuar' : 'Selecione um perfil'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleNavigateToLogin}
            accessibilityRole="link"
            accessibilityLabel="Entrar com uma conta existente"
            style={{ paddingVertical: theme.spacing.sm, marginTop: theme.spacing.xs }}
          >
            <Text variant="bodyMuted" style={{ textAlign: 'center' }}>
              Ja tenho conta <Text variant="link">. Entrar</Text>
            </Text>
          </Pressable>
        </View>

      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { flexGrow: 1, justifyContent: 'space-between' },
  inner: { flex: 1, justifyContent: 'space-between', paddingVertical: 32 },
  brandSection: { alignItems: 'center', marginTop: 8 },
  logoRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  headlineSection: { alignItems: 'center', paddingHorizontal: 8 },
  cardsSection: { width: '100%' },
  footerSection: { alignItems: 'center', gap: 4 },
  ctaButton: { width: '100%', height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

const cardStyles = StyleSheet.create({
  glowBorder: { position: 'absolute', inset: -2, borderRadius: 16, borderWidth: 1, zIndex: 0 },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', zIndex: 1 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  content: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingLeft: 20, gap: 14 },
  iconContainer: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textBlock: { flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});
