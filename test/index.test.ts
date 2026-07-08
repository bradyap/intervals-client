import { describe, expect, it, vi } from 'vitest';

import {
  IntervalsClient,
  IntervalsHttpError,
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

    const profile = await client.getAthleteProfile();

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

    await client.getAthleteProfile();
    await client.getAthleteProfile('athlete/with space');

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
    const errorPromise = client.getAthleteProfile();

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
    const errorPromise = client.getAthleteProfile();

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
    const errorPromise = client.getAthleteProfile();

    await expect(errorPromise).rejects.toMatchObject({
      body: 'not json',
      message: 'Intervals.icu response was not valid JSON',
      url: 'https://intervals.icu/api/v1/athlete/0',
    });
    await expect(errorPromise).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
