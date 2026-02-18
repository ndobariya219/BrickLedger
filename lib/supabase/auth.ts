import { supabase } from '../supabase';
import { Logger } from '../logger';

export async function signOut() {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Signing out user', undefined, 'auth.ts', transactionId);
  try {
    Logger.debug('Calling supabase.auth.signOut()', undefined, 'auth.ts', transactionId);
    const result = await supabase.auth.signOut();
    Logger.debug('supabase.auth.signOut() result', { result }, 'auth.ts', transactionId);
    if (result.error) {
      Logger.error('Sign out failed', { error: result.error }, 'auth.ts', transactionId);
    } else {
      Logger.info('User signed out successfully', undefined, 'auth.ts', transactionId);
    }
    return result;
  } catch (err) {
    Logger.error('Exception during sign out', { error: err }, 'auth.ts', transactionId);
    throw err;
  }
}

export async function getCurrentUser() {
  Logger.info('Fetching current user', undefined, 'auth.ts');
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    Logger.error('Error fetching current user', { error }, 'auth.ts');
    return null;
  }
  Logger.info('Fetched current user', { userId: data.user?.id }, 'auth.ts');
  return data.user;
}
