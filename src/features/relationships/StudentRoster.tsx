import React, { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import type { Relationship } from './api';
import { DetailsPanel } from './DetailsPanel';

export function StudentRoster({
  links,
  limit,
  busy,
  trainer,
  nutritionist,
  onPlans,
  onOpen,
  onInvite,
  onRefresh,
  onApprove,
  onReject,
  onEnd,
  inviteContent,
}: {
  links: Relationship[];
  limit: number;
  busy: boolean;
  trainer: boolean;
  nutritionist: boolean;
  onPlans: () => void;
  onOpen: (link: Relationship, section?: 'workouts' | 'nutrition' | 'intake') => void;
  onInvite: () => void;
  onRefresh: () => void;
  onApprove: (link: Relationship) => void;
  onReject: (link: Relationship) => void;
  onEnd: (link: Relationship) => void;
  inviteContent?: React.ReactNode;
}) {
  const [tab, setTab] = useState<'active' | 'pending' | 'history'>('active');
  const [visibleCount, setVisibleCount] = useState(20);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const wide = useWindowDimensions().width >= 1100;
  const active = links.filter((l) => l.status === 'active'),
    pending = links.filter((l) => l.status === 'pending');
  const history = links.filter((l) => l.status === 'ended' || l.status === 'rejected');
  const count = active.filter((l) => !l.is_self).length;
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const list = (tab === 'active' ? active : tab === 'pending' ? pending : history)
    .filter((l) => normalize(l.name + ' ' + l.username).includes(normalize(query.trim())))
    .slice()
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : b.created_at.localeCompare(a.created_at),
    );
  useEffect(() => {
    setVisibleCount(20);
  }, [query, tab, sort]);
  const available = Math.max(0, limit - count);
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ gap: 4, flex: 1 }}>
          <Text variant="caption" color="#C0F568">
            GESTÃO DO ATENDIMENTO
          </Text>
          <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.8 }}>Meus alunos</Text>
          <Text variant="caption">Da primeira solicitação ao acompanhamento de cada aluno.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atualizar alunos"
          disabled={busy}
          onPress={onRefresh}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            backgroundColor: '#202A1A',
          }}
        >
          <Ionicons name="refresh-outline" color="#C0F568" size={21} />
        </Pressable>
      </View>
      <Button title="+ Convidar aluno" disabled={busy} onPress={onInvite} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(
          [
            {
              id: 'active',
              title: 'Alunos ativos',
              value: count,
              icon: 'people-outline',
              color: '#C0F568',
            },
            {
              id: 'pending',
              title: 'Aguardando você',
              value: pending.length,
              icon: 'mail-unread-outline',
              color: '#F7CC6A',
            },
            {
              id: 'history',
              title: 'No histórico',
              value: history.length,
              icon: 'time-outline',
              color: '#B4C5AB',
            },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.title + ', ' + item.value}
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => {
              setTab(item.id);
              setQuery('');
            }}
            style={{
              flex: 1,
              minWidth: 90,
              padding: wide ? 20 : 13,
              gap: 10,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: tab === item.id ? '#627D43' : '#303D28',
              backgroundColor: tab === item.id ? '#25371B' : '#191F16',
            }}
          >
            <Ionicons name={item.icon} color={item.color} size={22} />
            <Text style={{ fontSize: 28, fontWeight: '700' }}>{item.value}</Text>
            <Text variant="caption">{item.title}</Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          padding: 16,
          gap: 10,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#35432C',
          backgroundColor: '#1A2315',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Text variant="caption">
            {count}/{limit} vagas utilizadas · {available} disponíveis
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gerenciar capacidade do plano"
            disabled={busy}
            onPress={onPlans}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text color="#C0F568" style={{ fontSize: 13, fontWeight: '600' }}>
              Gerenciar plano ↗
            </Text>
          </Pressable>
        </View>
        <View
          style={{ height: 4, borderRadius: 4, overflow: 'hidden', backgroundColor: '#35432C' }}
        >
          <View
            style={{
              height: 4,
              width: (Math.min(1, count / Math.max(1, limit)) * 100 + '%') as `${number}%`,
              backgroundColor: '#C0F568',
            }}
          />
        </View>
        {active.some((link) => link.is_self) ? (
          <Text variant="caption">Seu perfil de teste aparece na lista e não ocupa vaga.</Text>
        ) : null}
      </View>
      {inviteContent}
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: 4,
          gap: 4,
          borderRadius: 14,
          backgroundColor: '#1A2216',
        }}
      >
        {(
          [
            { id: 'active', label: 'Ativos', count: active.length },
            { id: 'pending', label: 'Pedidos', count: pending.length },
            { id: 'history', label: 'Histórico', count: history.length },
          ] as const
        ).map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            onPress={() => {
              setTab(t.id);
              setQuery('');
            }}
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 11,
              backgroundColor: tab === t.id ? '#344728' : 'transparent',
            }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: tab === t.id ? '700' : '400' }}
              color={tab === t.id ? '#C0F568' : '#A8B59E'}
            >
              {t.label} {t.count}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextField
        accessibilityLabel="Buscar aluno"
        placeholder="Buscar por nome ou @usuário"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text variant="caption" accessibilityLiveRegion="polite">
          {list.length} {list.length === 1 ? 'resultado' : 'resultados'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(
            [
              { id: 'recent', title: 'Mais recentes' },
              { id: 'name', title: 'A–Z' },
            ] as const
          ).map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === option.id }}
              onPress={() => setSort(option.id)}
              style={{
                paddingHorizontal: 12,
                minHeight: 40,
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: sort === option.id ? '#2A3C1F' : '#191F16',
              }}
            >
              <Text variant="caption" color={sort === option.id ? '#C0F568' : '#B6C1AE'}>
                {option.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 12 }}>
        {list.length ? (
          list.slice(0, visibleCount).map((link) => (
            <View
              key={link.id}
              style={{
                padding: wide ? 22 : 16,
                gap: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#34432B',
                backgroundColor: '#172013',
              }}
            >
              <Pressable
                accessibilityRole={link.status === 'active' ? 'button' : undefined}
                accessibilityLabel={
                  link.status === 'active' ? `Abrir aluno ${link.name}` : undefined
                }
                disabled={busy || link.status !== 'active'}
                onPress={() => onOpen(link)}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 52 }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: link.status === 'active' ? '#304323' : '#252E20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    color={link.status === 'active' ? '#C0F568' : '#A4B29B'}
                    style={{ fontSize: 18, fontWeight: '700' }}
                  >
                    {link.name
                      .trim()
                      .split(/\s+/)
                      .filter((part) => /^[\p{L}\p{N}]/u.test(part))
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{link.name}</Text>
                  <Text variant="caption">@{link.username}</Text>
                </View>
                {link.status === 'active' ? (
                  <Ionicons name="chevron-forward" size={20} color="#C0F568" />
                ) : null}
              </Pressable>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
              >
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: link.status === 'pending' ? '#3B301A' : '#26301F',
                  }}
                >
                  <Text variant="caption" color={link.status === 'pending' ? '#F7CC6A' : '#A9BA9F'}>
                    {link.status === 'active'
                      ? 'Em acompanhamento'
                      : link.status === 'pending'
                        ? 'Aguardando aprovação'
                        : link.status === 'ended'
                          ? 'Encerrado'
                          : 'Recusado'}
                  </Text>
                </View>
                {link.is_self ? (
                  <Text variant="caption" color="#C0F568">
                    Perfil de teste
                  </Text>
                ) : null}
                <Text variant="caption">
                  Solicitado em {new Date(link.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              {link.status === 'active' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    title="Abrir perfil"
                    variant="outline"
                    disabled={busy}
                    onPress={() => onOpen(link)}
                    style={{ flexGrow: 1 }}
                  />
                  {trainer ? (
                    <Button
                      title="Treino"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => onOpen(link, 'workouts')}
                      style={{ flexGrow: 1 }}
                    />
                  ) : null}
                  {nutritionist ? (
                    <Button
                      title="Alimentação"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => onOpen(link, 'nutrition')}
                      style={{ flexGrow: 1 }}
                    />
                  ) : null}
                  {trainer ? (
                    <Button
                      title="Ficha"
                      variant="ghost"
                      disabled={busy}
                      onPress={() => onOpen(link, 'intake')}
                    />
                  ) : null}
                </View>
              ) : null}
              {link.status === 'active' ? (
                <DetailsPanel title="Gerenciar vínculo">
                  <Button
                    title="Encerrar acompanhamento"
                    variant="outline"
                    disabled={busy}
                    onPress={() => onEnd(link)}
                  />
                </DetailsPanel>
              ) : link.status === 'pending' ? (
                <>
                  <Button
                    title="Aprovar aluno"
                    disabled={busy || (!link.is_self && count >= limit)}
                    onPress={() => onApprove(link)}
                  />
                  {!link.is_self && count >= limit ? (
                    <View style={{ gap: 8 }}>
                      <Text variant="caption">
                        Seu plano está cheio. Aumente a capacidade para aprovar este aluno.
                      </Text>
                      <Button
                        title="Aumentar limite de alunos"
                        variant="outline"
                        disabled={busy}
                        onPress={onPlans}
                      />
                    </View>
                  ) : null}
                  <Button
                    title="Recusar pedido"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => onReject(link)}
                  />
                </>
              ) : null}
            </View>
          ))
        ) : (
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 30,
              paddingHorizontal: 20,
              gap: 12,
              borderRadius: 20,
              backgroundColor: '#172013',
              borderWidth: 1,
              borderColor: '#2E3B26',
            }}
          >
            <View
              style={{
                height: 60,
                width: 60,
                borderRadius: 20,
                backgroundColor: '#28391E',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons
                name={
                  tab === 'active'
                    ? 'person-add-outline'
                    : tab === 'pending'
                      ? 'mail-outline'
                      : 'time-outline'
                }
                size={28}
                color="#C0F568"
              />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center' }}>
              {query
                ? 'Nenhum aluno encontrado'
                : tab === 'active'
                  ? 'Pronto para o próximo aluno'
                  : tab === 'pending'
                    ? 'Nenhum pedido pendente'
                    : 'Seu histórico começa aqui'}
            </Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {query
                ? 'Tente outro nome ou usuário.'
                : tab === 'active'
                  ? 'Toque em Convidar aluno e compartilhe o código ou QR Code.'
                  : tab === 'pending'
                    ? 'Quando alguém usar seu convite, o pedido aparecerá aqui.'
                    : 'Acompanhamentos encerrados e pedidos recusados ficam nesta aba.'}
            </Text>
            {query ? (
              <Button title="Limpar busca" variant="outline" onPress={() => setQuery('')} />
            ) : tab === 'active' ? (
              <Button title="Convidar meu primeiro aluno" disabled={busy} onPress={onInvite} />
            ) : null}
          </View>
        )}
      </View>
      {list.length > visibleCount ? (
        <Button
          title={
            'Mostrar mais alunos · ' + Math.min(visibleCount, list.length) + ' de ' + list.length
          }
          variant="outline"
          onPress={() => setVisibleCount((count) => count + 20)}
        />
      ) : null}
      {tab === 'pending' ? (
        <Text variant="caption">Pedidos pendentes não ocupam vagas do plano.</Text>
      ) : null}
    </View>
  );
}
