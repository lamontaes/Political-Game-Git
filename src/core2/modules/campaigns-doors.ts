/**
 * Doors and impressions: walking the doors, what a visit leaves behind, and the counted residents' door warmth.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { residentsRuntime } from "./residents";
import { fillInPerson } from "../state";
import { keepsWhy } from "../why-kept";
import { leanedScore } from "../trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { logistic } from "../kernel/deterministic-math";
import { OPENING_CARRY } from "../turnout";
import { groupAgreement, personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { agreementWith, countedStanceProfile } from "./views";
import { groupQuartersProfileOf } from "../gov-rules/place-population";
import type { GroupQuartersType } from "../group-quarters-types";
import { emitMessage } from "./campaigns-ads";
import {
  CANVASS_MESSAGE_KIND,
  ageOn,
  campaignFor,
  clamp,
  impressionOf,
  pledgesOf,
  save,
  table,
  townRow,
} from "./campaigns-base";
import type {
  CampaignAct,
  CampaignRow,
  CauseRow,
  PledgeRow,
} from "./campaigns-base";
import { askToSign, petitionAsksAtDoors } from "./campaigns-petitions";
import { atWork } from "./campaigns-work";

/**
 * What a door visit told a counted resident in person, for their answer:
 * they have now heard the candidate and the platform (what they make of it
 * from their own record) and how the visit went. A full person's visit is
 * kept on their impression instead, which the ballot reads.
 */
export interface DoorVisit {
  readonly candidateId: string;
  readonly agreement: number;
  readonly warmth: number;
}

/**
 * Who a voter would vote for in a contest today, by the ballot's own appeal
 * rule (their earlier word at a door included, and a counted resident's visit
 * just now), or null for nobody or a voter who can't vote in it; undefined
 * where the world counts no ballots. The voting engine registers it when it
 * opens (it reads this module, so this module cannot import it).
 */
type DoorChoice = (
  api: CoreAPI,
  voterId: string,
  contestId: string,
  visit?: DoorVisit,
) => string | null | undefined;
let doorChoice: DoorChoice | null = null;
export function registerDoorChoice(choice: DoorChoice): void {
  doorChoice = choice;
}

/**
 * The answer to a campaign's ask for a vote at the door: a "yes" when the
 * candidate is the one the resident would vote for now, kept as their word
 * (and in place of any earlier word to a rival in the race). A no at a later
 * knock leaves an earlier yes as it was: a word given is near-binding, and
 * only something heavy changes it (owner, Oct 29: a scandal they learned of,
 * a rival they are close to, a broken promise), which the ballot reads from
 * records (`pledgeDoubt`), or a yes they give a rival who now outweighs it.
 */
function answerAtDoor(
  api: CoreAPI,
  campaign: CampaignRow,
  voterId: string,
  canvasserId: string,
  warmth: number,
  causeId: string | null,
  visit?: DoorVisit,
): void {
  const id = `${voterId}|${campaign.contestId}|${campaign.candidateId}`;
  const pledges = table(api, "pledges");
  // "You've got my vote" is said to the candidate the resident would vote
  // for now, after the visit (their own appeal, an earlier word at a door
  // included, so a resident who gave a rival their word tells this one no);
  // without the voting engine, when the visit left them warm.
  const choice = doorChoice?.(api, voterId, campaign.contestId, visit);
  const yes =
    choice === undefined ? warmth > 0 : choice === campaign.candidateId;
  if (!yes) return;
  // A new word replaces an earlier one to a rival in the same contest.
  for (const earlier of pledgesOf(api, voterId))
    if (
      earlier.contestId === campaign.contestId &&
      earlier.candidateId !== campaign.candidateId
    )
      pledges.remove(earlier.id);
  const prior = pledges.get(id) as unknown as PledgeRow | undefined;
  pledges.put({
    id,
    voterId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    date: api.state.date,
    firstDate: prior?.firstDate ?? prior?.date ?? api.state.date,
    canvasserId,
    causeId,
    firmness: Math.max(0, Math.min(1, warmth)),
  } as unknown as ModuleRow);
}

/**
 * One person reached by one act. They learn the candidate's name (and the
 * platform where the act carries it); their warmth moves toward what they make
 * of it: their agreement with the platform plus how the meeting went, by the
 * act's weight. Returns the recorded cause.
 */
/**
 * A cause is the "why" behind one voter's warmth. The voter's running count
 * of contacts lives on their impression row, which the votes read; the cause
 * row itself is kept for the player's circle, for candidates the player
 * runs against, and everyone's under the keep-everyone's-why switch.
 */
