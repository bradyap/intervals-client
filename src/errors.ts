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
    this.status = options.status;
    this.statusText = options.statusText;
    this.url = options.url;
  }
}
