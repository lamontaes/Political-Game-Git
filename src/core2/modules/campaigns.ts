/**
 * Campaigning (golden path step 4): between filing and election day, support
 * comes only from the people a campaign actually reaches.
 *
 * Every act (a door, a speech, an ad, an endorsement, a volunteer's door, a
 * retelling at home) reaches specific people. Each person then changes what
 * they know (they've heard of the candidate; they know the platform) and how
 * warm they are toward the candidate, for their own reasons: how far the
 * platform sits from their own views, how the meeting went with this
 * canvasser, who told them. Every change is a recorded cause; nothing moves
 * support without one. Polls ask real people and report what they said.
 *
 * Views come from a stand-in until OPUS-PEOPLE's views engine lands
 * (`campaign-views.ts`, SG-GOV-views-stand-in).
 */
import { candidateIdentity } from "../candidate-identity";
import { customPolitics, registerElectorate } from "../electorate";
import { partySide } from "../appointments";
import { residentsRuntime } from "./residents";
import { fillInPerson } from "../state";
import { parameter } from "../parameters";
import { keepsWhy } from "../why-kept";
import { closenessBetween } from "../closeness";
import { decisionLean, leanedScore, leanedYes } from "../trait-decisions";
import limits from "../../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };
import unitPrices from "../../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import finance from "../../../data/research/campaigns/campaign-finance-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import type { CashJournalSourceSlot } from "../journal-state";
import { addDays, makeIsoDate } from "../kernel/dates";
import { townDistrict } from "../offices-state";
import {
  campaignParameter,
  districtLean,
  personLean,
  type Stance,
} from "../campaign-views";
import { candidatePlatform, partyLean } from "../campaign-stances";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
  type TieRow,
} from "./parties";
import { agreementWith, VIEWS_SPEAKER_KEY } from "./views";
import { recordAppeal } from "./record";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./elections";

export const CAMPAIGNS_MODULE_ID = "core2-campaigns-v1";
const DONATION_KIND = "campaigns:donation";
const AD_KIND = "campaigns:ad-buy";
const PURCHASE_KIND = "campaigns:purchase";

export interface CampaignRow {
  readonly id: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly platform: readonly Stance[];
  readonly organizationId: string;
  readonly volunteerIds: readonly string[];
  readonly staffIds: readonly string[];
  /** How many households its doors have reached (each kept in the doors table). */
  readonly doorsKnockedCount?: number;
  readonly raisedMinor: number;
  readonly spentMinor: number;
  /** Where the next turn's asks for money start in the campaign's list of people it can reach. */
  readonly askCursor?: number;
  /** Where the next turn's asks to volunteer start in the same list. */
  readonly volunteerCursor?: number;
  /** Everyone already asked for an endorsement (each ask is made once). */
  readonly endorsementAskedIds?: readonly string[];
  /** Those who said yes: they endorsed, and their circle heard it. */
  readonly endorserIds?: readonly string[];
  /** Where the next mail drop starts in the town's list of addresses. */
  readonly mailCursor?: number;
  /** Counted adults (not yet full people) its doors, mail and ads reached. */
  readonly countedReached?: number;
  /** What each ad bought reached: the outlet, the full followers and the counted adults, one record per buy. */
  readonly adReaches?: readonly {
    readonly id: string;
    readonly date: string;
    readonly outletId: string;
    readonly full: number;
    readonly counted: number;
  }[];
  /** Money set aside toward an event's venue and a poll, not yet paid. */
  readonly eventFundMinor?: number;
  readonly pollFundMinor?: number;
  /** What it bought, by kind, in minor units. */
  readonly spentByKind?: Readonly<Record<string, number>>;
}

/** One donor's running total to one campaign (the legal limit reads it). */
export interface GiftRow {
  readonly id: string;
  readonly campaignId: string;
  readonly donorId: string;
  readonly totalMinor: number;
  readonly lastDate: string;
}

export interface ImpressionRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly heardOf: boolean;
  readonly knowsPlatform: boolean;
  readonly warmth: number;
  readonly causes: number;
}

export type CampaignAct =
  | "door"
  | "volunteer-door"
  | "speech"
  | "interview"
  | "town-hall"
  | "debate"
  | "retold"
  | "ad"
  | "attack-ad"
  | "endorsement"
  | "donation-ask"
  | "constituent-case"
  | "mail"
  | "event";

/** Why one person's view of one candidate changed, once. */
export interface CauseRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly date: string;
  readonly act: CampaignAct;
  readonly actorId: string;
  readonly warmthBefore: number;
  readonly warmthAfter: number;
  /** The person's own reasons, as numbers the English engine words. */
  readonly agreement: number | null;
  readonly rapport: number;
  readonly weight: number;
}

export interface PromiseRow {
  readonly id: string;
  readonly candidateId: string;
  readonly contestId: string;
  readonly date: string;
  readonly stance: Stance;
  readonly venue: string;
  readonly audience: number;
}

export interface PollRow {
  readonly id: string;
  readonly campaignId: string;
  readonly contestId: string;
  readonly date: string;
  readonly contacted: number;
  readonly answers: Readonly<Record<string, number>>;
  readonly marginOfError: number | null;
  readonly respondentIds: readonly string[];
}

interface MoneyRecord {
  readonly id: string;
  readonly kind: string;
  readonly date: string;
  readonly source: Source;
  readonly postings: readonly {
    id: string;
    accountId: string;
    deltaMinor: number;
  }[];
}

const slots = new WeakMap<object, Map<string, CashJournalSourceSlot>>();
function moneySlot(
  api: CoreAPI,
  id: string,
): CashJournalSourceSlot | undefined {
  const map = slots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  slots.set(api.state, map);
  if (map.has(id)) return map.get(id);
  const row = table(api, "money").get(id) as unknown as MoneyRecord | undefined;
  if (!row) return undefined;
  const resolved = {
    kind: row.kind,
    id: row.id,
    date: row.date,
    source: row.source,
    expectedPostings: row.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  const slot = {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot;
  map.set(id, slot);
  return slot;
}

export const CAMPAIGNS_MODULE: CoreModule = {
  id: CAMPAIGNS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      campaigns: { indexes: { byContest: { fields: ["contestId"] } } },
      /** Each household a campaign's doors reached, one row each. */
      doors: { indexes: { byCampaign: { fields: ["campaignId"] } } },
      impressions: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      causes: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
      promises: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      polls: { indexes: { byContest: { fields: ["contestId"] } } },
      money: {},
      gifts: {
        indexes: {
          byCampaign: { fields: ["campaignId"] },
          byDonor: { fields: ["donorId"] },
        },
      },
      /** Contests the town votes in whose campaigns are under way. */
      races: {},
      town: {},
    },
  },
  onCalendarWork: (api, work) => campaignWork(api, work),
  journalSourceProviders: {
    [DONATION_KIND]: (api, reference) => moneySlot(api, reference.id),
    [AD_KIND]: (api, reference) => moneySlot(api, reference.id),
    [PURCHASE_KIND]: (api, reference) => moneySlot(api, reference.id),
  },
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(CAMPAIGNS_MODULE_ID).table(name);
}
function elections(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}
const clamp = (x: number) => Math.max(-1, Math.min(1, x));
const ageOn = (
  person: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
) => Number(date.slice(0, 4)) - Number(person.birthDate.slice(0, 4));

/** A filing's platform: stance strings written "question=+1" or "question=-1". */
export function parsePlatform(platform: readonly string[]): readonly Stance[] {
  return platform.flatMap((entry) => {
    const [question, position] = entry.split("=");
    const value = Number(position);
    return question && Number.isFinite(value)
      ? [{ question, position: Math.max(-1, Math.min(1, value)) }]
      : [];
  });
}

/** Register the module and note the town's starting lean (stand-in for views). */
export function openCampaigns(core: CoreState): void {
  registerElectorate(core);
  if (!core.modules.has(CAMPAIGNS_MODULE_ID))
    registerModule(core, CAMPAIGNS_MODULE);
  const api = coreAPI(core);
  const town = elections(api, "town").get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
  const district = townDistrict(
    town.geoid,
    town.stateKey.slice(3),
    "congressional",
    core.date,
  );
  // stopgapId: SG-GOV-views-stand-in
  api.stopgap("SG-GOV-views-stand-in");
  table(api, "town").put({
    id: "town",
    ...town,
    // A custom world's politics setting shifts where the town stands.
    lean: Math.max(
      -1,
      Math.min(
        1,
        districtLean(district?.geoid ?? null, town.stateKey) +
          customPolitics(core).leanShift,
      ),
    ),
  });
  scheduleTurn(api);
}

