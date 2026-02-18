// Use color scheme for styles
const scheme = 'light'; // Replace with useColorScheme() if available
const styles = PropertyDetailsScreenStyles(scheme);
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { updateProperty, deleteProperty } from '@/lib/supabase/properties';
import { deletePropertyOwnerships } from '@/lib/supabase/ownership';
import { DatePicker } from '@/components/DatePicker';
import { Picker } from '@react-native-picker/picker';
import { fetchOwnershipsForProperty } from '@/lib/supabase/ownership';
import { fetchAccountsByPropertyIds } from '@/lib/supabase/accounts';
import { fetchTransactions } from '@/lib/supabase/transaction';
import { fetchFYDepForProperty, upsertFYDep, deleteFYDep, DepreciationFY } from '@/lib/supabase/depreciation_fy';
import { Logger } from '@/lib/logger';
import { formatDateDMY, parseDMYtoISO } from '@/lib/dateFormat';
import PropertyOwnershipForm from './PropertyOwnershipForm';
import { exportReportAsPDF, generatePLReport } from '../../utils/exportReport';
// Modal for PnL report cost input
import { Modal } from 'react-native';
import { generateEOFYReport } from '../../utils/eofyReport';
import { isInvestmentProperty } from '../../utils/propertyUtils';
import PropertyDetailsScreenStyles from '@/styles/PropertyDetailsScreenStyles';

const categoryIcon = (category: string, type: string) => {
  if (category === 'OWNER_OCCUPIED' && type === 'RESIDENTIAL') {
    return <MaterialCommunityIcons name="home-account" size={32} color="#007AFF" />;
  }
  if (category === 'INVESTMENT' && type === 'RESIDENTIAL') {
    return <MaterialCommunityIcons name="home-variant" size={32} color="#007AFF" />;
  }
  if (category === 'INVESTMENT' && type === 'COMMERCIAL') {
    return <MaterialCommunityIcons name="office-building" size={32} color="#007AFF" />;
  }
  return null;
};

const typeLabel = (type: string) => {
  switch (type) {
    case 'RESIDENTIAL': return 'Residential';
    case 'COMMERCIAL': return 'Commercial';
    case 'LAND_ONLY': return 'Land Only';
    default: return type || 'Other';
  }
};

