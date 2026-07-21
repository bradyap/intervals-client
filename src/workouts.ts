import { z } from 'zod';

import type { ResourceRequester } from './request.js';
import { resolveAthleteId, validateResourceId } from './resources.js';

const resourceIdSchema = z.union([z.string(), z.number()]);
const workoutSchema = z.looseObject({
  id: resourceIdSchema,
  day: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  folder_id: resourceIdSchema.nullable().optional(),
  icu_training_load: z.number().nullable().optional(),
  moving_time: z.number().nullable().optional(),
  name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  workout_doc: z.looseObject({}).nullable().optional(),
});
const workoutsSchema = z.array(workoutSchema);
const deletedWorkoutIdsSchema = z.array(z.number());

export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutId = string | number;

export interface WorkoutWriteInput {
  [field: string]: unknown;
  day?: number | null;
  description?: string | null;
  folder_id?: string | number | null;
  name?: string | null;
  type?: string | null;
  workout_doc?: Record<string, unknown> | null;
}

export interface GetWorkoutOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface ListWorkoutsOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WriteWorkoutOptions {
  athleteId?: string;
  signal?: AbortSignal;
}

export interface WorkoutsResource {
  create(workout: WorkoutWriteInput, options?: WriteWorkoutOptions): Promise<Workout>;
  delete(workoutId: WorkoutId, options?: WriteWorkoutOptions): Promise<number[]>;
  get(workoutId: WorkoutId, options?: GetWorkoutOptions): Promise<Workout>;
  list(options?: ListWorkoutsOptions): Promise<Workout[]>;
  update(
    workoutId: WorkoutId,
    workout: WorkoutWriteInput,
    options?: WriteWorkoutOptions,
  ): Promise<Workout>;
}

export interface WorkoutsResourceOptions {
  defaultAthleteId: string;
  requestJson: ResourceRequester;
}

export class IntervalsWorkoutsResource implements WorkoutsResource {
  readonly #defaultAthleteId: string;
  readonly #requestJson: ResourceRequester;

  constructor(options: WorkoutsResourceOptions) {
    this.#defaultAthleteId = options.defaultAthleteId;
    this.#requestJson = options.requestJson;
  }

  async create(workout: WorkoutWriteInput, options: WriteWorkoutOptions = {}): Promise<Workout> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'workouts',
      ],
      method: 'POST',
      json: workout,
      signal: options.signal,
      parse: parseWorkout,
      validationMessage: 'Intervals.icu response did not match the expected workout shape',
    });
  }

  async delete(workoutId: WorkoutId, options: WriteWorkoutOptions = {}): Promise<number[]> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'workouts',
        validateResourceId('workoutId', workoutId),
      ],
      method: 'DELETE',
      signal: options.signal,
      parse: parseDeletedWorkoutIds,
      validationMessage: 'Intervals.icu response did not match the expected workout ids shape',
    });
  }

  async get(workoutId: WorkoutId, options: GetWorkoutOptions = {}): Promise<Workout> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'workouts',
        validateResourceId('workoutId', workoutId),
      ],
      signal: options.signal,
      parse: parseWorkout,
      validationMessage: 'Intervals.icu response did not match the expected workout shape',
    });
  }

  async list(options: ListWorkoutsOptions = {}): Promise<Workout[]> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'workouts',
      ],
      signal: options.signal,
      parse: parseWorkouts,
      validationMessage: 'Intervals.icu response did not match the expected workouts shape',
    });
  }

  async update(
    workoutId: WorkoutId,
    workout: WorkoutWriteInput,
    options: WriteWorkoutOptions = {},
  ): Promise<Workout> {
    return this.#requestJson({
      pathSegments: [
        'athlete',
        resolveAthleteId(options.athleteId, this.#defaultAthleteId),
        'workouts',
        validateResourceId('workoutId', workoutId),
      ],
      method: 'PUT',
      json: workout,
      signal: options.signal,
      parse: parseWorkout,
      validationMessage: 'Intervals.icu response did not match the expected workout shape',
    });
  }
}

export function parseWorkout(value: unknown): Workout {
  return workoutSchema.parse(value);
}

export function parseWorkouts(value: unknown): Workout[] {
  return workoutsSchema.parse(value);
}

export function parseDeletedWorkoutIds(value: unknown): number[] {
  return deletedWorkoutIdsSchema.parse(value);
}
