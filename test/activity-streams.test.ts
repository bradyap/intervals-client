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

  it('updates activity streams from JSON', async () => {
    const streams = [{ type: 'watts', data: [100, 200, null] }];
    const responseBody = { updated: ['watts'], deleted: [] };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.activities.streams.update('activity-1', streams)).resolves.toEqual(
      responseBody,
    );

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/activity/activity-1/streams');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe('PUT');
    expect(requestInit?.body).toBe(JSON.stringify(streams));
  });

  it('updates activity streams from CSV multipart data', async () => {
    const responseBody = { updated: ['watts'] };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.activities.streams.updateCsv(
        'activity-1',
        new TextEncoder().encode('time,watts\n0,100'),
      ),
    ).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/activity/activity-1/streams.csv');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe('PUT');
    expect(requestInit?.body).toBeInstanceOf(FormData);
    expect(new Headers(requestInit?.headers).has('Content-Type')).toBe(false);
    const file = (requestInit?.body as FormData).get('file');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('streams.csv');
  });
});
