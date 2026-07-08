# @bradyap/intervals-client

A TypeScript client foundation for the Intervals.icu API.

This package is currently project scaffolding only. It does not yet implement authentication,
HTTP transport, endpoint methods, response validation, pagination, retries, or API schemas.

## Requirements

- Node.js 24 or newer
- npm

## Development

Install dependencies:

```sh
npm install
```

Run the full local check:

```sh
npm run check
```

Useful individual commands:

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Use `npm run format` to apply Prettier formatting.

## Project Structure

- `src/index.ts`: public package entry point
- `test/`: Vitest tests
- `dist/`: generated build output

Generated output and local credentials are intentionally ignored by Git.
