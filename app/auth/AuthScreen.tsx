import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Logger } from '@/lib/logger';
import { useColorScheme } from '@/components/useColorScheme';
import { getAuthScreenStyles } from '@/styles/AuthScreenStyles';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  // Load saved email on mount
  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        Logger.error('Failed to load remembered email', { error: e }, 'AuthScreen.tsx');
      }
    })();
  }, []);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const router = useRouter();
  const scheme = 'light'; //useColorScheme();
  const styles = getAuthScreenStyles(scheme);

  const handleSignIn = async () => {
    if (rememberMe && email) {
      try {
        await AsyncStorage.setItem('rememberedEmail', email);
      } catch (e) {
        Logger.error('Failed to save remembered email', { error: e }, 'AuthScreen.tsx');
      }
    } else {
      await AsyncStorage.removeItem('rememberedEmail');
    }
    Logger.debug('handleSignIn: called', {}, 'AuthScreen.tsx');
    // const transactionId = Logger.createTransactionId();
    const transactionId = 'test-tx-id';
    Logger.info('Attempting sign in', { email }, 'AuthScreen.tsx', transactionId);
    if (!email || !password) {
      Logger.debug('Missing Fields: Please enter both email and password.', { email }, 'AuthScreen.tsx', transactionId);
      return;
    }
    setLoading(true);
    Logger.debug('handleSignIn: before try', {}, 'AuthScreen.tsx', transactionId);
    try {
      Logger.debug('Calling supabase.auth.signInWithPassword', { email, password }, 'AuthScreen.tsx', transactionId);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      Logger.debug('signInWithPassword result (full)', { data, error, session: data?.session, user: data?.user }, 'AuthScreen.tsx', transactionId);
      setLoading(false);
      if (error) {
        const { reset, resetError } = await supabase.auth.updateUser({ password }); // Try updating password in case of reset
        if (resetError) {
          Logger.error('Sign in failed', { email, error, resetError }, 'AuthScreen.tsx', transactionId);
        } else {
          Logger.info('Password reset successful during sign-in attempt', { email }, 'AuthScreen.tsx', transactionId);
        }
        Logger.debug('Sign In Error', { error, email }, 'AuthScreen.tsx', transactionId);
      } else if (!data?.user) {
        Logger.debug('Sign In Error: No user returned. Please check your credentials.', { email, data }, 'AuthScreen.tsx', transactionId);
      } else if (!data?.session) {
        Logger.debug('Sign In Error: No session returned. There may be a Supabase client or environment issue.', { email, data }, 'AuthScreen.tsx', transactionId);
      } else {
        Logger.debug('Sign In Success: You are signed in!', { email }, 'AuthScreen.tsx', transactionId);
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      Logger.debug('Sign In Error', { error: err, email }, 'AuthScreen.tsx', transactionId);
    }
  };

  const handleSignUp = async () => {
    if (rememberMe && email) {
      try {
        await AsyncStorage.setItem('rememberedEmail', email);
      } catch (e) {
        Logger.error('Failed to save remembered email', { error: e }, 'AuthScreen.tsx');
      }
    } else {
      await AsyncStorage.removeItem('rememberedEmail');
    }
    const transactionId = Logger.createTransactionId();
    Logger.info('Attempting sign up', { email }, 'AuthScreen.tsx', transactionId);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      Logger.error('Sign up failed', { email, error }, 'AuthScreen.tsx', transactionId);
      Logger.debug('Sign Up Error', { error, email }, 'AuthScreen.tsx', transactionId);
    } else {
      Logger.info('Sign up successful', { email }, 'AuthScreen.tsx', transactionId);
      Logger.debug('Registration Success: Check your email for confirmation.', { email }, 'AuthScreen.tsx', transactionId);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
        <Text style={styles.welcome}>Welcome to BrickLedger</Text>
        <Text style={styles.subtitle}>Sign in or create an account to manage your property investments.</Text>
        <View style={styles.formCard}>
          <Text style={styles.title}>{mode === 'signIn' ? 'Sign In' : 'Sign Up'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: '#ccc', true: '#2eaf7d' }}
              thumbColor={rememberMe ? '#2eaf7d' : '#f4f3f4'}
            />
            <Text style={{ marginLeft: 8, color: '#555' }}>Remember Me</Text>
          </View>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={{ color: '#2eaf7d', marginLeft: 8 }}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{mode === 'signIn' ? 'Sign In' : 'Sign Up'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
            <Text style={styles.linkButtonText}>
              {mode === 'signIn' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
