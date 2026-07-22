import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'intervals-client-package-smoke-'));
const npmCache = join(temporaryRoot, 'npm-cache');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const publicBuildModules = [
  'activities',
  'activity-files',
  'activity-streams',
  'athlete',
  'calendars',
  'client',
  'dates',
  'errors',
  'events',
  'folders',
  'index',
  'request',
  'resources',
  'sport-settings',
  'wellness',
  'workouts',
];

try {
  const artifactsDirectory = join(temporaryRoot, 'artifacts');
  const consumerDirectory = join(temporaryRoot, 'consumer');
  await mkdir(artifactsDirectory);
  await mkdir(consumerDirectory);

  const sourceManifest = await readJson(join(repositoryRoot, 'package.json'));
  assert.equal(sourceManifest.name, '@bradyap/intervals-client');
  assert.equal(sourceManifest.version, '0.9.0');
  assert.equal(sourceManifest.private, true);
  assert.equal(sourceManifest.license, 'MIT');
  assert.deepEqual(sourceManifest.files, ['dist']);
  assert.deepEqual(sourceManifest.engines, { node: '>=24.0.0' });
  assert.deepEqual(sourceManifest.dependencies, { zod: '4.4.3' });
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Node 24 or newer is required');

  const buildDirectory = join(repositoryRoot, 'dist');
  assert.ok(existsSync(buildDirectory), 'dist must be built before running the package smoke');
  const builtFiles = await listFiles(buildDirectory);
  const expectedBuiltFiles = publicBuildModules
    .flatMap((moduleName) => [`${moduleName}.d.ts`, `${moduleName}.js`])
    .sort();
  assert.deepEqual(builtFiles, expectedBuiltFiles, 'dist contains missing or stale build files');

  const clientPack = pack(repositoryRoot, artifactsDirectory);
  const packedPaths = clientPack.files.map(({ path }) => path).sort();
  const expectedPaths = [
    'LICENSE',
    'README.md',
    'package.json',
    ...builtFiles.map((path) => `dist/${path}`),
  ].sort();
  assert.deepEqual(packedPaths, expectedPaths, 'package contents differ from the public file set');
  assert.equal(clientPack.entryCount, expectedPaths.length);
  assert.ok(
    packedPaths.every(
      (path) =>
        path === 'LICENSE' ||
        path === 'README.md' ||
        path === 'package.json' ||
        path.startsWith('dist/'),
    ),
    'package contains a source, test, script, credential, or other unexpected file',
  );

  const installedZodManifest = await readJson(
    join(repositoryRoot, 'node_modules/zod/package.json'),
  );
  assert.equal(
    installedZodManifest.version,
    sourceManifest.dependencies.zod,
    'installed zod must match the exact production dependency',
  );
  const zodPack = pack(join(repositoryRoot, 'node_modules/zod'), artifactsDirectory);

  const clientTarball = join(artifactsDirectory, clientPack.filename);
  const zodTarball = join(artifactsDirectory, zodPack.filename);
  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'intervals-client-package-smoke-consumer',
        private: true,
        type: 'module',
        dependencies: {
          '@bradyap/intervals-client': `file:${clientTarball}`,
          zod: `file:${zodTarball}`,
        },
      },
      null,
      2,
    )}\n`,
  );

  runNpm(
    ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund', '--package-lock=false'],
    consumerDirectory,
  );
  assert.equal(existsSync(join(consumerDirectory, 'package-lock.json')), false);

  const installedPackageRoot = join(
    consumerDirectory,
    'node_modules',
    '@bradyap',
    'intervals-client',
  );
  const installedManifest = await readJson(join(installedPackageRoot, 'package.json'));
  assert.equal(installedManifest.name, sourceManifest.name);
  assert.equal(installedManifest.version, sourceManifest.version);
  assert.equal(installedManifest.private, true);
  assert.equal(installedManifest.license, 'MIT');
  assert.equal(
    await readFile(join(installedPackageRoot, 'LICENSE'), 'utf8'),
    await readFile(join(repositoryRoot, 'LICENSE'), 'utf8'),
  );

  const runtimePath = join(consumerDirectory, 'runtime.mjs');
  await writeFile(runtimePath, runtimeConsumerSource());
  run(process.execPath, [runtimePath], consumerDirectory);

  const typecheckPath = join(consumerDirectory, 'public-api.ts');
  const typecheckConfigPath = join(consumerDirectory, 'tsconfig.json');
  await writeFile(typecheckPath, typecheckConsumerSource());
  await writeFile(
    typecheckConfigPath,
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2024',
          lib: ['ES2024', 'DOM', 'DOM.Iterable'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          verbatimModuleSyntax: true,
        },
        files: ['./public-api.ts'],
      },
      null,
      2,
    )}\n`,
  );
  run(
    process.execPath,
    [join(repositoryRoot, 'node_modules/typescript/bin/tsc'), '-p', typecheckConfigPath],
    consumerDirectory,
  );

  console.log(
    `Package consumer smoke passed for ${clientPack.id}: ${String(clientPack.entryCount)} files, ${String(clientPack.size)} packed bytes, ${process.version}.`,
  );
  console.log(
    `Verified LICENSE, README.md, package.json, and ${String(builtFiles.length)} dist files.`,
  );
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

