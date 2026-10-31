'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { isAllDepartmentsFilter, matchesDepartmentFilter } from '../lib/data/types';

export interface FacultyTabOption {
  id: string;
  label: string;
}

interface FacultyFilterTabsProps {
  tabs: FacultyTabOption[];
  selectedFaculty: string;
  onSelect: (facultyId: string) => void;
}

export default function FacultyFilterTabs({
  tabs,
  selectedFaculty,
  onSelect,
}: FacultyFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const isActive =
          isAllDepartmentsFilter(selectedFaculty) && isAllDepartmentsFilter(tab.id)
            ? true
            : !isAllDepartmentsFilter(selectedFaculty) &&
              !isAllDepartmentsFilter(tab.id) &&
              matchesDepartmentFilter(tab.id, selectedFaculty);
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
              isActive
                ? 'text-[#3B82F6] border-transparent'
                : 'bg-[#0F1623] text-slate-400 border-white/[0.06] hover:text-white hover:border-white/20'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeFilterIndicator"
                className="absolute inset-0 rounded-xl bg-blue-500/15 border border-blue-500/30 shadow-[0_0_16px_rgba(59,130,246,0.15)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

