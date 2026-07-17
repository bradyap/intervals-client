import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('ActivityStreamsResource', () => {
  it('gets selected stream types using exact API field names', async () => {
    const responseBody = [
      {
        type: 'watts',
        data: [100, 200, null],
        allNull: false,
        valueTypeIsArray: false,
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const streams = await client.activities.streams.get(' activity/with space ', {
      signal: abortController.signal,
      types: ' watts,heartrate ',
    });

    expect(streams).toEqual(responseBody);
    expect(streams[0]).not.toHaveProperty('all_null');
    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/activity/activity%2Fwith%20space/streams.json');
    expect(requestUrl.searchParams.get('types')).toBe('watts,heartrate');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('requests all streams when types are omitted', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ type: 'time', data: [0, 1] }]), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await client.activities.streams.get('activity-1');

    expect(getRequestedUrl(fetchMock).searchParams.has('types')).toBe(false);
  });

  it('rejects invalid stream inputs before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.activities.streams.get('   ')).rejects.toBeInstanceOf(
      IntervalsRequestError,
    );
    await expect(
      client.activities.streams.get('activity-1', { types: '   ' }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects stream responses without type and data', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify([{ name: 'Missing fields' }]), { status: 200 }),
      );
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.activities.streams.get('activity-1')).rejects.toBeInstanceOf(
      IntervalsResponseError,
    );
  });
});
