'use client';

import React from 'react';
import MatchLogger from '../../components/MatchLogger';
import PendingApprovals from '../../components/PendingApprovals';

export default function LogMatchPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <PendingApprovals />
      <MatchLogger />
    </div>
  );
}
