import { supabase } from '../supabase';
import { fetchAccountIdsForEntity } from './ownership';
import { Logger } from '../logger';

const SUPABASE_URL = 'https://nqeorzwfbtknnvzslsmy.supabase.co';

export async function fetchUserMortgageAccounts(userId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchUserMortgageAccounts', { userId }, 'accounts.ts', transactionId);
  return supabase
    .from('accounts')
    .select('balance, property_id')
    .eq('user_id', userId)
    .eq('type', 'mortgage');
}

export async function fetchMortgagesByPropertyIds(propertyIds: string[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchMortgagesByPropertyIds', { propertyIds }, 'accounts.ts', transactionId);
  if (propertyIds.length === 0) return { data: [], error: null };
  return supabase
    .from('accounts')
    .select('balance, property_id, institution')
    .eq('type', 'mortgage')
    .in('property_id', propertyIds);
}

export async function fetchAccountsByPropertyIds(propertyIds: string[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchAccountsByPropertyIds', { propertyIds }, 'accounts.ts', transactionId);
  if (propertyIds.length === 0) return { data: [], error: null };
  return supabase
    .from('accounts')
    .select('balance, property_id, type, institution')
    //.eq('type', 'mortgage')
    .in('property_id', propertyIds);
}

// Fix: entityIds should be any[] not []
export async function fetchAccountsByUserIds(userIds: any[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchAccountsByUserIds', { userIds }, 'accounts.ts', transactionId);
  if (!userIds || userIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('accounts')
    .select('id, balance, type, institution, property_id, offset_account_id, currency, interest_rate')
    .in('user_id', userIds);
  Logger.info('fetchAccountsByUserIds raw result', { data, error }, 'accounts.ts', transactionId);
  return { data, error };
}

// Fetch accounts for a specific entity (user or organization)
export async function fetchAccountsForEntities(entityIds: any[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  return supabase
    .from('accounts')
    .select('id, balance, type, institution, offset_account_id, property_id, currency, interest_rate')
}

// Fetch ownership breakdown for an account (entity, percentage, entity name)
export async function fetchAccountOwnerships(accountId: number) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchAccountOwnerships called', { accountId }, 'accounts.ts', transactionId);
  const { data, error } = await supabase
    .from('account_ownership')
    .select('entity_id, percentage, entities ( name )')
    .eq('account_id', accountId);
  if (error) {
    Logger.error('fetchAccountOwnerships failed', { accountId, error }, 'accounts.ts', transactionId);
  } else {
    Logger.info('fetchAccountOwnerships success', { accountId, count: Array.isArray(data) ? data.length : 0 }, 'accounts.ts', transactionId);
  }
  return { data, error };
}

// Fetch all savings accounts for a user (for offset mapping)
export async function fetchSavingsAccountsForUser(userId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('fetchSavingsAccountsForUser', { userId }, 'accounts.ts', transactionId);
  const { data, error } = await supabase
    .from('accounts')
    .select('id, type, balance, institution')
    .eq('user_id', userId)
    .eq('type', 'savings');
  if (error) {
    Logger.error('fetchSavingsAccountsForUser failed', { userId, error }, 'accounts.ts', transactionId);
  } else {
    Logger.info('fetchSavingsAccountsForUser success', { userId, count: Array.isArray(data) ? data.length : 0 }, 'accounts.ts', transactionId);
  }
  return { data, error };
}

// Add local CRUD helpers for accounts
export async function createAccount(account: any) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('createAccount called', { account }, 'accounts.ts', transactionId);
  const { data, error } = await supabase.from('accounts').insert([account]).select();
  if (error) {
    Logger.error('createAccount failed', { error }, 'accounts.ts', transactionId);
  } else {
    Logger.info('createAccount success', { data }, 'accounts.ts', transactionId);
  }
  return { data, error };
}
export async function updateAccount(id: any, updates: any) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  if (!id || !updates) {
    Logger.error('updateAccount called with missing parameters', { id, updates }, 'accounts.ts', transactionId);
    return { data: null, error: 'Missing parameters' };
  }
  if ('id' in updates) {
    Logger.warn('updateAccount called with id in updates', { id, updates }, 'accounts.ts', transactionId);
    delete updates.id; // Avoid updating the id field
  }
  // Convert empty string IDs to null for Postgres bigint columns
  if ('property_id' in updates && updates.property_id === '') {
    updates.property_id = null;
  }
  if ('offset_account_id' in updates && updates.offset_account_id === '') {
    updates.offset_account_id = null;
  }
  // Log the update operation
  Logger.info('updateAccount called', { id, updates }, 'accounts.ts', transactionId);
  const { data, error } = await supabase.from('accounts').update(updates).eq('id', id);
  if (error) {
    Logger.error('updateAccount failed', { id, error }, 'accounts.ts', transactionId);
  } else {
    Logger.info('updateAccount success', { id, data }, 'accounts.ts', transactionId);
  }
  return { data, error };
}
export async function deleteAccount(id: any) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('deleteAccount called', { id }, 'accounts.ts', transactionId);
  const { data, error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) {
    Logger.error('deleteAccount failed', { id, error }, 'accounts.ts', transactionId);
  } else {
    Logger.info('deleteAccount success', { id, data }, 'accounts.ts', transactionId);
  }
  return { data, error };
}
