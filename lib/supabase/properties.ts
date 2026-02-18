import { supabase } from '../supabase';
import { Logger } from '../logger';

export async function fetchUserProperties(userId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching user properties', { userId }, 'properties.ts', transactionId);
  const { data, error } = await supabase
    .from('properties')
  .select('id, purchaseprice, currentvalue, address, purchasedate, propertycategory, propertytype, status, saledate')
    .eq('user_id', userId);
  if (error) {
    Logger.error('Error fetching user properties', { userId, error }, 'properties.ts', transactionId);
  } else {
    Logger.info('Fetched user properties', { userId, count: data?.length }, 'properties.ts', transactionId);
  }
  return { data, error };
}

export async function fetchPropertiesByIds(propertyIds: string[]) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching properties by IDs', { propertyIds }, 'properties.ts', transactionId);
  if (propertyIds.length === 0) {
    Logger.warn('No property IDs provided to fetchPropertiesByIds', undefined, 'properties.ts', transactionId);
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from('properties')
  .select('id, purchaseprice, currentvalue, address, purchasedate, propertycategory, propertytype, status, saledate')
    .in('id', propertyIds);
  if (error) {
    Logger.error('Error fetching properties by IDs', { propertyIds, error }, 'properties.ts', transactionId);
  } else {
    Logger.info('Fetched properties by IDs', { propertyIds, count: data?.length }, 'properties.ts', transactionId);
  }
  return { data, error };
}

// Update property details
export async function updateProperty(propertyId: string, updates: any) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Updating property', { propertyId, updates }, 'properties.ts', transactionId);
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', propertyId)
    .single();
  if (error) {
    Logger.error('Error updating property', { propertyId, error }, 'properties.ts', transactionId);
  } else {
    Logger.info('Property updated', { propertyId }, 'properties.ts', transactionId);
  }
  return { data, error };
}

// Add new property
export async function addProperty(property: any) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Adding new property', { property }, 'properties.ts', transactionId);
  const { data, error } = await supabase
    .from('properties')
    .insert([property])
    .single();
  if (error) {
    Logger.error('Error adding property', { error }, 'properties.ts', transactionId);
  } else {
    Logger.info('Property added', { id: data?.id }, 'properties.ts', transactionId);
  }
  return { data, error };
}

// Delete property by id
export async function deleteProperty(propertyId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Deleting property', { propertyId }, 'properties.ts', transactionId);
  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId);
  if (error) {
    Logger.error('Error deleting property', { propertyId, error }, 'properties.ts', transactionId);
  } else {
    Logger.info('Property deleted', { propertyId }, 'properties.ts', transactionId);
  }
  return { data, error };
}
