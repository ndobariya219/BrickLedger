import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut, getCurrentUser } from '@/lib/supabase/auth';
import { Logger } from '@/lib/logger';
import { getUserAccountScreenStyles } from '@/styles/UserAccountScreenStyles';
import { useColorScheme } from '@/components/useColorScheme';
import { useEntityContext } from '@/components/EntityContext';
import { DEFAULT_WEIGHTS } from '@/lib/supabase/user_settings';

export default function UserAccountScreen() {
  const router = useRouter();
  const [userInitial, setUserInitial] = useState<string>('');
  const scheme = 'light'; //useColorScheme();
  const styles = getUserAccountScreenStyles(scheme);
  
  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      // Try username, then full_name, then email
      const username = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email || '';
      setUserInitial(username.charAt(0).toUpperCase());
    })();
  }, []);

  const handleLogout = async () => {
    await signOut();
    Logger.info('User logged out', {}, 'UserAccountScreen.tsx');
    router.replace('/auth');
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{userInitial}</Text>
      </View>
      
      {/* <User actions: Change Password and Update User Details>
      <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Change Password</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleUpdateDetails}>
        <Text style={styles.buttonText}>Update User Details</Text>
      </TouchableOpacity>
      </User actions> */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.buttonText, { color: '#fff' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
