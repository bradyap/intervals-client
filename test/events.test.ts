import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('EventsResource', () => {
  it('lists events using exact API query and response field names', async () => {
    const responseBody = [
      {
        id: 123,
        calendar_id: 456,
        start_date_local: '2026-07-20T00:00:00',
        icu_training_load: 75,
        workout_doc: { duration: 3_600 },
        customField: true,
      },
    ];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    const events = await client.events.list({
      athleteId: 'i123',
      calendar_id: 456,
      category: 'WORKOUT',
      oldest: '2026-07-01',
      newest: '2026-07-31',
      resolve: true,
      signal: abortController.signal,
    });

    expect(events).toEqual(responseBody);
    expect(events[0]).not.toHaveProperty('calendarId');
    expect(events[0]).not.toHaveProperty('workoutDoc');
    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/athlete/i123/events');
    expect(requestUrl.searchParams.get('calendar_id')).toBe('456');
    expect(requestUrl.searchParams.has('calendarId')).toBe(false);
    expect(requestUrl.searchParams.get('category')).toBe('WORKOUT');
    expect(requestUrl.searchParams.get('resolve')).toBe('true');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abortController.signal }),
    );
  });

  it('gets an event by numeric id using the client athlete id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 123, name: 'Workout' }), {
        status: 200,
      }),
    );
    const client = new IntervalsClient({
      apiKey: 'secret',
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await client.events.get(123, { resolve: false });

    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/athlete/i123/events/123');
    expect(requestUrl.searchParams.get('resolve')).toBe('false');
  });

  it('rejects invalid event inputs before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(
      client.events.list({
        calendar_id: Number.NaN,
        oldest: '2026-07-01',
        newest: '2026-07-31',
      }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.events.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects event responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: 'Missing ID' }), { status: 200 }));
    const client = new IntervalsClient({ apiKey: 'secret', fetch: fetchMock });

    await expect(client.events.get(123)).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