/** The next campaign turn for every world candidate, on the module calendar. */
function scheduleTurn(api: CoreAPI): void {
  const date = addDays(
    makeIsoDate(api.state.date),
    campaignParameter("campaignTurnDays"),
  );
  const calendar = api.moduleCalendar(CAMPAIGNS_MODULE_ID);
  // One chain of turns: a turn already waiting keeps its place.
  const next = table(api, "town").get("turn") as unknown as
    { date: string } | undefined;
  if (
    next &&
    next.date > api.state.date &&
    calendar.get(`campaign-turn:${next.date}`)?.status === "pending"
  )
    return;
  const key = `campaign-turn:${date}`;
  table(api, "town").put({ id: "turn", date } as unknown as ModuleRow);
  calendar.schedule({
    key,
    date,
    kind: "campaign-turn",
    source: {
      tag: "ESTIMATED",
      citation: "A part-time campaign works a few days a week",
      asOf: api.state.date,
      estimatedFrom: "campaignTurnDays",
    },
    sourceRecordIds: [`campaign-turn:${townRow(api).townPlaceId}`],
  });
}

function townRow(api: CoreAPI) {
  return table(api, "town").get("town") as unknown as {
    stateKey: string;
    townPlaceId: string;
    lean: number;
  };
}

/** The campaign of a filing, started the first time it's used. */
export function campaignFor(api: CoreAPI, filingId: string): CampaignRow {
  const existing = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (existing) return existing;
  const filing = elections(api, "filings").get(
    filingId,
  ) as unknown as FilingRow;
  if (!filing) throw new Error(`No filing ${filingId}`);
  // A state or federal candidate may not be a full person yet.
  const person = candidateIdentity(api, filing.personId);
  if (!person) throw new Error(`No candidate ${filing.personId}`);
  const organizationId = `organization:campaign:${filingId}`;
  if (!api.state.organizations.has(organizationId))
    api.addOrganization({
      id: organizationId,
      placeId: townRow(api).townPlaceId,
      name: `${person.givenName} ${person.familyName} campaign`,
      kind: "campaign-committee",
      liquidMinor: 0,
      source: {
        tag: "SOURCED",
        citation: `Filing ${filingId}`,
        asOf: api.state.date,
      },
    });
  const row: CampaignRow = {
    id: filingId,
    filingId,
    contestId: filing.contestId,
    candidateId: filing.personId,
    // A filing with no stated platform (a standing candidate, an official)
    // campaigns on what the candidate and their party stand for.
    platform: filing.platform.length
      ? parsePlatform(filing.platform)
      : candidatePlatform(api, filing.personId, filing.party ?? null),
    organizationId,
    volunteerIds: [],
    staffIds: [],
    doorsKnockedCount: 0,
    raisedMinor: 0,
    spentMinor: 0,
  };
  table(api, "campaigns").put(row as unknown as ModuleRow);
  return row;
}

function save(api: CoreAPI, row: CampaignRow) {
  table(api, "campaigns").put(row as unknown as ModuleRow);
}

