import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntityContext } from '@/components/EntityContext';
import { Logger } from '@/lib/logger';
import { MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { fetchAccountsByUserIds, createAccount, updateAccount, deleteAccount } from '@/lib/supabase/accounts';
import { fetchUserProperties } from '@/lib/supabase/properties';
import AccountForm from './AccountForm';
import { convertCurrency } from '@/utils/currency';
import { getAccountsScreenStyles } from '@/styles/AccountsScreenStyles';

const ACCOUNT_TYPE_ICON_MAP: Record<string, { icon: (size?: number) => React.ReactNode; label: string }> = {
  mortgage: {
    icon: (size = 14) => <FontAwesome5 name="hand-holding-usd" size={size} color="#8e44ad" />, label: 'Mortgage',
  },
  savings: {
    icon: (size = 14) => <FontAwesome5 name="piggy-bank" size={size} color="#27ae60" />, label: 'Savings',
  },
  deposits: {
    icon: (size = 14) => <MaterialCommunityIcons name="bank" size={size} color="#007AFF" />, label: 'Deposits',
  },
  superannuation: {
    icon: (size = 14) => <MaterialCommunityIcons name="account-cash" size={size} color="#f7b731" />, label: 'Superannuation',
  },
  stocks: {
    icon: (size = 14) => <FontAwesome5 name="chart-line" size={size} color="#e67e22" />, label: 'Stocks',
  },
  mutual_funds: {
    icon: (size = 14) => <MaterialCommunityIcons name="finance" size={size} color="#c0392b" />, label: 'Mutual Funds',
  },
  assets: {
    icon: (size = 14) => <MaterialCommunityIcons name="diamond-stone" size={size} color="#2eaf7d" />, label: 'Assets',
  },
};

const ACCOUNT_TYPES = [
  'mortgage',
  'savings',
  'deposits',
  'superannuation',
  'stocks',
  'mutual_funds',
  'assets',
];

const FILTERS = {
  type: '',
};

const CURRENCY_SYMBOLS: Record<string, { symbol: string; suffix?: string }> = {
  AUD: { symbol: '$', suffix: '' },
  USD: { symbol: '$', suffix: ' USD' },
  INR: { symbol: '₹', suffix: ' INR' },
};

const AccountCard = ({ account, onEdit }: { account: any, onEdit?: () => void }) => {
  const scheme = 'light'; //useColorScheme() || 'light';
  const styles = getAccountsScreenStyles(scheme);

  const typeInfo = ACCOUNT_TYPE_ICON_MAP[account.type] || {
    icon: (size = 14) => <FontAwesome5 name="question" size={size} color="#666" />, label: account.type,
  };
  const currency = account.currency || 'AUD';
  const { symbol, suffix } = CURRENCY_SYMBOLS[currency] || { symbol: '', suffix: currency };
  // Format balance based on currency
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onEdit}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginBottom: 2 }}>
        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          {typeInfo.icon(14)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.typeLabel}>{typeInfo.label}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={account.type === 'mortgage' ? styles.amountRed : styles.amountGreen}>
            {symbol}{account.balance.toFixed(2).toLocaleString()}{suffix && <Text style={{fontSize:13, color:'#888'}}>{suffix}</Text>}
          </Text>
        </View>
      </View>
      {/* Interest Rate (left) and Institution (right) Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 2 }}>
        {/* Institution always on the left */}
        <View style={{ flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
          {account.institution ? (
            <Text style={styles.institutionLarge} numberOfLines={2} ellipsizeMode="tail">{account.institution}</Text>
          ) : null}
        </View>
        {/* Interest Rate always on the right */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          {account.interest_rate !== undefined && account.interest_rate !== null && (
            <>
              <Text style={{ fontSize: 12, color: '#555', fontWeight: '500' }}>Interest Rate: </Text>
              <Text style={{ fontSize: 12, color: '#2eaf7d', fontWeight: '600' }}>{account.interest_rate}%</Text>
            </>
          )}
        </View>
        
      </View>
    </TouchableOpacity>
  );
};


export default function AccountsScreen() {
  const scheme = 'light'; //useColorScheme() || 'light';
  const styles = getAccountsScreenStyles(scheme);
  const insets = useSafeAreaInsets();
  const { userId, selectedEntity, entities, setSelectedEntity, loading: entityLoading, error: entityError } = useEntityContext();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(FILTERS);
  const [formVisible, setFormVisible] = useState(false);
  const [editAccount, setEditAccount] = useState<any | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [propertyOptions, setPropertyOptions] = useState<{ label: string; value: string }[]>([]);
  
  useEffect(() => {
    async function loadProperties() {
      if (!userId) return;
      const { data: properties } = await fetchUserProperties(userId);
      setPropertyOptions((properties || []).map((p: any) => ({ label: p.address, value: p.id })));
    }
    loadProperties();
  }, [userId]);

  useEffect(() => {
    async function loadAccounts() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await fetchAccountsByUserIds(userId ? [userId] : []);
        if (error) throw error;
        Logger.info('Loaded accounts', { count: Array.isArray(data) ? data.length : 0 });
        setAccounts(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    }
    if (userId && entities.length) loadAccounts();
  }, [userId, selectedEntity, entities]);

  // Calculate total balance in selected currency
  const [totalAUD, setTotalAUD] = useState(0);
  const [totalINR, setTotalINR] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState('AUD');
  useEffect(() => {
    async function calcTotal() {
      let acc = 0;
      for (const a of accounts) {
        const bal = Number(a.balance) || 0;
        const currency = a.currency || 'AUD';
        const type = a.type;
        let audBal = bal;
        if (currency !== 'AUD') {
          try {
            audBal = await convertCurrency(bal, currency, 'AUD');
          } catch (e) {
            audBal = bal;
          }
        }
        if (["savings", "deposits", "assets", "superannuation"].includes(type)) {
          acc += audBal;
        } else if (["mortgage", "loans"].includes(type)) {
          acc -= audBal;
        }
      }
      setTotalAUD(acc / 1_000_000_000);
      setTotalINR(await convertCurrency(acc, 'AUD', 'INR') / 1_000_000_00);
    }
    calcTotal();
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = accounts.filter((a: any) => {
    let match = true;
    if (filters.type && a.type !== filters.type) match = false;
    return match;
  });

  // Add
  const handleAdd = () => {
    setEditAccount(null);
    setFormVisible(true);
  };
  // Edit
  const handleEdit = async (acc: any) => {
    setFormLoading(true);
    Logger.info('Editing account', { accountId: acc.id, accountType: acc.type, accountBalance: acc.balance, accountInstitution: acc.institution, accountPropertyId: acc.property_id, accountOffsetId: acc.offset_account_id });
    setEditAccount({
      id: acc.id,
      type: acc.type || '',
      balance: acc.balance != null ? String(acc.balance) : '',
      institution: acc.institution || '',
      property_id: acc.property_id ? String(acc.property_id) : '',
      offset_account_id: acc.offset_account_id ? String(acc.offset_account_id) : '',
      interest_rate: acc.interest_rate !== undefined && acc.interest_rate !== null ? String(acc.interest_rate) : '',
      currency: acc.currency || 'AUD',
    });
    setFormLoading(false);
    setFormVisible(true);
  };
  // Delete
  const handleDelete = async (acc: any) => {
    setFormLoading(true);
    // Then, delete the account
    await deleteAccount(acc.id);
    setFormLoading(false);
    // Refresh
    const { data } = await fetchAccountsByUserIds(userId ? [userId] : []);
    Logger.info('Deleted account', { accountId: acc.id });
    setAccounts(data || []);
  };
  // Submit (add/edit)
  const handleFormSubmit = async (form: any) => {
    Logger.debug('Submitting account form', { form, isEdit: !!editAccount });
    setFormLoading(true);
    if (!editAccount) {
      // Validate required fields
      if (!form.type || !form.balance) {
        setFormLoading(false);
        throw new Error('Please fill all required fields: Type, Balance');
      }
      // Insert into accounts
      const { data: accountData, error: accountError } = await createAccount({
        type: form.type,
        balance: Number(form.balance),
        institution: form.institution || '',
        user_id: userId,
        currency: form.currency || 'AUD',
        property_id: form.property_id ? Number(form.property_id) : null,
        offset_account_id: form.offset_account_id ? Number(form.offset_account_id) : null,
        interest_rate: form.interest_rate ? Number(form.interest_rate) : null,
      });
      const newAccountId = accountData && Array.isArray(accountData) && (accountData as any[]).length > 0 && (accountData as any[])[0].id ? (accountData as any[])[0].id : undefined;
      if (accountError || !newAccountId) {
        setFormLoading(false);
        throw new Error(accountError?.message || 'Failed to create account');
      }
      
    } else {
      // Update account
      Logger.debug('Updating account', { accountId: editAccount.id, form }, 'AccountsScreen.tsx');
      let updatedAccount = {...form, balance: Number(form.balance)};
      await updateAccount(editAccount.id, updatedAccount);
      
    }
    setFormLoading(false);
    setFormVisible(false);
    // Refresh
    const { data } = await fetchAccountsByUserIds(userId ? [userId] : []);
    if (editAccount) {
      Logger.info('Updated account', { accountId: editAccount.id });
    } else {
      Logger.info('Created new account');
    }
    setAccounts(data || []);
  };
  
  // Entity selector UI (same as dashboard/properties)
  if (entityLoading) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;
  }
  if (entityError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading entities: {entityError}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingHorizontal: 16, backgroundColor: '#f9f9f9' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>Accounts</Text>
      </View>
      {/* Filters */}
      <View style={styles.filterCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
          {/* Type filter */}
          <View style={styles.filterSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(() => {
                const active = !filters.type;
                return (
                  <TouchableOpacity onPress={() => setFilters(f => ({ ...f, type: '' }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <Text style={active ? styles.filterOptionTextActive : styles.filterOptionText}>All</Text>
                  </TouchableOpacity>
                );
              })()}
              {ACCOUNT_TYPES.map((type) => {
                const active = filters.type === type;
                return (
                  <TouchableOpacity key={type} onPress={() => setFilters(f => ({ ...f, type }))} style={[styles.filterOption, active && styles.filterOptionActive]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {ACCOUNT_TYPE_ICON_MAP[type]?.icon(14)}
                      <Text style={[active ? styles.filterOptionTextActive : styles.filterOptionText, { marginLeft: 6 }]}>
                        {ACCOUNT_TYPE_ICON_MAP[type]?.label || type}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
      {/* Account list */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 14 }} />
      ) : error ? (
        <Text style={{ color: '#c0392b', textAlign: 'center', marginTop: 32 }}>{error}</Text>
      ) : (
        // sort first by currency (AUD, USD, INR), then by balance descending
        <FlatList
          data={filteredAccounts.sort((a: any, b: any) => {
            const currencyOrder: Record<string, number> = { 'AUD': 0, 'USD': 1, 'INR': 2 };
            const currencyAKey: string = typeof a.currency === 'string' ? a.currency : 'AUD';
            const currencyBKey: string = typeof b.currency === 'string' ? b.currency : 'AUD';
            const currencyA = currencyOrder[currencyAKey] !== undefined ? currencyOrder[currencyAKey] : 3;
            const currencyB = currencyOrder[currencyBKey] !== undefined ? currencyOrder[currencyBKey] : 3;
            if (currencyA !== currencyB) return currencyA - currencyB;
            return (b.balance || 0) - (a.balance || 0);
          })}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              onEdit={() => handleEdit(item)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* Floating Add Button */}
          <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <AntDesign name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Account form (modal) */}
      {formVisible && (
        <AccountForm
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          onSubmit={handleFormSubmit}
          initialData={editAccount || {}}
          loading={formLoading}
          isEdit={!!editAccount}
          onDelete={editAccount ? async () => { await handleDelete(editAccount); } : undefined}
        />
      )}
      
    </View>
  );
}
