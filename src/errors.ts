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
  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  constructor(options: { body: string; status: number; statusText: string; url: string }) {
    super(
      `Intervals.icu request failed with ${String(options.status)} ${options.statusText}`.trim(),
    );
    this.name = 'IntervalsHttpError';
    this.body = options.body;
    Object.defineProperty(this, 'body', { enumerable: false });
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
  }
}

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
