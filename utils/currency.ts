import { Logger } from '@/lib/logger';

// Currency conversion utility for BrickLedger
// Fetch live rates from exchangerate.host, cache for 1 hour

// Static rates for demo; in production, fetch from a reliable API
export const CURRENCY_TO_AUD: Record<string, number> = {
  AUD: 1,
  USD: 1.5, // 1 USD = 1.5 AUD (example rate)
  INR: 0.018, // 1 INR = 0.018 AUD (example rate)
};

// Fetch live currency rates from exchangerate.host (free, no API key required)
let liveRates: Record<string, number> | null = null;
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

async function fetchLiveRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (liveRates && now - lastFetch < CACHE_DURATION) {
    Logger.debug('[currency] Using cached liveRates', { lastFetch, now });
    return liveRates;
  }
  try {
    Logger.debug('[currency] Fetching live rates from open.er-api.com');
    const res = await fetch('https://open.er-api.com/v6/latest/AUD');
    const data = await res.json();
    Logger.debug('[currency] open.er-api.com response', { data });
    if (data && data.rates) {
      liveRates = data.rates;
      lastFetch = now;
      Logger.debug('[currency] Live rates fetched', { rates: liveRates });
      return liveRates || CURRENCY_TO_AUD;
    }
  } catch (e) {
    Logger.error('[currency] Failed to fetch live rates', { error: e });
    // fallback to static rates if fetch fails
    return CURRENCY_TO_AUD;
  }
  Logger.warn('[currency] No live rates, using static rates');
  return CURRENCY_TO_AUD;
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  Logger.debug('[currency] convertCurrency called', { amount, fromCurrency, toCurrency });
  if (fromCurrency === toCurrency) return amount;
  const rates = await fetchLiveRates();
  Logger.debug('[currency] Fetched rates for conversion', { 'AUD': rates['AUD'], 'INR': rates['INR'], 'USD': rates['USD'] });
  const fromRate = rates[fromCurrency] || (CURRENCY_TO_AUD[fromCurrency] || 1);
  const toRate = rates[toCurrency] || (CURRENCY_TO_AUD[toCurrency] || 1);
  Logger.debug('[currency] Conversion rate used', { fromCurrency, toCurrency, fromRate, toRate });
  return amount * toRate / fromRate;
}
