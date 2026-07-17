import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { resolveAthleteId } from './resources.js';

const folderSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  activity_types: z.array(z.string()).nullable().optional(),
  canEdit: z.boolean().optional(),
  children: z.array(z.unknown()).optional(),
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

export interface ListFoldersOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface FoldersResource {
  list(options?: ListFoldersOptions): Promise<WorkoutFolder[]>;
}

export interface FoldersResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsFoldersResource implements FoldersResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: FoldersResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async list(options: ListFoldersOptions = {}): Promise<WorkoutFolder[]> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'folders',
      ],
      signal: options.signal,
      parse: parseFolders,
      validationMessage: 'Intervals.icu response did not match the expected folders shape',
    });
  }
}

export function parseFolders(value: unknown): WorkoutFolder[] {
  return foldersSchema.parse(value);
}
