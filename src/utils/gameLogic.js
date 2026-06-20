export const getTileColor = (category = '', index = 0) => {
  const lc = category.toLowerCase();
  
  // Use a hash of the category name to deterministically pick a color, or fall back to index
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % 5;

  if (lc.includes('major')) return 'bg-gradient-to-br from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 border-indigo-300 text-indigo-900 shadow-[0_4px_0_0_#818cf8] active:shadow-none active:translate-y-[4px]';
  if (lc.includes('minor')) return 'bg-gradient-to-br from-violet-100 to-fuchsia-100 hover:from-violet-200 hover:to-fuchsia-200 border-fuchsia-300 text-fuchsia-900 shadow-[0_4px_0_0_#c084fc] active:shadow-none active:translate-y-[4px]';

  const palette = [
    'bg-gradient-to-br from-teal-100 to-emerald-100 hover:from-teal-200 hover:to-emerald-200 border-emerald-300 text-emerald-900 shadow-[0_4px_0_0_#34d399] active:shadow-none active:translate-y-[4px]',
    'bg-gradient-to-br from-sky-100 to-blue-100 hover:from-sky-200 hover:to-blue-200 border-blue-300 text-blue-900 shadow-[0_4px_0_0_#60a5fa] active:shadow-none active:translate-y-[4px]',
    'bg-gradient-to-br from-rose-100 to-pink-100 hover:from-rose-200 hover:to-pink-200 border-pink-300 text-pink-900 shadow-[0_4px_0_0_#f472b6] active:shadow-none active:translate-y-[4px]',
    'bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border-orange-300 text-orange-900 shadow-[0_4px_0_0_#fb923c] active:shadow-none active:translate-y-[4px]',
    'bg-gradient-to-br from-fuchsia-100 to-purple-100 hover:from-fuchsia-200 hover:to-purple-200 border-purple-300 text-purple-900 shadow-[0_4px_0_0_#a78bfa] active:shadow-none active:translate-y-[4px]'
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
