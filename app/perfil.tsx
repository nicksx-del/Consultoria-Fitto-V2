import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { FormScreen } from '@/features/auth/FormScreen';
import { ProfileSetupForm } from '@/features/auth/ProfileSetupForm';
import { authError, supabase } from '@/lib/supabase';
export default function ProfileScreen() {
  const { session, loading } = useAuth(),
    router = useRouter(),
    params = useLocalSearchParams<{ role?: string }>();
  if (loading)
    return (
      <FormScreen title="Preparando seu perfil" subtitle="Aguarde um instante.">
        <Text>Verificando seu acesso…</Text>
      </FormScreen>
    );
  if (!session) return <Redirect href="/entrar" />;
  const intended = params.role || session.user.user_metadata?.intended_role;
  return (
    <FormScreen
      title="Deixe o perfil com a sua cara"
      subtitle="Preencha o essencial para começar. O restante pode ficar para depois."
    >
      <ProfileSetupForm
        initialRole={
          intended === 'professional' || intended === 'trainer' ? 'professional' : 'student'
        }
        onBack={() => router.replace('/contas')}
        onSave={async (data) => {
          const { error } = await supabase
            .from('profiles')
            .insert({ ...data, user_id: session.user.id });
          if (error) throw new Error(authError(error));
          router.replace('/contas');
        }}
      />
    </FormScreen>
  );
}