export function impressionOf(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): ImpressionRow | null {
  return (
    (table(api, "impressions").get(`${voterId}|${candidateId}`) as unknown as
      ImpressionRow | undefined) ?? null
  );
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
 * runs against, and when bookkeeping is on.
 */
function keepCause(api: CoreAPI, cause: CauseRow): void {
  if (keepsWhy(api.state as CoreState, cause.voterId, cause.candidateId))
    table(api, "causes").put(cause as unknown as ModuleRow);
}

function reach(
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
      sourceId: cause.id,
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
function rapport(a: Readonly<PersonState>, b: Readonly<PersonState>): number {
  const social =
    ((a.traits["people-mind-v1:sociability"] ?? 0) +
      (b.traits["people-mind-v1:sociability"] ?? 0)) /
    2;
  return campaignParameter("rapportWeight") * social;
}

/** Family and friends hear about it from the person who was there. */
function retell(
  api: CoreAPI,
  campaign: CampaignRow,
  teller: Readonly<PersonState>,
  cause: CauseRow,
): void {
  const telling = Math.max(
    0,
    leanedScore(api.state, teller, "campaigns.retell", "tell", "keep", 1),
  );
  for (const id of teller.familyIds) {
    const listener = api.state.people.get(id);
    if (!listener?.alive || ageOn(listener, api.state.date) < 18) continue;
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
}
const addressCache = new WeakMap<
  object,
  { key: string; list: readonly Address[]; countedAdults: number }
>();

/**
 * The town's addresses, full households and counted ones alike, in the order
 * they stand (by id), with how many counted adults live in them. Rebuilt
 * only when a household is added, filled in or leaves.
 */
function townAddresses(api: CoreAPI): {
  readonly list: readonly Address[];
  readonly countedAdults: number;
} {
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const rt = residentsRuntime(core);
  const named = core.peopleByPlace.get(town);
  const key = `${core.households.size}|${named?.size ?? 0}|${rt?.store.version ?? 0}|${rt?.filledIn.size ?? 0}`;
  const held = addressCache.get(core);
  if (held?.key === key) return held;
  const ids = new Map<string, boolean>();
  for (const id of named ?? []) {
    const person = core.people.get(id);
    if (person?.alive && core.households.has(person.householdId))
      ids.set(person.householdId, false);
  }
  let countedAdults = 0;
  const date = api.state.date;
  // The wider population is read from its groups' columns, never built as records.
  for (const h of rt?.store.liveHouseholds() ?? []) {
    if (h.placeId !== town || ids.has(h.id)) continue;
    if (core.households.has(h.id)) continue;
    ids.set(h.id, true);
    for (const m of rt!.store.countedMembers(h))
      if (ageOn({ birthDate: rt!.store.born[m]! }, date) >= 18)
        countedAdults += 1;
  }
  const list = [...ids]
    .map(([id, counted]) => ({ id, counted }))
    .sort((a, b) => a.id.localeCompare(b.id));
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
}[] {
  const core = api.state as CoreState;
  const date = api.state.date;
  if (!address.counted) {
    const household = core.households.get(address.id);
    return [...(household?.memberIds ?? [])]
      .map((id) => core.people.get(id))
      .filter((p): p is PersonState => !!p && p.alive && ageOn(p, date) >= 18)
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
    .filter((m) => ageOn({ birthDate: store.born[m]! }, date) >= 18)
    .map((m) => ({
      id: store.ids[m]!,
      traits: store.packedTraits(m),
      birthDate: store.born[m]!,
      slots: h.workCommitments.filter((c) => c.personId === store.ids[m]),
    }));
}

/**
 * Walk the town's doors for some hours, full households and counted ones
 * alike, skipping those already walked: at each door the most willing adult
 * home at that minute opens, or no one does. Yields each opener's id (a
 * counted resident is filled in by the caller); `done` gains every door.
 */
function* walkDoors(
  api: CoreAPI,
  input: {
    readonly done: Set<string>;
    readonly doors: number;
    readonly hours: number;
  },
): Generator<string> {
  const doors = input.doors;
  const done = input.done;
  const homes: { id: string; adults: ReturnType<typeof adultsAt> }[] = [];
  for (const address of townAddresses(api).list) {
    if (homes.length >= doors) break;
    if (done.has(address.id)) continue;
    homes.push({ id: address.id, adults: adultsAt(api, address) });
  }
  const perHour = Math.max(1, doors / Math.max(1, input.hours));
  const start = campaignParameter("canvassStartHour") * 60;
  for (const [index, home] of homes.entries()) {
    done.add(home.id);
    // Who's home at the minute of the knock: not at a scheduled shift.
    const minute = start + Math.floor((index * 60) / perHour);
    const athome = home.adults.filter(
      (a) => !a.slots.some((c) => atWork(c!, api.state.date, minute)),
    );
    // The one home whose traits lean most toward opening answers a stranger
    // if they're willing.
    // Older residents answer more (contact rates rise with age in field
    // experiments; Green and Gerber 2019).
    // Each adult's readiness past the threshold, weighed once.
    const weighed = athome
      .map((a) => ({
        id: a.id,
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
    const opener = weighed.find((a) => a.score > 0);
    if (!opener) continue;
    yield opener.id;
  }
}

/**
 * Knock on doors for some hours: the montage. Households not yet visited, in
 * the order they stand. At each door the most outgoing adult answers, if
 * anyone in the house is willing to open to a stranger; they talk with the
 * canvasser, and tell their household. Returns everyone met at a door, in
 * order, so the screen can stop on a porch.
 */
export function knockDoors(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly canvasserId: string;
    readonly hours: number;
    /**
     * Whether a counted resident who opens is filled in as a full person:
     * yes when the player's campaign meets them (the owner's on-meet
     * design); a world candidate's door reaches them as a count.
     */
    readonly fillCounted?: boolean;
  },
): readonly CauseRow[] {
  let campaign = campaignFor(api, input.filingId);
  let counted = 0;
  const canvasser = api.state.people.get(input.canvasserId)!;
  const efficiency =
    1 +
    campaignParameter("canvasserReliabilityEfficiency") *
      (canvasser.traits["people-mind-v1:reliability"] ?? 0);
  const doors = Math.floor(
    input.hours * campaignParameter("doorsPerCanvasserHour") * efficiency,
  );
  api.recordActivityTime(input.canvasserId, "campaign", input.hours * 60, {
    tag: "SOURCED",
    citation: `Campaign ${campaign.id}`,
    asOf: api.state.date,
  });
  const done = new Set(doorsKnockedOf(api, campaign.id));
  const before = done.size;
  const core = api.state as CoreState;
  const met: CauseRow[] = [];
  for (const openerId of walkDoors(api, { done, doors, hours: input.hours })) {
    // A counted household is filled in when the player's campaign opens its
    // door (the owner's on-meet design): the person who answers is a full
    // person from then on. A world candidate's door counts them as reached.
    if (!api.state.people.has(openerId)) {
      if (input.fillCounted === false) {
        counted += 1;
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
      input.canvasserId === campaign.candidateId ? "door" : "volunteer-door",
      input.canvasserId,
      {
        carriesPlatform: true,
        weight: campaignParameter("doorContactWeight"),
        rapport: rapport(canvasser, answers),
      },
    );
    if (!cause) continue;
    if (input.canvasserId !== answers.id)
      api.relationship(input.canvasserId, answers.id, "contact", 0.1);
    met.push(cause);
    retell(api, campaign, answers, cause);
  }
  const doorRows = table(api, "doors");
  for (const household of done)
    if (!doorRows.get(`${campaign.id}|${household}`))
      doorRows.put({
        id: `${campaign.id}|${household}`,
        campaignId: campaign.id,
        householdId: household,
        date: api.state.date,
      } as unknown as ModuleRow);
  campaign = campaignFor(api, input.filingId);
  save(api, {
    ...campaign,
    doorsKnockedCount: (campaign.doorsKnockedCount ?? 0) + done.size - before,
    countedReached: (campaign.countedReached ?? 0) + counted,
  });
  return met;
}

/** The households a campaign's doors have reached. */
export function doorsKnockedOf(
  api: CoreAPI,
  campaignId: string,
): readonly string[] {
  return (
    table(api, "doors").query("byCampaign", [campaignId]) as unknown as {
      householdId: string;
    }[]
  ).map((row) => row.householdId);
}

/**
 * The kinds of business that sell what a campaign buys, by the census
 * industry they're recorded under: polling is NAICS 541910 (marketing
 * research and public opinion polling) and mail is 541860 (direct mail
 * advertising), both professional services, or a printer (NAICS 323,
 * manufacturing); an evening's venue is a hall, lodge or restaurant room.
 * A town's campaign-staff firm (political consulting) is the first seller of
 * polls and mail: campaigns are its customers.
 */
const SELLER_KINDS: Readonly<Record<Purchase, readonly string[]>> = {
  poll: ["enterprise:political-consulting", "enterprise:professional-services"],
  mail: [
    "enterprise:political-consulting",
    "enterprise:professional-services",
    "enterprise:manufacturing",
  ],
  event: [
    "enterprise:recreation",
    "enterprise:lodging",
    "enterprise:food-service",
    "enterprise:restaurant",
  ],
};
export type Purchase = "poll" | "mail" | "event";
const sellerCache = new WeakMap<object, Map<string, string | null>>();

/**
 * Who sells a campaign what it buys: a business in town of a fitting kind
 * (the first of the first fitting kind, in the order they're recorded), or
 * a registered stand-in seller where the town has none.
 */
export function seller(api: CoreAPI, purchase: Purchase): string {
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const cache = sellerCache.get(core) ?? new Map<string, string | null>();
  sellerCache.set(core, cache);
  const employers = core.organizationsByPlaceKind.get(`${town}:employer`);
  const key = `${purchase}|${employers?.size ?? 0}`;
  let found = cache.get(key);
  if (found === undefined) {
    found = null;
    const ids = [...(employers ?? [])].sort();
    for (const kind of SELLER_KINDS[purchase]) {
      found =
        ids.find((id) => core.organizations.get(id)?.classification === kind) ??
        null;
      if (found) break;
    }
    cache.set(key, found);
  }
  if (found) return found;
  return standInSeller(api, purchase);
}

/** A stand-in seller where the town has no business of the kind (registered). */
function standInSeller(api: CoreAPI, purchase: Purchase): string {
  if (purchase === "poll") {
    // stopgapId: SG-GOV-campaign-pollster-seller
    api.stopgap("SG-GOV-campaign-pollster-seller");
  } else if (purchase === "mail") {
    // stopgapId: SG-GOV-campaign-mail-seller
    api.stopgap("SG-GOV-campaign-mail-seller");
  } else {
    // stopgapId: SG-GOV-campaign-venue-seller
    api.stopgap("SG-GOV-campaign-venue-seller");
  }
  const id = `organization:campaign-${purchase}:${townRow(api).townPlaceId}`;
  if (!api.state.organizations.has(id))
    api.addOrganization({
      id,
      placeId: townRow(api).townPlaceId,
      name: purchase,
      kind: `campaign-${purchase}-seller`,
      liquidMinor: 0,
      source: {
        tag: "ESTIMATED",
        citation: `Stand-in seller of campaign ${purchase} where the town records no business of the kind`,
        asOf: api.state.date,
        estimatedFrom: `SG-GOV-campaign-${purchase === "event" ? "venue" : purchase === "poll" ? "pollster" : "mail"}-seller`,
      },
    });
  return id;
}

/** A unit price from the campaign price research, in minor units. */
function unitPrice(kind: string): number {
  const row = (
    unitPrices as unknown as {
      prices: Record<string, { priceMinorUnits: number }>;
    }
  ).prices[kind];
  if (!row) throw new Error(`No campaign unit price: ${kind}`);
  return row.priceMinorUnits;
}

/** Whether a work commitment has its holder at a shift at this minute of this day. */
function atWork(
  commitment: Readonly<{
    anchorDate: string;
    periodDays: number;
    slots: readonly {
      offsetDays: number;
      startMinute: number;
      minutes: number;
    }[];
    startsAt: string;
    endsAt?: string;
  }>,
  date: string,
  minute: number,
): boolean {
  if (commitment.startsAt > date) return false;
  if (commitment.endsAt !== undefined && commitment.endsAt <= date)
    return false;
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${commitment.anchorDate}T00:00:00Z`)) /
      86_400_000,
  );
  const day =
    ((days % commitment.periodDays) + commitment.periodDays) %
    commitment.periodDays;
  return commitment.slots.some(
    (slot) =>
      slot.offsetDays === day &&
      minute >= slot.startMinute &&
      minute < slot.startMinute + slot.minutes,
  );
}

/**
 * Ask someone to volunteer. They say yes when liking the candidate,
 * closeness, an outgoing or dutiful temperament outweigh the hours their
 * work already takes.
 */
export function askToVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge")
  )
    return false;
  const warmth = impressionOf(api, personId, campaign.candidateId)?.warmth ?? 0;
  // Whether they give their evenings to it: how much they like the
  // candidate, how close they are, every trait's lean toward volunteering,
  // against the hours their work already takes.
  const core = api.state as CoreState;
  const tie = closenessBetween(core, personId, campaign.candidateId);
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  const weeklyWork = [...(core.work.commitmentsByPerson.get(personId) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  const bare =
    warmth +
    campaignParameter("volunteerClosenessWeight") * (tie + family) -
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes") -
    campaignParameter("volunteerThreshold");
  const yes = leanedYes(
    api.state,
    person,
    "campaigns.volunteer",
    "volunteer",
    "decline",
    bare,
  );
  if (yes && !campaign.volunteerIds.includes(personId))
    save(api, {
      ...campaign,
      volunteerIds: [...campaign.volunteerIds, personId],
    });
  return yes;
}

/** The individual contribution limit for this contest, in minor units (null: no limit), and its source. */
export function contributionLimit(
  api: CoreAPI,
  contestId: string,
): {
  readonly minor: number | null;
  readonly source: string;
  readonly estimate: boolean;
} {
  const contest = elections(api, "contests").get(
    contestId,
  ) as unknown as ContestRow;
  const research = finance as unknown as {
    federal: {
      individualToCandidate: { usd: number; source: string; sourceUrl: string };
    };
    limits: Record<
      string,
      Record<
        string,
        | {
            usd: number | string;
            source: string;
            sourceUrl?: string;
            estimate?: boolean;
          }
        | string
      >
    >;
  };
  if (contest.family === "usHouse" || contest.officeId.endsWith(":us-senate")) {
    const federal = research.federal.individualToCandidate;
    return {
      minor: federal.usd * 100,
      source: `${federal.source} ${federal.sourceUrl}`,
      estimate: false,
    };
  }
  const key =
    contest.family === "statewideExecutive"
      ? "governor"
      : contest.family === "stateLegislative"
        ? contest.officeId.endsWith("legislature-upper")
          ? "stateSenate"
          : "stateHouse"
        : "local";
  const row = research.limits[townRow(api).stateKey]?.[key];
  if (row && typeof row === "object") {
    const source = [row.source, row.sourceUrl].filter(Boolean).join(" ");
    if (row.usd === "unlimited")
      return { minor: null, source, estimate: row.estimate ?? false };
    if (typeof row.usd === "number")
      return { minor: row.usd * 100, source, estimate: row.estimate ?? false };
  }
  const fallback = (
    limits as unknown as {
      fallback: { amountMinorUnits: number; source: string };
    }
  ).fallback;
  return {
    minor: fallback.amountMinorUnits,
    source: fallback.source,
    estimate: true,
  };
}

/**
 * Why a person would back a campaign with money or an evening, roughly -1 to
 * 1 per part: how warm they are toward the candidate, how far the platform
 * agrees with their own views, whether they share (or oppose) the
 * candidate's party, and how they stand with the candidate personally.
 */
function backingReasons(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): {
  readonly warmth: number;
  readonly agreement: number;
  readonly party: number;
  readonly relationship: number;
} {
  const warmth =
    impressionOf(api, person.id, campaign.candidateId)?.warmth ?? 0;
  const lean = personLean(api.state.people, person, townRow(api).lean);
  const agreement = agreementWith(api, person.id, lean, campaign.platform);
  const party = partyFit(api, campaign, person.id);
  const level = person.familyIds.has(campaign.candidateId)
    ? 1
    : clamp(closenessBetween(api.state, person.id, campaign.candidateId));
  return { warmth, agreement, party, relationship: level };
}

/** +1 for a member of the candidate's party, minus their party's distance from it otherwise. */
function partyFit(
  api: CoreAPI,
  campaign: CampaignRow,
  personId: string,
): number {
  if (!api.state.modules.has(PARTIES_MODULE_ID)) return 0;
  const label = filingOf(api, campaign.filingId)?.party ?? null;
  const tie = partyTie(api, personId);
  if (!label || !tie?.partyId) return 0;
  const theirs = partiesHere(api).find((p) => p.id === tie.partyId);
  if (!theirs) return 0;
  if (theirs.name.toLowerCase() === label.toLowerCase()) return 1;
  const a = partyLean(api, label)?.lean ?? 0;
  const b = partyLean(api, theirs.name)?.lean ?? 0;
  // Two parties a whole scale apart are opposed; two near each other, barely.
  return -Math.abs(a - b) / 2;
}

function filingOf(api: CoreAPI, filingId: string): FilingRow | undefined {
  return elections(api, "filings").get(filingId) as unknown as
    FilingRow | undefined;
}

export function giftOf(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): GiftRow | null {
  return (
    (table(api, "gifts").get(`${filingId}|${donorId}`) as unknown as
      GiftRow | undefined) ?? null
  );
}

/**
 * A donor's own reasons to give to a candidate: warmth, agreement with the
 * platform, party, how they stand with the candidate and every trait's lean
 * between giving and keeping. Above zero they would give if they have the
 * cash; at or below it they keep it (and a minor or the dead never give).
 */
export function donorReason(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): number {
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < 18)
    return Number.NEGATIVE_INFINITY;
  const why = backingReasons(api, campaign, donor);
  return leanedScore(
    api.state,
    donor,
    "campaigns.donate",
    "give",
    "keep",
    why.warmth +
      why.agreement +
      campaignParameter("donorPartyWeight") * why.party +
      campaignParameter("donorRelationshipWeight") * why.relationship,
  );
}

/**
 * Ask someone for money. What they'd give in all slides with their own
 * reasons (`donorReason`) and with the cash they have beyond a few months of
 * their own living costs; they give what they'd give beyond what they've
 * already given, never past the legal limit. The money moves from their
 * account to the campaign's through the journal, and their running total is
 * kept in one row the next ask reads.
 */
export function askForDonation(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): number {
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < 18) return 0;
  const reason = donorReason(api, filingId, donorId);
  const spare =
    donor.liquidMinor -
    campaignParameter("caseCushionMonths") * 30 * donor.livingCostDailyMinor;
  if (reason <= 0 || spare <= 0) return 0;
  const limit = contributionLimit(api, campaign.contestId);
  const gift = giftOf(api, filingId, donorId);
  const given = gift?.totalMinor ?? 0;
  const wanted =
    spare *
    Math.min(1, reason) *
    campaignParameter("donationShareOfCashPerWarmth");
  // Whole dollars: what they'd give in all, less what they've given.
  // A candidate's own money has no limit (Buckley v. Valeo, 424 U.S. 1,
  // 1976; state limits on contributions likewise cover others' gifts).
  const room =
    limit.minor === null || donorId === campaign.candidateId
      ? Infinity
      : limit.minor - given;
  const amount =
    Math.floor(Math.max(0, Math.min(wanted - given, room)) / 100) * 100;
  if (amount <= 0) return 0;
  postMoney(
    api,
    DONATION_KIND,
    `donation:${filingId}:${donorId}:${api.state.date}:${given}`,
    donorId,
    campaign.organizationId,
    amount,
    limit.source,
    limit.estimate,
  );
  table(api, "gifts").put({
    id: `${filingId}|${donorId}`,
    campaignId: filingId,
    donorId,
    totalMinor: given + amount,
    lastDate: api.state.date,
  } satisfies GiftRow as unknown as ModuleRow);
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + amount,
  });
  return amount;
}

/**
 * A purchase from the campaign's account to a seller, on the journal; the
 * campaign's books (spent, and spent by kind) read it.
 */
function spend(
  api: CoreAPI,
  filingId: string,
  input: {
    readonly kind: "ad" | Purchase;
    readonly sellerId: string;
    readonly amountMinor: number;
    readonly citation: string;
  },
): void {
  const campaign = campaignFor(api, filingId);
  postMoney(
    api,
    input.kind === "ad" ? AD_KIND : PURCHASE_KIND,
    `${input.kind}:${filingId}:${api.state.date}:${campaign.spentMinor}`,
    campaign.organizationId,
    input.sellerId,
    input.amountMinor,
    input.citation,
    false,
  );
  const byKind = { ...(campaign.spentByKind ?? {}) };
  byKind[input.kind] = (byKind[input.kind] ?? 0) + input.amountMinor;
  save(api, {
    ...campaign,
    spentMinor: campaign.spentMinor + input.amountMinor,
    spentByKind: byKind,
  });
}

function postMoney(
  api: CoreAPI,
  kind: string,
  id: string,
  from: string,
  to: string,
  amount: number,
  citation: string,
  estimate: boolean,
) {
  const date = api.state.date;
  const record: MoneyRecord = {
    id,
    kind,
    date,
    source: estimate
      ? { tag: "ESTIMATED", citation, asOf: date, estimatedFrom: citation }
      : { tag: "SOURCED", citation, asOf: date },
    postings: [
      {
        id: `${id}:out`,
        accountId: `cash:${from}:residual`,
        deltaMinor: -amount,
      },
      { id: `${id}:in`, accountId: `cash:${to}:residual`, deltaMinor: amount },
    ],
  };
  table(api, "money").put(record as unknown as ModuleRow);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${date}:${state.cashJournal.nextSequence}`,
    date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind, id },
    postings: record.postings,
  });
}

/**
 * Everyone a campaign can reach without canvassing a stranger, through the
 * records that link them: the candidate's family, the people they know and
 * have a relationship with, the members of their party in town, the people
 * the campaign has already reached, and its volunteers. In id order.
 */
export function reachablePeople(
  api: CoreAPI,
  campaign: CampaignRow,
): readonly string[] {
  const ids = new Set<string>(campaign.volunteerIds);
  const candidate = api.state.people.get(campaign.candidateId);
  if (candidate) {
    for (const id of candidate.familyIds) ids.add(id);
    for (const id of candidate.knownIds) ids.add(id);
    for (const rel of api.state.relationshipsByPerson.get(candidate.id) ?? []) {
      const row = api.state.relationships.get(rel);
      if (row)
        ids.add(row.actorId === candidate.id ? row.otherId : row.actorId);
    }
  }
  const label = filingOf(api, campaign.filingId)?.party ?? null;
  if (label && api.state.modules.has(PARTIES_MODULE_ID)) {
    const party = partiesHere(api).find(
      (p) => p.name.toLowerCase() === label.toLowerCase(),
    );
    if (party)
      for (const tie of api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .query("byParty", [party.id]) as unknown as TieRow[])
        ids.add(tie.personId);
  }
  for (const row of table(api, "impressions").query("byCandidate", [
    campaign.candidateId,
  ]) as unknown as ImpressionRow[])
    if (row.heardOf) ids.add(row.voterId);
  ids.delete(campaign.candidateId);
  return [...ids].sort();
}

/**
 * Who comes to a candidate's event: of the people the campaign can reach who
 * live in town, each adult whose own reasons to back the candidate (warmth,
 * agreement, party, how they stand with the candidate) and every trait's
 * lean toward attending outweigh the hours their work already takes. The
 * campaign's volunteers come.
 */
export function whoComes(
  api: CoreAPI,
  campaign: CampaignRow,
): readonly string[] {
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const volunteers = new Set(campaign.volunteerIds);
  return reachablePeople(api, campaign).filter((id) => {
    const person = core.people.get(id);
    if (!person?.alive || person.placeId !== town) return false;
    if (ageOn(person, api.state.date) < 18) return false;
    if (volunteers.has(id)) return true;
    const why = backingReasons(api, campaign, person);
    const weeklyWork = [...(core.work.commitmentsByPerson.get(id) ?? [])]
      .map((c) => core.work.commitments.get(c)?.expectedWeeklyMinutes ?? 0)
      .reduce((a, b) => a + b, 0);
    return (
      why.warmth +
        why.agreement +
        campaignParameter("donorPartyWeight") * why.party +
        campaignParameter("donorRelationshipWeight") * why.relationship +
        api.parameter("traitDecisionWeight") *
          decisionLean(
            api.state,
            person,
            "parties.attend",
            "attend",
            "stay-home",
          ) >
      weeklyWork / campaignParameter("turnoutWorkWeekMinutes")
    );
  });
}

/**
 * Give a speech. The audience is who chooses to come (`whoComes`); each
 * hears the platform, decides for themselves and tells their family. Every
 * statement is recorded as a promise.
 */
export function giveSpeech(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly venue: string;
    readonly statements: readonly Stance[];
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  return makeStatements(api, {
    ...input,
    audienceIds: whoComes(api, campaign),
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
}

/**
 * Statements made to an audience (a speech's crowd, an interview's readers or
 * viewers): each person in it hears the platform with the statements added,
 * decides for themselves and tells their family, and every statement is
 * recorded as a promise only its audience heard.
 */
export function makeStatements(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly venue: string;
    readonly statements: readonly Stance[];
    readonly audienceIds: readonly string[];
    readonly act: CampaignAct;
    readonly weight: number;
    /** In person: how the meeting goes adds to what they make of it. */
    readonly faceToFace: boolean;
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  // A state or federal candidate who isn't a full person has no rapport to read.
  const speaker = api.state.people.get(campaign.candidateId);
  const causes: CauseRow[] = [];
  // One entry per question: a stance on a question already in the platform
  // updates it.
  const said = new Map(input.statements.map((st) => [st.question, st]));
  const withStatements = {
    ...campaign,
    platform: [
      ...campaign.platform.map((st) => said.get(st.question) ?? st),
      ...[...said.values()].filter(
        (st) => !campaign.platform.some((p) => p.question === st.question),
      ),
    ],
  };
  for (const id of input.audienceIds) {
    const listener = api.state.people.get(id);
    if (!listener) continue;
    const cause = reach(
      api,
      withStatements,
      id,
      input.act,
      campaign.candidateId,
      {
        carriesPlatform: true,
        weight: input.weight,
        rapport:
          input.faceToFace && speaker ? rapport(speaker, listener) / 2 : 0,
      },
    );
    if (!cause) continue;
    causes.push(cause);
    retell(api, withStatements, listener, cause);
  }
  for (const stance of said.values()) {
    // Its own record: who, when, how, where and on which question.
    const promiseId = `promise:${campaign.candidateId}:${api.state.date}:${input.act}:${input.venue}:${stance.question}`;
    table(api, "promises").put({
      id: promiseId,
      candidateId: campaign.candidateId,
      contestId: campaign.contestId,
      date: api.state.date,
      stance,
      venue: input.venue,
      audience: causes.length,
    } as unknown as ModuleRow);
    // Who heard it: only they can hold the promise against the speaker.
    for (const cause of causes)
      api.observe(cause.voterId, {
        key: promiseId,
        value: "heard",
        learnedAt: api.state.date,
        sourceId: cause.id,
        access: input.faceToFace ? "perceived" : "public",
      });
  }
  save(api, {
    ...campaignFor(api, input.filingId),
    platform: withStatements.platform,
  });
  // In person (a speech, a town hall) and in a debate (owner, Oct 14: the
  // audience's views move by the same read as a speech), a candidate who is
  // a person is heard as a speaker on each statement's question: the speech
  // engine moves those who heard it by the candidate's standing with them
  // and lets them retell it at home. Interviews reach their readers and
  // viewers through the causes above.
  if (
    (input.faceToFace || input.act === "debate") &&
    speaker &&
    api.state.modules.has(SPEECH_MODULE_ID)
  ) {
    const audienceIds = [...new Set(causes.map((c) => c.voterId))].filter(
      (id) => id !== speaker.id && api.state.people.get(id)?.alive,
    );
    input.statements.forEach((statement, index) =>
      deliverSpeech(api, {
        id:
          statementSpeechId(campaign.candidateId, api.state.date, input) +
          (index ? `:${index}` : ""),
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: statement.question,
        desiredChange: statement.position > 0 ? "enact" : "repeal",
        audienceIds,
      }),
    );
  }
  return causes;
}

/** The speech a candidate's statements make, by who, when, how and where. */
export function statementSpeechId(
  candidateId: string,
  date: string,
  input: { readonly act: string; readonly venue: string },
): string {
  return `speech:${candidateId}:${date}:${input.act}:${input.venue}`;
}

/** Where an ad is bought: an outlet and its followers (the press registers it). */
let adOutlet:
  | ((api: CoreAPI) => {
      organizationId: string;
      followerIds: readonly string[];
      countedFollowers: number;
    } | null)
  | null = null;
export function registerAdOutlet(fn: typeof adOutlet): void {
  adOutlet = fn;
}

/**
 * Whom ad time reaches and who sells it: the town's outlet and its
 * followers. Where no press is open there is no outlet to sell ad time and
 * no audience to reach, so nothing is bought.
 */
export function adAudience(
  api: CoreAPI,
  amount: number,
): {
  readonly media: string;
  readonly viewers: readonly { p: PersonState }[];
  /** Counted adults the ad reaches, by the same rule times their count. */
  readonly countedViewers: number;
} | null {
  const outlet = adOutlet?.(api) ?? null;
  if (!outlet) return null;
  const contacts = Math.floor(
    (amount / 1000) * campaignParameter("adContactsPerThousandMinor"),
  );
  const full = outlet.followerIds
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => p !== undefined);
  // One rule for both tiers: the contacts the money buys fall on the outlet's
  // followers, full and counted alike, in the same proportion; the most
  // engaged full followers are reached first.
  const followers = full.length + outlet.countedFollowers;
  const share = followers ? Math.min(1, contacts / followers) : 0;
  const viewers = full
    .slice(0, Math.round(share * full.length))
    .map((p) => ({ p }));
  return {
    media: outlet.organizationId,
    viewers,
    countedViewers: Math.round(share * outlet.countedFollowers),
  };
}

/** Whether this world sells ad time: the campaigns engine is installed and open. */
export function adTimeForSale(api: CoreAPI): boolean {
  return (
    (api.state as CoreState).modules.has(CAMPAIGNS_MODULE_ID) &&
    table(api, "town").get("town") !== undefined &&
    (adOutlet?.(api) ?? null) !== null
  );
}

/**
 * Buy ad time outside a campaign (a cause group's ad): the buyer pays the
 * seller on the journal and gets the people the ad reaches, the same
 * audience a campaign's ad buys.
 */
export function buyAdTime(
  api: CoreAPI,
  input: {
    readonly buyerId: string;
    readonly amountMinor: number;
    readonly recordId: string;
    readonly citation: string;
  },
): readonly PersonState[] {
  if (input.amountMinor <= 0) return [];
  const sold = adAudience(api, input.amountMinor);
  if (!sold) return [];
  const { media, viewers } = sold;
  postMoney(
    api,
    AD_KIND,
    input.recordId,
    input.buyerId,
    media,
    input.amountMinor,
    input.citation,
    false,
  );
  return viewers.map((row) => row.p);
}

/**
 * Run an ad: spend from the campaign's account on the town outlet's ad time;
 * the people it reaches are that outlet's followers. An attack ad carries a rival's public record
 * and moves warmth toward the rival down for people who disagree with it.
 */
export function runAd(
  api: CoreAPI,
  input: {
    readonly filingId: string;
    readonly amountMinor: number;
    readonly attackFilingId?: string;
    /** Leave the message's event to the caller (a campaign turn sends one for all it bought). */
    readonly quiet?: boolean;
  },
): readonly CauseRow[] {
  const campaign = campaignFor(api, input.filingId);
  const account = api.state.organizations.get(campaign.organizationId)!;
  const available = (api.state as CoreState).cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? campaign.raisedMinor - campaign.spentMinor
    : 0;
  const amount = Math.min(input.amountMinor, available);
  void account;
  if (amount <= 0) return [];
  const sold = adAudience(api, amount);
  if (!sold) return [];
  const { media, viewers, countedViewers } = sold;
  spend(api, input.filingId, {
    kind: "ad",
    sellerId: media,
    amountMinor: amount,
    citation: "Ad buy from the outlet's ad time",
  });
  const target = input.attackFilingId
    ? campaignFor(api, input.attackFilingId)
    : campaign;
  // The counted adults the ad reached are counted as reached, as a mailer's
  // are, and the buy is kept as a record of who it reached.
  if (countedViewers > 0) {
    const reached = campaignFor(api, target.filingId);
    save(api, {
      ...reached,
      countedReached: (reached.countedReached ?? 0) + countedViewers,
    });
  }
  if (viewers.length + countedViewers > 0) {
    const buyer = campaignFor(api, campaign.filingId);
    save(api, {
      ...buyer,
      adReaches: [
        ...(buyer.adReaches ?? []),
        {
          id: `ad-reach:${campaign.id}:${api.state.date}:${buyer.spentMinor}`,
          date: api.state.date,
          outletId: media,
          full: viewers.length,
          counted: countedViewers,
        },
      ],
    });
  }
  const causes: CauseRow[] = [];
  for (const { p } of viewers) {
    // An attack ad shows the viewer the rival's record at its worst for them:
    // the votes they disagree with and the promises broken. A clean record
    // gives it nothing to show.
    const attack = input.attackFilingId
      ? recordAppeal(
          api,
          p,
          target.candidateId,
          personLean(api.state.people, p, townRow(api).lean),
          true,
          true,
        ).reasons.filter((r) => r.effect < 0)
      : null;
    if (attack && !attack.length) continue;
    // The ad tells them of the broken promises it shows.
    for (const reason of attack ?? [])
      if (reason.kind === "broken-promise")
        api.observe(p.id, {
          key: reason.itemId,
          value: "shown-broken",
          learnedAt: api.state.date,
          sourceId: `attack-ad:${campaign.candidateId}:${api.state.date}`,
          access: "public",
        });
    const cause = reach(
      api,
      target,
      p.id,
      attack ? "attack-ad" : "ad",
      campaign.candidateId,
      {
        carriesPlatform: !attack,
        weight: campaignParameter("adWarmthWeight"),
        rapport: 0,
        ...(attack
          ? { target: clamp(attack.reduce((sum, r) => sum + r.effect, 0)) }
          : {}),
      },
    );
    if (cause) causes.push(cause);
  }
  // The ad's message is a public record its viewers saw: the views engine
  // moves each one's stance on its question.
  if (!input.attackFilingId && !input.quiet)
    emitMessage(api, campaign, {
      kind: "campaign-ad",
      id: `campaign-ad:${campaign.id}:${api.state.date}:${campaign.spentMinor}`,
      witnessIds: causes.map((c) => c.voterId),
    });
  return causes;
}

/**
 * A paid message (an ad, a mailer) as an event its audience learns: it
 * carries the campaign's strongest stance as a topic and the change the
 * candidate wants, and the candidate's lean on the views engine's scale, so
 * the views engine moves each reader's or viewer's stance on that question
 * (nearer the candidate, more).
 */
function emitMessage(
  api: CoreAPI,
  campaign: CampaignRow,
  input: {
    readonly kind: string;
    readonly id: string;
    readonly witnessIds: readonly string[];
  },
): void {
  const lead = [...campaign.platform].sort(
    (a, b) =>
      Math.abs(b.position) - Math.abs(a.position) ||
      a.question.localeCompare(b.question),
  )[0];
  const witnessIds = [...new Set(input.witnessIds)].filter(
    (id) => id !== campaign.candidateId && api.state.people.has(id),
  );
  if (!lead || lead.position === 0 || !witnessIds.length) return;
  api.emit({
    id: input.id,
    date: api.state.date,
    kind: input.kind,
    personIds: api.state.people.has(campaign.candidateId)
      ? [campaign.candidateId]
      : [],
    witnessIds,
    placeId: townRow(api).townPlaceId,
    topic: lead.question,
    desiredChange: lead.position > 0 ? "enact" : "repeal",
    moodImpulse: campaignParameter("adViewsImpulse"),
    facts: {
      campaignId: campaign.id,
      candidateId: campaign.candidateId,
      // The views engine weighs the message by how each person stands with
      // the candidate who makes the case.
      [VIEWS_SPEAKER_KEY]: campaign.candidateId,
    },
    source: {
      tag: "SOURCED",
      citation: `Campaign ${campaign.id} paid message`,
      asOf: api.state.date,
    },
  });
}

/**
 * Ask someone to endorse. They endorse only the candidate whose platform they
 * agree with most among those they know of, never for a price; everyone who
 * knows them hears it.
 */
export function askForEndorsement(
  api: CoreAPI,
  filingId: string,
  endorserId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const endorser = api.state.people.get(endorserId);
  if (!endorser?.alive) return false;
  const lean = personLean(api.state.people, endorser, townRow(api).lean);
  const raw = agreementWith(api, endorserId, lean, campaign.platform);
  const mine =
    raw +
    api.parameter("traitDecisionWeight") *
      decisionLean(
        api.state,
        endorser,
        "campaigns.endorse",
        "endorse",
        "decline",
      );
  const rivals = (
    table(api, "campaigns").query("byContest", [
      campaign.contestId,
    ]) as unknown as CampaignRow[]
  )
    .filter((c) => c.id !== campaign.id)
    .map((c) => agreementWith(api, endorserId, lean, c.platform));
  if (mine <= 0 || rivals.some((r) => r >= raw)) return false;
  for (const id of [...endorser.knownIds, ...endorser.familyIds]) {
    const listener = api.state.people.get(id);
    if (!listener) continue;
    reach(api, campaign, id, "endorsement", endorserId, {
      carriesPlatform: true,
      weight: campaignParameter("endorsementWeight"),
      rapport: 0,
      target: clamp(mine),
    });
  }
  return true;
}

/**
 * A poll's 95 percent margin of error on the leader's share, from the
 * Agresti-Coull interval (Agresti and Coull 1998): two more answers for and
 * two against, so a poll where every respondent names the same candidate
 * still has a margin. Null where nobody answered.
 */
export function pollMargin(lead: number, contacted: number): number | null {
  if (contacted <= 0) return null;
  const adjusted = (lead + 2) / (contacted + 4);
  return (
    Math.round(
      1.96 * Math.sqrt((adjusted * (1 - adjusted)) / (contacted + 4)) * 1000,
    ) / 1000
  );
}

/**
 * Commission a poll: the pollster calls adults in the town in a fixed order
 * from the pollster's list (the sampling frame), and records what each said.
 * Someone who has heard of no candidate is undecided; someone who leans
 * toward a candidate but avoids conflict says "no opinion". True support is
 * never reported, only what people said.
 */
export function commissionPoll(
  api: CoreAPI,
  input: { readonly filingId: string; readonly sampleSize: number },
): PollRow {
  const campaign = campaignFor(api, input.filingId);
  const town = townRow(api).townPlaceId;
  const date = api.state.date;
  const core = api.state as CoreState;
  // The whole town is the frame: full people and the counted residents.
  const rt = residentsRuntime(core);
  const frame = [
    ...[...api.state.people.values()]
      .filter((p) => p.alive && p.placeId === town && ageOn(p, date) >= 18)
      .map((p) => ({ id: p.id, traits: p.traits, birthDate: p.birthDate })),
    ...[...(rt?.store.liveHouseholds() ?? [])]
      .filter((h) => h.placeId === town)
      .flatMap((h) => rt!.store.countedMembers(h))
      .filter(
        (m) =>
          !api.state.people.has(rt!.store.ids[m]!) &&
          ageOn({ birthDate: rt!.store.born[m]! }, date) >= 18,
      )
      .map((m) => ({
        id: rt!.store.ids[m]!,
        traits: rt!.store.packedTraits(m),
        birthDate: rt!.store.born[m]!,
      })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  // The pollster is paid per completed interview, from the campaign's money.
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  const available = core.cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? campaign.raisedMinor - campaign.spentMinor
    : 0;
  const affordable = Math.min(
    input.sampleSize,
    Math.floor(available / Math.max(1, perInterview)),
  );
  const offset =
    (table(api, "polls").query("byContest", [campaign.contestId]).length *
      input.sampleSize) %
    Math.max(1, frame.length);
  const dialed = [...frame.slice(offset), ...frame.slice(0, offset)];
  // Most people called don't take a poll; who does is who'd answer a stranger.
  const respondents: (typeof frame)[number][] = [];
  for (const person of dialed) {
    if (respondents.length >= affordable) break;
    if (
      leanedYes(
        api.state,
        person,
        "campaigns.answer-poll",
        "answer",
        "no-opinion",
        (ageOn(person, date) - campaignParameter("doorAnswerPivotAge")) /
          campaignParameter("doorAnswerAgeSpan") -
          campaignParameter("pollAnswerThreshold"),
      )
    )
      respondents.push(person);
  }
  const answers: Record<string, number> = {};
  const lean0 = townRow(api).lean;
  const filings = ballot(api, campaign.contestId);
  for (const person of respondents) {
    const impressions = (
      table(api, "impressions").query("byVoter", [
        person.id,
      ]) as unknown as ImpressionRow[]
    )
      .filter((i) => i.contestId === campaign.contestId && i.heardOf)
      .sort((a, b) => b.warmth - a.warmth);
    const best = impressions[0];
    // Someone no campaign reached names their party's candidate if they
    // hold a party view, else they're undecided.
    const lean = personLean(api.state.people, person, lean0);
    const partyPick =
      Math.abs(lean) >= campaignParameter("pollPartyCue")
        ? filings.find((f) => partySide(f.party ?? null) === Math.sign(lean))
        : undefined;
    const answer =
      best && best.warmth > 0
        ? decisionLean(
            api.state,
            person,
            "campaigns.answer-poll",
            "answer",
            "no-opinion",
          ) < 0
          ? "no-opinion"
          : best.candidateId
        : (partyPick?.personId ?? "undecided");
    answers[answer] = (answers[answer] ?? 0) + 1;
  }
  const n = respondents.length;
  const lead = Math.max(
    0,
    ...Object.entries(answers)
      .filter(([k]) => k !== "undecided" && k !== "no-opinion")
      .map(([, v]) => v),
  );
  const poll: PollRow = {
    id: `poll:${campaign.id}:${date}:${offset}`,
    campaignId: campaign.id,
    contestId: campaign.contestId,
    date,
    contacted: n,
    answers,
    marginOfError: pollMargin(lead, n),
    respondentIds: respondents.map((p) => p.id),
  };
  // An empty poll isn't a poll: nothing is paid or kept.
  if (n === 0) return poll;
  spend(api, input.filingId, {
    kind: "poll",
    sellerId: seller(api, "poll"),
    amountMinor: n * perInterview,
    citation: "Poll interviews at pollCostPerInterviewMinor",
  });
  table(api, "polls").put(poll as unknown as ModuleRow);
  return poll;
}

/** Why one person feels as they do about a candidate: every recorded cause, oldest first. */
export function causesFor(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): readonly CauseRow[] {
  return (
    table(api, "causes").query("byVoter", [voterId]) as unknown as CauseRow[]
  )
    .filter((c) => c.candidateId === candidateId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Mail: the campaign addresses its next households in town, as many as the
 * money buys at the printer's and postage's unit prices. The adults in a
 * full household read it (a recorded cause, and the views engine reads the
 * message); a counted household's adults are counted as reached without
 * filling anyone in. Returns the full people it reached.
 */
export function sendMail(
  api: CoreAPI,
  filingId: string,
  amountMinor: number,
  /** Leave the message's event to the caller (a campaign turn). */
  quiet = false,
): readonly CauseRow[] {
  const campaign = campaignFor(api, filingId);
  const perPiece = unitPrice("mailer-print") + unitPrice("postage");
  const { list } = townAddresses(api);
  const pieces = Math.min(list.length, Math.floor(amountMinor / perPiece));
  if (pieces <= 0) return [];
  spend(api, filingId, {
    kind: "mail",
    sellerId: seller(api, "mail"),
    amountMinor: pieces * perPiece,
    citation:
      "Mailers at the campaign-unit-prices mailer-print and postage rows",
  });
  let cursor = campaign.mailCursor ?? 0;
  let counted = 0;
  const causes: CauseRow[] = [];
  for (let i = 0; i < pieces; i += 1) {
    const address = list[cursor % list.length]!;
    cursor += 1;
    const adults = adultsAt(api, address);
    if (address.counted) {
      counted += adults.length;
      continue;
    }
    for (const adult of adults) {
      const cause = reach(
        api,
        campaign,
        adult.id,
        "mail",
        campaign.candidateId,
        {
          carriesPlatform: true,
          weight: campaignParameter("mailWarmthWeight"),
          rapport: 0,
        },
      );
      if (cause) causes.push(cause);
    }
  }
  const after = campaignFor(api, filingId);
  save(api, {
    ...after,
    mailCursor: cursor % Math.max(1, list.length),
    countedReached: (after.countedReached ?? 0) + counted,
  });
  if (!quiet)
    emitMessage(api, after, {
      kind: "campaign-mail",
      id: `campaign-mail:${campaign.id}:${api.state.date}:${cursor}`,
      witnessIds: causes.map((c) => c.voterId),
    });
  return causes;
}

/**
 * An event: the campaign rents an evening at a venue in town and the
 * candidate speaks on what they feel most strongly about to whoever chooses
 * to come (`whoComes`). Only a candidate who is a full person speaks in a
 * room.
 */
export function holdEvent(api: CoreAPI, filingId: string): readonly CauseRow[] {
  const campaign = campaignFor(api, filingId);
  if (!api.state.people.get(campaign.candidateId)?.alive) return [];
  const lead = [...campaign.platform].sort(
    (a, b) =>
      Math.abs(b.position) - Math.abs(a.position) ||
      a.question.localeCompare(b.question),
  )[0];
  if (!lead) return [];
  const venue = seller(api, "event");
  spend(api, filingId, {
    kind: "event",
    sellerId: venue,
    amountMinor: unitPrice("event-venue"),
    citation: "An evening's venue at the campaign-unit-prices event-venue row",
  });
  return makeStatements(api, {
    filingId,
    venue,
    statements: [lead],
    audienceIds: whoComes(api, campaign),
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
}

/**
 * A world candidate asks for more than money: the people the campaign can
 * reach to give their evenings (`askToVolunteer`, a few each turn, in turn)
 * and the people closest to the candidate to put their name behind them
 * (`askForEndorsement`, each asked once, the closest first). Each person
 * answers from their own record and traits; the controlled person is never
 * asked here. Volunteers join the campaign's reachable people and come to its
 * events; an endorsement reaches the endorser's circle as a cause on record.
 */
export function askForSupport(api: CoreAPI, filingId: string): void {
  const campaign = campaignFor(api, filingId);
  const playerId = (api.state as CoreState).playerId;
  const pool = reachablePeople(api, campaign).filter(
    (id) => id !== playerId && !campaign.volunteerIds.includes(id),
  );
  const asks = Math.min(pool.length, campaignParameter("volunteerAsksPerTurn"));
  const from = pool.length ? (campaign.volunteerCursor ?? 0) % pool.length : 0;
  for (let i = 0; i < asks; i += 1)
    askToVolunteer(api, filingId, pool[(from + i) % pool.length]!);
  const candidate = api.state.people.get(campaign.candidateId);
  const asked = new Set(campaign.endorsementAskedIds ?? []);
  const closest = candidate
    ? [...new Set([...candidate.familyIds, ...candidate.knownIds])]
        .filter(
          (id) =>
            id !== playerId && id !== candidate.id && !asked.has(id),
        )
        .map((id) => ({
          id,
          tie: closenessBetween(api.state, id, candidate.id),
        }))
        .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))
        .slice(0, campaignParameter("endorsementAsksPerTurn"))
    : [];
  const said: string[] = [];
  for (const { id } of closest) {
    asked.add(id);
    if (askForEndorsement(api, filingId, id)) said.push(id);
  }
  save(api, {
    ...campaignFor(api, filingId),
    volunteerCursor: pool.length ? (from + asks) % pool.length : 0,
    endorsementAskedIds: [...asked],
    endorserIds: [...(campaign.endorserIds ?? []), ...said],
  });
}

/** What one campaign turn did, for the record and the tests. */
export interface CampaignTurnResult {
  readonly filingId: string;
  readonly asked: number;
  readonly raisedMinor: number;
  readonly spentMinor: number;
  readonly doors: number;
  readonly adReached: number;
  readonly mailReached: number;
  readonly eventAudience: number;
  readonly polled: number;
}

/**
 * One world candidate's campaign turn. They ask for money from the people
 * the campaign can reach (a few dozen a turn, in turn), knock doors in town
 * for the hours their own day leaves free (a candidate who is a full person
 * living here), and spend what the campaign holds on the reach it buys:
 * ads, mail, an event's venue and a poll, in shares that slide with the
 * candidate's own sociability and deliberation, at a pace that spends it all
 * by election day.
 */
export function campaignTurn(
  api: CoreAPI,
  filingId: string,
  electionDate: string,
): CampaignTurnResult {
  let campaign = campaignFor(api, filingId);
  const startRaised = campaign.raisedMinor;
  const startSpent = campaign.spentMinor;
  const candidate = api.state.people.get(campaign.candidateId);
  const town = townRow(api).townPlaceId;
  // Money: the next people in the campaign's list.
  // The candidate backs their own campaign first, by the same reasons.
  if (candidate?.alive) askForDonation(api, filingId, candidate.id);
  // The controlled person's money moves only by their own choice (owner,
  // Oct 14: the engine offers, the player decides), so a world campaign's
  // asks skip them; an ask that reaches them is a request they answer.
  const playerId = (api.state as CoreState).playerId;
  const pool = reachablePeople(api, campaign).filter((id) => id !== playerId);
  const asks = Math.min(pool.length, campaignParameter("donorAsksPerTurn"));
  const from = pool.length ? (campaign.askCursor ?? 0) % pool.length : 0;
  for (let i = 0; i < asks; i += 1)
    askForDonation(api, filingId, pool[(from + i) % pool.length]!);
  save(api, {
    ...campaignFor(api, filingId),
    askCursor: pool.length ? (from + asks) % pool.length : 0,
  });
  // Doors: a candidate who lives here walks for the hours their day leaves.
  let doors = 0;
  if (candidate?.alive && candidate.placeId === town) {
    const hours =
      (candidate.jobId
        ? campaignParameter("rivalHoursWithJob")
        : campaignParameter("rivalHoursWithoutJob")) *
      Math.max(
        0,
        1 +
          api.parameter("traitDecisionWeight") *
            decisionLean(
              api.state,
              candidate,
              "campaigns.rival-hours",
              "campaign",
              "rest",
            ),
      );
    doors = knockDoors(api, {
      filingId,
      canvasserId: candidate.id,
      hours,
      fillCounted: false,
    }).length;
  }
  // Spending: the share of what's free that keeps an even pace to election day.
  campaign = campaignFor(api, filingId);
  const turnDays = campaignParameter("campaignTurnDays");
  const daysLeft = Math.max(
    0,
    Math.round(
      (Date.parse(`${electionDate}T00:00:00Z`) -
        Date.parse(`${api.state.date}T00:00:00Z`)) /
        86_400_000,
    ),
  );
  const held = (campaign.eventFundMinor ?? 0) + (campaign.pollFundMinor ?? 0);
  const free = Math.max(0, campaign.raisedMinor - campaign.spentMinor - held);
  const budget = Math.floor(
    free * Math.min(1, turnDays / Math.max(turnDays, daysLeft)),
  );
  const trait = (key: string) => candidate?.traits[key] ?? 0;
  const w = campaignParameter("spendTraitWeight");
  const shares = {
    ad: campaignParameter("adSpendShare"),
    mail: campaignParameter("mailSpendShare"),
    // Only a candidate who is a person stands in a room.
    event: candidate?.alive
      ? campaignParameter("eventSpendShare") *
        Math.max(0, 1 + w * trait("people-mind-v1:sociability"))
      : 0,
    poll:
      campaignParameter("pollSpendShare") *
      Math.max(0, 1 + w * trait("people-mind-v1:deliberation")),
  };
  const total = shares.ad + shares.mail + shares.event + shares.poll || 1;
  const part = (k: keyof typeof shares) =>
    Math.floor((budget * shares[k]) / total);
  let adReached = 0;
  let mailReached = 0;
  let eventAudience = 0;
  let polled = 0;
  // What the turn bought reaches its audiences as one message, which the
  // views engine reads once for each person it reached.
  const told: string[] = [];
  if (part("ad") > 0) {
    const seen = runAd(api, {
      filingId,
      amountMinor: part("ad"),
      quiet: true,
    });
    adReached = seen.length;
    for (const c of seen) told.push(c.voterId);
  }
  if (part("mail") > 0) {
    const read = sendMail(api, filingId, part("mail"), true);
    mailReached = read.length;
    for (const c of read) told.push(c.voterId);
  }
  if (told.length)
    emitMessage(api, campaignFor(api, filingId), {
      kind: "campaign-message",
      id: `campaign-message:${filingId}:${api.state.date}`,
      witnessIds: told,
    });
  // An event and a poll are bought whole: the campaign sets money aside
  // toward them until it covers one.
  campaign = campaignFor(api, filingId);
  let eventFund = (campaign.eventFundMinor ?? 0) + part("event");
  let pollFund = (campaign.pollFundMinor ?? 0) + part("poll");
  save(api, {
    ...campaign,
    eventFundMinor: eventFund,
    pollFundMinor: pollFund,
  });
  if (eventFund >= unitPrice("event-venue") && daysLeft > 0) {
    eventAudience = holdEvent(api, filingId).length;
    eventFund -= unitPrice("event-venue");
  }
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  if (pollFund >= campaignParameter("pollMinimumInterviews") * perInterview) {
    // Set aside before the call: what was put by is free to pay for it.
    save(api, { ...campaignFor(api, filingId), pollFundMinor: 0 });
    const poll = commissionPoll(api, {
      filingId,
      sampleSize: Math.floor(pollFund / perInterview),
    });
    polled = poll.contacted;
    pollFund -= poll.contacted * perInterview;
  }
  save(api, {
    ...campaignFor(api, filingId),
    eventFundMinor: eventFund,
    pollFundMinor: pollFund,
  });
  askForSupport(api, filingId);
  const after = campaignFor(api, filingId);
  return {
    filingId,
    asked: asks,
    raisedMinor: after.raisedMinor - startRaised,
    spentMinor: after.spentMinor - startSpent,
    doors,
    adReached,
    mailReached,
    eventAudience,
    polled,
  };
}

const contestsSeen = new WeakMap<object, number>();

/**
 * Every few days, each world candidate on the ballot of a contest the town
 * votes in (the player excepted) takes a campaign turn, from the day they
 * filed to election day. Races are noted when their contest appears (the
 * contests table read only when it has grown) and dropped once decided.
 */
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

function campaignWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "campaign-turn") return;
  scheduleTurn(api);
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const date = api.state.date;
  const contests = elections(api, "contests");
  const races = table(api, "races");
  if (contestsSeen.get(api.state) !== contests.size) {
    for (const row of contests.rows() as unknown as ContestRow[])
      if (row.electionDate >= date && !races.get(row.id))
        races.put({
          id: row.id,
          electionDate: row.electionDate,
        } as unknown as ModuleRow);
    contestsSeen.set(api.state, contests.size);
  }
  const playerId = (api.state as CoreState).playerId;
  const turnDays = campaignParameter("campaignTurnDays");
  for (const race of (
    races.rows() as unknown as {
      id: string;
      electionDate: string;
      lastTurn?: string;
    }[]
  ).slice()) {
    if (race.electionDate < date) {
      races.remove(race.id);
      continue;
    }
    // A campaign works harder as election day nears: far out its people
    // turn to it now and then, in the last weeks every few days.
    const daysLeft = daysBetween(date, race.electionDate);
    const every =
      turnDays * (1 + daysLeft / campaignParameter("campaignRampDays"));
    if (race.lastTurn && daysBetween(race.lastTurn, date) < every) continue;
    races.put({ ...race, lastTurn: date } as unknown as ModuleRow);
    for (const filing of ballot(api, race.id))
      if (
        filing.status === "on-ballot" &&
        filing.personId !== playerId &&
        filing.filedOn <= date
      )
        campaignTurn(api, filing.id, race.electionDate);
  }
}

/**
 * How much of the town a campaign has reached, 0 to 1: the full people who
 * have heard of the candidate and the counted adults its doors and mail
 * reached, over the town's adults of both kinds.
 */
export function campaignRecognition(api: CoreAPI, filingId: string): number {
  const campaign = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (!campaign) return 0;
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  let namedAdults = 0;
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const p = core.people.get(id);
    if (p?.alive && ageOn(p, api.state.date) >= 18) namedAdults += 1;
  }
  const heard = (
    table(api, "impressions").query("byCandidate", [
      campaign.candidateId,
    ]) as unknown as ImpressionRow[]
  ).filter((i) => i.heardOf).length;
  const { countedAdults } = townAddresses(api);
  const all = namedAdults + countedAdults;
  return all
    ? Math.min(
        1,
        (heard + Math.min(countedAdults, campaign.countedReached ?? 0)) / all,
      )
    : 0;
}

export type { ContestRow };
