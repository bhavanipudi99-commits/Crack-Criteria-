export const getTileColor = (category = '', index = 0) => {
  const lc = category.toLowerCase();
  
  // Use a hash of the category name to deterministically pick a color, or fall back to index
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 5;

  if (lc.includes('major')) return 'bg-white hover:bg-slate-50 border-blue-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-blue-400';
  if (lc.includes('minor')) return 'bg-white hover:bg-slate-50 border-violet-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-violet-400';

  const palette = [
    'bg-white hover:bg-slate-50 border-teal-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-teal-400',
    'bg-white hover:bg-slate-50 border-sky-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-sky-400',
    'bg-white hover:bg-slate-50 border-rose-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-rose-400',
    'bg-white hover:bg-slate-50 border-amber-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-amber-400',
    'bg-white hover:bg-slate-50 border-fuchsia-200 text-slate-800 shadow-[0_4px_0_0_#cbd5e1] active:shadow-none active:translate-y-[4px] border-t-4 border-t-fuchsia-400'
  ];
  return palette[colorIndex];
};

export const parseNumericalData = (label) => {
  if (!label) return null;
  
  // 1. Try to find a number preceded by a comparator (e.g., "Heart rate > 120 bpm")
  let match = label.match(/^(.*?)([<>=~≤≥]\s*)([-+]?\d+(?:[.,]\d+)?(?:[-–]\d+(?:[.,]\d+)?)?)\s*(.*)$/i);
  if (match) {
    const prefixText = match[1].trim();
    const operator = match[2].trim();
    const number = match[3].trim();
    const suffix = match[4].trim();
    const prefix = [prefixText, operator].filter(Boolean).join(' ');
    const redacted = `${prefix} ___ ${suffix}`.trim();
    const unitKey = suffix.toLowerCase().replace(/\s+/g, '');
    return { number, suffix, unitKey, prefix, redacted, original: label };
  }

  // 2. Try to find the LAST number in the string (ignores numbers in prefix like "O2")
  match = label.match(/^(.*?(?:^|\s))([-+]?\d+(?:[.,]\d+)?(?:[-–]\d+(?:[.,]\d+)?)?)\s*([a-zA-Z%°].*)?$/i);
  if (match) {
    const prefix = match[1].trim();
    const number = match[2].trim();
    const suffix = (match[3] || '').trim();
    const redacted = `${prefix} ___ ${suffix}`.trim();
    const unitKey = suffix.toLowerCase().replace(/\s+/g, '');
    return { number, suffix, unitKey, prefix, redacted, original: label };
  }

  return null;
};
