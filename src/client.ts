import { Buffer } from 'node:buffer';

import { IntervalsActivitiesResource, type ActivitiesResource } from './activities.js';
import { IntervalsAthleteResource, type AthleteResource } from './athlete.js';
import { IntervalsCalendarsResource, type CalendarsResource } from './calendars.js';
import {
  IntervalsAbortError,
  IntervalsError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsResponseError,
} from './errors.js';
import { IntervalsEventsResource, type EventsResource } from './events.js';
import { IntervalsFoldersResource, type FoldersResource } from './folders.js';
import type {
  ResourceRequester,
  ResourceBytesRequester,
  ResourceRequestBaseOptions,
  ResourceRequestOptions,
  ResourceVoidRequester,
} from './request.js';
import { IntervalsSportSettingsResource, type SportSettingsResource } from './sport-settings.js';
import { IntervalsWellnessResource, type WellnessResource } from './wellness.js';
import { IntervalsWorkoutsResource, type WorkoutsResource } from './workouts.js';

const defaultBaseUrl = 'https://intervals.icu/api/v1';
const defaultAthleteId = '0';

export interface IntervalsClientOptions {
  apiKey: string;
  athleteId?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class IntervalsClient {
  readonly activities: ActivitiesResource;
  readonly athlete: AthleteResource;
  readonly athleteId: string;
  readonly baseUrl: string;
  readonly calendars: CalendarsResource;
  readonly events: EventsResource;
  readonly folders: FoldersResource;
  readonly sportSettings: SportSettingsResource;
  readonly wellness: WellnessResource;
  readonly workouts: WorkoutsResource;

  readonly #apiKey: string;
  readonly #fetch: typeof fetch;

  constructor(options: IntervalsClientOptions) {
    const apiKey = options.apiKey.trim();

    if (apiKey.length === 0) {
      throw new TypeError('apiKey must not be empty');
    }

    this.#apiKey = apiKey;
    this.athleteId = normalizeOptionalString(options.athleteId) ?? defaultAthleteId;
    this.baseUrl = normalizeBaseUrl(options.baseUrl?.trim() ?? defaultBaseUrl);
    this.#fetch = options.fetch ?? fetch;
    const requestJson: ResourceRequester = <ResponseBody>(
      requestOptions: ResourceRequestOptions<ResponseBody>,
    ) => this.#requestJson<ResponseBody>(requestOptions);
    const requestBytes: ResourceBytesRequester = (requestOptions) =>
      this.#requestBytes(requestOptions);
    const requestVoid: ResourceVoidRequester = (requestOptions) =>
      this.#requestVoid(requestOptions);
    this.activities = new IntervalsActivitiesResource({
      defaultAthleteId: this.athleteId,
      requestBytes,
      requestJson,
    });
    this.athlete = new IntervalsAthleteResource({
      defaultAthleteId: this.athleteId,
      requestJson,
    });
    this.calendars = new IntervalsCalendarsResource({
      defaultAthleteId: this.athleteId,
      requestJson,
    });
    this.events = new IntervalsEventsResource({
      defaultAthleteId: this.athleteId,
      requestJson,
      requestVoid,
    });
    this.folders = new IntervalsFoldersResource({
      defaultAthleteId: this.athleteId,
      requestJson,
      requestVoid,
    });
    this.sportSettings = new IntervalsSportSettingsResource({
      defaultAthleteId: this.athleteId,
      requestJson,
    });
    this.wellness = new IntervalsWellnessResource({
      defaultAthleteId: this.athleteId,
      requestJson,
      requestVoid,
    });
    this.workouts = new IntervalsWorkoutsResource({
      defaultAthleteId: this.athleteId,
      requestJson,
    });
  }

  async #requestJson<ResponseBody>(
    options: ResourceRequestOptions<ResponseBody>,
  ): Promise<ResponseBody> {
    const { body, url } = await this.#requestText(options);
    let parsedBody: unknown;

    try {
      parsedBody = JSON.parse(body) as unknown;
    } catch (cause) {
      throw new IntervalsResponseError({
        body,
        cause,
        message: 'Intervals.icu response was not valid JSON',
        url,
      });
    }

    try {
      return options.parse(parsedBody);
    } catch (cause) {
      if (cause instanceof IntervalsError) {
        throw cause;
      }

      throw new IntervalsResponseError({
        body,
        cause,
        message: options.validationMessage,
        url,
      });
    }
  }

  async #requestBytes(options: ResourceRequestBaseOptions): Promise<Uint8Array> {
    const context = await this.#requestResponse(options);

    return new Uint8Array(await this.#readArrayBuffer(context));
  }

  async #requestText(options: ResourceRequestBaseOptions): Promise<{ body: string; url: string }> {
    const context = await this.#requestResponse(options);

    return { body: await this.#readText(context), url: context.url };
  }

  async #requestResponse(options: ResourceRequestBaseOptions): Promise<RequestResponseContext> {
    const url = this.#buildUrl(options.pathSegments, options.query);
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      Accept: options.accept ?? 'application/json',
      Authorization: this.#authorizationHeader(),
    };
    const requestInit: RequestInit = {
      headers,
      method,
    };

    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      requestInit.body = JSON.stringify(options.json);
    } else if (options.body !== undefined) {
      requestInit.body = options.body;
    }

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    if (options.signal?.aborted) {
      throw new IntervalsAbortError({ cause: options.signal.reason, method, url });
    }

    let response: Response;

    try {
      response = await this.#fetch(url, requestInit);
    } catch (cause) {
      this.#throwTransportError(cause, { method, signal: options.signal, url });
    }

    const context = { method, response, signal: options.signal, url };
    if (!response.ok) {
      const body = await this.#readText(context);

      throw new IntervalsHttpError({
        body,
        headers: Object.fromEntries(response.headers),
        method,
        status: response.status,
        statusText: response.statusText,
        url,
      });
    }

    return context;
  }

  async #requestVoid(options: ResourceRequestBaseOptions): Promise<void> {
    const context = await this.#requestResponse(options);

    await this.#readArrayBuffer(context);
  }

  async #readArrayBuffer(context: RequestResponseContext): Promise<ArrayBuffer> {
    try {
      return await context.response.arrayBuffer();
    } catch (cause) {
      this.#throwTransportError(cause, context);
    }
  }

  async #readText(context: RequestResponseContext): Promise<string> {
    try {
      return await context.response.text();
    } catch (cause) {
      this.#throwTransportError(cause, context);
    }
  }

  #throwTransportError(cause: unknown, context: RequestContext): never {
    if (cause instanceof IntervalsError) {
      throw cause;
    }

    const options = { cause, method: context.method, url: context.url };

    if (context.signal?.aborted || hasAbortErrorName(cause)) {
      throw new IntervalsAbortError(options);
    }

    throw new IntervalsNetworkError(options);
  }

  #authorizationHeader(): string {
    return `Basic ${Buffer.from(`API_KEY:${this.#apiKey}`, 'utf8').toString('base64')}`;
  }

  #buildUrl(pathSegments: string[], query?: URLSearchParams): string {
    const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
    const url = new URL(`${this.baseUrl}/${encodedPath}`);

    if (query) {
      url.search = query.toString();
    }

    return url.toString();
  }
}

interface RequestContext {
  method: string;
  signal?: AbortSignal;
  url: string;
}

interface RequestResponseContext extends RequestContext {
  response: Response;
}

function hasAbortErrorName(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  try {
    return 'name' in value && value.name === 'AbortError';
  } catch {
    return false;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}
