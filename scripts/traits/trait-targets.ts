/**
 * What a study's effect size comes to between the third of people leaning
 * most toward an option and the third leaning least: the one conversion the
 * calibration script sets weights by and the matrix shows beside each
 * decision's measured rates. The study's effect per standard deviation is
 * carried to thirds: the top and bottom thirds of a normal trait sit about
 * 2.18 standard deviations apart (means of +1.09 and -1.09).
 */

export interface ResearchRow {
  id: string;
  option?: string;
  baseRate?: number;
  effect: { kind: string; value: number; traitSd?: number } | null;
  /** A pp-per-sd row's outcome is a probability of the option (not a level). */
  outcomeIsProbability?: boolean;
}

/** Thirds apart, in standard deviations of a normal trait. */
export const THIRDS_APART = 2.18;
/** A normal trait's interquartile range is 1.35 standard deviations. */
const IQR_IN_SD = 1.35;
/** Logit change of a probability swing centered on a half. */
const swingLogit = (swing: number) => {
  const p0 = Math.min(0.999, Math.max(0.001, 0.5 - swing / 2)),
    p1 = Math.min(0.999, Math.max(0.001, 0.5 + swing / 2));
  return Math.log(p1 / (1 - p1)) - Math.log(p0 / (1 - p0));
};
/** Logistic scale: a latent shift of one standard deviation is pi over root 3 logits. */
const LOGIT_PER_SD = Math.PI / Math.sqrt(3);

/** A research row whose size cannot be read as odds: it says why and gives none. */
function refuse(row: ResearchRow, why: string): null {
  console.warn(`${row.id}: ${row.effect!.kind} row ${why}; no target`);
  return null;
}

/** The study's log odds ratio between the top and bottom thirds. */
export function targetLogOdds(row: ResearchRow): number | null {
  const e = row.effect;
  if (!e) return null;
  switch (e.kind) {
    case "odds-ratio-per-sd":
      return Math.log(e.value) * THIRDS_APART;
    // A trait scored over its full range converts with its own standard
    // deviation, as a share of that range, from the study's own table.
    case "logit-coef-full-range":
      return e.traitSd === undefined
        ? refuse(row, "gives no trait standard deviation")
        : e.value * e.traitSd * THIRDS_APART;
    case "pp-full-range":
      return e.traitSd === undefined
        ? refuse(row, "gives no trait standard deviation")
        : swingLogit(e.value) * e.traitSd * THIRDS_APART;
    case "pp-per-iqr":
      return (swingLogit(e.value) / IQR_IN_SD) * THIRDS_APART;
    case "correlation":
    case "multiple-R":
    case "standardized-beta":
      return (
        ((LOGIT_PER_SD * e.value) / Math.sqrt(1 - e.value ** 2)) * THIRDS_APART
      );
    case "pp-per-sd": {
      if (!row.outcomeIsProbability)
        return refuse(row, "measures a level, not a probability of the option");
      const p0 = row.baseRate ?? 0.5;
      const p1 = Math.min(0.999, Math.max(0.001, p0 + e.value / 100));
      return (Math.log(p1 / (1 - p1)) - Math.log(p0 / (1 - p0))) * THIRDS_APART;
    }
    default:
      return null;
  }
}

/** One row per decision: the study with the largest effect names the decisive trait. */
export function strongestRows(
  rows: readonly ResearchRow[],
): Map<string, ResearchRow> {
  const strongest = new Map<string, ResearchRow>();
  for (const row of rows) {
    if (row.id.startsWith("outcome.")) continue;
    const prior = strongest.get(row.id);
    const size = Math.abs(targetLogOdds(row) ?? 0);
    if (!prior || size > Math.abs(targetLogOdds(prior) ?? 0))
      strongest.set(row.id, row);
  }
  return strongest;
}
