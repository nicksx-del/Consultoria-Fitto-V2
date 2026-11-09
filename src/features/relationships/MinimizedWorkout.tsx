import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { playRestAlert } from './restAlerts';

type MinimizedWorkout = {
  profileId: string;
  linkId: string;
  executionId: string;
  name: string;
  done: number;
  total: number;
  restUntil: string | null;
  restOwner: { ei: number; si: number } | null;
};

const WorkoutContext = createContext<{
  workout: MinimizedWorkout | null;
  minimize: (workout: MinimizedWorkout) => void;
  clear: (profileId: string, linkId: string) => void;
} | null>(null);

export function MinimizedWorkoutProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [workout, minimize] = useState<MinimizedWorkout | null>(null);
  const clear = useCallback((profileId: string, linkId: string) => {
    minimize((current) =>
      current?.profileId === profileId && current.linkId === linkId ? null : current,
    );
  }, []);
  useEffect(() => {
    minimize(null);
  }, [session?.user.id]);
  useEffect(() => {
    const delay = workout?.restUntil ? Date.parse(workout.restUntil) - Date.now() : 0;
    if (delay <= 0 || !Number.isFinite(delay)) return;
    const timer = setTimeout(playRestAlert, delay);
    return () => clearTimeout(timer);
  }, [workout?.restUntil]);
  return (
    <WorkoutContext.Provider value={{ workout, minimize, clear }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useMinimizedWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error('MinimizedWorkoutProvider ausente.');
  return context;
}

export function MinimizedWorkoutBar({
  profileId,
  disabled,
}: {
  profileId: string;
  disabled: boolean;
}) {
  const { workout } = useMinimizedWorkout();
  const router = useRouter();
  const pathname = usePathname();
  const visible = workout?.profileId === profileId && pathname !== '/treinar';
  const [now, setNow] = useState(Date.now);
  const deadline = visible && workout.restUntil ? Date.parse(workout.restUntil) : 0;
  useEffect(() => {
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!visible) return null;
  const seconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const detail =
    `${workout.done}/${workout.total} séries` +
    (seconds
      ? ` · Descanso ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
      : '');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Retomar ${workout.name}. ${detail}`}
      disabled={disabled}
      onPress={() =>
        router.replace({
          pathname: '/treinar',
          params: { profile: profileId, link: workout.linkId },
        })
      }
      style={({ pressed }) => ({
        marginHorizontal: 12,
        marginVertical: 6,
        maxWidth: 720,
        alignSelf: 'center',
        width: '94%',
        minHeight: 56,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#4A6437',
        paddingHorizontal: 12,
        paddingVertical: 7,
        gap: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: pressed ? '#354B27' : '#25371C',
        opacity: disabled ? 0.55 : 1,
      })}
    >
      <Ionicons name="barbell-outline" size={21} color="#C0F568" />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700' }}>
          {workout.name}
        </Text>
        <Text variant="caption">{detail}</Text>
      </View>
      <Text color="#C0F568" style={{ fontSize: 13, fontWeight: '700' }}>
        Retomar
      </Text>
      <Ionicons name="chevron-up" size={16} color="#C0F568" />
    </Pressable>
  );
}
