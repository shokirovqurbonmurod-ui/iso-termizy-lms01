export const money = (n) => (Number(n) || 0).toLocaleString('uz-UZ') + " so'm";
export const compactMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return Math.round(v / 1000) + 'K';
  return String(v);
};

export const STATUS_STYLE = {
  active: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-emerald-100 text-emerald-700',
  done: 'bg-emerald-100 text-emerald-700',
  won: 'bg-emerald-100 text-emerald-700',
  free: 'bg-emerald-100 text-emerald-700',
  planned: 'bg-blue-100 text-blue-700',
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-violet-100 text-violet-700',
  trial: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  busy: 'bg-amber-100 text-amber-700',
  frozen: 'bg-sky-100 text-sky-700',
  inactive: 'bg-slate-200 text-slate-600',
  archived: 'bg-slate-200 text-slate-600',
  lost: 'bg-red-100 text-red-600',
};
export const statusStyle = (s) => STATUS_STYLE[s] || 'bg-slate-100 text-slate-600';
