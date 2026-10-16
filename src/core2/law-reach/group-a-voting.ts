/**
 * Law reach, group A: election and office laws the voting and elections
 * engines read. Each is a pure reading of the law in force today and the
 * voter's or officeholder's own record:
 *
 * - `electionLawTurnoutCost`: what the town's election laws add to (or take
 *   off) a voter's cost of turning out, in the voting engine's own units.
 *   Photo ID adds a cost that grows as the voter's scheduled work falls
 *   (people outside work less often carry a current ID); automatic
 *   registration takes off the cost of registering; same-day registration
 *   takes off more for the young, less with age; all-mail voting takes off
 *   part of the work-time cost of getting to the polls.
 * - `felonyDisenfranchisedShare`: the share of the counted adults who can't
 *   vote for a felony conviction in the town's state, less those a restoration
 *   law returns; `barredFromVoting` for a named person.
 * - `termLimitReached` and `lobbyingBarredUntil`: an officeholder's limits.
 */
import type { CoreAPI, CoreState, PersonState } from "../types";
import felonyData from "../data/elections/felony-disenfranchisement.json" with { type: "json" };
import { electionsParameter } from "../elections-calendar";
import { corePlaceByKey } from "../place-lookup";
import { campaignParameter } from "../campaign-views";
import { OFFICES_MODULE_ID, type TermRow } from "../modules/offices";
import { convictionsOf, sentenceUnfinished } from "../modules/justice";
import type { PolicyHandler } from "./host";
import {
  ageOn,
  applyRecords,
  reachParameter,
  selectorGroup,
  yesLevels,
} from "./group-a-records";

const P = "us-policy-positions:";
export const PHOTO_ID = `${P}government-operations.require-photo-id-to-vote`;
export const AUTO_REGISTRATION = `${P}government-operations.automatic-voter-registration`;
export const SAME_DAY = `${P}government-operations.same-day-voter-registration`;
export const ALL_MAIL = `${P}government-operations.all-mail-voting`;
export const RESTORE_VOTE = `${P}justice-public-safety.restore-voting-after-sentence`;
export const TERM_LIMITS = `${P}government-operations.legislative-term-limits`;
export const LOBBYING_BAN = `${P}government-operations.ban-lobbying-after-office`;

const ELECTION_KEYS = [PHOTO_ID, AUTO_REGISTRATION, SAME_DAY, ALL_MAIL];

/** Which election laws are in force, cached for the day (cleared when one changes). */
const cache = new WeakMap<object, { date: string; keys: Set<string> }>();
function electionLaws(api: CoreAPI): ReadonlySet<string> {
  const hit = cache.get(api.state);
  if (hit && hit.date === api.state.date) return hit.keys;
  // A world without the laws engine has no election laws in force.
  if (!api.state.modules.has("core2-laws-v1")) return new Set();
  const keys = new Set(
    [...ELECTION_KEYS, RESTORE_VOTE, TERM_LIMITS, LOBBYING_BAN].filter(
      (key) => yesLevels(api, key).length > 0,
    ),
  );
  cache.set(api.state, { date: api.state.date, keys });
  return keys;
}

export const votingLaw: PolicyHandler = (api, change) => {
  cache.delete(api.state);
  applyRecords(api, change.key, change.lawId, change.inForce);
};

/**
 * What the election laws in force add to one voter's turnout cost (negative
 * where they lower it). For the voting engine's `turnout()`.
 */
export function electionLawTurnoutCost(
  api: CoreAPI,
  voter: Readonly<
    Pick<PersonState, "id" | "traits"> & { readonly birthDate?: string }
  >,
  weeklyWorkMinutes: number,
): number {
  const laws = electionLaws(api);
  if (!laws.size) return 0;
  const workShare = Math.min(
    1,
    Math.max(
      0,
      weeklyWorkMinutes / campaignParameter("turnoutWorkWeekMinutes"),
    ),
  );
  let cost = 0;
  if (laws.has(PHOTO_ID))
    cost +=
      reachParameter("photoIdBaseCost") +
      reachParameter("photoIdNoWorkCost") * (1 - workShare);
  if (laws.has(AUTO_REGISTRATION))
    cost -= reachParameter("automaticRegistrationRelief");
  if (laws.has(SAME_DAY)) {
    const birthDate =
      voter.birthDate ?? api.state.people.get(voter.id)?.birthDate;
    const years = birthDate
      ? ageOn(birthDate, api.state.date) - reachParameter("adultAge")
      : 0;
    cost -=
      reachParameter("sameDayRegistrationRelief") *
      Math.max(
        0,
        1 -
          Math.max(0, years) /
            reachParameter("sameDayRegistrationAgeSpanYears"),
      );
  }
  if (laws.has(ALL_MAIL))
    cost -= reachParameter("mailVotingWorkRelief") * workShare;
  return cost;
}

