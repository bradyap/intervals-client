import { z } from 'zod';

import { validateDateRange, type DateRange } from './dates.js';
import type { ResourceRequester } from './request.js';
import { resolveAthleteId, validateRequiredString, validateResourceId } from './resources.js';

const resourceIdSchema = z.union([z.string(), z.number()]);
const eventSchema = z.looseObject({
  id: resourceIdSchema,
  calendar_id: resourceIdSchema.nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  end_date_local: z.string().nullable().optional(),
  icu_training_load: z.number().nullable().optional(),
  moving_time: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  start_date_local: z.string().optional(),
  type: z.string().nullable().optional(),
  workout_doc: z.looseObject({}).nullable().optional(),
});
const eventsSchema = z.array(eventSchema);

export type CalendarEvent = z.infer<typeof eventSchema>;
export type EventId = string | number;

export interface GetEventOptions {
  athleteId?: string;
  resolve?: boolean;
  signal?: AbortSignal;
}

export interface ListEventsOptions extends DateRange {
  athleteId?: string;
  calendar_id?: string | number;
  category?: string;
  resolve?: boolean;
  signal?: AbortSignal;
}

export interface EventsResource {
  get(eventId: EventId, options?: GetEventOptions): Promise<CalendarEvent>;
  list(options: ListEventsOptions): Promise<CalendarEvent[]>;
}

export interface EventsResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsEventsResource implements EventsResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: EventsResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async get(eventId: EventId, options: GetEventOptions = {}): Promise<CalendarEvent> {
    const query = new URLSearchParams();

    if (options.resolve !== undefined) {
      query.set('resolve', String(options.resolve));
    }

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'events',
        validateResourceId('eventId', eventId),
      ],
      query: query.size > 0 ? query : undefined,
      signal: options.signal,
      parse: parseEvent,
      validationMessage: 'Intervals.icu response did not match the expected event shape',
    });
  }

  async list(options: ListEventsOptions): Promise<CalendarEvent[]> {
    const dateRange = validateDateRange(options);
    const query = new URLSearchParams([
      ['oldest', dateRange.oldest],
      ['newest', dateRange.newest],
    ]);

    if (options.calendar_id !== undefined) {
      query.set('calendar_id', validateResourceId('calendar_id', options.calendar_id));
    }

    if (options.category !== undefined) {
      query.set('category', validateRequiredString('category', options.category));
    }

    if (options.resolve !== undefined) {
      query.set('resolve', String(options.resolve));
    }

    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'events',
      ],
      query,
      signal: options.signal,
      parse: parseEvents,
      validationMessage: 'Intervals.icu response did not match the expected events shape',
    });
  }
}

export function parseEvent(value: unknown): CalendarEvent {
  return eventSchema.parse(value);
}

export function parseEvents(value: unknown): CalendarEvent[] {
  return eventsSchema.parse(value);
}
