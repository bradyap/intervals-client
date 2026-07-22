import { z } from 'zod';

import { toBlob, type BinaryInput } from './activity-files.js';
import type { ResourceRequester } from './request.js';
import {
  appendStringArrayQuery,
  validateRequiredString,
  withRequestErrorBoundary,
} from './resources.js';

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
const activityStreamsUpdateResultSchema = z.looseObject({
  deleted: z.array(z.string()).optional(),
  updated: z.array(z.string()).optional(),
});

export type ActivityStream = z.infer<typeof activityStreamSchema>;
export type ActivityStreamsUpdateResult = z.infer<typeof activityStreamsUpdateResultSchema>;

export interface ActivityStreamWriteInput {
  [field: string]: unknown;
  data: unknown[];
  type: string;
}

export interface GetActivityStreamsOptions {
  signal?: AbortSignal;
  types?: readonly string[];
}

export interface WriteActivityStreamsOptions {
  signal?: AbortSignal;
}

export interface ActivityStreamsResource {
  get(activityId: string, options?: GetActivityStreamsOptions): Promise<ActivityStream[]>;
  update(
    activityId: string,
    streams: ActivityStreamWriteInput[],
    options?: WriteActivityStreamsOptions,
  ): Promise<ActivityStreamsUpdateResult>;
  updateCsv(
    activityId: string,
    csv: BinaryInput,
    options?: WriteActivityStreamsOptions,
  ): Promise<ActivityStreamsUpdateResult>;
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
    return withRequestErrorBoundary(() => {
      const normalizedActivityId = validateRequiredString('activityId', activityId);
      const query = new URLSearchParams();

      if (options.types !== undefined) {
        appendStringArrayQuery(query, 'types', options.types);
      }

      return this.#requestJson({
        pathSegments: ['activity', normalizedActivityId, 'streams.json'],
        query: query.size > 0 ? query : undefined,
        signal: options.signal,
        parse: parseActivityStreams,
        validationMessage:
          'Intervals.icu response did not match the expected activity streams shape',
      });
    });
  }

  async update(
    activityId: string,
    streams: ActivityStreamWriteInput[],
    options: WriteActivityStreamsOptions = {},
  ): Promise<ActivityStreamsUpdateResult> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: ['activity', validateRequiredString('activityId', activityId), 'streams'],
        method: 'PUT',
        json: streams,
        signal: options.signal,
        parse: parseActivityStreamsUpdateResult,
        validationMessage:
          'Intervals.icu response did not match the expected activity streams update shape',
      }),
    );
  }

  async updateCsv(
    activityId: string,
    csv: BinaryInput,
    options: WriteActivityStreamsOptions = {},
  ): Promise<ActivityStreamsUpdateResult> {
    return withRequestErrorBoundary(() => {
      const formData = new FormData();
      formData.append('file', toBlob(csv), 'streams.csv');

      return this.#requestJson({
        pathSegments: ['activity', validateRequiredString('activityId', activityId), 'streams.csv'],
        body: formData,
        method: 'PUT',
        signal: options.signal,
        parse: parseActivityStreamsUpdateResult,
        validationMessage:
          'Intervals.icu response did not match the expected activity streams update shape',
      });
    });
  }
}

export function parseActivityStreams(value: unknown): ActivityStream[] {
  return activityStreamsSchema.parse(value);
}

export function parseActivityStreamsUpdateResult(value: unknown): ActivityStreamsUpdateResult {
  return activityStreamsUpdateResultSchema.parse(value);
}