function keepCause(api: CoreAPI, cause: CauseRow): void {
  if (keepsWhy(api.state as CoreState, cause.voterId, cause.candidateId))
    table(api, "causes").put(cause as unknown as ModuleRow);
}

/**
 * What a fact learned through a cause names as its source. The player's
 * circle and people in focus keep the cause itself; for everyone else the
 * cause folds into the voter's summary row for the candidate (CTO, Nov 8:
 * other places keep only the result, detail is built on demand), so the fact
 * names that row.
 */
export function causeSourceId(api: CoreAPI, cause: CauseRow): string {
  return keepsWhy(api.state as CoreState, cause.voterId)
    ? cause.id
    : `${cause.voterId}|${cause.candidateId}`;
}

export function reach(
  api: CoreAPI,
  campaign: CampaignRow,
  voterId: string,
  act: CampaignAct,
  actorId: string,
  options: {
    readonly carriesPlatform: boolean;
    readonly weight: number;
    readonly rapport: number;
    readonly target?: number;
    readonly shownIds?: readonly string[];
  },
): CauseRow | null {
  const voter = api.state.people.get(voterId);
  if (!voter?.alive || voterId === campaign.candidateId) return null;
  const date = api.state.date;
  const before = impressionOf(api, voterId, campaign.candidateId);
  const lean = personLean(api.state.people, voter, townRow(api).lean);
  const knowsPlatform =
    (before?.knowsPlatform ?? false) || options.carriesPlatform;
  const agreement = knowsPlatform
    ? agreementWith(api, voterId, lean, campaign.platform)
    : null;
  const target = clamp(options.target ?? (agreement ?? 0) + options.rapport);
  const warmthBefore = before?.warmth ?? 0;
  const warmthAfter = clamp(
    warmthBefore + options.weight * (target - warmthBefore),
  );
  const cause: CauseRow = {
    id: `cause:${voterId}:${campaign.candidateId}:${date}:${(before?.causes ?? 0) + 1}`,
    voterId,
    candidateId: campaign.candidateId,
    date,
    act,
    actorId,
    warmthBefore,
    warmthAfter,
    agreement,
    rapport: options.rapport,
    weight: options.weight,
    ...(options.shownIds?.length ? { shownIds: options.shownIds } : {}),
  };
  keepCause(api, cause);
  table(api, "impressions").put({
    id: `${voterId}|${campaign.candidateId}`,
    voterId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    heardOf: true,
    knowsPlatform,
    warmth: warmthAfter,
    causes: (before?.causes ?? 0) + 1,
  } as unknown as ModuleRow);
  if (!before?.heardOf)
    api.observe(voterId, {
      key: `candidate:${campaign.candidateId}`,
      value: campaign.contestId,
      learnedAt: date,
      // The player's circle and people in focus keep the cause itself as the
      // fact's source; for everyone else the cause folds into the voter's
      // summary row for this candidate (CTO, Nov 8: keep only the result,
      // build detail on demand), so the fact points at that row.
      sourceId: causeSourceId(api, cause),
      access:
        act === "retold" ? "told" : act.endsWith("ad") ? "public" : "perceived",
    });
  return cause;
}

/**
 * What an official did for a person outside any campaign (helping with their
 * problem, or turning them away) moves the person's warmth toward the
 * official, recorded as a cause the next election reads.
 */
export function touchImpression(
  api: CoreAPI,
  input: {
    readonly voterId: string;
    readonly officialId: string;
    readonly act: CampaignAct;
    readonly target: number;
    readonly weight: number;
    readonly rapport: number;
    /** The record that made the touch (a scene's reply), cited on the cause. */
    readonly sourceId?: string;
  },
): CauseRow | null {
  const voter = api.state.people.get(input.voterId);
  if (!voter?.alive || input.voterId === input.officialId) return null;
  const date = api.state.date;
  const before = impressionOf(api, input.voterId, input.officialId);
  const warmthBefore = before?.warmth ?? 0;
  const warmthAfter = clamp(
    warmthBefore + input.weight * (clamp(input.target) - warmthBefore),
  );
  const cause: CauseRow = {
    id: `cause:${input.voterId}:${input.officialId}:${date}:${(before?.causes ?? 0) + 1}`,
    voterId: input.voterId,
    candidateId: input.officialId,
    date,
    act: input.act,
    actorId: input.officialId,
    warmthBefore,
    warmthAfter,
    agreement: null,
    rapport: input.rapport,
    weight: input.weight,
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
  };
  keepCause(api, cause);
  table(api, "impressions").put({
    id: `${input.voterId}|${input.officialId}`,
    voterId: input.voterId,
    candidateId: input.officialId,
    contestId: (before as { contestId?: string } | null)?.contestId ?? null,
    heardOf: true,
    knowsPlatform: before?.knowsPlatform ?? false,
    warmth: warmthAfter,
    causes: (before?.causes ?? 0) + 1,
  } as unknown as ModuleRow);
  return cause;
}

