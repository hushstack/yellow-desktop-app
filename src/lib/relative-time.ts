/**
 * Human-readable timestamps ("2 hours ago"), formatted with the platform's own
 * Intl support rather than a date library.
 */
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const dayFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' });

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

export function relativeTime(isoTimestamp: string, now: number = Date.now()): string {
  const elapsedMinutes = Math.round((now - new Date(isoTimestamp).getTime()) / MS_PER_MINUTE);

  if (elapsedMinutes < MINUTES_PER_HOUR) {
    return relativeFormatter.format(-elapsedMinutes, 'minute');
  }

  const elapsedHours = Math.round(elapsedMinutes / MINUTES_PER_HOUR);
  if (elapsedHours < HOURS_PER_DAY) {
    return relativeFormatter.format(-elapsedHours, 'hour');
  }

  const elapsedDays = Math.round(elapsedHours / HOURS_PER_DAY);
  if (elapsedDays < DAYS_PER_WEEK) {
    return relativeFormatter.format(-elapsedDays, 'day');
  }

  return dayFormatter.format(new Date(isoTimestamp));
}

export function clockTime(isoTimestamp: string): string {
  return timeFormatter.format(new Date(isoTimestamp));
}

export function calendarDay(isoTimestamp: string): string {
  return dayFormatter.format(new Date(isoTimestamp));
}
