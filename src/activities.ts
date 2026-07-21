import { z } from 'zod';

import {
  IntervalsActivityStreamsResource,
  type ActivityStreamsResource,
} from './activity-streams.js';
import {
  IntervalsActivityFileResource,
  IntervalsActivityFitFileResource,
  toBlob,
  type ActivityFileResource,
  type ActivityFitFileResource,
  type BinaryInput,
} from './activity-files.js';
import { validateDateRange, type DateRange } from './dates.js';
import type { ResourceBytesRequester, ResourceRequester } from './request.js';
import { resolveAthleteId, validateRequiredString, validateResourceId } from './resources.js';

const activityShape = {
  description: z.string().nullable().optional(),
  distance: z.number().nullable().optional(),
  elapsed_time: z.number().optional(),
  id: z.string(),
  icu_training_load: z.number().nullable().optional(),
  moving_time: z.number().optional(),
  name: z.string().optional(),
  start_date: z.string().optional(),
  start_date_local: z.string().optional(),
  stream_types: z.array(z.string()).optional(),
  total_elevation_gain: z.number().nullable().optional(),
  type: z.string().optional(),
};

const activityIntervalSchema = z.looseObject({
  end_time: z.number().optional(),
  id: z.number().optional(),
  start_time: z.number().optional(),
  type: z.string().optional(),
});
const activitySummarySchema = z.looseObject(activityShape);
const activityDetailSchema = z.looseObject({
  ...activityShape,
  icu_intervals: z.array(activityIntervalSchema).optional(),
});
const activitySummariesSchema = z.array(activitySummarySchema);
const activityIdSchema = z.looseObject({
  id: z.string(),
  icu_athlete_id: z.string().optional(),
});
const activityUploadResultSchema = z.looseObject({
  activities: z.array(activityIdSchema).optional(),
  icu_athlete_id: z.string().optional(),
  id: z.string().optional(),
});

export type ActivityDetail = z.infer<typeof activityDetailSchema>;
export type ActivityId = z.infer<typeof activityIdSchema>;
export type ActivityInterval = z.infer<typeof activityIntervalSchema>;
export type ActivitySummary = z.infer<typeof activitySummarySchema>;
export type ActivityUploadResult = z.infer<typeof activityUploadResultSchema>;

export interface ActivityUpdateInput {
  [field: string]: unknown;
  description?: string | null;
  feel?: number | null;
  gear?: Record<string, unknown> | null;
  icu_rpe?: number | null;
  name?: string | null;
  perceived_exertion?: number | null;
  start_date_local?: string | null;
  tags?: string[] | null;
  type?: string | null;
}

export interface GetActivityOptions {
  intervals?: boolean;
  signal?: AbortSignal;
}

export interface ListActivitiesOptions extends DateRange {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface MutateActivityOptions {
  signal?: AbortSignal;
}

export interface UploadActivityOptions {
  athleteId?: string;
  description?: string;
  device_name?: string;
  external_id?: string;
  filename: string;
  name?: string;
  paired_event_id?: string | number;
  signal?: AbortSignal;
}

export interface ActivitiesResource {
  readonly file: ActivityFileResource;
  readonly fitFile: ActivityFitFileResource;
  readonly streams: ActivityStreamsResource;
  delete(activityId: string, options?: MutateActivityOptions): Promise<ActivityId>;
  get(activityId: string, options?: GetActivityOptions): Promise<ActivityDetail>;
  list(options: ListActivitiesOptions): Promise<ActivitySummary[]>;
  update(
    activityId: string,
    activity: ActivityUpdateInput,
    options?: MutateActivityOptions,
  ): Promise<ActivityDetail>;
  upload(file: BinaryInput, options: UploadActivityOptions): Promise<ActivityUploadResult>;
}

export interface ActivitiesResourceOptions {
  defaultAthleteId: string;
  requestBytes: ResourceBytesRequester;
  requestJson: ResourceRequester;
}

export class IntervalsActivitiesResource implements ActivitiesResource {
  readonly file: ActivityFileResource;
  readonly fitFile: ActivityFitFileResource;
  readonly streams: ActivityStreamsResource;

  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: ActivitiesResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
    this.file = new IntervalsActivityFileResource(options.requestBytes);
    this.fitFile = new IntervalsActivityFitFileResource(options.requestBytes);
    this.streams = new IntervalsActivityStreamsResource({ requestJson: this.#requestJson });
  }

  async delete(activityId: string, options: MutateActivityOptions = {}): Promise<ActivityId> {
    return this.#requestJson({
      pathSegments: ['activity', validateRequiredString('activityId', activityId)],
      method: 'DELETE',
      signal: options.signal,
      parse: parseActivityId,
      validationMessage: 'Intervals.icu response did not match the expected activity id shape',
    });
  }

  async get(activityId: string, options: GetActivityOptions = {}): Promise<ActivityDetail> {
    const normalizedActivityId = validateRequiredString('activityId', activityId);
    const query = options.intervals ? new URLSearchParams([['intervals', 'true']]) : undefined;

    return this.#requestJson({
      pathSegments: ['activity', normalizedActivityId],
      query,
      signal: options.signal,
      parse: parseActivityDetail,
      validationMessage: 'Intervals.icu response did not match the expected activity detail shape',
    });
  }

  async list(options: ListActivitiesOptions): Promise<ActivitySummary[]> {
    const dateRange = validateDateRange(options);

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'activities',
      ],
      query: new URLSearchParams([
        ['oldest', dateRange.oldest],
        ['newest', dateRange.newest],
      ]),
      signal: options.signal,
      parse: parseActivitySummaries,
      validationMessage:
        'Intervals.icu response did not match the expected activity summaries shape',
    });
  }

  async update(
    activityId: string,
    activity: ActivityUpdateInput,
    options: MutateActivityOptions = {},
  ): Promise<ActivityDetail> {
    return this.#requestJson({
      pathSegments: ['activity', validateRequiredString('activityId', activityId)],
      method: 'PUT',
      json: activity,
      signal: options.signal,
      parse: parseActivityDetail,
      validationMessage: 'Intervals.icu response did not match the expected activity detail shape',
    });
  }

  async upload(file: BinaryInput, options: UploadActivityOptions): Promise<ActivityUploadResult> {
    const formData = new FormData();
    const query = new URLSearchParams();
    formData.append('file', toBlob(file), validateRequiredString('filename', options.filename));

    for (const [name, value] of [
      ['name', options.name],
      ['description', options.description],
      ['device_name', options.device_name],
      ['external_id', options.external_id],
    ] as const) {
      if (value !== undefined) {
        query.set(name, value);
      }
    }

    if (options.paired_event_id !== undefined) {
      query.set('paired_event_id', validateResourceId('paired_event_id', options.paired_event_id));
    }

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'activities',
      ],
      body: formData,
      method: 'POST',
      query: query.size > 0 ? query : undefined,
      signal: options.signal,
      parse: parseActivityUploadResult,
      validationMessage: 'Intervals.icu response did not match the expected activity upload shape',
    });
  }
}

export function parseActivityId(value: unknown): ActivityId {
  return activityIdSchema.parse(value);
}

export function parseActivityDetail(value: unknown): ActivityDetail {
  return activityDetailSchema.parse(value);
}

export function parseActivitySummaries(value: unknown): ActivitySummary[] {
  return activitySummariesSchema.parse(value);
}

export function parseActivityUploadResult(value: unknown): ActivityUploadResult {
  return activityUploadResultSchema.parse(value);
}