/** How a face-to-face meeting goes: both people's sociability, by the weight the parameters give it. */
export function rapport(
  a: Readonly<Pick<PersonState, "traits">>,
  b: Readonly<Pick<PersonState, "traits">>,
): number {
  const social =
    ((a.traits["people-mind-v1:sociability"] ?? 0) +
      (b.traits["people-mind-v1:sociability"] ?? 0)) /
    2;
  return campaignParameter("rapportWeight") * social;
}

/** Family and friends hear about it from the person who was there. */
export function retell(
  api: CoreAPI,
  campaign: CampaignRow,
  teller: Readonly<PersonState>,
  cause: CauseRow,
): void {
  const adultAge = api.parameter("votingAge");
  const telling = Math.max(
    0,
    leanedScore(api.state, teller, "campaigns.retell", "tell", "keep", 1),
  );
  for (const id of teller.familyIds) {
    const listener = api.state.people.get(id);
    if (!listener?.alive || ageOn(listener, api.state.date) < adultAge)
      continue;
    reach(api, campaign, id, "retold", teller.id, {
      carriesPlatform: cause.agreement !== null,
      weight:
        campaignParameter("secondhandWeight") *
        Math.abs(cause.warmthAfter - cause.warmthBefore) *
        2 *
        telling,
      rapport: 0,
      target: cause.warmthAfter,
    });
  }
}

interface Address {
  readonly id: string;
  /** Still counted (two-level population): no full person lives here yet. */
  readonly counted: boolean;
  /** Birth date of the household's oldest member: what a walk list sorts by. */
  readonly eldest: string;
}
const addressCache = new WeakMap<
  object,
  { key: string; list: readonly Address[]; countedAdults: number }
>();

/**
 * Whether a group-quarters room is an institution's (a cell, a nursing-home
 * room): no canvasser knocks there. A dormitory or barracks is still a door.
 */
const institution = (type: GroupQuartersType | undefined): boolean =>
  type !== undefined && groupQuartersProfileOf(type).institutional;

/** How many doors the town's canvass has: the one list `townAddresses` walks. */
export function townDoorCount(api: CoreAPI): number {
  return townAddresses(api).list.length;
}

/**
 * The town's addresses, full households and counted ones alike, with how many
 * counted adults live in them, in the order a campaign's walk list stands:
 * households with the oldest member first (older residents answer a knock
 * most, by the door-opening rule below), then by id. The walk order is the
 * owner's call (SG-GOV-campaign-walk-order). Rebuilt
 * only when a household is added, filled in or leaves.
 */
export function townAddresses(api: CoreAPI): {
  readonly list: readonly Address[];
  readonly countedAdults: number;
} {
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const rt = residentsRuntime(core);
  const named = core.peopleByPlace.get(town);
  const key = `${core.households.size}|${named?.size ?? 0}|${rt?.store.version ?? 0}|${rt?.filledIn.size ?? 0}`;
  const held = addressCache.get(core);
  if (held?.key === key) return held;
  // stopgapId: SG-GOV-campaign-walk-order
  api.stopgap("SG-GOV-campaign-walk-order");
  const ids = new Map<string, { counted: boolean; eldest: string }>();
  for (const id of named ?? []) {
    const person = core.people.get(id);
    if (
      person?.alive &&
      core.households.has(person.householdId) &&
      !institution(core.households.get(person.householdId)!.quarters) &&
      !ids.has(person.householdId)
    ) {
      let eldest = person.birthDate;
      for (const m of core.households.get(person.householdId)!.memberIds) {
        const member = core.people.get(m);
        if (member?.alive && member.birthDate < eldest)
          eldest = member.birthDate;
      }
      ids.set(person.householdId, { counted: false, eldest });
    }
  }
  let countedAdults = 0;
  const date = api.state.date;
  // The wider population is read from its groups' columns, never built as records.
  for (const h of rt?.store.liveHouseholds() ?? []) {
    if (h.placeId !== town || ids.has(h.id)) continue;
    if (core.households.has(h.id) || institution(h.quarters)) continue;
    let eldest = "9999-12-31";
    for (const m of rt!.store.countedMembers(h)) {
      const born = rt!.store.born[m]!;
      if (born < eldest) eldest = born;
      if (ageOn({ birthDate: born }, date) >= adultAge) countedAdults += 1;
    }
    ids.set(h.id, { counted: true, eldest });
  }
  const list = [...ids]
    .map(([id, v]) => ({ id, counted: v.counted, eldest: v.eldest }))
    .sort(
      (a, b) => a.eldest.localeCompare(b.eldest) || a.id.localeCompare(b.id),
    );
  const built = { key, list, countedAdults };
  addressCache.set(core, built);
  return built;
}

