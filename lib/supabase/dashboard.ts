import { fetchUserProperties, fetchPropertiesByIds } from './properties';
import { fetchUserMortgageAccounts, fetchMortgagesByPropertyIds } from './accounts';
import { fetchPropertyIdsForEntity } from './ownership';
import { supabase } from '../supabase';
import { Logger } from '../logger';

// Fetch properties for a specific entity via ownership table
export async function fetchPropertiesForEntity(entityId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching properties for entity', { entityId }, 'dashboard.ts', transactionId);
  const { data: propertyIds, error } = await fetchPropertyIdsForEntity(entityId);
  if (error) {
    Logger.error('Error fetching property IDs for entity', { entityId, error }, 'dashboard.ts', transactionId);
    return { data: [], error };
  }
  const result = await fetchPropertiesByIds(propertyIds);
  Logger.info('Fetched properties for entity', { entityId, count: result.data?.length }, 'dashboard.ts', transactionId);
  return result;
}

// Fetch mortgages for a specific entity via ownership table
export async function fetchMortgagesForEntity(entityId: string) {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.info('Fetching mortgages for entity', { entityId }, 'dashboard.ts', transactionId);
  const { data: propertyIds, error } = await fetchPropertyIdsForEntity(entityId);
  if (error) {
    Logger.error('Error fetching property IDs for entity (mortgages)', { entityId, error }, 'dashboard.ts', transactionId);
    return { data: [], error };
  }
  const result = await fetchMortgagesByPropertyIds(propertyIds);
  Logger.info('Fetched mortgages for entity', { entityId, count: result.data?.length }, 'dashboard.ts', transactionId);
  return result;
}

// Moved getCurrentUser to auth.ts
