import { fmtNum, fmtPct, deltaColor } from '@/lib/format';

interface Props {
  label: string;
  value: string | number;
  delta?: number;
  deltaRate?: number;
  hasPreviousData?: boolean;
  valueFormatter?: (v: number) => string;
}

export default function MetricCard({ label, value, delta, deltaRate, hasPreviousData }: Props) {
  const showDelta = hasPreviousData && delta !== undefined;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {showDelta ? (
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className={deltaColor(delta!)}>
            {delta! >= 0 ? '+' : ''}{fmtNum(delta!)}
          </span>
          {deltaRate !== undefined && (
            <span className={`font-medium ${deltaColor(deltaRate)}`}>
              ({fmtPct(deltaRate)})
            </span>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-gray-300">이전 데이터 없음</p>
      )}
    </div>
  );
}
