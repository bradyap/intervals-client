import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('WorkoutsResource', () => {
  it('creates a workout using exact API request fields', async () => {
    const workoutInput = {
      folder_id: 456,
      name: 'Threshold Session',
      description: 'Warmup\n- 10m 50%\nMain Set\n- 3x 8m 100%',
      type: 'Ride',
    };
    const responseBody = { id: 123, ...workoutInput, moving_time: 2_040 };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 201 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const workout = await client.workouts.create(workoutInput, {
      athleteId: 'i123',
      signal: abortController.signal,
    });

    expect(workout).toEqual(responseBody);
    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/workouts');
    expect(fetchMock).toHaveBeenCalledWith('https://intervals.icu/api/v1/athlete/i123/workouts', {
      body: JSON.stringify(workoutInput),
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from('API_KEY:secret', 'utf8').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: abortController.signal,
    });
  });

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

  it('updates a workout using an exact API request body', async () => {
    const workoutInput = {
      name: 'Updated Threshold Session',
      workout_doc: { duration: 2_400 },
    };
    const responseBody = { id: 123, ...workoutInput };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', athleteId: 'i123', fetch: fetchMock });

    await expect(client.workouts.update(123, workoutInput)).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/workouts/123');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(workoutInput));
    expect(requestInit?.method).toBe('PUT');
    expect(new Headers(requestInit?.headers).get('Content-Type')).toBe('application/json');
  });

  it('deletes a workout without parsing an empty response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.workouts.delete(' workout/with space ', { signal: abortController.signal }),
    ).resolves.toBeUndefined();

    expect(getRequestedUrl(fetchMock).pathname).toBe(
      '/api/v1/athlete/0/workouts/workout%2Fwith%20space',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE', signal: abortController.signal }),
    );
  });

  it('rejects invalid workout ids before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.workouts.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.workouts.update('   ', {})).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.workouts.delete(Number.NaN)).rejects.toBeInstanceOf(IntervalsRequestError);
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
