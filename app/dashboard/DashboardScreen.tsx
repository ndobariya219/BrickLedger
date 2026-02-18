import React, { useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, Dimensions, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { fetchUserProperties } from '@/lib/supabase/properties';
import { fetchUserMortgageAccounts, fetchAccountsForEntities } from '@/lib/supabase/accounts';
import { getCurrentUser } from '@/lib/supabase/auth';
import { fetchPropertiesForEntity, fetchMortgagesForEntity } from '@/lib/supabase/dashboard';
import { loadScoreWeights } from '@/lib/supabase/user_settings';
import { signOut } from '@/lib/supabase/auth';
import { useRouter } from 'expo-router';
import { useEntityContext } from '@/components/EntityContext';
import { fetchEntityOwnershipsForProperties } from '@/lib/supabase/ownership';
import { Logger } from '@/lib/logger';
import { MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { getDashboardScreenStyles } from '@/styles/DashboardScreenStyles';
import { fetchFYDepForUser, fetchFYDepForProperties } from '@/lib/supabase/depreciation_fy';

import {
  computeGrowthPercent,
  computeAnnualisedROIPercent,
  computeNetCashflow,
  computePL,
  computePropertyScore,
} from '@/utils/propertyUtils';


const chartColors = [
  '#2eaf7d', '#4e8cff', '#f7b731', '#eb3b5a', '#8854d0', '#20bf6b', '#fd9644', '#a55eea', '#26de81', '#fc5c65',
];

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(46, 175, 125, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(68, 68, 68, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7
};


export default function DashboardScreen() {
  const { entities, selectedEntity, setSelectedEntity, loading: entityLoading, error: entityError, userId } = useEntityContext();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [ownerships, setOwnerships] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [soldProperties, setSoldProperties] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const scheme = 'light'; //useColorScheme();
  const styles = getDashboardScreenStyles(scheme);
  const router = useRouter();


  const [weights, setWeights] = useState<any>(null);
  useEffect(() => {
    let isMounted = true;
    async function fetchWeights() {
      if (!userId) return;
      try {
        const w = await loadScoreWeights(userId);
        if (isMounted) setWeights(w);
      } catch (e) {
        Logger.error('Error loading score weights', { error: e }, 'DashboardScreen.tsx');
      }
    }
    fetchWeights();
    return () => { isMounted = false; };
  }, [userId]);

  // Ensure selectedEntity is set on first login or when entities are loaded
  useEffect(() => {
    Logger.info('useEffect: selectedEntity/entities/setSelectedEntity changed', { selectedEntity, entities }, 'DashboardScreen.tsx');
    if (!selectedEntity && entities && entities.length > 0 && setSelectedEntity) {
      Logger.debug('Setting default selectedEntity in DashboardScreen', { entities }, 'DashboardScreen.tsx');
      setSelectedEntity('all'); // or entities[0].id if you want to default to first entity
    }
  }, [selectedEntity, entities, setSelectedEntity]);

  useEffect(() => {
    Logger.info('useEffect: entities/selectedEntity/entityLoading/entityError/userId changed', { entities, selectedEntity, entityLoading, entityError, userId }, 'DashboardScreen.tsx');
  }, [entities, selectedEntity, entityLoading, entityError, userId]);

  const fetchDashboard = React.useCallback(async () => {
    Logger.debug('Starting fetchDashboard', { selectedEntity, entities, userId }, 'DashboardScreen.tsx');
    if (!entities || entities.length === 0 || !selectedEntity) return;
    setLoading(true);
    setError(null);
    const transactionId = Logger.createTransactionId();
    Logger.info('Fetching dashboard data', { selectedEntity, userId }, 'DashboardScreen.tsx', transactionId);
    try {
      // Get current user
      const user = await getCurrentUser();
      setUser(user);
      if (!user) {
        Logger.warn('No user logged in, redirecting to auth', undefined, 'DashboardScreen.tsx', transactionId);
        setDashboardData(null);
        setError('No user logged in.');
        setLoading(false);
        router.replace('/auth');
        return;
      }
      // Refresh score weights on each dashboard refresh
      try {
        const latestWeights = await loadScoreWeights(user.id);
        setWeights(latestWeights);
        Logger.debug('Refreshed score weights during dashboard fetch', { latestWeights }, 'DashboardScreen.tsx', transactionId);
      } catch (e) {
        Logger.error('Error refreshing score weights during dashboard fetch', { error: e }, 'DashboardScreen.tsx', transactionId);
      }
      // Fetch ownerships for pie chart
      let ownershipsData: any[] = [];
      if (selectedEntity !== 'all') {
        const entity = (entities || []).find((e: any) => String(e.id) === String(selectedEntity));
        if (entity) {
          const { data, error } = await fetchEntityOwnershipsForProperties([entity.id]);
          if (error) {
            Logger.error('Error fetching ownerships for entity', { entityId: entity.id, error }, 'DashboardScreen.tsx', transactionId);
            setError('Error fetching ownerships: ' + error.message);
            setLoading(false);
            return;
          }
          ownershipsData = data || [];
        }
      } else {
        const { data, error } = await fetchEntityOwnershipsForProperties(entities.map((e: any) => e.id));
        if (error) {
          Logger.error('Error fetching ownerships for all entities', { error });
          setError('Error fetching ownerships: ' + error.message);
          setLoading(false);
          return;
        }
        ownershipsData = data || [];
      }
      setOwnerships(ownershipsData);
      Logger.debug('Ownerships fetched', { count: ownershipsData.length });
      // Fetch properties and mortgages for the user or selected entity
      let propertiesData, propError, mortgagesData, mortError, accountsData, accountsError;
      if (selectedEntity !== 'all') {
        const propRes = await fetchPropertiesForEntity(selectedEntity);
        propertiesData = propRes.data;
        propError = propRes.error;
        const mortRes = await fetchMortgagesForEntity(selectedEntity);
        mortgagesData = mortRes.data;
        mortError = mortRes.error;
        const accountsRes = await fetchAccountsForEntities([selectedEntity]);
        accountsData = accountsRes.data;
        accountsError = accountsRes.error;
      } else {
        const propRes = await fetchUserProperties(user.id);
        propertiesData = propRes.data;
        propError = propRes.error;
        const mortRes = await fetchUserMortgageAccounts(user.id);
        mortgagesData = mortRes.data;
        mortError = mortRes.error;
        const accountsRes = await fetchAccountsForEntities(entities.map((e: any) => e.id));
        accountsData = accountsRes.data;
        accountsError = accountsRes.error;
      }
      if (propError) {
        Logger.error('Error fetching properties', { error: propError });
        setError('Error fetching properties: ' + propError.message);
        setLoading(false);
        return;
      }
      // Exclude sold properties
      const unsoldProperties = (propertiesData || []).filter((p: any) => {
        // if purchasedate is in future, exclude
        if (new Date(p.purchasedate) > new Date()) return false;
        if (p.status !== 'sold') return true;
        if (p.status === 'sold' && p.saledate) {
          const saleDateObj = new Date(p.saledate);
          return saleDateObj > new Date();
        }
        return false;
      });
      const soldProperties = (propertiesData || []).filter((p: any) => p.status === 'sold');
      setSoldProperties(soldProperties);
      // Sort unsold properties by purchase date ascending
      const sortedProperties = unsoldProperties.sort((a: any, b: any) => new Date(a.purchasedate).getTime() - new Date(b.purchasedate).getTime());
      setProperties(sortedProperties);
      Logger.debug('Properties fetched', { count: sortedProperties.length });
      if (mortError) {
        Logger.error('Error fetching mortgages', { error: mortError });
        setError('Error fetching mortgages: ' + mortError.message);
        setLoading(false);
        return;
      }
      setMortgages(mortgagesData || []);
      if (accountsError) {
        Logger.error('Error fetching accounts', { error: accountsError });
        setError('Error fetching accounts: ' + accountsError.message);
        setLoading(false);
        return;
      }
      Logger.info('Calculating dashboard metrics', { propertiesCount: sortedProperties.length, mortgagesCount: (mortgagesData || []).length, accountsCount: (accountsData || []).length }, 'DashboardScreen.tsx', transactionId);
      calculateDashboard(sortedProperties, mortgagesData || [], accountsData || []);
    } catch (err: any) {
      Logger.error('Unexpected error in fetchDashboard', {
        error: err,
        errorMessage: err?.message,
        errorStack: err?.stack,
        errorString: String(err),
        errorMeys: err && typeof err === 'object' ? Object.keys(err) : undefined,
      });
      setError('Unexpected error: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }, [router, selectedEntity, entities, userId]);

  

  useFocusEffect(
    React.useCallback(() => {
      Logger.info('useFocusEffect: DashboardScreen focused, triggering fetchDashboard', undefined, 'DashboardScreen.tsx');
      fetchDashboard();
    }, [fetchDashboard])
  );

  // Recalculate dashboard when entity, properties, mortgages, or accounts change
  useEffect(() => {
    Logger.info('useEffect: selectedEntity/properties/mortgages/accounts changed', { selectedEntity, properties, mortgages, accounts }, 'DashboardScreen.tsx');
    if (!user) return;
    if (!accounts || accounts.length === 0) {
      Logger.debug('Skipping dashboard recalculation: accounts not loaded or empty', { accountsLength: accounts?.length });
      return;
    }
    Logger.debug('Recalculating dashboard metrics due to entity/properties/mortgages/accounts change', { selectedEntity });
    calculateDashboard(properties, mortgages, accounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, properties, mortgages, accounts]);

  // Format property addresses for better readability (multi-line or truncated)
  const formatAddress = (address: string) => {
    if (!address) return '';
    // Split by comma, show street and suburb/city on two lines if possible
    const parts = address.split(' ');
    if (parts.length > 1) {
      // Show street on first line, suburb/city on second line (trimmed)
      return `${parts[0].trim()}\r${parts[1].trim()}`;
    }
    // Truncate if too long, but keep at least 2 lines if possible
    if (address.length > 18) {
      return address.slice(0, 15) + '...';
    }
    return address;
  };

  // Calculate entity ownership by value for pie chart
  const entityValueMap: { [entityId: string]: { name: string; value: number } } = {};
  let totalPortfolioValue = 0;
  // Exclude sold properties
  const unsoldProperties = (properties || []).filter((p: any) => {
    // if purchasedate is in future, exclude
    if (new Date(p.purchasedate) > new Date()) return false;
    if (p.status !== 'sold') return true;
    if (p.status === 'sold' && p.saledate) {
      const saleDateObj = new Date(p.saledate);
      return saleDateObj > new Date();
    }
    return false;
  });

  unsoldProperties.forEach((property: any) => {
    const propertyValue = Number(property.currentvalue) || 0;
    totalPortfolioValue += propertyValue;
    // Find all ownerships for this property
    ownerships.filter((o: any) => o.property_id === property.id).forEach((o: any) => {
      const entityId = o.entity_id;
      const entityName = o.entities?.name || o.entityname || 'Entity';
      const percent = Number(o.percentage ?? o.ownership_percent);
      const share = propertyValue * (isNaN(percent) ? 0 : percent / 100);
      if (!entityValueMap[entityId]) {
        entityValueMap[entityId] = { name: entityName, value: 0 };
      }
      entityValueMap[entityId].value += share;
    });
  });
  // Pie chart data (ensure all values are numbers)
  const pieData = Object.entries(entityValueMap)
    .map(([entityId, { name, value }], idx) => ({
      key: entityId,
      value: typeof value === 'number' ? value : Number(value) || 0,
      svg: { fill: chartColors[idx % chartColors.length] },
      arc: { outerRadius: '100%', padAngle: 0.03 },
      label: name,
      percent: totalPortfolioValue > 0 ? (((typeof value === 'number' ? value : Number(value) || 0) / totalPortfolioValue) * 100).toFixed(2) : '0',
    }))
    .filter((o: any) => o.value > 0);

  // Bar chart data (ensure all values are numbers)
  const barData = (selectedEntity === 'all'
    ? unsoldProperties.map((p: any) => {
      const value = Number(p.currentvalue);
      // For 'all', show 100% value
      return {
        value: isNaN(value) ? 0 : value,
        label: '', // not used for x-axis
        propertyAddress: p.address,
        svg: { fill: '#2eaf7d' },
      };
    })
    : unsoldProperties
      .map((p: any) => {
        // Find ownership for this property and selected entity
        const ownership = ownerships.find((o: any) => o.property_id === p.id && String(o.entity_id) === String(selectedEntity));
        if (!ownership) return null;
        const percent = Number(ownership.percentage ?? ownership.ownership_percent) || 0;
        const value = Number(p.currentvalue) * (percent / 100);
        return {
          value: isNaN(value) ? 0 : value,
          label: '', // not used for x-axis
          propertyAddress: p.address,
          svg: { fill: chartColors[0] },
        };
      })
      .filter((b: any) => b && b.value > 0)
  );
  // Bar chart data for react-native-chart-kit
  const filteredBarData = barData.filter((item) => item !== null);
  const barChartLabels = filteredBarData.map((item) => formatAddress(item.propertyAddress));
  const barChartValues = filteredBarData.map((item) => item.value);

  // Pie chart data for react-native-chart-kit
  // Show legend as 'entityName - %allocation' (no value at start)
  const pieChartData = pieData.map((item, idx) => ({
    name: `${item.label} - ${item.percent}%`,
    population: item.value,
    color: chartColors[idx % chartColors.length],
    legendFontColor: '#444',
    legendFontSize: 13,
  }));

  // Chart dimensions
  const screenWidth = Dimensions.get('window').width - 40; // padding

  const calculateDashboard = (properties: any[], mortgages: any[], accounts: any[]) => {
    // Exclude sold properties
    const unsoldProperties = (properties || []).filter((p: any) => {
      // if purchasedate is in future, exclude
      if (new Date(p.purchasedate) > new Date()) return false;
      // if not sold, include
      if (p.status !== 'sold') return true;
      // if saledate is in future, include
      if (p.status === 'sold' && p.saledate) {
        const saleDateObj = new Date(p.saledate);
        return saleDateObj > new Date();
      }
      return false;
    });
    let totalAssets = 0;
    let totalLiabilities = 0;
    let equity = 0;
    let capitalGrowth = 0;
    let roi = 0;
    let sellOffExclPPOR = 0;
    let totalPurchase = 0;

    // Build a map of property_id to ownership percentage for the selected entity or user
    const ownershipMap: { [propertyId: string]: number } = {};
    ownerships.forEach((o: any) => {
      if (unsoldProperties.some((p) => p.id === o.property_id)) {
        if (selectedEntity !== 'all') {
          if (String(o.entity_id) === String(selectedEntity)) {
            ownershipMap[o.property_id] = Number(o.percentage ?? o.ownership_percent) || 0;
          }
        } else {
          // For 'all', sum all ownerships for each property (should be 100% for user's portfolio)
          ownershipMap[o.property_id] = (ownershipMap[o.propertyId] || 0) + (Number(o.percentage ?? o.ownership_percent) || 0);
        }
      }
    });
    var pporPropertyId = unsoldProperties.find((p) => p.propertycategory === 'OWNER_OCCUPIED')?.id;
    // For 'all', treat as 100% ownership for each property
    unsoldProperties.forEach((p) => {
      let percent = 1;
      if (selectedEntity !== 'all') {
        percent = (ownershipMap[p.id] || 0) / 100;
      }
      totalAssets += (p.currentvalue || 0) * percent;
      if(p.propertycategory !== 'OWNER_OCCUPIED') {
        sellOffExclPPOR += (p.currentvalue || 0) * percent;
      }
      totalPurchase += (p.purchaseprice || 0) * percent;
    });
    capitalGrowth = totalPurchase > 0 ? (((totalAssets - totalPurchase) / totalPurchase) * 100) : 0;

    // Liabilities as per ownership of the property
    mortgages.forEach((m) => {
      let percent = 1;
      if (selectedEntity !== 'all') {
        percent = (ownershipMap[m.property_id] || 0) / 100;
      }
      totalLiabilities += (m.balance || 0) * percent;
      if(m.property_id !== pporPropertyId) {
        sellOffExclPPOR -= (m.balance || 0) * percent;
      }
    });
    let lvr = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    equity = (totalAssets * 0.8) - totalLiabilities;
    
    let currentAssets = 0;
    accounts.forEach((a) => {
      // ignore foreign currency accounts for now, and only include savings accounts in AUD for current assets calculation
      if (a.type.toLowerCase() === 'savings' && a.currency.toUpperCase() === 'AUD') {
        currentAssets += Number(a.balance) || 0;
      }
    });


    // Annualised ROI (CAGR): ((final / initial)^(1/years)) - 1
    let annualisedROI = 0;

    Logger.debug('ROI Calculation: Start', { totalPurchase, totalAssets, totalLiabilities, propertiesCount: unsoldProperties.length });

    if (totalPurchase > 0) {
      let weightedYears = 0;
      let totalWeight = 0;

      unsoldProperties.forEach((p) => {
        let percent = 1;
        if (selectedEntity !== 'all') {
          percent = (ownershipMap[p.id] || 0) / 100;
        }

        const purchaseValue = (p.purchaseprice || 0) * percent;
        if (purchaseValue > 0 && p.purchasedate) {
          const yearsHeld = Math.max(
            1 / 12,
            (new Date().getTime() - new Date(p.purchasedate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
          );
          Logger.debug('ROI Calculation: Property', { propertyId: p.id, purchaseValue, yearsHeld, percent, purchasedate: p.purchasedate });
          weightedYears += yearsHeld * purchaseValue;
          totalWeight += purchaseValue;
        } else {
          Logger.debug('ROI Calculation: Skipped property', { propertyId: p.id, purchaseValue, purchasedate: p.purchasedate });
        }
      });

      const avgYears = totalWeight > 0 ? weightedYears / totalWeight : 1;
      Logger.debug('ROI Calculation: Aggregates', { weightedYears, totalWeight, avgYears, totalAssets, totalPurchase });

      if (avgYears > 0 && totalAssets > 0) {
        annualisedROI = Math.pow(totalAssets / totalPurchase, 1 / avgYears) - 1;
        annualisedROI = annualisedROI * 100; // convert to percentage
        Logger.debug('ROI Calculation: Final', { annualisedROI, totalAssets, totalPurchase, avgYears });
      } else {
        Logger.debug('ROI Calculation: Skipped final calculation', { avgYears, totalAssets });
      }
    } else {
      Logger.debug('ROI Calculation: Skipped, totalPurchase <= 0', { totalPurchase });
    }
    roi = annualisedROI;


    setDashboardData({
      totalAssets,
      totalLiabilities,
      equity,
      capitalGrowth: capitalGrowth.toFixed(2),
      roi: roi.toFixed(2),
      sellOffExclPPOR: sellOffExclPPOR.toFixed(2),
      lvr: lvr.toFixed(2),
      currentAssets: currentAssets,
    });
  };

  // --- New: Calculate summary metrics for portfolio ---
  // Assume you have a function to fetch all transactions for the selected entity/entities
  // For now, use mock data or add logic to fetch and aggregate
  const [summaryMetrics, setSummaryMetrics] = useState<any>(null);
  const [propertyScores, setPropertyScores] = useState<any[]>([]);
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [selectedScore, setSelectedScore] = useState<any | null>(null);
  const [chartTab, setChartTab] = useState<'distribution' | 'ownership'>('distribution');
  const [isFinancialSummaryExpanded, setIsFinancialSummaryExpanded] = useState(false);

  useEffect(() => {
    Logger.info('useEffect: properties/accounts/mortgages/weights changed (summary metrics)', { properties, soldProperties, accounts, mortgages, weights }, 'DashboardScreen.tsx');
    async function fetchAndCalculateSummary() {
      let transactions: any[] = [];
      let error: any = null;
      if (!userId) return;
      // Current FY range (AU): Jul 1 to Jun 30
      const today = new Date();
      const fyStart = today.getMonth() < 6 ? new Date(today.getFullYear() - 1, 6, 1) : new Date(today.getFullYear(), 6, 1);
      const fyEnd = today.getMonth() < 6 ? new Date(today.getFullYear(), 5, 30, 23, 59, 59) : new Date(today.getFullYear() + 1, 5, 30, 23, 59, 59);
      if (selectedEntity === 'all') {
        // Fetch all transactions for user
        const res = await import('@/lib/supabase/transaction');
        const { data, error: txError } = await res.fetchTransactions(userId);
        transactions = data || [];
        error = txError;
      } else {
        // Fetch all property IDs for this entity
        const { fetchPropertyIdsForEntity } = await import('@/lib/supabase/ownership');
        const { fetchTransactions } = await import('@/lib/supabase/transaction');
        const { data: propertyIds, error: propErr } = await fetchPropertyIdsForEntity(selectedEntity);
        if (propErr) return;
        // Fetch all transactions for each property
        let allTx: any[] = [];
        for (const pid of propertyIds) {
          const { data: txs, error: txErr } = await fetchTransactions(userId, pid);
          if (txErr) continue;
          allTx = allTx.concat(txs || []);
        }
        transactions = allTx;
      }

      // Aggregate using correct type values
      let overallIncome = 0;
      let overallOutOfPocket = 0;
      let overallMortgagePayments = 0;
      let overallTaxDeductibleExpenses = 0;
      let overallInterest = 0;
      let saleProceeds = 0;
      transactions.forEach((t: any) => {
        // Income: RENT
        if (t.type === 'RENT') overallIncome += Number(t.amount) || 0;
        // Capital: CAPITAL_EXPENSE
        if (t.type === 'OUT_OF_POCKET') overallOutOfPocket += Number(t.amount) || 0;
        // Mortgage Payment: MORTGAGE
        if (t.type === 'MORTGAGE') overallMortgagePayments += Number(t.amount) || 0;
        // Deductible: EXPENSE
        if (t.type === 'EXPENSE') overallTaxDeductibleExpenses += Number(t.amount) || 0;
        // Expense: MORTGAGE, INTEREST, EXPENSE
        if (t.type === 'INTEREST') overallInterest += Number(t.amount) || 0;
      });
      saleProceeds = soldProperties.reduce((sum, p) => {
        return sum + (p.currentvalue || 0);
      }, saleProceeds);
      
      overallMortgagePayments = overallMortgagePayments - overallInterest

      // Fetch FY depreciation for current scope (simple per-FY amount)
      let depreciationFY = 0;
      try {
        const fyStartYear = fyStart.getFullYear();
        if (selectedEntity === 'all') {
          const { data: rows } = await fetchFYDepForUser(userId);
          depreciationFY = (rows || []).filter((r: any) => Number(r.fy_start_year) === fyStartYear).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        } else {
          const { fetchPropertyIdsForEntity } = await import('@/lib/supabase/ownership');
          const { data: propertyIds } = await fetchPropertyIdsForEntity(selectedEntity);
          const { data: rows } = await fetchFYDepForProperties(userId, propertyIds || []);
          depreciationFY = (rows || []).filter((r: any) => Number(r.fy_start_year) === fyStartYear).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
        }
      } catch (e) {
        Logger.error('Error computing depreciation for dashboard', { error: e }, 'DashboardScreen.tsx');
      }

      const effectiveIncome = overallIncome - overallInterest - overallTaxDeductibleExpenses - depreciationFY;
      const taxSavings = effectiveIncome < 0 ? Math.abs(effectiveIncome) * 0.43 : 0; // assumed blended rate
      const totalAssets = properties.reduce((sum, p) => sum + (Number(p.currentvalue) || 0), 0);
      const totalLiabilities = mortgages.reduce((sum, m) => sum + (Number(m.balance) || 0), 0);
      const totalPurchase = properties.reduce((sum, p) => sum + (Number(p.purchaseprice) || 0), 0);
      Logger.debug('Total assets/liabilities/purchase', { totalAssets, totalLiabilities, totalPurchase });
      Logger.debug('Overall income/expenses/tax', { overallIncome, overallOutOfPocket, overallTaxDeductibleExpenses, taxSavings, effectiveIncome });
      const overallPL = totalAssets + overallIncome + saleProceeds - (overallOutOfPocket + overallTaxDeductibleExpenses + overallInterest) - (overallMortgagePayments) - totalLiabilities;
      
      setSummaryMetrics({
        overallIncome,
        overallOutOfPocket,
        overallMortgagePayments,
        overallInterest,
        overallTaxDeductibleExpenses,
        taxSavings,
        effectiveIncome,
        overallPL,
        saleProceeds
      });

      // --- Property-level scores ---
      try {
        // Group transactions by propertyid
        const txByProperty: Record<string, any[]> = {};
        (transactions || []).forEach((t: any) => {
          const pid = String(t.propertyid ?? t.property_id ?? '');
          if (!pid) return;
          if (!txByProperty[pid]) txByProperty[pid] = [];
          txByProperty[pid].push(t);
        });

        // Map of mortgage balances by property
        const mortgageBalanceByProperty: Record<string, number> = {};
        (mortgages || []).forEach((m: any) => {
          const pid = String(m.property_id ?? m.propertyid ?? '');
          if (!pid) return;
          const bal = Number(m.balance) || 0;
          mortgageBalanceByProperty[pid] = (mortgageBalanceByProperty[pid] || 0) + bal;
        });

        const allProperties = properties.concat(soldProperties);

        const scores = allProperties.map((p: any) => {
          const pid = String(p.id);
          const txs = txByProperty[pid] || [];
          const mortgageBal = mortgageBalanceByProperty[pid] || 0;

          const growthPct = computeGrowthPercent(p);
          const roiPct = computeAnnualisedROIPercent(p);
          const netCashflow = computeNetCashflow(
            txs.map((t: any) => ({ amount: Number(t.amount) || 0, type: String(t.type) }))
          );
          const current = Number(p.currentvalue) || 0;
          const cashflowYieldPct = current > 0 ? (netCashflow / current) * 100 : undefined;
          const pl = computePL(
            p,
            txs.map((t: any) => ({ amount: Number(t.amount) || 0, type: String(t.type) })),
            mortgageBal
          );

          
          const { score, breakdown } = computePropertyScore({
            propertyCategory: p.status?.toLowerCase(),
            growthPercent: Number.isFinite(growthPct) ? growthPct : undefined,
            roiPercent: Number.isFinite(roiPct) ? roiPct : undefined,
            cashflowYieldPercent: Number.isFinite(cashflowYieldPct as number)
              ? (cashflowYieldPct as number)
              : undefined,
            pl: Number.isFinite(pl) ? pl : undefined,
            weights: weights || undefined,
          });

          return {
            propertyId: p.id,
            address: p.address,
            tag: p.status?.toUpperCase().replace('_', ' '),
            score,
            breakdown,
            growthPct,
            roiPct,
            cashflowYieldPct,
            pl,
          };
        });

        Logger.info('Computed property scores', { count: scores.length }, 'DashboardScreen.tsx');
        setPropertyScores(scores);
      } catch (e: any) {
        Logger.error('Error computing property scores', { error: e }, 'DashboardScreen.tsx');
      }
    }
    fetchAndCalculateSummary();
  }, [properties, soldProperties, accounts, mortgages, weights]);

  // No helper needed for FY model; we sum matching FY amounts.

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth');
  };

  const getInitials = (email?: string) => {
    if (!email) return '?';
    return email[0].toUpperCase();
  };

  // Helper for tax suggestions
  function getTaxSuggestions({ roi, capitalGrowth, totalLiabilities }: any) {
    const suggestions = [];
    if (capitalGrowth > 15) suggestions.push('Consider capital gains tax planning.');
    if (totalLiabilities > 1000000) suggestions.push('Prepay interest to maximise deductions.');
    if (suggestions.length === 0) suggestions.push('Review deductible expenses for savings.');
    return suggestions.slice(0, 2);
  }

  if (loading || entityLoading || entities.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#2eaf7d" />
      </View>
    );
  }

  if (error || entityError) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>{error || entityError}</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: 'gray', fontSize: 16, textAlign: 'center' }}>No data available.</Text>
      </View>
    );
  }

  // Format currency helper
  const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return value;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const clampWidth = (score: number) => {
    if (typeof score !== 'number' || Number.isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score: number) => {
    const s = clampWidth(score);
    if (s < 50) return '#eb3b5a'; // red
    if (s < 80) return '#fd9644'; // orange
    return '#2eaf7d'; // green
  };

  // Weight controls moved to UserAccountScreen

  let renderError: Error | null = null;
  let content = null;
  let health: any = null;
  let taxSuggestions: any = null;
  try {
    // Portfolio Health Card (move below title)
    taxSuggestions = getTaxSuggestions(dashboardData);
  } catch (err: any) {
    Logger.error('Render error in DashboardScreen', { error: err });
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>A render error occurred: {err?.message || String(err)}</Text>
      </View>
    );
  }
  return (
    <ScrollView style={[styles.container]} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{flex: 1}}>
        <View style={[styles.headerRow, { marginBottom: 12, marginTop: 6 }]}> 
          <Text style={[styles.headerText, { fontSize: 24 }]}>Portfolio Overview</Text>
        </View>
        
        {selectedEntity === 'all' && (
          <View style={[styles.card, {
            backgroundColor: '#e1f0ff',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            paddingHorizontal: 10,
            elevation: 1,
          }]}
          >
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 6, marginBottom: 4 }}>
              <Text style={[styles.label, { textAlign: 'left' }]}>Portfolio Summary</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {/* ROI */}
                <MaterialCommunityIcons name="chart-bell-curve" size={18} color="#f7b731" />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#f7b731', marginTop: 1 }}>{dashboardData.roi}%</Text>
                <Text style={{ fontSize: 12, color: '#f7b731', marginTop: 1 }}>ROI</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {/* Growth */}
                <MaterialCommunityIcons name="trending-up" size={18} color="#8854d0" />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#8854d0', marginTop: 1 }}>{dashboardData.capitalGrowth}%</Text>
                <Text style={{ fontSize: 12, color: '#8854d0', marginTop: 1 }}>Growth</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                {/* Portfolio LVR */}
                <MaterialCommunityIcons name="percent" size={18} color="#fd9644" />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fd9644', marginTop: 1 }}>{dashboardData.lvr}%</Text>
                <Text style={{ fontSize: 12, color: '#fd9644', marginTop: 1 }}>Portfolio LVR</Text>
              </View>
            </View>
            <View style={{ height: 2, backgroundColor: '#ccc', width: '100%', marginVertical: 10 }} />
            {/* Portfolio Value Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 2 }}>
              <MaterialCommunityIcons name="home-analytics" size={22} color="#4e8cff" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: '#4e8cff', fontWeight: '600', flex: 1 }}>Fixed Assets</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4e8cff' }}>{formatCurrency(dashboardData.totalAssets)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
              <MaterialCommunityIcons name="cash-100" size={22} color="#4e8cff" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: '#4e8cff', fontWeight: '600', flex: 1 }}>Current Assets</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4e8cff' }}>{formatCurrency(dashboardData.currentAssets)}</Text>
            </View>
            
            {/* Total Debt Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
              <MaterialCommunityIcons name="credit-card-outline" size={22} color="#eb3b5a" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: '#eb3b5a', fontWeight: '600', flex: 1 }}>Liabilities</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#eb3b5a' }}>{formatCurrency(dashboardData.totalLiabilities)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
              <MaterialCommunityIcons name="bank-outline" size={22} color="#20bf6b" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: '#20bf6b', fontWeight: '600', flex: 1 }}>Net Worth</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#20bf6b' }}>{formatCurrency((dashboardData.totalAssets + dashboardData.currentAssets) - dashboardData.totalLiabilities)}</Text>
            </View>
            {/* Equity Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 }}>
              <MaterialCommunityIcons name="lock-open-outline" size={22} color="#006400" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 14, color: 'darkgreen', fontWeight: '600', flex: 1 }}>Unlocked Equity</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#006400' }}>{formatCurrency(dashboardData.equity)}</Text>
            </View>

          </View>

        )}
        
        {/* Combined Chart Widget: Tabs for Distribution and Ownership */}
        <View style={styles.chartCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#ddd' }}>
              <TouchableOpacity
                onPress={() => setChartTab('distribution')}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: chartTab === 'distribution' ? '#eafaf3' : '#fff' }}
              >
                <Text style={{ fontSize: 12, fontWeight: chartTab === 'distribution' ? '700' : '400', color: chartTab === 'distribution' ? '#2eaf7d' : '#444' }}>
                  Portfolio Distribution
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setChartTab('ownership')}
                style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: chartTab === 'ownership' ? '#eafaf3' : '#fff' }}
              >
                <Text style={{ fontSize: 12, fontWeight: chartTab === 'ownership' ? '700' : '400', color: chartTab === 'ownership' ? '#2eaf7d' : '#444' }}>
                  Portfolio Ownership
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {chartTab === 'distribution' ? (
            barChartValues.length > 0 ? (
              <>
                {/* Single horizontal stacked bar */}
                <View style={{ flexDirection: 'row', width: '100%', height: 28, borderRadius: 10, overflow: 'hidden', backgroundColor: '#eafaf3', marginBottom: 18 }}>
                  {filteredBarData.map((item, idx) => {
                    const percent =
                      barChartValues.reduce((a, b) => a + b, 0) > 0
                        ? (item.value / barChartValues.reduce((a, b) => a + b, 0)) * 100
                        : 0;
                    return (
                      <View
                        key={idx}
                        style={{ flex: percent, height: '100%', backgroundColor: chartColors[idx % chartColors.length], justifyContent: 'center', alignItems: 'center' }}
                      >
                        {percent > 10 && (
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                            {percent.toFixed(2)}%
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                {/* Legend below the bar */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                  {filteredBarData.map((item, idx) => (
                    <View
                      key={idx}
                      style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}
                    >
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: chartColors[idx % chartColors.length], marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: '#444' }} numberOfLines={1} ellipsizeMode="tail">
                        {item.propertyAddress} - {formatCurrency(item.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.noChartData}>No property data</Text>
            )
          ) : (
            // Ownership tab
            selectedEntity !== 'all' ? (
              <Text style={styles.noChartData}>Switch to 'All' to view ownership split</Text>
            ) : (
              loading ? (
                <ActivityIndicator size="large" color="#2eaf7d" style={{ marginVertical: 24 }} />
              ) : pieChartData.length > 0 ? (
                <>
                  {/* Single horizontal stacked bar for ownership split */}
                  <View style={{ flexDirection: 'row', width: '100%', height: 28, borderRadius: 10, overflow: 'hidden', backgroundColor: '#eafaf3', marginBottom: 18 }}>
                    {pieData.map((item, idx) => (
                      <View
                        key={item.key}
                        style={{
                          flex: parseFloat(item.percent),
                          height: '100%',
                          backgroundColor: chartColors[idx % chartColors.length],
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {parseFloat(item.percent) > 10 && (
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                            {item.percent}%
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                  {/* Legend below the bar */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                    {pieData.map((item, idx) => (
                      <View
                        key={item.key}
                        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 }}
                      >
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: chartColors[idx % chartColors.length], marginRight: 6 }} />
                        <Text style={{ fontSize: 13, color: '#444' }} numberOfLines={1} ellipsizeMode="tail">
                          {item.label} - {item.percent}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noChartData}>No ownership data</Text>
              )
            )
          )}
        </View>

        {/* Top Properties */}
        {propertyScores && propertyScores.length > 0 && (
          <View style={[styles.card, { paddingVertical: 12 }]}> 
            <Text style={[styles.label, { marginBottom: 8 }]}>Top Performers</Text>
            {/* Top 3 properties by score only if score >= 70 */}
            {propertyScores
              .filter((ps) => ps.score >= 70)
              .slice()
              .sort((a, b) => b.score - a.score)
              .slice(0, 3)
              .map((ps) => (
                <View key={`top-${ps.propertyId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name="star" size={18} color="#f7b731" style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#444' }} numberOfLines={1} ellipsizeMode="tail">
                    {ps.address}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: getScoreColor(ps.score) }}>{Math.round(ps.score)}/100</Text>
                </View>
              ))}
          </View>
        )}

        {/* Property Scores */}
        {propertyScores && propertyScores.length > 0 && (
          <View style={[styles.card, { paddingVertical: 12 }]}> 
            <Text style={[styles.label, { marginBottom: 8 }]}>Property Scores</Text>
            {propertyScores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((ps) => (
              <View key={ps.propertyId} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name={ps.tag === 'SOLD' ? 'sale' : 'home'} size={18} color={ps.tag === 'SOLD' ? '#c0392b' : '#2eaf7d'} style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#444' }} numberOfLines={1} ellipsizeMode="tail">
                    {ps.address}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: getScoreColor(ps.score), marginRight: 8 }}>{Math.round(ps.score)}/100</Text>
                  <TouchableOpacity onPress={() => { setSelectedScore(ps); setBreakdownModalVisible(true); }}>
                    <Text style={{ fontSize: 12, color: '#4e8cff' }}>Details</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ width: '100%', height: 10, borderRadius: 6, backgroundColor: '#eafaf3', overflow: 'hidden' }}>
                  <View style={{ width: `${clampWidth(ps.score)}%`, height: '100%', backgroundColor: getScoreColor(ps.score) }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: '#777' }}>Growth: {Number.isFinite(ps.growthPct) ? ps.growthPct.toFixed(1) + '%' : '—'}</Text>
                  <Text style={{ fontSize: 11, color: '#777' }}>ROI: {Number.isFinite(ps.roiPct) ? ps.roiPct.toFixed(1) + '%' : '—'}</Text>
                  <Text style={{ fontSize: 11, color: '#777' }}>Cashflow: {Number.isFinite(ps.cashflowYieldPct) ? ps.cashflowYieldPct.toFixed(1) + '%' : '—'}</Text>
                  <Text style={{ fontSize: 11, color: '#777' }}>P&L: {Number.isFinite(ps.pl) ? '$' + ps.pl.toFixed(2) : '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Low Performers */}
        {propertyScores && propertyScores.some((ps) => ps.score < 50) && (
          <View style={[styles.card, { paddingVertical: 12 }]}> 
            <Text style={[styles.label, { marginBottom: 8 }]}>Low Performers</Text>
            {propertyScores
              .filter((ps) => ps.score < 50)
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((ps) => (
                <View key={`low-${ps.propertyId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name="alert" size={18} color="#eb3b5a" style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#444' }} numberOfLines={1} ellipsizeMode="tail">{ps.address}</Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#eb3b5a' }}>{Math.round(ps.score)}/100</Text>
                </View>
              ))}
          </View>
        )}

        {selectedEntity === 'all' && summaryMetrics && (
          <View style={[
            styles.card,
            {
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 6
            }
          ]}
          >
            <TouchableOpacity
              onPress={() => setIsFinancialSummaryExpanded((prev) => !prev)}
              style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 4 }}
            >
              <Text style={[styles.label]}>Financial Summary</Text>
              <Text style={[styles.label]}>{isFinancialSummaryExpanded ? 'X' : 'Open'}</Text>
              
            </TouchableOpacity>
            {/* Individual summary metric rows */}
            {isFinancialSummaryExpanded && (
            <View style={{ width: '100%', marginTop: 8 }}>
              {/* Total Invested */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="cash-plus" size={20} color="#f7b731" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Total Invested (Out of Pocket)</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#f7b731' }}>{formatCurrency(summaryMetrics.overallOutOfPocket)}</Text>
              </View>
              {/* Rental Income */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="cash-100" size={20} color="#20bf6b" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Rental Income</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#20bf6b' }}>{formatCurrency(summaryMetrics.overallIncome)}</Text>
              </View>
              {/* Sale Proceeds */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="sale" size={20} color="#197d32" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Sale Proceeds</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#197d32' }}>{formatCurrency(summaryMetrics.saleProceeds)}</Text>
              </View>
              
              {/* Gross Expense */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="file-percent" size={20} color="#eb3b5a" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Total Expenses</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#eb3b5a' }}>{formatCurrency(summaryMetrics.overallTaxDeductibleExpenses)}</Text>
              </View>
              {/* Mortgage Paid */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="home-group" size={20} color="#8854d0" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Principal Paid</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#8854d0' }}>{formatCurrency(summaryMetrics.overallMortgagePayments)}</Text>
              </View>
              {/* Interest Paid */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="currency-usd-off" size={20} color="#fd9644" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Interest Paid</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fd9644' }}>{formatCurrency(summaryMetrics.overallInterest)}</Text>
              </View>
              {/* Cashflow */}
              {/* Profit & Loss (Excl. Tax Savings)*/}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="chart-bar" size={20} color="#2eaf7d" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>Profit & Loss</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2eaf7d' }}>{formatCurrency(summaryMetrics.overallPL)}</Text>
              </View>
              {/* Est. Tax Savings */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="bank-check" size={20} color="#1976d2" style={{ marginRight: 10 }} />
                <Text style={{ fontSize: 14, color: '#444', flex: 1 }}>
                  Est. Tax Savings
                  <Text style={{ fontSize: 10, lineHeight: 14, verticalAlign: 'top' }}>*</Text>
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>{formatCurrency(summaryMetrics.taxSavings)}</Text>
              </View>
            </View>
            )}
          </View>
        )}

      </View>
      {/* Breakdown Modal */}
      <Modal visible={breakdownModalVisible} animationType="slide" transparent onRequestClose={() => setBreakdownModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Score Breakdown</Text>
            {selectedScore ? (
              <View>
                <Text style={{ fontSize: 13, color: '#444', marginBottom: 8 }}>{selectedScore.address}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#777' }}>Total Score</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: getScoreColor(selectedScore.score) }}>{Math.round(selectedScore.score)}/100</Text>
                </View>
                <View style={{ height: 8, borderRadius: 6, backgroundColor: '#eafaf3', overflow: 'hidden', marginBottom: 10 }}>
                  <View style={{ width: `${clampWidth(selectedScore.score)}%`, height: '100%', backgroundColor: getScoreColor(selectedScore.score) }} />
                </View>
                {/* Contributions */}
                <Text style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Metric contributions (weighted):</Text>
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Growth</Text>
                    <Text style={{ fontSize: 12 }}>{selectedScore.breakdown?.growth?.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>ROI</Text>
                    <Text style={{ fontSize: 12 }}>{selectedScore.breakdown?.roi?.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Cashflow</Text>
                    <Text style={{ fontSize: 12 }}>{selectedScore.breakdown?.cashflow?.toFixed(1)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>P&L</Text>
                    <Text style={{ fontSize: 12 }}>{selectedScore.breakdown?.pl?.toFixed(1)}</Text>
                  </View>
                </View>
                {/* Raw metrics */}
                <Text style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Raw metrics:</Text>
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Growth</Text>
                    <Text style={{ fontSize: 12 }}>{Number.isFinite(selectedScore.growthPct) ? selectedScore.growthPct.toFixed(1) + '%' : '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>ROI</Text>
                    <Text style={{ fontSize: 12 }}>{Number.isFinite(selectedScore.roiPct) ? selectedScore.roiPct.toFixed(1) + '%' : '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Cashflow Yield</Text>
                    <Text style={{ fontSize: 12 }}>{Number.isFinite(selectedScore.cashflowYieldPct) ? selectedScore.cashflowYieldPct.toFixed(1) + '%' : '—'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>P&L</Text>
                    <Text style={{ fontSize: 12 }}>{Number.isFinite(selectedScore.pl) ? '$' + selectedScore.pl.toFixed(2) : '—'}</Text>
                  </View>
                </View>
                {/* Raw metrics */}
                <Text style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>Assessment Range & Weight</Text>
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Growth</Text>
                    <Text style={{ fontSize: 12 }}>0% - 15% (Weight: {weights.growth})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>ROI</Text>
                    <Text style={{ fontSize: 12 }}>0% - 5% (Weight: {weights.roi})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>Cashflow Yield</Text>
                    <Text style={{ fontSize: 12 }}>-5% - +5% (Weight: {weights.cashflow})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12 }}>P&L</Text>
                    <Text style={{ fontSize: 12 }}>-$30,000 - $30,000 (Weight: {weights.pl})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, marginTop: 8 }}>
                    <Text style={{ fontSize: 8, fontStyle: 'italic' }}>*For PPOR weights are defaulted to Growth: 40%, ROI: 60%, Cashflow: 0%, P&L: 0%</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setBreakdownModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eafaf3', borderRadius: 8 }}>
                    <Text style={{ color: '#2eaf7d', fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: '#777' }}>No property selected.</Text>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

}
