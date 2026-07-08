import { describe, expect, it } from 'vitest';

import { intervalsClientVersion } from '../src/index.js';

describe('intervalsClientVersion', () => {
  it('exports the package version placeholder', () => {
    expect(intervalsClientVersion).toBe('0.1.0');
  });
});
