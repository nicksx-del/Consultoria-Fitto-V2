import React from 'react';
import { TextField } from '@/components/ui';

export function PhotoPicker({
  onChange,
  onError,
  disabled = false,
}: {
  onChange: (value: string) => void;
  onError: (message: string) => void;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <TextField
      label="Link da foto (opcional)"
      editable={!disabled}
      placeholder="https://…"
      autoCapitalize="none"
      keyboardType="url"
      onChangeText={(value) => {
        if (!value || /^https:\/\//.test(value)) onChange(value);
        else onError('Use um endereço HTTPS para a foto.');
      }}
    />
  );
}
