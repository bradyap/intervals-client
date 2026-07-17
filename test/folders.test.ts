import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('FoldersResource', () => {
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
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

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
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.folders.list()).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
