import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text, TextField } from '@/components/ui';
import { Avatar } from './ProfilePanel';
import type { Profile } from './api';

function SettingsRow({
  title,
  detail,
  icon,
  onPress,
  disabled,
  expanded,
  danger = false,
}: {
  title: string;
  detail?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled: boolean;
  expanded?: boolean;
  danger?: boolean;
}) {
  const color = danger ? '#FF988C' : '#C0F568';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? title + ' · ' + detail : title}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 13,
        backgroundColor: pressed ? '#293B20' : '#191F16',
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: '600' }} color={danger ? color : undefined}>
          {title}
        </Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      {!danger ? (
        <Ionicons
          name={
            expanded === undefined ? 'chevron-forward' : expanded ? 'chevron-up' : 'chevron-down'
          }
          size={16}
          color="#A8B59E"
        />
      ) : null}
    </Pressable>
  );
}

export function SettingsPanel({
  profile,
  busy,
  count,
  limit,
  savedPhone,
  phone,
  editingPhone,
  onPhoneChange,
  onTogglePhone,
  onSavePhone,
  onPlans,
  onAccounts,
  onSignOut,
}: {
  profile: Profile;
  busy: boolean;
  count: number;
  limit: number;
  savedPhone: string;
  phone: string;
  editingPhone: boolean;
  onPhoneChange: (phone: string) => void;
  onTogglePhone: () => void;
  onSavePhone: () => void;
  onPlans: () => void;
  onAccounts: () => void;
  onSignOut: () => void;
}) {
  const professional = profile.role === 'professional';
  const validPhone = phone === '' || /^[1-9]\d{9,14}$/.test(phone);
  const brazilian = /^(55)(\d{2})(\d{4,5})(\d{4})$/.exec(savedPhone);
  const contact = brazilian
    ? `+${brazilian[1]} (${brazilian[2]}) ${brazilian[3]}-${brazilian[4]}`
    : savedPhone
      ? '+' + savedPhone
      : undefined;

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 25, fontWeight: '700', letterSpacing: -0.6 }}>Configurações</Text>
      <View
        style={{
          padding: 12,
          gap: 8,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#303E28',
          backgroundColor: '#1C2518',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 3 }}>
          <Avatar key={profile.avatar_url || 'empty'} profile={profile} size={44} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700' }}>
              {profile.display_name}
            </Text>
            <Text variant="caption">
              @{profile.username} · {professional ? 'Profissional' : 'Aluno'}
            </Text>
          </View>
        </View>
        <SettingsRow
          title="Trocar ou adicionar perfil"
          icon="people-outline"
          onPress={onAccounts}
          disabled={busy}
        />
      </View>
      {professional ? (
        <View
          style={{
            gap: 6,
            padding: 5,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#303E28',
            backgroundColor: '#1C2518',
          }}
        >
          <SettingsRow
            title="Plano e vagas"
            detail={`${count}/${limit} em uso · ${Math.max(0, limit - count)} livres`}
            icon="layers-outline"
            onPress={onPlans}
            disabled={busy}
          />
          <SettingsRow
            title={savedPhone ? 'WhatsApp de atendimento' : 'Adicionar WhatsApp'}
            detail={contact}
            icon="logo-whatsapp"
            onPress={onTogglePhone}
            expanded={editingPhone}
            disabled={busy}
          />
          {editingPhone ? (
            <View style={{ padding: 10, gap: 10 }}>
              <TextField
                label="Número do WhatsApp"
                placeholder="5511999999999"
                helperText="Código do país, DDD e número. Visível para alunos com vínculo ativo."
                error={
                  !validPhone
                    ? 'Informe de 10 a 15 dígitos, começando pelo código do país.'
                    : undefined
                }
                value={phone}
                onChangeText={(value) => onPhoneChange(value.replace(/\D/g, '').slice(0, 15))}
                keyboardType="phone-pad"
                editable={!busy}
              />
              <Button
                title={phone || !savedPhone ? 'Salvar WhatsApp' : 'Remover WhatsApp'}
                disabled={busy || !validPhone || phone === savedPhone}
                onPress={onSavePhone}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <View
        style={{
          marginTop: 6,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#38302C',
          overflow: 'hidden',
        }}
      >
        <SettingsRow
          title="Sair da conta"
          icon="log-out-outline"
          onPress={onSignOut}
          disabled={busy}
          danger
        />
      </View>
    </View>
  );
}
