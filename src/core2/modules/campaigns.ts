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
import { townOutsideOf } from "../opening-outside-market";
import { candidateIdentity } from "../candidate-identity";
import {
  countedResidents,
  customPolitics,
  registerElectorate,
} from "../electorate";
import { partySide } from "../appointments";
import { residentsRuntime } from "./residents";
import { fillInPerson } from "../state";
import { keepsWhy } from "../why-kept";
import { closenessBetween } from "../closeness";
import {
  decisionLean,
  leanedScore,
  leanedYes,
  termOfLean,
} from "../trait-decisions";
import { campaignDayChoices, takeCampaignDayChoice } from "../campaign-day";
import limits from "../../../data/research/campaign-reality/campaign-contribution-limits.json" with { type: "json" };
import unitPrices from "../../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import finance from "../../../data/research/campaigns/campaign-finance-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type {
  CoreAPI,
  CoreEventInput,
  PersonId,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import type { ModuleRow } from "../module-data";
import type { ModuleCalendarWork } from "../module-calendar";
import type { CashJournalSourceSlot } from "../journal-state";
import {
  addDays,
  ageOnDate,
  makeIsoDate,
  daysBetweenText as daysBetween,
} from "../kernel/dates";
import { townDistrict } from "../offices-state";
import { worldLevel } from "../world-draw";
import { basePlaces } from "../race-places";
import { logistic } from "../kernel/deterministic-math";
import { OPENING_CARRY } from "../turnout";
import { transferCash } from "../world-transfer";
import { medianTransactionBalance } from "../starting-cash";
import {
  campaignParameter,
  districtLean,
  groupAgreement,
  personLean,
  type Stance,
} from "../campaign-views";
import { candidatePlatform, partyLean } from "../campaign-stances";
import { contestPositions } from "../contest-positions";
import {
  PARTIES_MODULE_ID,
  partiesHere,
  partyTie,
  type TieRow,
} from "./parties";
import {
  agreementWith,
  countedStanceProfile,
  viewOn,
  VIEWS_SPEAKER_KEY,
} from "./views";
import {
  LEGISLATURE_MODULE_ID,
  provisionStance,
  type BillRow,
} from "./legislature";
import { recordAppeal } from "./record";
import { deliverSpeech, SPEECH_MODULE_ID } from "./speech";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import {
  ACCEPTING_MOVES,
  REFUSING_MOVES,
  answerInterview,
  candidateAnswers,
  PRESS_MODULE_ID,
} from "./press";
import { newsKey } from "./news";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  petitionCirculating,
  petitionOf,
  signPetition,
  standing,
  type ContestRow,
  type FilingRow,
  type PetitionSigner,
  worldSwing,
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
  /** What its evenings of knocking owe toward the next door that opens (a share of one). */
  readonly doorAnswerCarry?: number;
  readonly raisedMinor: number;
  readonly spentMinor: number;
  /** Where the next turn's asks for money start in the campaign's list of people it can reach. */
  readonly askCursor?: number;
  /** Where the next turn's asks to volunteer start in the same list. */
  readonly volunteerCursor?: number;
  /** Everyone who heard of the filing and weighed offering to help (each weighs once). */
  readonly offerWeighedIds?: readonly string[];
  /** Everyone close who heard of the filing and weighed offering to run the campaign (each weighs once). */
  readonly managerWeighedIds?: readonly string[];
  /** The day the last offer to help came. */
  readonly lastOfferOn?: string;
  /** Everyone already asked for an endorsement (each ask is made once). */
  readonly endorsementAskedIds?: readonly string[];
  /** Those who said yes: they endorsed, and their circle heard it. */
  readonly endorserIds?: readonly string[];
  /** The candidate's circle already asked to sign the petition (each ask is made once). */
  readonly petitionAskedIds?: readonly string[];
  /** The day the candidate last asked their circle to sign. */
  readonly petitionAskedOn?: string;
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
  /** How much of the like-minded adults outside the town its lists have reached, 0 to 1. */
  readonly outsideReached?: number;
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
  /**
   * How many people one row stands for: 1 (absent) for a named donor, the
   * count of an outside place's donors for an `outside:` row, whose limit is
   * read per person (total over donors).
   */
  readonly donors?: number;
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

/**
 * What a resident said at the door when a campaign asked for their vote
 * (owner, Oct 29: a "yes" at the door is near-binding). Written at the knock
 * from the same rule the door's own answer comes from, for every candidate's
 * door and both tiers: a full person's warmth after the visit, or for a
 * counted resident what that visit makes of their record. The ballot reads
 * it (`voting.ts`), and the door scene tells it.
 */
export interface PledgeRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  readonly contestId: string;
  /** The day they said it. */
  readonly date: string;
  /** Who knocked: the candidate or one of their volunteers. */
  readonly canvasserId: string;
  /** The visit's recorded cause (a full person's), or null for a counted resident. */
  readonly causeId: string | null;
  /** How warm the answer was, 0 to 1: the yes's own firmness, kept for the scene. */
  readonly firmness: number;
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
      /** Each resident's "yes" at a campaign's door, one row a voter and candidate in a contest. */
      pledges: {
        indexes: {
          byVoter: { fields: ["voterId"] },
          byCandidate: { fields: ["candidateId"] },
        },
      },
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
      /** Each paid message's reach, by contest, for word of it passed on. */
      messages: { indexes: { byContest: { fields: ["contestId"] } } },
      /** Word of a rival's message passed to a candidate, one row each. */
      rivalWord: { indexes: { byCandidate: { fields: ["candidateId"] } } },
      town: {},
    },
  },
  onCalendarWork: (api, work) => campaignWork(api, work),
  onDay: (api) => {
    offersToHelp(api);
    rivalWordPassedOn(api);
  },
  // The candidate's answer to an offer, said in the scene it stages.
  eventKinds: ["scene.reply"],
  onEvent: (api, event) => answerOffer(api, event),
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
        districtLean(
          district?.geoid ?? null,
          town.stateKey,
          worldSwing(api.state.seed, town.stateKey.slice(3)),
        ) + customPolitics(core).leanShift,
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

/**
 * The town's lean, right positive: the one reader every engine uses (voting,
 * the legislatures, recalls, staff, ballot measures, stances). Read once a
 * day, since the counted electorate asks it once per voter; 0 before the
 * campaigns engine opens.
 */
export function townLean(api: CoreAPI): number {
  const held = townLeans.get(api.state);
  if (held?.date === api.state.date) return held.lean;
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return 0;
  const lean =
    (table(api, "town").get("town") as unknown as { lean?: number } | undefined)
      ?.lean ?? 0;
  townLeans.set(api.state, { date: api.state.date, lean });
  return lean;
}
const townLeans = new WeakMap<object, { date: string; lean: number }>();

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
      : candidatePlatform(
          api,
          filing.personId,
          filing.party ?? null,
          contestPositions(
            api,
            elections(api, "contests").get(
              filing.contestId,
            ) as unknown as ContestRow,
          ),
        ),
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

/** The "yes" this voter gave a candidate's door in this contest, if they gave one. */
export function pledgeOf(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
  contestId: string,
): PledgeRow | null {
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return null;
  return (
    (table(api, "pledges").get(
      `${voterId}|${contestId}|${candidateId}`,
    ) as unknown as PledgeRow | undefined) ?? null
  );
}

