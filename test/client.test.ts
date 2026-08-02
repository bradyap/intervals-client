import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import {
  IntervalsAbortError,
  type IntervalsAuth,
  IntervalsClient,
  type IntervalsClientOptions,
  IntervalsConfigurationError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsRequestError,
  IntervalsResponseError,
} from '../src/index.js';

describe('IntervalsClient', () => {
  it('uses API-key basic auth and the authenticated athlete by default', async () => {
    const responseBody = { id: 'i123', name: 'Test Athlete', custom: true };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.athlete.get()).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith('https://intervals.icu/api/v1/athlete/0', {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
      },
      method: 'GET',
    });
  });

  it('uses a trimmed bearer token without retaining the mutable auth object', async () => {
    const responseBody = { id: 'i123' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const auth: IntervalsAuth = { kind: 'bearer', accessToken: ' bearer-token ' };
    const client = new IntervalsClient({ auth, fetch: fetchMock });
    auth.accessToken = 'changed';

    await client.athlete.get();

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer bearer-token',
    );
  });

  it('serializes JSON request bodies', async () => {
    const workout = { name: 'Test Workout' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 123, ...workout }), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await client.workouts.create(workout);

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(workout));
    expect(requestInit?.method).toBe('POST');
    expect(new Headers(requestInit?.headers).get('Content-Type')).toBe('application/json');
  });

  it('normalizes client options and supports per-call athlete overrides and signals', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'i456' }), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: ' secret ' },
      athleteId: ' i123 ',
      baseUrl: ' https://example.test/api/ ',
      fetch: fetchMock,
    });

    await client.athlete.get({ athleteId: ' athlete/with space ', signal: abortController.signal });

    expect(client.athleteId).toBe('i123');
    expect(client.baseUrl).toBe('https://example.test/api');
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://example.test/api/athlete/athlete%2Fwith%20space',
    );
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get('Authorization')).toBe(
      `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
    );
    expect(requestInit?.signal).toBe(abortController.signal);
  });

  it('rejects invalid client configuration with a stable error class', () => {
    const invalidOptions = [
      undefined,
      null,
      {},
      { apiKey: 'legacy' },
      { auth: null },
      { auth: {} },
      { auth: { kind: 'oauth', accessToken: 'token' } },
      { auth: { kind: 'apiKey' } },
      { auth: { kind: 'apiKey', apiKey: 123 } },
      { auth: { kind: 'apiKey', apiKey: '   ' } },
      { auth: { kind: 'bearer' } },
      { auth: { kind: 'bearer', accessToken: 123 } },
      { auth: { kind: 'bearer', accessToken: '   ' } },
      { auth: { kind: 'bearer', accessToken: 'token with space' } },
      { auth: { kind: 'bearer', accessToken: 'token\r\nmarker' } },
      { auth: { kind: 'bearer', accessToken: 'token-☃' } },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, athleteId: 123 },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'not a URL' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'ftp://example.test/api' },
      {
        auth: { kind: 'apiKey', apiKey: 'secret' },
        baseUrl: 'https://user:password@example.test/api',
      },
      {
        auth: { kind: 'apiKey', apiKey: 'secret' },
        baseUrl: 'https://example.test/api?private=true',
      },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'https://example.test/api#fragment' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'https://example.test/api?' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'https://example.test/api#' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'https://example.test/api?#' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, baseUrl: 'https://user:password@' },
      { auth: { kind: 'apiKey', apiKey: 'secret' }, fetch: null },
    ];

    for (const options of invalidOptions) {
      expect(() => new IntervalsClient(options as never)).toThrow(IntervalsConfigurationError);
    }
  });

  it('rejects sensitive client configuration without retaining its value', () => {
    const marker = 'private-marker';
    const captureConfigurationError = (options: IntervalsClientOptions): unknown => {
      try {
        return new IntervalsClient(options);
      } catch (cause) {
        return cause;
      }
    };
    const errors = [
      captureConfigurationError({
        auth: { kind: 'bearer', accessToken: `token\r\n${marker}` },
      }),
      ...[
        `https://user:${marker}@`,
        `https:\\user:${marker}@`,
        `https:/user:${marker}@`,
        `https:///user:${marker}@`,
        `https://[bad]?access_token=${marker}`,
        `https://[bad]#access_token=${marker}`,
      ].map((baseUrl) =>
        captureConfigurationError({
          auth: { kind: 'apiKey', apiKey: 'secret' },
          baseUrl,
        }),
      ),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(IntervalsConfigurationError);
      expect(JSON.stringify(error)).not.toContain(marker);
      expect(String(error)).not.toContain(marker);
      if (error instanceof IntervalsConfigurationError) {
        expect(error.cause).toBeUndefined();
      }
    }
  });

  it('preserves native causes from client option access and URL parsing', () => {
    const getterCause = new Error('option getter failed');
    const options = Object.defineProperty({}, 'auth', {
      get() {
        throw getterCause;
      },
    });

    const getterError = (() => {
      try {
        return new IntervalsClient(options as IntervalsClientOptions);
      } catch (cause) {
        return cause;
      }
    })();
    const urlError = (() => {
      try {
        return new IntervalsClient({
          auth: { kind: 'apiKey', apiKey: 'secret' },
          baseUrl: 'not a URL',
        });
      } catch (cause) {
        return cause;
      }
    })();

    expect(getterError).toBeInstanceOf(IntervalsConfigurationError);
    expect(getterError).toMatchObject({ cause: getterCause });
    expect(urlError).toBeInstanceOf(IntervalsConfigurationError);
    if (!(urlError instanceof IntervalsConfigurationError)) {
      throw new Error('expected an IntervalsConfigurationError');
    }
    expect(urlError.cause).toBeInstanceOf(TypeError);
  });

  it('throws an IntervalsHttpError for unsuccessful responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('Access denied', {
        headers: {
          Authorization: 'Bearer response-secret',
          'Set-Cookie': 'session=response-secret',
          'X-Custom-Header': 'custom value',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '42',
          'X-RateLimit-Reset': '2026-07-23T00:00:00Z',
        },
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const error = await client.athlete.get().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(IntervalsHttpError);
    if (!(error instanceof IntervalsHttpError)) {
      throw new Error('expected an IntervalsHttpError');
    }
    expect(error).toMatchObject({
      body: 'Access denied',
      headers: {
        'content-type': 'text/plain;charset=UTF-8',
        'x-custom-header': 'custom value',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '42',
        'x-ratelimit-reset': '2026-07-23T00:00:00Z',
      },
      method: 'GET',
      rateLimitLimit: '100',
      rateLimitRemaining: '42',
      rateLimitReset: '2026-07-23T00:00:00Z',
      status: 403,
      statusText: 'Forbidden',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    expect(Object.prototype.propertyIsEnumerable.call(error, 'body')).toBe(false);
    expect(error.headers).not.toHaveProperty('authorization');
    expect(error.headers).not.toHaveProperty('set-cookie');
    expect(JSON.stringify(error)).not.toContain('response-secret');
    expect(Object.isFrozen(error.headers)).toBe(true);
    expect(() => {
      (error.headers as Record<string, string>)['x-new-header'] = 'not allowed';
    }).toThrow(TypeError);
  });

  it('reports the non-default request method on HTTP errors', async () => {
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('Conflict', { status: 409, statusText: 'Conflict' })),
    });

    await expect(client.workouts.create({ name: 'Workout' })).rejects.toMatchObject({
      method: 'POST',
      name: 'IntervalsHttpError',
      rateLimitLimit: undefined,
      rateLimitRemaining: undefined,
      rateLimitReset: undefined,
    });
  });

  it('normalizes fetch failures while preserving their cause and request metadata', async () => {
    const cause = new TypeError('fetch failed');
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(cause);
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const error = await client.workouts
      .create({ name: 'Workout' })
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(IntervalsNetworkError);
    expect(error).toMatchObject({
      cause,
      method: 'POST',
      url: 'https://intervals.icu/api/v1/athlete/0/workouts',
    });
  });

  it('keeps abort failures distinct from other network failures', async () => {
    const cause = new DOMException('request aborted', 'AbortError');
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(cause);
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const error = await client.athlete.get().catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(IntervalsAbortError);
    expect(error).not.toBeInstanceOf(IntervalsNetworkError);
    expect(error).toMatchObject({
      cause,
      method: 'GET',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
  });

  it('does not start a request with an already aborted signal', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const abortController = new AbortController();
    const abortCause = new Error('cancelled');
    abortController.abort(abortCause);
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.athlete.get({ signal: abortController.signal })).rejects.toMatchObject({
      cause: abortCause,
      method: 'GET',
      name: 'IntervalsAbortError',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes response body read failures for JSON, bytes, and void responses', async () => {
    const textCause = new TypeError('text read failed');
    const bytesCause = new TypeError('bytes read failed');
    const voidCause = new TypeError('void read failed');
    const textResponse = new Response('{}');
    const bytesResponse = new Response(new Uint8Array([1]));
    const voidResponse = new Response(null, { status: 204 });
    vi.spyOn(textResponse, 'text').mockRejectedValue(textCause);
    vi.spyOn(bytesResponse, 'arrayBuffer').mockRejectedValue(bytesCause);
    vi.spyOn(voidResponse, 'arrayBuffer').mockRejectedValue(voidCause);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(textResponse)
      .mockResolvedValueOnce(bytesResponse)
      .mockResolvedValueOnce(voidResponse);
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const textError = await client.athlete.get().catch((failure: unknown) => failure);
    expect(textError).toBeInstanceOf(IntervalsNetworkError);
    expect(textError).toMatchObject({
      cause: textCause,
      method: 'GET',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    await expect(client.activities.file.get('activity-1')).rejects.toMatchObject({
      cause: bytesCause,
      method: 'GET',
      name: 'IntervalsNetworkError',
    });
    await expect(client.events.delete(1)).rejects.toMatchObject({
      cause: voidCause,
      method: 'DELETE',
      name: 'IntervalsNetworkError',
    });
  });

  it('normalizes an aborted response body read as an abort failure', async () => {
    const cause = new DOMException('body read aborted', 'AbortError');
    const response = new Response('{}');
    const abortController = new AbortController();
    vi.spyOn(response, 'text').mockImplementation(() => {
      abortController.abort(cause);
      return Promise.reject(cause);
    });
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
    });

    await expect(client.athlete.get({ signal: abortController.signal })).rejects.toMatchObject({
      cause,
      method: 'GET',
      name: 'IntervalsAbortError',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
  });

  it('normalizes failed reads of unsuccessful response bodies as network failures', async () => {
    const cause = new TypeError('error body read failed');
    const response = new Response('failure', { status: 500 });
    vi.spyOn(response, 'text').mockRejectedValue(cause);
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response),
    });

    await expect(client.athlete.get()).rejects.toMatchObject({
      cause,
      method: 'GET',
      name: 'IntervalsNetworkError',
    });
  });

  it('rethrows existing Intervals errors unchanged', async () => {
    const expected = new IntervalsRequestError('already normalized');
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: vi.fn<typeof fetch>().mockRejectedValue(expected),
    });

    await expect(client.athlete.get()).rejects.toBe(expected);
  });

  it('wraps malformed JSON in an IntervalsResponseError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const error = await client.athlete.get().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(IntervalsResponseError);
    expect(error).toMatchObject({
      message: 'Intervals.icu response was not valid JSON',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
  });

  it('wraps response schema mismatches in an IntervalsResponseError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: 'Missing ID' })));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.athlete.get()).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
