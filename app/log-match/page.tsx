'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MatchLogger from '../../components/MatchLogger';
import PendingApprovals from '../../components/PendingApprovals';
import { BHOSDataStore } from '../../lib/data/store';
import { PlayerProfile, isProfilePending } from '../../lib/data/types';
import { Clock } from 'lucide-react';

function LogMatchContent() {
  const searchParams = useSearchParams();
  // `?opponent=<slug>` is the clean form; legacy `?opponentId=<uuid>` links keep working.
  const opponentParam = searchParams.get('opponent') || searchParams.get('opponentId');
  const store = BHOSDataStore.getInstance();
  const opponentId = opponentParam
    ? store.resolvePlayerIdentifier(opponentParam) || opponentParam
    : null;
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    const update = () => {
      setCurrentProfile(store.getCurrentUser());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const isPending = isProfilePending(currentProfile);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs shadow-lg">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-200 block">
              Təsdiq Gözləyir (Pending Approval)
            </span>
            <span>
              Hesabınız təsdiq gözləyir. Yalnız rəhbərlik təsdiqindən sonra rəsmi matç qeyd edə bilərsiniz.
            </span>
          </div>
        </div>
      )}
      <PendingApprovals />
      <MatchLogger initialOpponentId={opponentId} />
    </div>
  );
}

export default function LogMatchPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-8" />}>
      <LogMatchContent />
    </Suspense>
  );
}
