import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { resolveAthleteId, withRequestErrorBoundary } from './resources.js';

const calendarSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  defaultCategory: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  eventsAreWorkouts: z.boolean().optional(),
  external: z.boolean().optional(),
  name: z.string().optional(),
  type: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});
const calendarsSchema = z.array(calendarSchema);

export type Calendar = z.infer<typeof calendarSchema>;

export interface ListCalendarsOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface CalendarsResource {
  list(options?: ListCalendarsOptions): Promise<Calendar[]>;
}

export interface CalendarsResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsCalendarsResource implements CalendarsResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: CalendarsResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async list(options: ListCalendarsOptions = {}): Promise<Calendar[]> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'calendars',
        ],
        signal: options.signal,
        parse: parseCalendars,
        validationMessage: 'Intervals.icu response did not match the expected calendars shape',
      }),
    );
  }
}

export function parseCalendars(value: unknown): Calendar[] {
  return calendarsSchema.parse(value);
}
