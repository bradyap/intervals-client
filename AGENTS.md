# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript client foundation for the Intervals.icu API. Keep client source under `src/`, public exports in `src/index.ts`, tests under `test/` or beside modules as `*.test.ts`, and generated build output under `dist/`. Keep examples, if added, in `examples/` and avoid committing local credentials or generated dependency folders.

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

Use TypeScript for client code. Prefer 2-space indentation, `camelCase` for variables and functions, `PascalCase` for types/classes, and descriptive file names such as `activities.ts` or `intervals-client.ts`. Keep API boundary types explicit, especially request parameters and response objects. Prettier is the formatting source of truth, and ESLint is the static style check.

## Testing Guidelines

Vitest is configured for tests and must be runnable via `npm test`. Name tests after the behavior under test, for example `activities.test.ts`. Prefer focused unit tests for request building, authentication headers, pagination, error handling, and response parsing. Mock external HTTP calls; tests should not require live Intervals.icu credentials.

## Commit & Pull Request Guidelines

Git history currently only shows `Init repo`, so no project-specific commit convention is established. Use short, imperative commit messages such as `Add activities client` or `Document authentication setup`. Pull requests should include a concise description, testing notes, and links to relevant issues. For user-visible API changes, include a small usage example or README update.

## Security & Configuration Tips

Never commit API keys, tokens, or local `.env` files. If examples or integration tests eventually need credentials, read them from environment variables supplied by the consuming application or local developer environment.
