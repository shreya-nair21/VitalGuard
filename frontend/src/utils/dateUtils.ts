/**
 * VitalGuard Date & Time Utilities
 * All clinical timestamps and telemetry records follow Indian Standard Time (IST, UTC+05:30).
 */

/**
 * Parses any date/time string, number or Date object into a valid JS Date.
 * If a string lacks timezone information (naive UTC from SQLite/FastAPI), it is safely
 * treated as UTC so that timezone conversions to IST are exact (+05:30).
 */
export const parseToDate = (dateInput: string | number | Date | null | undefined): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? new Date() : dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let str = String(dateInput).trim();
  if (!str) return new Date();

  // If it's an ISO or SQL timestamp without timezone offset or Z
  // Example: "2026-09-16 15:11:22.394045" or "2026-09-16T15:11:22.394045"
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(str);
  if (!hasTimezone) {
    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T') + 'Z';
    } else {
      str += 'Z';
    }
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Formats time in Indian Standard Time (IST).
 * Example output: "08:41 PM" or "08:41 PM IST"
 */
export const formatISTTime = (
  dateInput: string | number | Date | null | undefined,
  options: { includeZone?: boolean; hour12?: boolean } = {}
): string => {
  const d = parseToDate(dateInput);
  const { includeZone = false, hour12 = true } = options;

  try {
    const timeStr = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: hour12
    });

    return includeZone ? `${timeStr} IST` : timeStr;
  } catch (e) {
    // Fallback if browser locale issues
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

/**
 * Formats date in Indian Standard Time (IST).
 * Example output: "16 Sep 2026"
 */
export const formatISTDate = (
  dateInput: string | number | Date | null | undefined,
  options: { monthFormat?: 'short' | 'long' | 'numeric'; includeWeekday?: boolean } = {}
): string => {
  const d = parseToDate(dateInput);
  const { monthFormat = 'short', includeWeekday = false } = options;

  try {
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: includeWeekday ? 'short' : undefined,
      day: 'numeric',
      month: monthFormat,
      year: 'numeric'
    });
  } catch (e) {
    return d.toLocaleDateString();
  }
};

/**
 * Formats both Date and Time in Indian Standard Time (IST).
 * Example output: "16 Sep 2026, 08:41 PM IST"
 */
export const formatISTDateTime = (
  dateInput: string | number | Date | null | undefined,
  options: { includeZone?: boolean } = { includeZone: true }
): string => {
  const d = parseToDate(dateInput);
  const dateStr = formatISTDate(d);
  const timeStr = formatISTTime(d, { includeZone: options.includeZone ?? true });
  return `${dateStr}, ${timeStr}`;
};

/**
 * Formats executive header date for Dashboard in Indian Standard Time (IST).
 * Example: "Wed, Sep 16, 2026 (IST)"
 */
export const formatISTHeaderDate = (dateInput: Date = new Date()): string => {
  try {
    const formatted = dateInput.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${formatted} (IST)`;
  } catch (e) {
    return dateInput.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
};

/**
 * Returns current hour (0-23) in Indian Standard Time (IST).
 * Used for accurate time-of-day greetings (Good morning / afternoon / evening).
 */
export const getISTHour = (): number => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false
    }).formatToParts(new Date());
    const hourPart = parts.find(p => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
  } catch (e) {
    return new Date().getHours();
  }
};
