import { supabase } from '../supabase';
import { Logger } from '../logger';

export type Transaction = {
  id: number;
  user_id: string;
  propertyid: number;
  
  entity_id?: number;
  date: string;
  description: string;
  amount: number;
  type: string;
};

// Fetch all transactions for a user, optionally filtered by property
export async function fetchTransactions(userId: string, propertyId?: number) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Fetching transactions', { userId, propertyId }, 'transaction.ts', transactionId);
  let query = supabase
    .from('transactions')
    .select(`
      id,
      user_id,
      propertyid,
      entity_id,
      date,
      description,
      amount,
      type,
      property:properties!transactions_propertyid_fkey(id, address)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (propertyId) {
    query = query.eq('propertyid', propertyId);
  }
  const { data, error } = await query;
  if (error) {
    Logger.error('Error fetching transactions', { error }, 'transaction.ts', transactionId);
  } else {
    Logger.debug('Fetched transactions', { count: data?.length }, 'transaction.ts', transactionId);
  }
  return { data, error };
}

// Create a new transaction
export async function createTransaction(transaction: Omit<Transaction, 'id'>) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Creating transaction', { transaction }, 'transaction.ts', transactionId);
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .single();
  if (error) {
    Logger.error('Error creating transaction', { error }, 'transaction.ts', transactionId);
  } else {
    Logger.info('Transaction created', { data }, 'transaction.ts', transactionId);
  }
  return { data, error };
}

// Update an existing transaction
export async function updateTransaction(id: number, updates: Partial<Transaction>) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Updating transaction', { id, updates }, 'transaction.ts', transactionId);
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .single();
  if (error) {
    Logger.error('Error updating transaction', { id, error }, 'transaction.ts', transactionId);
  } else {
    Logger.info('Transaction updated', { id }, 'transaction.ts', transactionId);
  }
  return { data, error };
}

// Delete a transaction
export async function deleteTransaction(id: number) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Deleting transaction', { id }, 'transaction.ts', transactionId);
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error) {
    Logger.error('Error deleting transaction', { id, error }, 'transaction.ts', transactionId);
  } else {
    Logger.info('Transaction deleted', { id }, 'transaction.ts', transactionId);
  }
  return { error };
}
