import React, { useEffect, useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Text, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Intake = {
  goal: string;
  difficulties: string;
  experience: string;
  days: string[];
  minutes: number | null;
  place: string;
  equipment: string;
  preferences: string;
  shared: boolean;
  updated_at?: string;
};
const empty: Intake = {
  goal: '',
  difficulties: '',
  experience: '',
  days: [],
  minutes: null,
  place: '',
  equipment: '',
  preferences: '',
  shared: false,
};
const experiences = {
  beginner: 'Iniciante / começando agora',
  intermediate: 'Intermediário / já tenho experiência',
  advanced: 'Avançado / treino há bastante tempo',
};
const places = {
  gym: 'Academia',
  home: 'Em casa',
  outdoors: 'Ao ar livre',
  mixed: 'Mais de um local',
};
async function api(action: string, profileId: string, payload: object = {}) {
  const { data, error } = await supabase.rpc('training_intake_api', {
    action,
    profile_id: profileId,
    payload,
  });
  if (error)
    throw new Error(
      error.code === 'P0001' ? error.message : 'Não foi possível acessar a ficha. Tente novamente.',
    );
  return data;
}
export function TrainingIntake({
  profileId,
  linkId,
  onBusy,
  disabled = false,
}: {
  profileId: string;
  linkId?: string;
  onBusy?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [data, setData] = useState<Intake>(empty);
  const [draft, setDraft] = useState<Intake>(empty);
  const [minutes, setMinutes] = useState('');
  const [loading, setLoading] = useState(!linkId);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (linkId) return;
    let live = true;
    api('read', profileId)
      .then((result) => {
        if (live) {
          const next = { ...empty, ...result };
          setData(next);
          setDraft(next);
          setMinutes(next.minutes?.toString() || '');
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [profileId, linkId]);
  async function read() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api('read', profileId, linkId ? { link_id: linkId } : {});
      const next = { ...empty, ...result };
      setData(next);
      setDraft(next);
      setMinutes(next.minutes?.toString() || '');
      setLoaded(true);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar.');
      setData(empty);
      setExpanded(false);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function change<K extends keyof Intake>(key: K, value: Intake[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice('');
  }
  async function save() {
    if (lock.current) return;
    if (minutes && (!/^\d+$/.test(minutes) || Number(minutes) < 10 || Number(minutes) > 300)) {
      setError('Informe de 10 a 300 minutos por sessão ou deixe em branco.');
      return;
    }
    lock.current = true;
    setBusy(true);
    onBusy?.(true);
    setError('');
    setNotice('');
    try {
      const result = await api('save', profileId, {
        ...draft,
        goal: draft.goal.trim(),
        difficulties: draft.difficulties.trim(),
        equipment: draft.equipment.trim(),
        preferences: draft.preferences.trim(),
        minutes: minutes ? Number(minutes) : null,
      });
      const next = { ...empty, ...result };
      setData(next);
      setDraft(next);
      setEditing(false);
      setNotice('Ficha salva.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  const fields: [string, string][] = [
    ['Objetivo e prioridades', data.goal],
    ['Dificuldades', data.difficulties],
    ['Experiência', experiences[data.experience as keyof typeof experiences] || ''],
    [
      'Dias disponíveis',
      ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        .filter((d) => data.days.includes(d))
        .join(' · '),
    ],
    ['Tempo por sessão', data.minutes ? `${data.minutes} minutos` : ''],
    ['Local de treino', places[data.place as keyof typeof places] || ''],
    ['Equipamentos disponíveis', data.equipment],
    ['Preferências de exercícios', data.preferences],
  ];
  return (
    <View
      style={{
        gap: 14,
        padding: linkId ? 0 : 20,
        borderRadius: 22,
        backgroundColor: linkId ? 'transparent' : '#191E16',
        borderWidth: linkId ? 0 : 1,
        borderColor: '#303A27',
      }}
    >
      <Text variant="title">Ficha de acompanhamento</Text>
      {!linkId ? (
        <Text variant="caption">
          Privada: estas respostas não fazem parte do perfil social. Preencha o que for relevante
          para planejar seus treinos.
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" color="#FF6B5A">
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="alert" color="#D3FB69">
          {notice}
        </Text>
      ) : null}
      {loading ? (
        <Text>Carregando ficha...</Text>
      ) : linkId && !expanded ? (
        <Button
          title="Consultar ficha do aluno"
          loading={busy}
          disabled={disabled}
          variant="outline"
          onPress={() => {
            void read();
          }}
        />
      ) : !loaded ? (
        <Button
          title="Tentar carregar novamente"
          loading={busy}
          onPress={() => {
            void read();
          }}
        />
      ) : linkId && !data.shared ? (
        <>
          <Text>O aluno ainda não preencheu ou não autorizou o compartilhamento da ficha.</Text>
          <Button
            title="Atualizar ficha"
            variant="ghost"
            onPress={() => {
              void read();
            }}
            loading={busy}
          />
        </>
      ) : editing ? (
        <>
          <TextField
            label="Objetivo e prioridades"
            value={draft.goal}
            maxLength={500}
            multiline
            editable={!busy}
            onChangeText={(v) => change('goal', v)}
            placeholder="O que você deseja alcançar? O que é mais importante agora?"
          />
          <TextField
            label="Dificuldades atuais"
            value={draft.difficulties}
            maxLength={500}
            multiline
            editable={!busy}
            onChangeText={(v) => change('difficulties', v)}
            placeholder="Ex.: Falta de tempo ou dificuldade para manter a rotina"
          />
          <Text variant="title">Experiência com treinamento</Text>
          {Object.entries(experiences).map(([value, label]) => (
            <Button
              key={value}
              title={`${draft.experience === value ? '✓ ' : ''}${label}`}
              variant={draft.experience === value ? 'secondary' : 'outline'}
              disabled={busy}
              onPress={() => change('experience', draft.experience === value ? '' : value)}
            />
          ))}
          <Text variant="title">Dias disponíveis</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
              <Button
                key={day}
                title={`${draft.days.includes(day) ? '✓ ' : ''}${day}`}
                variant={draft.days.includes(day) ? 'primary' : 'outline'}
                disabled={busy}
                onPress={() =>
                  change(
                    'days',
                    draft.days.includes(day)
                      ? draft.days.filter((d) => d !== day)
                      : [...draft.days, day],
                  )
                }
              />
            ))}
          </View>
          <TextField
            label="Minutos disponíveis por sessão"
            value={minutes}
            maxLength={3}
            keyboardType="number-pad"
            editable={!busy}
            onChangeText={(v) => setMinutes(v.replace(/\D/g, ''))}
            placeholder="Ex.: 60"
            helperText="De 10 a 300 minutos. Opcional."
          />
          <Text variant="title">Onde você treina?</Text>
          {Object.entries(places).map(([value, label]) => (
            <Button
              key={value}
              title={`${draft.place === value ? '✓ ' : ''}${label}`}
              disabled={busy}
              variant={draft.place === value ? 'secondary' : 'outline'}
              onPress={() => change('place', draft.place === value ? '' : value)}
            />
          ))}
          <TextField
            label="Equipamentos disponíveis"
            value={draft.equipment}
            maxLength={500}
            multiline
            editable={!busy}
            onChangeText={(v) => change('equipment', v)}
            placeholder="Ex.: Academia completa, halteres, elásticos ou sem equipamentos"
          />
          <TextField
            label="Preferências de exercícios"
            value={draft.preferences}
            maxLength={500}
            multiline
            editable={!busy}
            onChangeText={(v) => change('preferences', v)}
            placeholder="Atividades de que gosta e exercícios que prefere evitar"
          />
          <View style={{ gap: 10, padding: 14, borderRadius: 14, backgroundColor: '#28321F' }}>
            <Text>Permitir que meus treinadores com vínculo ativo consultem esta ficha</Text>
            <Switch
              accessibilityLabel="Compartilhar ficha com treinadores vinculados"
              value={draft.shared}
              disabled={busy}
              onValueChange={(v) => change('shared', v)}
            />
            <Text variant="caption">
              Você pode desativar e salvar a qualquer momento. O acesso também termina quando o
              vínculo é encerrado.
            </Text>
          </View>
          <Button
            title="Salvar ficha"
            loading={busy}
            disabled={disabled}
            onPress={() => {
              void save();
            }}
          />
          <Button
            title="Cancelar"
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setDraft(data);
              setMinutes(data.minutes?.toString() || '');
              setEditing(false);
              setError('');
            }}
          />
        </>
      ) : (
        <>
          {fields.map(([label, value]) => (
            <View key={label} style={{ gap: 4 }}>
              <Text variant="caption">{label}</Text>
              <Text>{value || 'Não informado'}</Text>
            </View>
          ))}
          {data.updated_at ? (
            <Text variant="caption">
              Atualizada em {new Date(data.updated_at).toLocaleString('pt-BR')}
            </Text>
          ) : null}
          {!linkId ? (
            <>
              <Text variant="caption">
                {data.shared
                  ? 'Compartilhamento autorizado para seus treinadores ativos.'
                  : 'Compartilhamento desativado. Somente você pode consultar.'}
              </Text>
              <Button
                title="Completar ou editar ficha"
                variant="outline"
                disabled={busy || disabled}
                onPress={() => {
                  setDraft(data);
                  setMinutes(data.minutes?.toString() || '');
                  setEditing(true);
                  setNotice('');
                  setError('');
                }}
              />
            </>
          ) : (
            <>
              <Button
                title="Atualizar ficha"
                loading={busy}
                variant="ghost"
                onPress={() => {
                  void read();
                }}
              />
              <Button
                title="Recolher ficha"
                variant="ghost"
                onPress={() => {
                  setExpanded(false);
                  setData(empty);
                }}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}