/** Every "yes" this voter gave at a door, in any contest. */
export function pledgesOf(api: CoreAPI, voterId: string): readonly PledgeRow[] {
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return [];
  return table(api, "pledges").query("byVoter", [
    voterId,
  ]) as unknown as PledgeRow[];
}

/**
 * The answer to a campaign's ask for a vote at the door: a warm answer is a
 * "yes" and is kept; a cool one at a later knock takes back an earlier yes.
 */
function answerAtDoor(
  api: CoreAPI,
  campaign: CampaignRow,
  voterId: string,
  canvasserId: string,
  warmth: number,
  causeId: string | null,
): void {
  const id = `${voterId}|${campaign.contestId}|${campaign.candidateId}`;
  const pledges = table(api, "pledges");
  if (warmth <= 0) {
    if (pledges.get(id)) pledges.remove(id);
    return;
  }
  pledges.put({
    id,
    voterId,
    candidateId: campaign.candidateId,
    contestId: campaign.contestId,
    date: api.state.date,
    canvasserId,
    causeId,
    firmness: Math.min(1, warmth),
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
function rapport(
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
function retell(
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
 * The town's addresses, full households and counted ones alike, with how many
 * counted adults live in them, in the order a campaign's walk list stands:
 * households with the oldest member first (older residents answer a knock
 * most, by the door-opening rule below), then by id. The walk order is the
 * owner's call (SG-GOV-campaign-walk-order). Rebuilt
 * only when a household is added, filled in or leaves.
 */
function townAddresses(api: CoreAPI): {
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
    if (core.households.has(h.id)) continue;
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

/**
 * Walk the town's doors for some hours, full households and counted ones
 * alike, those not yet walked first. At each door the most willing adult home
 * at that minute is the one who might open; the evening opens as many doors
 * as their readiness adds up to, at the homes that owe an opening most.
 * Yields each opener in walk order (a counted resident is filled in by
 * the caller); `done` and `walked` gain every door knocked, `carries` each
 * knocked home's carry and `owed` the campaign's.
 */
function* walkDoors(
  api: CoreAPI,
  input: {
    readonly done: Set<string>;
    /** When each door already walked was last knocked. */
    readonly lastKnocked: ReadonlyMap<string, string>;
    /** What each home's knocks so far owe it toward its next opening. */
    readonly carries: Map<string, number>;
    /** What the campaign's evenings so far owe toward its next opening. */
    readonly owed: { carry: number };
    readonly walked: string[];
    readonly doors: number;
    readonly hours: number;
  },
): Generator<ReturnType<typeof adultsAt>[number]> {
  const doors = input.doors;
  const done = input.done;
  const list = townAddresses(api).list;
  const homes: { id: string; adults: ReturnType<typeof adultsAt> }[] = [];
  for (const address of list) {
    if (homes.length >= doors) break;
    if (done.has(address.id)) continue;
    homes.push({ id: address.id, adults: adultsAt(api, address) });
  }
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
    if (opened) yield k.opener;
  }
}

/**
 * Knock on doors for some hours: the montage. Households not yet visited, in
 * the order they stand, then (once every door has been knocked) those knocked
 * longest ago. At each door the most outgoing adult home answers, in the
 * share of knocks their readiness to open to a stranger says; they talk with
 * the canvasser, and tell their household. Returns everyone met at a door, in
 * order, so the screen can stop on a porch.
 */
/**
 * The warmth a first door visit leaves a counted resident with: `reach`'s
 * own rule from an empty impression, read from their record (their lean
 * and stance profile against the platform, and the visit's rapport).
 */
function countedDoorWarmth(
  api: CoreAPI,
  campaign: CampaignRow,
  canvasser: Readonly<PersonState>,
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
  const target = clamp(
    groupAgreement(lean, campaign.platform, profile) +
      rapport(canvasser, opener),
  );
  return clamp(campaignParameter("doorContactWeight") * target);
}

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
  const knocked = doorRowsOf(api, campaign.id);
  const done = new Set(knocked.map((row) => row.householdId));
  const lastKnocked = new Map(
    knocked.map((row) => [row.householdId, row.lastDate ?? row.date]),
  );
  const carries = new Map(
    knocked.flatMap((row) =>
      row.answerCarry === undefined
        ? []
        : [[row.householdId, row.answerCarry] as const],
    ),
  );
  const owed = { carry: campaign.doorAnswerCarry ?? OPENING_CARRY };
  const walked: string[] = [];
  const core = api.state as CoreState;
  const met: CauseRow[] = [];
  // While the filing's petition circulates, whoever opens is asked to sign.
  const petition = petitionCirculating(api, input.filingId);
  for (const opener of walkDoors(api, {
    done,
    lastKnocked,
    carries,
    owed,
    walked,
    doors,
    hours: input.hours,
  })) {
    const openerId = opener.id;
    // A counted household is filled in when the player's campaign opens its
    // door (the owner's on-meet design): the person who answers is a full
    // person from then on. A world candidate's door counts them as reached,
    // and they answer the petition by the same rule, from their own record.
    if (!api.state.people.has(openerId)) {
      if (input.fillCounted === false) {
        counted += 1;
        if (petition) askToSign(api, input.filingId, opener, "door");
        // Asked for their vote, a counted resident answers by the rule a
        // first visit applies to a full person: what they make of the
        // platform from their own record, and how the visit went.
        else
          answerAtDoor(
            api,
            campaign,
            openerId,
            input.canvasserId,
            countedDoorWarmth(api, campaign, canvasser, opener),
            null,
          );
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
    // A door that carries a petition asks for a signature; any other asks
    // for the vote, and the answer is how warm the visit left them.
    if (petition) askToSign(api, input.filingId, answers, "door");
    else
      answerAtDoor(
        api,
        campaign,
        answers.id,
        input.canvasserId,
        cause.warmthAfter,
        cause.id,
      );
  }
  // One row a household: the day its door was first knocked, the last, how
  // many times, and what its knocks owe toward the next opening.
  const doorRows = table(api, "doors");
  for (const household of walked) {
    const id = `${campaign.id}|${household}`;
    const prior = doorRows.get(id) as unknown as DoorRow | undefined;
    doorRows.put({
      id,
      campaignId: campaign.id,
      householdId: household,
      date: prior?.date ?? api.state.date,
      lastDate: api.state.date,
      knocks: (prior?.knocks ?? (prior ? 1 : 0)) + 1,
      ...(carries.has(household)
        ? { answerCarry: carries.get(household) }
        : {}),
    } as unknown as ModuleRow);
  }
  campaign = campaignFor(api, input.filingId);
  // The campaign's door count is every door knocked, a second pass included.
  save(api, {
    ...campaign,
    doorsKnockedCount: (campaign.doorsKnockedCount ?? 0) + walked.length,
    doorAnswerCarry: owed.carry,
    countedReached: (campaign.countedReached ?? 0) + counted,
  });
  return met;
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
}

function doorRowsOf(api: CoreAPI, campaignId: string): readonly DoorRow[] {
  return table(api, "doors").query("byCampaign", [
    campaignId,
  ]) as unknown as DoorRow[];
}

/** The households a campaign's doors have reached. */
export function doorsKnockedOf(
  api: CoreAPI,
  campaignId: string,
): readonly string[] {
  return doorRowsOf(api, campaignId).map((row) => row.householdId);
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

function priceRow(kind: string) {
  const row = (
    unitPrices as unknown as {
      prices: Record<string, { priceMinorUnits: number; setByLaw?: boolean }>;
    }
  ).prices[kind];
  if (!row) throw new Error(`No campaign unit price: ${kind}`);
  return row;
}

/** A unit price as the campaign price research published it, in minor units: calibration for the world's draw and its checks, never read by play. */
export function publishedUnitPrice(kind: string): number {
  return priceRow(kind).priceMinorUnits;
}

/**
 * A unit price in this world, in minor units: the published market price
 * moved by the world's own draw (owner, Oct 27: realistic, not real), never
 * below one cent. A price the Postal Service or a law sets (postage, a
 * filing fee) stays as published.
 */
export function unitPrice(api: CoreAPI, kind: string): number {
  const row = priceRow(kind);
  return row.setByLaw
    ? row.priceMinorUnits
    : Math.max(
        1,
        Math.round(
          worldLevel(
            row.priceMinorUnits,
            api.state.seed,
            `campaign-world:price:${kind}`,
            "campaignWorldUnitPriceSpreadShare",
          ),
        ),
      );
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
 * Whether someone gives their evenings to a campaign before personality: how
 * much they like the candidate, how close they are, against the hours their
 * work already takes, past the volunteer threshold.
 */
export function volunteerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  const warmth =
    impressionOf(api, person.id, campaign.candidateId)?.warmth ?? 0;
  const core = api.state as CoreState;
  const tie = closenessBetween(core, person.id, campaign.candidateId);
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  const weeklyWork = [...(core.work.commitmentsByPerson.get(person.id) ?? [])]
    .map((id) => core.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0)
    .reduce((a, b) => a + b, 0);
  return (
    warmth +
    campaignParameter("volunteerClosenessWeight") * (tie + family) -
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes") -
    campaignParameter("volunteerThreshold")
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
  const yes = leanedYes(
    api.state,
    person,
    "campaigns.volunteer",
    "volunteer",
    "decline",
    volunteerReason(api, campaign, person),
  );
  if (yes && !campaign.volunteerIds.includes(personId))
    save(api, {
      ...campaign,
      volunteerIds: [...campaign.volunteerIds, personId],
    });
  return yes;
}

/**
 * Whether someone gives a campaign more than evenings and runs it (its
 * manager, the point person local campaign guides put first,
 * docs/research/words-scenes-2026-10-26.md section 1): the reasons they would
 * volunteer, with closeness and family counted again, past the manager's own
 * bar. A partner or a best friend clears it where an acquaintance does not.
 * stopgapId: SG-CAMPAIGN-manager-changes-nothing-yet
 */
export function managerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  const tie = closenessBetween(api.state, person.id, campaign.candidateId);
  const family = person.familyIds.has(campaign.candidateId) ? 1 : 0;
  return (
    volunteerReason(api, campaign, person) +
    campaignParameter("volunteerThreshold") +
    campaignParameter("managerClosenessWeight") * (tie + family) -
    campaignParameter("managerThreshold")
  );
}

/**
 * Ask someone to run the campaign. They say yes by the manager's reasons and
 * their own temperament; a yes puts them on its staff, off its volunteers.
 */
export function askToManage(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    personId === campaign.candidateId ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge")
  )
    return false;
  const yes = leanedYes(
    api.state,
    person,
    "campaigns.volunteer",
    "volunteer",
    "decline",
    managerReason(api, campaign, person),
  );
  if (yes) save(api, onStaff(campaign, personId));
  return yes;
}

/** The campaign with someone on its staff (and so off its volunteers). */
const onStaff = (campaign: CampaignRow, personId: string): CampaignRow => ({
  ...campaign,
  staffIds: campaign.staffIds.includes(personId)
    ? campaign.staffIds
    : [...campaign.staffIds, personId],
  volunteerIds: campaign.volunteerIds.filter((id) => id !== personId),
});

/**
 * The kind of an offer to help a candidate's campaign, from someone who heard
 * they filed: its `role` fact is "manager" for an offer to run it, else
 * "volunteer".
 */
export const VOLUNTEER_OFFERED_EVENT = "volunteer-offered";

/**
 * People who know a candidate offer to help once word of the filing reaches
 * them: the candidate told them (they have been in touch since the filing),
 * or they heard the press's story of it, read in the paper or passed on in
 * talk (the news engine's own spread). Offers arrive over weeks and months as
 * each tie is next in touch. The candidate's own household is already in the
 * filing's scene, so they are not asked again here. Each who has heard weighs it once by the same reasons as an
 * ask to volunteer (liking, closeness, family, against their work hours) and
 * their own temperament. Offers come at least a week apart (the next one
 * waits, unweighed, for its turn). A candidate other than the player takes the help;
 * the player answers in the scene the offer stages (`answerOffer`).
 * stopgapId: SG-CAMPAIGN-offer-full-people-only
 */
function offersToHelp(api: CoreAPI): void {
  if (!api.state.modules.has(PRESS_MODULE_ID)) return;
  const date = api.state.date;
  const stories = api.moduleState(PRESS_MODULE_ID).table("stories");
  for (const filing of elections(
    api,
    "filings",
  ).rows() as unknown as FilingRow[]) {
    if (!standing(filing)) continue;
    const candidate = api.state.people.get(filing.personId);
    if (!candidate?.alive || !candidate.knownIds.size) continue;
    const contest = elections(api, "contests").get(filing.contestId) as
      ContestRow | undefined;
    if (!contest || contest.electionDate <= date) continue;
    const filedOn = api.state.durableLog.get(
      `candidate-filed:${filing.id}` as never,
    )?.date;
    if (!filedOn || filedOn >= date) continue;
    const told = (
      stories.query("byWire", [`candidate-filed:${filing.id}`]) as unknown as {
        id: string;
      }[]
    ).map((row) => newsKey(row.id));
    // In touch since the filing: the relationship's last contact.
    const toldInPerson = (id: string) => {
      const [a, b] = [id, candidate.id].sort();
      const tie = (api.state as CoreState).relationships.get(`${a}:${b}`);
      return !!tie && tie.lastContactDate > filedOn;
    };
    const existing = table(api, "campaigns").get(filing.id) as unknown as
      CampaignRow | undefined;
    // Offers come a week or more apart: the next waits its turn, unweighed.
    if (
      existing?.lastOfferOn &&
      existing.lastOfferOn >
        addDays(makeIsoDate(date), -campaignParameter("offerSpacingDays"))
    )
      continue;
    const heard = (id: string) =>
      toldInPerson(id) || told.some((key) => api.knows(id, key));
    // While nobody runs the campaign, the closest who have heard (its
    // household too, who heard it first) weigh running it, nearest first,
    // before anyone weighs giving evenings; the first yes is the week's offer.
    if (!existing?.staffIds.length) {
      const campaign = campaignFor(api, filing.id);
      const asked = new Set(campaign.managerWeighedIds ?? []);
      const before = asked.size;
      const closeness = (person: Readonly<PersonState>) =>
        closenessBetween(api.state, person.id, candidate.id) +
        (person.familyIds.has(candidate.id) ? 1 : 0);
      const close = [
        ...new Set([
          ...(api.state.households.get(candidate.householdId)?.memberIds ?? []),
          ...candidate.knownIds,
        ]),
      ]
        .filter((id) => id !== candidate.id && !asked.has(id))
        .map((id) => api.state.people.get(id))
        .filter(
          (person): person is PersonState =>
            !!person?.alive &&
            ageOn(person, date) >= campaignParameter("minimumVolunteerAge") &&
            (person.householdId === candidate.householdId || heard(person.id)),
        )
        .sort(
          (a, b) => closeness(b) - closeness(a) || a.id.localeCompare(b.id),
        );
      let manager: string | null = null;
      for (const person of close) {
        asked.add(person.id);
        if (
          leanedYes(
            api.state,
            person,
            "campaigns.volunteer",
            "volunteer",
            "decline",
            managerReason(api, campaign, person),
          )
        ) {
          manager = person.id;
          break;
        }
      }
      if (asked.size !== before) {
        if (manager)
          offerHelp(api, filing, contest, candidate.id, manager, "manager");
        const current = campaignFor(api, filing.id);
        save(api, {
          ...(manager ? onStaff(current, manager) : current),
          managerWeighedIds: [...asked],
          ...(manager ? { lastOfferOn: date } : {}),
        });
        if (manager) continue;
      }
    }
    const weighed = new Set(existing?.offerWeighedIds ?? []);
    const helping = new Set(existing?.volunteerIds ?? []);
    const before = weighed.size;
    let offered: string | null = null;
    for (const id of [...candidate.knownIds].sort()) {
      if (offered) break;
      if (weighed.has(id) || helping.has(id)) continue;
      const person = api.state.people.get(id);
      if (
        !person?.alive ||
        person.householdId === candidate.householdId ||
        ageOn(person, date) < campaignParameter("minimumVolunteerAge") ||
        !heard(id)
      )
        continue;
      weighed.add(id);
      if (
        !leanedYes(
          api.state,
          person,
          "campaigns.volunteer",
          "volunteer",
          "decline",
          offerReason(api, campaignFor(api, filing.id), person),
        )
      )
        continue;
      offered = id;
      offerHelp(api, filing, contest, candidate.id, id, "volunteer");
    }
    if (weighed.size === before) continue;
    const current = campaignFor(api, filing.id);
    save(api, {
      ...current,
      offerWeighedIds: [...weighed],
      ...(offered ? { lastOfferOn: date } : {}),
      // The help offered is taken, the player's campaign's too: the offer
      // stops the player only as a scene its weight earns, where the player
      // may still turn it down (`answerOffer`).
      volunteerIds: offered
        ? [...current.volunteerIds, offered]
        : current.volunteerIds,
    });
  }
}

/**
 * Someone's offer to help a candidate's campaign, on the record: to give
 * evenings ("volunteer") or to run it ("manager"). Its weight is how much it
 * matters to the candidate's story (`offerWeight`).
 */
function offerHelp(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
  candidateId: string,
  helperId: string,
  role: "volunteer" | "manager",
): void {
  const person = api.state.people.get(helperId);
  const date = api.state.date;
  api.emit({
    id: `${VOLUNTEER_OFFERED_EVENT}:${filing.id}:${helperId}`,
    date,
    kind: VOLUNTEER_OFFERED_EVENT,
    personIds: [candidateId, helperId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `${person?.givenName ?? ""} ${person?.familyName ?? ""} offers to ${role === "manager" ? "run" : "help"} campaign ${filing.id}`,
      asOf: date,
    },
    facts: {
      offeredBy: helperId,
      invitedId: candidateId,
      campaignId: filing.id,
      filingId: filing.id,
      contestId: contest.id,
      office: contest.title,
      role,
      weight: String(offerWeight(api, filing, contest, helperId)),
    },
  });
}

/** The kind of word of a rival's paid message, passed to a candidate by someone it reached. */
export const RIVAL_WORD_EVENT = "rival-word";

interface MessageRow {
  readonly id: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly date: string;
  readonly topic: string;
  readonly witnessIds: readonly string[];
}

/**
 * A rival's paid message reaches people a candidate knows, and the next time
 * one of them is in touch with the candidate they pass it on: the closest
 * such person, for each message once, at most once a week a candidate (the
 * message's reach and the relationship's last contact are the records). The
 * player meets it as a scene; for anyone else it is a record of what they
 * heard.
 */
function rivalWordPassedOn(api: CoreAPI): void {
  const date = api.state.date;
  const core = api.state as CoreState;
  const since = addDays(makeIsoDate(date), -campaignParameter("rivalWordDays"));
  for (const filing of elections(
    api,
    "filings",
  ).rows() as unknown as FilingRow[]) {
    if (!standing(filing)) continue;
    const candidate = api.state.people.get(filing.personId);
    if (!candidate?.alive || !candidate.knownIds.size) continue;
    const told = table(api, "rivalWord").query("byCandidate", [
      candidate.id,
    ]) as unknown as { id: string; date: string }[];
    if (told.some((row) => row.date > since)) continue;
    const heard = new Set(told.map((row) => row.id));
    const fresh = (
      table(api, "messages").query("byContest", [
        filing.contestId,
      ]) as unknown as MessageRow[]
    )
      .filter(
        (row) =>
          row.candidateId !== candidate.id &&
          row.date > since &&
          !heard.has(`${row.id}:${candidate.id}`),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    for (const message of fresh) {
      const witnesses = new Set(message.witnessIds);
      const teller = [...candidate.knownIds]
        .filter((id) => {
          if (!witnesses.has(id)) return false;
          const [a, b] = [id, candidate.id].sort();
          const tie = core.relationships.get(`${a}:${b}`);
          return !!tie && tie.lastContactDate > message.date;
        })
        .map((id) => ({
          id,
          tie: closenessBetween(core, id as PersonId, candidate.id),
        }))
        .sort((a, b) => b.tie - a.tie || a.id.localeCompare(b.id))[0];
      if (!teller) continue;
      const contest = elections(api, "contests").get(filing.contestId) as
        ContestRow | undefined;
      const id = `${message.id}:${candidate.id}`;
      table(api, "rivalWord").put({
        id,
        candidateId: candidate.id,
        date,
      } as unknown as ModuleRow);
      api.emit({
        id: `${RIVAL_WORD_EVENT}:${id}`,
        date,
        kind: RIVAL_WORD_EVENT,
        personIds: [candidate.id, teller.id],
        placeId: townRow(api).townPlaceId,
        topic: message.topic,
        source: {
          tag: "SOURCED",
          citation: `Campaign message ${message.id}, passed on`,
          asOf: date,
        },
        facts: {
          invitedId: candidate.id,
          tellerId: teller.id,
          rivalId: message.candidateId,
          messageId: message.id,
          contestId: filing.contestId,
          ...(contest ? { office: contest.title } : {}),
        },
      });
      break;
    }
  }
}

/**
 * Whether someone who heard of a filing offers to help unasked: the same
 * reasons as an ask to volunteer, against the offer's own bar.
 */
export function offerReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<PersonState>,
): number {
  return (
    volunteerReason(api, campaign, person) +
    campaignParameter("volunteerThreshold") -
    campaignParameter("volunteerOfferThreshold")
  );
}

/**
 * The candidate's answer to an offer of help, said in its scene: the one who
 * offered is already on the campaign's volunteers (its staff, for an offer to
 * run it), and a refusal takes them off; a yes, or no answer, keeps them.
 */
function answerOffer(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const offer = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (offer?.kind !== VOLUNTEER_OFFERED_EVENT) return;
  const move = String(facts.move);
  if (ACCEPTING_MOVES.has(move) || !REFUSING_MOVES.has(move)) return;
  const filingId = String(offer.facts?.filingId ?? "");
  const helperId = String(offer.facts?.offeredBy ?? "");
  const candidateId = String(offer.facts?.invitedId ?? "");
  if (!event.personIds.includes(candidateId)) return;
  const campaign = campaignFor(api, filingId);
  if (
    !campaign.volunteerIds.includes(helperId) &&
    !campaign.staffIds.includes(helperId)
  )
    return;
  save(api, {
    ...campaign,
    volunteerIds: campaign.volunteerIds.filter((id) => id !== helperId),
    staffIds: campaign.staffIds.filter((id) => id !== helperId),
  });
}

/**
 * How much one offer of help matters to the candidate's story, from 0 to 1
 * (owner, Oct 27, 4 PM Eastern: "it shouldn't be stopped for literally every
 * single volunteer. Maybe some that matter. And that's only when you're doing
 * small local campaigns, or maybe your first campaign."). The race's reach on
 * the story falls smoothly with its eligible voters and with each campaign the
 * candidate ran before; within that, a close tie counts twice a stranger. The
 * director sizes the offer's moment by it, so a friend's offer in a first
 * council race is a scene and a stranger's in a statewide race a journal line,
 * with no size or count at which it flips.
 */
export function offerWeight(
  api: CoreAPI,
  filing: FilingRow,
  contest: ContestRow,
  helperId: string,
): number {
  const half = campaignParameter("volunteerOfferHalfElectorate");
  const small = half / (half + raceElectorate(api, contest));
  const before = (
    elections(api, "filings").rows() as unknown as FilingRow[]
  ).filter(
    (row) =>
      row.personId === filing.personId &&
      row.id !== filing.id &&
      (api.state.durableLog.get(`candidate-filed:${row.id}` as never)?.date ??
        "9999") <
        (api.state.durableLog.get(`candidate-filed:${filing.id}` as never)
          ?.date ?? "9999"),
  ).length;
  const fresh =
    campaignParameter("volunteerOfferFirstCampaignShare") / (1 + before);
  const reach = 1 - (1 - small) * (1 - fresh);
  const tie = closenessBetween(api.state, filing.personId, helperId);
  return reach * ((1 + tie) / 2);
}

/**
 * A race's eligible voters: the places its electorate lives in (a district,
 * the state's counties), or for a local race the town's own adults, named
 * and counted.
 */
function raceElectorate(api: CoreAPI, contest: ContestRow): number {
  const { places } = basePlaces(api, contest);
  if (places.length)
    return places.reduce((sum, place) => sum + place.eligible, 0);
  const core = api.state as CoreState;
  const { townPlaceId } = townRow(api);
  const adult = api.parameter("votingAge");
  let total = 0;
  for (const person of core.people.values())
    if (
      person.alive &&
      person.placeId === townPlaceId &&
      ageOn(person, core.date) >= adult
    )
      total += 1;
  for (const row of countedResidents(core))
    if (row.placeId === townPlaceId && ageOn(row, core.date) >= adult)
      total += row.weight;
  return total;
}

/**
 * Someone has said, to the candidate's face, that they will work the
 * campaign (a relative's answer in the talk at home after the filing): they
 * are counted among its volunteers, whom the canvass and the turnout read.
 * Returns whether they were newly enlisted; a child, the dead and anyone
 * already counted are not.
 */
export function enlistVolunteer(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const campaign = campaignFor(api, filingId);
  const person = api.state.people.get(personId);
  if (
    !person?.alive ||
    ageOn(person, api.state.date) < campaignParameter("minimumVolunteerAge") ||
    campaign.volunteerIds.includes(personId)
  )
    return false;
  save(api, {
    ...campaign,
    volunteerIds: [...campaign.volunteerIds, personId],
  });
  return true;
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
  person: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
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
  const level = person.familyIds?.has(campaign.candidateId)
    ? 1
    : clamp(closenessBetween(api.state, person.id, campaign.candidateId));
  return { warmth, agreement, party, relationship: level };
}

/**
 * A voter's reasons to sign a candidate's petition, before personality: how
 * they stand with the candidate (warmth, agreement with the platform, party,
 * the tie between them), weighed as an evening's attendance is, plus
 * signing's low bar: a name on a petition puts a neighbor on the ballot and
 * is not a vote (`petitionSignOpenness`).
 */
export function signReason(
  api: CoreAPI,
  campaign: CampaignRow,
  person: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
): number {
  const why = backingReasons(api, campaign, person);
  return (
    why.warmth +
    why.agreement +
    campaignParameter("donorPartyWeight") * why.party +
    campaignParameter("donorRelationshipWeight") * why.relationship +
    campaignParameter("petitionSignOpenness")
  );
}

/**
 * Ask someone to sign a filing's circulating petition: an adult signs when
 * their reasons (`signReason`) and every trait's lean between signing and
 * declining say so, and the elections engine adds the name once. The
 * controlled person answers for themselves and is never signed up here; the
 * clerk later strikes a name not on the count's roll. Returns whether they
 * signed.
 */
export function askToSign(
  api: CoreAPI,
  filingId: string,
  signer: Readonly<Pick<PersonState, "id" | "traits" | "birthDate">> & {
    readonly familyIds?: ReadonlySet<string>;
  },
  via: PetitionSigner["via"],
): boolean {
  if (!petitionCirculating(api, filingId)) return false;
  const campaign = campaignFor(api, filingId);
  // A signer is a voter that day: of voting age to the day, as the count's
  // roll reads it.
  if (
    signer.id === campaign.candidateId ||
    signer.id === (api.state as CoreState).playerId ||
    ageOnDate(signer.birthDate, api.state.date) < api.parameter("votingAge")
  )
    return false;
  return (
    leanedYes(
      api.state,
      signer,
      "campaigns.sign-petition",
      "sign",
      "decline",
      signReason(api, campaign, signer),
    ) && signPetition(api, filingId, signer.id, via)
  );
}

/**
 * While the petition circulates, the candidate asks the people closest to
 * them to sign, once a day, a few at a time, the closest first, each once:
 * their family, the people they know and anyone they keep a relationship
 * with, who live in the town. Returns how many signed.
 */
export function askCircleToSign(api: CoreAPI, filingId: string): number {
  if (!petitionCirculating(api, filingId)) return 0;
  const campaign = campaignFor(api, filingId);
  if (campaign.petitionAskedOn === api.state.date) return 0;
  const candidate = api.state.people.get(campaign.candidateId);
  if (!candidate?.alive) return 0;
  const town = townRow(api).townPlaceId;
  const asked = new Set(campaign.petitionAskedIds ?? []);
  const ids = new Set<string>([...candidate.familyIds, ...candidate.knownIds]);
  for (const rel of api.state.relationshipsByPerson.get(candidate.id) ?? []) {
    const row = api.state.relationships.get(rel);
    if (row) ids.add(row.actorId === candidate.id ? row.otherId : row.actorId);
  }
  const circle = [...ids]
    .filter((id) => id !== candidate.id && !asked.has(id))
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p?.alive && p.placeId === town)
    .map((p) => ({
      p,
      tie: p.familyIds.has(candidate.id)
        ? 1
        : closenessBetween(api.state, p.id, candidate.id),
    }))
    .sort((a, b) => b.tie - a.tie || a.p.id.localeCompare(b.p.id))
    .slice(0, campaignParameter("petitionCircleAsksPerDay"));
  let signed = 0;
  for (const { p } of circle) {
    asked.add(p.id);
    if (askToSign(api, filingId, p, "circle")) signed += 1;
  }
  save(api, {
    ...campaignFor(api, filingId),
    petitionAskedIds: [...asked],
    petitionAskedOn: api.state.date,
  });
  return signed;
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
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < adultAge)
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
  return donationAnswer(api, filingId, donorId).givenMinor;
}

/** Why an ask brought in nothing, from the donor's own records. */
export type DonationWhy =
  "gave" | "not-warm" | "no-spare" | "at-limit" | "small";

/**
 * An ask answered: what the person gave, or the record-side reason they did
 * not: their reasons to give are at or below zero (`not-warm`), they hold no
 * cash beyond their cushion (`no-spare`), they have given what the law allows
 * (`at-limit`), or what they'd give is under a whole dollar (`small`).
 */
export function donationAnswer(
  api: CoreAPI,
  filingId: string,
  donorId: string,
): { readonly givenMinor: number; readonly why: DonationWhy } {
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (!donor?.alive || ageOn(donor, api.state.date) < adultAge)
    return { givenMinor: 0, why: "no-spare" };
  const reason = donorReason(api, filingId, donorId);
  const spare =
    donor.liquidMinor -
    campaignParameter("caseCushionMonths") * 30 * donor.livingCostDailyMinor;
  if (reason <= 0) return { givenMinor: 0, why: "not-warm" };
  if (spare <= 0) return { givenMinor: 0, why: "no-spare" };
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
  if (amount <= 0)
    return { givenMinor: 0, why: room <= 0 ? "at-limit" : "small" };
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
  recordGift(api, filingId, donorId, amount, given + amount);
  return { givenMinor: amount, why: "gave" };
}

/**
 * Money from the donors outside the town: a race for a seat wider than the
 * town (governor, U.S. Senate, U.S. House, a legislative seat) draws on the
 * adults of its district or state, counted by place at the coarser level.
 * Each turn the campaign's lists reach another share of the adults who lean
 * its candidate's way (`outsideReachPerTurn`); of those, `outsideDonorShare`
 * give, each by the person rule (the cash a typical donor holds beyond a
 * cushion times the share they give per unit of agreement), never past the
 * individual limit. The gift is one record per place group, from the
 * outside account to the campaign's, so the dollars balance on the journal.
 * Returns the minor units raised.
 */
/**
 * The candidate puts their own money into their campaign: an amount the
 * player chose, from their own cash, never more than they hold. A
 * candidate's own money has no contribution limit (Buckley v. Valeo, 424
 * U.S. 1, 1976). Returns what moved; it counts as the candidate's own gift.
 */
export function contributeOwnMoney(
  api: CoreAPI,
  filingId: string,
  amountMinor: number,
): number {
  const campaign = campaignFor(api, filingId);
  const candidate = api.state.people.get(campaign.candidateId);
  if (!candidate?.alive) return 0;
  const amount = Math.min(
    Math.max(0, Math.floor(amountMinor)),
    Math.max(0, candidate.liquidMinor),
  );
  if (amount <= 0) return 0;
  const given = giftOf(api, filingId, candidate.id)?.totalMinor ?? 0;
  postMoney(
    api,
    DONATION_KIND,
    `donation:${filingId}:${candidate.id}:${api.state.date}:${given}`,
    candidate.id,
    campaign.organizationId,
    amount,
    "The candidate's own money, which no contribution limit covers (Buckley v. Valeo, 424 U.S. 1, 1976).",
    false,
  );
  table(api, "gifts").put({
    id: `${filingId}|${candidate.id}`,
    campaignId: filingId,
    donorId: candidate.id,
    totalMinor: given + amount,
    lastDate: api.state.date,
  } satisfies GiftRow as unknown as ModuleRow);
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + amount,
  });
  return amount;
}

export function askOutsideDonors(api: CoreAPI, filingId: string): number {
  const campaign = campaignFor(api, filingId);
  const reached = campaign.outsideReached ?? 0;
  if (reached >= 1) return 0;
  const contest = elections(api, "contests").get(
    campaign.contestId,
  ) as unknown as ContestRow;
  const filing = filingOf(api, filingId);
  if (!contest || !filing) return 0;
  const { places } = basePlaces(api, contest);
  if (!places.length) return 0;
  const core = api.state as CoreState;
  const outside = townOutsideOf(
    core.organizations.values(),
    townRow(api).townPlaceId,
  );
  if (!outside) return 0;
  const side = partySide(filing.party ?? null);
  const step = Math.min(1 - reached, campaignParameter("outsideReachPerTurn"));
  const limit = contributionLimit(api, campaign.contestId);
  const minorPerDollar = api.parameter("minorPerDollar");
  const spare =
    medianTransactionBalance(
      campaignParameter("outsideDonorIncomeUsd"),
      api.state.seed,
    ) * minorPerDollar;
  let total = 0;
  for (const place of places) {
    // The share of the place's adults on the candidate's side of the lean
    // order; a candidate with no party draws on half of them.
    const aligned =
      side > 0 ? place.rightShare : side < 0 ? 1 - place.rightShare : 0.5;
    // Their reason to give is how much of the place stands with the candidate.
    const reason = aligned;
    const donors = Math.floor(
      place.eligible * aligned * step * campaignParameter("outsideDonorShare"),
    );
    if (donors <= 0) continue;
    const each =
      Math.floor(
        Math.min(
          spare * reason * campaignParameter("donationShareOfCashPerWarmth"),
          limit.minor ?? Infinity,
        ) / minorPerDollar,
      ) * minorPerDollar;
    const amount = donors * each;
    if (amount <= 0) continue;
    const donorId = `outside:${place.id}`;
    const given = giftOf(api, filingId, donorId)?.totalMinor ?? 0;
    // The outside account pays the campaign's account through the accounts
    // API, a flow recorded in outside-flows.json as the donors' own money.
    const paid = transferCash(
      api,
      `donation-outside:${filingId}:${place.id}:${api.state.date}:${given}`,
      outside.id,
      campaign.organizationId,
      amount,
      {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: `${limit.source}; ${donors} donors in ${place.name} at the person rule`,
        estimatedFrom:
          "Pew Research Center, 5 facts about U.S. political donations (2017)",
      },
    );
    if (paid <= 0) continue;
    table(api, "gifts").put({
      id: `${filingId}|${donorId}`,
      campaignId: filingId,
      donorId,
      totalMinor: given + paid,
      lastDate: api.state.date,
      donors: (giftOf(api, filingId, donorId)?.donors ?? 0) + donors,
    } satisfies GiftRow as unknown as ModuleRow);
    total += paid;
  }
  save(api, {
    ...campaignFor(api, filingId),
    raisedMinor: campaignFor(api, filingId).raisedMinor + total,
    outsideReached: reached + step,
  });
  return total;
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

/**
 * A gift from someone other than the candidate is a public record, as a
 * campaign finance report names each contributor: who gave, how much, their
 * total, and the share it is of what others have given the campaign. A
 * donor who holds a view on a bill pending before the body the seat sits on
 * names the one they hold most strongly, the bill they will want to talk
 * about.
 */
function recordGift(
  api: CoreAPI,
  filingId: string,
  donorId: string,
  amountMinor: number,
  totalMinor: number,
): void {
  const campaign = campaignFor(api, filingId);
  const donor = api.state.people.get(donorId);
  if (
    donorId === campaign.candidateId ||
    !donor ||
    !api.state.people.has(campaign.candidateId)
  )
    return;
  const bill = donorsBill(api, campaign, donor);
  // The share of what others have given: the candidate's own money is theirs.
  const outside =
    campaign.raisedMinor -
    (giftOf(api, filingId, campaign.candidateId)?.totalMinor ?? 0);
  api.emit({
    id: `campaign-gift:${filingId}:${donorId}:${api.state.date}:${totalMinor}`,
    date: api.state.date,
    kind: "campaign-gift",
    personIds: [campaign.candidateId, donorId],
    placeId: townRow(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `A contribution to ${campaign.organizationId}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    facts: {
      filingId,
      contestId: campaign.contestId,
      candidateId: campaign.candidateId,
      donorId,
      amountMinor: String(amountMinor),
      totalMinor: String(totalMinor),
      raisedMinor: String(campaign.raisedMinor),
      share: String(amountMinor / outside),
      ...(bill ? { billId: bill.id, number: bill.number } : {}),
    },
  });
}

/**
 * The bill pending before the body a campaign's seat sits on that the donor
 * holds the strongest view on, either way; none where nothing is pending.
 */
function donorsBill(
  api: CoreAPI,
  campaign: CampaignRow,
  donor: Readonly<PersonState>,
): BillRow | undefined {
  if (!api.state.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const contest = elections(api, "contests").get(
    campaign.contestId,
  ) as unknown as ContestRow | undefined;
  if (!contest) return undefined;
  const lean = personLean(api.state.people, donor, townRow(api).lean);
  let best: { bill: BillRow; strength: number } | undefined;
  for (const row of api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as BillRow[]) {
    if (row.bodyOfficeId !== contest.officeId || row.status !== "drafted")
      continue;
    if (!row.number) continue;
    const stance = row.provisions[0]
      ? provisionStance(api, row.provisions[0])
      : null;
    if (!stance) continue;
    const strength = Math.abs(
      viewOn(api, donor.id as PersonId, stance.question, lean),
    );
    if (
      strength > 0 &&
      (!best ||
        strength > best.strength ||
        (strength === best.strength && row.id < best.bill.id))
    )
      best = { bill: row, strength };
  }
  return best?.bill;
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
  const adultAge = api.parameter("votingAge");
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const volunteers = new Set(campaign.volunteerIds);
  return reachablePeople(api, campaign).filter((id) => {
    const person = core.people.get(id);
    if (!person?.alive || person.placeId !== town) return false;
    if (ageOn(person, api.state.date) < adultAge) return false;
    if (volunteers.has(id)) return true;
    const why = backingReasons(api, campaign, person);
    const weeklyWork = [...(core.work.commitmentsByPerson.get(id) ?? [])]
      .map((c) => core.work.commitments.get(c)?.expectedWeeklyMinutes ?? 0)
      .reduce((a, b) => a + b, 0);
    return leanedYes(
      api.state,
      person,
      "parties.attend",
      "attend",
      "stay-home",
      why.warmth +
        why.agreement +
        campaignParameter("donorPartyWeight") * why.party +
        campaignParameter("donorRelationshipWeight") * why.relationship -
        weeklyWork / campaignParameter("turnoutWorkWeekMinutes"),
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
  table(api, "messages").put({
    id: input.id,
    contestId: campaign.contestId,
    candidateId: campaign.candidateId,
    date: api.state.date,
    topic: lead.question,
    witnessIds,
  } as unknown as ModuleRow);
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
  const mine = leanedScore(
    api.state,
    endorser,
    "campaigns.endorse",
    "endorse",
    "decline",
    raw,
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

/** Someone called for a poll: their age past the response threshold, before personality (older residents answer more). */
export function answerPollReason(
  person: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
): number {
  return (
    (ageOn(person, date) - campaignParameter("doorAnswerPivotAge")) /
      campaignParameter("doorAnswerAgeSpan") -
    campaignParameter("pollAnswerThreshold")
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
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, input.filingId);
  const town = townRow(api).townPlaceId;
  const date = api.state.date;
  const core = api.state as CoreState;
  // The whole town is the frame: full people and the counted residents.
  const rt = residentsRuntime(core);
  const frame = [
    ...[...api.state.people.values()]
      .filter(
        (p) => p.alive && p.placeId === town && ageOn(p, date) >= adultAge,
      )
      .map((p) => ({ id: p.id, traits: p.traits, birthDate: p.birthDate })),
    ...[...(rt?.store.liveHouseholds() ?? [])]
      .filter((h) => h.placeId === town)
      .flatMap((h) => rt!.store.countedMembers(h))
      .filter(
        (m) =>
          !api.state.people.has(rt!.store.ids[m]!) &&
          ageOn({ birthDate: rt!.store.born[m]! }, date) >= adultAge,
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
        answerPollReason(person, date),
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
  const perPiece = unitPrice(api, "mailer-print") + unitPrice(api, "postage");
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
    amountMinor: unitPrice(api, "event-venue"),
    citation: "An evening's venue at the campaign-unit-prices event-venue row",
  });
  const audienceIds = whoComes(api, campaign);
  const causes = makeStatements(api, {
    filingId,
    venue,
    statements: [lead],
    audienceIds,
    act: "speech",
    weight: campaignParameter("speechWeight"),
    faceToFace: true,
  });
  // While the petition circulates, the evening's audience is asked to sign.
  if (petitionCirculating(api, filingId))
    for (const id of audienceIds) {
      const person = api.state.people.get(id);
      if (person) askToSign(api, filingId, person, "event");
    }
  return causes;
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
          (id) => id !== playerId && id !== candidate.id && !asked.has(id),
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
  /** The whole act the candidate's day was built around (an event or an interview), if any. */
  readonly dayAct: "event" | "interview" | null;
}

/** The day a world candidate chose: a whole act, if any, and hours for the hour-based acts. */
export interface RivalDay {
  readonly callHours: number;
  readonly doorHours: number;
  /** A whole act (an evening event or a press interview) the day is built around, or null. */
  readonly act: "event" | "interview" | null;
  readonly actHours: number;
}

/**
 * How a world candidate spends their campaign day: a scored pass over the
 * player's own day choices (`campaignDayChoices`), by their money, standing
 * and traits. Every available act gets a score on one scale and nothing
 * flips at a line:
 * - call time for money rises as the bank empties and as they get better
 *   known (donors are easier to reach);
 * - doors rise as they are less known and as they are more sociable;
 * - an event rises with the bank (venue money in hand) and sociability;
 * - an interview rises with how known they are and with holding the seat.
 * The hours their own day leaves (a job takes most of it, rest takes its
 * lean) are split between calls and doors by score share. A whole act
 * (event, interview) is taken when it is the best-scored act of the day,
 * and then takes its share of the day's hours. Ads, mail, staff and polls
 * are bought from the money in `campaignTurn`.
 */
export function rivalDay(
  api: CoreAPI,
  filingId: string,
  candidate: Readonly<PersonState>,
  town: string,
): RivalDay {
  const day = campaignDayChoices(api, filingId, true);
  const offered = (kind: string) =>
    day.find((c) => c.kind === kind)?.available ?? false;
  const calls = offered("raise-money");
  // The signatures a circulating petition still lacks, as a share of what
  // the clerk will count, pull the day toward the doors until the deadline;
  // while it lacks any, a candidate whose district takes in the town walks
  // its doors for them wherever they live.
  const petition = petitionCirculating(api, filingId)
    ? petitionOf(api, filingId)
    : null;
  const shortfall = petition?.needed
    ? Math.max(0, petition.needed - petition.signers.length) / petition.needed
    : 0;
  const doors =
    (candidate.placeId === town || shortfall > 0) && offered("canvass");
  const campaign = campaignFor(api, filingId);
  const cash =
    api.state.organizations.get(campaign.organizationId)?.liquidMinor ?? 0;
  const richness = cash / (cash + unitPrice(api, "event-venue"));
  const known = Math.min(1, campaignRecognition(api, filingId));
  const sociable = Math.max(
    0,
    candidate.traits["people-mind-v1:sociability"] ?? 0,
  );
  const wTrait = campaignParameter("spendTraitWeight");
  const callScore =
    1 +
    campaignParameter("rivalCallNeedWeight") * (1 - richness) +
    campaignParameter("rivalCallStandingWeight") * known;
  const doorScore =
    1 +
    campaignParameter("rivalDoorUnknownWeight") * (1 - known) +
    campaignParameter("rivalPetitionNeedWeight") * shortfall +
    wTrait * sociable;
  const holdsSeat = holdsTheSeat(api, filingId, candidate.id) ? 1 : 0;
  const eventScore =
    campaignParameter("rivalActBaseScore") +
    campaignParameter("rivalEventRichWeight") * richness +
    wTrait * sociable;
  const interviewScore =
    campaignParameter("rivalActBaseScore") +
    campaignParameter("rivalInterviewKnownWeight") * known +
    campaignParameter("rivalInterviewIncumbentWeight") * holdsSeat;
  const bestHourly = Math.max(calls ? callScore : 0, doors ? doorScore : 0);
  const canEvent = offered("event") && eventScore > bestHourly;
  const canInterview = offered("interview") && interviewScore > bestHourly;
  const act: RivalDay["act"] =
    canEvent && (!canInterview || eventScore >= interviewScore)
      ? "event"
      : canInterview
        ? "interview"
        : null;
  const actHours = act ? (day.find((c) => c.kind === act)?.hours ?? 0) : 0;
  const ownHours =
    (candidate.jobId
      ? campaignParameter("rivalHoursWithJob")
      : campaignParameter("rivalHoursWithoutJob")) *
    // Personality slides the hours between (1 - share) and (1 + share) of
    // the base: even the least campaign-minded candidate walks some doors.
    (1 +
      campaignParameter("rivalHoursLeanShare") *
        termOfLean(
          api.state,
          candidate,
          "campaigns.rival-hours",
          decisionLean(
            api.state,
            candidate,
            "campaigns.rival-hours",
            "campaign",
            "rest",
          ),
          0,
        ));
  // A whole act takes its share of the day; the rest is split by score.
  const hours =
    actHours > 0 ? (ownHours * ownHours) / (ownHours + actHours) : ownHours;
  const total = (calls ? callScore : 0) + (doors ? doorScore : 0);
  return {
    callHours: calls ? (hours * callScore) / total : 0,
    doorHours: doors ? (hours * doorScore) / total : 0,
    act,
    actHours,
  };
}

/** Whether this candidate holds the seat the contest is for (the incumbent running again). */
function holdsTheSeat(
  api: CoreAPI,
  filingId: string,
  personId: string,
): boolean {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  const contest = filing
    ? (api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(filing.contestId) as unknown as ContestRow | undefined)
    : undefined;
  if (!contest?.incumbentTermId || !api.state.modules.has(OFFICES_MODULE_ID))
    return false;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(contest.incumbentTermId) as unknown as TermRow | undefined;
  return term?.status === "serving" && term.personId === personId;
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
  // The candidate backs their own campaign first, by the same reasons.
  if (candidate?.alive) askForDonation(api, filingId, candidate.id);
  // The rest of the candidate's turn is a campaign day taken through the
  // player's own choices, chosen among by the candidate's money, standing and
  // traits. The controlled person's money moves only by their own choice, so
  // asks skip them.
  askOutsideDonors(api, filingId);
  let doors = 0;
  let asks = 0;
  let dayAct: CampaignTurnResult["dayAct"] = null;
  if (candidate?.alive) {
    const day = rivalDay(api, filingId, candidate, town);
    if (day.act === "event") {
      takeCampaignDayChoice(api, filingId, "event", { world: true });
      dayAct = "event";
    } else if (day.act === "interview") {
      // Ask the outlet; a yes comes with its questions, which they answer
      // from their platform, their own view and their party.
      const row = takeCampaignDayChoice(api, filingId, "interview", {
        world: true,
      }).interview;
      if (row?.status === "invited") {
        const filing = api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .get(filingId) as unknown as FilingRow;
        answerInterview(
          api,
          row.id,
          candidateAnswers(api, row.questions, filing),
        );
      }
      dayAct = "interview";
    }
    if (day.callHours > 0)
      asks = takeCampaignDayChoice(api, filingId, "raise-money", {
        world: true,
        hours: day.callHours,
      }).asked;
    if (day.doorHours > 0)
      doors = takeCampaignDayChoice(api, filingId, "canvass", {
        world: true,
        hours: day.doorHours,
      }).doorsKnocked;
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
  if (eventFund >= unitPrice(api, "event-venue") && daysLeft > 0) {
    eventAudience = holdEvent(api, filingId).length;
    eventFund -= unitPrice(api, "event-venue");
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
    dayAct,
  };
}

const contestsSeen = new WeakMap<object, number>();

/**
 * Every few days, each world candidate on the ballot of a contest the town
 * votes in (the player excepted) takes a campaign turn, from the day they
 * filed to election day. Races are noted when their contest appears (the
 * contests table read only when it has grown) and dropped once decided.
 */
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
    // turn to it now and then, in the last weeks every few days. While its
    // petitions circulate, the nearer day is the filing deadline.
    const contest = contests.get(race.id) as unknown as ContestRow | undefined;
    const toward =
      contest &&
      date <= contest.filingDeadline &&
      ballot(api, race.id).some((f) => f.status === "petitioning")
        ? contest.filingDeadline
        : race.electionDate;
    const daysLeft = daysBetween(date, toward);
    const every =
      turnDays * (1 + daysLeft / campaignParameter("campaignRampDays"));
    if (race.lastTurn && daysBetween(race.lastTurn, date) < every) continue;
    races.put({ ...race, lastTurn: date } as unknown as ModuleRow);
    for (const filing of ballot(api, race.id))
      if (filing.personId !== playerId && filing.filedOn <= date)
        campaignTurn(api, filing.id, race.electionDate);
  }
}

/**
 * How much of the town a campaign has reached, 0 to 1: the full people who
 * have heard of the candidate and the counted adults its doors and mail
 * reached, over the town's adults of both kinds.
 */
export function campaignRecognition(api: CoreAPI, filingId: string): number {
  const adultAge = api.parameter("votingAge");
  const campaign = table(api, "campaigns").get(filingId) as unknown as
    CampaignRow | undefined;
  if (!campaign) return 0;
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  let namedAdults = 0;
  for (const id of core.peopleByPlace.get(town) ?? []) {
    const p = core.people.get(id);
    if (p?.alive && ageOn(p, api.state.date) >= adultAge) namedAdults += 1;
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
