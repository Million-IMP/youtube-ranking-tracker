'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { fetchTrend } from '@/lib/api';
import { fmtNum } from '@/lib/format';

const METRICS = [
  { key: 'subscriber_count' as const, label: '구독자' },
  { key: 'view_count' as const, label: '조회수' },
  { key: 'score' as const, label: '스코어' },
];

const TREND_CONFIG = {
  growing:  { label: '성장 중', className: 'bg-emerald-100 text-emerald-700' },
  stable:   { label: '안정적', className: 'bg-gray-100 text-gray-600' },
  declining:{ label: '하락 중', className: 'bg-red-100 text-red-600' },
};

function Skeleton() {
  return <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />;
}

export default function TrendSection({ channelId }: { channelId: string }) {
  const [metric, setMetric] = useState<'subscriber_count' | 'view_count' | 'score'>('subscriber_count');

  const { data: trend, isLoading } = useSWR(
    ['trend', channelId, metric],
    () => fetchTrend(channelId, metric, 30)
  );

  const trendCfg = trend ? TREND_CONFIG[trend.trend] : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-700">트렌드 분석 (30일)</h2>
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
      </div>

      {isLoading ? (
        <Skeleton />
      ) : !trend || trend.dataPoints < 2 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          트렌드 분석에 최소 2개의 데이터 포인트가 필요합니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">트렌드</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${trendCfg?.className}`}>
              {trendCfg?.label}
            </span>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">R² (신뢰도)</p>
            <p className="font-bold text-gray-800">{trend.r2.toFixed(3)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">30일 후 예측</p>
            <p className="font-bold text-gray-800">
              {metric === 'score' ? trend.predicted30d.toFixed(4) : fmtNum(trend.predicted30d)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">데이터 포인트</p>
            <p className="font-bold text-gray-800">{trend.dataPoints}개</p>
          </div>
        </div>
      )}
    </div>
  );
}
