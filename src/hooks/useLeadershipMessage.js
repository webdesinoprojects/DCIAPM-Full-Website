import { useEffect, useState } from 'react';
import { mergeLeadershipFallback } from '../content/leadershipMessages';
import { getLeadershipMessage } from '../lib/leadership';
import { logDevWarn } from '../lib/logger';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function useLeadershipMessage(role) {
  const [leader, setLeader] = useState(() => mergeLeadershipFallback(role));

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const row = await getLeadershipMessage(role);
        if (!cancelled) setLeader(mergeLeadershipFallback(role, row));
      } catch (error) {
        logDevWarn(`Unable to load ${role} leadership message:`, error);
        if (!cancelled) setLeader(mergeLeadershipFallback(role));
      }
    };

    load();

    if (!isSupabaseConfigured) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`leadership-message-${role}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leadership_messages',
          filter: `role=eq.${role}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === 'DELETE' || payload.new?.is_active === false) {
            setLeader(mergeLeadershipFallback(role));
            return;
          }
          setLeader(mergeLeadershipFallback(role, payload.new));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [role]);

  return leader;
}
