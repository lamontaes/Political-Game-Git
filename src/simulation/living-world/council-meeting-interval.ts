import intervals from "../../../data/research/local-government/council-meeting-intervals.json" with { type: "json" };

export type CouncilBodyType = keyof typeof intervals.medianIntervalDays;

export interface CouncilMeetingInterval {
  readonly days: number;
  readonly bandId: string;
  /** Always the band median until a place's own recorded schedule is read. */
  readonly basis: "ESTIMATED FROM AVERAGE";
}

/**
 * Days between regular meetings for a body of this type in a place of this
 * population: the median of its type and size band, from
 * data/research/local-government/council-meeting-intervals.json. No place is
 * named and nothing is drawn at random.
 */
export function councilMeetingInterval(
  bodyType: CouncilBodyType,
  population: number,
): CouncilMeetingInterval {
  const bands = intervals.bands;
  let band = bands[0];
  for (const candidate of bands) {
    if (population >= candidate.minPopulation) band = candidate;
  }
  const row = intervals.medianIntervalDays[bodyType] as Record<string, number>;
  return {
    days: row[band.id],
    bandId: band.id,
    basis: "ESTIMATED FROM AVERAGE",
  };
}
