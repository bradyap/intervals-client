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
