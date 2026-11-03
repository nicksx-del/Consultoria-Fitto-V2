import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const storage = {
  getItem: (key: string) =>
    Promise.resolve(typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(window.localStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? storage : undefined,
      persistSession: Platform.OS === 'web',
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);

export function authError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message =
    error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/invalid login/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered/i.test(message))
    return 'Este e-mail já possui uma conta. Entre para continuar.';
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(message))
    return 'O serviço de e-mail atingiu o limite de envios. Sua senha não está sendo rejeitada. Aguarde a liberação ou entre em contato com o suporte.';
  if (code === 'email_address_not_authorized')
    return 'O serviço de e-mail de testes ainda não permite enviar para este endereço. O envio precisa ser configurado pelo administrador.';
  if (code === 'over_request_rate_limit' || /rate limit|too many/i.test(message))
    return 'O serviço de acesso limitou novas solicitações temporariamente. Aguarde e tente novamente.';
  if (/weak_password|password.*(short|least)|should be at least/i.test(code + ' ' + message))
    return 'Use uma senha com pelo menos 8 caracteres.';
  if (/unique|duplicate|23505/i.test(message))
    return 'Este nome de usuário ou tipo de perfil já está em uso.';
  if (/fetch|network/i.test(message))
    return 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
}
