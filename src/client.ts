import { Buffer } from 'node:buffer';

import { IntervalsActivitiesResource, type ActivitiesResource } from './activities.js';
import { IntervalsAthleteResource, type AthleteResource } from './athlete.js';
import { IntervalsHttpError, IntervalsResponseError } from './errors.js';
import type { ResourceRequestOptions } from './request.js';

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
    this.activities = new IntervalsActivitiesResource({
      defaultAthleteId: this.athleteId,
      requestJson: <ResponseBody>(requestOptions: ResourceRequestOptions<ResponseBody>) =>
        this.#requestJson<ResponseBody>(requestOptions),
    });
    this.athlete = new IntervalsAthleteResource({
      defaultAthleteId: this.athleteId,
      requestJson: <ResponseBody>(requestOptions: ResourceRequestOptions<ResponseBody>) =>
        this.#requestJson<ResponseBody>(requestOptions),
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

  async #requestText(
    options: Pick<ResourceRequestOptions<unknown>, 'pathSegments' | 'query' | 'signal'>,
  ): Promise<{ body: string; url: string }> {
    const url = this.#buildUrl(options.pathSegments, options.query);
    const requestInit: RequestInit = {
      headers: {
        Accept: 'application/json',
        Authorization: this.#authorizationHeader(),
      },
      method: 'GET',
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await this.#fetch(url, requestInit);
    const body = await response.text();

    if (!response.ok) {
      throw new IntervalsHttpError({
        body,
        status: response.status,
        statusText: response.statusText,
        url,
      });
    }

    return { body, url };
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
