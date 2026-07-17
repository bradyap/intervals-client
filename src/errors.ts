export class IntervalsHttpError extends Error {
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

export class IntervalsRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntervalsRequestError';
  }
}

export class IntervalsResponseError extends Error {
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
