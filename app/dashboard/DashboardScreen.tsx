import React, { useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, Dimensions, StyleSheet, TextInput, TouchableOpacity, Modal, type DimensionValue } from 'react-native';
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
  const barChartValues = filteredBarData.map((item) => item.value);
  const distributionTotal = barChartValues.reduce((sum, value) => sum + value, 0);
  const distributionLegend = filteredBarData.map((item, idx) => {
    const percent = distributionTotal > 0 ? (item.value / distributionTotal) * 100 : 0;
    return {
      key: `${item.propertyAddress}-${idx}`,
      color: chartColors[idx % chartColors.length],
      label: item.propertyAddress,
      value: item.value,
      percent,
    };
  });

  const ownershipLegend = pieData.map((item, idx) => ({
    key: item.key,
    color: chartColors[idx % chartColors.length],
    label: item.label,
    value: item.value,
    percent: Number(item.percent) || 0,
  }));
  const topOwnership = ownershipLegend.slice().sort((a, b) => b.percent - a.percent)[0];

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
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [breakdownModalVisible, setBreakdownModalVisible] = useState(false);
  const [selectedScore, setSelectedScore] = useState<any | null>(null);

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

      const latestFiveTransactions = [...(transactions || [])]
        .sort((a: any, b: any) => {
          const aTs = new Date(a?.date || 0).getTime();
          const bTs = new Date(b?.date || 0).getTime();
          return bTs - aTs;
        })
        .slice(0, 10);
      setRecentTransactions(latestFiveTransactions);

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

  const formatMillions = (value: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0.00';
    return (value / 1000000).toFixed(2);
  };

  const formatTransactionDate = (value?: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getTransactionTypeIcon = (type?: string) => {
    const t = String(type || '').toUpperCase();
    if (t === 'RENT') return 'cash-multiple';
    if (t === 'MORTGAGE' || t === 'INTEREST') return 'bank-outline';
    if (t === 'EXPENSE' || t === 'OUT_OF_POCKET') return 'receipt-text-outline';
    return 'swap-horizontal';
  };

  const getTransactionTypeLabel = (type?: string) => String(type || 'TRANSACTION').replaceAll('_', ' ');

  const propertyAddressById = (() => {
    const map: Record<string, string> = {};
    [...(properties || []), ...(soldProperties || [])].forEach((p: any) => {
      if (!p?.id) return;
      map[String(p.id)] = String(p.address || '').trim();
    });
    return map;
  })();

  const getTransactionPropertyAddress = (tx: any) => {
    const propertyId = String(tx?.propertyid ?? tx?.property_id ?? tx?.propertyId ?? '');
    if (!propertyId) return 'Unknown Property';
    return propertyAddressById[propertyId] || 'Unknown Property';
  };

  const renderRecentTransactionsTimeline = (keyPrefix: string) => {
    if (recentTransactions.length === 0) {
      return (
        <View style={{ borderRadius: 10, borderWidth: 1, borderColor: uiTheme.divider, backgroundColor: uiTheme.surfaceSoft, padding: 10 }}>
          <Text style={{ fontSize: 11, color: uiTheme.textMuted }}>No recent transactions found.</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingTop: 2 }}>
        {recentTransactions.map((tx: any, idx: number) => {
          const isLast = idx === recentTransactions.length - 1;
          const nodeSize = layoutRhythm.timelineNode;
          return (
            <View key={`${keyPrefix}-${tx.id ?? `${tx.date}-${tx.amount}-${tx.type}`}-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingBottom: isLast ? 0 : layoutRhythm.timelineRowGap }}>
              <View style={{ width: nodeSize + 6, alignItems: 'center' }}>
                <View
                  style={{
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: nodeSize / 2,
                    borderWidth: 1,
                    borderColor: uiTheme.divider,
                    backgroundColor: uiTheme.surfaceSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <MaterialCommunityIcons name={getTransactionTypeIcon(tx.type)} size={12} color={uiTheme.textMuted} />
                </View>
                {!isLast && (
                  <View
                    style={{
                      position: 'absolute',
                      top: nodeSize,
                      width: 2,
                      height: layoutRhythm.timelineLineHeight,
                      backgroundColor: uiTheme.divider,
                    }}
                  />
                )}
              </View>

              <View
                style={{
                  flex: 1,
                  marginLeft: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: uiTheme.divider,
                  backgroundColor: uiTheme.surfaceSoft,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary, fontWeight: '600' }} numberOfLines={1}>
                    {tx.description || getTransactionTypeLabel(tx.type)}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: uiTheme.textPrimary, marginLeft: 8 }} numberOfLines={1}>
                    {formatCurrency(Number(tx.amount) || 0)}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: uiTheme.textMuted, marginTop: 5 }} numberOfLines={1}>
                  {getTransactionPropertyAddress(tx)} • {getTransactionTypeLabel(tx.type)} • {formatTransactionDate(tx.date)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const lastUpdatedLabel = new Date().toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const windowWidth = Dimensions.get('window').width;
  const isCompactPortfolioCards = windowWidth < 760;
  const portfolioTilesPerRow = windowWidth >= 1100 ? 6 : windowWidth >= 760 ? 3 : 2;
  const summaryValueFontSize = windowWidth >= 1200 ? 44 : windowWidth >= 900 ? 38 : 32;
  const summaryLabelFontSize = windowWidth >= 1200 ? 13 : 12;
  const isChartsDualPane = windowWidth >= 1080;
  const layoutRhythm = {
    sectionGap: 14,
    tileGap: 12,
    timelineNode: isCompactPortfolioCards ? 20 : 22,
    timelineLineHeight: isCompactPortfolioCards ? 30 : 34,
    timelineRowGap: isCompactPortfolioCards ? 12 : 14,
  } as const;
  const totalPortfolioEquity =
    (Number(dashboardData.equity) || 0);
  const totalPortfolioNetWorth =
    (Number(dashboardData.totalAssets) || 0) +
    (Number(dashboardData.currentAssets) || 0) -
    (Number(dashboardData.totalLiabilities) || 0);
  const portfolioTileWidth: DimensionValue = `${100 / portfolioTilesPerRow}%`;
  const semanticColors = {
    info: '#0f2b57',
    infoSoft: '#e9eef9',
    success: '#1e4a84',
    successSoft: '#eaf2ff',
    violet: '#355f9d',
    violetSoft: '#eef3ff',
    warning: '#9b6a00',
    warningSoft: '#fff5d9',
    orange: '#a26500',
    orangeSoft: '#fff1cc',
    roi: '#102a54',
    roiSoft: '#edf2fc',
    growth: '#133a73',
    growthSoft: '#eaf0fb',
    lvr: '#2b416d',
    lvrSoft: '#edf1f8',
    iconChip: '#ffffff',
  } as const;
  const portfolioSummaryTiles = [
    {
      key: 'properties',
      value: String(unsoldProperties.length),
      label: 'Properties',
      backgroundColor: semanticColors.infoSoft,
      icon: 'home-city-outline' as const,
      iconColor: semanticColors.info,
    },
    {
      key: 'fixed-assets',
      value: formatMillions(Number(dashboardData.totalAssets) || 0),
      label: 'Fixed Assets $m',
      backgroundColor: semanticColors.successSoft,
      icon: 'office-building' as const,
      iconColor: semanticColors.success,
    },
    {
      key: 'loans',
      value: formatMillions(Number(dashboardData.totalLiabilities) || 0),
      label: 'Total Loans $m',
      backgroundColor: semanticColors.violetSoft,
      icon: 'credit-card-outline' as const,
      iconColor: semanticColors.violet,
    },
    {
      key: 'total-equity',
      value: formatMillions(totalPortfolioEquity),
      label: 'Available Equity $m',
      backgroundColor: semanticColors.orangeSoft,
      icon: 'chart-line-variant' as const,
      iconColor: semanticColors.orange,
    },
    {
      key: 'current-assets',
      value: formatMillions(Number(dashboardData.currentAssets) || 0),
      label: 'Current Assets $m',
      backgroundColor: semanticColors.successSoft,
      icon: 'wallet-outline' as const,
      iconColor: semanticColors.success,
    },
    
    {
      key: 'net-worth',
      value: formatMillions(totalPortfolioNetWorth),
      label: 'Net Worth $m',
      backgroundColor: semanticColors.orangeSoft,
      icon: 'bank-outline' as const,
      iconColor: semanticColors.orange,
    },
    
  ];
  const portfolioIndicators = [
    {
      key: 'roi',
      label: 'ROI',
      value: `${dashboardData.roi}%`,
      icon: 'chart-bell-curve' as const,
      color: semanticColors.roi,
      backgroundColor: semanticColors.roiSoft,
      iconBg: '#ffe8a3',
    },
    {
      key: 'growth',
      label: 'Growth',
      value: `${dashboardData.capitalGrowth}%`,
      icon: 'trending-up' as const,
      color: semanticColors.growth,
      backgroundColor: semanticColors.growthSoft,
      iconBg: '#e4d5ff',
    },
    {
      key: 'lvr',
      label: 'Portfolio LVR',
      value: `${dashboardData.lvr}%`,
      icon: 'percent' as const,
      color: semanticColors.lvr,
      backgroundColor: semanticColors.lvrSoft,
      iconBg: '#ffd0ba',
    },
  ];
  const uiTheme = {
    pageBg: '#f3f6fb',
    surface: '#ffffff',
    surfaceSoft: '#f7f9fd',
    border: '#d6e0ee',
    divider: '#e7eef8',
    textPrimary: '#0b1f3d',
    textSecondary: '#1e3a64',
    textMuted: '#60738f',
    accent: '#102a54',
    accentSoft: '#e8eef9',
    link: '#102a54',
    danger: '#b4232a',
    warning: '#9b6a00',
    radiusCard: 16,
    radiusItem: 12,
  } as const;
  const webUi = {
    shellBg: '#f7f9fe',
    shellBorder: '#dbe4f2',
    shellInset: '#edf2f9',
    shellRadius: 22,
    sectionShadow: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  } as const;
  const sectionCardStyle = {
    backgroundColor: uiTheme.surface,
    borderRadius: uiTheme.radiusCard,
    borderWidth: 1,
    borderColor: uiTheme.border,
    ...webUi.sectionShadow,
  } as const;
  const tileIconSizing = {
    summaryChip: isCompactPortfolioCards ? 26 : 32,
    summaryIcon: isCompactPortfolioCards ? 16 : 19,
    indicatorChip: isCompactPortfolioCards ? 28 : 32,
    indicatorIcon: isCompactPortfolioCards ? 16 : 18,
    propertyMetricChip: isCompactPortfolioCards ? 16 : 18,
    propertyMetricIcon: isCompactPortfolioCards ? 10 : 11,
    propertyMetricIconRight: isCompactPortfolioCards ? 2 : 3,
    propertyMetricIconTop: isCompactPortfolioCards ? 1 : 0,
    propertyMetricPaddingRight: isCompactPortfolioCards ? 22 : 24,
    propertyHeaderIcon: isCompactPortfolioCards ? 16 : 18,
    financialChip: isCompactPortfolioCards ? 20 : 22,
    financialIcon: isCompactPortfolioCards ? 12 : 13,
    financialIconRight: isCompactPortfolioCards ? 8 : 10,
    financialIconTop: isCompactPortfolioCards ? 8 : 10,
    scoreBadge: isCompactPortfolioCards ? 30 : 32,
    scoreBadgeText: isCompactPortfolioCards ? 10 : 11,
  } as const;

  const clampWidth = (score: number) => {
    if (typeof score !== 'number' || Number.isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getScoreColor = (score: number) => {
    const s = clampWidth(score);
    if (s < 50) return uiTheme.danger;
    if (s < 80) return uiTheme.warning;
    return uiTheme.accent;
  };

  const rankedPropertyScores = (propertyScores || []).slice().sort((a, b) => b.score - a.score);
  const topPerformerScores = rankedPropertyScores.filter(p => p.score > 90).slice(0, 3);
  const remainingAfterTopScores = rankedPropertyScores.slice(3);
  const lowPerformerScores = remainingAfterTopScores.filter(p => p.score < 60).slice().sort((a, b) => a.score - b.score).slice(0, 2);
  const lowPerformerIds = new Set(lowPerformerScores.map((ps) => String(ps.propertyId)));
  const stablePerformerScores = remainingAfterTopScores.filter((ps) => !lowPerformerIds.has(String(ps.propertyId)));

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
    <ScrollView style={[styles.container, { backgroundColor: uiTheme.pageBg }]} contentContainerStyle={{ paddingBottom: 64, paddingHorizontal: 18, paddingTop: 16 }}>
      <View style={{ flex: 1, width: '100%', alignSelf: 'center' }}>
        <View
          style={{
            backgroundColor: webUi.shellBg,
            borderWidth: 1,
            borderColor: webUi.shellBorder,
            borderRadius: webUi.shellRadius,
            paddingHorizontal: 14,
            paddingVertical: 14,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: webUi.shellInset,
              borderRadius: 14,
              backgroundColor: '#ffffff',
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: uiTheme.accent, marginRight: 8 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: uiTheme.textSecondary }}>Dashboard Workspace</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ borderRadius: 999, backgroundColor: uiTheme.accentSoft, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: uiTheme.accent }}>Overview</Text>
              </View>
            </View>
          </View>

          <View style={[styles.headerRow, { marginBottom: 14, marginTop: 4, paddingHorizontal: 8 }]}> 
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerText, { fontSize: 30, color: uiTheme.textPrimary, fontWeight: '800' }]}>Portfolio Overview</Text>
              <Text style={{ fontSize: 13, color: uiTheme.textMuted, marginTop: 4 }}>Enterprise portfolio intelligence and performance tracking</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: webUi.shellInset, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ffffff' }}>
              <Text style={{ fontSize: 11, color: uiTheme.textMuted }}>Live Snapshot</Text>
            </View>
          </View>
        
        {selectedEntity === 'all' && (
          <View
            style={[
              styles.card,
              {
                ...sectionCardStyle,
                paddingVertical: 18,
                paddingHorizontal: 16,
              },
            ]}
          >
            <Text style={{ fontSize: 30, fontWeight: '800', color: uiTheme.textPrimary, marginBottom: 4 }}>
              Portfolio Snapshot
            </Text>
            <Text style={{ fontSize: 13, color: uiTheme.textMuted, marginBottom: 16 }}>
              Last updated: {lastUpdatedLabel}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {portfolioSummaryTiles.map((tile) => (
                <View
                  key={tile.key}
                  style={{
                    width: portfolioTileWidth,
                    paddingHorizontal: 6,
                    marginBottom: layoutRhythm.tileGap,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 10,
                      backgroundColor: tile.backgroundColor,
                      minHeight: 118,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        width: tileIconSizing.summaryChip,
                        height: tileIconSizing.summaryChip,
                        borderRadius: tileIconSizing.summaryChip / 2,
                        backgroundColor: semanticColors.iconChip,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name={tile.icon} size={tileIconSizing.summaryIcon} color={tile.iconColor} />
                    </View>
                    <Text style={{ fontSize: summaryValueFontSize, lineHeight: summaryValueFontSize + 2, fontWeight: '700', color: uiTheme.textPrimary }}>
                      {tile.value}
                    </Text>
                    <Text style={{ fontSize: summaryLabelFontSize, lineHeight: summaryLabelFontSize + 4, color: uiTheme.textSecondary, marginTop: 10, fontWeight: '500' }}>
                      {tile.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 1, backgroundColor: uiTheme.divider, width: '100%', marginTop: 4, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {portfolioIndicators.map((indicator) => (
                <View
                  key={indicator.key}
                  style={{
                    width: '33.33%',
                    paddingHorizontal: 6,
                    marginBottom: layoutRhythm.tileGap,
                  }}
                >
                  <View
                    style={{
                      borderRadius: 10,
                      backgroundColor: indicator.backgroundColor,
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      paddingRight: 48,
                      minHeight: 62,
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 14,
                        width: tileIconSizing.indicatorChip,
                        height: tileIconSizing.indicatorChip,
                        borderRadius: tileIconSizing.indicatorChip / 2,
                        backgroundColor: indicator.iconBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name={indicator.icon} size={tileIconSizing.indicatorIcon} color={indicator.color} />
                    </View>
                    <Text style={{ fontSize: 11, color: indicator.color, opacity: 0.88, fontWeight: '600' }}>
                      {indicator.label}
                    </Text>
                    <Text style={{ fontSize: isCompactPortfolioCards ? 21 : 24, fontWeight: '800', color: indicator.color, marginTop: 2 }}>
                      {indicator.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        
        <View style={{ flexDirection: isChartsDualPane ? 'row' : 'column', alignItems: 'stretch', marginBottom: layoutRhythm.sectionGap }}>
          <View style={{ width: isChartsDualPane ? '50%' : '100%', paddingRight: isChartsDualPane ? 7 : 0, marginBottom: isChartsDualPane ? 0 : layoutRhythm.sectionGap }}>
            <View style={[styles.chartCard, { ...sectionCardStyle, paddingVertical: 14, height: '100%' }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: semanticColors.infoSoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={16} color={semanticColors.info} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: uiTheme.textPrimary }}>Portfolio Distribution</Text>
                    <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginLeft: 8 }}>Value split by property</Text>
                  </View>
                </View>
              </View>

              {distributionLegend.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', width: '100%', height: 30, borderRadius: 10, overflow: 'hidden', backgroundColor: uiTheme.accentSoft, marginBottom: 12 }}>
                    {distributionLegend.map((item) => (
                      <View
                        key={item.key}
                        style={{ flex: item.percent, height: '100%', backgroundColor: item.color, justifyContent: 'center', alignItems: 'center' }}
                      >
                        {item.percent >= 12 && (
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                            {item.percent.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={{ borderWidth: 1, borderColor: uiTheme.divider, borderRadius: 10, overflow: 'hidden' }}>
                    {distributionLegend.map((item, idx) => (
                      <View key={`${item.key}-legend`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: idx === distributionLegend.length - 1 ? 0 : 1, borderBottomColor: uiTheme.divider, backgroundColor: idx % 2 === 0 ? '#ffffff' : uiTheme.surfaceSoft }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                        <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary }} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: uiTheme.textMuted, width: 54, textAlign: 'right' }}>{item.percent.toFixed(1)}%</Text>
                        <Text style={{ fontSize: 11, color: uiTheme.textPrimary, fontWeight: '700', width: 96, textAlign: 'right' }}>{formatCurrency(item.value)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noChartData}>No property data</Text>
              )}
            </View>
          </View>

          <View style={{ width: isChartsDualPane ? '50%' : '100%', paddingLeft: isChartsDualPane ? 7 : 0 }}>
            <View style={[styles.chartCard, { ...sectionCardStyle, paddingVertical: 14, height: '100%' }]}> 
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: semanticColors.violetSoft, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <MaterialCommunityIcons name="account-group-outline" size={16} color={semanticColors.violet} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: uiTheme.textPrimary }}>Portfolio Ownership</Text>
                    <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginLeft: 8 }}>Allocation by entity</Text>
                  </View>
                </View>
              </View>

              {selectedEntity !== 'all' ? (
                <View style={{ borderRadius: 10, borderWidth: 1, borderColor: uiTheme.divider, backgroundColor: uiTheme.surfaceSoft, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: uiTheme.textSecondary, marginBottom: 4 }}>Ownership split is shown at portfolio level.</Text>
                  <Text style={{ fontSize: 11, color: uiTheme.textMuted }}>Switch the entity filter to All to see how ownership is distributed.</Text>
                </View>
              ) : loading ? (
                <ActivityIndicator size="large" color="#2eaf7d" style={{ marginVertical: 24 }} />
              ) : ownershipLegend.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', width: '100%', height: 30, borderRadius: 10, overflow: 'hidden', backgroundColor: uiTheme.accentSoft, marginBottom: 12 }}>
                    {ownershipLegend.map((item) => (
                      <View
                        key={item.key}
                        style={{
                          flex: item.percent,
                          height: '100%',
                          backgroundColor: item.color,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {item.percent >= 12 && (
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                            {item.percent.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={{ borderWidth: 1, borderColor: uiTheme.divider, borderRadius: 10, overflow: 'hidden' }}>
                    {ownershipLegend.map((item, idx) => (
                      <View key={`${item.key}-ownership`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: idx === ownershipLegend.length - 1 ? 0 : 1, borderBottomColor: uiTheme.divider, backgroundColor: idx % 2 === 0 ? '#ffffff' : uiTheme.surfaceSoft }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 8 }} />
                        <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary }} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: uiTheme.textMuted, width: 54, textAlign: 'right' }}>{item.percent.toFixed(1)}%</Text>
                        <Text style={{ fontSize: 11, color: uiTheme.textPrimary, fontWeight: '700', width: 96, textAlign: 'right' }}>{formatCurrency(item.value)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noChartData}>No ownership data</Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 }}>
            

            <View style={{ width: '69%', paddingRight: 7 }}>
              {selectedEntity === 'all' && summaryMetrics && (
                <View style={[
                  styles.card,
                  {
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 8,
                    ...sectionCardStyle,
                  }
                ]}
                >
                  <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 4 }}>
                    <Text style={[styles.label]}>Financial Summary</Text>
                  </View>
                  <View style={{ width: '100%', marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                      {[
                        {
                          key: 'invested',
                          icon: 'cash-plus' as const,
                          color: semanticColors.roi,
                          label: 'Total Invested (Out of Pocket)',
                          value: formatCurrency(summaryMetrics.overallOutOfPocket),
                        },
                        {
                          key: 'income',
                          icon: 'cash-100' as const,
                          color: semanticColors.success,
                          label: 'Rental Income',
                          value: formatCurrency(summaryMetrics.overallIncome),
                        },
                        {
                          key: 'sale',
                          icon: 'sale' as const,
                          color: semanticColors.success,
                          label: 'Sale Proceeds',
                          value: formatCurrency(summaryMetrics.saleProceeds),
                        },
                        {
                          key: 'expense',
                          icon: 'file-percent' as const,
                          color: uiTheme.danger,
                          label: 'Total Expenses',
                          value: formatCurrency(summaryMetrics.overallTaxDeductibleExpenses),
                        },
                        {
                          key: 'principal',
                          icon: 'home-group' as const,
                          color: semanticColors.violet,
                          label: 'Principal Paid',
                          value: formatCurrency(summaryMetrics.overallMortgagePayments),
                        },
                        {
                          key: 'interest',
                          icon: 'currency-usd-off' as const,
                          color: uiTheme.warning,
                          label: 'Interest Paid',
                          value: formatCurrency(summaryMetrics.overallInterest),
                        },
                        {
                          key: 'pl',
                          icon: 'chart-bar' as const,
                          color: uiTheme.accent,
                          label: 'Profit & Loss',
                          value: formatCurrency(summaryMetrics.overallPL),
                        },
                        {
                          key: 'tax',
                          icon: 'bank-check' as const,
                          color: semanticColors.info,
                          label: 'Est. Tax Savings*',
                          value: formatCurrency(summaryMetrics.taxSavings),
                        },
                      ].map((item) => (
                        <View
                          key={item.key}
                          style={{
                            width: isCompactPortfolioCards ? '50%' : '25%',
                            paddingHorizontal: 4,
                            marginBottom: 8,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: uiTheme.surfaceSoft,
                              borderRadius: uiTheme.radiusItem,
                              borderWidth: 1,
                              borderColor: uiTheme.border,
                              minHeight: 84,
                              paddingVertical: 10,
                              paddingHorizontal: 10,
                              paddingRight: tileIconSizing.financialChip + tileIconSizing.financialIconRight + 6,
                              justifyContent: 'space-between',
                              position: 'relative',
                            }}
                          >
                            <View
                              style={{
                                position: 'absolute',
                                right: tileIconSizing.financialIconRight,
                                top: tileIconSizing.financialIconTop,
                                width: tileIconSizing.financialChip,
                                height: tileIconSizing.financialChip,
                                borderRadius: tileIconSizing.financialChip / 2,
                                backgroundColor: semanticColors.iconChip,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <MaterialCommunityIcons name={item.icon} size={tileIconSizing.financialIcon} color={item.color} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 9, color: uiTheme.textMuted, flex: 1, fontWeight: '500' }} numberOfLines={2}>{item.label}</Text>
                            </View>
                            <Text style={{ fontSize: isCompactPortfolioCards ? 20 : 24, fontWeight: '800', color: item.color, marginTop: 4 }} numberOfLines={1}>{item.value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {propertyScores && propertyScores.length > 0 && (
                <View style={[styles.card, { ...sectionCardStyle, paddingVertical: 14 }]}> 
                  <Text style={[styles.label, { marginBottom: 8 }]}>Performance Bands</Text>

                  <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginBottom: 6 }}>Top Performers</Text>
                  {topPerformerScores.map((ps) => (
                    <View key={`top-${ps.propertyId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: uiTheme.divider, backgroundColor: '#eaf8ef', paddingVertical: 8, paddingHorizontal: 10 }}>
                      <MaterialCommunityIcons name="star" size={17} color="#f4c430" style={{ marginRight: 8 }} />
                      <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
                        {ps.address}
                      </Text>
                      <View style={{ width: tileIconSizing.scoreBadge, height: tileIconSizing.scoreBadge, borderRadius: tileIconSizing.scoreBadge / 2, backgroundColor: getScoreColor(ps.score), alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity
                          onPress={() => { setSelectedScore(ps); setBreakdownModalVisible(true); }}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={{ fontSize: tileIconSizing.scoreBadgeText, fontWeight: '800', color: '#fff' }}>{Math.round(ps.score)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {topPerformerScores.length === 0 && (
                    <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginBottom: 8 }}>No top performers.</Text>
                  )}

                  <View style={{ height: 1, backgroundColor: uiTheme.divider, marginVertical: 8 }} />

                  <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginBottom: 6 }}>Low Performers</Text>
                  {lowPerformerScores.map((ps) => (
                    <View key={`low-${ps.propertyId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: uiTheme.divider, backgroundColor: '#fdecec', paddingVertical: 8, paddingHorizontal: 10 }}>
                      <MaterialCommunityIcons name="alert" size={17} color={uiTheme.danger} style={{ marginRight: 8 }} />
                      <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
                        {ps.address}
                      </Text>
                      <View style={{ width: tileIconSizing.scoreBadge, height: tileIconSizing.scoreBadge, borderRadius: tileIconSizing.scoreBadge / 2, backgroundColor: getScoreColor(ps.score), alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity
                          onPress={() => { setSelectedScore(ps); setBreakdownModalVisible(true); }}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={{ fontSize: tileIconSizing.scoreBadgeText, fontWeight: '800', color: '#fff' }}>{Math.round(ps.score)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {lowPerformerScores.length === 0 && (
                    <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginBottom: 8 }}>No low performers.</Text>
                  )}

                  <View style={{ height: 1, backgroundColor: uiTheme.divider, marginVertical: 8 }} />

                  <Text style={{ fontSize: 11, color: uiTheme.textMuted, marginBottom: 6 }}>Stable</Text>
                  {stablePerformerScores.map((ps) => (
                    <View key={`stable-${ps.propertyId}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: uiTheme.divider, backgroundColor: uiTheme.surfaceSoft, paddingVertical: 8, paddingHorizontal: 10 }}>
                      <MaterialCommunityIcons name="minus-circle-outline" size={17} color={uiTheme.textMuted} style={{ marginRight: 8 }} />
                      <Text style={{ flex: 1, fontSize: 12, color: uiTheme.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
                        {ps.address}
                      </Text>
                      <View style={{ width: tileIconSizing.scoreBadge, height: tileIconSizing.scoreBadge, borderRadius: tileIconSizing.scoreBadge / 2, backgroundColor: getScoreColor(ps.score), alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity
                          onPress={() => { setSelectedScore(ps); setBreakdownModalVisible(true); }}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={{ fontSize: tileIconSizing.scoreBadgeText, fontWeight: '800', color: '#fff' }}>{Math.round(ps.score)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {stablePerformerScores.length === 0 && (
                    <Text style={{ fontSize: 11, color: uiTheme.textMuted }}>No stable properties.</Text>
                  )}
                </View>
              )}
            </View>
            <View style={{ width: '31%', paddingLeft: 7 }}>
              <View style={[styles.card, { ...sectionCardStyle, paddingVertical: 14, marginBottom: layoutRhythm.sectionGap }]}> 
                <Text style={[styles.label, { marginBottom: 6 }]}>Recent Transactions</Text>
                {renderRecentTransactionsTimeline('recent-web')}
              </View>

              
            </View>
          </View>


        </View>

      </View>
      {/* Breakdown Modal */}
      <Modal visible={breakdownModalVisible} animationType="slide" transparent onRequestClose={() => setBreakdownModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: uiTheme.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: uiTheme.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6, color: uiTheme.textPrimary }}>Score Breakdown</Text>
            {selectedScore ? (
              <View>
                <Text style={{ fontSize: 13, color: uiTheme.textSecondary, marginBottom: 8 }}>{selectedScore.address}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: uiTheme.textMuted }}>Total Score</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: getScoreColor(selectedScore.score) }}>{Math.round(selectedScore.score)}/100</Text>
                </View>
                <View style={{ height: 8, borderRadius: 6, backgroundColor: uiTheme.accentSoft, overflow: 'hidden', marginBottom: 10 }}>
                  <View style={{ width: `${clampWidth(selectedScore.score)}%`, height: '100%', backgroundColor: getScoreColor(selectedScore.score) }} />
                </View>
                {/* Contributions */}
                <Text style={{ fontSize: 12, color: uiTheme.textSecondary, marginBottom: 6 }}>Metric contributions (weighted):</Text>
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
                <Text style={{ fontSize: 12, color: uiTheme.textSecondary, marginBottom: 6 }}>Raw metrics:</Text>
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
                <Text style={{ fontSize: 12, color: uiTheme.textSecondary, marginBottom: 6 }}>Assessment Range & Weight</Text>
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
                  <TouchableOpacity onPress={() => setBreakdownModalVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: uiTheme.accentSoft, borderRadius: 8 }}>
                    <Text style={{ color: uiTheme.accent, fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: uiTheme.textMuted }}>No property selected.</Text>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

}
