import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { parseActivitySummaries } from '../src/activities.js';
import {
  IntervalsClient,
  IntervalsHttpError,
  IntervalsRequestError,
  IntervalsResponseError,
  intervalsClientVersion,
} from '../src/index.js';

describe('intervalsClientVersion', () => {
  it('exports the package version placeholder', () => {
    expect(intervalsClientVersion).toBe('0.1.0');
  });
});

describe('IntervalsClient', () => {
  it('fetches the authenticated athlete profile with API key basic auth', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'i123', name: 'Test Athlete', custom: true }), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const profile = await client.athlete.get();

    expect(profile).toEqual({ id: 'i123', name: 'Test Athlete', custom: true });
    expect(fetchMock).toHaveBeenCalledWith('https://intervals.icu/api/v1/athlete/0', {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
      },
      method: 'GET',
    });
  });

  it('uses configured client options and allows a per-call athlete id override', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'i123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'i456' }), { status: 200 }));
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: 'i123',
      baseUrl: 'https://example.test/api/',
      fetch: fetchMock,
    });

    await client.athlete.get();
    await client.athlete.get({ athleteId: 'athlete/with space' });

    expect(client.athleteId).toBe('i123');
    expect(client.baseUrl).toBe('https://example.test/api');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.test/api/athlete/i123',
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.test/api/athlete/athlete%2Fwith%20space',
      expect.any(Object),
    );
  });

  it('stores trimmed constructor string options', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 'i123' }), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({
      apiKey: ' secret ',
      athleteId: ' i123 ',
      baseUrl: ' https://example.test/api/ ',
      fetch: fetchMock,
    });

    await client.athlete.get();

    expect(client.athleteId).toBe('i123');
    expect(client.baseUrl).toBe('https://example.test/api');
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/api/athlete/i123', {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
      },
      method: 'GET',
    });
  });

  it('rejects an empty API key', () => {
    expect(() => new IntervalsClient({ apiKey: '   ' })).toThrow(TypeError);
  });

  it('throws an IntervalsHttpError for non-successful responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('Access denied', {
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });
    const errorPromise = client.athlete.get();

    await expect(errorPromise).rejects.toMatchObject({
      body: 'Access denied',
      status: 403,
      statusText: 'Forbidden',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    await expect(errorPromise).rejects.toBeInstanceOf(IntervalsHttpError);
  });

  it('fails validation when the athlete profile response is missing an id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ name: 'Missing ID' }), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });
    const errorPromise = client.athlete.get();

    await expect(errorPromise).rejects.toMatchObject({
      body: JSON.stringify({ name: 'Missing ID' }),
      message: 'Intervals.icu response did not match the expected athlete profile shape',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    await expect(errorPromise).rejects.toBeInstanceOf(IntervalsResponseError);
  });

  it('throws an IntervalsResponseError for malformed JSON responses', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('not json', {
        status: 200,
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });
    const errorPromise = client.athlete.get();

    await expect(errorPromise).rejects.toMatchObject({
      body: 'not json',
      message: 'Intervals.icu response was not valid JSON',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    await expect(errorPromise).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});

describe('ActivitiesResource', () => {
  it('lists activities with date query parameters and basic auth', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'activity-1', custom: true }]), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const activities = await client.activities.list({
      oldest: '2026-07-01',
      newest: '2026-07-08',
    });

    expect(activities).toEqual([{ id: 'activity-1', custom: true }]);
    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/athlete/0/activities');
    expect(requestUrl.searchParams.get('oldest')).toBe('2026-07-01');
    expect(requestUrl.searchParams.get('newest')).toBe('2026-07-08');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
        },
        method: 'GET',
      }),
    );
  });

  it('uses client athlete id and per-call athlete id overrides', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' });
    await client.activities.list({
      athleteId: 'athlete/with space',
      oldest: '2026-07-01',
      newest: '2026-07-08',
    });

    expect(getRequestedUrl(fetchMock, 0).pathname).toBe('/api/v1/athlete/i123/activities');
    expect(getRequestedUrl(fetchMock, 1).pathname).toBe(
      '/api/v1/athlete/athlete%2Fwith%20space/activities',
    );
  });

  it('falls back to authenticated athlete when the client athlete id is blank', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: '   ',
      fetch: fetchMock,
    });

    await client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' });

    expect(client.athleteId).toBe('0');
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/0/activities');
  });

  it('forwards abort signals to fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
      }),
    );
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await client.activities.list({
      oldest: '2026-07-01',
      newest: '2026-07-08',
      signal: abortController.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it.each([
    { label: 'invalid leap day', oldest: '2023-02-29', newest: '2023-03-01' },
    { label: 'impossible month', oldest: '2026-13-01', newest: '2026-13-02' },
    { label: 'impossible day', oldest: '2026-04-31', newest: '2026-05-01' },
    { label: 'malformed oldest', oldest: '2026-7-01', newest: '2026-07-08' },
    { label: 'malformed newest', oldest: '2026-07-01', newest: '20260708' },
    { label: 'reversed range', oldest: '2026-07-08', newest: '2026-07-01' },
  ])('rejects $label before fetch', async ({ oldest, newest }) => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.activities.list({ oldest, newest })).rejects.toBeInstanceOf(
      IntervalsRequestError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws an IntervalsHttpError for activity list HTTP failures', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('Access denied', {
        status: 403,
        statusText: 'Forbidden',
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' }),
    ).rejects.toBeInstanceOf(IntervalsHttpError);
  });

  it('throws an IntervalsResponseError for malformed activity list JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' }),
    ).rejects.toBeInstanceOf(IntervalsResponseError);
  });

  it('throws an IntervalsResponseError for non-array activity list responses', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'activity-1' })));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' }),
    ).rejects.toBeInstanceOf(IntervalsResponseError);
  });

  it('throws an IntervalsResponseError for invalid activity items', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([{ name: 'Missing ID' }])));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' }),
    ).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});

describe('activity summary schema', () => {
  it('accepts the sanitized live activity list fixture', () => {
    const fixture: unknown = JSON.parse(
      readFileSync(new URL('./fixtures/activity-list-response.json', import.meta.url), 'utf8'),
    );

    expect(parseActivitySummaries(fixture)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'activity-fixture' })]),
    );
  });
});

function getRequestedUrl(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, callIndex = 0): URL {
  const fetchCall = fetchMock.mock.calls.at(callIndex);

  if (!fetchCall) {
    throw new Error(`fetch call ${String(callIndex)} was not made`);
  }

  const requestedUrl = fetchCall[0];

  if (requestedUrl instanceof Request) {
    return new URL(requestedUrl.url);
  }

  return new URL(requestedUrl);
}
