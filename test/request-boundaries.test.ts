import { describe, expect, it, vi } from 'vitest';

import { IntervalsAbortError, IntervalsClient, IntervalsRequestError } from '../src/index.js';

function createClient() {
  const fetchMock = vi.fn<typeof fetch>();
  const client = new IntervalsClient({
    auth: { kind: 'apiKey', apiKey: 'secret' },
    fetch: fetchMock,
  });

  return { client, fetchMock };
}

describe('request error boundaries', () => {
  it('normalizes URL, JSON, and signal construction failures with native causes', async () => {
    const { client, fetchMock } = createClient();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    const urlError = await client.activities.get('\ud800').catch((cause: unknown) => cause);
    const jsonError = await client.workouts.create(cyclic).catch((cause: unknown) => cause);
    const signalError = await client.athlete
      .get({ signal: {} as AbortSignal })
      .catch((cause: unknown) => cause);
    const forgedSignalError = await client.athlete
      .get({ signal: Object.create(AbortSignal.prototype) as AbortSignal })
      .catch((cause: unknown) => cause);

    expect(urlError).toBeInstanceOf(IntervalsRequestError);
    expect(urlError).toMatchObject({ cause: expect.any(URIError) as unknown });
    expect(jsonError).toBeInstanceOf(IntervalsRequestError);
    expect(jsonError).toMatchObject({ cause: expect.any(TypeError) as unknown });
    expect(signalError).toBeInstanceOf(IntervalsRequestError);
    expect(forgedSignalError).toBeInstanceOf(IntervalsRequestError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('honors an abort triggered during request body serialization', async () => {
    const { client, fetchMock } = createClient();
    const abortController = new AbortController();
    const cause = new Error('aborted during serialization');
    const workout = {
      toJSON() {
        abortController.abort(cause);
        return { name: 'Workout' };
      },
    };

    await expect(
      client.workouts.create(workout, { signal: abortController.signal }),
    ).rejects.toBeInstanceOf(IntervalsAbortError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes throwing query option access before fetch', async () => {
    const { client, fetchMock } = createClient();
    const cause = new Error('category option failed');
    const options = Object.defineProperty(
      { newest: '2026-07-31', oldest: '2026-07-01' },
      'category',
      {
        get() {
          throw cause;
        },
      },
    );

    const error = await client.events.list(options as never).catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(IntervalsRequestError);
    expect(error).toMatchObject({ cause });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes missing required options and invalid athlete overrides', async () => {
    const { client, fetchMock } = createClient();
    const requests = [
      () => client.activities.list(undefined as never),
      () => client.events.list(null as never),
      () => client.wellness.list(undefined as never),
      () => client.activities.upload(new Uint8Array(), undefined as never),
      () => client.athlete.get({ athleteId: 123 as never }),
    ];

    for (const request of requests) {
      await expect(request()).rejects.toBeInstanceOf(IntervalsRequestError);
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects invalid multipart and bulk inputs before fetch', async () => {
    const { client, fetchMock } = createClient();

    await expect(
      client.activities.upload({} as never, { filename: 'activity.fit' }),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(
      client.activities.streams.updateCsv('activity-1', {} as never),
    ).rejects.toBeInstanceOf(IntervalsRequestError);
    await expect(client.wellness.updateBulk(null as never)).rejects.toBeInstanceOf(
      IntervalsRequestError,
    );
    await expect(client.wellness.updateBulk([null] as never)).rejects.toBeInstanceOf(
      IntervalsRequestError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves causes and existing Intervals errors from option access', async () => {
    const { client, fetchMock } = createClient();
    const nativeCause = new Error('athlete option failed');
    const expected = new IntervalsRequestError('already normalized');
    const nativeOptions = Object.defineProperty({}, 'athleteId', {
      get() {
        throw nativeCause;
      },
    });
    const normalizedOptions = Object.defineProperty({}, 'athleteId', {
      get() {
        throw expected;
      },
    });

    const error = await client.athlete.get(nativeOptions as never).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(IntervalsRequestError);
    expect(error).toMatchObject({ cause: nativeCause });
    await expect(client.athlete.get(normalizedOptions as never)).rejects.toBe(expected);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
