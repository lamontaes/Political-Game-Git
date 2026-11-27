/**
 * What the parts of campaigns.ts share: the declarations more than one of
 * them read, moved here so no part imports the entry (scripts/elections/split-module.ts).
 */
import { outsideMarketAccount, townOutsideOf } from "../opening-outside-market";
import { candidateIdentity } from "../candidate-identity";
import type { CoreAPI, PersonState, Source } from "../types";
import type { ModuleRow } from "../module-data";
import type { CashJournalSourceSlot } from "../journal-state";
import { addDays, makeIsoDate } from "../kernel/dates";
import { campaignParameter, type Stance } from "../campaign-data";
import { candidatePlatform, platformShares } from "../campaign-stances";
import { contestPositions } from "../contest-positions";
import { causeGroupsIn } from "./drives";
import { promisesOf, recordAppeal, votesCast } from "./record";
import { areasAnswered, jurisdictionTermRead, lawChain } from "./laws";
import {
  OFFICES_MODULE_ID,
  type TermRow,
  termById,
  officeById,
} from "./offices";
import {
  atLargeGroup,
  ballot,
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./elections";
import { CAMPAIGNS_MODULE_ID, CAMPAIGN_ACTS } from "./campaigns-constants";
export { outsideMarketAccount, townOutsideOf };
export type { CashJournalSourceSlot };
export { causeGroupsIn };
export { promisesOf, recordAppeal, votesCast };

export interface CampaignRow {
  readonly id: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly platform: readonly Stance[];
  /**
   * Each platform question's share of what the campaign says, one in all
   * (`platformShares`: the platform rule's own scores over their sum), read
   * once when the campaign opens. A row without it shares equally.
   */
  readonly platformShares?: Readonly<Record<string, number>>;
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
  /** The candidate's circle already asked to sign the petition (each ask is made once). */
  readonly petitionAskedIds?: readonly string[];
  /** The day the candidate last asked their circle to sign. */
  readonly petitionAskedOn?: string;
  /** Everyone who has hosted a donor meeting for the campaign (each hosts once). */
  readonly donorMeetingHostIds?: readonly string[];
  /** Where the next mail drop starts in the town's list of addresses. */
  readonly mailCursor?: number;
  /** Counted adults (not yet full people) its doors, mail and ads reached. */
  readonly countedReached?: number;
  /** Doors that opened and were asked for a signature (a door past the petition's target asks for the vote instead). */
  readonly doorSignAsks?: number;
  /** What each ad bought reached: the outlet, the full followers and the counted adults, one record per buy. */
  readonly adReaches?: readonly {
    readonly id: string;
    readonly date: string;
    readonly outletId: string;
    readonly full: number;
    readonly counted: number;
  }[];
  /** The share of an event the town has been owed but not yet had (`heldInTown`), 0 up to one. */
  readonly townEventCredit?: number;
  /** The same for the interviews the town's outlets ask of the candidate (`interviewHeldInTown`). */
  readonly townInterviewCredit?: number;
  /** Money set aside toward an event's venue and a poll, not yet paid. */
  readonly eventFundMinor?: number;
  readonly pollFundMinor?: number;
  /** Money set aside for paid petition circulators outside the town, not yet paid (`hireCirculators`). */
  readonly circulatorFundMinor?: number;
  /** The day the circulators last turned in signatures (or were hired). */
  readonly circulatorShiftOn?: string;
  /** How much of the like-minded adults outside the town its lists have reached, 0 to 1. */
  readonly outsideReached?: number;
  /** What it bought, by kind, in minor units. */
  readonly spentByKind?: Readonly<Record<string, number>>;
  /** What each volunteer's working days so far owe toward their next evening of doors (a share of one). */
  readonly shiftCarries?: Readonly<Record<string, number>>;
  /** The day each volunteer's last evening of doors was kept as an event. */
  readonly shiftNotedOn?: Readonly<Record<string, string>>;
  /**
   * Each volunteer or staffer who left the campaign to stand in its race
   * themselves (`leaveForOwnRun`): who, which list they left, the day, and
   * their own filing, whose `candidate-filed` record is the cause. The work a
   * volunteer shared with the candidate stays theirs after they leave
   * (`sharedHistory` reads it).
   */
  readonly leftToRun?: readonly {
    readonly personId: string;
    readonly role: "volunteer" | "staff";
    readonly on: string;
    readonly filingId: string;
  }[];
}

/**
 * A world candidate's ask for money that reached the controlled person
 * (play-campaign-ask-reaches-player): theirs to answer, never taken. The
 * engine never moves the player's money on its own (owner, Oct 14: the engine
 * offers, the player decides).
 */
export interface AskRow {
  readonly id: string;
  readonly campaignId: string;
  readonly donorId: string;
  readonly candidateId: string;
  /** What they would give by their own reasons and cash (`donationAnswer`'s sum); they may give another. */
  readonly suggestedMinor: number;
  readonly askedOn: string;
  readonly status: "pending" | "given" | "declined";
  readonly answeredOn?: string;
  readonly givenMinor?: number;
}

/** One donor's running total to one campaign (the legal limit reads it). */
export interface GiftRow {
  readonly id: string;
  readonly campaignId: string;
  readonly donorId: string;
  readonly totalMinor: number;
  readonly lastDate: string;
  /**
   * What the donor gave this campaign in the calendar month of `lastDate`
   * (absent counts as none): the part of the running total `giftBudget`
   * takes off the donor's month (`givenInMonth`).
   */
  readonly monthMinor?: number;
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
export type CampaignAct = (typeof CAMPAIGN_ACTS)[number];

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
  /** The record items an attack ad showed this voter: the rival's votes and broken promises, by id. */
  readonly shownIds?: readonly string[];
  /** The record that made the touch, where one did (a scene's reply). */
  readonly sourceId?: string;
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
  /** The day they said it (their latest yes to this candidate). */
  readonly date: string;
  /**
   * The day their word to this candidate was first given, kept through every
   * later yes to the same candidate (a yes to a rival in between ends it).
   */
  readonly firstDate?: string;
  /** Who knocked: the candidate or one of their volunteers. */
  readonly canvasserId: string;
  /** The visit's recorded cause (a full person's), or null for a counted resident. */
  readonly causeId: string | null;
  /** How warm the answer was, 0 to 1: the yes's own firmness, kept for the scene. */
  readonly firmness: number;
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

/**
 * An organization in town that can back a candidate (`organizedGroupsIn`):
 * a residents' or employers' group (the interest-groups engine), a cause
 * group (the drives engine) or a party's chapter (the parties engine).
 */
export interface OrganizedGroup {
  readonly organizationId: string;
  readonly kind: "interest-group" | "cause-group" | "party-chapter";
  /** The member who speaks for it (a group's lobbyist, a cause group's founder, a party's chair), or null. */
  readonly speakerId: string | null;
  /** Its members living in town, full people. */
  readonly memberIds: readonly string[];
  /**
   * What it stands for of its own: its question and side, its cause's topic,
   * or a party's position on each question. On any other question its
   * members' own views speak for it (`groupsWeighRace`).
   */
  readonly stance: readonly Stance[];
}

/**
 * Why an endorsement was given or refused, always one of these: agreement
 * with the platform (yes), a person's tie to the candidate where they do not
 * agree with the platform (yes: a friend backing a friend; never a group's
 * reason), a question the endorser disagrees on, a rival they back more, or
 * their own reluctance to endorse anyone (a group whose cause the platform
 * does not touch among them).
 */
export type EndorsementReason =
  "agrees" | "close-tie" | "disagrees" | "prefers-rival" | "declines";

/**
 * One answer to an endorsement, kept for the scene, the press and the rival
 * campaign: a person a candidate asked (every answer, yes or no), or a
 * group's backing, written once on the day its speaker gives it. It is the
 * one record of who was asked and who endorsed (`endorsementsOf`); the
 * campaign row keeps no list of its own.
 */
export interface EndorsementRow {
  /** A favor the speaker owed the candidate from a deal, weighed in this answer (campaign-favor-called-in). */
  readonly obligationId?: string;
  /** endorsement:<filingId>:<the person asked, or the group's organization>. */
  readonly id: string;
  readonly filingId: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly date: string;
  /** Who answered: the person asked, or the member speaking for the group. */
  readonly speakerId: string;
  /** The group whose backing it is; null for a person's own word. */
  readonly organizationId: string | null;
  /** Who asked: the candidate; null when a group weighed the race itself. */
  readonly askerId: string | null;
  /**
   * "withdrawn": a yes ended on the day its speaker filed in the same race (`endedByFilingId`); nothing reads it as a backing.
   * "asked": the person asked is the player, who has not answered yet (the scene it stages asks them; their reply writes the yes or the no).
   */
  readonly answer: "yes" | "no" | "withdrawn" | "asked";
  /** The day a yes was withdrawn and the filing that ended it. */
  readonly endedOn?: string;
  readonly endedByFilingId?: string;
  readonly reason: EndorsementReason;
  /** The platform question the endorser disagrees with most, if any. */
  readonly issue: string | null;
  /**
   * The stance a group's backing stands on: the group's own question and
   * position on the platform question it agrees with the candidate on most,
   * as it held it the day it weighed the race (`PlatformRead.agreesOn`), so
   * the paper can say what a group with no name stands for. Null for a
   * person's own word.
   */
  readonly stance: Stance | null;
  /** The rival campaign they back most (the one preferred, for prefers-rival). */
  readonly rivalFilingId: string | null;
  /** Their reasons, as numbers the English engine words. */
  readonly agreement: number;
  readonly tie: number;
  readonly backing: number;
  readonly rivalBacking: number | null;
  /** The backing with their temperament toward endorsing added. */
  readonly score: number;
  /** How many people the endorsement reached (a group's members, a person's circle). */
  readonly reached: number;
  /** The group's members who then gave their evenings to the campaign. */
  readonly volunteerIds: readonly string[];
}

export interface MoneyRecord {
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

/**
 * A campaign payment's journal source, held only while `postMoney` posts it,
 * as budgets' withholding does: no table keeps it, and the slot is let go
 * once the entry is posted. Every later reader reads the campaign row's
 * totals (raisedMinor, spentMinor, spentByKind), the gifts, the
 * campaign-gift event or the journal's receipts.
 */
export const heldSlots = new WeakMap<
  object,
  Map<string, CashJournalSourceSlot>
>();
export function holdMoneySlot(api: CoreAPI, record: MoneyRecord): void {
  const map =
    heldSlots.get(api.state) ?? new Map<string, CashJournalSourceSlot>();
  heldSlots.set(api.state, map);
  const resolved = {
    kind: record.kind,
    id: record.id,
    date: record.date,
    source: record.source,
    expectedPostings: record.postings.map((p) => ({ ...p })),
    requiredRelatedRefs: [],
    relatedRecords: [],
  };
  map.set(record.id, {
    resolved,
    marker: resolved,
    retainFull: false,
    metadata: [],
  } as unknown as CashJournalSourceSlot);
}

export function table(api: CoreAPI, name: string) {
  return api.moduleState(CAMPAIGNS_MODULE_ID).table(name);
}
export function elections(api: CoreAPI, name: string) {
  return api.moduleState(ELECTIONS_MODULE_ID).table(name);
}
export const ageOn = (
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

/** The next campaign turn for every world candidate, on the module calendar. */
export function scheduleTurn(api: CoreAPI): void {
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

export function townRow(api: CoreAPI) {
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
  const opened: CampaignRow = {
    ...row,
    platformShares: recordTilted(
      api,
      filingId,
      row.platform,
      platformShares(api, row.platform),
    ),
  };
  table(api, "campaigns").put(opened as unknown as ModuleRow);
  return opened;
}

/**
 * A campaign's shares of what it says, leaned toward the questions whose area
 * of the term read went the way the candidate runs on: a challenger's toward
 * the areas the incumbent's term hurt (pay, prices, jobs, rent, schools), the
 * incumbent's toward the areas it helped, each by the area's slide on that
 * side (0 to 1) times `platformRecordTilt`, then renormalized. The term read
 * is the seat's own jurisdiction's, since the incumbent's term began; an open
 * seat, or a place with no record yet (the first year), leans nothing. No
 * roll: the same record gives the same shares.
 */
function recordTilted(
  api: CoreAPI,
  filingId: string,
  platform: readonly Stance[],
  shares: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
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
  if (!filing || !contest?.incumbentTermId) return shares;
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return shares;
  const term = termById(api, contest.incumbentTermId) as unknown as
    TermRow | undefined;
  const office = officeById(api, contest.officeId) as unknown as
    { jurisdiction?: string } | undefined;
  if (!term || !office?.jurisdiction) return shares;
  // A state's or the country's office is read where it serves; a town's, a
  // county's or a board's is the town's own record, the web's place.
  const jurisdiction = /^US(-|$)/.test(String(office.jurisdiction))
    ? String(office.jurisdiction)
    : lawChain(api).townPlaceId;
  const reads = jurisdictionTermRead(
    api,
    jurisdiction,
    term.serviceStart ?? term.startDate,
  );
  if (!reads.length) return shares;
  const holds = term.status === "serving" && term.personId === filing.personId;
  const tilt = campaignParameter("platformRecordTilt");
  const needOf = (question: string) =>
    Math.max(
      0,
      ...areasAnswered(question).map((area) => {
        const slide = reads.find((read) => read.area === area)?.slide ?? 0;
        return holds ? slide : -slide;
      }),
    );
  const leaned = platform.map(
    (stance) =>
      [
        stance.question,
        (shares[stance.question] ?? 0) * (1 + tilt * needOf(stance.question)),
      ] as const,
  );
  const total = leaned.reduce((sum, [, share]) => sum + share, 0);
  return total > 0
    ? Object.fromEntries(
        leaned.map(([question, share]) => [question, share / total]),
      )
    : shares;
}

export function save(api: CoreAPI, row: CampaignRow) {
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
 * A rival's own filing in a campaign's race: the person's filing standing in
 * the same contest, or another seat of the same at-large race (on its
 * ballot, or with its petition out) when they are
 * not the campaign's candidate, else null. Someone running for a seat
 * campaigns for themselves, so a rival never volunteers for or runs another
 * candidate's campaign, hosts or comes to their donor meeting, or endorses
 * them. A fact of the elections engine's ballot, not a lean, read alike for
 * world candidates and the player.
 */
export function rivalFiling(
  api: CoreAPI,
  campaign: Pick<CampaignRow, "contestId" | "candidateId">,
  personId: string,
): FilingRow | null {
  if (personId === campaign.candidateId) return null;
  // The at-large seats up that day are one race (`atLargeGroup`): a filing
  // for any of its seats runs against every candidate in it.
  const contest = elections(api, "contests").get(campaign.contestId) as
    ContestRow | undefined;
  const contestIds = contest
    ? atLargeGroup(api, contest).map((row) => row.id)
    : [campaign.contestId];
  for (const contestId of contestIds) {
    const own = ballot(api, contestId).find((f) => f.personId === personId);
    if (own) return own;
  }
  return null;
}
