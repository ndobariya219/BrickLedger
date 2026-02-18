import { supabase } from '../supabase';
import { Logger } from '../logger';

export async function fetchPropertyIdsForEntity(entityId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching property IDs for entity', { entityId }, 'ownership.ts', transactionId);
  const { data: ownerships, error } = await supabase
    .from('property_ownership')
    .select('property_id')
    .eq('entity_id', entityId);
  if (error) {
    Logger.error('Error fetching property IDs for entity', { entityId, error }, 'ownership.ts', transactionId);
    return { data: [], error };
  }
  const propertyIds = (ownerships || []).map((o: any) => o.property_id);
  Logger.debug('Fetched property IDs for entity', { entityId, count: propertyIds.length }, 'ownership.ts', transactionId);
  return { data: propertyIds, error: null };
}


export async function fetchEntityOwnershipsForProperties(entityIds: any[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching entity ownerships for properties', { entityIds }, 'ownership.ts', transactionId);
  if (!entityIds || entityIds.length === 0) {
    Logger.warn('No entity IDs provided to fetchEntityOwnershipsForProperties', undefined, 'ownership.ts', transactionId);
    return { data: [], error: null };
  }
  // Remove 'all' if present
  entityIds = entityIds.filter((id: any) => id !== 'all');
  if (entityIds.length === 0) {
    Logger.warn('No valid entity IDs provided after filtering', undefined, 'ownership.ts', transactionId);
    return { data: [], error: null };
  }
  const result = await supabase
    .from('property_ownership')
    .select('property_id, percentage, entity_id, entities ( name )')
    .in('entity_id', entityIds);
  if (result.error) {
    Logger.error('Error fetching entity ownerships for properties', { entityIds, error: result.error });
  } else {
    Logger.debug('Fetched entity ownerships for properties', { entityIds, count: result.data?.length });
  }
  return result;
}

export async function fetchOwnershipsForProperty(propertyId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching ownerships for property', { propertyId }, 'ownership.ts', transactionId);
  const result = await supabase
    .from('property_ownership')
    .select('property_id, percentage, entity_id, entities ( name )')
    .eq('property_id', propertyId);
  if (result.error) {
    Logger.error('Error fetching ownerships for property', { propertyId, error: result.error }, 'ownership.ts', transactionId);
  } else {
    Logger.debug('Fetched ownerships for property', { propertyId, count: result.data?.length }, 'ownership.ts', transactionId);
  }
  return result;
}

export async function fetchUserOwnerships(userId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching ownerships for user', { userId }, 'ownership.ts', transactionId);
  const result = await supabase
    .from('property_ownership')
    .select('property_id, percentage, entity_id, entities ( name )')
    .eq('user_id', userId);
  if (result.error) {
    Logger.error('Error fetching ownerships for user', { userId, error: result.error }, 'ownership.ts', transactionId);
  } else {
    Logger.debug('Fetched ownerships for user', { userId, count: result.data?.length }, 'ownership.ts', transactionId);
  }
  return result;
}

export async function addAccountOwnerships(ownershipRows: Array<{ account_id: number, entity_id: string, percentage: number }>) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('addAccountOwnerships called', { count: ownershipRows.length }, 'ownership.ts', transactionId);
  const { data, error } = await supabase.from('account_ownership').insert(ownershipRows);
  if (error) {
    Logger.error('addAccountOwnerships failed', { error }, 'ownership.ts', transactionId);
  } else {
    Logger.info('addAccountOwnerships success', { count: data ? (data as any[]).length : 0 }, 'ownership.ts', transactionId);
  }
  return { data, error };
}

export async function deleteAccountOwnerships(accountId: number) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('deleteAccountOwnerships called', { accountId }, 'ownership.ts', transactionId);
  const { data, error } = await supabase.from('account_ownership').delete().eq('account_id', accountId);
  if (error) {
    Logger.error('deleteAccountOwnerships failed', { accountId, error }, 'ownership.ts', transactionId);
  } else {
    Logger.info('deleteAccountOwnerships success', { accountId, data }, 'ownership.ts', transactionId);
  }
  return { data, error };
}

export async function deletePropertyOwnerships(propertyId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('deletePropertyOwnerships called', { propertyId }, 'ownership.ts', transactionId);
  const { data, error } = await supabase.from('property_ownership').delete().eq('property_id', propertyId);
  if (error) {
    Logger.error('deletePropertyOwnerships failed', { propertyId, error }, 'ownership.ts', transactionId);
  } else {
    Logger.info('deletePropertyOwnerships success', { propertyId, data }, 'ownership.ts', transactionId);
  }
  return { data, error };
}
