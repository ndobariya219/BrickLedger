import { fetchTransactions } from '@/lib/supabase/transaction';
import { fetchOwnershipsForProperty } from '@/lib/supabase/ownership';
import { fetchMortgagesByPropertyIds } from '@/lib/supabase/accounts';
import { format } from 'date-fns';

export type EOFYReport = {
  propertyId: string;
  address: string;
  financialYear: string;
  rentalIncome: number;
  interestPaid: number;
  taxDeductibleExpenses: number;
  capitalExpenses: number;
  netCashFlow: number;
  ownerships: Array<{ entity: string; percentage: number }>;
};

export type PnLReport = {
  address: string;
  purchasePrice: number;
  currentvalue: number;
  totalRent: number;
  totalInterest: number;
  totalTaxDeductible: number;
  totalCapitalExpenses: number;
  totalCash: number;
  totalMortgage: number;
  totalPrincipalPayments: number;
  totalOutOfPocket: number;
  netIncome: number;
  totalLiabilities: number;
  totalPL: number;
  totalExpenses: number; // Sum of all expenses
  rentalTransactions: { date: string; description: string; amount: number }[];
  interestTransactions: { date: string; description: string; amount: number }[];
  remainingMortgage: { institution: string; balance: string; }[];
  outOfPocketTransactions: { date: string; description: string; amount: number }[];
  capitalTransactions: { date: string; description: string; amount: number }[];
  otherTransactions: { date: string; description: string; amount: number }[];
  realEstateCosts: number;
  legalCosts: number;
  totalSaleCosts: number;
  suggestedSalePrice: number; // Added suggestedSalePrice here
};

// Australian financial year: July 1 - June 30
export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  return date.getMonth() < 6 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
}

