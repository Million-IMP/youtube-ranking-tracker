'use client';
export const dynamic = 'force-dynamic';
import { use } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { fetchRanking } from '@/lib/api';
import MetricCard from '@/components/MetricCard';
import HistoryChart from '@/components/HistoryChart';
import TrendSection from '@/components/TrendSection';
import { fmtNum, fmtDate } from '@/lib/format';

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function ChannelDetailPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = use(params);
  const { data: channel, isLoading, error } = useSWR(
    ['channel', channelId],
    () => fetchRanking(channelId),
    { refreshInterval: 30000 }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-6">
          ← 전체 랭킹으로
        </Link>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
            채널을 불러올 수 없습니다. ({(error as Error).message})
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              {isLoading ? (
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{channel?.title}</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                    {channel?.rank}위
                  </span>
                </div>
              )}
              {channel?.fetched_at && (
                <p className="mt-1 text-sm text-gray-400">업데이트: {fmtDate(channel.fetched_at)}</p>
              )}
            </div>

            {/* Metric cards */}
            {isLoading ? (
              <SkeletonCards />
            ) : channel ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  label="구독자"
                  value={fmtNum(channel.subscriber_count)}
                  delta={channel.subscriber_delta}
                  deltaRate={channel.subscriber_delta_rate}
                  hasPreviousData={channel.has_previous_data}
                />
                <MetricCard
                  label="총 조회수"
                  value={fmtNum(channel.view_count)}
                  delta={channel.view_delta}
                  deltaRate={channel.view_delta_rate}
                  hasPreviousData={channel.has_previous_data}
                />
                <MetricCard
                  label="스코어"
                  value={channel.score.toFixed(4)}
                  hasPreviousData={false}
                />
                <MetricCard
                  label="가속도"
                  value={channel.acceleration.toFixed(2)}
                  hasPreviousData={false}
                />
              </div>
            ) : null}

            {/* Charts */}
            <div className="space-y-6">
              <HistoryChart channelId={channelId} />
              <TrendSection channelId={channelId} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
