import { z } from 'zod';

const athleteProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string().optional(),
});

export type AthleteProfile = z.infer<typeof athleteProfileSchema>;

export interface GetAthleteOptions {
  athleteId?: string;
}

export interface AthleteResource {
  get(options?: GetAthleteOptions): Promise<AthleteProfile>;
}

export interface ResourceRequestOptions<ResponseBody> {
  pathSegments: string[];
  parse: (value: unknown) => ResponseBody;
  validationMessage: string;
}

export type ResourceRequester = <ResponseBody>(
  options: ResourceRequestOptions<ResponseBody>,
) => Promise<ResponseBody>;

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
    const athleteId = options.athleteId?.trim();

    return this.#requestJson({
      pathSegments: [
        'athlete',
        athleteId && athleteId.length > 0 ? athleteId : this.#defaultAthleteId,
      ],
      parse: parseAthleteProfile,
      validationMessage: 'Intervals.icu response did not match the expected athlete profile shape',
    });
  }
}

export function parseAthleteProfile(value: unknown): AthleteProfile {
  return athleteProfileSchema.parse(value);
}
