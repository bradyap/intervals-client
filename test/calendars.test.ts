import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('CalendarsResource', () => {
  it('lists calendars using exact API response field names', async () => {
    const responseBody = [
      {
        id: 123,
        name: 'Default',
        defaultCategory: 'WORKOUT',
        eventsAreWorkouts: true,
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const calendars = await client.calendars.list({
      athleteId: 'i123',
      signal: abortController.signal,
    });

    expect(calendars).toEqual(responseBody);
    expect(calendars[0]).not.toHaveProperty('default_category');
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/calendars');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('rejects calendar responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([{ name: 'Missing ID' }]), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.calendars.list()).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
