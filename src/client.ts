import { Buffer } from 'node:buffer';

import {
  IntervalsAthleteResource,
  type AthleteResource,
  type ResourceRequestOptions,
} from './athlete.js';
import { IntervalsHttpError, IntervalsResponseError } from './errors.js';

const defaultBaseUrl = 'https://intervals.icu/api/v1';
const defaultAthleteId = '0';

export interface IntervalsClientOptions {
  apiKey: string;
  athleteId?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class IntervalsClient {
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
    this.athleteId = options.athleteId?.trim() ?? defaultAthleteId;
    this.baseUrl = normalizeBaseUrl(options.baseUrl?.trim() ?? defaultBaseUrl);
    this.#fetch = options.fetch ?? fetch;
    this.athlete = new IntervalsAthleteResource({
      defaultAthleteId: this.athleteId,
      requestJson: <ResponseBody>(requestOptions: ResourceRequestOptions<ResponseBody>) =>
        this.#requestJson<ResponseBody>(requestOptions),
    });
  }

  async #requestJson<ResponseBody>(
    options: ResourceRequestOptions<ResponseBody>,
  ): Promise<ResponseBody> {
    const { body, url } = await this.#requestText(options.pathSegments);
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

  async #requestText(pathSegments: string[]): Promise<{ body: string; url: string }> {
    const url = this.#buildUrl(pathSegments);
    const response = await this.#fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: this.#authorizationHeader(),
      },
      method: 'GET',
    });
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

  #buildUrl(pathSegments: string[]): string {
    const encodedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');

    return `${this.baseUrl}/${encodedPath}`;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}
