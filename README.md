# @bradyap/intervals-client

A small TypeScript client for the Intervals.icu API.

Requires Node.js 24 or newer.

```ts
import { IntervalsClient } from '@bradyap/intervals-client';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) throw new Error('INTERVALS_API_KEY is required');

const client = new IntervalsClient({ apiKey });
const profile = await client.getAthleteProfile();
```

For personal API-key usage, Intervals.icu expects Basic Auth with username `API_KEY`; this
client builds that header from the provided API key.
