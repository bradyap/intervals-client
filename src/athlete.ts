import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { resolveAthleteId } from './resources.js';

const athleteProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string().optional(),
});

export type AthleteProfile = z.infer<typeof athleteProfileSchema>;

export interface GetAthleteOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface AthleteResource {
  get(options?: GetAthleteOptions): Promise<AthleteProfile>;
}

export interface AthleteResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsAthleteResource implements AthleteResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: AthleteResourceOptions['requestJson'];

  constructor(options: AthleteResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async get(options: GetAthleteOptions = {}): Promise<AthleteProfile> {
    return this.#requestJson({
      pathSegments: ['athlete', resolveAthleteId(options.athleteId, this.#defaultAthleteId)],
      signal: options.signal,
      parse: parseAthleteProfile,
      validationMessage: 'Intervals.icu response did not match the expected athlete profile shape',
    });
  }
}

export function parseAthleteProfile(value: unknown): AthleteProfile {
  return athleteProfileSchema.parse(value);
}
