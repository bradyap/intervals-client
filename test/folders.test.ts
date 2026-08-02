import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('FoldersResource', () => {
  it('creates a folder using exact API request fields', async () => {
    const folderInput = {
      name: 'Cycling Library',
      description: 'Structured cycling workouts',
      type: 'FOLDER',
      activity_types: ['Ride'],
    };
    const responseBody = { id: 123, ...folderInput, children: null, customField: true };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 201 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const folder = await client.folders.create(folderInput, {
      athleteId: 'i123',
      signal: abortController.signal,
    });

    expect(folder).toEqual(responseBody);
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/folders');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(folderInput));
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.signal).toBe(abortController.signal);
  });

  it('lists folders using exact API response field names', async () => {
    const responseBody = [
      {
        id: 123,
        name: 'Library',
        canEdit: true,
        shareToken: null,
        sharedWithCount: 0,
        num_workouts: null,
        children: [{ id: 456 }],
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const folders = await client.folders.list({
      athleteId: 'i123',
      signal: abortController.signal,
    });

    expect(folders).toEqual(responseBody);
    expect(folders[0]).not.toHaveProperty('can_edit');
    expect(folders[0]).not.toHaveProperty('share_token');
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/folders');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('rejects folder responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([{ name: 'Missing ID' }]), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.folders.list()).rejects.toBeInstanceOf(IntervalsResponseError);
  });

  it('updates a folder using an exact API request body', async () => {
    const folderInput = {
      name: 'Updated Library',
      workout_targets: [{ id: 1 }],
    };
    const responseBody = { id: 123, ...folderInput };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await expect(client.folders.update(123, folderInput)).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/folders/123');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(folderInput));
    expect(requestInit?.method).toBe('PUT');
  });

  it('deletes a folder without parsing an empty response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.folders.delete(' folder/with space ', { signal: abortController.signal }),
    ).resolves.toBeUndefined();

    expect(getRequestedUrl(fetchMock).pathname).toBe(
      '/api/v1/athlete/0/folders/folder%2Fwith%20space',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE', signal: abortController.signal }),
    );
  });

  it('rejects invalid folder ids before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.folders.update('   ', {})).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.folders.delete(Number.NaN)).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
