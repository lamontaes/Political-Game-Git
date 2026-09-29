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
 * The game knows a man is in a same-sex couple only through a recorded,
 * active partnership with another man; that is how the study found them too
 * (couples in the Census). A man hired where neither his state's law nor his
 * town's ordinance covers him is paid his job's rate less the gap; where one
 * does, the full rate. The rate is set when he is hired, so a new law or a
 * repeal changes the pay of later hires, not of people already in the job.
 * Women, and anyone the record gives no gender, are paid the job's rate.
 */

export const FAIRNESS_STATE_QUESTION =
  "us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work";
export const FAIRNESS_CITY_QUESTION =
  "us-policy-positions:civil-family-community.city-nondiscrimination-ordinance";

/** Burn (2018): the pay gain such a law brings, as a share of pay. */
export const FAIRNESS_LAW_PAY_GAIN = 0.027;

/** The pay of a covered man hired where no law covers him, as a share of the job's rate. */
export const UNCOVERED_PAY_SHARE = 1 / (1 + FAIRNESS_LAW_PAY_GAIN);

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
): ReadonlySet<EntityId> {
  const latest = new Map<
    EntityId,
    { at: IsoDate; seq: number; active: boolean }
  >();
  for (const state of world.history.partnershipStates ?? []) {
    if (state.effectiveAt > date) continue;
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
  for (const partnership of world.history.partnerships ?? []) {
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
  if (
    state &&
    stateQuestion &&
    lawInForce(world, state.id, stateQuestion, date)?.answer === "yes"
  )
    return true;
  const cityQuestion = propositionId(world, FAIRNESS_CITY_QUESTION);
  return (
    cityQuestion !== null &&
    jobJurisdictionId !== state?.id &&
    lawInForce(world, jobJurisdictionId, cityQuestion, date)?.answer === "yes"
  );
}
