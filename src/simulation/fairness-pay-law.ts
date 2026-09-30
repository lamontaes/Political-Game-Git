import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { personGender } from "./person-identity";
import type { EntityId, IsoDate, World } from "./types";

/** Law coverage and recorded partnership are facts, not a wage multiplier.
 * Aggregate research about a law's average effect cannot decide what a
 * particular employer offers a person. Hiring preserves the recorded role
 * rate until an employer-specific decision supplies different earned terms.
 */

export const FAIRNESS_STATE_QUESTION =
  "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work";
export const FAIRNESS_CITY_QUESTION =
  "us-policy-positions:civil-family-community.city-nondiscrimination-ordinance";

const SEXUAL_ORIENTATION = "sexual-orientation";

const STARTING_ROWS = (
  startingLaw.questions as unknown as Readonly<
    Record<
      string,
      {
        readonly answers: Readonly<
          Record<string, { readonly grounds?: readonly string[] }>
        >;
      }
    >
  >
)[FAIRNESS_STATE_QUESTION]?.answers;

function propositionId(world: World, stableKey: string): EntityId | null {
  const row = Object.values(world.policyCatalog?.propositions ?? {}).find(
    (entry) => entry.stableKey === stableKey,
  );
  return row?.id ?? null;
}

/** Everyone whose active partner on `date` shares their recorded gender "male". */
export function menPartneredWithMen(
  world: World,
  date: IsoDate,
  only?: EntityId,
): ReadonlySet<EntityId> {
  const partnerships = (world.history.partnerships ?? []).filter(
    (row) => only === undefined || row.personIds.includes(only),
  );
  const ids = new Set(partnerships.map((row) => row.id));
  const latest = new Map<
    EntityId,
    { at: IsoDate; seq: number; active: boolean }
  >();
  for (const state of world.history.partnershipStates ?? []) {
    if (state.effectiveAt > date || !ids.has(state.partnershipId)) continue;
    const seen = latest.get(state.partnershipId);
    if (
      !seen ||
      state.effectiveAt > seen.at ||
      (state.effectiveAt === seen.at && state.sequence > seen.seq)
    )
      latest.set(state.partnershipId, {
        at: state.effectiveAt,
        seq: state.sequence,
        active: state.status === "active",
      });
  }
  const men = new Set<EntityId>();
  for (const partnership of partnerships) {
    if (partnership.startedAt > date) continue;
    if (!latest.get(partnership.id)?.active) continue;
    const [a, b] = partnership.personIds;
    if (
      personGender(world.people[a]) === "male" &&
      personGender(world.people[b]) === "male"
    ) {
      men.add(a);
      men.add(b);
    }
  }
  return men;
}

/**
 * Whether a law in force where the job is covers a man partnered with a man:
 * the state's (or territory's) law, or the town's own ordinance.
 */
export function fairnessLawCovers(
  world: World,
  jobJurisdictionId: EntityId | null,
  date: IsoDate,
): boolean {
  if (!jobJurisdictionId) return false;
  const place = lifePlaceByJurisdictionId(jobJurisdictionId);
  const state = place?.stateJurisdictionKey
    ? stateJurisdictionForKey(place.stateJurisdictionKey)
    : null;
  const stateQuestion = propositionId(world, FAIRNESS_STATE_QUESTION);
  const law =
    state && stateQuestion
      ? lawInForce(world, state.id, stateQuestion, date)
      : null;
  if (law?.answer === "yes") return true;
  if (
    law?.origin === "in-force-at-start" &&
    place?.stateJurisdictionKey &&
    STARTING_ROWS?.[place.stateJurisdictionKey]?.grounds?.includes(
      SEXUAL_ORIENTATION,
    )
  )
    return true;
  const cityQuestion = propositionId(world, FAIRNESS_CITY_QUESTION);
  return (
    cityQuestion !== null &&
    jobJurisdictionId !== state?.id &&
    lawInForce(world, jobJurisdictionId, cityQuestion, date)?.answer === "yes"
  );
}

/** Retained for callers' existing optional provenance suffix. The blanket
 * penalty is retired, so this helper never supplies a below-rate suffix. */
export const UNCOVERED_PAY_NOTE = "";

/** Preserve the offered role rate. Legal wage floors remain in the existing
 * hire producers; partnership and absent protection do not author a wage cut.
 * Existing saved terms and already-earned pay are never rewritten here. */
export function payAtHire(
  _world: World,
  input: {
    readonly personId: EntityId;
    readonly jobJurisdictionId: EntityId | null;
    readonly date: IsoDate;
    readonly amountMinor: number;
    readonly floorMinor: number;
  },
): { readonly amountMinor: number; readonly belowRate: boolean } {
  return { amountMinor: input.amountMinor, belowRate: false };
}
