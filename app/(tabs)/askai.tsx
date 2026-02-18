import React from 'react';
import { Text, View } from 'react-native';
import { AskAIChat } from '@/components/AskAIChat';
import { useEntityContext } from '@/components/EntityContext';
import { getStyles } from '@/styles/GlobalStyles';
import { fetchUserProperties, fetchPropertiesByIds } from '@/lib/supabase/properties';
import { fetchAccountsByPropertyIds, fetchAccountsByUserIds } from '@/lib/supabase/accounts';
import { fetchTransactions } from '@/lib/supabase/transaction';
import { fetchPropertyIdsForEntity } from '@/lib/supabase/ownership';
import { Logger } from '@/lib/logger';
import {
  ChatMessage,
  getRequiredPortfolioData,
  isResearchRequest,
  PortfolioSnapshot,
} from '@/lib/ai/portfolioChat';

export default function AskAIScreen() {
  const colorScheme = 'light';
  const styles = getStyles(colorScheme);
  const { selectedEntity, userId } = useEntityContext();

  const buildSnapshot = (
    accounts: any[],
    properties: any[],
    transactions: any[]
  ): PortfolioSnapshot => ({
    accounts: accounts.map(account => ({
      id: account.id,
      balance: account.balance ?? null,
      type: account.type ?? null,
      institution: account.institution ?? null,
      propertyId: account.property_id ?? null,
      offsetAccountId: account.offset_account_id ?? null,
      currency: account.currency ?? null,
      interestRate: account.interest_rate ?? null,
    })),
    properties: properties.map(property => ({
      id: property.id,
      address: property.address ?? null,
      purchasePrice: property.purchaseprice ?? null,
      currentValue: property.currentvalue ?? null,
      purchaseDate: property.purchasedate ?? null,
      category: property.propertycategory ?? null,
      type: property.propertytype ?? null,
      status: property.status ?? null,
      saleDate: property.saledate ?? null,
    })),
    transactions: transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.date ?? null,
      description: transaction.description ?? null,
      amount: transaction.amount ?? null,
      type: transaction.type ?? null,
      propertyId: transaction.propertyid ?? null,
      propertyAddress: transaction.property?.address ?? null,
      entityId: transaction.entity_id ?? null,
      currency: 'AUD',
    })),
    selectedEntityId: selectedEntity,
  });

  const loadPortfolioForPrompt = async (message: string, history: ChatMessage[]) => {
    const transactionId = Logger.createTransactionId();
    const warnings: string[] = [];

    if (isResearchRequest(message)) {
      warnings.push('Research mode: portfolio data skipped.');
      return {
        portfolio: buildSnapshot([], [], []),
        userId: userId ?? '',
        warnings,
      };
    }

    if (!userId) {
      warnings.push('Sign in to load portfolio data for AI responses.');
      return {
        portfolio: buildSnapshot([], [], []),
        userId: '',
        warnings,
      };
    }

    const required = await getRequiredPortfolioData(message, history);

    try {
      if (selectedEntity === 'all') {
        const [propertiesResult, accountsResult, transactionsResult] = await Promise.all([
          required.properties ? fetchUserProperties(userId) : Promise.resolve({ data: [] }),
          required.accounts ? fetchAccountsByUserIds([userId]) : Promise.resolve({ data: [] }),
          required.transactions ? fetchTransactions(userId) : Promise.resolve({ data: [] }),
        ]);

        if (required.properties && propertiesResult.error) {
          warnings.push('Properties data is unavailable right now.');
          Logger.warn('AskAI properties fetch error', { error: propertiesResult.error }, 'askai.tsx', transactionId);
        }
        if (required.accounts && accountsResult.error) {
          warnings.push('Accounts data is unavailable right now.');
          Logger.warn('AskAI accounts fetch error', { error: accountsResult.error }, 'askai.tsx', transactionId);
        }
        if (required.transactions && transactionsResult.error) {
          warnings.push('Transactions data is unavailable right now.');
          Logger.warn('AskAI transactions fetch error', { error: transactionsResult.error }, 'askai.tsx', transactionId);
        }

        return {
          portfolio: buildSnapshot(
            accountsResult.data || [],
            propertiesResult.data || [],
            transactionsResult.data || []
          ),
          userId,
          warnings,
        };
      }

      const needsPropertyIds = required.properties || required.accounts || required.transactions;
      const propertyIdsResult = needsPropertyIds
        ? await fetchPropertyIdsForEntity(selectedEntity)
        : { data: [] as string[] };
      const propertyIds = propertyIdsResult.data || [];

      if (needsPropertyIds && propertyIdsResult.error) {
        warnings.push('Could not load entity property ownership details.');
      }

      if (needsPropertyIds && propertyIds.length === 0) {
        warnings.push('No properties are linked to the selected entity.');
      }

      const [propertiesResult, accountsResult] = await Promise.all([
        required.properties ? fetchPropertiesByIds(propertyIds) : Promise.resolve({ data: [] }),
        required.accounts ? fetchAccountsByPropertyIds(propertyIds) : Promise.resolve({ data: [] }),
      ]);

      const transactionsResult = required.transactions
        ? await fetchTransactions(userId)
        : { data: [] as any[] };

      if (required.properties && propertiesResult.error) {
        warnings.push('Properties data is unavailable right now.');
        Logger.warn('AskAI entity properties fetch error', { error: propertiesResult.error }, 'askai.tsx', transactionId);
      }
      if (required.accounts && accountsResult.error) {
        warnings.push('Accounts data is unavailable right now.');
        Logger.warn('AskAI entity accounts fetch error', { error: accountsResult.error }, 'askai.tsx', transactionId);
      }
      if (required.transactions && transactionsResult.error) {
        warnings.push('Transactions data is unavailable right now.');
        Logger.warn('AskAI entity transactions fetch error', { error: transactionsResult.error }, 'askai.tsx', transactionId);
      }

      const transactionData = transactionsResult.data || [];
      const filteredTransactions = required.transactions && propertyIds.length
        ? transactionData.filter(transaction => propertyIds.includes(transaction.propertyid))
        : [];

      return {
        portfolio: buildSnapshot(
          accountsResult.data || [],
          propertiesResult.data || [],
          filteredTransactions
        ),
        userId,
        warnings,
      };
    } catch (error: any) {
      Logger.error('AskAI loadPortfolio failed', { error }, 'askai.tsx', transactionId);
      warnings.push('Portfolio data could not be loaded.');
      return {
        portfolio: buildSnapshot([], [], []),
        userId,
        warnings,
      };
    }
  };

  return (
    <View style={[styles.container, { padding: 0 }]}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={styles.title}>PropPilot ✈️</Text>
      </View>
      <AskAIChat loadPortfolioForPrompt={loadPortfolioForPrompt} />
    </View>
  );
}
