'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface EloChartPoint {
  date: string;
  elo: number;
  label?: string;
}

interface EloChartProps {
  data: EloChartPoint[];
  playerName?: string;
}

export default function EloChart({ data, playerName }: EloChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
        No match rating history recorded yet.
      </div>
    );
  }

  const eloValues = data.map((d) => d.elo);
  const minElo = Math.max(0, Math.min(...eloValues) - 50);
  const maxElo = Math.max(...eloValues) + 50;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            domain={[minElo, maxElo]}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#1E293B',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
              fontSize: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            formatter={(val: any) => [`${val} ELO`, playerName || 'Rating']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="elo"
            stroke="#00E5FF"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#eloGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

