import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
import type { Relationship } from './api';

const accent = '#C0F568';
const muted = '#A8B59E';
const iconButton = {
  width: 44,
  height: 44,
  borderRadius: 13,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

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
  const [expanded, setExpanded] = useState<string | null>(null);
  const wide = useWindowDimensions().width >= 1100;
  const active = links.filter((link) => link.status === 'active');
  const pending = links.filter((link) => link.status === 'pending');
  const history = links.filter((link) => link.status === 'ended' || link.status === 'rejected');
  const count = active.filter((link) => !link.is_self).length;
  const available = Math.max(0, limit - count);
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const list = (tab === 'active' ? active : tab === 'pending' ? pending : history)
    .filter((link) => normalize(link.name + ' ' + link.username).includes(normalize(query.trim())))
    .slice()
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : b.created_at.localeCompare(a.created_at),
    );
  useEffect(() => {
    setVisibleCount(20);
    setExpanded(null);
  }, [query, tab, sort]);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.8 }}>Alunos</Text>
          <Text variant="caption">Seu acompanhamento</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Atualizar alunos"
          disabled={busy}
          onPress={onRefresh}
          style={iconButton}
        >
          <Ionicons name="refresh-outline" size={20} color={muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Convidar aluno"
          disabled={busy}
          onPress={onInvite}
          style={{
            flexDirection: 'row',
            gap: 6,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: accent,
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Ionicons name="add" size={21} color="#17210F" />
          <Text color="#17210F" style={{ fontWeight: '700', fontSize: 13 }}>
            Convidar
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count + ' de ' + limit + ' vagas utilizadas. Gerenciar plano'}
        disabled={busy}
        onPress={onPlans}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 46,
          borderRadius: 14,
          backgroundColor: '#1D2817',
          borderWidth: 1,
          borderColor: '#33442A',
        }}
      >
        <Ionicons name="people-outline" size={17} color={accent} />
        <View style={{ flex: 1 }}>
          <Text variant="caption">
            {count}/{limit} vagas · {available} livres
          </Text>
        </View>
        <Text variant="caption" color={accent}>
          Meu plano
        </Text>
        <Ionicons name="chevron-forward" size={14} color={accent} />
      </Pressable>
      {inviteContent}
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          padding: 3,
          gap: 3,
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
        ).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => {
              setTab(item.id);
              setQuery('');
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              borderRadius: 11,
              backgroundColor: tab === item.id ? '#304325' : 'transparent',
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: tab === item.id ? '700' : '400' }}
              color={tab === item.id ? accent : muted}
            >
              {item.label}
            </Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: tab === item.id ? '#455E30' : '#252F20',
              }}
            >
              <Text style={{ fontSize: 11 }} color={tab === item.id ? accent : muted}>
                {item.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 12,
          minHeight: 46,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#303E28',
          backgroundColor: '#171E13',
        }}
      >
        <Ionicons name="search-outline" size={19} color={muted} />
        <TextInput
          accessibilityLabel="Buscar aluno"
          placeholder="Nome ou @usuário"
          placeholderTextColor="#94A28A"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            color: '#F0F5EB',
            fontSize: 14,
            paddingVertical: 8,
          }}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            onPress={() => setQuery('')}
            style={iconButton}
          >
            <Ionicons name="close-circle" size={19} color={muted} />
          </Pressable>
        ) : (
          <View style={{ width: 10 }} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption" accessibilityLiveRegion="polite">
          {list.length} {list.length === 1 ? 'aluno' : 'alunos'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            'Ordenação atual ' +
            (sort === 'recent' ? 'mais recentes' : 'por nome') +
            '. Tocar para alternar'
          }
          onPress={() => setSort(sort === 'recent' ? 'name' : 'recent')}
          style={{
            flexDirection: 'row',
            gap: 5,
            alignItems: 'center',
            minHeight: 44,
            paddingHorizontal: 8,
          }}
        >
          <Ionicons name="swap-vertical" size={15} color={muted} />
          <Text variant="caption">{sort === 'recent' ? 'Recentes' : 'A–Z'}</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        {list.length ? (
          list.slice(0, visibleCount).map((link) => (
            <View
              key={link.id}
              style={{
                padding: 12,
                gap: 8,
                borderRadius: 17,
                borderWidth: 1,
                borderColor: '#2D3C25',
                backgroundColor: '#182014',
              }}
            >
              <View
                style={{
                  flexDirection: wide && link.status === 'active' ? 'row' : 'column',
                  gap: 8,
                  alignItems: wide && link.status === 'active' ? 'center' : undefined,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    flex: wide ? 1 : undefined,
                    minWidth: 0,
                  }}
                >
                  <Pressable
                    accessibilityRole={link.status === 'active' ? 'button' : undefined}
                    accessibilityLabel={
                      link.status === 'active' ? 'Abrir perfil de ' + link.name : undefined
                    }
                    disabled={busy || link.status !== 'active'}
                    onPress={() => onOpen(link)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      flex: 1,
                      minWidth: 0,
                      minHeight: 48,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: '#2C3E21',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text color={accent} style={{ fontSize: 15, fontWeight: '700' }}>
                        {link.name
                          .trim()
                          .split(/\s+/)
                          .filter((part) => /^[\p{L}\p{N}]/u.test(part))
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600' }}>
                        {link.name}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        @{link.username}
                        {link.is_self ? ' · Teste' : ''}
                      </Text>
                    </View>
                    {link.status === 'active' ? (
                      <Ionicons name="chevron-forward" size={15} color="#91A283" />
                    ) : null}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={'Opções de ' + link.name}
                    accessibilityState={{ expanded: expanded === link.id }}
                    disabled={busy}
                    onPress={() => setExpanded(expanded === link.id ? null : link.id)}
                    style={iconButton}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={muted} />
                  </Pressable>
                </View>
                {link.status === 'active' && (trainer || nutritionist) ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(
                      [
                        {
                          section: 'workouts',
                          label: 'Treino',
                          icon: 'barbell-outline',
                          enabled: trainer,
                        },
                        {
                          section: 'nutrition',
                          label: 'Dieta',
                          icon: 'restaurant-outline',
                          enabled: nutritionist,
                        },
                        {
                          section: 'intake',
                          label: 'Ficha',
                          icon: 'clipboard-outline',
                          enabled: trainer,
                        },
                      ] as const
                    )
                      .filter((item) => item.enabled)
                      .map((item) => (
                        <Pressable
                          key={item.section}
                          accessibilityRole="button"
                          accessibilityLabel={item.label + ' de ' + link.name}
                          disabled={busy}
                          onPress={() => onOpen(link, item.section)}
                          style={({ pressed }) => ({
                            flex: wide ? undefined : 1,
                            flexDirection: 'row',
                            gap: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: 44,
                            paddingHorizontal: 12,
                            borderRadius: 11,
                            backgroundColor: pressed ? '#354B27' : '#26351E',
                            opacity: busy ? 0.5 : 1,
                          })}
                        >
                          <Ionicons name={item.icon} size={16} color={accent} />
                          <Text style={{ fontSize: 12, fontWeight: '600' }} color="#DAE6D1">
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </View>
              {link.status === 'pending' ? (
                <>
                  <Text variant="caption" color="#E8C47C">
                    Aguardando sua aprovação
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      title="Aprovar"
                      disabled={busy || (!link.is_self && count >= limit)}
                      onPress={() => onApprove(link)}
                      style={{ flex: 1, minHeight: 44 }}
                    />
                    <Button
                      title="Recusar"
                      variant="outline"
                      disabled={busy}
                      onPress={() => onReject(link)}
                      style={{ flex: 1, minHeight: 44 }}
                    />
                  </View>
                  {!link.is_self && count >= limit ? (
                    <Button
                      title="Aumentar limite para aprovar"
                      variant="ghost"
                      disabled={busy}
                      onPress={onPlans}
                    />
                  ) : null}
                </>
              ) : link.status !== 'active' ? (
                <Text variant="caption">{link.status === 'ended' ? 'Encerrado' : 'Recusado'}</Text>
              ) : null}
              {expanded === link.id ? (
                <View
                  style={{ paddingTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#314129' }}
                >
                  <Text variant="caption">
                    Solicitado em {new Date(link.created_at).toLocaleDateString('pt-BR')}
                    {link.is_self ? ' · Perfil de teste, sem ocupar vaga' : ''}
                  </Text>
                  {link.status === 'active' ? (
                    <Button
                      title="Encerrar acompanhamento"
                      variant="ghost"
                      disabled={busy}
                      onPress={() => onEnd(link)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <View
            style={{
              alignItems: 'center',
              padding: 24,
              gap: 10,
              borderRadius: 18,
              backgroundColor: '#182014',
            }}
          >
            <Ionicons
              name={
                query ? 'search-outline' : tab === 'pending' ? 'mail-outline' : 'people-outline'
              }
              size={28}
              color={accent}
            />
            <Text variant="title" style={{ textAlign: 'center' }}>
              {query
                ? 'Nenhum aluno encontrado'
                : tab === 'active'
                  ? 'Seu próximo aluno começa aqui'
                  : tab === 'pending'
                    ? 'Nenhum pedido pendente'
                    : 'Nenhum vínculo no histórico'}
            </Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {query
                ? 'Tente outro nome ou usuário.'
                : tab === 'history'
                  ? 'Acompanhamentos encerrados e pedidos recusados aparecem aqui.'
                  : 'Compartilhe seu convite para iniciar um acompanhamento.'}
            </Text>
            {query ? (
              <Button title="Limpar busca" variant="outline" onPress={() => setQuery('')} />
            ) : tab === 'active' ? (
              <Button title="Convidar aluno" disabled={busy} onPress={onInvite} />
            ) : null}
          </View>
        )}
      </View>
      {list.length > visibleCount ? (
        <Button
          title={'Mostrar mais · ' + visibleCount + ' de ' + list.length}
          variant="outline"
          onPress={() => setVisibleCount((count) => count + 20)}
        />
      ) : null}
      {tab === 'pending' ? (
        <Text variant="caption">Pedidos pendentes só ocupam vaga após a aprovação.</Text>
      ) : active.some((link) => link.is_self) && tab === 'active' ? (
        <Text variant="caption">O perfil de teste não ocupa vaga do plano.</Text>
      ) : null}
    </View>
  );
}
