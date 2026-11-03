import React from 'react';
export function ReorderExercise({
  children,
  index,
  disabled,
  onMove,
}: {
  children: React.ReactNode;
  index: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        if (!disabled && e.dataTransfer.types.includes('application/x-fitto-exercise'))
          e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (disabled) return;
        const raw = e.dataTransfer.getData('application/x-fitto-exercise');
        if (!/^\d+$/.test(raw)) return;
        const from = Number(raw);
        if (from !== index) onMove(from, index);
      }}
    >
      <div
        draggable={!disabled}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-fitto-exercise', String(index));
          e.dataTransfer.effectAllowed = 'move';
        }}
        style={{
          padding: 4,
          fontSize: 11,
          textAlign: 'right',
          color: '#B7F34A',
          cursor: disabled ? 'default' : 'grab',
          fontFamily: 'sans-serif',
        }}
      >
        Arrastar para reordenar
      </div>
      {children}
    </div>
  );
}
