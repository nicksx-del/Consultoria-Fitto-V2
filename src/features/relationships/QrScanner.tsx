import React from 'react';
import { Text } from '@/components/ui';
export function QrScanner({
  disabled: _disabled,
  onScan: _onScan,
}: {
  disabled?: boolean;
  onScan: (credential: string) => void;
}) {
  return (
    <Text variant="caption">
      Abra o Fitto pelo navegador do celular para ler o QR Code com a câmera. Você também pode
      digitar o código do convite.
    </Text>
  );
}
