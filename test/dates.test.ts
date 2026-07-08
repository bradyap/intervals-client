import { describe, expect, it } from 'vitest';

import { validateDateRange } from '../src/dates.js';
import { IntervalsRequestError } from '../src/index.js';

describe('validateDateRange', () => {
  it('accepts and trims a valid date range', () => {
    expect(validateDateRange({ oldest: ' 2026-07-01 ', newest: ' 2026-07-08 ' })).toEqual({
      oldest: '2026-07-01',
      newest: '2026-07-08',
    });
  });

  it('accepts a valid leap day', () => {
    expect(validateDateRange({ oldest: '2024-02-29', newest: '2024-03-01' })).toEqual({
      oldest: '2024-02-29',
      newest: '2024-03-01',
    });
  });

  it.each([
    { label: 'invalid leap day', oldest: '2023-02-29', newest: '2023-03-01' },
    { label: 'impossible month', oldest: '2026-13-01', newest: '2026-13-02' },
    { label: 'impossible day', oldest: '2026-04-31', newest: '2026-05-01' },
    { label: 'unpadded month', oldest: '2026-7-01', newest: '2026-07-08' },
    { label: 'compact date', oldest: '20260701', newest: '2026-07-08' },
    { label: 'reversed range', oldest: '2026-07-08', newest: '2026-07-01' },
  ])('rejects $label', ({ oldest, newest }) => {
    expect(() => validateDateRange({ oldest, newest })).toThrow(IntervalsRequestError);
  });

  it.each([
    { label: 'undefined oldest', oldest: undefined, newest: '2026-07-08' },
    { label: 'null oldest', oldest: null, newest: '2026-07-08' },
    { label: 'date object oldest', oldest: new Date('2026-07-01T00:00:00Z'), newest: '2026-07-08' },
    { label: 'number oldest', oldest: 20260701, newest: '2026-07-08' },
    { label: 'undefined newest', oldest: '2026-07-01', newest: undefined },
    { label: 'null newest', oldest: '2026-07-01', newest: null },
  ])('rejects non-string input: $label', ({ oldest, newest }) => {
    expect(() =>
      validateDateRange({
        oldest: oldest as never,
        newest: newest as never,
      }),
    ).toThrow(IntervalsRequestError);
  });
});
