import React from 'react';
import { View } from 'react-native';
export function ReorderExercise({
  children,
}: {
  children: React.ReactNode;
  index: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
}) {
  return <View>{children}</View>;
}
