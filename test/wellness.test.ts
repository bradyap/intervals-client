import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('WellnessResource', () => {
  it('lists wellness records using exact API field and query names', async () => {
    const responseBody = [
      {
        id: '2026-07-01',
        restingHR: 42,
        sleepSecs: 28_800,
        rampRate: 3.5,
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const records = await client.wellness.list({
      athleteId: ' athlete/with space ',
      oldest: '2026-07-01',
      newest: '2026-07-07',
      signal: abortController.signal,
    });

    expect(records).toEqual(responseBody);
    expect(records[0]).not.toHaveProperty('restingHr');
    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/athlete/athlete%2Fwith%20space/wellness');
    expect(requestUrl.searchParams.get('oldest')).toBe('2026-07-01');
    expect(requestUrl.searchParams.get('newest')).toBe('2026-07-07');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('gets a daily wellness record using the client athlete id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: '2026-07-01', ctl: 50, atl: 45 }), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await client.wellness.get(' 2026-07-01 ');

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/wellness/2026-07-01');
  });

  it('rejects invalid wellness dates before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.wellness.get('2026-02-30')).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects wellness responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ weight: 70 }), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.wellness.get('2026-07-01')).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
