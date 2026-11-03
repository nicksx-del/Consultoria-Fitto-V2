import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import type { Profile, Relationship } from '@/features/relationships/api';
export function NutritionDashboard({
  profile,
  links,
  onProfileUpdated,
}: {
  profile: Profile;
  links: Relationship[];
  onProfileUpdated?: (profile: Profile) => void;
}) {
  const router = useRouter(),
    professional = profile.role === 'professional';
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  async function enable() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('enable_nutrition', { profile_id: profile.id });
      if (error)
        throw new Error(
          error.code === 'P0001' ? error.message : 'Não foi possível ativar a área de nutrição.',
        );
      onProfileUpdated?.(data as Profile);
      setConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const eligible = links.filter(
    (link) =>
      link.status === 'active' && (professional || link.specialties.includes('Nutricionista')),
  );
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          gap: 12,
          padding: 22,
          borderRadius: 26,
          backgroundColor: '#24331C',
          borderWidth: 1,
          borderColor: '#405533',
        }}
      >
        <Ionicons name="restaurant-outline" size={28} color="#C0F568" />
        <Text variant="caption" color="#C0F568">
          NUTRIÇÃO · FITTO
        </Text>
        <Text style={{ fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 }}>
          Alimentação
        </Text>
        <Text variant="caption">
          {professional
            ? 'Planeje as refeições de cada aluno e acompanhe o dia a dia.'
            : 'Consulte seu plano e registre as refeições do dia.'}
        </Text>
      </View>
      {professional && !profile.specialties.includes('Nutricionista') ? (
        <View style={{ padding: 18, gap: 10, borderRadius: 18, backgroundColor: '#202D19' }}>
          <Text variant="title">Perfil de nutrição</Text>
          <Text variant="caption">
            Ative a especialidade Nutricionista neste perfil para montar planos alimentares. A
            especialidade Treinador e seus vínculos serão mantidos.
          </Text>
          {error ? (
            <Text accessibilityRole="alert" color="#FFB87A">
              {error}
            </Text>
          ) : null}
          {confirm ? (
            <>
              <Text>
                Ative somente se Nutricionista corresponde à sua área de atuação. A especialidade
                ficará visível no seu perfil.
              </Text>
              <Button
                title="Adicionar especialidade Nutricionista"
                loading={busy}
                onPress={() => void enable()}
              />
              <Button
                title="Cancelar ativação"
                variant="ghost"
                disabled={busy}
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <Button
              title="Ativar área de nutrição"
              variant="outline"
              onPress={() => setConfirm(true)}
            />
          )}
        </View>
      ) : eligible.length ? (
        eligible.map((link) => (
          <View
            key={link.id}
            style={{
              padding: 18,
              gap: 12,
              borderRadius: 20,
              backgroundColor: '#202D19',
              borderWidth: 1,
              borderColor: '#3C5130',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 15,
                  backgroundColor: '#34482A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text color="#C0F568">{link.name.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <Text variant="title">{professional ? link.name : 'Meu plano alimentar'}</Text>
            </View>
            <Text variant="caption">
              {professional ? `@${link.username}` : `Acompanhamento com ${link.name}`}
            </Text>
            <Button
              title={professional ? 'Abrir alimentação do aluno' : 'Ver refeições de hoje'}
              onPress={() =>
                router.push({
                  pathname: '/alimentacao',
                  params: { profile: profile.id, link: link.id },
                })
              }
            />
          </View>
        ))
      ) : (
        <View style={{ padding: 20, gap: 10, borderRadius: 18, backgroundColor: '#182215' }}>
          <Text variant="title">
            {professional ? 'Vincule um aluno para começar' : 'Conecte-se ao seu nutricionista'}
          </Text>
          <Text variant="caption">
            {professional
              ? 'Gere um convite na aba Alunos. Depois da aprovação, monte o plano alimentar.'
              : 'Use o convite do profissional para receber o plano alimentar.'}
          </Text>
          <Button
            title={professional ? 'Ir para Alunos' : 'Abrir acompanhamento'}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/painel',
                params: { profile: profile.id, tab: 'relationships' },
              })
            }
          />
        </View>
      )}
    </View>
  );
}
