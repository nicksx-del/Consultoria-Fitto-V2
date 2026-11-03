import React, { useMemo } from 'react';
import { View } from 'react-native';
import { toQR } from 'toqr';

// Generate locally: invitation credentials never go to an external QR service.
export function InviteQr({ value }: { value: string }) {
  const matrix = useMemo(() => toQR(value), [value]);
  const side = Math.sqrt(matrix.length);
  const cell = Math.max(2, Math.floor(240 / (side + 8)));
  return (
    <View
      accessibilityLabel="QR Code do convite"
      accessibilityRole="image"
      style={{
        backgroundColor: '#fff',
        width: (side + 8) * cell,
        height: (side + 8) * cell,
        alignSelf: 'center',
      }}
    >
      {Array.from(matrix).map((dark, i) =>
        dark ? (
          <View
            key={i}
            style={{
              position: 'absolute',
              backgroundColor: '#000',
              width: cell,
              height: cell,
              left: ((i % side) + 4) * cell,
              top: (Math.floor(i / side) + 4) * cell,
            }}
          />
        ) : null,
      )}
    </View>
  );
}
