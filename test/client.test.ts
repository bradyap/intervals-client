import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsHttpError, IntervalsResponseError } from '../src/index.js';

describe('IntervalsClient', () => {
  it('uses API-key basic auth and the authenticated athlete by default', async () => {
    const responseBody = { id: 'i123', name: 'Test Athlete', custom: true };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.athlete.get()).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith('https://intervals.icu/api/v1/athlete/0', {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
      },
      method: 'GET',
    });
  });

  it('normalizes client options and supports per-call athlete overrides and signals', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'i456' }), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      apiKey: ' secret ',
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

  it('rejects an empty API key', () => {
    expect(() => new IntervalsClient({ apiKey: '   ' })).toThrow(TypeError);
  });

  it('throws an IntervalsHttpError for unsuccessful responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('Access denied', {
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const error = await client.athlete.get().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(IntervalsHttpError);
    expect(error).toMatchObject({
      body: 'Access denied',
      status: 403,
      statusText: 'Forbidden',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    expect(Object.prototype.propertyIsEnumerable.call(error, 'body')).toBe(false);
  });

  it('wraps malformed JSON in an IntervalsResponseError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

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
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.athlete.get()).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
