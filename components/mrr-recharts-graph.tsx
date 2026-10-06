'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export interface MrrChartDataPoint {
  month: string;
  actualMrr?: number;
  projectedMrr: number;
  grossProfitMrr: number;
  arrRunRate: number;
}

export default function MrrRechartsGraph({
  data,
}: {
  data: MrrChartDataPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
      >
        <CartesianGrid
          stroke="rgba(255, 255, 255, 0.06)"
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          stroke="#64748B"
          tick={{
            fill: '#94A3B8',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          stroke="#64748B"
          tick={{
            fill: '#94A3B8',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: number) => `$${Math.round(val / 1000)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#060911',
            borderColor: 'rgba(56, 189, 248, 0.35)',
            borderRadius: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#F8FAFC',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          }}
          formatter={(value, name) => {
            const numVal = Number(value || 0);
            const label =
              name === 'actualMrr'
                ? 'Realized MRR'
                : name === 'projectedMrr'
                ? 'Projected MRR'
                : 'Net Gross Profit';
            return [`$${numVal.toLocaleString()}/mo`, label];
          }}
          labelStyle={{
            color: '#38BDF8',
            fontWeight: 600,
            marginBottom: '4px',
          }}
        />
        <ReferenceLine
          x="Oct (Now)"
          stroke="rgba(56, 189, 248, 0.35)"
          strokeDasharray="4 4"
          label={{
            value: 'CURRENT BASELINE',
            position: 'insideTopLeft',
            fill: '#38BDF8',
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="projectedMrr"
          stroke="#F59E0B"
          strokeWidth={2.25}
          strokeDasharray="5 4"
          dot={{ r: 3, fill: '#F59E0B', strokeWidth: 0 }}
          activeDot={{
            r: 5,
            fill: '#F59E0B',
            stroke: '#060911',
            strokeWidth: 2,
          }}
        />
        <Line
          type="monotone"
          dataKey="actualMrr"
          stroke="#38BDF8"
          strokeWidth={3}
          dot={{
            r: 4,
            fill: '#38BDF8',
            stroke: '#060911',
            strokeWidth: 1.5,
          }}
          activeDot={{
            r: 6,
            fill: '#38BDF8',
            stroke: '#FFFFFF',
            strokeWidth: 2,
          }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="grossProfitMrr"
          stroke="#10B981"
          strokeWidth={2}
          dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
          activeDot={{
            r: 5,
            fill: '#10B981',
            stroke: '#060911',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