/** The adults at one address: a full household's members or a counted one's records. */
function adultsAt(
  api: CoreAPI,
  address: Address,
): {
  readonly id: string;
  readonly traits: Readonly<Record<string, number>>;
  readonly birthDate: string;
  readonly slots: readonly Parameters<typeof atWork>[0][];
  /** A counted resident's household and place, which their stance profile is read from. */
  readonly householdId?: string;
  readonly placeId?: string;
}[] {
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const date = api.state.date;
  if (!address.counted) {
    const household = core.households.get(address.id);
    return [...(household?.memberIds ?? [])]
      .map((id) => core.people.get(id))
      .filter(
        (p): p is PersonState => !!p && p.alive && ageOn(p, date) >= adultAge,
      )
      .map((p) => ({
        id: p.id,
        traits: p.traits,
        birthDate: p.birthDate,
        slots: [...(core.work.commitmentsByPerson.get(p.id) ?? [])]
          .map((c) => core.work.commitments.get(c))
          .filter((c) => !!c),
      }));
  }
  const store = residentsRuntime(core)?.store;
  const at = store?.householdOf.get(address.id);
  const h = at === undefined ? undefined : store!.households[at];
  if (!store || !h || h.gone) return [];
  return store
    .countedMembers(h)
    .filter((m) => ageOn({ birthDate: store.born[m]! }, date) >= adultAge)
    .map((m) => ({
      id: store.ids[m]!,
      traits: store.packedTraits(m),
      birthDate: store.born[m]!,
      slots: h.workCommitments.filter((c) => c.personId === store.ids[m]),
      householdId: h.id,
      placeId: store.text(store.placeIx[m]!)!,
    }));
}

/** How many adults a counted address holds: `adultsAt`'s count, with no rows built. */
export function countedAdultsAt(api: CoreAPI, address: Address): number {
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  const store = residentsRuntime(api.state as CoreState)?.store;
  const at = store?.householdOf.get(address.id);
  const h = at === undefined ? undefined : store!.households[at];
  if (!store || !h || h.gone) return 0;
  let adults = 0;
  for (const m of store.countedMembers(h))
    if (ageOn({ birthDate: store.born[m]! }, date) >= adultAge) adults += 1;
  return adults;
}

/** The ids of a full address's adults, in `adultsAt`'s order, with no rows built. */
export function adultIdsAt(api: CoreAPI, address: Address): string[] {
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const date = api.state.date;
  const ids: string[] = [];
  for (const id of core.households.get(address.id)?.memberIds ?? []) {
    const p = core.people.get(id);
    if (p && p.alive && ageOn(p, date) >= adultAge) ids.push(p.id);
  }
  return ids;
}

/**
 * Walk the town's doors for some hours, full households and counted ones
 * alike, those not yet walked first. At each door the most willing adult home
 * at that minute is the one who might open; the evening opens as many doors
 * as their readiness adds up to, at the homes that owe an opening most.
 * Yields each opener in walk order, with the home they opened (a counted
 * resident is filled in by the caller); `done` and `walked` gain every door
 * knocked, `lastKnocked` today for each, `carries` each knocked home's carry
 * and `owed` the campaign's. `cursor` keeps where the doors not yet walked start in the
 * town's address list, so the next canvasser of the same walk starts there.
 */