/**
 * The share of the counted adults who can't vote for a felony conviction:
 * the town's state's own share (The Sentencing Project, Locked Out 2024,
 * `data/elections/felony-disenfranchisement.json`), less the part a
 * restoration law in force returns to the rolls (those who have finished
 * their sentences). D.C. and the territories, which the report leaves out,
 * take the national share until conviction records exist
 * (SG-GOV-REACH-A-convictions).
 */
export function felonyDisenfranchisedShare(api: CoreAPI): number {
  const stateKey = corePlaceByKey(
    String(api.state.placeMetadata.placeKey ?? ""),
  )?.stateJurisdictionKey;
  const shares = felonyData.states as Record<string, number>;
  const own = stateKey ? shares[stateKey] : undefined;
  if (own === undefined) {
    // stopgapId: SG-GOV-REACH-A-convictions
    api.stopgap("SG-GOV-REACH-A-convictions");
  }
  const base = own ?? felonyData.nationalShare;
  return electionLaws(api).has(RESTORE_VOTE)
    ? base * (1 - electionsParameter("restoredFractionOfDisenfranchised"))
    : base;
}

/**
 * Whether a named person's own record bars them from voting: a felony
 * conviction on the justice record. Where the state's law in force restores
 * the vote after the sentence (`RESTORE_VOTE`), they are barred only until
 * their sentence is served; where it does not, a conviction bars them for
 * good. Counted adults carry the state's share of the same rule
 * (`felonyDisenfranchisedShare`). The justice engine's cases are all
 * felony-grade, so any conviction on record counts.
 */
export function barredFromVoting(api: CoreAPI, personId: string): boolean {
  if (!convictionsOf(api, personId).length) return false;
  return (
    !electionLaws(api).has(RESTORE_VOTE) || sentenceUnfinished(api, personId)
  );
}

function termsOf(api: CoreAPI, personId: string): readonly TermRow[] {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return [];
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byPerson", [personId]) as unknown as TermRow[];
}

const yearsBetween = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) /
  (reachParameter("daysPerYear") * 86_400_000);

/**
 * Whether a term limit in force bars this person from another term in a
 * legislative office: their years in it have reached the limit. For the
 * elections engine's filing check.
 */
export function termLimitReached(
  api: CoreAPI,
  personId: string,
  officeId: string,
): boolean {
  if (!electionLaws(api).has(TERM_LIMITS)) return false;
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as { kind?: string } | undefined;
  const legislative = selectorGroup("legislators").some((k) =>
    (office?.kind ?? "").startsWith(k),
  );
  if (!legislative) return false;
  const date = api.state.date;
  const years = termsOf(api, personId)
    .filter((t) => t.officeId === officeId && t.startDate <= date)
    .reduce((sum, t) => {
      const end = t.endDate && t.endDate < date ? t.endDate : date;
      return sum + yearsBetween(t.startDate, end);
    }, 0);
  return years >= reachParameter("termLimitYears");
}

/**
 * The date until which a former officeholder may not lobby, under a ban in
 * force (null when none applies). For the interest-groups engine's choice
 * of a lobbyist.
 */
export function lobbyingBarredUntil(
  api: CoreAPI,
  personId: string,
): string | null {
  if (!electionLaws(api).has(LOBBYING_BAN)) return null;
  const ended = termsOf(api, personId)
    // A term that ended in re-election isn't leaving office.
    .filter(
      (t) => t.status === "ended" && t.endDate && t.endedBy !== "re-elected",
    )
    .map((t) => t.endDate!)
    .sort()
    .pop();
  if (!ended) return null;
  const until = new Date(Date.parse(`${ended}T00:00:00Z`));
  until.setUTCFullYear(
    until.getUTCFullYear() + reachParameter("lobbyingCoolingOffYears"),
  );
  const date = until.toISOString().slice(0, 10);
  return date > (api.state as CoreState).date ? date : null;
}
