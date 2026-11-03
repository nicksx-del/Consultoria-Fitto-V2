import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
export function DetailsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text variant="caption" color="#BACBAF">
          {title}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#A7BC96" />
      </Pressable>
      {open ? children : null}
    </View>
  );
}