function* walkDoors(
  api: CoreAPI,
  input: {
    readonly done: Set<string>;
    /** When each door already walked was last knocked. */
    readonly lastKnocked: Map<string, string>;
    /** What each home's knocks so far owe it toward its next opening. */
    readonly carries: Map<string, number>;
    /** What the campaign's evenings so far owe toward its next opening. */
    readonly owed: { carry: number };
    readonly walked: string[];
    readonly cursor: { list: readonly Address[] | null; at: number };
    readonly doors: number;
    readonly hours: number;
  },
): Generator<{
  readonly home: string;
  readonly opener: ReturnType<typeof adultsAt>[number];
}> {
  const doors = input.doors;
  const done = input.done;
  const list = townAddresses(api).list;
  const cursor = input.cursor;
  // Every address before the cursor was walked by this walk's earlier
  // canvassers; a rebuilt list starts over.
  if (cursor.list !== list) {
    cursor.list = list;
    cursor.at = 0;
  }
  const homes: { id: string; adults: ReturnType<typeof adultsAt> }[] = [];
  let at = cursor.at;
  for (; at < list.length && homes.length < doors; at += 1) {
    const address = list[at]!;
    if (done.has(address.id)) continue;
    homes.push({ id: address.id, adults: adultsAt(api, address) });
  }
  cursor.at = at;
  // With every door in town walked, the canvass goes round again, the doors
  // knocked longest ago first, as a field campaign walks its turf again
  // before election day (the same walk order, SG-GOV-campaign-walk-order).
  if (homes.length < doors) {
    const again = list
      .map((address, at) => ({
        address,
        at,
        last: input.lastKnocked.get(address.id),
      }))
      .filter((row) => row.last !== undefined)
      .sort((a, b) => a.last!.localeCompare(b.last!) || a.at - b.at);
    for (const { address } of again) {
      if (homes.length >= doors) break;
      homes.push({ id: address.id, adults: adultsAt(api, address) });
    }
  }
  const perHour = Math.max(1, doors / Math.max(1, input.hours));
  const start = campaignParameter("canvassStartHour") * 60;
  const knocks: {
    readonly home: string;
    readonly opener: ReturnType<typeof adultsAt>[number];
    readonly share: number;
    readonly owed: number;
  }[] = [];
  for (const [index, home] of homes.entries()) {
    done.add(home.id);
    input.walked.push(home.id);
    input.lastKnocked.set(home.id, api.state.date);
    // Who's home at the minute of the knock: not at a scheduled shift.
    const minute = start + Math.floor((index * 60) / perHour);
    const athome = home.adults.filter(
      (a) => !a.slots.some((c) => atWork(c!, api.state.date, minute)),
    );
    // The one home whose traits lean most toward opening answers a stranger.
    // Older residents answer more (contact rates rise with age in field
    // experiments; Green and Gerber 2019).
    // Each adult's readiness past the threshold, weighed once.
    const weighed = athome
      .map((a) => ({
        id: a.id,
        adult: a,
        score: leanedScore(
          api.state,
          a,
          "campaigns.open-door",
          "open",
          "ignore",
          (ageOn(a, api.state.date) - campaignParameter("doorAnswerPivotAge")) /
            campaignParameter("doorAnswerAgeSpan") -
            campaignParameter("doorAnswerThreshold"),
        ),
      }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const opener = weighed[0];
    if (!opener) continue;
    // Their readiness slides to the share of knocks they open, a ready home
    // most times and a reluctant one now and then; each knock adds it to
    // what the home is owed (starting even).
    const share = logistic(opener.score / campaignParameter("doorAnswerScale"));
    const owed = (input.carries.get(home.id) ?? OPENING_CARRY) + share;
    knocks.push({ home: home.id, opener: opener.adult, share, owed });
  }
  // The evening opens as many doors as the shares add up to, with what the
  // campaign's earlier evenings carried, so a street of reluctant homes still
  // opens a few. The homes owed most open them, each spending an opening.
  const due = knocks.reduce((sum, k) => sum + k.share, input.owed.carry);
  const opens = Math.floor(due);
  input.owed.carry = due - opens;
  const opening = new Set(
    [...knocks]
      .sort((a, b) => b.owed - a.owed || a.home.localeCompare(b.home))
      .slice(0, opens)
      .map((k) => k.home),
  );
  for (const k of knocks) {
    const opened = opening.has(k.home);
    input.carries.set(k.home, opened ? k.owed - 1 : k.owed);
    if (opened) yield { home: k.home, opener: k.opener };
  }
}

/**
 * One day's walk of a campaign's doors, shared by every canvasser it sends
 * out that evening: the doors it has knocked, read once, and what the walk
 * adds to them, written once when it closes.
 */
interface DoorWalk {
  readonly filingId: string;
  readonly done: Set<string>;
  readonly lastKnocked: Map<string, string>;
  readonly carries: Map<string, number>;
  readonly owed: { carry: number };
  readonly walked: string[];
  readonly cursor: { list: readonly Address[] | null; at: number };
  /** Counted residents who opened, reached as a count. */
  counted: number;
  /** Doors that opened and were asked to sign. */
  asked: number;
  /** Whom each resident who answered told the campaign they will vote for, by home and voter (`toldAtDoor`). */
  readonly told: Map<string, Map<string, string | null>>;
}

export function openDoorWalk(api: CoreAPI, filingId: string): DoorWalk {
  const campaign = campaignFor(api, filingId);
  const knocked = doorRowsOf(api, campaign.id);
  return {
    filingId,
    done: new Set(knocked.map((row) => row.householdId)),
    lastKnocked: new Map(
      knocked.map((row) => [row.householdId, row.lastDate ?? row.date]),
    ),
    carries: new Map(
      knocked.flatMap((row) =>
        row.answerCarry === undefined
          ? []
          : [[row.householdId, row.answerCarry] as const],
      ),
    ),
    owed: { carry: campaign.doorAnswerCarry ?? OPENING_CARRY },
    walked: [],
    cursor: { list: null, at: 0 },
    counted: 0,
    asked: 0,
    told: new Map(),
  };
}

/** One canvasser's hours of a walk; returns everyone they met at a door, in order. */
export function walkWith(
  api: CoreAPI,
  walk: DoorWalk,
  canvasserId: string,
  hours: number,
  fillCounted: boolean | number | undefined,
): CauseRow[] {
  const campaign = campaignFor(api, walk.filingId);
  const canvasser = api.state.people.get(canvasserId)!;
  const efficiency =
    1 +
    campaignParameter("canvasserReliabilityEfficiency") *
      (canvasser.traits["people-mind-v1:reliability"] ?? 0);
  const doors = Math.floor(
    hours * campaignParameter("doorsPerCanvasserHour") * efficiency,
  );
  api.recordActivityTime(canvasserId, "campaign", hours * 60, {
    tag: "SOURCED",
    citation: `Campaign ${campaign.id}`,
    asOf: api.state.date,
  });
  const core = api.state as CoreState;
  const met: CauseRow[] = [];
  const opened = [
    ...walkDoors(api, {
      done: walk.done,
      lastKnocked: walk.lastKnocked,
      carries: walk.carries,
      owed: walk.owed,
      walked: walk.walked,
      cursor: walk.cursor,
      doors,
      hours,
    }),
  ];
  const fill = countedToFill(
    api,
    campaign,
    opened.map((o) => o.opener),
    fillCounted,
  );
  for (const { home, opener } of opened) {
    const openerId = opener.id;
    // A counted household is filled in when the player's campaign opens its
    // door (the owner's on-meet design): the person who answers is a full
    // person from then on. A world candidate's or a volunteer's door counts
    // them as reached, and they answer the petition by the same rule, from
    // their own record.
    if (!api.state.people.has(openerId)) {
      if (!fill.has(openerId)) {
        walk.counted += 1;
        if (petitionAsksAtDoors(api, walk.filingId)) {
          walk.asked += 1;
          askToSign(api, walk.filingId, opener, "door");
        }
        // Asked for their vote, a counted resident answers by the rule a
        // first visit applies to a full person: what they make of the
        // platform from their own record, and how the visit went.
        else {
          const agreement = countedAgreement(api, campaign, opener);
          const warmth = countedDoorWarmth(canvasser, opener, agreement);
          answerAtDoor(api, campaign, openerId, canvasserId, warmth, null, {
            candidateId: campaign.candidateId,
            agreement,
            warmth,
          });
        }
        toldAtDoor(api, walk, campaign, home, openerId);
        continue;
      }
      fillInPerson(core, openerId);
    }
    const answers = api.state.people.get(openerId);
    if (!answers) continue;
    const cause = reach(
      api,
      campaign,
      answers.id,
      canvasserId === campaign.candidateId ? "door" : "volunteer-door",
      canvasserId,
      {
        carriesPlatform: true,
        weight: campaignParameter("doorContactWeight"),
        rapport: rapport(canvasser, answers),
      },
    );
    if (!cause) continue;
    if (canvasserId !== answers.id)
      // One door's share of the canvasser's hour (the walk's own pace).
      api.relationship(
        canvasserId,
        answers.id,
        "contact",
        1 / campaignParameter("doorsPerCanvasserHour"),
      );
    met.push(cause);
    retell(api, campaign, answers, cause);
    // A door that carries a petition asks for a signature; any other asks
    // for the vote, and the answer is how warm the visit left them.
    if (petitionAsksAtDoors(api, walk.filingId)) {
      walk.asked += 1;
      askToSign(api, walk.filingId, answers, "door");
    } else
      answerAtDoor(
        api,
        campaign,
        answers.id,
        canvasserId,
        cause.warmthAfter,
        cause.id,
      );
    toldAtDoor(api, walk, campaign, home, answers.id);
  }
  return met;
}

/**
 * What a resident who answers a campaign's door tells it of the race, full
 * or counted by the one rule: the candidate in the contest they have given
 * their word to (one a race, the one this door just asked for included), or
 * nobody. Their latest answer at the home is what the campaign knows
 * (`closeDoorWalk` keeps it on the home's doors row, read by `toldReading`).
 * Only a world candidate reads the race from it (`rivalDay`), so the
 * player's own doors keep none.
 */
function toldAtDoor(
  api: CoreAPI,
  walk: DoorWalk,
  campaign: CampaignRow,
  home: string,
  voterId: string,
): void {
  if (campaign.candidateId === (api.state as CoreState).playerId) return;
  const yes =
    pledgesOf(api, voterId).find((p) => p.contestId === campaign.contestId)
      ?.candidateId ?? null;
  let at = walk.told.get(home);
  if (!at) walk.told.set(home, (at = new Map()));
  at.set(voterId, yes);
}

/**
 * Close a walk: one row a household, the day its door was first knocked, the
 * last, how many times, what its knocks owe toward the next opening, and what
 * each resident who answered told the campaign at their latest answer; and
 * the campaign's door count, carry and counted reach.
 */
export function closeDoorWalk(api: CoreAPI, walk: DoorWalk): void {
  const campaign = campaignFor(api, walk.filingId);
  const doorRows = table(api, "doors");
  for (const household of walk.walked) {
    const id = `${campaign.id}|${household}`;
    const prior = doorRows.get(id) as unknown as DoorRow | undefined;
    const told = walk.told.get(household);
    doorRows.put({
      id,
      campaignId: campaign.id,
      householdId: household,
      date: prior?.date ?? api.state.date,
      lastDate: api.state.date,
      knocks: (prior?.knocks ?? (prior ? 1 : 0)) + 1,
      ...(walk.carries.has(household)
        ? { answerCarry: walk.carries.get(household) }
        : {}),
      ...(told || prior?.told
        ? {
            told: { ...prior?.told, ...(told ? Object.fromEntries(told) : {}) },
          }
        : {}),
    } as unknown as ModuleRow);
  }
  // The campaign's door count is every door knocked, a second pass included.
  save(api, {
    ...campaign,
    doorsKnockedCount: (campaign.doorsKnockedCount ?? 0) + walk.walked.length,
    doorAnswerCarry: walk.owed.carry,
    countedReached: (campaign.countedReached ?? 0) + walk.counted,
    doorSignAsks: (campaign.doorSignAsks ?? 0) + walk.asked,
  });
}

/**
 * The warmth a first door visit leaves a counted resident with: `reach`'s
 * own rule from an empty impression, read from their record (their lean
 * and stance profile against the platform, and the visit's rapport).
 */
function countedDoorWarmth(
  canvasser: Readonly<PersonState>,
  opener: ReturnType<typeof adultsAt>[number],
  agreement: number,
): number {
  const target = clamp(agreement + rapport(canvasser, opener));
  return clamp(campaignParameter("doorContactWeight") * target);
}

/** What a counted resident makes of the campaign's platform, from their record (`groupAgreement`, the rule a full person's agreement follows). */
function countedAgreement(
  api: CoreAPI,
  campaign: CampaignRow,
  opener: ReturnType<typeof adultsAt>[number],
): number {
  const lean = personLean(api.state.people, opener, townRow(api).lean);
  const profile =
    opener.householdId && opener.placeId
      ? countedStanceProfile(api, {
          id: opener.id,
          householdId: opener.householdId,
          birthDate: opener.birthDate,
          placeId: opener.placeId,
        })
      : null;
  return groupAgreement(lean, campaign.platform, profile);
}

/**
 * Knock on doors for some hours: the montage. Households not yet visited, in
 * the order they stand, then (once every door has been knocked) those knocked
 * longest ago. At each door the most outgoing adult home answers, in the
 * share of knocks their readiness to open to a stranger says; they talk with
 * the canvasser, and tell their household. Returns everyone met at a door, in
 * order, so the screen can stop on a porch.
 */
export function knockDoors(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly canvasserId: string;
    readonly hours: number;
    /**
     * Which counted residents who open are filled in as full people: all
     * (true, the default), none (false: a world candidate's or a volunteer's
     * door reaches them as a count), or at most this many, the ones the
     * evening's porch scene could cast (the player's own canvass: a door
     * touches the counted group, and only someone the player talks with in
     * a scene is filled in; owner, Oct 27, "a short scene at 1 or 2 doors").
     */
    readonly fillCounted?: boolean | number;
  },
): readonly CauseRow[] {
  const walk = openDoorWalk(api, input.filingId);
  const met = walkWith(
    api,
    walk,
    input.canvasserId,
    input.hours,
    input.fillCounted,
  );
  closeDoorWalk(api, walk);
  // What the candidate said at the doors is a message the people they met
  // can pass on to the candidate's rivals, as an ad's viewers do: once for
  // an evening of the candidate's own doors. A volunteer's evening
  // (`volunteerShifts`) is kept as its volunteer-door causes and its
  // volunteer-shift event, not as the candidate's message.
  const campaign = campaignFor(api, input.filingId);
  if (input.canvasserId === campaign.candidateId)
    emitMessage(api, campaign, {
      kind: CANVASS_MESSAGE_KIND,
      id: `${CANVASS_MESSAGE_KIND}:${campaign.id}:${api.state.date}:${campaign.doorsKnockedCount ?? 0}`,
      witnessIds: met.map((c) => c.voterId),
    });
  return met;
}

/**
 * The counted residents among an evening's openers who are filled in: every
 * one, none, or the few with the most to say about the platform either way
 * (the porch scene casts the door whose resident most agrees or disagrees,
 * `director/doors.ts`), up to the limit.
 */
function countedToFill(
  api: CoreAPI,
  campaign: CampaignRow,
  openers: readonly ReturnType<typeof adultsAt>[number][],
  fillCounted: boolean | number | undefined,
): ReadonlySet<string> {
  const counted = openers.filter((o) => !api.state.people.has(o.id));
  if (fillCounted === undefined || fillCounted === true)
    return new Set(counted.map((o) => o.id));
  if (fillCounted === false || fillCounted <= 0) return new Set();
  return new Set(
    counted
      .map((o) => ({
        id: o.id,
        strength: Math.abs(countedAgreement(api, campaign, o)),
      }))
      .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))
      .slice(0, Math.floor(fillCounted))
      .map((o) => o.id),
  );
}

