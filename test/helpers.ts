import { vi } from 'vitest';

export function getRequestedUrl(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
  callIndex = 0,
): URL {
  const fetchCall = fetchMock.mock.calls.at(callIndex);

  if (!fetchCall) {
    throw new Error(`fetch call ${String(callIndex)} was not made`);
  }

  const requestedUrl = fetchCall[0];

  if (requestedUrl instanceof Request) {
    return new URL(requestedUrl.url);
  }

  return new URL(requestedUrl);
}
