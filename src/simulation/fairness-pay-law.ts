import startingLaw from "../../data/research/laws/starting-law-2026/index";
import { lawInForce } from "./governing/law-in-force";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import { personGender } from "./person-identity";
import type { EntityId, IsoDate, World } from "./types";

/**
 * WHAT A FAIRNESS LAW DOES TO PAY. A state law, or a town's own ordinance,
 * that bars discrimination by sexual orientation in employment closes part of
 * the pay gap for men whose partner is a man: Burn (2018, Journal of Labor
 * Research) found such state laws raised their hourly pay 2.7%, with no gain
 * for women in same-sex couples (Delhommer and Vamossy find the same pattern
 * for state and local laws).
 *
 * That population estimate checks totals; it does not set an individual
 * employer's offer. A recorded partnership and absence of legal protection
 * supply no evidence that this employer offered a lower wage. Initial pay
 * therefore preserves the actual job offer. The existing legal coverage
 * query remains available to the employer's nondiscrimination rule reader.
 *
 * The state question's "yes" means the law names both sexual orientation and
 * gender identity. A place whose starting law names sexual orientation only
 * (its row lists `grounds`) already covers these men, until a law enacted in
 * play answers the question.
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

/** Compatibility for existing callers; no inferred discount is recorded. */
export const UNCOVERED_PAY_NOTE = "";

/**
 * Preserve the recorded job offer. Neither relationship identity nor the
 * absence of a law writes an employer decision or lowers that offer. Legal
 * wage floors are read and applied by the existing common payroll writer.
 */
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
