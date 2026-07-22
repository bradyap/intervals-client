import { Buffer } from 'node:buffer';

import { IntervalsActivitiesResource, type ActivitiesResource } from './activities.js';
import { IntervalsAthleteResource, type AthleteResource } from './athlete.js';
import { IntervalsCalendarsResource, type CalendarsResource } from './calendars.js';
import {
  IntervalsAbortError,
  IntervalsConfigurationError,
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
    try {
      const normalizedOptions = normalizeClientOptions(options);
      this.#apiKey = normalizedOptions.apiKey;
      this.athleteId = normalizedOptions.athleteId;
      this.baseUrl = normalizedOptions.baseUrl;
      this.#fetch = normalizedOptions.fetch;
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
    } catch (cause) {
      if (cause instanceof IntervalsConfigurationError) {
        throw cause;
      }

      throw new IntervalsConfigurationError('Invalid Intervals client configuration', { cause });
    }
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

interface NormalizedClientOptions {
  apiKey: string;
  athleteId: string;
  baseUrl: string;
  fetch: typeof fetch;
}

function normalizeClientOptions(options: unknown): NormalizedClientOptions {
  if (typeof options !== 'object' || options === null) {
    throw new IntervalsConfigurationError('Client options must be an object');
  }

  const values = options as unknown as Record<string, unknown>;

  return {
    apiKey: normalizeRequiredConfigurationString('apiKey', values.apiKey),
    athleteId: normalizeAthleteId(values.athleteId),
    baseUrl: normalizeBaseUrl(values.baseUrl),
    fetch: normalizeFetch(values.fetch),
  };
}

function normalizeAthleteId(value: unknown): string {
  if (value === undefined) {
    return defaultAthleteId;
  }

  if (typeof value !== 'string') {
    throw new IntervalsConfigurationError('athleteId must be a string');
  }

  return value.trim() || defaultAthleteId;
}

function normalizeBaseUrl(value: unknown): string {
  const baseUrl =
    value === undefined ? defaultBaseUrl : normalizeRequiredConfigurationString('baseUrl', value);
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(baseUrl);
  } catch (cause) {
    throw new IntervalsConfigurationError('baseUrl must be a valid absolute URL', { cause });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new IntervalsConfigurationError('baseUrl must use http or https');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new IntervalsConfigurationError('baseUrl must not include credentials');
  }

  if (baseUrl.includes('?') || baseUrl.includes('#')) {
    throw new IntervalsConfigurationError('baseUrl must not include a query or fragment');
  }

  return parsedUrl.toString().replace(/\/+$/, '');
}

function normalizeFetch(value: unknown): typeof fetch {
  const fetchImplementation = value === undefined ? globalThis.fetch : value;

  if (typeof fetchImplementation !== 'function') {
    throw new IntervalsConfigurationError('fetch must be a function');
  }

  return fetchImplementation as typeof fetch;
}

function normalizeRequiredConfigurationString(fieldName: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new IntervalsConfigurationError(`${fieldName} must be a non-empty string`);
  }

  return value.trim();
}
