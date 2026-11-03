import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { FormScreen } from '@/features/auth/FormScreen';
import { AccountRolePicker } from '@/features/auth/AccountRolePicker';
import { AccountRole, registrationErrors } from '@/features/auth/registration';
import { authError, supabase } from '@/lib/supabase';
export default function RegisterScreen() {
  const router = useRouter(),
    params = useLocalSearchParams<{ role?: string }>();
  const { session, loading } = useAuth();
  const [role, setRole] = useState<AccountRole>(
    params.role === 'trainer' || params.role === 'professional' ? 'professional' : 'student',
  );
  const [step, setStep] = useState(0),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [sent, setSent] = useState(false),
    [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = registrationErrors(email, password, confirmation);
  if (!loading && session) return <Redirect href={{ pathname: '/perfil', params: { role } }} />;
  async function register() {
    if (busy || loading) return;
    setTouched({ email: true, password: true, confirmation: true });
    setMessage('');
    if (Object.values(errors).some(Boolean)) {
      setMessage('Revise os campos destacados para continuar.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: Linking.createURL('/contas'), data: { intended_role: role } },
      });
      if (error) throw error;
      setPassword('');
      setConfirmation('');
      setSent(true);
    } catch (e) {
      setMessage(authError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormScreen
      title={sent ? 'Confirme seu e-mail' : step === 0 ? 'Vamos começar' : 'Crie seu acesso'}
      subtitle={
        sent
          ? 'Falta confirmar o endereço para continuar.'
          : step === 0
            ? 'Como você pretende usar o Fitto?'
            : 'Use um e-mail que você acessa com frequência.'
      }
    >
      {!sent ? (
        <>
          <View style={{ gap: 8 }}>
            <Text variant="caption">
              Etapa {step + 1} de 2 · {step === 0 ? 'Seu objetivo' : 'Dados de acesso'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[0, 1].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 4,
                    backgroundColor: i <= step ? '#B7F34A' : '#35432C',
                  }}
                />
              ))}
            </View>
          </View>
          {step === 0 ? (
            <>
              <AccountRolePicker value={role} onChange={setRole} />
              <Text variant="caption">Você pode adicionar outro perfil na mesma conta depois.</Text>
              <Button title="Continuar" disabled={loading} onPress={() => setStep(1)} />
            </>
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
                <Text>{role === 'student' ? 'Perfil de aluno' : 'Perfil profissional'}</Text>
                <Button
                  title="Alterar"
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setStep(0)}
                />
              </View>
              <TextField
                label="Seu e-mail"
                placeholder="nome@exemplo.com"
                value={email}
                editable={!busy}
                onChangeText={(v) => {
                  setEmail(v);
                  setMessage('');
                }}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                error={touched.email ? errors.email : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                maxLength={254}
              />
              <TextField
                label="Crie uma senha"
                value={password}
                editable={!busy}
                onChangeText={setPassword}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                error={touched.password ? errors.password : undefined}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                helperText="Toque no olho para conferir o que digitou."
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={password.length >= 8 ? '#B7F34A' : '#A3AD99'}
                />
                <Text variant="caption">Pelo menos 8 caracteres</Text>
              </View>
              <TextField
                label="Repita a senha"
                value={confirmation}
                editable={!busy}
                onChangeText={setConfirmation}
                onBlur={() => setTouched((t) => ({ ...t, confirmation: true }))}
                error={touched.confirmation ? errors.confirmation : undefined}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => void register()}
              />
              {confirmation && password === confirmation ? (
                <Text variant="caption" color="#B7F34A">
                  ✓ As senhas coincidem
                </Text>
              ) : null}
              {message ? (
                <Text accessibilityRole="alert" color="#FF6B5A">
                  {message}
                </Text>
              ) : null}
              <Button
                title="Criar minha conta"
                onPress={() => void register()}
                loading={busy || loading}
              />
              <Text variant="caption">Depois, você completa seu perfil com nome e usuário.</Text>
            </>
          )}
        </>
      ) : (
        <View
          style={{
            gap: 16,
            padding: 18,
            borderRadius: 18,
            backgroundColor: '#191E16',
            borderColor: '#35432C',
            borderWidth: 1,
          }}
        >
          <Ionicons name="mail-unread-outline" size={36} color="#B7F34A" />
          <Text>Se o cadastro puder ser concluído, enviaremos um link para:</Text>
          <Text variant="title" selectable>
            {email.trim()}
          </Text>
          <Text>
            Abra a mensagem e toque no link de confirmação. Confira também a pasta de spam.
          </Text>
          <Button title="Já confirmei · entrar" onPress={() => router.replace('/entrar')} />
          <Button
            title="Corrigir meu e-mail"
            variant="ghost"
            onPress={() => {
              setSent(false);
              setTouched({});
            }}
          />
        </View>
      )}
      {!sent ? (
        <Button
          title="Já tenho conta · entrar"
          variant="ghost"
          disabled={busy}
          onPress={() => router.replace('/entrar')}
        />
      ) : null}
    </FormScreen>
  );
}
