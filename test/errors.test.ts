import { describe, expect, it } from 'vitest';

import {
  IntervalsAbortError,
  IntervalsConfigurationError,
  IntervalsError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsRequestError,
  IntervalsResponseError,
} from '../src/index.js';

describe('Intervals errors', () => {
  it('exposes a common base error with distinct failure classes', () => {
    const cause = new Error('native failure');
    const errors = [
      new IntervalsAbortError({ cause, method: 'GET', url: 'https://example.test' }),
      new IntervalsConfigurationError('invalid configuration', { cause }),
      new IntervalsHttpError({
        body: '',
        status: 500,
        statusText: '',
        url: 'https://example.test',
      }),
      new IntervalsNetworkError({ cause, method: 'GET', url: 'https://example.test' }),
      new IntervalsRequestError('invalid request', { cause }),
      new IntervalsResponseError({
        body: '',
        cause,
        message: 'invalid response',
        url: 'https://example.test',
      }),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(IntervalsError);
      expect(error).toBeInstanceOf(Error);
    }

    expect(errors.map((error) => error.name)).toEqual([
      'IntervalsAbortError',
      'IntervalsConfigurationError',
      'IntervalsHttpError',
      'IntervalsNetworkError',
      'IntervalsRequestError',
      'IntervalsResponseError',
    ]);
    expect(errors[0]).not.toBeInstanceOf(IntervalsNetworkError);
    expect(errors[3]).not.toBeInstanceOf(IntervalsAbortError);
    expect(errors[0]?.cause).toBe(cause);
    expect(errors[1]?.cause).toBe(cause);
    expect(errors[3]?.cause).toBe(cause);
    expect(errors[4]?.cause).toBe(cause);
    expect(errors[5]?.cause).toBe(cause);
  });
});
