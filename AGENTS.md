# Repository Guidelines

## Project Structure & Module Organization

This repository is a lightweight TypeScript client for basic Intervals.icu API usage. Keep client source under `src/`, public exports in `src/index.ts`, tests under `test/` or beside modules as `*.test.ts`, and generated build output under `dist/`. Keep examples, if added, in `examples/` and avoid committing local credentials or generated dependency folders.

## Build, Test, and Development Commands

- `npm install`: install project dependencies.
- `npm run build`: compile the TypeScript client to `dist/`.
- `npm run typecheck`: run strict TypeScript checks without emitting files.
- `npm test`: run the full test suite.
- `npm run lint`: check static style issues.
- `npm run format:check`: check Prettier formatting.
- `npm run check`: run type-checking, linting, format checks, tests, and build.

Document any new commands in `README.md` when they become required for local development.

## Coding Style & Naming Conventions

Use TypeScript with 2-space indentation, `camelCase` for internal variables and functions, `PascalCase` for types/classes, and descriptive file names such as `activities.ts`. Preserve Intervals.icu request and response field names exactly, including snake, camel, or Pascal casing; do not add a field-name translation layer. Keep response schemas loose so unknown API fields survive parsing, and validate only stable response structure and identifiers. Prefer direct resource composition over inheritance or generic endpoint frameworks. Prettier is the formatting source of truth, and ESLint is the static style check.

## Testing Guidelines

Vitest is configured for tests and must be runnable via `npm test`. Name tests after the behavior under test, for example `activities.test.ts`. Keep tests minimal: test shared authentication, transport, and error behavior centrally, then add one focused contract test for each resource method and extra tests only for real branching or validation. Mock external HTTP calls; automated tests must not require live Intervals.icu credentials.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:`. Prefix branch names similarly, for example `feat/activity-upload` or `fix/activity-response-schema`. Pull requests should include a concise description and testing notes. Keep the README intentionally minimal and update it only for critical installation or usage changes.

## Security & Configuration Tips

Never commit API keys, tokens, or local `.env` files. Personal API-key authentication is the supported authentication mode; OAuth is out of scope until a real consumer requires it. Optional live smoke tests may read `INTERVALS_API_KEY` from a local `.env`, must not print credentials or private response data, and must clean up any created records in `finally`. Do not add retries, pagination abstractions, broad input validation, or new endpoint families without a demonstrated consumer need.
