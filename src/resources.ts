import { IntervalsError, IntervalsRequestError } from './errors.js';

export function resolveAthleteId(athleteId: unknown, defaultAthleteId: string): string {
  if (athleteId === undefined) {
    return defaultAthleteId;
  }

  if (typeof athleteId !== 'string') {
    throw new IntervalsRequestError('athleteId must be a string');
  }

  const trimmedAthleteId = athleteId.trim();

  return trimmedAthleteId || defaultAthleteId;
}

export function validateRequiredString(fieldName: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new IntervalsRequestError(`${fieldName} must be a non-empty string`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new IntervalsRequestError(`${fieldName} must be a non-empty string`);
  }

  return trimmedValue;
}

export function appendStringArrayQuery(
  query: URLSearchParams,
  fieldName: string,
  value: unknown,
): void {
  if (!Array.isArray(value)) {
    throw new IntervalsRequestError(`${fieldName} must be an array of non-empty strings`);
  }

  for (const item of value as unknown[]) {
    query.append(fieldName, validateRequiredString(fieldName, item));
  }
}

export function withRequestErrorBoundary<T>(operation: () => T): T {
  try {
    return operation();
  } catch (cause) {
    if (cause instanceof IntervalsError) {
      throw cause;
    }

    throw new IntervalsRequestError('Failed to construct Intervals.icu request', { cause });
  }
}

export function validateResourceId(fieldName: string, value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new IntervalsRequestError(`${fieldName} must be a non-empty string or finite number`);
    }

    return String(value);
  }

  if (typeof value === 'string') {
    return validateRequiredString(fieldName, value);
  }

  throw new IntervalsRequestError(`${fieldName} must be a non-empty string or finite number`);
}
