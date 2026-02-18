import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Transaction, createTransaction, updateTransaction, deleteTransaction, fetchTransactions } from '@/lib/supabase/transaction';
import { useEntityContext } from '@/components/EntityContext';
import { Logger } from '@/lib/logger';
import { MaterialCommunityIcons, FontAwesome5, Ionicons, FontAwesome, AntDesign, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import TransactionForm from './TransactionForm';
import TransactionWorksheet from './TransactionWorksheet';
import { fetchUserProperties } from '@/lib/supabase/properties';
import { fetchAccountsByUserIds as fetchAccountsByUserIds } from '@/lib/supabase/accounts';
import { supabase } from '@/lib/supabase';
import { getTransactionsScreenStyles } from '@/styles/TransactionsScreenStyles';
import { useColorScheme } from '@/components/useColorScheme';

const TRANSACTION_TYPE_ICON_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  INTEREST: {
    icon: <MaterialCommunityIcons name="percent" size={14} color="#007AFF" />,
    label: 'Interest',
  },
  OUT_OF_POCKET: {
    icon: <FontAwesome5 name="money-bill-wave" size={14} color="#27ae60" />,
    label: 'Out-of-Pocket',
  },
  CAPITAL_EXPENSE: {
    icon: <MaterialCommunityIcons name="tools" size={14} color="#e67e22" />,
    label: 'Capital Expense',
  },
  MORTGAGE: {
    icon: <FontAwesome5 name="hand-holding-usd" size={14} color="#8e44ad" />,
    label: 'Mortgage',
  },
  RENT: {
    icon: <Ionicons name="home" size={14} color="#2eaf7d" />,
    label: 'Rent',
  },
  EXPENSE: {
    icon: <FontAwesome name="file-text-o" size={14} color="#c0392b" />,
    label: 'Expense',
  },
};

