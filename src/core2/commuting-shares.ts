/**
 * How many of a place's residents work in it, and how many of the jobs in it
 * are held by people who live elsewhere, from the Census LEHD LODES8
 * origin-destination files (`scripts/source/lodes-commuting.py`). A place the
 * files do not cover (a territory village, a place with no recorded jobs)
 * starts from the national average, marked ESTIMATED, never unknown.
 */
import commuting from "../../data/source/lodes-commuting/place-commuting.json" with { type: "json" };

export interface CommutingShares {
  /** Jobs held by residents of the place (those who live there and work anywhere). */
  readonly residentJobs: number;
  /** Of those, the share whose job is in the place itself. */
  readonly liveWorkShare: number;
  /** Jobs in the place (held by residents or by people who live elsewhere). */
  readonly jobsHere: number;
  /** Of those, the share held by people who live outside the place. */
  readonly workInShare: number;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly citation: string;
}

const table = commuting.places as Record<string, readonly number[]>;
const average = commuting.nationalAverage;

/** The commuting shares for a place key (a 7-digit state and place code). */
export function commutingSharesOf(placeKey: string): CommutingShares {
  const row = table[placeKey];
  if (row) {
    const [liveWork = 0, liveOut = 0, workIn = 0] = row;
    const residentJobs = liveWork + liveOut,
      jobsHere = liveWork + workIn;
    if (residentJobs > 0 && jobsHere > 0)
      return {
        residentJobs,
        liveWorkShare: liveWork / residentJobs,
        jobsHere,
        workInShare: workIn / jobsHere,
        tag: "SOURCED",
        citation: commuting.source.citation,
      };
  }
  return {
    residentJobs: 0,
    liveWorkShare: average.liveWorkShareOfResidents,
    jobsHere: 0,
    workInShare: average.workInShareOfJobs,
    tag: "ESTIMATED",
    citation: `${commuting.source.citation}; ${average.citation}`,
  };
}