function pack(packageDirectory, destination) {
  const output = runNpm(
    ['pack', packageDirectory, '--json', '--ignore-scripts', '--pack-destination', destination],
    repositoryRoot,
  );
  const packs = JSON.parse(output);
  assert.ok(Array.isArray(packs));
  assert.equal(packs.length, 1);
  return packs[0];
}

function runNpm(arguments_, cwd) {
  return run(npmCommand, [...arguments_, '--cache', npmCache], cwd, {
    npm_config_update_notifier: 'false',
  });
}

function run(command, arguments_, cwd, extraEnvironment = {}) {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(' ')} failed with status ${String(result.status)}\n${result.stdout}${result.stderr}`,
    );
  }

  return result.stdout;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(join(directory, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath.split(sep).join('/'));
    } else {
      throw new Error(`Unexpected non-file build entry: ${relative(repositoryRoot, relativePath)}`);
    }
  }

  return files.sort();
}

function runtimeConsumerSource() {
  return `import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import {
  IntervalsAbortError,
  IntervalsClient,
  IntervalsConfigurationError,
  IntervalsError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsRequestError,
  IntervalsResponseError,
} from '@bradyap/intervals-client';

const apiKeyRequests = [];
const bearerRequests = [];
const apiKeyClient = new IntervalsClient({
  athleteId: '0',
  auth: { kind: 'apiKey', apiKey: '<unused>' },
  fetch: async (input, init) => {
    apiKeyRequests.push({ input, init });
    return new Response(JSON.stringify({ id: 'athlete-fixture' }));
  },
});
const bearerClient = new IntervalsClient({
  auth: { kind: 'bearer', accessToken: '<unused>' },
  fetch: async (input, init) => {
    bearerRequests.push({ input, init });
    return new Response(JSON.stringify({ id: 'athlete-fixture' }));
  },
});

await apiKeyClient.athlete.get();
await bearerClient.athlete.get();

