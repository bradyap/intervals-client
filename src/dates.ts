import { IntervalsRequestError } from './errors.js';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export type IsoDateString = string;

export interface DateRange {
  oldest: IsoDateString;
  newest: IsoDateString;
}

export function validateDateRange(range: DateRange): DateRange {
  const oldest = validateIsoDateString('oldest', range.oldest);
  const newest = validateIsoDateString('newest', range.newest);

  if (oldest > newest) {
    throw new IntervalsRequestError('oldest must be earlier than or equal to newest');
  }

  return { oldest, newest };
}

function validateIsoDateString(fieldName: keyof DateRange, value: IsoDateString): IsoDateString {
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
