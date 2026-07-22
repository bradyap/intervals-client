# @bradyap/intervals-client

A small TypeScript client for the Intervals.icu API. The package is currently version `0.9.0`,
requires Node.js 24 or newer, and remains under unstable pre-release development.

## Installation

Install the latest development revision from GitHub:

```sh
npm install github:bradyap/intervals-client#main
```

`#main` can change without notice. Real consumers should replace `main` with an exact
40-character commit SHA so updates remain deliberate and reproducible:

```sh
npm install github:bradyap/intervals-client#0123456789abcdef0123456789abcdef01234567
```

## Authentication and client options

Authentication is required and discriminated by `kind`. For a personal API key, the client sends
the Basic authorization format expected by Intervals.icu:

```ts
import { IntervalsClient } from '@bradyap/intervals-client';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) throw new Error('INTERVALS_API_KEY is required');

const client = new IntervalsClient({
  auth: { kind: 'apiKey', apiKey },
});
```

It can also send a caller-supplied bearer token:

```ts
const accessToken = process.env.INTERVALS_ACCESS_TOKEN;
if (!accessToken) throw new Error('INTERVALS_ACCESS_TOKEN is required');

const client = new IntervalsClient({
  auth: { kind: 'bearer', accessToken },
});
```

Bearer support accepts and sends a token; the client does not implement an OAuth authorization,
refresh, or storage workflow.

```ts
type IntervalsAuth = { kind: 'apiKey'; apiKey: string } | { kind: 'bearer'; accessToken: string };

interface IntervalsClientOptions {
  auth: IntervalsAuth;
  athleteId?: string; // Defaults to "0", the authenticated athlete.
  baseUrl?: string; // Defaults to https://intervals.icu/api/v1.
  fetch?: typeof fetch; // Defaults to globalThis.fetch.
}
```

`baseUrl` must be an absolute HTTP(S) URL without credentials, a query, or a fragment. Empty
optional `athleteId` values fall back to `"0"`; a method-level `athleteId` overrides that default
where the method supports one.

## Usage

```ts
const activities = await client.activities.list({
  oldest: '2026-07-01',
  newest: '2026-07-08',
});

const controller = new AbortController();
const events = await client.events.list({
  oldest: '2026-07-01',
  newest: '2026-07-08',
  category: ['WORKOUT', 'NOTE'],
  signal: controller.signal,
});
```

Every public request method accepts an `AbortSignal` through its options. `activities.list`,
`events.list`, and `wellness.list` require both `oldest` and `newest` in `YYYY-MM-DD` format,
inclusive and ordered oldest first.

### Resources

The signatures below omit response type details that TypeScript supplies from the package.
Arguments named `id` accept the resource's documented string or number identifier type.

| Resource             | Public methods                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `athlete`            | `get({ athleteId?, signal? }?)`                                                                                                                                                                                                                                                                      |
| `activities`         | `list({ oldest, newest, athleteId?, signal? })`, `get(activityId, { intervals?, signal? }?)`, `update(activityId, activity, { signal? }?)`, `delete(activityId, { signal? }?)`, `upload(file, { filename, athleteId?, name?, description?, device_name?, external_id?, paired_event_id?, signal? })` |
| `activities.file`    | `get(activityId, { signal? }?)` returns the original file as `Uint8Array`                                                                                                                                                                                                                            |
| `activities.fitFile` | `get(activityId, { power?, hr?, signal? }?)` returns a FIT file as `Uint8Array`                                                                                                                                                                                                                      |
| `activities.streams` | `get(activityId, { types?, signal? }?)`, `update(activityId, streams, { signal? }?)`, `updateCsv(activityId, csv, { signal? }?)`                                                                                                                                                                     |
| `calendars`          | `list({ athleteId?, signal? }?)`                                                                                                                                                                                                                                                                     |
| `events`             | `list({ oldest, newest, athleteId?, calendar_id?, category?, resolve?, signal? })`, `get(eventId, { athleteId?, signal? }?)`, `create(event, { athleteId?, upsertOnUid?, signal? }?)`, `update(eventId, event, { athleteId?, signal? }?)`, `delete(eventId, { athleteId?, signal? }?)`               |
| `folders`            | `list({ athleteId?, signal? }?)`, `create(folder, { athleteId?, signal? }?)`, `update(folderId, folder, { athleteId?, signal? }?)`, `delete(folderId, { athleteId?, signal? }?)`                                                                                                                     |
| `sportSettings`      | `list({ athleteId?, signal? }?)`, `get(settingsId, { athleteId?, signal? }?)`                                                                                                                                                                                                                        |
| `wellness`           | `list({ oldest, newest, athleteId?, signal? })`, `get(date, { athleteId?, signal? }?)`, `update(date, wellness, { athleteId?, signal? }?)`, `updateBulk(records, { athleteId?, signal? }?)`                                                                                                          |
| `workouts`           | `list({ athleteId?, signal? }?)`, `get(workoutId, { athleteId?, signal? }?)`, `create(workout, { athleteId?, signal? }?)`, `update(workoutId, workout, { athleteId?, signal? }?)`, `delete(workoutId, { athleteId?, signal? }?)`                                                                     |

Activity upload and CSV stream inputs accept `Blob` or `Uint8Array`. `events.list().category` and
`activities.streams.get().types` are `readonly string[]` values. Each element is serialized as a
repeated query parameter, rather than as a comma-separated string.

Request and response field names preserve the Intervals.icu API's exact casing, including forms
such as `calendar_id`, `device_name`, `restingHR`, and `spO2`; there is no field-name translation
layer. Write DTOs intentionally allow additional fields. Response parsing validates only stable
structure and identifiers, and preserves unknown response fields.

## Errors

Library failures share the following public error hierarchy:

| Error                         | Classification and public metadata                                                                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `IntervalsError`              | Common base class for every library error; use it to catch any client-classified failure.                                                                                                    |
| `IntervalsConfigurationError` | Invalid constructor options or authentication configuration.                                                                                                                                 |
| `IntervalsRequestError`       | Invalid endpoint arguments or a local request-construction failure.                                                                                                                          |
| `IntervalsAbortError`         | A request was already aborted, or fetch/body reading failed because of cancellation. Exposes `method` and `url`.                                                                             |
| `IntervalsNetworkError`       | A non-abort fetch or response-body read failure. Exposes `method` and `url`.                                                                                                                 |
| `IntervalsHttpError`          | A non-2xx response. Exposes `status`, `statusText`, `method`, `url`, immutable lowercase `headers`, and optional string-valued `rateLimitLimit`, `rateLimitRemaining`, and `rateLimitReset`. |
| `IntervalsResponseError`      | Invalid JSON or a response that does not match the stable response shape. Exposes `url`.                                                                                                     |

Wrapped native failures retain `Error.cause`, and existing `IntervalsError` instances are rethrown
unchanged. HTTP and response error bodies remain available as the non-enumerable `body` property;
they can contain private API data, so do not return or log them indiscriminately. Authorization
credentials are not included in the documented error metadata.
