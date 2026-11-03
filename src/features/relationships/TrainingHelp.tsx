import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button, Text } from '@/components/ui';
export function TrainingHelp({
  info,
}: {
  info: { label: string; description: string; example: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`O que é ${info.label}?`}
        onPress={() => setOpen(true)}
        style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
      >
        <Ionicons name="help-circle-outline" size={22} color="#B7F34A" />
      </Pressable>
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.8)',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <View
              style={{
                backgroundColor: '#202D19',
                padding: 20,
                borderRadius: 20,
                gap: 14,
                maxWidth: 500,
                width: '100%',
                alignSelf: 'center',
              }}
            >
              <Text variant="title">{info.label}</Text>
              <Text>{info.description}</Text>
              <Text variant="caption">Exemplo de organização: {info.example}</Text>
              <Button title="Entendi" onPress={() => setOpen(false)} />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
