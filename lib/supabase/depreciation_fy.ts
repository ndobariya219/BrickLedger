import { supabase } from '../supabase';
import { Logger } from '../logger';

export type DepreciationFY = {
  id?: string;
  user_id: string;
  property_id: number;
  fy_start_year: number; // e.g., 2024 for FY24-25
  amount: number;
  created_at?: string;
};

export async function fetchFYDepForUser(userId: string) {
  const tx = Logger.createTransactionId();
  Logger.info('Fetching FY depreciation for user', { userId }, 'depreciation_fy.ts', tx);
  const { data, error } = await supabase
    .from('property_depreciation_fy')
    .select('*')
    .eq('user_id', userId)
    .order('fy_start_year', { ascending: true });
  if (error) Logger.error('Error fetching FY depreciation for user', { error }, 'depreciation_fy.ts', tx);
  else Logger.debug('Fetched FY depreciation for user', { count: data?.length }, 'depreciation_fy.ts', tx);
  return { data, error };
}

export async function fetchFYDepForProperty(userId: string, propertyId: number) {
  const tx = Logger.createTransactionId();
  Logger.info('Fetching FY depreciation for property', { userId, propertyId }, 'depreciation_fy.ts', tx);
  const { data, error } = await supabase
    .from('property_depreciation_fy')
    .select('*')
    .eq('user_id', userId)
    .eq('property_id', propertyId)
    .order('fy_start_year', { ascending: true });
  if (error) Logger.error('Error fetching FY depreciation for property', { error }, 'depreciation_fy.ts', tx);
  else Logger.debug('Fetched FY depreciation for property', { count: data?.length }, 'depreciation_fy.ts', tx);
  return { data, error };
}

export async function fetchFYDepForProperties(userId: string, propertyIds: number[]) {
  const tx = Logger.createTransactionId();
  Logger.info('Fetching FY depreciation for properties', { userId, propertyIdsCount: propertyIds?.length || 0 }, 'depreciation_fy.ts', tx);
  if (!propertyIds || propertyIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('property_depreciation_fy')
    .select('*')
    .eq('user_id', userId)
    .in('property_id', propertyIds)
    .order('fy_start_year', { ascending: true });
  if (error) Logger.error('Error fetching FY depreciation for properties', { error }, 'depreciation_fy.ts', tx);
  else Logger.debug('Fetched FY depreciation for properties', { count: data?.length }, 'depreciation_fy.ts', tx);
  return { data, error };
}

export async function upsertFYDep(row: DepreciationFY) {
  const tx = Logger.createTransactionId();
  Logger.info('Upserting FY depreciation', { row }, 'depreciation_fy.ts', tx);
  const payload = { ...row } as any;
  if (!payload.id) delete payload.id;
  const { data, error } = await supabase
    .from('property_depreciation_fy')
    .upsert(payload, { onConflict: 'user_id,property_id,fy_start_year' })
    .select()
    .single();
  if (error) Logger.error('Error upserting FY depreciation', { error }, 'depreciation_fy.ts', tx);
  else Logger.info('FY depreciation upserted', { id: data?.id }, 'depreciation_fy.ts', tx);
  return { data, error };
}

export async function deleteFYDep(id: string) {
  const tx = Logger.createTransactionId();
  Logger.info('Deleting FY depreciation', { id }, 'depreciation_fy.ts', tx);
  const { error } = await supabase
    .from('property_depreciation_fy')
    .delete()
    .eq('id', id);
  if (error) Logger.error('Error deleting FY depreciation', { id, error }, 'depreciation_fy.ts', tx);
  else Logger.info('FY depreciation deleted', { id }, 'depreciation_fy.ts', tx);
  return { error };
}
