import type { ISODate, ISODateTime, Weekday } from '@/types/models';

/**
 * The mock dataset is anchored to a fixed "today" so screenshots and demos are
 * reproducible. Swap `TODAY` for `new Date()` when a live backend is wired in.
 */
export const TODAY: ISODate = '2026-08-29';

export const toISODate = (d: Date): ISODate => d.toISOString().slice(0, 10);

export const parseISODate = (date: ISODate): Date => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date: ISODate, days: number): ISODate => {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const diffInDays = (a: ISODate, b: ISODate): number =>
  Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);

/** Inclusive range ending at `end`, oldest first. */
export const lastNDays = (n: number, end: ISODate = TODAY): ISODate[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const weekdayShort = (date: ISODate): string => WEEKDAYS[parseISODate(date).getDay()];

export const weekdayInitial = (date: ISODate): string => weekdayShort(date).charAt(0);

export const monthDay = (date: ISODate): string => {
  const d = parseISODate(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

export const longDate = (date: ISODate): string => {
  const d = parseISODate(date);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

/** "Today" / "Yesterday" / "Aug 21" */
export const friendlyDate = (date: ISODate, today: ISODate = TODAY): string => {
  const delta = diffInDays(today, date);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  if (delta === -1) return 'Tomorrow';
  return monthDay(date);
};

/** "4m", "3h", "2d" — compact relative stamp for chat and alert rows. */
export const relativeTime = (iso: ISODateTime, now: ISODateTime = `${TODAY}T18:30:00.000Z`): string => {
  const minutes = Math.max(0, Math.round((Date.parse(now) - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
};

/** "just now" / "4m ago" / "2d ago" — never the awkward "now ago". */
export const timeAgo = (iso: ISODateTime, now?: ISODateTime): string => {
  const value = relativeTime(iso, now);
  return value === 'now' ? 'just now' : `${value} ago`;
};

export const clockTime = (iso: ISODateTime): string => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${m} ${suffix}`;
};

export const startOfWeek = (date: ISODate): ISODate => {
  const d = parseISODate(date);
  const offset = (d.getDay() + 6) % 7; // Monday-first
  return addDays(date, -offset);
};

/* -------------------------------------------------------------------------- */
/* Weekdays                                                                    */
/* -------------------------------------------------------------------------- */

/** Monday-first, matching `startOfWeek` above. Routine days sort by this. */
export const WEEK_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const WEEKDAY_ABBR: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const weekdayIndex = (weekday: Weekday): number => WEEK_ORDER.indexOf(weekday);

/** Comparator that puts a routine's days in the order the week runs. */
export const byWeekday = <T extends { weekday: Weekday }>(a: T, b: T): number =>
  weekdayIndex(a.weekday) - weekdayIndex(b.weekday);
