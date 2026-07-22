import { IntervalsRequestError } from './errors.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type IsoDateString = string;

export interface DateRange {
  oldest: IsoDateString;
  newest: IsoDateString;
}

export function validateDateRange(range: unknown): DateRange {
  if (typeof range !== 'object' || range === null) {
    throw new IntervalsRequestError('date range options must be an object');
  }

  const values = range as Record<string, unknown>;
  const oldest = validateIsoDateString('oldest', values.oldest);
  const newest = validateIsoDateString('newest', values.newest);

  if (oldest > newest) {
    throw new IntervalsRequestError('oldest must be earlier than or equal to newest');
  }

  return { oldest, newest };
}

export function validateIsoDateString(
  fieldName: keyof DateRange | 'date',
  value: unknown,
): IsoDateString {
  if (typeof value !== 'string') {
    throw new IntervalsRequestError(`${fieldName} must be a string in YYYY-MM-DD format`);
  }

  const trimmedValue = value.trim();

  if (!isoDatePattern.test(trimmedValue)) {
    throw new IntervalsRequestError(`${fieldName} must use YYYY-MM-DD format`);
  }

  const year = Number(trimmedValue.slice(0, 4));
  const month = Number(trimmedValue.slice(5, 7));
  const day = Number(trimmedValue.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new IntervalsRequestError(`${fieldName} must be a valid calendar date`);
  }

  return trimmedValue;
}
