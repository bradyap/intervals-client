import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseActivityDetail, parseActivitySummaries } from '../src/activities.js';
import { parseActivityStreams } from '../src/activity-streams.js';
import { parseAthleteProfile } from '../src/athlete.js';
import { parseCalendars } from '../src/calendars.js';
import { parseEvents } from '../src/events.js';
import { parseWellnessRecords } from '../src/wellness.js';

const publicResponsesSchema = z.object({
  athlete: z.unknown(),
  activities: z.unknown(),
  activity: z.unknown(),
  streams: z.unknown(),
  calendars: z.unknown(),
  events: z.unknown(),
  wellness: z.unknown(),
});

function readJsonFixture(filename: string): unknown {
  const json: unknown = JSON.parse(
    readFileSync(new URL(`./fixtures/${filename}`, import.meta.url), 'utf8'),
  );

  return json;
}

describe('sanitized response fixtures', () => {
  it('parses each captured response family without dropping unknown fields or translating casing', () => {
    const fixtures = publicResponsesSchema.parse(
      readJsonFixture('sanitized-public-responses.json'),
    );
    const parsed = {
      athlete: parseAthleteProfile(fixtures.athlete),
      activities: parseActivitySummaries(fixtures.activities),
      activity: parseActivityDetail(fixtures.activity),
      streams: parseActivityStreams(fixtures.streams),
      calendars: parseCalendars(fixtures.calendars),
      events: parseEvents(fixtures.events),
      wellness: parseWellnessRecords(fixtures.wellness),
    };

    expect(parsed).toEqual(fixtures);
    expect(parsed.athlete).toHaveProperty('fixture_unknown', true);
    expect(parsed.activities[0]).toHaveProperty('fixture_unknown', true);
    expect(parsed.activity).toHaveProperty('fixture_unknown', true);
    expect(parsed.streams[0]).toHaveProperty('fixture_unknown', true);
    expect(parsed.calendars[0]).toHaveProperty('fixture_unknown', true);
    expect(parsed.events[0]).toHaveProperty('fixture_unknown', true);
    expect(parsed.wellness[0]).toHaveProperty('fixture_unknown', true);

    expect(parsed.streams[0]).toHaveProperty('allNull', false);
    expect(parsed.streams[0]).not.toHaveProperty('all_null');
    expect(parsed.events[0]).toHaveProperty('calendar_id', 1);
    expect(parsed.events[0]).not.toHaveProperty('calendarId');
    expect(parsed.wellness[0]).toMatchObject({ restingHR: 0, sleepSecs: 0 });
    expect(parsed.wellness[0]).not.toHaveProperty('restingHr');
  });

  it('preserves the complete sanitized activity-list fixture through loose parsing', () => {
    const fixture = readJsonFixture('activity-list-response.json');
    const activities = parseActivitySummaries(fixture);

    expect(activities).toEqual(fixture);
    expect(activities[0]).toHaveProperty('icu_ignore_time', false);
    expect(activities[0]).toHaveProperty('icu_pm_ftp_watts', null);
    expect(activities[0]).not.toHaveProperty('icuIgnoreTime');
  });
});
