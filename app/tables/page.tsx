'use client';

import React from 'react';
import TableScheduler from '../../components/TableScheduler';
import { useTranslation } from '../../lib/i18n';
import { Table as TableIcon, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function TablesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <TableIcon className="w-6 h-6 text-bhos-cyan" />
          <h1 className="text-2xl md:text-3xl font-display font-black text-white">
            {t('tables.title')}
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {t('tables.subtitle')}
        </p>
      </div>

      {/* Hall Rules & Info Banner */}
      <div className="p-4 rounded-2xl border border-bhos-border bg-bhos-midnight/70 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Table Allocation</span>
            <span className="text-slate-400">
              Tables 1-4 for Student Free Play; Tables 5-6 reserved for BHOS Varsity coaching & tournaments.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-bhos-cyan shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Equipment Provided</span>
            <span className="text-slate-400">
              Donic 3-Star ITTF balls and standard club rackets can be checked out at the hall desk.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">Footwear Requirement</span>
            <span className="text-slate-400">
              Non-marking indoor court shoes are mandatory to protect the sports flooring.
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Scheduler Grid */}
      <TableScheduler />
    </div>
  );
}

