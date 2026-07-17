import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('WorkoutsResource', () => {
  it('lists workouts using exact API response field names', async () => {
    const responseBody = [
      {
        id: 123,
        folder_id: 456,
        icu_training_load: 80,
        workout_doc: { duration: 3_600 },
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const workouts = await client.workouts.list({
      athleteId: 'i123',
      signal: abortController.signal,
    });

    expect(workouts).toEqual(responseBody);
    expect(workouts[0]).not.toHaveProperty('folderId');
    expect(workouts[0]).not.toHaveProperty('workoutDoc');
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/workouts');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('gets a workout by numeric id using the client athlete id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 123 }), { status: 200 }));
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await client.workouts.get(123);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/workouts/123');
  });

  it('rejects invalid workout ids before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.workouts.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects workout responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: 'Missing ID' }), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.workouts.get(123)).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