const TransactionCard = ({ transaction, onEdit }: { transaction: any, onEdit?: () => void }) => {
  const scheme = 'light'; //useColorScheme();
  const styles = getTransactionsScreenStyles(scheme);
  const typeInfo = TRANSACTION_TYPE_ICON_MAP[transaction.type] || {
    icon: <FontAwesome5 name="question" size={22} color="#666" />,
    label: transaction.type,
  };
  // Format date as dd-mm-yyyy
  const formatDateDMY = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };
  return (
    <TouchableOpacity style={[styles.card, {borderWidth: 1, borderColor: '#ccc'}]} onPress={onEdit} activeOpacity={0.85}>
      {/* Row 1: Icon (type), Description, Date, Amount */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {typeInfo.icon}
          <Text
            style={[styles.mutedText, { marginLeft: 8, flexShrink: 1 }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {transaction.description || typeInfo.label}
          </Text>
        </View>
        
        <Text style={[styles.amount, { marginLeft: 12 }]}>${transaction.amount?.toLocaleString()}</Text>
      </View>
      {/* Row 2: Property (small text) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center'}}>
          <Feather name="home" size={10} style={styles.inlineIcon} />
          <Text style={styles.propertySmall} numberOfLines={1} ellipsizeMode="tail">
            {transaction.property?.address || 'N/A'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center'}}>
          <Feather name="calendar" size={10} style={styles.inlineIcon} />
          <Text style={styles.mutedText}>{formatDateDMY(transaction.date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DATE_RANGE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'This week', value: 'this_week' },
  { label: 'This month', value: 'this_month' },
  { label: 'Current FY', value: 'this_fin_year' },
  { label: 'Last FY', value: 'last_fin_year' },
];

function getDateRange(type: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let start: Date | null = null;
  let end: Date | null = null;
  switch (type) {
    case 'this_week': {
      const first = now.getDate() - now.getDay();
      start = new Date(now.setDate(first));
      end = new Date();
      break;
    }
    case 'this_month': {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
      break;
    }
    case 'this_fin_year': {
      // Australian FY: July 1 - June 30
      if (month < 6) { // Jan-Jun
        start = new Date(year - 1, 6, 1); // July 1 last year
        end = new Date(year, 5, 30, 23, 59, 59, 999); // June 30 this year
      } else { // Jul-Dec
        start = new Date(year, 6, 1); // July 1 this year
        end = new Date(year + 1, 5, 30, 23, 59, 59, 999); // June 30 next year
      }
      break;
    }
    case 'last_fin_year': {
      // Australian FY: July 1 - June 30
      if (month < 6) { // Jan-Jun
        start = new Date(year - 2, 6, 1); // July 1 two years ago
        end = new Date(year - 1, 5, 30, 23, 59, 59, 999); // June 30 last year
      } else { // Jul-Dec
        start = new Date(year - 1, 6, 1); // July 1 last year
        end = new Date(year, 5, 30, 23, 59, 59, 999); // June 30 this year
      }
      break;
    }
    default:
      break;
  }
  return { start, end };
}

const FILTERS = {
  property: '',
  type: '',
  dateRangeType: 'all',
  startDate: '',
  endDate: '',
};

// Type for transaction with joined property
interface TransactionWithProperty extends Transaction {
  property?: { id: number; address: string };
}

function formatDateDMY(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useEntityContext();
  const [transactions, setTransactions] = useState<TransactionWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(FILTERS);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [worksheetVisible, setWorksheetVisible] = useState(false);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [editTx, setEditTx] = useState<TransactionWithProperty | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: number }[]>([]);
  const [accountOptions, setAccountOptions] = useState<{ label: string; value: string | number }[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const scheme = 'light'; //useColorScheme();
  const styles = getTransactionsScreenStyles(scheme);
  
  useEffect(() => {
    async function loadTransactions() {
      setLoading(true);
      setError(null);
      const transactionId = Logger.createTransactionId();
      Logger.info('Loading transactions in TransactionsScreen', { userId }, 'TransactionsScreen.tsx', transactionId);
      const { data, error } = await fetchTransactions(userId);
      if (error) {
        Logger.error('Failed to load transactions in TransactionsScreen', { error }, 'TransactionsScreen.tsx', transactionId);
        setError(error.message);
      } else {
        Logger.debug('Transactions loaded in TransactionsScreen', { count: data?.length }, 'TransactionsScreen.tsx', transactionId);
      }
      // Fix: property is returned as array, map to single object
      const mapped = (data || []).map((t: any) => ({
        ...t,
        property: Array.isArray(t.property) ? t.property[0] : t.property,
        account: Array.isArray(t.account) ? t.account[0] : t.account, // <-- Fix: flatten account field
      }));
      setTransactions(mapped);
      setLoading(false);
    }
    if (userId) loadTransactions();
  }, [userId]);

  useEffect(() => {
    async function loadOptions() {
      if (!userId) return;
      // Fetch properties
      const { data: properties } = await fetchUserProperties(userId);
      setPropertyOptions((properties || []).map((p: any) => ({ label: p.address, value: p.id })));
      // Fetch accounts
      const { data: accounts } = await fetchAccountsByUserIds([userId]);
      setAccountOptions((accounts || []).map((a: any) => ({ label: `${a.institution || a.type || 'Account'} (${a.id})`, value: a.id })));
    }
    loadOptions();
  }, [userId]);

  // Dummy property/type lists for filter dropdowns
  const typeOptions = Array.from(new Set(transactions.map(t => t.type)));

  // Date range type
  type DateRange = { start: Date | null; end: Date | null };
  let dateRange: DateRange = { start: null, end: null };
  if (filters.dateRangeType !== 'all') {
    dateRange = getDateRange(filters.dateRangeType);
  }

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    let match = true;
    if (filters.property && t.property?.address !== filters.property) match = false;
    if (filters.type && t.type !== filters.type) match = false;
    if (dateRange.start && new Date(t.date) < dateRange.start) match = false;
    if (dateRange.end && new Date(t.date) > dateRange.end) match = false;
    if (match && searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const qDigits = q.replace(/[^0-9.]/g, '');
      const desc = (t.description || '').toLowerCase();
      const type = (t.type || '').toLowerCase();
      const amountStr = String(t.amount ?? '');
      const amountDigits = amountStr.replace(/[^0-9.]/g, '');
      const searchMatch =
        desc.includes(q) ||
        type.includes(q) ||
        (qDigits.length > 0 && amountDigits.includes(qDigits));
      if (!searchMatch) match = false;
    }
    return match;
  });

  // Add
  const handleAdd = () => {
    // Show simple menu to choose single or worksheet add
    setAddMenuVisible(true);
  };

  const handleAddSingle = () => {
    setAddMenuVisible(false);
    setEditTx(null);
    setFormVisible(true);
  };

  const handleAddWorksheet = () => {
    setAddMenuVisible(false);
    setWorksheetVisible(true);
  };
  // Edit
  const handleEdit = (tx: TransactionWithProperty) => {
    setEditTx(tx);
    setFormVisible(true);
  };
  // Delete
  const handleDelete = async (tx: TransactionWithProperty) => {
    setFormLoading(true);
    await deleteTransaction(tx.id);
    setFormLoading(false);
    // Refresh
    const { data } = await fetchTransactions(userId);
    const mapped = (data || []).map((t: any) => ({ ...t, property: Array.isArray(t.property) ? t.property[0] : t.property }));
    setTransactions(mapped);
  };
  // Submit (add/edit)
  const handleFormSubmit = async (form: Partial<Transaction>) => {
    setFormLoading(true);
    // Validate required fields for add
    if (!editTx) {
      if (!form.propertyid || !form.amount || !form.date || !form.type) {
        setFormLoading(false);
        throw new Error('Please fill all required fields: Property ID, Amount, Date, Type');
      }
      await createTransaction({
        user_id: userId,
        propertyid: form.propertyid,
        amount: form.amount,
        date: form.date,
        type: form.type,
        description: form.description || '',
        entity_id: form.entity_id,
      });
    } else {
      await updateTransaction(editTx.id, {user_id: userId, propertyid: form.propertyid, amount: form.amount, date: form.date, type: form.type, description: form.description || '', entity_id: form.entity_id });
    }
    setFormLoading(false);
    setFormVisible(false);
    // Refresh
    const { data } = await fetchTransactions(userId);
    const mapped = (data || []).map((t: any) => ({ ...t, property: Array.isArray(t.property) ? t.property[0] : t.property }));
    setTransactions(mapped);
  };

  // Bulk submit rows from worksheet
  const handleSubmitBulk = async (rows: Partial<Transaction>[]) => {
    setFormLoading(true);
    try {
      for (const r of rows) {
        // Ensure required fields
        if (!r.propertyid || !r.amount || !r.date || !r.type) continue;
        await createTransaction({
          user_id: userId,
          propertyid: r.propertyid,
          amount: Number(r.amount),
          date: r.date as string,
          type: r.type as string,
          description: r.description || '',
          entity_id: r.entity_id
        });
      }
    } finally {
      setFormLoading(false);
      setWorksheetVisible(false);
      // Refresh
      const { data } = await fetchTransactions(userId);
      const mapped = (data || []).map((t: any) => ({ ...t, property: Array.isArray(t.property) ? t.property[0] : t.property }));
      setTransactions(mapped);
    }
  };

  if (loading) {
    return (
  <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" color="#2eaf7d" />
      </View>
    );
  }

  if (error) {
    return (
  <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
  <View style={[styles.container, { paddingTop: insets.top }]}> 
  <View style={styles.headerRow}>
  <Text style={styles.headerText}>Transactions</Text>
      </View>
      {/* Filters */}
      <View style={styles.filterCard}>
        <ScrollView>
          {/* Search filter */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} style={styles.searchIcon} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by amount, description, or type"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Search transactions"
            />
            {searchText?.length ? (
              <TouchableOpacity onPress={() => setSearchText('')} style={styles.searchClear} accessibilityLabel="Clear search">
                <Feather name="x-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
          {/* Property filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Feather name="home" size={14} style={styles.filterHeaderIcon} />
              <Text style={styles.filterLabel}>Property</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(() => {
                const active = !filters.property;
                return (
                  <TouchableOpacity onPress={() => setFilters(f => ({ ...f, property: '' }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <Text style={active ? styles.filterOptionTextActive : styles.filterOptionText}>All</Text>
                  </TouchableOpacity>
                );
              })()}
              {propertyOptions.map((p) => {
                const active = filters.property === p.label;
                return (
                  <TouchableOpacity key={p.value} onPress={() => setFilters(f => ({ ...f, property: p.label || '' }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[active ? styles.filterOptionTextActive : styles.filterOptionText, { maxWidth: 140 }]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {/* Type filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Feather name="tag" size={14} style={styles.filterHeaderIcon} />
              <Text style={styles.filterLabel}>Type</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}>
              {(() => {
                const active = !filters.type;
                return (
                  <TouchableOpacity onPress={() => setFilters(f => ({ ...f, type: '' }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <Text style={active ? styles.filterOptionTextActive : styles.filterOptionText}>All</Text>
                  </TouchableOpacity>
                );
              })()}
              {typeOptions.map((t) => {
                const active = filters.type === t;
                return (
                  <TouchableOpacity key={t} onPress={() => setFilters(f => ({ ...f, type: t }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {TRANSACTION_TYPE_ICON_MAP[t]?.icon}
                      <Text style={[active ? styles.filterOptionTextActive : styles.filterOptionText, { marginLeft: 6 }]}>
                        {TRANSACTION_TYPE_ICON_MAP[t]?.label || t}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {/* Date range filter */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <Feather name="calendar" size={14} style={styles.filterHeaderIcon} />
              <Text style={styles.filterLabel}>Date</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DATE_RANGE_OPTIONS.map(opt => {
                const active = filters.dateRangeType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setFilters(f => ({
                      ...f,
                      dateRangeType: opt.value,
                    }))}
                    style={[styles.filterOption, active && styles.filterOptionActive]}
                  >
                    <Text style={active ? styles.filterOptionTextActive : styles.filterOptionText}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onEdit={() => handleEdit(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>No transactions found.</Text>}
      />
      {/* Floating Add Button */}
  <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <AntDesign name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Add option modal */}
      {addMenuVisible && (
        <View style={{ position: 'absolute', right: 24, bottom: 96, backgroundColor: '#fff', borderRadius: 12, elevation: 6, padding: 8 }}>
          <TouchableOpacity style={{ padding: 8 }} onPress={handleAddSingle}><Text>Add Single Transaction</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={handleAddWorksheet}><Text>Add Worksheet (Multiple)</Text></TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => setAddMenuVisible(false)}><Text style={{ color: '#c0392b' }}>Cancel</Text></TouchableOpacity>
        </View>
      )}
      {/* Add/Edit Modal */}
      <TransactionForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialData={editTx || {}}
        loading={formLoading}
        isEdit={!!editTx}
        propertyOptions={propertyOptions}
        accountOptions={accountOptions}
        onDelete={editTx ? async () => {
          await handleDelete(editTx);
        } : undefined}
      />
      <TransactionWorksheet
        visible={worksheetVisible}
        onClose={() => setWorksheetVisible(false)}
        onSubmitBulk={handleSubmitBulk}
        propertyOptions={propertyOptions}
        accountOptions={accountOptions}
      />
    </View>
  );
}

const toTitleCase = (str?: string) =>
  str ? str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) : '';
