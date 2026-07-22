export type {
  ActivitiesResource,
  ActivityDetail,
  ActivityId,
  ActivityInterval,
  ActivitySummary,
  ActivityUpdateInput,
  ActivityUploadResult,
  GetActivityOptions,
  ListActivitiesOptions,
  MutateActivityOptions,
  UploadActivityOptions,
} from './activities.js';
export type {
  ActivityFileResource,
  ActivityFitFileResource,
  BinaryInput,
  GetActivityFileOptions,
  GetActivityFitFileOptions,
} from './activity-files.js';
export type {
  ActivityStream,
  ActivityStreamsUpdateResult,
  ActivityStreamsResource,
  ActivityStreamWriteInput,
  GetActivityStreamsOptions,
  WriteActivityStreamsOptions,
} from './activity-streams.js';
export type { AthleteProfile, AthleteResource, GetAthleteOptions } from './athlete.js';
export type { Calendar, CalendarsResource, ListCalendarsOptions } from './calendars.js';
export { IntervalsClient, type IntervalsAuth, type IntervalsClientOptions } from './client.js';
export type { DateRange, IsoDateString } from './dates.js';
export {
  IntervalsAbortError,
  IntervalsConfigurationError,
  IntervalsError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsRequestError,
  IntervalsResponseError,
} from './errors.js';
export type {
  CalendarEvent,
  CalendarEventWriteInput,
  CreateEventOptions,
  EventId,
  EventsResource,
  GetEventOptions,
  ListEventsOptions,
  WriteEventOptions,
} from './events.js';
export type {
  FoldersResource,
  ListFoldersOptions,
  WorkoutFolder,
  WorkoutFolderId,
  WorkoutFolderWriteInput,
  WriteFolderOptions,
} from './folders.js';
export type {
  GetSportSettingsOptions,
  ListSportSettingsOptions,
  SportSettings,
  SportSettingsId,
  SportSettingsResource,
} from './sport-settings.js';
export type {
  GetWellnessOptions,
  ListWellnessOptions,
  WellnessBulkWriteInput,
  WellnessRecord,
  WellnessResource,
  WellnessWriteInput,
  WriteWellnessOptions,
} from './wellness.js';
export type {
  GetWorkoutOptions,
  ListWorkoutsOptions,
  Workout,
  WorkoutId,
  WorkoutWriteInput,
  WorkoutsResource,
  WriteWorkoutOptions,
} from './workouts.js';
