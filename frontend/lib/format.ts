export function fmtNum(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function fmtPct(n: number, digits = 1): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function fmtShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function deltaColor(n: number): string {
  if (n > 0) return 'text-emerald-500';
  if (n < 0) return 'text-red-500';
  return 'text-gray-400';
}

export function deltaSign(n: number): string {
  return n > 0 ? '+' : '';
}
