import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('activity writes', () => {
  it('updates activity metadata using exact API fields', async () => {
    const activityInput = {
      name: 'Updated Ride',
      icu_rpe: 7,
      perceived_exertion: 8,
    };
    const responseBody = { id: 'activity-1', ...activityInput };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.activities.update('activity-1', activityInput)).resolves.toEqual(
      responseBody,
    );

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/activity/activity-1');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe('PUT');
    expect(requestInit?.body).toBe(JSON.stringify(activityInput));
  });

  it('deletes an activity and returns its documented identifier', async () => {
    const responseBody = { id: 'activity-1', icu_athlete_id: 'i123' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.activities.delete('activity-1')).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/activity/activity-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('uploads activity bytes as multipart data with exact API query names', async () => {
    const responseBody = { id: 'activity-1', icu_athlete_id: 'i123' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.activities.upload(new Uint8Array([1, 2, 3]), {
        athleteId: 'i123',
        description: 'Imported activity',
        device_name: 'Test Device',
        external_id: 'external-1',
        filename: 'activity.fit',
        name: 'Imported Ride',
        paired_event_id: 123,
        signal: abortController.signal,
      }),
    ).resolves.toEqual(responseBody);

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/v1/athlete/i123/activities');
    expect(requestedUrl.searchParams.get('name')).toBe('Imported Ride');
    expect(requestedUrl.searchParams.get('description')).toBe('Imported activity');
    expect(requestedUrl.searchParams.get('device_name')).toBe('Test Device');
    expect(requestedUrl.searchParams.get('external_id')).toBe('external-1');
    expect(requestedUrl.searchParams.get('paired_event_id')).toBe('123');

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.signal).toBe(abortController.signal);
    expect(requestInit?.body).toBeInstanceOf(FormData);
    expect(new Headers(requestInit?.headers).has('Content-Type')).toBe(false);
    const file = (requestInit?.body as FormData).get('file');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('activity.fit');
    expect(new Uint8Array(await (file as File).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('rejects invalid activity write inputs before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.activities.update('   ', {})).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.activities.delete('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(
      client.activities.upload(new Uint8Array(), { filename: '   ' }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
