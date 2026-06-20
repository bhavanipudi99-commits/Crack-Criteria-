export const getTileColor = (category = '') => {
  const lc = category.toLowerCase();
  if (lc.includes('major')) return 'bg-blue-50/80 hover:bg-blue-100 border-blue-200 text-blue-900';
  if (lc.includes('minor')) return 'bg-violet-50/80 hover:bg-violet-100 border-violet-200 text-violet-900';
  return 'bg-teal-50/80 hover:bg-teal-100 border-teal-200 text-teal-900';
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
