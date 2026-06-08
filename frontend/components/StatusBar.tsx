'use client';
import useSWR from 'swr';
import { fetchHealth } from '@/lib/api';
import { fmtDate } from '@/lib/format';

export default function StatusBar({ lastFetchedAt }: { lastFetchedAt?: string }) {
  const { data: health } = useSWR('health', fetchHealth, { refreshInterval: 30000 });

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${health?.ok ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
        {health?.ok ? 'API 정상' : 'API 오프라인'}
      </span>
      {lastFetchedAt && (
        <span>마지막 업데이트: {fmtDate(lastFetchedAt)}</span>
      )}
    </div>
  );
}
