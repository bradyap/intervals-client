import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('activity file resources', () => {
  it('downloads the original activity file as bytes', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const file = await client.activities.file.get(' activity/1 ', {
      signal: abortController.signal,
    });

    expect(file).toEqual(new Uint8Array([1, 2, 3]));
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/activity/activity%2F1/file');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get('Accept')).toBe('application/octet-stream');
    expect(requestInit?.signal).toBe(abortController.signal);
  });

  it('downloads a generated fit file with API query names', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new Uint8Array([4, 5, 6]), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.activities.fitFile.get('activity-1', { power: false, hr: true }),
    ).resolves.toEqual(new Uint8Array([4, 5, 6]));

    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/v1/activity/activity-1/fit-file');
    expect(requestedUrl.searchParams.get('power')).toBe('false');
    expect(requestedUrl.searchParams.get('hr')).toBe('true');
  });
});
