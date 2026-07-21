import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('SportSettingsResource', () => {
  it('lists sport settings using exact API fields', async () => {
    const responseBody = [
      {
        id: 123,
        athlete_id: 'i123',
        types: ['Ride', 'VirtualRide'],
        ftp: 280,
        power_zones: [55, 75, 90, 105, 120],
        lthr: null,
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const settings = await client.sportSettings.list({
      athleteId: ' athlete/with space ',
      signal: abortController.signal,
    });

    expect(settings).toEqual(responseBody);
    expect(settings[0]).not.toHaveProperty('athleteId');
    expect(getRequestedUrl(fetchMock).pathname).toBe(
      '/api/v1/athlete/athlete%2Fwith%20space/sport-settings',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('gets sport settings by activity type', async () => {
    const responseBody = { id: 123, types: ['Run'], threshold_pace: 240 };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', athleteId: 'i123', fetch: fetchMock });

    await expect(client.sportSettings.get(' Run ')).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/sport-settings/Run');
  });

  it('rejects invalid ids and response shapes', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ types: ['Ride'] }), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.sportSettings.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(client.sportSettings.list()).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
