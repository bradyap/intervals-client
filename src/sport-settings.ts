import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { resolveAthleteId, validateResourceId, withRequestErrorBoundary } from './resources.js';

const optionalNumber = z.number().nullable().optional();
const optionalNumberArray = z.array(z.number()).nullable().optional();
const optionalStringArray = z.array(z.string()).nullable().optional();
const sportSettingsSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  athlete_id: z.string().optional(),
  types: optionalStringArray,
  ftp: optionalNumber,
  indoor_ftp: optionalNumber,
  w_prime: optionalNumber,
  p_max: optionalNumber,
  power_zones: optionalNumberArray,
  power_zone_names: optionalStringArray,
  lthr: optionalNumber,
  max_hr: optionalNumber,
  hr_zones: optionalNumberArray,
  hr_zone_names: optionalStringArray,
  threshold_pace: optionalNumber,
  pace_units: z.string().nullable().optional(),
  pace_zones: optionalNumberArray,
  pace_zone_names: optionalStringArray,
});
const sportSettingsListSchema = z.array(sportSettingsSchema);

export type SportSettings = z.infer<typeof sportSettingsSchema>;
export type SportSettingsId = string | number;

export interface GetSportSettingsOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ListSportSettingsOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface SportSettingsResource {
  get(settingsId: SportSettingsId, options?: GetSportSettingsOptions): Promise<SportSettings>;
  list(options?: ListSportSettingsOptions): Promise<SportSettings[]>;
}

export interface SportSettingsResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsSportSettingsResource implements SportSettingsResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: SportSettingsResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async get(
    settingsId: SportSettingsId,
    options: GetSportSettingsOptions = {},
  ): Promise<SportSettings> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'sport-settings',
          validateResourceId('settingsId', settingsId),
        ],
        signal: options.signal,
        parse: parseSportSettings,
        validationMessage: 'Intervals.icu response did not match the expected sport settings shape',
      }),
    );
  }

  async list(options: ListSportSettingsOptions = {}): Promise<SportSettings[]> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'sport-settings',
        ],
        signal: options.signal,
        parse: parseSportSettingsList,
        validationMessage:
          'Intervals.icu response did not match the expected sport settings list shape',
      }),
    );
  }
}

export function parseSportSettings(value: unknown): SportSettings {
  return sportSettingsSchema.parse(value);
}

export function parseSportSettingsList(value: unknown): SportSettings[] {
  return sportSettingsListSchema.parse(value);
}
