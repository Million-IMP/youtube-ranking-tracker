'use client';
import Link from 'next/link';
import { RankedChannelRecord } from '@/lib/types';
import { fmtNum, fmtPct, deltaColor } from '@/lib/format';

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

interface Props {
  rankings: RankedChannelRecord[] | undefined;
  isLoading: boolean;
}

export default function RankingTable({ rankings, isLoading }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left w-12">순위</th>
            <th className="px-4 py-3 text-left">채널명</th>
            <th className="px-4 py-3 text-right">구독자</th>
            <th className="px-4 py-3 text-right">Δ구독자</th>
            <th className="px-4 py-3 text-right">변화율</th>
            <th className="px-4 py-3 text-right">스코어</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
            : rankings?.map((r) => (
                <tr key={r.channel_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-700 w-12">{r.rank}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/channels/${r.channel_id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {fmtNum(r.subscriber_count)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.has_previous_data ? (
                      <span className={deltaColor(r.subscriber_delta)}>
                        {r.subscriber_delta >= 0 ? '+' : ''}
                        {fmtNum(r.subscriber_delta)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.has_previous_data ? (
                      <span className={`font-medium ${deltaColor(r.subscriber_delta_rate)}`}>
                        {fmtPct(r.subscriber_delta_rate)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {r.score.toFixed(4)}
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
