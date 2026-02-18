import { supabase } from '../supabase';
import { Logger } from '../logger';

export async function fetchUserEntities(userId: string) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Fetching user entities', { userId }, 'entities.ts', transactionId);
  const { data, error } = await supabase
    .from('entities')
    .select('id, name, type')
    .eq('user_id', userId);
  if (error) {
    Logger.error('Error fetching user entities', { userId, error }, 'entities.ts', transactionId);
  } else {
    Logger.info('Fetched user entities', { userId, count: data?.length }, 'entities.ts', transactionId);
  }
  return { data, error };
}

export async function createEntity(entity: { name: string; type: string; user_id: string }) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Creating entity', { entity }, 'entities.ts', transactionId);
  const { data, error } = await supabase.from('entities').insert([entity]).select();
  if (error) {
    Logger.error('Error creating entity', { entity, error }, 'entities.ts', transactionId);
  } else {
    Logger.info('Created entity', { entity, data }, 'entities.ts', transactionId);
  }
  return { data, error };
}

export async function updateEntity(id: number, updates: any) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Updating entity', { id, updates }, 'entities.ts', transactionId);
  const { data, error } = await supabase.from('entities').update(updates).eq('id', id);
  if (error) {
    Logger.error('Error updating entity', { id, updates, error }, 'entities.ts', transactionId);
  } else {
    Logger.info('Updated entity', { id, updates, data }, 'entities.ts', transactionId);
  }
  return { data, error };
}

export async function deleteEntity(id: number) {
  const transactionId = Logger.createTransactionId();
  Logger.info('Deleting entity', { id }, 'entities.ts', transactionId);
  const { data, error } = await supabase.from('entities').delete().eq('id', id);
  if (error) {
    Logger.error('Error deleting entity', { id, error }, 'entities.ts', transactionId);
  } else {
    Logger.info('Deleted entity', { id, data }, 'entities.ts', transactionId);
  }
  return { data, error };
}
