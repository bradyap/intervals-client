export type {
  ActivitiesResource,
  ActivityDetail,
  ActivityInterval,
  ActivitySummary,
  GetActivityOptions,
  ListActivitiesOptions,
} from './activities.js';
export type { AthleteProfile, AthleteResource, GetAthleteOptions } from './athlete.js';
export type { Calendar, CalendarsResource, ListCalendarsOptions } from './calendars.js';
export { IntervalsClient, type IntervalsClientOptions } from './client.js';
export type { DateRange, IsoDateString } from './dates.js';
export { IntervalsHttpError, IntervalsRequestError, IntervalsResponseError } from './errors.js';
export type {
  CalendarEvent,
  EventId,
  EventsResource,
  GetEventOptions,
  ListEventsOptions,
} from './events.js';
export type {
  GetWellnessOptions,
  ListWellnessOptions,
  WellnessRecord,
  WellnessResource,
} from './wellness.js';

export const intervalsClientVersion = '0.1.0';
