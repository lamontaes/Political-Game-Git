import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { lawEffectStamp, type LawEffectStamp } from "../law-effect-stamp";
import type { IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import type { PublicBudgetGovernment } from "./store";
import { TUITION_FREEZE_QUESTION, tuitionFreezeFactor } from "./tuition-freeze";

/** Attribute the saved revenue consequence to laws that actually froze school years. */
export function tuitionFreezeRevenueStamps(
  world: World,
  government: PublicBudgetGovernment,
  month: IsoDate,
  savedChargesAndFees: number,
): readonly LawEffectStamp[] {
  if (
    government.level !== "state" ||
    savedChargesAndFees <= 0 ||
    tuitionFreezeFactor(world, government, month) >= 1
  )
    return [];
  const propositionId = propositionIdFor(world, TUITION_FREEZE_QUESTION);
  if (!propositionId) return [];
  const years = (world.history.legislativeEnactments ?? [])
    .filter((row) => row.outcome === "enacted" && row.resolvedAt <= month)
    .map((row) => Number(row.resolvedAt.slice(0, 4)));
  if (!years.length) return [];
  const stamps = new Map<string, LawEffectStamp>();
  for (
    let year = Math.min(...years);
    year <= Number(month.slice(0, 4));
    year++
  ) {
    const setOn = makeIsoDate(`${year}-07-01`);
    if (setOn > month) break;
    const law = lawInForce(
      world,
      government.lawJurisdictionId,
      propositionId,
      setOn,
    );
    if (law?.origin !== "enacted" || law.answer !== "yes") continue;
    const stamp = lawEffectStamp(law, {
      effectKind: "tuition-freeze-revenue",
      questionKey: TUITION_FREEZE_QUESTION,
      jurisdictionId: government.lawJurisdictionId,
      appliedAt: month,
      sourceRecordIds: [government.lawJurisdictionId],
    });
    if (stamp) stamps.set(stamp.governingLawKey, stamp);
  }
  return [...stamps.values()];
}
