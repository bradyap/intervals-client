export class IntervalsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IntervalsError';
  }
}

export class IntervalsAbortError extends IntervalsError {
  readonly method: string;
  readonly url: string;

  constructor(options: { cause: unknown; method: string; url: string }) {
    super('Intervals.icu request was aborted', { cause: options.cause });
    this.name = 'IntervalsAbortError';
    this.method = options.method;
    this.url = options.url;
  }
}

export class IntervalsConfigurationError extends IntervalsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IntervalsConfigurationError';
  }
}

export class IntervalsNetworkError extends IntervalsError {
  readonly method: string;
  readonly url: string;

  constructor(options: { cause: unknown; method: string; url: string }) {
    super('Intervals.icu network request failed', { cause: options.cause });
    this.name = 'IntervalsNetworkError';
    this.method = options.method;
    this.url = options.url;
  }
}

export class IntervalsHttpError extends IntervalsError {
  readonly body: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly method: string;
  readonly rateLimitLimit?: string;
  readonly rateLimitRemaining?: string;
  readonly rateLimitReset?: string;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  constructor(options: {
    body: string;
    headers: Readonly<Record<string, string | undefined>>;
    method: string;
    status: number;
    statusText: string;
    url: string;
  }) {
    super(
      `Intervals.icu request failed with ${String(options.status)} ${options.statusText}`.trim(),
    );
    this.name = 'IntervalsHttpError';
    this.body = options.body;
    Object.defineProperty(this, 'body', { enumerable: false });
    this.headers = normalizeHeaders(options.headers);
    Object.defineProperty(this, 'headers', { configurable: false, writable: false });
    this.method = options.method;
    this.rateLimitLimit = this.headers['x-ratelimit-limit'];
    this.rateLimitRemaining = this.headers['x-ratelimit-remaining'];
    this.rateLimitReset = this.headers['x-ratelimit-reset'];
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
  }
}

function normalizeHeaders(
  headers: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  const normalized = Object.fromEntries(
    Object.entries(headers)
      .filter(
        (entry): entry is [string, string] =>
          entry[1] !== undefined && !sensitiveHeaderNames.has(entry[0].toLowerCase()),
      )
      .map(([name, value]) => [name.toLowerCase(), value]),
  );

  return Object.freeze(normalized);
}

const sensitiveHeaderNames = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
  'set-cookie2',
  'x-api-key',
  'x-auth-token',
]);

export class IntervalsRequestError extends IntervalsError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IntervalsRequestError';
  }
}

export class IntervalsResponseError extends IntervalsError {
  readonly body: string;
  readonly url: string;

  constructor(options: { body: string; cause: unknown; message: string; url: string }) {
    super(options.message, { cause: options.cause });
    this.name = 'IntervalsResponseError';
    this.body = options.body;
    Object.defineProperty(this, 'body', { enumerable: false });
    this.url = options.url;
  }
}