// Helper to convert to title case
const toTitleCase = (str?: string) =>
  str ? str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) : '';

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const { property } = useLocalSearchParams();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(property ? JSON.parse(property as string) : {});
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ownerships, setOwnerships] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [summaryTab, setSummaryTab] = useState<'since_purchase' | string>('since_purchase');
  const [summaryYears, setSummaryYears] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownershipModalVisible, setOwnershipModalVisible] = useState(false);
  // State for PnL report popup (must be inside component)
  const [showPLModal, setShowPLModal] = useState(false);
  const [realEstateCostType, setRealEstateCostType] = useState<'percent' | 'absolute'>('percent');
  const [realEstateCostValue, setRealEstateCostValue] = useState('2');
  const [legalCostValue, setLegalCostValue] = useState('2000');
  // Depreciation (FY) state
  const [fyDepRows, setFyDepRows] = useState<DepreciationFY[]>([]);
  const [depFY, setDepFY] = useState<{ fyStartYear?: number; amount?: number }>({});
  const [depFYAmountInput, setDepFYAmountInput] = useState('');
  const [depreciationForPeriod, setDepreciationForPeriod] = useState<number>(0);
  const [estimatedTaxSavings, setEstimatedTaxSavings] = useState<number>(0);


  useEffect(() => {
    async function fetchRelated() {
      if (form.id) {
        const [ownershipRes, accountsRes] = await Promise.all([
          fetchOwnershipsForProperty(form.id),
          fetchAccountsByPropertyIds([form.id]),
        ]);
        setOwnerships(ownershipRes.data || []);
        setAccounts(accountsRes.data || []);
      }
    }
    fetchRelated();
  }, [form.id]);

  // Fetch userId from supabase auth
  useEffect(() => {
    (async () => {
      const user = await import('@/lib/supabase/auth').then(m => m.getCurrentUser());
      if (user && user.id) setUserId(user.id);
    })();
  }, []);

  // Fetch transactions for this property
  useEffect(() => {
    if (!userId || !form.id) return;
    (async () => {
      const { data } = await fetchTransactions(userId, form.id);
      setTransactions(data || []);
      // Fetch FY depreciation for property
      const depRes = await fetchFYDepForProperty(userId, Number(form.id));
      setFyDepRows((depRes.data || []) as any);
      // Determine all financial years since purchase (Australian FY: July 1 - June 30)
      if (form.purchasedate) {
        const purchaseDate = new Date(form.purchasedate);
        let startFY = purchaseDate.getFullYear();
        // If purchased before July, use previous year as start FY
        if (purchaseDate.getMonth() < 6) {
          startFY = startFY - 1;
        }
        const today = new Date();
        let endFY = today.getFullYear();
        // If today is before July, last FY is previous year
        if (today.getMonth() < 6) {
          endFY = endFY - 1;
        }
        const years: string[] = [];
        for (let y = startFY; y <= endFY; y++) {
          years.push(`${y}-${y + 1}`);
        }
        setSummaryYears(years);
      }
    })();
  }, [userId, form.id]);

  // Calculate summary for selected tab
  useEffect(() => {
    if (!transactions.length) return;
    let filtered = transactions;
    const transactionId = Logger.createTransactionId();

    if (summaryTab !== 'since_purchase') {
      // Filter for selected financial year (assume FY: July 1 - June 30)
      const [startYear, endYear] = summaryTab.split('-').map(Number);
      const start = new Date(`${startYear}-06-30T14:00:00+00:00`);
      const end = new Date(`${endYear}-06-30T13:59:59+00:00`);
      filtered = transactions.filter(t => {
        const d = new Date(t.date);
        const today = new Date();
        return d >= start && d <= end && d <= today;
      });

    }
    // Calculate totals
    const totalRent = filtered.filter(t => t.type === 'RENT').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalTaxDeductible = filtered.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCapital = filtered.filter(t => t.type === 'CAPITAL_EXPENSE').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalInterest = filtered.filter(t => t.type === 'INTEREST').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalMortgage = filtered.filter(t => t.type === 'MORTGAGE').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalCash = filtered.filter(t => t.type === 'OUT_OF_POCKET').reduce((sum, t) => sum + (t.amount || 0), 0);
    // Cost so far:
    const prop = JSON.parse(property as string)
    const totalPrincipalPayments = totalMortgage - totalInterest; // Total principal paid
    const totalOutOfPocket = totalPrincipalPayments + totalCash;
    const netIncome = (totalRent - totalTaxDeductible - totalInterest);
    const totalLiabilities = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalPL = prop.currentvalue + netIncome - totalOutOfPocket - totalLiabilities;
    // Annual cashflow: rent - (tax deductible + capital + interest + mortgage)
    const annualCashflow = totalRent - (totalTaxDeductible + totalInterest);
    // Rental yield (annualized): (annual rent / current value) * 100
    let annualRent = totalRent;
    let rentalYield = null;
    if (summaryTab !== 'since_purchase') {
      rentalYield = form.currentvalue ? ((annualRent / form.currentvalue) * 100) : null;
    } else if (form.purchasedate) {
      const yearsHeld = Math.max(1, (new Date().getFullYear() - new Date(form.purchasedate).getFullYear() + 1));
      annualRent = totalRent / yearsHeld;
    }
    // Compute depreciation by FY model
    let dep = 0;
    if (summaryTab !== 'since_purchase' && summaryTab.includes('-')) {
      const [startYear] = summaryTab.split('-').map(Number);
      const row = (fyDepRows || []).find(r => Number(r.fy_start_year) === Number(startYear));
      dep = Number(row?.amount || 0);
    } else {
      //calculate total depreciation for all years until current FY
      const currentDate = new Date();
      let currentFYStartYear = currentDate.getFullYear();
      if(currentDate.getMonth() > 6){
        currentFYStartYear = currentFYStartYear + 1;
      }
      const depRowsToSum = (fyDepRows || []).filter(r => Number(r.fy_start_year) < currentFYStartYear);
      dep = depRowsToSum.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    }
    setDepreciationForPeriod(dep);
    setFinancialSummary({ totalRent, totalTaxDeductible, totalCapital, totalInterest, totalMortgage, totalOutOfPocket, rentalYield, annualCashflow, totalPL, plPerYear: null });
    profitPerYear();
  }, [transactions, summaryTab, form.currentvalue, form.purchasedate]);

  if (!form || !form.id) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', margin: 32, textAlign: 'center' }}>Property not found.</Text>
      </View>
    );
  }

  const handleChange = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateProperty(form.id, form);
      if (error) throw error;
      Logger.debug('Property updated successfully', { propertyId: form.id }, 'PropertyDetailsScreen.tsx');
      setEditMode(false);
    } catch (err: any) {
      Logger.debug('Error updating property', { error: err, message: err?.message }, 'PropertyDetailsScreen.tsx');
    } finally {
      setSaving(false);
    }
  };

  // Add handler for updating ownerships
  const handleOwnershipUpdate = async () => {
    // Refetch ownerships from DB after update
    if (form.id) {
      const ownershipRes = await fetchOwnershipsForProperty(form.id);
      setOwnerships(ownershipRes.data || []);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This will also remove all ownership records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePropertyOwnerships(form.id);
              await deleteProperty(form.id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete property.');
            }
          },
        },
      ]
    );
  };

  // Add export handlers
  const handleExportEOFY = async () => {
    if (!userId || !form || !isInvestmentProperty(form)) return;
    // Parse selected FY
    let fyYear = undefined;
    if (summaryTab !== 'since_purchase' && summaryTab.includes('-')) {
      fyYear = Number(summaryTab.split('-')[0]);
    } else if (form.purchasedate) {
      const d = new Date();
      fyYear = d.getMonth() < 6 ? d.getFullYear() - 1 : d.getFullYear();
    }
    if (!fyYear) return;
    const report = await generateEOFYReport({ userId, property: form, year: fyYear });

    // Filter transactions for the selected year
    const fyStart = new Date(fyYear, 6, 1, 0, 0, 0); // July 1
    const fyEnd = new Date(fyYear + 1, 5, 30, 23, 59, 59); // June 30
    const txs = (transactions || []).filter((t: any) => {
      const d = new Date(t.date);
      return d >= fyStart && d <= fyEnd;
    });
    const txTable = (title: string, type: string[]) => {
      const filtered = txs.filter((t: any) => type.includes(t.type));
      if (!filtered.length) return '';
      return `
        <h2>${title}</h2>
        <table>
          <tr><th>Date</th><th>Description</th><th>Amount</th></tr>
          ${filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => `<tr><td>${t.darte ? t.date.slice(0, 10) : ''}</td><td>${t.description || ''}</td><td>$${(t.amount || 0).toLocaleString()}</td></tr>`).join('')}
        </table>
      `;
    };

    // Compute depreciation for the selected FY from saved values
    const depRow = (fyDepRows || []).find(r => Number(r.fy_start_year) === Number(fyYear));
    const depreciationAmount = Number(depRow?.amount || 0);

    // Compose ATO-style HTML with second page for transactions
    const html = `
      <html><head><meta charset='utf-8'><style>
        body{font-family:sans-serif;}
        h1{color:#007AFF; font-size: 22px; margin-bottom: 0;}
        h2{color:#333; font-size: 18px; margin: 18px 0 8px 0;}
        h3{color:#333; font-size: 15px; margin: 12px 0 4px 0;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        td,th{border:1px solid #eee;padding:8px;}
        th{background:#f7f7f7;}
        .section{margin-bottom:18px;}
        .label{color:#888; font-size:13px;}
        .pagebreak{page-break-before:always;}
      </style></head><body>
      <h1>End of Financial Year Tax Report</h1>
      <div class='section'>
        <table>
          <tr><th>Year of Report</th><th>Property Name</th><th>Property Address</th></tr>
          <tr><td>${report.financialYear.replace('-', ' - ')}</td><td>${form.nickname || form.suburb || '-'}</td><td>${form.address}</td></tr>
        </table>
      </div>
      <div class='section'>
        <table>
          <tr><th>Name</th><th>% of Share</th></tr>
          ${report.ownerships.map(o => `<tr><td>${o.entity}</td><td>${o.percentage}</td></tr>`).join('')}
        </table>
      </div>
      <div class='section'>
        <table>
          <tr><th>Income/Expense Type</th><th>Amount</th></tr>
          <tr><td>Gross Income (A)</td><td>$${report.rentalIncome.toLocaleString()}</td></tr>
          <tr><td>Interest Paid (B)</td><td>$${report.interestPaid.toLocaleString()}</td></tr>
          <tr><td>Tax Deductible Expenses (C)</td><td>$${report.taxDeductibleExpenses.toLocaleString()}</td></tr>
          <tr><td>Gross Outgoings(B + C) (D)</td><td>$${(report.interestPaid + report.taxDeductibleExpenses).toLocaleString()}</td></tr>
          <tr><td>Net Income (Cash) (A-D) (E)</td><td>$${report.netCashFlow.toLocaleString()}</td></tr>
          <tr><td>Depreciation (Non-Cash) (F)</td><td>$${depreciationAmount.toLocaleString()}</td></tr>
          <tr><td>Taxable Income (E-F) (G)</td><td>$${(report.netCashFlow - depreciationAmount).toLocaleString()}</td></tr>
        </table>
      </div>
      <div class='pagebreak'></div>
      <h1>Detailed Transactions (${report.financialYear.replace('-', ' - ')})</h1>
      ${txTable('Income Transactions', ['RENT'])}
      ${txTable('Outgoing Transactions', ['EXPENSE', 'INTEREST'])}
      </body>
    </html>
    `;
    await exportReportAsPDF(html, `EOFY_Tax_Report_${report.address.replace(/\s+/g, '_')}_${report.financialYear}`);
  };

  // Helper: Should show 'Consider Selling' badge?
  const profitPerYear = () => {
    Logger.debug('Consider Selling Badge Calculation Start', { financialSummary, currentValue: form.currentvalue, sold: form.status === 'sold' }, 'PropertyDetailsScreen.tsx');
    if (!financialSummary || !form.currentvalue) return false;
    // Only show if property is marked as sold and has a sale value
    const saleAmount = form.currentvalue;
    const commission = saleAmount * 0.02;
    const legalCost = 3000;
    // P&L after sale: saleAmount - commission - legalCost + netIncome - totalOutOfPocket - totalLiabilities
    // But for badge, we want P&L per year >= $60,000
    // Use totalPL as base, but deduct commission and legal cost
    const plAfterSale = (financialSummary.totalPL ?? 0) - commission - legalCost;
    // Estimate years held
    let yearsHeld = 1;
    if (form.purchasedate) {
      const purchaseDate = new Date(form.purchasedate);
      const today = new Date();
      // Get exact years held in decimals
      const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
      yearsHeld = (today.getTime() - purchaseDate.getTime()) / msPerYear;
    }
    const plPerYear = plAfterSale / yearsHeld;
    Logger.debug('Consider Selling Badge Calculation', { plAfterSale, yearsHeld, plPerYear }, 'PropertyDetailsScreen.tsx');
    financialSummary.plPerYear = plPerYear; // Update state value
    return plPerYear >= 45000;
  }


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Highlighted Address with icons */}
        <View style={{ backgroundColor: '#e3f9f1', borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 12, borderWidth: 1, borderColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 4 }}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 2 }}>{form.address}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {categoryIcon(form.propertycategory, form.propertytype)}
          </View>
        </View>

        {/* Highlighted Market Value */}
        {editMode ? (
          <>
            {/* Market Value */}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontWeight: 'bold', fontSize: 25, color: (typeof form.currentvalue === 'number' && form.currentvalue >= form.purchaseprice) ? '#007AFF' : '#c0392b', backgroundColor: 'transparent', borderWidth: 0, marginBottom: 0 }]}
                value={String(form.currentvalue ?? '')}
                keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                onChangeText={v => handleChange('currentvalue', Number(v))}
                placeholder="Current/Sale Value"
              />
              <Text style={{ color: '#888', fontSize: 10 }}>Current/Sale Value</Text>
            </View>
            <View style={{ backgroundColor: '#fffbe6', padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
              {/* Purchase Price */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Purchase Price</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.purchaseprice)}
                  keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                  onChangeText={v => handleChange('purchaseprice', Number(v))}
                />
              </View>
              {/* Purchase Date */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Purchase Date</Text>
                <DatePicker
                  value={form.purchasedate ? formatDateDMY(form.purchasedate) : ''}
                  onChange={v => handleChange('purchasedate', parseDMYtoISO(v))}
                />
              </View>
            </View>
            <View style={{ backgroundColor: '#fffbe6', padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 16 }}>
              {/* Sold Toggle and Sale Date */}
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Status</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, paddingVertical: Platform.OS === 'android' ? 4 : 0, minHeight: Platform.OS === 'android' ? 56 : undefined }}>
                  <Picker
                    selectedValue={form.status ?? ''}
                    onValueChange={v => handleChange('status', v)}
                    style={{ height: Platform.OS === 'ios' ? 180 : 56 }}
                    itemStyle={Platform.OS === 'ios' ? { fontSize: 12 } : undefined}
                    mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                  >
                    <Picker.Item label="PPOR" value="ppor" />
                    <Picker.Item label="LEASED" value="leased" />
                    <Picker.Item label="FOR LEASE" value="for_lease" />
                    <Picker.Item label="FOR SALE" value="for_sale" />
                    <Picker.Item label="SOLD" value="sold" />
                    <Picker.Item label="UNDER BUILD" value="under_build" />
                    <Picker.Item label="UNDER OFFER" value="under_offer" />
                    <Picker.Item label="PROSPECT" value="prospect" />
                    <Picker.Item label="PENDING SETTLEMENT" value="pending_settlement" />
                  </Picker>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                {form.status === 'sold' && (
                  <>
                    <Text style={styles.label}>Sale Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                      <Text>{form.saledate ? new Date(form.saledate).toDateString() : 'Select sale date'}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DatePicker
                        value={form.saledate ? formatDateDMY(form.saledate) : ''}
                        onChange={v => {
                          setShowDatePicker(false);
                          handleChange('saledate', v ? parseDMYtoISO(v) : null);
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            </View>
          </>
        ) : (
          <View style={{ backgroundColor: '#fffbe6', padding: 14, marginBottom: 12, flexDirection: 'column', alignItems: 'center' }}>
            <Text style={{ color: (typeof form.currentvalue === 'number' && form.currentvalue >= form.purchaseprice) ? '#007AFF' : '#c0392b', fontWeight: 'bold', fontSize: 25 }}>
              ${form.currentvalue?.toLocaleString?.() ?? form.currentvalue}
            </Text>
            <Text style={{ color: '#888', fontSize: 10 }}>Market Value</Text>
          </View>
        )}
        {/* Pill style category and type display */}
        {!editMode && (
          <>
            <Text style={{ color: '#666', fontSize: 15, marginBottom: 8, marginTop: 2, textAlign: 'center', fontWeight: '600' }}>
              Purchased on {form.purchasedate ? (() => {
                const dateObj = new Date(form.purchasedate);
                const day = dateObj.getDate();
                const month = format(dateObj, 'MMMM');
                const year = dateObj.getFullYear();
                // Get ordinal suffix
                const getOrdinal = (n: number) => {
                  const s = ["th", "st", "nd", "rd"], v = n % 100;
                  return s[(v - 20) % 10] || s[v] || s[0];
                };
                const dayStr = day + '';
                const ordinal = getOrdinal(day);
                return (
                  <>
                    {dayStr}
                    <Text style={{ fontSize: 10, lineHeight: 15, textAlignVertical: 'top' }}>{ordinal}</Text>
                    {' '}{month} {year}
                  </>
                );
              })() : '-'} at ${form.purchaseprice?.toLocaleString?.() ?? form.purchaseprice}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', gap: 10, marginBottom: 4, marginTop: 4 }}>
              <View style={{ backgroundColor: '#e3f9f1', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 14, borderWidth: 1, borderColor: '#007AFF' }}>
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 13 }}>{form.propertycategory ? toTitleCase(form.propertycategory.replace(/_/g, ' ')) : 'Category'}</Text>
              </View>
              <View style={{ backgroundColor: '#f7f7f7', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 14, borderWidth: 1, borderColor: '#888' }}>
                <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 13 }}>{form.propertytype ? toTitleCase(form.propertytype.replace(/_/g, ' ')) : 'Type'}</Text>
              </View>
            </View>

          </>
        )}

        {/* Remove static display of category/type fields, show only in edit mode */}
        {editMode && (
          <>
            <Text style={styles.label}>Category</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, paddingVertical: Platform.OS === 'android' ? 4 : 0, minHeight: Platform.OS === 'android' ? 56 : undefined }}>
              <Picker
                selectedValue={form.propertycategory ?? ''}
                onValueChange={v => handleChange('propertycategory', v)}
                style={{ height: Platform.OS === 'ios' ? 180 : 56 }}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 12 } : undefined}
                mode={Platform.OS === 'android' ? 'dropdown' : undefined}
              >
                <Picker.Item label="Owner Occupied" value="OWNER_OCCUPIED" />
                <Picker.Item label="Investment" value="INVESTMENT" />
              </Picker>
            </View>
            <Text style={styles.label}>Type</Text>
            <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, paddingVertical: Platform.OS === 'android' ? 4 : 0, minHeight: Platform.OS === 'android' ? 56 : undefined }}>
              <Picker
                selectedValue={form.propertytype ?? ''}
                onValueChange={v => handleChange('propertytype', v)}
                style={{ height: Platform.OS === 'ios' ? 180 : 56 }}
                itemStyle={Platform.OS === 'ios' ? { fontSize: 12 } : undefined}
                mode={Platform.OS === 'android' ? 'dropdown' : undefined}
              >
                <Picker.Item label="Residential" value="RESIDENTIAL" />
                <Picker.Item label="Commercial" value="COMMERCIAL" />
                <Picker.Item label="Land Only" value="LAND_ONLY" />
                <Picker.Item label="Other" value="OTHER" />
              </Picker>
            </View>
          </>
        )}
        {/* Ownership Split */}
        <Text style={styles.label}>Ownership Split</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {ownerships.length > 0 ? (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', height: 36, borderRadius: 8, overflow: 'hidden', marginBottom: 0, backgroundColor: '#e0e0e0', borderWidth: 1, borderColor: '#d0d0d0' }}>
                {[...ownerships].sort((a, b) => (b.percentage || 0) - (a.percentage || 0)).map((o: any, idx: number) => {
                  const palette = ['#003366', '#0055A4', '#007AFF', '#339CFF', '#66CCFF', '#99D6FF', '#CCE6FF'];
                  const color = palette[idx % palette.length];
                  const flex = o.percentage || 0;
                  return (
                    <View key={idx} style={{ flex, backgroundColor: color, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', height: '100%' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={1} ellipsizeMode="tail">
                        {o.entities?.name || 'Unknown'} - {o.percentage ? `${o.percentage}%` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={{ color: '#aaa', flex: 1 }}>No ownership data.</Text>
          )}
          {/* Show edit button in edit mode */}
          {editMode && (
            <TouchableOpacity
              style={{ marginLeft: 5, backgroundColor: '#007AFF', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' }}
              onPress={() => setOwnershipModalVisible(true)}
            >
              <Feather name="users" size={18} color="#f7b731" />
            </TouchableOpacity>
          )}
        </View>
        {/* PropertyOwnershipForm Modal */}
        <PropertyOwnershipForm
          visible={ownershipModalVisible}
          onClose={() => setOwnershipModalVisible(false)}
          onSubmit={handleOwnershipUpdate}
          propertyId={form.id}
          initialOwnerships={ownerships.map(o => ({ entityId: o.entity_id || o.entityId, percentage: String(o.percentage) }))}
        />
        {/* Related Accounts */}
        {accounts.length > 0 ? (
          accounts.map((a: any, idx: number) => (
            <View
              key={idx}
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#007AFF',
                elevation: 2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#007AFF', fontWeight: '800', fontSize: 16, marginBottom: 2 }}>
                  {a.type ? toTitleCase(a.type.replace(/_/g, ' ')) : 'Account'}
                </Text>
                <Text style={{ color: '#666', fontWeight: '600', fontSize: 13, marginBottom: 2 }}>
                  {a.institution ? toTitleCase(a.institution) : 'No Institution Details'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 100 }}>
                <Text style={{ color: (typeof a.balance === 'number' && a.balance <= 0) ? '#007AFF' : '#c0392b', fontWeight: 'bold', fontSize: 20 }}>
                  ${a.balance?.toLocaleString?.() ?? a.balance}
                </Text>
                <Text style={{ color: '#888', fontSize: 10 }}>Remaining Balance</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={{ color: '#aaa', marginBottom: 8 }}>No related accounts.</Text>
        )}
        {/* Financial Summary Section */}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#007AFF', elevation: 2 }}>
          {/* Consider Selling Badge */}
          {financialSummary && profitPerYear() && (
            <View style={{ backgroundColor: '#f7b731', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 18, alignSelf: 'flex-start', marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="sale" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Consider Selling</Text>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 8 }}>
                (P & L: {financialSummary.plPerYear.toLocaleString?.() ?? financialSummary.plPerYear}/year)
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="finance" size={24} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#007AFF', flex: 1 }}>Financial Summary</Text>
            {isInvestmentProperty(form) && financialSummary && (
              <TouchableOpacity onPress={handleExportEOFY} style={{ backgroundColor: '#f7b731', borderRadius: 8, paddingVertical: 2, paddingHorizontal: 12, marginLeft: 8 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>EOFY Report</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Filter Tabs */}
          <View style={{ flexDirection: 'row', marginBottom: 16, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => setSummaryTab('since_purchase')} style={{ marginRight: 8, marginBottom: 6, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 16, backgroundColor: summaryTab === 'since_purchase' ? '#007AFF' : '#f2f6f9', borderWidth: summaryTab === 'since_purchase' ? 0 : 1, borderColor: '#e0e0e0' }}>
              <Text style={{ color: summaryTab === 'since_purchase' ? '#fff' : '#007AFF', fontWeight: 'bold', fontSize: 13 }}>Since Purchase</Text>
            </TouchableOpacity>
            {summaryYears.map(y => {
              // y is like '2024-2025', show as FY25 (second year % 100)
              const fyLabel = (() => {
                const parts = y.split('-');
                if (parts.length === 2) {
                  return `FY${String(parts[1]).slice(-2)}`;
                }
                return y;
              })();
              return (
                <TouchableOpacity key={y} onPress={() => setSummaryTab(y)} style={{ marginRight: 8, marginBottom: 6, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 16, backgroundColor: summaryTab === y ? '#007AFF' : '#f2f6f9', borderWidth: summaryTab === y ? 0 : 1, borderColor: '#e0e0e0' }}>
                  <Text style={{ color: summaryTab === y ? '#fff' : '#007AFF', fontWeight: 'bold', fontSize: 13 }}>{fyLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {financialSummary ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="cash-multiple" size={20} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Total Rent Received</Text>
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalRent?.toLocaleString?.() ?? financialSummary.totalRent}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="receipt" size={20} color="#c0392b" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Tax Deductible Expenses</Text>
                <Text style={{ color: '#c0392b', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalTaxDeductible?.toLocaleString?.() ?? financialSummary.totalTaxDeductible}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="hammer" size={20} color="#e67e22" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Capital Expenses</Text>
                <Text style={{ color: '#e67e22', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalCapital?.toLocaleString?.() ?? financialSummary.totalCapital}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="percent" size={20} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Interest Paid</Text>
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalInterest?.toLocaleString?.() ?? financialSummary.totalInterest}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="bank" size={20} color="#8e44ad" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Mortgage Payments</Text>
                <Text style={{ color: '#8e44ad', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalMortgage?.toLocaleString?.() ?? financialSummary.totalMortgage}</Text>
              </View>
              <View style={{ height: 2, backgroundColor: '#ccc', width: '100%', marginVertical: 10 }} />
              {summaryTab !== 'since_purchase' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                  <MaterialCommunityIcons name="chart-line" size={20} color="#007AFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#222', fontWeight: '700', flex: 1, fontSize: 12 }}>Annual Rental Yield</Text>
                  <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 12 }}>{financialSummary.rentalYield !== null ? financialSummary.rentalYield.toFixed(2) + '%' : '-'}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                <MaterialCommunityIcons name="cash" size={20} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={{ color: '#222', fontWeight: '700', flex: 1, fontSize: 12 }}>Annual Cashflow</Text>
                <Text style={{ color: financialSummary.annualCashflow >= 0 ? '#007AFF' : '#c0392b', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.annualCashflow?.toLocaleString?.() ?? financialSummary.annualCashflow}</Text>
              </View>
              {isInvestmentProperty(form) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                  <MaterialCommunityIcons name="calculator" size={20} color="#6c5ce7" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Depreciation (Non-Cash)</Text>
                  <Text style={{ color: '#6c5ce7', fontWeight: 'bold', fontSize: 12 }}>${depreciationForPeriod?.toLocaleString?.() ?? depreciationForPeriod}</Text>
                </View>
              )}
              {isInvestmentProperty(form) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color="#6c5ce7" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#222', fontWeight: '600', flex: 1, fontSize: 12 }}>Taxable Income</Text>
                  <Text style={{ color: '#6c5ce7', fontWeight: 'bold', fontSize: 12 }}>${(financialSummary.annualCashflow - (depreciationForPeriod ?? 0))?.toLocaleString?.() ?? 0}</Text>
                </View>
              )}
              {isInvestmentProperty(form) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                  <MaterialCommunityIcons name="cash-plus" size={20} color="#1976d2" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#222', fontWeight: '700', flex: 1, fontSize: 12 }}>Est. Tax Savings</Text>
                  <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 12 }}>${((financialSummary.annualCashflow - (depreciationForPeriod ?? 0)) * 0.43)?.toLocaleString?.() ?? 0}</Text>
                </View>
              )}
              {summaryTab === 'since_purchase' && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                    <MaterialCommunityIcons name="cash-minus" size={20} color="#c0392b" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#222', fontWeight: '700', flex: 1, fontSize: 12 }}>Out Of Pocket</Text>
                    <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalOutOfPocket?.toLocaleString?.() ?? financialSummary.totalOutOfPocket}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
                    <MaterialCommunityIcons name="chart-line-variant" size={20} color="#2eaf7d" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#222', fontWeight: '700', flex: 1, fontSize: 12 }}>P & L</Text>
                    <Text style={{ color: '#2eaf7d', fontWeight: 'bold', fontSize: 12 }}>${financialSummary.totalPL?.toLocaleString?.() ?? financialSummary.totalPL}</Text>
                    <TouchableOpacity
                      onPress={() => setShowPLModal(true)}
                      style={{ backgroundColor: '#f7b731', borderRadius: 8, paddingVertical: 1, paddingHorizontal: 12, marginLeft: 8 }}
                    >
                      <MaterialCommunityIcons name="file-document" size={18} color="#fff" />
                    </TouchableOpacity>
                    {/* PnL Report Cost Input Modal */}
                    <Modal
                      visible={showPLModal}
                      animationType="slide"
                      transparent
                      onRequestClose={() => setShowPLModal(false)}
                    >
                      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, color: '#007AFF' }}>P&amp;L Report Sale Costs</Text>
                          <Text style={{ marginBottom: 8 }}>Real Estate Cost</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <TouchableOpacity
                              style={{ backgroundColor: realEstateCostType === 'percent' ? '#007AFF' : '#eee', borderRadius: 8, padding: 8, marginRight: 8 }}
                              onPress={() => setRealEstateCostType('percent')}
                            >
                              <Text style={{ color: realEstateCostType === 'percent' ? '#fff' : '#007AFF', fontWeight: 'bold' }}>%</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ backgroundColor: realEstateCostType === 'absolute' ? '#007AFF' : '#eee', borderRadius: 8, padding: 8 }}
                              onPress={() => setRealEstateCostType('absolute')}
                            >
                              <Text style={{ color: realEstateCostType === 'absolute' ? '#fff' : '#007AFF', fontWeight: 'bold' }}>$</Text>
                            </TouchableOpacity>
                            <TextInput
                              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginLeft: 12, flex: 1, minWidth: 80 }}
                              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                              value={realEstateCostValue}
                              onChangeText={setRealEstateCostValue}
                              placeholder={realEstateCostType === 'percent' ? 'Percent' : 'Amount'}
                            />
                            <Text style={{ marginLeft: 4 }}>{realEstateCostType === 'percent' ? '%' : '$'}</Text>
                          </View>
                          <Text style={{ marginBottom: 8, marginTop: 8 }}>Legal Costs ($)</Text>
                          <TextInput
                            style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 16 }}
                            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                            value={legalCostValue}
                            onChangeText={setLegalCostValue}
                            placeholder="Legal Costs"
                          />
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => setShowPLModal(false)}
                              style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#eee', marginRight: 8 }}
                            >
                              <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={async () => {
                                setShowPLModal(false);
                                if (!userId) return;
                                // Parse values
                                const realEstateCostNum = parseFloat(realEstateCostValue);
                                const legalCostNum = parseFloat(legalCostValue);
                                if (isNaN(realEstateCostNum) || isNaN(legalCostNum)) {
                                  Alert.alert('Invalid Input', 'Please enter valid numbers for costs.');
                                  return;
                                }
                                // Call generatePLReport with new params
                                await generatePLReport({
                                  userId,
                                  property: form,
                                  realEstateCostInput: { type: realEstateCostType, value: realEstateCostNum },
                                  legalCosts: legalCostNum
                                });
                              }}
                              style={{ paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#007AFF' }}
                            >
                              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Generate Report</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  </View>
                </>
              )}
            </View>
          ) : (
            <Text style={{ color: '#aaa', textAlign: 'center', marginVertical: 12 }}>No financial data available.</Text>
          )}
        </View>
        {/* Depreciation per FY (Investment properties) */}
        {isInvestmentProperty(form) && (
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#007AFF', elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons name="clipboard-list" size={22} color="#007AFF" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#007AFF', flex: 1 }}>Depreciation (Per Financial Year)</Text>
            </View>
            {(fyDepRows || []).length === 0 ? (
              <Text style={{ color: '#888' }}>No depreciation values added yet.</Text>
            ) : (
              <View>
                {fyDepRows.map((it: any) => (
                  <View key={it.id} style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fafafa', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#333' }}>FY{String((Number(it.fy_start_year) + 1)).slice(-2)} ({it.fy_start_year}-{Number(it.fy_start_year)+1})</Text>
                      <Text style={{ color: '#777', fontSize: 12 }}>Amount: ${Number(it.amount || 0).toLocaleString()}</Text>
                    </View>
                    {editMode && (
                      <TouchableOpacity onPress={async () => { await deleteFYDep(it.id); const res = await fetchFYDepForProperty(userId!, Number(form.id)); setFyDepRows((res.data || []) as any); }} style={{ padding: 8, backgroundColor: '#c0392b', borderRadius: 6 }}>
                        <MaterialCommunityIcons name="delete" size={18} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}
            {editMode && (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }}>
                <Text style={{ fontWeight: '700', marginBottom: 8 }}>Add FY Depreciation</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Financial Year</Text>
                        <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', paddingVertical: Platform.OS === 'android' ? 4 : 0, minHeight: Platform.OS === 'android' ? 56 : undefined }}>
                          {/* Generate financial year options outside JSX */}
                          {(() => {
                            let purchaseDate = form.purchasedate ? new Date(form.purchasedate) : null;
                            if (purchaseDate && purchaseDate.getMonth() >= 6) {
                              purchaseDate.setFullYear(purchaseDate.getFullYear() + 1);
                            }
                            const startYear = purchaseDate ? purchaseDate.getFullYear() : new Date().getFullYear();
                            const fyOptions: string[] = [];
                            for (let yr = startYear; yr <= startYear + 40; yr++) {
                              fyOptions.push(`${yr}-${yr + 1}`);
                            }
                            return (
                              <Picker
                                selectedValue={depFY.fyStartYear || (summaryTab !== 'since_purchase' && summaryTab.includes('-') ? Number(String(summaryTab).split('-')[0]) : undefined)}
                                onValueChange={(v) => setDepFY((p) => ({ ...p, fyStartYear: Number(v) }))}
                                style={{ height: Platform.OS === 'ios' ? 180 : 56 }}
                                itemStyle={Platform.OS === 'ios' ? { fontSize: 12 } : undefined}
                                mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                              >
                                {fyOptions.map((y) => (
                                  <Picker.Item key={y} label={`FY${String(y.split('-')[1]).slice(-2)}`} value={Number(y.split('-')[0])} />
                                ))}
                              </Picker>
                            );
                          })()}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Amount ($)</Text>
                      <TextInput
                        placeholder="Amount"
                        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                        value={depFYAmountInput}
                        onChangeText={setDepFYAmountInput}
                        style={styles.input}
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!userId || !form?.id) return;
                      const amt = parseFloat(depFYAmountInput);
                      if (!depFY.fyStartYear || isNaN(amt)) {
                        Alert.alert('Missing fields', 'Please select a financial year and enter a valid amount.');
                        return;
                      }
                      const payload = {
                        user_id: userId,
                        property_id: Number(form.id),
                        fy_start_year: Number(depFY.fyStartYear),
                        amount: amt,
                      };
                      const { error } = await upsertFYDep(payload as any);
                      if (error) {
                        Alert.alert('Error', error.message || 'Failed to save item');
                        return;
                      }
                      const res = await fetchFYDepForProperty(userId, Number(form.id));
                      setFyDepRows((res.data || []) as any);
                      setDepFY({});
                      setDepFYAmountInput('');
                    }}
                    style={{ backgroundColor: '#2eaf7d', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save FY Amount</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        {/* Add more fields as needed */}
      </ScrollView>
      <TouchableOpacity
        style={styles.editButton}
        onPress={editMode ? handleSave : () => setEditMode(true)}
        disabled={saving}
      >
        <MaterialCommunityIcons name={editMode ? 'content-save' : 'pencil'} size={24} color="#fff" />
      </TouchableOpacity>
      {/* Floating Delete Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
          backgroundColor: '#c0392b',
          borderRadius: 32,
          padding: 16,
          elevation: 4,
        }}
        onPress={handleDelete}
      >
        <MaterialCommunityIcons name="delete" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
