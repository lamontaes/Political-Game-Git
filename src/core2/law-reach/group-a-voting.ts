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
import {
  PHOTO_ID,
  AUTO_REGISTRATION,
  SAME_DAY,
  ALL_MAIL,
  RESTORE_VOTE,
  REDISTRICTING,
  TERM_LIMITS,
  LOBBYING_BAN,
} from "./voting-keys";
export {
  PHOTO_ID,
  AUTO_REGISTRATION,
  SAME_DAY,
  ALL_MAIL,
  RESTORE_VOTE,
  REDISTRICTING,
  TERM_LIMITS,
  LOBBYING_BAN,
} from "./voting-keys";
import type { CoreAPI, CoreState, PersonState, Source } from "../types";
import felonyData from "../data/elections/felony-disenfranchisement.json" with { type: "json" };
import { electionsParameter } from "../elections-calendar";
import { corePlaceByKey } from "../place-lookup";
import { campaignParameter } from "../campaign-views";
import { incarceratedMayVote } from "../justice-law";
import { OFFICES_MODULE_ID, type TermRow } from "../modules/offices";
import { ELECTIONS_MODULE_ID } from "../modules/elections";
import {
  convictionsOf,
  inCustody,
  sentenceUnfinished,
} from "../modules/justice";
import type { PolicyHandler } from "./host";
import { lawApplied, lawNoLongerApplies } from "./applied";
import {
  BUDGETS_MODULE_ID,
  governments,
  registerMonthlyProgram,
  type GovernmentRow,
} from "../modules/budgets";
import { chargeLine } from "../budgets-treasury";
import { electorateRoll, type RollVoter } from "../modules/voting";
import { onReachCalendar } from "./reach-workers";
import {
  ageOn,
  applyRecords,
  ensureReachA,
  mechanicRow,
  putMechanic,
  REACH_A_MODULE_ID,
  reachParameter,
  selectorGroup,
  tomorrow,
  yesLevels,
} from "./group-a-records";

const ELECTION_KEYS = [PHOTO_ID, AUTO_REGISTRATION, SAME_DAY, ALL_MAIL];

/**
 * Which laws are in force today, each read from the laws table the first
 * time an engine asks about it, so the read is the asking engine's (cached
 * for the day; cleared when one changes).
 */
interface LawsToday {
  readonly date: string;
  readonly keys: Map<string, boolean>;
  election?: Set<string>;
  contests?: Map<string, string | null>;
}
const cache = new WeakMap<object, LawsToday>();
function today(api: CoreAPI): LawsToday {
  const hit = cache.get(api.state);
  if (hit && hit.date === api.state.date) return hit;
  const fresh: LawsToday = {
    date: api.state.date,
    keys: new Map<string, boolean>(),
  };
  cache.set(api.state, fresh);
  return fresh;
}
function inForce(api: CoreAPI, key: string): boolean {
  // A world without the laws engine has no laws in force.
  if (!api.state.modules.has("core2-laws-v1")) return false;
  const hit = today(api);
  let yes = hit.keys.get(key);
  if (yes === undefined) {
    yes = yesLevels(api, key).length > 0;
    hit.keys.set(key, yes);
  }
  return yes;
}
/** The election laws that change a voter's cost of turning out, in force today. */
function electionLaws(api: CoreAPI): ReadonlySet<string> {
  const hit = today(api);
  hit.election ??= new Set(ELECTION_KEYS.filter((key) => inForce(api, key)));
  return hit.election;
}

/**
 * An election law changes: the registration roll is brought up to it the
 * same day (who is registered or must show an ID, now), and a repeal ends
 * the engine's rows (host.ts). The term-limit and lobbying laws are applied
 * where a filing or a lobbyist is chosen.
 */
