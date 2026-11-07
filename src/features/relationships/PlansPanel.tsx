import React, { useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';

const accent = '#C0F568';
const tiers = [
  {
    capacity: 10,
    name: 'Essencial',
    description: 'Seu atendimento organizado desde os primeiros alunos.',
  },
  {
    capacity: 25,
    name: 'Crescimento',
    description: 'Mais espaço para os alunos que estão chegando.',
  },
  {
    capacity: 50,
    name: 'Profissional',
    description: 'Uma carteira maior, com acompanhamento individual.',
  },
  {
    capacity: 100,
    name: 'Escala',
    description: 'Capacidade para uma rotina de atendimento consolidada.',
  },
  {
    capacity: 0,
    name: 'Personalizado',
    description: 'Uma capacidade pensada para o tamanho da sua operação.',
  },
] as const;

export function PlanUpgradeCard({
  count,
  limit,
  onPress,
}: {
  count: number;
  limit: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Melhorar meu plano"
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 20,
        gap: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#536D32',
        backgroundColor: pressed ? '#304422' : '#233219',
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="sparkles-outline" color="#18200F" size={24} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text variant="caption" color={accent}>
          SEU PRÓXIMO PASSO
        </Text>
        <Text variant="title">Seu atendimento está crescendo?</Text>
        <Text variant="caption">Encontre espaço para seus próximos alunos.</Text>
        <View style={{ gap: 6, marginVertical: 5 }}>
          <View
            style={{ height: 4, borderRadius: 4, backgroundColor: '#415432', overflow: 'hidden' }}
          >
            <View
              style={{
                width: (Math.min(1, count / Math.max(1, limit)) * 100 + '%') as `${number}%`,
                height: 4,
                backgroundColor: accent,
              }}
            />
          </View>
          <Text variant="caption">
            {count} de {limit} {limit === 1 ? 'vaga utilizada' : 'vagas utilizadas'}
          </Text>
        </View>
        <Text color={accent} style={{ fontWeight: '700' }}>
          Melhorar meu plano →
        </Text>
      </View>
    </Pressable>
  );
}

export function PlansPanel({
  count,
  limit,
  pending,
  onBack,
  onNavigate,
}: {
  count: number;
  limit: number;
  pending: number;
  onBack: () => void;
  onNavigate: () => void;
}) {
  const [quantity, setQuantity] = useState(String(Math.max(count, 1)));
  const [step, setStep] = useState<'quantity' | 'plans'>('quantity');
  const [selected, setSelected] = useState<number | null>(null);
  const [compare, setCompare] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const wide = useWindowDimensions().width >= 900;
  const valid = /^\d{1,5}$/.test(quantity) && Number(quantity) > 0;
  const required = Math.max(count + pending, valid ? Number(quantity) : 0);
  const recommended = tiers.find((tier) => tier.capacity >= required)?.capacity || 0;
  const chosen = selected === null ? recommended : selected;
  const recommendation = tiers.find((tier) => tier.capacity === recommended)!;
  const choice = tiers.find((tier) => tier.capacity === chosen)!;
  const suitable = chosen === 0 || chosen >= required;
  const orderedTiers = compare ? tiers : [recommendation];
  const margin = chosen ? Math.max(0, chosen - required) : null;
  function update(value: string) {
    setQuantity(value);
    setSelected(null);
    setConfirmed(false);
  }
  return (
    <View style={{ gap: 22 }}>
      <Button
        title={step === 'quantity' ? 'Voltar ao painel' : 'Alterar quantidade de alunos'}
        variant="ghost"
        onPress={() => {
          if (step === 'quantity') onBack();
          else {
            setStep('quantity');
            onNavigate();
          }
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {['Seu atendimento', 'Seu plano'].map((label, index) => (
          <View key={label} style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 3,
                borderRadius: 3,
                backgroundColor: index === 0 || step === 'plans' ? accent : '#34402B',
              }}
            />
            <Text
              variant="caption"
              color={
                (index === 0 && step === 'quantity') || (index === 1 && step === 'plans')
                  ? accent
                  : '#A8B09F'
              }
            >
              {index + 1}. {label}
            </Text>
          </View>
        ))}
      </View>
      {step === 'quantity' ? (
        <View
          style={{
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            padding: wide ? 40 : 24,
            gap: 24,
            borderRadius: 28,
            backgroundColor: '#191F16',
            borderWidth: 1,
            borderColor: '#405532',
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 22,
              backgroundColor: '#304423',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="people-outline" size={30} color={accent} />
          </View>
          <View style={{ gap: 10 }}>
            <Text variant="caption" color={accent}>
              VAMOS CONHECER SEU ATENDIMENTO
            </Text>
            <Text
              style={{
                fontSize: wide ? 36 : 29,
                lineHeight: wide ? 44 : 36,
                fontWeight: '700',
                letterSpacing: -1,
              }}
            >
              Quantos alunos você tem?
            </Text>
            <Text variant="bodyMuted">
              Informe o tamanho da sua carteira. Encontramos a capacidade que acompanha você.
            </Text>
          </View>
          <View
            style={{
              padding: 18,
              borderRadius: 22,
              backgroundColor: '#11170E',
              borderWidth: 1,
              borderColor: '#3D4E30',
              gap: 6,
            }}
          >
            <Text variant="caption" style={{ textAlign: 'center' }}>
              MEUS ALUNOS
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Diminuir quantidade de alunos"
                disabled={!valid || Number(quantity) <= 1}
                onPress={() => update(String(Number(quantity) - 1))}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#28351F',
                  opacity: !valid || Number(quantity) <= 1 ? 0.35 : 1,
                }}
              >
                <Ionicons name="remove" size={22} color={accent} />
              </Pressable>
              <TextInput
                accessibilityLabel="Quantidade de alunos"
                value={quantity}
                onChangeText={update}
                keyboardType="number-pad"
                maxLength={5}
                selectTextOnFocus
                onSubmitEditing={() => {
                  if (valid) {
                    setStep('plans');
                    onNavigate();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'center',
                  fontSize: wide ? 68 : 54,
                  lineHeight: 82,
                  fontWeight: '700',
                  color: '#F2F6ED',
                  paddingVertical: 2,
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aumentar quantidade de alunos"
                disabled={!valid || Number(quantity) >= 99999}
                onPress={() => update(String(Number(quantity) + 1))}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#28351F',
                  opacity: !valid || Number(quantity) >= 99999 ? 0.35 : 1,
                }}
              >
                <Ionicons name="add" size={22} color={accent} />
              </Pressable>
            </View>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Toque no número para editar
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[10, 25, 50, 100].map((amount) => (
              <Pressable
                key={amount}
                accessibilityRole="button"
                accessibilityLabel={amount + ' alunos'}
                accessibilityState={{ selected: quantity === String(amount) }}
                onPress={() => update(String(amount))}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 19,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: quantity === String(amount) ? accent : '#405532',
                  backgroundColor: quantity === String(amount) ? '#344C24' : '#202C19',
                }}
              >
                <Text color={quantity === String(amount) ? accent : '#DCE4D5'}>{amount}</Text>
              </Pressable>
            ))}
          </View>
          {!valid ? (
            <Text accessibilityRole="alert" color="#FFB87A">
              Informe de 1 a 99.999 alunos.
            </Text>
          ) : null}
          <Button
            title="Encontrar meu plano →"
            disabled={!valid}
            onPress={() => {
              setStep('plans');
              onNavigate();
              setSelected(null);
              setConfirmed(false);
            }}
          />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Sem compromisso. Você escolhe depois de comparar.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Text variant="caption" color={accent}>
              SUA RECOMENDAÇÃO FITTO
            </Text>
            <Text style={{ fontSize: wide ? 34 : 28, fontWeight: '700', letterSpacing: -0.8 }}>
              Um plano do seu tamanho.
            </Text>
            <Text variant="bodyMuted">
              Para {Number(quantity)} alunos, recomendamos o plano {recommendation.name}.
            </Text>
            {required > Number(quantity) ? (
              <Text variant="caption">
                Consideramos também seus {count} alunos ativos e {pending} pedidos pendentes,
                totalizando {required} vagas necessárias.
              </Text>
            ) : null}
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Escolha seu plano"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}
          >
            {orderedTiers.map((tier) => {
              const isRecommended = tier.capacity === recommended;
              const isChosen = tier.capacity === chosen;
              return (
                <Pressable
                  key={tier.capacity}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    tier.name +
                    (tier.capacity
                      ? ', até ' + tier.capacity + ' alunos'
                      : ', capacidade personalizada') +
                    (isRecommended ? ', recomendado' : '')
                  }
                  accessibilityState={{ checked: isChosen }}
                  onPress={() => {
                    setSelected(tier.capacity);
                    setConfirmed(false);
                  }}
                  style={{
                    width: wide && compare ? '48%' : '100%',
                    padding: isRecommended ? (wide ? 32 : 24) : 22,
                    gap: 14,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: isChosen ? accent : '#35432C',
                    backgroundColor: isRecommended ? '#263B1B' : isChosen ? '#263A1C' : '#191E16',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <Text variant="caption" color={accent} style={{ flex: 1 }}>
                      {isRecommended
                        ? 'RECOMENDADO PARA SEUS ' + required + ' ALUNOS'
                        : 'PLANO FITTO'}
                    </Text>
                    <Ionicons
                      name={isChosen ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={isChosen ? accent : '#7F8D74'}
                    />
                  </View>
                  <Text variant="title">{tier.name}</Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Text
                      style={{ fontSize: 40, lineHeight: 48, fontWeight: '700', letterSpacing: -1 }}
                    >
                      {tier.capacity || '100+'}
                    </Text>
                    <Text variant="caption" style={{ flexShrink: 1 }}>
                      {tier.capacity ? 'alunos · capacidade total' : 'alunos · sob medida'}
                    </Text>
                  </View>
                  <Text variant="caption">{tier.description}</Text>
                  {isRecommended ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 110, gap: 4 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700' }}>{required}</Text>
                        <Text variant="caption">alunos considerados</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 110, gap: 4 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700' }} color={accent}>
                          {tier.capacity ? tier.capacity - required : 'Sob medida'}
                        </Text>
                        <Text variant="caption">
                          {tier.capacity ? 'vagas para crescer' : 'capacidade flexível'}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#3A4B30', paddingTop: 12 }}>
                    <Text color={isChosen ? accent : '#CDD7C4'}>
                      {isChosen ? 'Selecionado' : 'Comparar esta opção'} →
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Button
            title={compare ? 'Mostrar apenas a recomendação' : 'Comparar todos os planos'}
            variant="outline"
            onPress={() => setCompare((value) => !value)}
          />
          <View
            style={{
              padding: 22,
              gap: 12,
              borderRadius: 24,
              backgroundColor: '#202D19',
              borderWidth: 1,
              borderColor: '#405532',
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={22} color={accent} />
              <Text variant="caption" color={accent}>
                RESUMO DA SUA ESCOLHA
              </Text>
            </View>
            <Text variant="title">
              {choice.name}
              {chosen ? ' · até ' + chosen + ' alunos' : ' · capacidade personalizada'}
            </Text>
            <Text variant="caption">
              {chosen
                ? margin + ' vagas de margem para novos acompanhamentos.'
                : 'Uma proposta de capacidade para o tamanho do seu atendimento.'}
            </Text>
            {!suitable ? (
              <Text accessibilityRole="alert" color="#FFB87A">
                Essa opção é pequena para seu atendimento. Escolha uma capacidade maior.
              </Text>
            ) : null}
            <Button
              title="Simular este plano"
              disabled={!suitable}
              onPress={() => setConfirmed(true)}
            />
            {confirmed ? (
              <Text accessibilityLiveRegion="polite" color={accent}>
                Plano {choice.name} simulado para seu atendimento. Você pode continuar comparando as
                opções.
              </Text>
            ) : null}
            <Text variant="caption">
              Valores e contratação em breve. Seu limite atual continua em {limit}{' '}
              {limit === 1 ? 'aluno' : 'alunos'}.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
