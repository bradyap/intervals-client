import { describe, expect, it, vi } from 'vitest';

import { IntervalsClient } from '../src/index.js';

interface SignalCase {
  name: string;
  request: (client: IntervalsClient, signal: AbortSignal) => Promise<unknown>;
}

const dateRange = { newest: '2026-07-31', oldest: '2026-07-01' } as const;
const signalCases: readonly SignalCase[] = [
  {
    name: 'activities.delete',
    request: (client, signal) => client.activities.delete('activity-1', { signal }),
  },
  {
    name: 'activities.get',
    request: (client, signal) => client.activities.get('activity-1', { signal }),
  },
  {
    name: 'activities.list',
    request: (client, signal) => client.activities.list({ ...dateRange, signal }),
  },
  {
    name: 'activities.update',
    request: (client, signal) => client.activities.update('activity-1', {}, { signal }),
  },
  {
    name: 'activities.upload',
    request: (client, signal) =>
      client.activities.upload(new Uint8Array(), { filename: 'activity.fit', signal }),
  },
  {
    name: 'activities.file.get',
    request: (client, signal) => client.activities.file.get('activity-1', { signal }),
  },
  {
    name: 'activities.fitFile.get',
    request: (client, signal) => client.activities.fitFile.get('activity-1', { signal }),
  },
  {
    name: 'activities.streams.get',
    request: (client, signal) => client.activities.streams.get('activity-1', { signal }),
  },
  {
    name: 'activities.streams.update',
    request: (client, signal) => client.activities.streams.update('activity-1', [], { signal }),
  },
  {
    name: 'activities.streams.updateCsv',
    request: (client, signal) =>
      client.activities.streams.updateCsv('activity-1', new Uint8Array(), { signal }),
  },
  {
    name: 'athlete.get',
    request: (client, signal) => client.athlete.get({ signal }),
  },
  {
    name: 'calendars.list',
    request: (client, signal) => client.calendars.list({ signal }),
  },
  {
    name: 'events.create',
    request: (client, signal) => client.events.create({}, { signal }),
  },
  {
    name: 'events.delete',
    request: (client, signal) => client.events.delete(1, { signal }),
  },
  {
    name: 'events.get',
    request: (client, signal) => client.events.get(1, { signal }),
  },
  {
    name: 'events.list',
    request: (client, signal) => client.events.list({ ...dateRange, signal }),
  },
  {
    name: 'events.update',
    request: (client, signal) => client.events.update(1, {}, { signal }),
  },
  {
    name: 'folders.create',
    request: (client, signal) => client.folders.create({}, { signal }),
  },
  {
    name: 'folders.delete',
    request: (client, signal) => client.folders.delete(1, { signal }),
  },
  {
    name: 'folders.list',
    request: (client, signal) => client.folders.list({ signal }),
  },
  {
    name: 'folders.update',
    request: (client, signal) => client.folders.update(1, {}, { signal }),
  },
  {
    name: 'sportSettings.get',
    request: (client, signal) => client.sportSettings.get(1, { signal }),
  },
  {
    name: 'sportSettings.list',
    request: (client, signal) => client.sportSettings.list({ signal }),
  },
  {
    name: 'wellness.get',
    request: (client, signal) => client.wellness.get('2026-07-01', { signal }),
  },
  {
    name: 'wellness.list',
    request: (client, signal) => client.wellness.list({ ...dateRange, signal }),
  },
  {
    name: 'wellness.update',
    request: (client, signal) => client.wellness.update('2026-07-01', {}, { signal }),
  },
  {
    name: 'wellness.updateBulk',
    request: (client, signal) => client.wellness.updateBulk([{ id: '2026-07-01' }], { signal }),
  },
  {
    name: 'workouts.create',
    request: (client, signal) => client.workouts.create({}, { signal }),
  },
  {
    name: 'workouts.delete',
    request: (client, signal) => client.workouts.delete(1, { signal }),
  },
  {
    name: 'workouts.get',
    request: (client, signal) => client.workouts.get(1, { signal }),
  },
  {
    name: 'workouts.list',
    request: (client, signal) => client.workouts.list({ signal }),
  },
  {
    name: 'workouts.update',
    request: (client, signal) => client.workouts.update(1, {}, { signal }),
  },
];

describe('AbortSignal support', () => {
  it.each(signalCases)('$name forwards the caller signal', async ({ request }) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(new Response('mocked failure', { status: 503 })));
    const client = new IntervalsClient({
      auth: { kind: 'apiKey', apiKey: 'secret' },
      fetch: fetchMock,
    });
    const abortController = new AbortController();

    await request(client, abortController.signal).catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(abortController.signal);
  });
});
