'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import useSWR from 'swr';
import { fetchRankings } from '@/lib/api';
import RankingTable from '@/components/RankingTable';
import GrowthLeaders from '@/components/GrowthLeaders';
import StatusBar from '@/components/StatusBar';
import RefreshModal from '@/components/RefreshModal';

export default function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: rankings, isLoading, mutate } = useSWR('rankings', fetchRankings, {
    refreshInterval: 30000,
  });

  const lastFetchedAt = rankings?.[0]?.fetched_at;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube 랭킹 대시보드</h1>
            <div className="mt-1">
              <StatusBar lastFetchedAt={lastFetchedAt} />
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            수동 갱신
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <RankingTable rankings={rankings} isLoading={isLoading} />
          </div>
          <div className="w-full lg:w-72 shrink-0">
            <GrowthLeaders />
          </div>
        </div>
      </div>

      {showModal && (
        <RefreshModal
          onClose={() => setShowModal(false)}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}
