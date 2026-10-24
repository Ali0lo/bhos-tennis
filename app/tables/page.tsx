'use client';

import React from 'react';
import HallRulesSection from '../../components/HallRulesSection';
import CourtBackground from '../../components/CourtBackground';

export default function TablesPage() {
  return (
    <div className="relative space-y-8 pt-14 pb-16">
      <CourtBackground className="fixed" />
      <HallRulesSection />
    </div>
  );
}
