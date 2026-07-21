# @bradyap/intervals-client

A small TypeScript client for the Intervals.icu API.

Requires Node.js 24 or newer.

Install directly from GitHub with `npm install github:bradyap/intervals-client#v0.3.0`.

```ts
import { IntervalsClient } from '@bradyap/intervals-client';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) throw new Error('INTERVALS_API_KEY is required');

const client = new IntervalsClient({ apiKey });
const profile = await client.athlete.get();
const activities = await client.activities.list({ oldest: '2026-07-01', newest: '2026-07-08' });
const firstActivity = activities[0];
if (firstActivity) {
  const activity = await client.activities.get(firstActivity.id, { intervals: true });
  const streams = await client.activities.streams.get(activity.id, { types: 'watts,heartrate' });
}
const wellness = await client.wellness.list({ oldest: '2026-07-01', newest: '2026-07-08' });
const events = await client.events.list({ oldest: '2026-07-01', newest: '2026-07-08' });
```

For personal API-key usage, Intervals.icu expects Basic Auth with username `API_KEY`; this
client builds that header from the provided API key.
