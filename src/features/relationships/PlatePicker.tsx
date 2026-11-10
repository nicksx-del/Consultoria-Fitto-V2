import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Screen, Text, TextField } from '@/components/ui';
import { olympicPlates, plateTotal } from './plateMath';

export function PlatePicker({
  title,
  onClose,
  onApply,
}: {
  title?: string;
  onClose: () => void;
  onApply: (kg: number) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [paired, setPaired] = useState(true),
    [bar, setBar] = useState('20');
  const parsedBar = Number(bar.replace(',', '.'));
  const valid =
    !paired ||
    (bar.trim() !== '' && Number.isFinite(parsedBar) && parsedBar >= 0 && parsedBar <= 100);
  const total = plateTotal(counts, valid ? parsedBar : 0, paired);
  const side = plateTotal(counts, 0, false);
  function adjust(kg: number, delta: number) {
    setCounts((c) => ({ ...c, [kg]: Math.max(0, Math.min(20, (c[kg] || 0) + delta)) }));
  }
  const selected = olympicPlates.filter((p) => counts[p.kg]);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <Screen
        style={{
          gap: 12,
          flex: 1,
          paddingVertical: 16,
          maxWidth: 600,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Calculadora de anilhas</Text>
            {title ? <Text variant="caption">{title}</Text> : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar ao registro"
            onPress={onClose}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#26351F',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={22} color="#C9F78C" />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Barra · pares"
              variant={paired ? 'primary' : 'outline'}
              onPress={() => setPaired(true)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Anilhas avulsas"
              variant={!paired ? 'primary' : 'outline'}
              onPress={() => setPaired(false)}
            />
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="caption">
            {paired
              ? 'Cada toque adiciona uma anilha em cada lado. O total inclui a barra.'
              : 'Cada toque adiciona uma única anilha. Sem barra e sem duplicar o peso.'}
          </Text>
          {paired ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[20, 15, 10, 0].map((kg) => (
                  <Button
                    key={kg}
                    title={`${kg} kg`}
                    variant={bar === String(kg) ? 'primary' : 'outline'}
                    onPress={() => setBar(String(kg))}
                  />
                ))}
              </View>
              <TextField
                label="Peso da barra (kg)"
                keyboardType="decimal-pad"
                value={bar}
                onChangeText={setBar}
                maxLength={6}
              />
            </>
          ) : null}
          <View style={{ padding: 12, gap: 6, borderRadius: 14, backgroundColor: '#26371C' }}>
            <Text variant="caption">
              {paired
                ? `${side.toLocaleString('pt-BR')} kg de anilhas por lado`
                : 'Soma das anilhas selecionadas'}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#C0F568' }}>
              {valid ? total.toLocaleString('pt-BR') : '—'} kg
            </Text>
            {selected.length ? (
              <View style={{ height: 38, justifyContent: 'center' }}>
                <View style={{ height: 9, backgroundColor: '#8A9585', borderRadius: 4 }} />
                <View
                  style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    flexDirection: 'row',
                    gap: 5,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {selected.length
                    ? selected.slice(0, 6).map((p) => (
                        <View
                          key={p.kg}
                          style={{
                            height: p.kg >= 10 ? 36 : 28,
                            minWidth: 30,
                            paddingHorizontal: 3,
                            backgroundColor: p.color,
                            borderRadius: 5,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: p.ink }}>
                            {p.kg}
                          </Text>
                          <Text style={{ fontSize: 10, color: p.ink }}>×{counts[p.kg]}</Text>
                        </View>
                      ))
                    : null}
                </View>
              </View>
            ) : null}
            {selected.length ? (
              <Text variant="caption">
                {paired ? 'Por lado: ' : ''}
                {selected
                  .map((p) => `${counts[p.kg]} × ${p.kg.toLocaleString('pt-BR')} kg`)
                  .join(' + ')}
              </Text>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {olympicPlates.map((p) => (
              <View
                key={p.kg}
                style={{
                  width: '22%',
                  flexGrow: 1,
                  padding: 4,
                  borderRadius: 14,
                  backgroundColor: '#202B1A',
                  alignItems: 'center',
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ${paired ? 'par de anilhas' : 'anilha'} de ${p.kg} kg`}
                  onPress={() => adjust(p.kg, 1)}
                  style={{
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: p.color,
                      borderWidth: 3,
                      borderColor: '#FFFFFF22',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: p.ink, fontWeight: '700', fontSize: 16 }}>
                      {p.kg.toLocaleString('pt-BR')}
                    </Text>
                    <View
                      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#14200F' }}
                    />
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${paired ? 'par de anilhas' : 'anilha'} de ${p.kg} kg`}
                    disabled={!counts[p.kg]}
                    onPress={() => adjust(p.kg, -1)}
                    style={{
                      width: 36,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: counts[p.kg] ? 1 : 0.3,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>−</Text>
                  </Pressable>
                  <Text>{counts[p.kg] || 0}</Text>
                </View>
              </View>
            ))}
          </View>
          <Button title="Limpar anilhas" variant="ghost" onPress={() => setCounts({})} />
          <Text variant="caption">O total exclui presilhas.</Text>
        </ScrollView>
        {!valid ? <Text color="#FFB87A">Informe uma barra entre 0 e 100 kg.</Text> : null}
        <Button
          title={`Usar ${total.toLocaleString('pt-BR')} kg no registro`}
          disabled={!valid || total > 2000}
          onPress={() => {
            onApply(total);
            onClose();
          }}
        />
      </Screen>
    </Modal>
  );
}
