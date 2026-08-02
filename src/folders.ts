import { z } from 'zod';

import type { ResourceRequester, ResourceVoidRequester } from './request.js';
import { resolveAthleteId, validateResourceId, withRequestErrorBoundary } from './resources.js';

const folderSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  activity_types: z.array(z.string()).nullable().optional(),
  canEdit: z.boolean().optional(),
  children: z.array(z.unknown()).nullable().optional(),
  description: z.string().nullable().optional(),
  name: z.string().optional(),
  num_workouts: z.number().nullable().optional(),
  read_only_workouts: z.boolean().optional(),
  shareToken: z.string().nullable().optional(),
  sharedWithCount: z.number().optional(),
  type: z.string().nullable().optional(),
  workout_targets: z.array(z.unknown()).nullable().optional(),
});
const foldersSchema = z.array(folderSchema);

export type WorkoutFolder = z.infer<typeof folderSchema>;
export type WorkoutFolderId = string | number;

export interface WorkoutFolderWriteInput {
  [field: string]: unknown;
  activity_types?: string[] | null;
  description?: string | null;
  name?: string | null;
  type?: string | null;
  workout_targets?: unknown[] | null;
}

export interface ListFoldersOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WriteFolderOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface FoldersResource {
  create(folder: WorkoutFolderWriteInput, options?: WriteFolderOptions): Promise<WorkoutFolder>;
  delete(folderId: WorkoutFolderId, options?: WriteFolderOptions): Promise<void>;
  list(options?: ListFoldersOptions): Promise<WorkoutFolder[]>;
  update(
    folderId: WorkoutFolderId,
    folder: WorkoutFolderWriteInput,
    options?: WriteFolderOptions,
  ): Promise<WorkoutFolder>;
}

export interface FoldersResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
  requestVoid: ResourceVoidRequester;
}

export class IntervalsFoldersResource implements FoldersResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;
  readonly #requestVoid: ResourceVoidRequester;

  constructor(options: FoldersResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
    this.#requestVoid = options.requestVoid;
  }

  async create(
    folder: WorkoutFolderWriteInput,
    options: WriteFolderOptions = {},
  ): Promise<WorkoutFolder> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'folders',
        ],
        method: 'POST',
        json: folder,
        signal: options.signal,
        parse: parseFolder,
        validationMessage: 'Intervals.icu response did not match the expected folder shape',
      }),
    );
  }

  async delete(folderId: WorkoutFolderId, options: WriteFolderOptions = {}): Promise<void> {
    return withRequestErrorBoundary(() =>
      this.#requestVoid({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'folders',
          validateResourceId('folderId', folderId),
        ],
        method: 'DELETE',
        signal: options.signal,
      }),
    );
  }

  async list(options: ListFoldersOptions = {}): Promise<WorkoutFolder[]> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'folders',
        ],
        signal: options.signal,
        parse: parseFolders,
        validationMessage: 'Intervals.icu response did not match the expected folders shape',
      }),
    );
  }

  async update(
    folderId: WorkoutFolderId,
    folder: WorkoutFolderWriteInput,
    options: WriteFolderOptions = {},
  ): Promise<WorkoutFolder> {
    return withRequestErrorBoundary(() =>
      this.#requestJson({
        pathSegments: [
          'athlete',
          resolveAthleteId(options.athleteId, this.#defaultAthleteId),
          'folders',
          validateResourceId('folderId', folderId),
        ],
        method: 'PUT',
        json: folder,
        signal: options.signal,
        parse: parseFolder,
        validationMessage: 'Intervals.icu response did not match the expected folder shape',
      }),
    );
  }
}

export function parseFolder(value: unknown): WorkoutFolder {
  return folderSchema.parse(value);
}

export function parseFolders(value: unknown): WorkoutFolder[] {
  return foldersSchema.parse(value);
}
