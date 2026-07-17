import { z } from 'zod';

import {
  validateDateRange,
  validateIsoDateString,
  type DateRange,
  type IsoDateString,
} from './dates.js';
import type { ResourceRequester } from './request.js';
import { resolveAthleteId } from './resources.js';

const optionalMetric = z.number().nullable().optional();
const wellnessRecordSchema = z.looseObject({
  id: z.string(),
  updated: z.string().nullable().optional(),
  weight: optionalMetric,
  restingHR: optionalMetric,
  hrv: optionalMetric,
  hrvSDNN: optionalMetric,
  sleepSecs: optionalMetric,
  sleepScore: optionalMetric,
  readiness: optionalMetric,
  soreness: optionalMetric,
  fatigue: optionalMetric,
  stress: optionalMetric,
  mood: optionalMetric,
  motivation: optionalMetric,
  steps: optionalMetric,
  spO2: optionalMetric,
  atl: optionalMetric,
  ctl: optionalMetric,
  rampRate: optionalMetric,
});
const wellnessRecordsSchema = z.array(wellnessRecordSchema);

export type WellnessRecord = z.infer<typeof wellnessRecordSchema>;

export interface GetWellnessOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ListWellnessOptions extends DateRange {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WellnessResource {
  get(date: IsoDateString, options?: GetWellnessOptions): Promise<WellnessRecord>;
  list(options: ListWellnessOptions): Promise<WellnessRecord[]>;
}

export interface WellnessResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsWellnessResource implements WellnessResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: WellnessResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async get(date: IsoDateString, options: GetWellnessOptions = {}): Promise<WellnessRecord> {
    const normalizedDate = validateIsoDateString('date', date);

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'wellness',
        normalizedDate,
      ],
      signal: options.signal,
      parse: parseWellnessRecord,
      validationMessage: 'Intervals.icu response did not match the expected wellness record shape',
    });
  }

  async list(options: ListWellnessOptions): Promise<WellnessRecord[]> {
    const dateRange = validateDateRange(options);

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'wellness',
      ],
      query: new URLSearchParams([
        ['oldest', dateRange.oldest],
        ['newest', dateRange.newest],
      ]),
      signal: options.signal,
      parse: parseWellnessRecords,
      validationMessage: 'Intervals.icu response did not match the expected wellness records shape',
    });
  }
}

export function parseWellnessRecord(value: unknown): WellnessRecord {
  return wellnessRecordSchema.parse(value);
}

export function parseWellnessRecords(value: unknown): WellnessRecord[] {
  return wellnessRecordsSchema.parse(value);
}
