import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import type { Relationship } from './api';
import { DetailsPanel } from './DetailsPanel';

export function StudentRoster({
  links,
  limit,
  busy,
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
  onOpen: (link: Relationship) => void;
  onInvite: () => void;
  onRefresh: () => void;
  onApprove: (link: Relationship) => void;
  onReject: (link: Relationship) => void;
  onEnd: (link: Relationship) => void;
  inviteContent?: React.ReactNode;
}) {
  const [tab, setTab] = useState<'active' | 'pending' | 'history'>('active');
  const [query, setQuery] = useState('');
  const active = links.filter((l) => l.status === 'active'),
    pending = links.filter((l) => l.status === 'pending');
  const history = links.filter((l) => l.status === 'ended' || l.status === 'rejected');
  const count = active.filter((l) => !l.is_self).length;
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const list = (tab === 'active' ? active : tab === 'pending' ? pending : history).filter((l) =>
    normalize(l.name + ' ' + l.username).includes(normalize(query.trim())),
  );
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
          <Text style={{ fontSize: 26, fontWeight: '700' }}>Alunos</Text>
          <Text variant="caption">Seu acompanhamento, em um só lugar.</Text>
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
      <View
        style={{
          padding: 16,
          gap: 14,
          borderRadius: 20,
          backgroundColor: '#202D19',
          borderWidth: 1,
          borderColor: '#394B2D',
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="people-outline" color="#C0F568" size={20} />
            <Text>
              {active.length} {active.length === 1 ? 'aluno ativo' : 'alunos ativos'}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: '#304022',
            }}
          >
            <Text variant="caption" color="#C0F568">
              Plano gratuito
            </Text>
          </View>
        </View>
        <Button title="Convidar aluno" disabled={busy} onPress={onInvite} />
        <Text variant="caption">
          {count}/{limit} vaga{limit === 1 ? '' : 's'} utilizada{limit === 1 ? '' : 's'}
          {active.some((l) => l.is_self)
            ? ' · Seu perfil de teste não ocupa vaga.'
            : count < limit
              ? ' · Você pode receber um novo aluno.'
              : ' · Limite de alunos ativos atingido.'}
        </Text>
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
      {links.length > 4 ? (
        <TextField
          accessibilityLabel="Buscar aluno"
          placeholder="Buscar por nome ou usuário"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      ) : null}
      <View style={{ gap: 12 }}>
        {list.length ? (
          list.map((link) => (
            <View
              key={link.id}
              style={{
                padding: 16,
                gap: 12,
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
                    {link.is_self
                      ? 'Seu perfil de teste'
                      : link.status === 'active'
                        ? 'Em acompanhamento'
                        : link.status === 'pending'
                          ? 'Aguardando aprovação'
                          : link.status === 'ended'
                            ? 'Encerrado'
                            : 'Recusado'}
                  </Text>
                </View>
                <Text variant="caption">
                  Solicitado em {new Date(link.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
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
                    <Text variant="caption">Libere uma vaga para aprovar este aluno.</Text>
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
          </View>
        )}
      </View>
      {tab === 'pending' ? (
        <Text variant="caption">Pedidos pendentes não ocupam vagas do plano.</Text>
      ) : null}
    </View>
  );
}