export async function generateEOFYReport({
  userId,
  property,
  year,
}: {
  userId: string;
  property: any;
  year: number;
}): Promise<EOFYReport> {
  // Calculate FY start/end
  const fyStart = new Date(year, 6, 1); // July 1
  const fyEnd = new Date(year + 1, 5, 30, 23, 59, 59); // June 30

  // Fetch all transactions for this property
  const { data: transactions } = await fetchTransactions(userId, property.id);
  const filtered = (transactions || []).filter((t: any) => {
    const d = new Date(t.date);
    return d >= fyStart && d <= fyEnd;
  });

  // Aggregate
  const rentalIncome = filtered.filter(t => t.type === 'RENT').reduce((sum, t) => sum + (t.amount || 0), 0);
  const interestPaid = filtered.filter(t => t.type === 'INTEREST').reduce((sum, t) => sum + (t.amount || 0), 0);
  const taxDeductibleExpenses = filtered.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
  const capitalExpenses = filtered.filter(t => t.type === 'CAPITAL_EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
  const netCashFlow = rentalIncome - interestPaid - taxDeductibleExpenses;

  // Ownership breakdown
  const { data: ownershipsRaw } = await fetchOwnershipsForProperty(property.id);
  const ownerships = (ownershipsRaw || []).map((o: any) => ({
    entity: o.entities?.name || o.entity_id,
    percentage: o.percentage,
  }));

  return {
    propertyId: property.id,
    address: property.address,
    financialYear: getFinancialYear(fyStart),
    rentalIncome,
    interestPaid,
    taxDeductibleExpenses,
    capitalExpenses,
    netCashFlow,
    ownerships,
  };
}


/**
 * Generate PnL report for a property, allowing user to specify real estate and legal costs.
 * @param userId
 * @param property
 * @param realEstateCostInput - { type: 'percent' | 'absolute', value: number }
 * @param legalCosts - absolute value in dollars
 */
export async function exportPnLData({
  userId,
  property,
  realEstateCostInput,
  legalCosts
}: {
  userId: string;
  property: any;
  realEstateCostInput: { type: 'percent' | 'absolute'; value: number };
  legalCosts: number;
}): Promise<PnLReport> {

  // Fetch all transactions for this property
  const { data: transactions } = await fetchTransactions(userId, property.id);
  //filter transactions that are in future
  const currentDate = new Date();
  const filteredTransactions = (transactions || []).filter(t => new Date(t.date) <= currentDate);

  // Aggregate
  const totalRent = filteredTransactions.filter(t => t.type === 'RENT').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalInterest = filteredTransactions.filter(t => t.type === 'INTEREST').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalTaxDeductible = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCapitalExpenses = filteredTransactions.filter(t => t.type === 'CAPITAL_EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalCash = filteredTransactions.filter(t => t.type === 'OUT_OF_POCKET').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalMortgage = filteredTransactions.filter(t => t.type === 'MORTGAGE').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPrincipalPayments = totalMortgage - totalInterest; // Total principal paid
  const totalOutOfPocket = totalPrincipalPayments + totalCash;
  const netIncome = (totalRent - totalTaxDeductible - totalInterest);
  
  const propertyIds = [property.id]; // Assuming propertyIds is an array of property IDs
  const propertyAccounts = await fetchMortgagesByPropertyIds(propertyIds);
  
  const propertyAccountsData = propertyAccounts.data || [];
  const totalLiabilities = propertyAccountsData.reduce((sum: number, a: { balance?: number }) => sum + (a.balance || 0), 0);

  // Calculate real estate costs
  let realEstateCosts = 0;
  if (realEstateCostInput.type === 'percent') {
    realEstateCosts = property.currentvalue * (realEstateCostInput.value / 100);
  } else {
    realEstateCosts = realEstateCostInput.value;
  }
  // legalCosts is now passed in as a parameter
  const totalSaleCosts = realEstateCosts + legalCosts;

  const totalPL = property.currentvalue + netIncome - totalOutOfPocket - totalLiabilities - totalSaleCosts;

  // For suggestedSalePrice, use the same logic but with user input
  // To make $35,000 profit after real estate and legal costs:
  // (totalOutOfPocket + totalLiabilities + 35000 + legalCosts) / (1 - realEstateCostPercent)
  let realEstateCostPercent = realEstateCostInput.type === 'percent' ? realEstateCostInput.value / 100 : (realEstateCosts / property.currentvalue);
  const suggestedSalePrice = totalOutOfPocket + totalLiabilities + legalCosts + realEstateCosts + 35000;

  const PnLReport: PnLReport = {
    address: property.address,
    currentvalue: property.currentvalue,
    purchasePrice: property.purchaseprice,
    totalRent,
    totalInterest,
    totalTaxDeductible,
    totalCapitalExpenses,
    totalCash,
    totalMortgage,
    totalPrincipalPayments,
    totalOutOfPocket,
    netIncome,
    totalLiabilities,
    totalPL,
    totalExpenses: totalTaxDeductible + totalCapitalExpenses + totalInterest, // Sum of all expenses
    rentalTransactions: (transactions || []).filter(t => t.type === 'RENT').map(t => ({ date: t.date, description: t.description, amount: t.amount })),
    interestTransactions: (transactions || []).filter(t => t.type === 'INTEREST').map(t => ({ date: t.date, description: t.description, amount: t.amount })),
    remainingMortgage: (propertyAccountsData || []).map(t => ({ institution: t.institution || 'Remaining Mortgage', balance: t.balance || 0 })),
    outOfPocketTransactions: (transactions || []).filter(t => t.type === 'OUT_OF_POCKET').map(t => ({ date: t.date, description: t.description, amount: t.amount })),
    capitalTransactions: (transactions || []).filter(t => t.type === 'CAPITAL_EXPENSE').map(t => ({ date: t.date, description: t.description, amount: t.amount })), 
    otherTransactions: (transactions || []).filter(t => t.type === 'EXPENSE').map(t => ({ date: t.date, description: t.description, amount: t.amount })),
    realEstateCosts,
    legalCosts,
    totalSaleCosts,
    suggestedSalePrice
  };

  return PnLReport;
}
