import { Buffer } from 'node:buffer';

import { IntervalsActivitiesResource, type ActivitiesResource } from './activities.js';
import { IntervalsAthleteResource, type AthleteResource } from './athlete.js';
import { IntervalsCalendarsResource, type CalendarsResource } from './calendars.js';
import { IntervalsHttpError, IntervalsResponseError } from './errors.js';
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
      requestVoid,
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
      throw new IntervalsResponseError({
        body,
        cause,
        message: options.validationMessage,
        url,
      });
    }
  }

  async #requestBytes(options: ResourceRequestBaseOptions): Promise<Uint8Array> {
    const { response } = await this.#requestResponse(options);

    return new Uint8Array(await response.arrayBuffer());
  }

  async #requestText(options: ResourceRequestBaseOptions): Promise<{ body: string; url: string }> {
    const { response, url } = await this.#requestResponse(options);

    return { body: await response.text(), url };
  }

  async #requestResponse(
    options: ResourceRequestBaseOptions,
  ): Promise<{ response: Response; url: string }> {
    const url = this.#buildUrl(options.pathSegments, options.query);
    const headers: Record<string, string> = {
      Accept: options.accept ?? 'application/json',
      Authorization: this.#authorizationHeader(),
    };
    const requestInit: RequestInit = {
      headers,
      method: options.method ?? 'GET',
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

    const response = await this.#fetch(url, requestInit);
    if (!response.ok) {
      const body = await response.text();

      throw new IntervalsHttpError({
        body,
        status: response.status,
        statusText: response.statusText,
        url,
      });
    }

    return { response, url };
  }

  async #requestVoid(options: ResourceRequestBaseOptions): Promise<void> {
    const { response } = await this.#requestResponse(options);

    await response.arrayBuffer();
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

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue && trimmedValue.length > 0 ? trimmedValue : undefined;
}
