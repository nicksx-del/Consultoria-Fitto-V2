import React, { useEffect, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { canPlayRestSound, playRestAlert, readRestAlerts, setRestAlerts } from './restAlerts';

export function RestTimer({
  until,
  now,
  onChange,
}: {
  until: string | null;
  now: number;
  onChange: (until: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [alerts, updateAlerts] = useState(readRestAlerts),
    [alertError, setAlertError] = useState('');
  const [openedAt] = useState(() => Date.now());
  const notified = useRef(!until || Date.parse(until) <= openedAt);
  const remaining = until
    ? Math.max(0, Math.ceil((Date.parse(until) - Math.max(now, openedAt)) / 1000))
    : 0;
  useEffect(() => {
    if (until && remaining === 0 && !notified.current) {
      notified.current = true;
      playRestAlert();
    }
  }, [until, remaining]);
  async function toggleAlert(field: 'sound' | 'vibration') {
    const next = { ...alerts, [field]: !alerts[field] };
    if (await setRestAlerts(next)) {
      updateAlerts(next);
      setAlertError('');
    } else setAlertError('O navegador não liberou o som. Toque novamente para tentar.');
  }
  if (!until) return null;
  const label = remaining
    ? `Descanso: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
    : 'Descanso concluído';
  function close() {
    setExpanded(false);
    onChange(null);
  }
  return (
    <>
      <Button
        title={label}
        accessibilityLabel={label + ' · abrir cronômetro'}
        style={{ flex: 1, minHeight: 44 }}
        variant="outline"
        onPress={() => setExpanded(true)}
      />
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
          <View
            style={{
              padding: 24,
              gap: 18,
              backgroundColor: '#172111',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              width: '100%',
              maxWidth: 600,
              alignSelf: 'center',
            }}
          >
            <Text variant="title">
              {remaining ? 'Recupere antes da próxima série' : 'Pronto para continuar'}
            </Text>
            <Text
              accessibilityRole="timer"
              style={{ fontSize: 48, textAlign: 'center', color: '#B7F34A' }}
            >
              {remaining
                ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                : 'Descanso concluído'}
            </Text>
            <Text variant="caption">
              O descanso começa ao concluir a série e continua ao minimizar o cronômetro.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={`Som: ${alerts.sound ? 'ligado' : 'desligado'}`}
                  disabled={!canPlayRestSound}
                  variant="outline"
                  onPress={() => void toggleAlert('sound')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={`Vibração: ${alerts.vibration ? 'ligada' : 'desligada'}`}
                  variant="outline"
                  onPress={() => void toggleAlert('vibration')}
                />
              </View>
            </View>
            <Button
              title="Testar aviso"
              variant="ghost"
              disabled={!alerts.sound && !alerts.vibration}
              onPress={() => playRestAlert()}
            />
            <Text variant="caption">
              Avisos dependem do aparelho e do navegador. Mantenha o Fitto aberto para receber o
              alerta.
            </Text>
            {alertError ? <Text accessibilityRole="alert">{alertError}</Text> : null}
            <Button
              title="Adicionar 30 segundos"
              variant="outline"
              onPress={() =>
                onChange(new Date(Math.max(Date.now(), Date.parse(until)) + 30000).toISOString())
              }
            />
            <Button title={remaining ? 'Pular descanso' : 'Continuar treino'} onPress={close} />
            <Button
              title="Minimizar cronômetro"
              variant="ghost"
              onPress={() => setExpanded(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
