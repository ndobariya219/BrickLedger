import { supabase } from '../supabase';
import { Logger } from '../logger';

export interface AutoTransactionConfig {
  user_id: string;
  frequency: string;
  notify: boolean;
}

const TABLE = 'auto_transaction_config';

export async function getAutoTransactionConfig(user_id: string): Promise<{ data: AutoTransactionConfig | null, error: any }> {
  const transactionId = Logger.createTransactionId();
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', user_id)
      .single();
    if (error) {
      Logger.error('Failed to fetch auto transaction config', { error }, 'auto_transaction_config.ts', transactionId);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (error) {
    Logger.error('Exception in getAutoTransactionConfig', { error }, 'auto_transaction_config.ts', transactionId);
    return { data: null, error };
  }
}

export async function setAutoTransactionConfig(config: AutoTransactionConfig): Promise<{ data: any, error: any }> {
  const transactionId = Logger.createTransactionId();
  try {
    // Upsert (insert or update)
    const { data, error } = await supabase
      .from(TABLE)
      .upsert([config], { onConflict: 'user_id' });
    if (error) {
      Logger.error('Failed to upsert auto transaction config', { error }, 'auto_transaction_config.ts', transactionId);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (error) {
    Logger.error('Exception in setAutoTransactionConfig', { error }, 'auto_transaction_config.ts', transactionId);
    return { data: null, error };
  }
}
