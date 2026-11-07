import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';

const tiers = [
  { capacity: 10, name: 'Essencial', description: 'Para organizar os primeiros acompanhamentos.' },
  { capacity: 25, name: 'Crescimento', description: 'Para uma carteira de alunos em expansão.' },
  { capacity: 50, name: 'Profissional', description: 'Para uma rotina com mais acompanhamentos.' },
  { capacity: 100, name: 'Escala', description: 'Para uma operação com uma carteira maior.' },
] as const;

export function PlansPanel({
  count,
  limit,
  pending,
  onBack,
}: {
  count: number;
  limit: number;
  pending: number;
  onBack: () => void;
}) {
  const [quantity, setQuantity] = useState(String(Math.max(count + pending, 1)));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const wide = useWindowDimensions().width >= 1100;
  const valid = /^\d{1,5}$/.test(quantity) && Number(quantity) > 0;
  const required = Math.max(count + pending, valid ? Number(quantity) : 0);
  const recommended = tiers.find((tier) => tier.capacity >= required)?.capacity || 0;
  const chosen = selected === null ? recommended : selected;
  const suitable = chosen === 0 || chosen >= required;
  function update(value: string) {
    setQuantity(value);
    setSelected(null);
    setConfirmed(false);
  }
  return (
    <View style={{ gap: 20 }}>
      <Button title="Voltar para Alunos" variant="ghost" onPress={onBack} />
      <View
        style={{
          padding: 24,
          gap: 12,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#435C2D',
          backgroundColor: '#22321A',
        }}
      >
        <Ionicons name="layers-outline" color="#C0F568" size={30} />
        <Text variant="caption" color="#C0F568">
          PLANOS FITTO
        </Text>
        <Text variant="heading">Espaço para crescer com seus alunos</Text>
        <Text variant="bodyMuted">
          Encontre uma capacidade que acompanhe o tamanho do seu atendimento.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
          <View>
            <Text variant="title">
              {count}/{limit}
            </Text>
            <Text variant="caption">Vagas utilizadas</Text>
          </View>
          <View>
            <Text variant="title">{Math.max(0, limit - count)}</Text>
            <Text variant="caption">Vagas disponíveis</Text>
          </View>
          <View>
            <Text variant="title">{pending}</Text>
            <Text variant="caption">Pedidos pendentes</Text>
          </View>
        </View>
      </View>
      <View style={{ gap: 12, padding: 20, backgroundColor: '#191E16', borderRadius: 20 }}>
        <Text variant="title">Quantos alunos você possui?</Text>
        <Text variant="caption">
          Inclua os alunos que deseja trazer para o Fitto. Considere também os próximos
          acompanhamentos.
        </Text>
        <TextField
          label="Quantidade de alunos"
          value={quantity}
          onChangeText={update}
          keyboardType="number-pad"
          maxLength={5}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[10, 25, 50, 100].map((amount) => (
            <Button
              key={amount}
              title={String(amount)}
              variant={quantity === String(amount) ? 'primary' : 'outline'}
              onPress={() => update(String(amount))}
            />
          ))}
        </View>
        {!valid ? (
          <Text accessibilityRole="alert" color="#FFB87A">
            Informe de 1 a 99.999 alunos.
          </Text>
        ) : (
          <Text accessibilityLiveRegion="polite" color="#C0F568">
            {recommended
              ? 'Nossa indicação é até ' + recommended + ' alunos.'
              : 'Seu atendimento pede uma capacidade personalizada.'}
          </Text>
        )}
        {count + pending > Number(quantity) && valid ? (
          <Text variant="caption">
            A recomendação considera seus {count} alunos ativos e {pending} pedidos pendentes.
          </Text>
        ) : null}
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Capacidade do plano"
        style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}
      >
        {[
          ...tiers,
          {
            capacity: 0,
            name: 'Personalizado',
            description: 'Para mais de 100 alunos e necessidades de capacidade específicas.',
          },
        ].map((tier) => (
          <Pressable
            key={tier.capacity}
            accessibilityRole="radio"
            accessibilityLabel={
              tier.name +
              (tier.capacity ? ', até ' + tier.capacity + ' alunos' : ', mais de 100 alunos')
            }
            accessibilityState={{ checked: chosen === tier.capacity, disabled: !valid }}
            disabled={!valid}
            onPress={() => {
              setSelected(tier.capacity);
              setConfirmed(false);
            }}
            style={{
              flex: wide ? 1 : undefined,
              minWidth: 0,
              padding: 16,
              gap: 10,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: chosen === tier.capacity ? '#C0F568' : '#35432C',
              backgroundColor: chosen === tier.capacity ? '#29391E' : '#191E16',
            }}
          >
            <Text variant="caption" color="#C0F568">
              {recommended === tier.capacity && valid
                ? 'RECOMENDADO'
                : chosen === tier.capacity
                  ? 'SELECIONADO'
                  : 'CAPACIDADE'}
            </Text>
            <Text variant="title">{tier.name}</Text>
            <Text>{tier.capacity ? 'Até ' + tier.capacity + ' alunos' : 'Mais de 100 alunos'}</Text>
            <Text variant="caption">{tier.description}</Text>
            <Ionicons
              name={chosen === tier.capacity ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color="#C0F568"
            />
          </Pressable>
        ))}
      </View>
      <View
        style={{
          padding: 20,
          gap: 12,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: '#35432C',
          backgroundColor: '#191E16',
        }}
      >
        <Text variant="title">Sua escolha</Text>
        <Text>
          {chosen ? 'Capacidade de até ' + chosen + ' alunos' : 'Capacidade personalizada'}
        </Text>
        {chosen > 0 ? (
          <Text variant="caption">
            Após acomodar os alunos informados e os pedidos atuais, restariam{' '}
            {Math.max(0, chosen - required)} vagas.
          </Text>
        ) : null}
        {!suitable && valid ? (
          <Text accessibilityRole="alert" color="#FFB87A">
            Essa capacidade é menor que a quantidade necessária. Escolha um plano maior.
          </Text>
        ) : null}
        <Text variant="caption">
          Os valores e a contratação serão disponibilizados em breve. Esta simulação mantém o limite
          atual de {limit} {limit === 1 ? 'aluno' : 'alunos'}.
        </Text>
        <Button
          title="Simular minha escolha"
          disabled={!valid || !suitable}
          onPress={() => setConfirmed(true)}
        />
        {confirmed ? (
          <Text accessibilityLiveRegion="polite" color="#C0F568">
            Simulação pronta.{' '}
            {chosen
              ? 'A capacidade escolhida atende até ' + chosen + ' alunos.'
              : 'Sua quantidade será considerada na proposta personalizada.'}
          </Text>
        ) : null}
      </View>
      <Text variant="caption">
        Seu perfil de teste e vínculos encerrados não ocupam vagas. Pedidos pendentes só ocupam vaga
        após a aprovação.
      </Text>
    </View>
  );
}