assert.equal(apiKeyClient.athleteId, '0');
assert.equal(bearerClient.baseUrl, 'https://intervals.icu/api/v1');
assert.equal(apiKeyRequests.length, 1);
assert.equal(bearerRequests.length, 1);
assert.equal(
  new Headers(apiKeyRequests[0].init.headers).get('Authorization'),
  \`Basic \${Buffer.from('API_KEY:<unused>', 'utf8').toString('base64')}\`,
);
assert.equal(
  new Headers(bearerRequests[0].init.headers).get('Authorization'),
  'Bearer <unused>',
);
assert.ok(apiKeyClient.activities.streams);
assert.ok(apiKeyClient.athlete);
assert.ok(apiKeyClient.calendars);
assert.ok(apiKeyClient.events);
assert.ok(apiKeyClient.folders);
assert.ok(apiKeyClient.sportSettings);
assert.ok(apiKeyClient.wellness);
assert.ok(apiKeyClient.workouts);

const cause = new Error('consumer sentinel');
const errors = [
  new IntervalsError('base'),
  new IntervalsAbortError({ cause, method: 'GET', url: 'https://example.invalid' }),
  new IntervalsConfigurationError('configuration'),
  new IntervalsHttpError({
    body: '',
    headers: {},
    method: 'GET',
    status: 429,
    statusText: 'Too Many Requests',
    url: 'https://example.invalid',
  }),
  new IntervalsNetworkError({ cause, method: 'GET', url: 'https://example.invalid' }),
  new IntervalsRequestError('request'),
  new IntervalsResponseError({
    body: '',
    cause,
    message: 'response',
    url: 'https://example.invalid',
  }),
];
assert.ok(errors.every((error) => error instanceof IntervalsError));
`;
}

function typecheckConsumerSource() {
  return `import {
  IntervalsAbortError,
  IntervalsClient,
  IntervalsConfigurationError,
  IntervalsError,
  IntervalsHttpError,
  IntervalsNetworkError,
  IntervalsRequestError,
  IntervalsResponseError,
  type ActivityStreamWriteInput,
  type ActivityUpdateInput,
  type CalendarEventWriteInput,
  type IntervalsAuth,
  type IntervalsClientOptions,
  type WellnessWriteInput,
  type WorkoutWriteInput,
} from '@bradyap/intervals-client';

const auths = [
  { kind: 'apiKey', apiKey: '<unused>' },
  { kind: 'bearer', accessToken: '<unused>' },
] as const satisfies readonly IntervalsAuth[];
const options: IntervalsClientOptions = { auth: auths[0], athleteId: '0' };
const client = new IntervalsClient(options);
const signal = new AbortController().signal;

void client.athlete.get({ signal });
void client.activities.list({ oldest: '2026-01-01', newest: '2026-01-31', signal });
void client.activities.get('activity-id', { intervals: true, signal });
void client.activities.file.get('activity-id', { signal });
void client.activities.fitFile.get('activity-id', { signal });
void client.activities.streams.get('activity-id', { types: ['time', 'heartrate'], signal });
void client.calendars.list({ signal });
void client.events.list({
  oldest: '2026-01-01',
  newest: '2026-01-31',
  category: ['WORKOUT', 'RACE'],
  resolve: true,
  signal,
});
void client.folders.list({ signal });
void client.sportSettings.list({ signal });
void client.wellness.list({ oldest: '2026-01-01', newest: '2026-01-31', signal });
void client.workouts.list({ signal });

const activity: ActivityUpdateInput = { name: 'Example', API_extension: true };
const event: CalendarEventWriteInput = { name: 'Example', API_extension: true };
const stream: ActivityStreamWriteInput = { type: 'custom', data: [1], API_extension: true };
const wellness: WellnessWriteInput = { restingHR: 40, API_extension: true };
const workout: WorkoutWriteInput = { name: 'Example', API_extension: true };
void [activity, event, stream, wellness, workout];

const cause = new Error('consumer sentinel');
const errors: IntervalsError[] = [
  new IntervalsAbortError({ cause, method: 'GET', url: 'https://example.invalid' }),
  new IntervalsConfigurationError('configuration'),
  new IntervalsHttpError({
    body: '',
    headers: { 'x-ratelimit-remaining': '1' },
    method: 'GET',
    status: 429,
    statusText: 'Too Many Requests',
    url: 'https://example.invalid',
  }),
  new IntervalsNetworkError({ cause, method: 'GET', url: 'https://example.invalid' }),
  new IntervalsRequestError('request'),
  new IntervalsResponseError({
    body: '',
    cause,
    message: 'response',
    url: 'https://example.invalid',
  }),
];
void errors;
`;
}
