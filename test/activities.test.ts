import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { parseActivitySummaries } from '../src/activities.js';
import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('ActivitiesResource', () => {
  it('gets activity detail with optional intervals and forwards signals', async () => {
    const responseBody = {
      id: 'activity-1',
      icu_intervals: [{ id: 42, type: 'WORK', start_time: 60, end_time: 120 }],
      custom: true,
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(responseBody)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'activity-2' })));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.activities.get(' activity/with space ', {
        intervals: true,
        signal: abortController.signal,
      }),
    ).resolves.toEqual(responseBody);
    await client.activities.get('activity-2');

    const firstUrl = getRequestedUrl(fetchMock, 0);
    expect(firstUrl.pathname).toBe('/api/v1/activity/activity%2Fwith%20space');
    expect(firstUrl.searchParams.get('intervals')).toBe('true');
    expect(getRequestedUrl(fetchMock, 1).searchParams.has('intervals')).toBe(false);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(abortController.signal);
  });

  it('lists activities with date queries and athlete overrides', async () => {
    const responseBody = [{ id: 'activity-1', name: 'Morning Ride', custom: true }];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.activities.list({
        athleteId: ' athlete/with space ',
        oldest: '2026-07-01',
        newest: '2026-07-08',
      }),
    ).resolves.toEqual(responseBody);

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/v1/athlete/athlete%2Fwith%20space/activities');
    expect(requestedUrl.searchParams.get('oldest')).toBe('2026-07-01');
    expect(requestedUrl.searchParams.get('newest')).toBe('2026-07-08');
  });

  it('rejects invalid activity inputs before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.activities.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(
      client.activities.list({ oldest: '2026-07-08', newest: '2026-07-01' }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid activity response shapes', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([{ name: 'Missing ID' }])));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

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