interface DoorRow {
  readonly id: string;
  readonly campaignId: string;
  readonly householdId: string;
  /** The day the door was first knocked. */
  readonly date: string;
  readonly lastDate?: string;
  readonly knocks?: number;
  /** What the home's knocks owe it toward its next opening (a share of one). */
  readonly answerCarry?: number;
  /**
   * What each resident who answered here told the campaign at their latest
   * answer, by voter id: the candidate in the contest they have given their
   * word to, or null for nobody (`toldAtDoor`; a world candidate's doors only).
   */
  readonly told?: Readonly<Record<string, string | null>>;
}

export function doorRowsOf(
  api: CoreAPI,
  campaignId: string,
): readonly DoorRow[] {
  return table(api, "doors").query("byCampaign", [
    campaignId,
  ]) as unknown as DoorRow[];
}

/**
 * The campaign's door row whose residents' answers were told most recently
 * (its latest evening), or undefined where no door has told it anything.
 */
export function newestToldDoor(
  api: CoreAPI,
  campaignId: string,
): { readonly row: DoorRow; readonly at: string } | undefined {
  let best: { row: DoorRow; at: string } | undefined;
  for (const row of doorRowsOf(api, campaignId)) {
    if (!row.told || !Object.keys(row.told).length) continue;
    const at = row.lastDate ?? row.date;
    if (!best || at > best.at || (at === best.at && row.id < best.row.id))
      best = { row, at };
  }
  return best;
}

/** The households a campaign's doors have reached. */
export function doorsKnockedOf(
  api: CoreAPI,
  campaignId: string,
): readonly string[] {
  return doorRowsOf(api, campaignId).map((row) => row.householdId);
}
