import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchUserEntities } from '@/lib/supabase/entities';
import { getCurrentUser } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';

interface EntityContextType {
  entities: any[];
  selectedEntity: string;
  setSelectedEntity: (id: string) => void;
  loading: boolean;
  error: string | null;
  userId: string;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export const useEntityContext = () => {
  const ctx = useContext(EntityContext);
  if (!ctx) throw new Error('useEntityContext must be used within EntityProvider');
  return ctx;
};

export const EntityProvider = ({ children }: { children: React.ReactNode }) => {
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [lastWeightsSavedAt, setLastWeightsSavedAt] = useState<number | undefined>(undefined);
  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    let authListener: any;
    let isMounted = true;
    async function fetchEntitiesForUser(user: any) {
      const transactionId = Logger.createTransactionId();
      Logger.info('Fetching entities for user', { userId: user?.id }, 'EntityContext.tsx', transactionId);
      if (!user) {
        Logger.warn('No user logged in, clearing entities', undefined, 'EntityContext.tsx', transactionId);
        setEntities([]);
        setSelectedEntity('all');
        setUserId('');
        setError('No user logged in');
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setLoading(true);
      setError(null);
      const { data, error } = await fetchUserEntities(user.id);
      if (!isMounted) return;
      if (error) {
        Logger.error('Error fetching user entities', { error }, 'EntityContext.tsx', transactionId);
        setError(error.message);
        setEntities([]);
        setSelectedEntity('all');
        setLoading(false);
        return;
      }
      Logger.info('Entities fetched for user', { count: data?.length }, 'EntityContext.tsx', transactionId);
      setEntities([{ id: 'all', name: 'All Entities' }, ...(data || [])]);
      setSelectedEntity('all');
      setLoading(false);

    }
    // Initial fetch
    getCurrentUser().then(user => {
      Logger.debug('Initial user fetch in EntityProvider', { userId: user?.id }, 'EntityContext.tsx');
      if (isMounted) fetchEntitiesForUser(user);
    });
    // Listen for auth state changes
    authListener = supabase.auth.onAuthStateChange((_event, session) => {
      Logger.info('Auth state changed', { event: _event, userId: session?.user?.id }, 'EntityContext.tsx');
      const user = session?.user || null;
      fetchEntitiesForUser(user);
    });
    return () => {
      isMounted = false;
      Logger.debug('EntityProvider unmounted, cleaning up listeners', undefined, 'EntityContext.tsx');
      if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
  }, [entities, selectedEntity, loading, error, userId]);

  return (
    <EntityContext.Provider value={{ entities, selectedEntity, setSelectedEntity, loading, error, userId}}>
      {children}
    </EntityContext.Provider>
  );
};
