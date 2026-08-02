import { z } from 'zod';

import {
  validateDateRange,
  validateIsoDateString,
  type DateRange,
  type IsoDateString,
} from './dates.js';
import { IntervalsRequestError } from './errors.js';
import type { ResourceRequester, ResourceVoidRequester } from './request.js';
import { resolveAthleteId, withRequestErrorBoundary } from './resources.js';

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

export interface WellnessWriteInput {
  [field: string]: unknown;
  atl?: number | null;
  comments?: string | null;
  ctl?: number | null;
  fatigue?: number | null;
  hrv?: number | null;
  hrvSDNN?: number | null;
  id?: IsoDateString;
  locked?: boolean | null;
  mood?: number | null;
  motivation?: number | null;
  readiness?: number | null;
  restingHR?: number | null;
  sleepScore?: number | null;
  sleepSecs?: number | null;
  soreness?: number | null;
  spO2?: number | null;
  steps?: number | null;
  stress?: number | null;
  weight?: number | null;
}

export interface WellnessBulkWriteInput extends WellnessWriteInput {
  id: IsoDateString;
}

export interface GetWellnessOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ListWellnessOptions extends DateRange {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WriteWellnessOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WellnessResource {
  get(date: IsoDateString, options?: GetWellnessOptions): Promise<WellnessRecord>;
  list(options: ListWellnessOptions): Promise<WellnessRecord[]>;
  update(
    date: IsoDateString,
    wellness: WellnessWriteInput,
    options?: WriteWellnessOptions,
  ): Promise<WellnessRecord>;
  updateBulk(records: WellnessBulkWriteInput[], options?: WriteWellnessOptions): Promise<void>;
}

export interface WellnessResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
  requestVoid: ResourceVoidRequester;
}

export class IntervalsWellnessResource implements WellnessResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;
  readonly #requestVoid: ResourceVoidRequester;

  constructor(options: WellnessResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
    this.#requestVoid = options.requestVoid;
  }

  async get(date: IsoDateString, options: GetWellnessOptions = {}): Promise<WellnessRecord> {
    return withRequestErrorBoundary(() => {
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
        validationMessage:
          'Intervals.icu response did not match the expected wellness record shape',
      });
    });
  }

  async list(options: ListWellnessOptions): Promise<WellnessRecord[]> {
    return withRequestErrorBoundary(() => {
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
        validationMessage:
          'Intervals.icu response did not match the expected wellness records shape',
      });
    });
  }

  async update(
    date: IsoDateString,
    wellness: WellnessWriteInput,
    options: WriteWellnessOptions = {},
  ): Promise<WellnessRecord> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'wellness',
          validateIsoDateString('date', date),
        ],
        method: 'PUT',
        json: wellness,
        signal: options.signal,
        parse: parseWellnessRecord,
        validationMessage:
          'Intervals.icu response did not match the expected wellness record shape',
      }),
    );
  }

  async updateBulk(
    records: WellnessBulkWriteInput[],
    options: WriteWellnessOptions = {},
  ): Promise<void> {
    return withRequestErrorBoundary(() => {
      const input: unknown = records;

      if (!Array.isArray(input)) {
        throw new IntervalsRequestError('records must be an array');
      }

      const normalizedRecords = input.map((record: unknown) => {
        if (typeof record !== 'object' || record === null || Array.isArray(record)) {
          throw new IntervalsRequestError('each wellness record must be an object');
        }

        const wellnessRecord = record as WellnessBulkWriteInput;

        return {
          ...wellnessRecord,
          id: validateIsoDateString('date', wellnessRecord.id),
        };
      });

      return this.#requestVoid({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'wellness-bulk',
        ],
        method: 'PUT',
        json: normalizedRecords,
        signal: options.signal,
      });
    });
  }
}

export function parseWellnessRecord(value: unknown): WellnessRecord {
  return wellnessRecordSchema.parse(value);
}

export function parseWellnessRecords(value: unknown): WellnessRecord[] {
  return wellnessRecordsSchema.parse(value);
}
