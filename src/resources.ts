export function resolveAthleteId(athleteId: string | undefined, defaultAthleteId: string): string {
  const trimmedAthleteId = athleteId?.trim();

  return trimmedAthleteId && trimmedAthleteId.length > 0 ? trimmedAthleteId : defaultAthleteId;
}
