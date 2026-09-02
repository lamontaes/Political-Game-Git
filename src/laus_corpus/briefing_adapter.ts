/**
 * Dynamic Briefing Screen Adapter for BLS LAUS Unemployment Corpus
 *
 * Epistemic projection layer: Formats published LAUS facts into dynamic, structured
 * briefing card models for UI rendering without baking text into static art assets.
 */

import { getAreaByCode } from "./query.js";
import { reconcilePeriodGroup } from "./reconciliation.js";
import type {
  LausBriefingCard,
  LausCompiledCorpus,
  LausObservation,
  SeasonalAdjustment,
} from "./types.js";

/**
 * Builds a dynamic briefing card for a given geography, year, and period.
 */
export function buildBriefingCard(
  corpus: LausCompiledCorpus,
  areaCode: string,
  year: number,
  period: string,
  seasonal: SeasonalAdjustment = "U",
): LausBriefingCard {
  const area = getAreaByCode(corpus, areaCode);
  const areaName = area ? area.areaText : areaCode;

  const relevantObs = corpus.observations.filter(
    (o: LausObservation) =>
      o.areaCode === areaCode &&
      o.year === year &&
      o.period === period &&
      o.seasonal === seasonal,
  );

  const recon = reconcilePeriodGroup(
    areaCode,
    year,
    period,
    seasonal,
    relevantObs,
  );

  const rateObs = relevantObs.find((o: LausObservation) => o.measureCode === "03");
  const lfObs = relevantObs.find((o: LausObservation) => o.measureCode === "06");
  const empObs = relevantObs.find((o: LausObservation) => o.measureCode === "05");
  const unempObs = relevantObs.find((o: LausObservation) => o.measureCode === "04");

  const seasonalText = seasonal === "S" ? "Seasonally Adjusted" : "Not Seasonally Adjusted";
  const periodLabel = rateObs ? `${rateObs.periodName} ${year}` : `${period} ${year}`;

  let unemploymentRateText = "N/A";
  let statusText = "FINAL";

  if (rateObs) {
    if (rateObs.status === "MISSING") {
      unemploymentRateText = "Data Missing";
      statusText = "MISSING";
    } else if (rateObs.status === "SUPPRESSED") {
      unemploymentRateText = "Data Suppressed";
      statusText = "SUPPRESSED";
    } else if (rateObs.value !== null) {
      unemploymentRateText = `${rateObs.value.toFixed(1)}%`;
      statusText = rateObs.status;
    }
  }

  const formatCount = (obs?: LausObservation) => {
    if (!obs) return "N/A";
    if (obs.status === "MISSING") return "Missing";
    if (obs.status === "SUPPRESSED") return "Suppressed";
    if (obs.value === null) return "N/A";
    return obs.value.toLocaleString("en-US");
  };

  const laborForceText = formatCount(lfObs);
  const employmentText = formatCount(empObs);
  const unemploymentText = formatCount(unempObs);

  const reconciliationNote = recon.isReconciled
    ? "Verified: Labor force, employment, and rate math are consistent with official BLS methodology."
    : recon.discrepancyNote || "Reconciliation check flagged rounding or data variations.";

  const provenanceDisclaimer = `Source: U.S. Bureau of Labor Statistics (BLS) LAUS Corpus (Vintage: ${corpus.manifest.blsReleaseVintage}). Fact-based economic observation for dynamic briefing display.`;

  return {
    headline: `${areaName} Unemployment Briefing`,
    areaName,
    areaCode,
    periodLabel,
    unemploymentRateText,
    laborForceText,
    employmentText,
    unemploymentText,
    seasonalAdjustmentText: seasonalText,
    statusText,
    reconciliationNote,
    provenanceDisclaimer,
  };
}
