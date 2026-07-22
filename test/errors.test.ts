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
        headers: Object.freeze({}),
        method: 'GET',
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

  it('normalizes and protects HTTP header metadata at construction', () => {
    const sourceHeaders: Record<string, string> = {
      ['__proto__']: 'reserved',
      Authorization: 'Bearer response-secret',
      'Set-Cookie': 'session=response-secret',
      'X-Custom': 'original',
      'X-RateLimit-Limit': '50',
    };
    const error = new IntervalsHttpError({
      body: '',
      headers: sourceHeaders,
      method: 'POST',
      status: 429,
      statusText: 'Too Many Requests',
      url: 'https://example.test',
    });

    sourceHeaders['X-Custom'] = 'changed';
    expect(error.headers).toEqual({
      ['__proto__']: 'reserved',
      'x-custom': 'original',
      'x-ratelimit-limit': '50',
    });
    expect(error.rateLimitLimit).toBe('50');
    expect(error.rateLimitRemaining).toBeUndefined();
    expect(error.rateLimitReset).toBeUndefined();
    expect(JSON.stringify(error)).not.toContain('response-secret');
    expect(Reflect.deleteProperty(error, 'headers')).toBe(false);
    expect(() => {
      (error as { headers: Record<string, string> }).headers = {};
    }).toThrow(TypeError);
  });
});
