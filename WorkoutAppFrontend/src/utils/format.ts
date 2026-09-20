export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Safe ratio in the 0–1 range; returns 0 when the denominator is falsy. */
export const ratio = (value: number, total: number): number =>
  total > 0 ? clamp(value / total, 0, 1) : 0;

export const pct = (value: number, total: number): number => Math.round(ratio(value, total) * 100);

export const kg = (value: number | null, digits = 1): string =>
  value === null ? '—' : `${value.toFixed(digits)} kg`;

export const signed = (value: number, digits = 1): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;

export const grams = (value: number): string => `${Math.round(value)}g`;

export const kcal = (value: number): string => `${Math.round(value).toLocaleString('en-US')}`;

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const firstName = (name: string): string => name.split(' ')[0] ?? name;

export const volume = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}t` : `${Math.round(value)} kg`;

export const plural = (count: number, word: string, pluralForm?: string): string =>
  `${count} ${count === 1 ? word : (pluralForm ?? `${word}s`)}`;

/** "8–12" for a range, "10" when the coach prescribed a fixed number. */
export const repRange = (min: number, max: number): string =>
  min === max ? `${min}` : `${min}–${max}`;

/** "4 × 8–12" — the canonical way a prescription reads on a card. */
export const setsAndReps = (sets: number, min: number, max: number): string =>
  `${sets} × ${repRange(min, max)}`;

/** "45s" / "2m" / "2m 30s" — rest periods are read at a glance mid-session. */
export const restLabel = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
};
