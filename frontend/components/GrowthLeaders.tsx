'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { fetchGrowthLeaders } from '@/lib/api';
import { fmtPct, deltaColor } from '@/lib/format';

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function GrowthLeaders() {
  const { data, isLoading } = useSWR('growth', () => fetchGrowthLeaders(3), {
    refreshInterval: 30000,
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">🚀 빠르게 성장 중인 채널 TOP 3</h2>
      {isLoading ? (
        <Skeleton />
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">데이터 없음 (히스토리 누적 후 표시)</p>
      ) : (
        <ol className="space-y-2">
          {data.map((r, i) => (
            <li key={r.channel_id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <Link
                  href={`/channels/${r.channel_id}`}
                  className="text-sm font-medium text-blue-600 hover:underline truncate"
                >
                  {r.title}
                </Link>
              </div>
              <span className={`text-sm font-semibold shrink-0 ${deltaColor(r.subscriber_delta_rate)}`}>
                {fmtPct(r.subscriber_delta_rate)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
