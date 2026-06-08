'use client';
import { useState } from 'react';
import useSWR from 'swr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchHistory } from '@/lib/api';
import { fmtNum, fmtShortDate } from '@/lib/format';
import { HistoryRecord } from '@/lib/types';

const METRICS = [
  { key: 'subscriber_count' as const, label: '구독자' },
  { key: 'view_count' as const, label: '조회수' },
  { key: 'score' as const, label: '스코어' },
];
const DAYS_OPTIONS = [7, 30, 90];

function Skeleton() {
  return <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />;
}

function formatYAxis(value: number, metric: string): string {
  if (metric === 'score') return value.toFixed(2);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export default function HistoryChart({ channelId }: { channelId: string }) {
  const [metric, setMetric] = useState<'subscriber_count' | 'view_count' | 'score'>('subscriber_count');
  const [days, setDays] = useState(30);

  const { data: history, isLoading } = useSWR(
    ['history', channelId, days],
    () => fetchHistory(channelId, days)
  );

  const chartData = history?.map((h: HistoryRecord) => ({
    date: fmtShortDate(h.snapshot_date),
    value: Number(h[metric]),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-700">히스토리 추이</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 transition-colors ${
                  metric === m.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 transition-colors ${
                  days === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : !chartData || chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다. 히스토리가 누적되면 표시됩니다.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickFormatter={(v) => formatYAxis(v, metric)}
              width={52}
            />
            <Tooltip
              formatter={(value) => {
                const n = Number(value);
                return metric === 'score' ? n.toFixed(4) : fmtNum(n);
              }}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
