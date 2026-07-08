import { z } from 'zod';

import { validateDateRange, type DateRange } from './dates.js';
import type { ResourceRequester } from './request.js';
import { resolveAthleteId } from './resources.js';

const activitySummarySchema = z.looseObject({
  id: z.string(),
});
const activitySummariesSchema = z.array(activitySummarySchema);

export type ActivitySummary = z.infer<typeof activitySummarySchema>;

export interface ListActivitiesOptions extends DateRange {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ActivitiesResource {
  list(options: ListActivitiesOptions): Promise<ActivitySummary[]>;
}

export interface ActivitiesResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsActivitiesResource implements ActivitiesResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: ActivitiesResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
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

export function parseActivitySummaries(value: unknown): ActivitySummary[] {
  return activitySummariesSchema.parse(value);
}
