import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '@/lib/supabase/auth';

export default function IndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUser();
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth');
      }
    }
    checkAuth();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2eaf7d" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
