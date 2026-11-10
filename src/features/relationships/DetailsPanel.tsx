import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
export function DetailsPanel({
  title,
  children,
  leading,
  trailing,
}: {
  title: string;
  children: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {leading}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{
            flex: 1,
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
        {trailing}
      </View>
      {open ? children : null}
    </View>
  );
}
