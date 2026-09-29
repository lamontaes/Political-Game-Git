/**
 * What a national data privacy law costs the businesses it covers, from the
 * day it takes effect until a repeal does.
 *
 * ESTIMATED FROM AVERAGE (Claude CTO, September 29, 2026: "wire it with the
 * European size, 0.1% to 0.6% firm cost, marked ESTIMATED with its source
 * and a spread"): compliance under Europe's General Data Protection
 * Regulation cost a firm between 0.1% and 0.6% of its production costs
 * (Demirer, Jimenez Hernandez, Li and Peng 2024, NBER Working Paper 32146,
 * from Research 1's federal table of September 29, 2026). Each world draws its own size within that range, once, stable for
 * the whole game, the same way the outcome web draws a link's size. Replace
 * it when the filed research on American business costs returns. The state
 * enforcement side of the same kind of law is `SPENDING_QUESTION_EFFECTS`.
 */
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { SeededRng } from "./rng";
import type { EntityId, IsoDate, World } from "./types";

export const NATIONAL_DATA_PRIVACY_QUESTION =
  "us-federal-positions:science-communications.national-data-privacy";

/** The range, as a share of a business's yearly costs. */
export const DATA_PRIVACY_COST_RANGE = [0.001, 0.006] as const;

export interface DataPrivacyCost {
  /** The share of a business's yearly costs the law adds; 0 where none. */
  readonly share: number;
  readonly lawMeasureIds: readonly EntityId[];
}

/** This world's size within the range: the middle is likelier than the ends. */
export function drawnDataPrivacyCostShare(world: World): number {
  const [low, high] = DATA_PRIVACY_COST_RANGE;
  if (!world.seed) return (low + high) / 2;
  const rng = new SeededRng(world.seed).fork(
    "federal-data-privacy-law:firm-cost",
  );
  return low + (high - low) * ((rng.next() + rng.next()) / 2);
}

/** The cost a national law in force on `asOf` puts on every business. */
export function dataPrivacyCostOn(
  world: World,
  asOf: IsoDate,
): DataPrivacyCost {
  const none = { share: 0, lawMeasureIds: [] };
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === NATIONAL_DATA_PRIVACY_QUESTION,
  );
  if (!proposition) return none;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    asOf,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted" || law.answer !== "yes") return none;
  return {
    share: drawnDataPrivacyCostShare(world),
    lawMeasureIds: [law.measureId],
  };
}
