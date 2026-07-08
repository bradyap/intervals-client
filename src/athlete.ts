import { z } from 'zod';

const athleteProfileSchema = z.looseObject({
  id: z.string(),
  name: z.string().optional(),
});

export type AthleteProfile = z.infer<typeof athleteProfileSchema>;

export function parseAthleteProfile(value: unknown): AthleteProfile {
  return athleteProfileSchema.parse(value);
}
