import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
import type { AccountRole } from './registration';
export function AccountRolePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: AccountRole;
  onChange: (r: AccountRole) => void;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Como você vai usar o Fitto?"
      style={{ gap: 10 }}
    >
      {(
        [
          {
            role: 'student',
            title: 'Sou aluno',
            description: 'Receba seu treino e acompanhe sua evolução.',
            icon: 'person-outline',
          },
          {
            role: 'professional',
            title: 'Sou profissional',
            description: 'Acompanhe alunos e organize suas prescrições.',
            icon: 'barbell-outline',
          },
        ] as const
      ).map((item) => (
        <Pressable
          key={item.role}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === item.role, disabled }}
          accessibilityLabel={item.title}
          disabled={disabled}
          onPress={() => onChange(item.role)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: value === item.role ? '#B7F34A' : '#35432C',
            backgroundColor: value === item.role ? '#252F1C' : '#191E16',
            minHeight: 88,
          }}
        >
          <Ionicons name={item.icon} size={25} color="#B7F34A" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title">{item.title}</Text>
            <Text variant="caption">{item.description}</Text>
          </View>
          <Ionicons
            name={value === item.role ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={value === item.role ? '#B7F34A' : '#88947D'}
          />
        </Pressable>
      ))}
    </View>
  );
}