export const votingLaw: PolicyHandler = (api, change) => {
  cache.delete(api.state);
  if (!ELECTION_KEYS.includes(change.key)) {
    applyRecords(api, change.key, change.lawId, change.inForce);
    return;
  }
  if (!change.inForce || !api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  applyElectionLaws(
    api,
    change.opening ? "opening" : "registration",
    electorateRoll(api),
    null,
    [change.key],
  );
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
  const parts = electionLawParts(api, laws, voter, weeklyWorkMinutes);
  return parts.photoId + parts.automatic + parts.sameDay + parts.allMail;
}

/** Each election law's signed turnout cost for one voter (zero where not in force). */
function electionLawParts(
  api: CoreAPI,
  laws: ReadonlySet<string>,
  voter: Readonly<
    Pick<PersonState, "id" | "traits"> & { readonly birthDate?: string }
  >,
  weeklyWorkMinutes: number,
) {
  const workShare = Math.min(
    1,
    Math.max(
      0,
      weeklyWorkMinutes / campaignParameter("turnoutWorkWeekMinutes"),
    ),
  );
  const parts = { photoId: 0, automatic: 0, sameDay: 0, allMail: 0 };
  if (laws.has(PHOTO_ID))
    parts.photoId =
      reachParameter("photoIdBaseCost") +
      reachParameter("photoIdNoWorkCost") * (1 - workShare);
  if (laws.has(AUTO_REGISTRATION))
    parts.automatic = -reachParameter("automaticRegistrationRelief");
  if (laws.has(SAME_DAY)) {
    const birthDate =
      voter.birthDate ?? api.state.people.get(voter.id)?.birthDate;
    const years = birthDate
      ? ageOn(birthDate, api.state.date) - reachParameter("adultAge")
      : 0;
    parts.sameDay = -(
      reachParameter("sameDayRegistrationRelief") * sameDayWeight(years)
    );
  }
  if (laws.has(ALL_MAIL))
    parts.allMail = -(reachParameter("mailVotingWorkRelief") * workShare);
  return parts;
}

/** How much of the same-day registration gain a voter this many years past 18 has (1 at 18, 0 past the span). */
function sameDayWeight(yearsPast18: number): number {
  return Math.max(
    0,
    1 -
      Math.max(0, yearsPast18) /
        reachParameter("sameDayRegistrationAgeSpanYears"),
  );
}

// --- the laws applied to the roll, and what they cost -------------------------

const ELECTION_ENGINE = "core2-voting-v1";
/** The budget line the cost of running elections is paid from. */
const ELECTION_LINE = "administration";
/** Levels in the order the government that runs the town's elections is looked for. */
const ADMINISTRATOR_LEVELS = ["county", "city", "state"] as const;

/**
 * When the roll is brought up to the election laws: the day one changes, an
 * election day, or the opening, when the laws already in force are applied
 * to the roll at no cost (those registrations and IDs predate the game).
 */
type Moment = "registration" | "vote" | "opening";

interface LawSpec {
  readonly key: string;
  readonly what: string;
  /** The cost parameter, paid at `paidAt` (the other moment only records). */
  readonly cost: string;
  readonly paidAt: Moment;
  /** How much of the unit cost one voter incurs, 0 to 1 (a sliding scale). */
  readonly share: (
    api: CoreAPI,
    voter: RollVoter,
    laws: ReadonlySet<string>,
  ) => number;
}

const SPECS: readonly LawSpec[] = [
  {
    key: PHOTO_ID,
    what: "photo-id-required",
    cost: "photoIdIssueCostMinor",
    paidAt: "registration",
    // The ID the state issues free to a voter without one: the likelier the
    // less they work, the same sliding scale as the cost of turning out.
    share: (api, v, laws) => {
      const parts = electionLawParts(api, laws, v, v.weeklyMinutes);
      const top =
        reachParameter("photoIdBaseCost") + reachParameter("photoIdNoWorkCost");
      return top > 0 ? parts.photoId / top : 0;
    },
  },
  {
    key: AUTO_REGISTRATION,
    what: "registered-automatically",
    cost: "automaticRegistrationCostMinor",
    paidAt: "registration",
    share: () => 1,
  },
  {
    key: SAME_DAY,
    what: "registers-at-polls",
    cost: "sameDayRegistrationCostMinor",
    paidAt: "vote",
    share: (api, v) =>
      sameDayWeight(
        ageOn(v.birthDate, api.state.date) - reachParameter("adultAge"),
      ),
  },
  {
    key: ALL_MAIL,
    what: "mailed-ballot",
    cost: "mailBallotCostMinor",
    paidAt: "vote",
    share: () => 1,
  },
];

/** The government that runs the town's elections: the lowest-level county, city or state treasury in the game. */
function administrator(api: CoreAPI) {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const govs = governments(api);
  for (const level of ADMINISTRATOR_LEVELS) {
    const gov = govs.find((g) => g.level === level);
    if (gov) return gov;
  }
  return null;
}

const OWED_KIND = "election-cost-owed";

/**
 * Pay what the election costs out of the administering treasury's line. A
 * treasury short of cash pays what it holds; the rest is owed and paid as
 * cash arrives, day by day, until it is paid, even after a repeal.
 */
function payElectionCost(
  api: CoreAPI,
  gov: GovernmentRow,
  spec: LawSpec,
  amountMinor: number,
  contestId: string | null,
  lawId: string,
): number {
  const paid = settleElection(
    api,
    gov,
    spec.key,
    spec.what,
    spec.cost,
    amountMinor,
    `${contestId ?? api.state.date}`,
  );
  const owed = Math.floor(amountMinor - paid);
  if (owed >= 1) {
    ensureReachA(api);
    const id = `${OWED_KIND}:${spec.key}:${gov.id}`;
    const held = mechanicRow(api, id);
    putMechanic(api, {
      id,
      key: spec.key,
      active: true,
      since: held?.active ? held.since : api.state.date,
      facts: {
        owedMinor: Math.floor(Number(held?.facts.owedMinor ?? 0)) + owed,
        what: spec.what,
        cost: spec.cost,
        governmentId: gov.id,
        lawId,
      },
    });
    scheduleOwed(api, id);
  }
  return paid;
}

function scheduleOwed(api: CoreAPI, id: string): void {
  const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
  const date = tomorrow(api.state.date);
  const key = `${OWED_KIND}:${id}:${date}`;
  if (!calendar.get(key))
    calendar.schedule({
      key,
      date,
      kind: OWED_KIND,
      source: {
        tag: "ESTIMATED",
        citation: "Election costs owed by a treasury short of cash",
        asOf: api.state.date,
        estimatedFrom: "data/laws/reach-group-a-parameters.json",
      },
      sourceRecordIds: [id],
    });
}

function settleElection(
  api: CoreAPI,
  gov: GovernmentRow,
  key: string,
  what: string,
  cost: string,
  amountMinor: number,
  day: string,
): number {
  return chargeLine(api, gov, {
    id: `election-admin:${key}:${gov.id}:${day}`,
    line: ELECTION_LINE,
    amountMinor,
    reasonKey: `election-administration:${what}`,
    source: {
      tag: "ESTIMATED",
      citation: `Election administration cost of ${key} (data/laws/reach-group-a-parameters.json ${cost})`,
      asOf: api.state.date,
      estimatedFrom: `data/laws/reach-group-a-parameters.json ${cost}`,
    },
  });
}

onReachCalendar(OWED_KIND, (api, work) => {
  const id = work.sourceRecordIds[0]!;
  const row = mechanicRow(api, id);
  if (!row?.active) return;
  const key = row.key;
  const gov = governments(api).find((g) => g.id === row.facts.governmentId);
  // A repeal stops new charges, not a cost already incurred: the debt is paid
  // whether or not the law is still in force.
  if (!gov) {
    putMechanic(api, { ...row, active: false });
    return;
  }
  const owed = Number(row.facts.owedMinor);
  const paid = settleElection(
    api,
    gov,
    key,
    String(row.facts.what),
    String(row.facts.cost),
    owed,
    `owed:${api.state.date}`,
  );
  // After a repeal the payment settles the old cost; the law's ended rows stay ended.
  if (paid > 0 && inForce(api, key))
    lawApplied(api, {
      key,
      lawId: String(row.facts.lawId),
      targetId: gov.id,
      target: "government",
      engine: ELECTION_ENGINE,
      what: "election-cost-paid",
      amountMinor: paid,
    });
  const left = owed - paid;
  putMechanic(api, {
    ...row,
    active: left >= 1,
    facts: { ...row.facts, owedMinor: left },
  });
  if (left >= 1) scheduleOwed(api, id);
});

/**
 * Who each election law has already been paid for today, by law and moment:
 * a voter (or the people a counted group stands for) on the rolls of several
 * contests that share one ballot is served once that day, and a second change
 * to the same law on one day processes no one twice.
 */
const charged = new WeakMap<
  object,
  { date: string; served: Map<string, Map<string, number>> }
>();

/**
 * Apply the election laws in force to the roll, at registration (the day a
 * law changes) or at the vote (an election day): each voter, named or
 * counted, gets a row naming the law and what it did to them (a counted group
 * stands for its people), and the government that runs the election pays its
 * cost out of its administration line (ID issuance and registration
 * processing when the roll is brought up to the law; ballots mailed and
 * registrations taken at the polls on election day). `only` limits it to
 * laws that just changed.
 */
export function applyElectionLaws(
  api: CoreAPI,
  moment: Moment,
  roll: readonly RollVoter[],
  contestId: string | null,
  only?: readonly string[],
): void {
  const laws = electionLaws(api);
  if (!laws.size || !roll.length) return;
  const gov = administrator(api);
  for (const spec of SPECS) {
    if (!laws.has(spec.key) || (only && !only.includes(spec.key))) continue;
    const lawId = yesLevels(api, spec.key)[0]?.lawId;
    if (!lawId) continue;
    // Each voter is paid for once a day per law and moment: the contests on
    // one ballot share its mailing and its registrations at the polls, and a
    // second change to the same law on one day processes no one again.
    let today = charged.get(api.state);
    if (!today || today.date !== api.state.date) {
      today = { date: api.state.date, served: new Map() };
      charged.set(api.state, today);
    }
    const servedKey = `${spec.key}:${moment}`;
    const served = today.served.get(servedKey) ?? new Map<string, number>();
    today.served.set(servedKey, served);
    const unit = spec.paidAt === moment ? reachParameter(spec.cost) : 0;
    const planned = roll.map((v) => {
      const before = served.get(v.id) ?? 0;
      served.set(v.id, Math.max(before, v.count));
      return unit * spec.share(api, v, laws) * Math.max(0, v.count - before);
    });
    const plannedTotal = planned.reduce((a, b) => a + b, 0);
    // The treasury pays what it holds and owes the rest (payElectionCost), so
    // each voter's row carries what the law cost to serve them, funded or owed.
    if (gov && plannedTotal >= 1)
      payElectionCost(api, gov, spec, plannedTotal, contestId, lawId);
    roll.forEach((v, i) => {
      lawApplied(api, {
        key: spec.key,
        lawId,
        targetId: v.id,
        target: v.target,
        engine: ELECTION_ENGINE,
        what: spec.what,
        count: Math.max(1, Math.round(v.count)),
        amountMinor: planned[i]!,
      });
    });
  }
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
  return inForce(api, RESTORE_VOTE)
    ? base * (1 - electionsParameter("restoredFractionOfDisenfranchised"))
    : base;
}

/**
 * Whether a named person's own record bars them from voting. Maine,
 * Vermont, the District of Columbia and Puerto Rico let people vote from
 * prison (`incarceratedMayVote`) and never bar anyone. Elsewhere a person
 * serving a prison term is barred, and after it a felony conviction on the
 * justice record bars them until the sentence is served where the state's law
 * in force restores the vote (`RESTORE_VOTE`), and for good where it does
 * not. Counted adults carry the state's share of the same rule
 * (`felonyDisenfranchisedShare`). The justice engine's cases are all
 * felony-grade, so any conviction on record counts.
 */
export function barredFromVoting(api: CoreAPI, personId: string): boolean {
  const stateKey = corePlaceByKey(
    String(api.state.placeMetadata.placeKey ?? ""),
  )?.stateJurisdictionKey;
  if (incarceratedMayVote(api, stateKey ?? "").may) return false;
  if (inCustody(api, personId)) return true;
  if (!convictionsOf(api, personId).length) return false;
  return !inForce(api, RESTORE_VOTE) || sentenceUnfinished(api, personId);
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
  if (!inForce(api, TERM_LIMITS)) return false;
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
 * A person files for a legislative office under a term limit in force: the
 * elections engine counted their years against it, and the limit kept them
 * off the ballot or let them on. Called where the filing is decided, never
 * where a screen previews eligibility.
 */
export function recordTermLimitFiling(
  api: CoreAPI,
  personId: string,
  officeId: string,
): void {
  if (!inForce(api, TERM_LIMITS)) return;
  const lawId = yesLevels(api, TERM_LIMITS)[0]?.lawId;
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as { kind?: string } | undefined;
  const legislative = selectorGroup("legislators").some((k) =>
    (office?.kind ?? "").startsWith(k),
  );
  if (!lawId || !legislative) return;
  lawApplied(api, {
    key: TERM_LIMITS,
    lawId,
    targetId: personId,
    target: "person",
    engine: "core2-elections-v1",
    what: termLimitReached(api, personId, officeId)
      ? "kept-off-ballot"
      : "term-count-checked",
  });
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
  if (!inForce(api, LOBBYING_BAN)) return null;
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
  const barred = date > (api.state as CoreState).date;
  const lawId = yesLevels(api, LOBBYING_BAN)[0]?.lawId;
  if (lawId) {
    if (barred)
      lawApplied(api, {
        key: LOBBYING_BAN,
        lawId,
        targetId: personId,
        target: "person",
        engine: "core2-interest-groups-v1",
        what: "barred-from-lobbying",
      });
    else lawNoLongerApplies(api, LOBBYING_BAN, personId);
  }
  return barred ? date : null;
}

/**
 * A revolving-door law in force lowers what a legislative seat is worth to
 * someone who does not hold it: on leaving it they could not lobby for a time
 * (Fisman, Leder-Luis, O'Donnell and Vannutelli 2025 find about 18% fewer new
 * candidates enter where one passes). For the candidacy chooser: the law row
 * that applies to this contest's office, or null. Cached for the day.
 */
export function revolvingDoorFor(
  api: CoreAPI,
  contestId: string,
): string | null {
  const hit = today(api);
  const key = `revolving-door|${contestId}`;
  if (hit.contests?.has(key)) return hit.contests.get(key)!;
  hit.contests ??= new Map();
  let lawId: string | null = null;
  if (
    inForce(api, LOBBYING_BAN) &&
    api.state.modules.has(ELECTIONS_MODULE_ID) &&
    api.state.modules.has(OFFICES_MODULE_ID)
  ) {
    const contest = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(contestId) as { officeId?: string } | undefined;
    const office = contest?.officeId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(contest.officeId) as { kind?: string } | undefined)
      : undefined;
    const legislative = selectorGroup("legislators").some((k) =>
      (office?.kind ?? "").startsWith(k),
    );
    if (legislative) lawId = yesLevels(api, LOBBYING_BAN)[0]?.lawId ?? null;
  }
  hit.contests.set(key, lawId);
  return lawId;
}

/**
 * A month of the state's independent redistricting commission, paid at the
 * treasury's monthly close while the state's law is in force: the
 * commissioners' pay and the commission's work, out of the state's
 * administration line to those it pays outside the town (Mich. Const. art.
 * IV, sec. 6(5): appropriated each year the commission operates). The state
 * government is the law's reach. Paid by the budgets engine's monthly close.
 */
function payRedistrictingCommission(api: CoreAPI, source: Source): void {
  if (!api.state.modules.has("core2-laws-v1")) return;
  const law = yesLevels(api, REDISTRICTING).find((l) => l.level === "state");
  if (!law) return;
  const gov = governments(api).find((g) => g.level === "state");
  if (!gov) return;
  const amountMinor = Math.round(
    (reachParameter("redistrictingCommissionYearPerResidentMinor") *
      gov.residents) /
      reachParameter("monthsPerYear"),
  );
  const paid = chargeLine(api, gov, {
    id: `redistricting-commission:${REDISTRICTING}:${gov.id}:${api.state.date}`,
    line: ELECTION_LINE,
    amountMinor,
    reasonKey: "redistricting-commission",
    source,
  });
  lawApplied(api, {
    key: REDISTRICTING,
    lawId: law.lawId,
    targetId: gov.id,
    target: "government",
    engine: BUDGETS_MODULE_ID,
    what: "redistricting-commission-funded",
    amountMinor: -paid,
  });
}
registerMonthlyProgram(payRedistrictingCommission);

/**
 * The town's ward lines were drawn (the districts engine's only line-drawing
 * step): where independent redistricting is law, a commission draws them to
 * equal population, and the government whose wards they are is the law's
 * reach.
 */
export function recordRedistricting(api: CoreAPI, wards: number): void {
  const lawId = yesLevels(api, REDISTRICTING)[0]?.lawId;
  const gov = api.state.modules.has(BUDGETS_MODULE_ID)
    ? governments(api).find((g) => g.level === "city")
    : undefined;
  if (!lawId || !gov) return;
  // stopgapId: SG-GOV-REACH-A-redistricting
  api.stopgap("SG-GOV-REACH-A-redistricting");
  lawApplied(api, {
    key: REDISTRICTING,
    lawId,
    targetId: gov.id,
    target: "government",
    engine: ELECTION_ENGINE,
    what: "ward-lines-drawn-by-commission",
    count: wards,
  });
}
