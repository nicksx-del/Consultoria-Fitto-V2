import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceCard, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type UserRole = 'student' | 'trainer' | null;

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);

  const handleSelectStudent = () => {
    setSelectedRole('student');
    // TODO: Navegar para cadastro de Aluno
  };

  const handleSelectTrainer = () => {
    setSelectedRole('trainer');
    // TODO: Navegar para cadastro de Treinador
  };

  const handleNavigateToLogin = () => {
    router.push('/entrar');
  };

  return (
    <Screen style={styles.screen}>
      <View style={[styles.header, { marginTop: theme.spacing.xl }]}>
        <Text variant="heading" style={{ marginBottom: theme.spacing.sm }}>
          Você é?
        </Text>
        <Text variant="bodyMuted">
          Escolha como deseja acessar o Fitto para personalizar sua experiência.
        </Text>
      </View>

      <View
        style={[
          styles.cardsContainer,
          {
            marginVertical: theme.spacing.xl,
            rowGap: theme.spacing.md,
          },
        ]}
      >
        <ChoiceCard
          title="Aluno"
          description="Acesse seus treinos e dietas e acompanhe sua evolução de perto."
          selected={selectedRole === 'student'}
          onPress={handleSelectStudent}
          accessibilityLabel="Selecionar perfil Aluno"
        />

        <ChoiceCard
          title="Treinador"
          description="Gerencie alunos, prescreva treinos e dietas e controle sua consultoria."
          selected={selectedRole === 'trainer'}
          onPress={handleSelectTrainer}
          accessibilityLabel="Selecionar perfil Treinador"
        />
      </View>

      <View style={[styles.footer, { marginBottom: theme.spacing.lg }]}>
        <Pressable
          onPress={handleNavigateToLogin}
          accessibilityRole="button"
          accessibilityLabel="Já tenho conta. Entrar"
          style={{
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <Text variant="bodyMuted">
            Já tenho conta · <Text variant="link">Entrar</Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
  },
  header: {
    width: '100%',
  },
  cardsContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
});
