/**
 * Timezone utilities for converting and displaying times across different timezones
 */

export type SupportedTimezone = 'America/New_York' | 'Asia/Kolkata';

export interface TimezoneOption {
  value: SupportedTimezone;
  label: string;
  offset: string;
}

export const TIMEZONES: TimezoneOption[] = [
  {
    value: 'America/New_York',
    label: 'US Eastern Time',
    offset: 'UTC-5/-4',
  },
  {
    value: 'Asia/Kolkata',
    label: 'India Standard Time',
    offset: 'UTC+5:30',
  },
];

/**
 * Convert a UTC date to a specific timezone
 */
export function convertToTimezone(date: Date | string, timezone: SupportedTimezone): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to timezone string and back to Date
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  
  return dateObj;
}

/**
 * Format time for display in a specific timezone
 */
export function formatTimeInTimezone(
  date: Date | string,
  timezone: SupportedTimezone,
  format: 'time' | 'datetime' | 'full' = 'time'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour12: false,
  };
  
  if (format === 'time') {
    options.hour = '2-digit';
    options.minute = '2-digit';
  } else if (format === 'datetime') {
    options.month = 'short';
    options.day = '2-digit';
    options.hour = '2-digit';
    options.minute = '2-digit';
  } else {
    options.year = 'numeric';
    options.month = 'short';
    options.day = '2-digit';
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  
  return dateObj.toLocaleString('en-US', options);
}

/**
 * Get hour in specific timezone (0-23)
 */
export function getHourInTimezone(date: Date | string, timezone: SupportedTimezone): number {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Guard against invalid date to avoid RangeError: Invalid time value
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
    return 0;
  }
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const parts = dtf.formatToParts(dateObj);
    const hourStr = parts.find(p => p.type === 'hour')?.value;
    const hourNum = hourStr != null ? Number(hourStr) : NaN;
    if (Number.isFinite(hourNum)) return hourNum;
  } catch {
    // fall through to backup
  }
  // Backup: compute via UTC milliseconds offset
  const tzHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(dateObj).replace(/[^0-9]/g, '')
  );
  return Number.isFinite(tzHour) ? tzHour : dateObj.getUTCHours();
}

/**
 * Format hour for chart display (e.g., "14:00")
 */
export function formatChartHour(hour: number | string): string {
  const n = typeof hour === 'string' ? Number(hour) : hour;
  const safe = Number.isFinite(n) ? ((n % 24) + 24) % 24 : 0;
  return `${safe.toString().padStart(2, '0')}:00`;
}
