export type AccountRole = 'student' | 'professional';
export function registrationErrors(email: string, password: string, confirmation: string) {
  return {
    email: !/^\S+@\S+\.\S+$/.test(email.trim())
      ? 'Digite um e-mail válido, como nome@exemplo.com.'
      : '',
    password: password.length < 8 ? 'Use pelo menos 8 caracteres.' : '',
    confirmation:
      password !== confirmation
        ? 'As senhas precisam ser iguais.'
        : !confirmation
          ? 'Repita a senha para confirmar.'
          : '',
  };
}
export function suggestedUsername(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}
