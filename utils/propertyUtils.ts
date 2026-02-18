// Utility to check if a property is an investment property
export function isInvestmentProperty(property: any): boolean {
  return property.propertycategory === 'INVESTMENT';
}

// Clamp a number between min and max
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

// Compute simple capital growth percentage for a property
export function computeGrowthPercent(property: any): number {
  const current = Number(property?.currentvalue) || 0;
  const purchase = Number(property?.purchaseprice) || 0;
  if (purchase <= 0 || current <= 0) return 0;
  return ((current - purchase) / purchase) * 100; // percentage
}

// Compute annualised ROI (CAGR) for a property in percentage
export function computeAnnualisedROIPercent(property: any): number {
  const current = Number(property?.currentvalue) || 0;
  const purchase = Number(property?.purchaseprice) || 0;
  const purchasedate = property?.purchasedate ? new Date(property.purchasedate) : null;
  if (!purchasedate || purchase <= 0 || current <= 0) return 0;
  const yearsHeld = Math.max(
    1 / 12,
    (Date.now() - purchasedate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  const cagr = Math.pow(current / purchase, 1 / yearsHeld) - 1;
  return cagr * 100; // percentage
}

export type PropertyTransactions = Array<{
  amount: number;
  type: string; // RENT | EXPENSE | INTEREST | MORTGAGE | OUT_OF_POCKET | ...
}>;

// Compute net cashflow (sum) from transactions for a property
export function computeNetCashflow(transactions: PropertyTransactions): number {
  if (!transactions || transactions.length === 0) return 0;
  let income = 0;
  let expenses = 0;
  let interest = 0;
  transactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    switch (t.type) {
      case 'RENT':
        income += amt;
        break;
      case 'EXPENSE':
        expenses += amt;
        break;
      case 'INTEREST':
        interest += amt;
        break;
      default:
        break;
    }
  });
  const netIncome = income - expenses - interest;
  return netIncome; // absolute cashflow (excl tax savings)
}

// Compute sum from transactions of a specific type for a property
export function computeSumPerTransactionType(transactions: PropertyTransactions, type: string): number {
  if (!transactions || transactions.length === 0) return 0;
  let sum = 0;
  transactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    switch (t.type) {
      case type:
        sum += amt;
        break;
      default:
        break;
    }
  });
  return sum; // total
}

// Compute a simple Profit & Loss ratio relative to purchase price
export function computePL(
  property: any,
  transactions: PropertyTransactions,
  mortgageBalance: number
): number {
  const current = Number(property?.currentvalue) || 0;
  const totalIncome = computeSumPerTransactionType(transactions, 'RENT');
  const totalExpenses = computeSumPerTransactionType(transactions, 'EXPENSE');
  const totalInterest = computeSumPerTransactionType(transactions, 'INTEREST');
  const totalCash = computeSumPerTransactionType(transactions, 'OUT_OF_POCKET');
  
  const totalPrincipalPayments = computeSumPerTransactionType(transactions, 'MORTGAGE') - totalInterest
  const totalOutOfPocket = totalPrincipalPayments + totalCash;
  const netIncome = (totalIncome - totalExpenses - totalInterest);
  const totalPL = property.currentvalue + netIncome - totalOutOfPocket - mortgageBalance;
  
  return totalPL; // ratio (can be negative)
}

export type PropertyScoreBreakdown = {
  growth: number; // contribution to 0-100 based on weight
  roi: number; // contribution to 0-100 based on weight
  cashflow: number; // contribution to 0-100 based on weight
  pl: number; // contribution to 0-100 based on weight
};

export type PropertyScoreResult = {
  score: number; // 0-100
  breakdown: PropertyScoreBreakdown;
};

// Compute a 0-100 score based on available metrics.
// Missing metrics are ignored and weights re-normalised.
/**
 * Computes a property score (0–100) from key metrics using weighted contributions.
 *
 * Step-by-step overview:
 * 1) Inputs: `growthPercent`, `roiPercent`, `cashflowYieldPercent`, `pl` (absolute $), and optional `weights`.
 * 2) Conditional weights:
 *    - For non-PPOR (investment), defaults are: growth 20, ROI 40, cashflow 10, PL 50.
 *    - For PPOR, only growth and ROI are considered with defaults: growth 40, ROI 60; cashflow and PL are excluded.
 * 3) Availability: If a metric is missing (NaN) or excluded (PPOR), its weight is not counted in the sum.
 * 4) Normalisation (raw → 0..1):
 *    - growth: maps roughly −20%..+20% → 0..1 via `(growth + 20) / 40`.
 *    - ROI: maps roughly −5%..+8% → 0..1 via `(roi + 5) / 13`.
 *    - cashflow yield: maps roughly −5%..+5% → 0..1 via `(yield + 5) / 10`.
 *    - PL: maps roughly $−30k..$+30k → 0..1 via `(pl + 30000) / 60000`.
 *    Values outside those ranges are clamped to stay within 0..1.
 * 5) Contribution per metric (to 0..100):
 *    - `contrib = (weight / availableWeightSum) * normalisedValue * 100`.
 * 6) Final score: Sum all metric contributions and clamp to [0, 100].
 *
 * Detailed examples:
 * A) Investment property example
 *    Inputs: growth=15%, ROI=6%, cashflow yield=3%, PL=$20,000; category=INVESTMENT.
 *    Weights (defaults): growth=20, ROI=30, cashflow=10, PL=40 → availableWeightSum=100.
 *    Normalised:
 *      - growth: (15 + 20) / 40 = 0.875
 *      - ROI:    (6 + 5) / 13 ≈ 0.8462
 *      - CF:     (3 + 5) / 10 = 0.8
 *      - PL:     (20000 + 30000) / 60000 ≈ 0.8333
 *    Contributions:
 *      - growth: (20/100) * 0.875 * 100 ≈ 17.5
 *      - ROI:    (30/100) * 0.8462 * 100 ≈ 25.39
 *      - CF:     (10/100) * 0.8 * 100 ≈ 8
 *      - PL:     (40/100) * 0.8333 * 100 ≈ 33.33
 *    Score ≈ 17.5 + 25.39 + 8 + 33.33 ≈ 84.22 (clamped to [0, 100]).
 *
 * B) PPOR example
 *    Inputs: growth=10%, ROI=5%; category=PPOR (cashflow and PL ignored).
 *    Weights (defaults): growth=40, ROI=60 → availableWeightSum=100.
 *    Normalised:
 *      - growth: (10 + 20) / 40 = 0.75
 *      - ROI:    (5 + 5) / 13 ≈ 0.7692
 *    Contributions:
 *      - growth: (40/100) * 0.75 * 100 = 30.0
 *      - ROI:    (60/100) * 0.7692 * 100 ≈ 46.15
 *    Score ≈ 30.0 + 46.15 ≈ 76.15 (clamped to [0, 100]).
 */
