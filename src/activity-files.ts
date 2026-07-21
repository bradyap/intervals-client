import type { ResourceBytesRequester } from './request.js';
import { validateRequiredString } from './resources.js';

export type BinaryInput = Blob | Uint8Array;

export interface GetActivityFileOptions {
  signal?: AbortSignal;
}

export interface GetActivityFitFileOptions extends GetActivityFileOptions {
  hr?: boolean;
  power?: boolean;
}

export interface ActivityFileResource {
  get(activityId: string, options?: GetActivityFileOptions): Promise<Uint8Array>;
}

export interface ActivityFitFileResource {
  get(activityId: string, options?: GetActivityFitFileOptions): Promise<Uint8Array>;
}

export class IntervalsActivityFileResource implements ActivityFileResource {
  readonly #requestBytes: ResourceBytesRequester;

  constructor(requestBytes: ResourceBytesRequester) {
    this.#requestBytes = requestBytes;
  }

  async get(activityId: string, options: GetActivityFileOptions = {}): Promise<Uint8Array> {
    return this.#requestBytes({
      accept: 'application/octet-stream',
      pathSegments: ['activity', validateRequiredString('activityId', activityId), 'file'],
      signal: options.signal,
    });
  }
}

export class IntervalsActivityFitFileResource implements ActivityFitFileResource {
  readonly #requestBytes: ResourceBytesRequester;

  constructor(requestBytes: ResourceBytesRequester) {
    this.#requestBytes = requestBytes;
  }

  async get(activityId: string, options: GetActivityFitFileOptions = {}): Promise<Uint8Array> {
    const query = new URLSearchParams();

    if (options.power !== undefined) {
      query.set('power', String(options.power));
    }

    if (options.hr !== undefined) {
      query.set('hr', String(options.hr));
    }

    return this.#requestBytes({
      accept: 'application/octet-stream',
      pathSegments: ['activity', validateRequiredString('activityId', activityId), 'fit-file'],
      query: query.size > 0 ? query : undefined,
      signal: options.signal,
    });
  }
}

export function toBlob(input: BinaryInput): Blob {
  return input instanceof Blob ? input : new Blob([Uint8Array.from(input)]);
}
