import { IntervalsRequestError } from './errors.js';

export function resolveAthleteId(athleteId: string | undefined, defaultAthleteId: string): string {
  const trimmedAthleteId = athleteId?.trim();

  return trimmedAthleteId && trimmedAthleteId.length > 0 ? trimmedAthleteId : defaultAthleteId;
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
