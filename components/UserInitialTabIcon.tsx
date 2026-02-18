import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { getCurrentUser } from '@/lib/supabase/auth';

export function UserInitialTabIcon({ color, size }: { color: string; size: number }) {
  const [initial, setInitial] = useState<string>('');

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      const username = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email || '';
      setInitial(username.charAt(0).toUpperCase());
    })();
  }, []);

  return (
    <View
      style={{
        width: size, // match Ionicons width
        height: size, // match Ionicons height
        borderRadius: size / 2,
        backgroundColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        aspectRatio: 1, // ensure perfect square
      }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.7 }}>{initial}</Text>
    </View>
  );
}
