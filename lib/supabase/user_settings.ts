import { supabase } from '../supabase';
import { Logger } from '../logger';

export type ScoreWeights = { growth: number; roi: number; cashflow: number; pl: number };

export const DEFAULT_WEIGHTS: ScoreWeights = { growth: 1, roi: 2, cashflow: 0.5, pl: 3 };

export async function loadScoreWeights(userId: string): Promise<ScoreWeights> {
  const tx = Logger.createTransactionId();
  Logger.info('Loading score weights (user_settings table)', { userId }, 'user_settings.ts', tx);
  if (!userId) return DEFAULT_WEIGHTS;
  const { data, error } = await supabase
    .from('user_settings')
    .select('score_weights')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    Logger.error('Failed to load weights from user_settings', { error }, 'user_settings.ts', tx);
    return DEFAULT_WEIGHTS;
  }
  const weights = (data as any)?.score_weights;
  if (weights && typeof weights === 'object') {
    Logger.info('Loaded score weights from table', { weights }, 'user_settings.ts', tx);
    return {
      growth: Number(weights.growth) || DEFAULT_WEIGHTS.growth,
      roi: Number(weights.roi) || DEFAULT_WEIGHTS.roi,
      cashflow: Number(weights.cashflow) || DEFAULT_WEIGHTS.cashflow,
      pl: Number(weights.pl) || DEFAULT_WEIGHTS.pl,
    };
  }
  Logger.info('No row in user_settings, using defaults', { userId }, 'user_settings.ts', tx);
  return DEFAULT_WEIGHTS;
}