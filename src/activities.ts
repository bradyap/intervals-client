import { z } from 'zod';

import {
  IntervalsActivityStreamsResource,
  type ActivityStreamsResource,
} from './activity-streams.js';
import { validateDateRange, type DateRange } from './dates.js';
import type { ResourceRequester } from './request.js';
import { resolveAthleteId, validateRequiredString } from './resources.js';

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

export type ActivityDetail = z.infer<typeof activityDetailSchema>;
export type ActivityInterval = z.infer<typeof activityIntervalSchema>;
export type ActivitySummary = z.infer<typeof activitySummarySchema>;

export interface GetActivityOptions {
  intervals?: boolean;
  signal?: AbortSignal;
}

export interface ListActivitiesOptions extends DateRange {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ActivitiesResource {
  readonly streams: ActivityStreamsResource;
  get(activityId: string, options?: GetActivityOptions): Promise<ActivityDetail>;
  list(options: ListActivitiesOptions): Promise<ActivitySummary[]>;
}

export interface ActivitiesResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsActivitiesResource implements ActivitiesResource {
  readonly streams: ActivityStreamsResource;

  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: ActivitiesResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
    this.streams = new IntervalsActivityStreamsResource({ requestJson: this.#requestJson });
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
}

export function parseActivityDetail(value: unknown): ActivityDetail {
  return activityDetailSchema.parse(value);
}

export function parseActivitySummaries(value: unknown): ActivitySummary[] {
  return activitySummariesSchema.parse(value);
}
