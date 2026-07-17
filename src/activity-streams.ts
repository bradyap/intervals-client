import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { validateRequiredString } from './resources.js';

const activityStreamSchema = z.looseObject({
  type: z.string(),
  data: z.array(z.unknown()),
  allNull: z.boolean().optional(),
  anomalies: z.array(z.unknown()).nullable().optional(),
  custom: z.boolean().optional(),
  data2: z.array(z.unknown()).nullable().optional(),
  name: z.string().nullable().optional(),
  valueType: z.string().nullable().optional(),
  valueTypeIsArray: z.boolean().optional(),
});
const activityStreamsSchema = z.array(activityStreamSchema);

export type ActivityStream = z.infer<typeof activityStreamSchema>;

export interface GetActivityStreamsOptions {
  signal?: AbortSignal;
  types?: string;
}

export interface ActivityStreamsResource {
  get(activityId: string, options?: GetActivityStreamsOptions): Promise<ActivityStream[]>;
}

export interface ActivityStreamsResourceOptions {
  requestJson: ResourceRequester;
}

export class IntervalsActivityStreamsResource implements ActivityStreamsResource {
  readonly #requestJson: ResourceRequester;

  constructor(options: ActivityStreamsResourceOptions) {
    this.#requestJson = options.requestJson;
  }

  async get(
    activityId: string,
    options: GetActivityStreamsOptions = {},
  ): Promise<ActivityStream[]> {
    const normalizedActivityId = validateRequiredString('activityId', activityId);
    const types =
      options.types === undefined ? undefined : validateRequiredString('types', options.types);
    const query = types ? new URLSearchParams([['types', types]]) : undefined;

    return this.#requestJson({
      pathSegments: ['activity', normalizedActivityId, 'streams.json'],
      query,
      signal: options.signal,
      parse: parseActivityStreams,
      validationMessage: 'Intervals.icu response did not match the expected activity streams shape',
    });
  }
}

export function parseActivityStreams(value: unknown): ActivityStream[] {
  return activityStreamsSchema.parse(value);
}
