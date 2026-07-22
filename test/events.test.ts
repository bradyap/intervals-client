import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient, IntervalsRequestError, IntervalsResponseError } from '../src/index.js';
import { getRequestedUrl } from './helpers.js';

describe('EventsResource', () => {
  it('creates an event using exact API request fields', async () => {
    const eventInput = {
      category: 'WORKOUT',
      start_date_local: '2026-07-14T00:00:00',
      name: 'Threshold Session',
      description: '- 10m 50%\n- 3x 8m 100%',
      type: 'Ride',
      external_id: 'event-123',
    };
    const responseBody = { id: 123, calendar_id: 456, ...eventInput };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 201 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const event = await client.events.create(eventInput, {
      athleteId: 'i123',
      signal: abortController.signal,
      upsertOnUid: true,
    });

    expect(event).toEqual(responseBody);
    const requestedUrl = getRequestedUrl(fetchMock);
    expect(requestedUrl.pathname).toBe('/api/v1/athlete/i123/events');
    expect(requestedUrl.searchParams.get('upsertOnUid')).toBe('true');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(eventInput));
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.signal).toBe(abortController.signal);
  });

  it('defaults event creation to no UID upsert', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: 123 }), { status: 201 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await client.events.create({ name: 'Workout' });

    expect(getRequestedUrl(fetchMock).searchParams.get('upsertOnUid')).toBe('false');
  });

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
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    const events = await client.events.list({
      athleteId: 'i123',
      calendar_id: 456,
      category: ['WORKOUT', 'RACE'] as const,
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
    expect(requestUrl.searchParams.getAll('category')).toEqual(['WORKOUT', 'RACE']);
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
      auth: { kind: 'apiKey', apiKey: 'secret' },
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await client.events.get(123);

    const requestUrl = getRequestedUrl(fetchMock);
    expect(requestUrl.pathname).toBe('/api/v1/athlete/i123/events/123');
    expect(requestUrl.searchParams.has('resolve')).toBe(false);
  });

  it('updates an event using an exact API request body', async () => {
    const eventInput = {
      category: 'WORKOUT',
      name: 'Updated Threshold Session',
      start_date_local: '2026-07-14T00:00:00',
    };
    const responseBody = { id: 123, ...eventInput };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      athleteId: 'i123',
      fetch: fetchMock,
    });

    await expect(client.events.update(123, eventInput)).resolves.toEqual(responseBody);

    expect(getRequestedUrl(fetchMock).pathname).toBe('/api/v1/athlete/i123/events/123');
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify(eventInput));
    expect(requestInit?.method).toBe('PUT');
  });

  it('deletes an event without parsing an empty response', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const abortController = new AbortController();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.events.delete(' event/with space ', { signal: abortController.signal }),
    ).resolves.toBeUndefined();

    expect(getRequestedUrl(fetchMock).pathname).toBe(
      '/api/v1/athlete/0/events/event%2Fwith%20space',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE', signal: abortController.signal }),
    );
  });

  it('rejects invalid event inputs before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(
      client.events.list({
        calendar_id: Number.NaN,
        oldest: '2026-07-01',
        newest: '2026-07-31',
      }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.events.get('   ')).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(
      client.events.list({
        category: ['WORKOUT', '   '],
        oldest: '2026-07-01',
        newest: '2026-07-31',
      }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(
      client.events.list({
        category: 'WORKOUT' as never,
        oldest: '2026-07-01',
        newest: '2026-07-31',
      }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.events.update('   ', {})).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.events.delete(Number.NaN)).rejects.toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('omits category when an empty readonly array is provided', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await client.events.list({ category: [] as const, oldest: '2026-07-01', newest: '2026-07-31' });

    expect(getRequestedUrl(fetchMock).searchParams.has('category')).toBe(false);
  });

  it('rejects event responses without an id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ name: 'Missing ID' }), { status: 200 }));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });

    await expect(client.events.get(123)).rejects.toBeInstanceOf(IntervalsResponseError);
  });
});