export function computePropertyScore(params: {
  propertyCategory?: 'ppor' | 'leased' | string; // used to apply conditional weighting
  growthPercent?: number; // e.g., 12.5
  roiPercent?: number; // e.g., 8.2
  cashflowYieldPercent?: number; // net cashflow / currentvalue * 100
  pl?: number; // absolute $ value
  weights?: Partial<PropertyScoreBreakdown>; // weights as portions of 100; auto re-normalised
}): PropertyScoreResult {
  
  const growthRaw = params.growthPercent ?? NaN;
  const roiRaw = params.roiPercent ?? NaN;
  const cfRaw = params.cashflowYieldPercent ?? NaN;
  const plRaw = params.pl ?? NaN;

  // Determine conditional defaults based on property category
  const isPPOR = (params.propertyCategory ?? '').toLowerCase() === 'ppor';
  const defaultWeights: PropertyScoreBreakdown = isPPOR
    ? { growth: 40, roi: 60, cashflow: 0, pl: 0 }
    : { growth: 20, roi: 30, cashflow: 10, pl: 40 };

  // Merge provided weights with defaults (PPOR ignores cashflow/pl)
  const w = {
    growth: isPPOR ? 40 : (params.weights?.growth ?? defaultWeights.growth),
    roi: isPPOR ? 60 : (params.weights?.roi ?? defaultWeights.roi),
    cashflow: isPPOR ? 0 : (params.weights?.cashflow ?? defaultWeights.cashflow),
    pl: isPPOR ? 0 : (params.weights?.pl ?? defaultWeights.pl),
  };

  // Availability flags
  const available = {
    growth: Number.isFinite(growthRaw),
    roi: Number.isFinite(roiRaw),
    cashflow: isPPOR ? false : Number.isFinite(cfRaw), // PPOR excludes cashflow from scoring
    pl: isPPOR ? false : Number.isFinite(plRaw), // PPOR excludes PL from scoring
  };

  const availableWeightSum =
    (available.growth ? w.growth : 0) +
    (available.roi ? w.roi : 0) +
    (available.cashflow ? w.cashflow : 0) +
    (available.pl ? w.pl : 0);

  // Normalise growth: maps roughly 0%..+15% to 0..1.
  // Examples: +15% -> 15/15=1; -15% -> -15/15=0; +10% -> 10/15=0.6667.
  const normGrowth = available.growth ? clamp(growthRaw / 15, 0, 1) : 0; // 0%..+15%
  // Normalise ROI: maps roughly 0%..+5% to 0..1.
  // Examples: +5% -> 5/5=1; 0% -> 0/5=0; 2% -> 2/5=0.4.
  const normROI = available.roi ? clamp(roiRaw / 5, 0, 1) : 0; // 0..5%
  // Normalise cashflow yield: maps roughly -5%..+5% to 0..1.
  // Examples: +5% -> (5+5)/10=1; -5% -> (−5+5)/10=0; +2% -> (2+5)/10=0.7; -2% -> (−2+5)/10=0.3.
  const normCF = available.cashflow ? clamp((cfRaw + 5) / 10, 0, 1) : 0; // -5%..+5%
  // Normalise Profit/Loss: maps roughly $-30k..$+30k to 0..1; clamps outside.
  // Examples: +$30k -> (30000+30000)/60000=1; -$30k -> (−30000+30000)/60000=0; $0 -> 0.5.
  const normPL = available.pl ? clamp((plRaw + 30000) / 60000, 0, 1) : 0;
  
  // Contribution for each metric to 0..100
  const contrib = (weight: number, norm: number) => {
    if (availableWeightSum <= 0) return 0;
    return (weight / availableWeightSum) * norm * 100;
  };

  const breakdown: PropertyScoreBreakdown = {
    growth: contrib(w.growth, normGrowth),
    roi: contrib(w.roi, normROI),
    cashflow: contrib(w.cashflow, normCF),
    pl: contrib(w.pl, normPL),
  };

  const score = clamp(
    breakdown.growth + breakdown.roi + breakdown.cashflow + breakdown.pl,
    0,
    100
  );
  return { score, breakdown };
}
