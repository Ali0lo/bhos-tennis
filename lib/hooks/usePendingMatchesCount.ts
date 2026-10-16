'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../supabase/client';
import { BHOSDataStore } from '../data/store';

export function usePendingMatchesCount(userId?: string | null): number {
  const [count, setCount] = useState<number>(0);

  const fetchPendingCount = useCallback(async () => {
    const store = BHOSDataStore.getInstance();
    const activeUserId = userId ?? store.getCurrentUser()?.id ?? null;

    if (!activeUserId) {
      setCount(0);
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { count: exactCount, error } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .neq('logged_by', activeUserId)
          .or(`player2_id.eq.${activeUserId},player1_id.eq.${activeUserId}`);

        if (!error && typeof exactCount === 'number') {
          setCount(exactCount);
          return;
        }
      } catch {
      }
    }

    const localPending = store
      .getMatches()
      .filter(
        (m) =>
          m.status === 'pending' &&
          m.logged_by !== activeUserId &&
          (m.player2_id === activeUserId || m.player1_id === activeUserId)
      ).length;

    setCount(localPending);
  }, [userId]);

  useEffect(() => {
    fetchPendingCount();

    const store = BHOSDataStore.getInstance();
    const unsubStore = store.subscribe(() => {
      fetchPendingCount();
    });

    const supabase = getSupabaseClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase
        .channel(`navbar-pending-matches-${userId || 'anon'}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            fetchPendingCount();
          }
        )
        .subscribe();
    }

    return () => {
      unsubStore();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchPendingCount, userId]);

  return count;
}
