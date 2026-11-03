import React, { useRef } from 'react';
import { Button } from '@/components/ui';
import { Pressable } from 'react-native';

export function PhotoPicker({
  onChange,
  onError,
  children,
  disabled = false,
}: {
  onChange: (value: string) => void;
  onError: (message: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        disabled={disabled}
        accept="image/jpeg,image/png,image/webp"
        aria-label="Escolher foto do perfil"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (
            !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
            file.size > 2 * 1024 * 1024
          ) {
            onError('Escolha uma imagem JPG, PNG ou WebP de até 2 MB.');
            return;
          }
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result));
          reader.onerror = () => onError('Não foi possível ler a foto. Tente outra imagem.');
          reader.readAsDataURL(file);
        }}
      />
      {children ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Alterar foto do perfil"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => input.current?.click()}
          style={{ alignSelf: 'flex-start' }}
        >
          {children}
        </Pressable>
      ) : (
        <Button
          title="Escolher foto (opcional)"
          variant="outline"
          onPress={() => input.current?.click()}
          disabled={disabled}
        />
      )}
    </>
  );
}
