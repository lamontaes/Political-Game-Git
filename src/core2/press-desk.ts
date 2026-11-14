/**
 * The reporter's desk (OPUS-PEOPLE press). Each week every reporter at a town
 * outlet picks the stories they will file from the public records still
 * fresh on the wire, by what the outlet's followers hold views on, how near
 * home it is, how many people in town it names, and the reporter's own
 * causes and grudges. Nothing is picked by chance; each story keeps the
 * reasons it was picked.
 *
 * How a story reads is its slant, for or against the change it reports and
 * the people it names: the outlet's lean, the reporter's and the publisher's
 * ties to those people (closeness softens, a grudge sharpens), and the money
 * a named candidate spent on the outlet's ads. The printed story argues the
 * change it favors, and its readers are moved by their standing with the
 * reporter who wrote it.
 */
import { OUTCOME_MONTH_KIND } from "./outcome-news";
import briefs from "./data/press/briefs.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { questionAxis } from "./campaign-views";
import { closenessBetween } from "./closeness";
import { isPolicyTopic, type WireItem, type WireLevel } from "./press-topics";
import type { CoreAPI, CoreState, PersonId } from "./types";
import { printStory, type Story } from "./modules/news";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { OFFICES_MODULE_ID, servingTermsOf } from "./modules/offices";
import { isPublicFigure } from "./past-public";
import { reachedBy } from "./law-reach/host";
import { lawChain, LAWS_MODULE_ID } from "./modules/laws";
import {
  stancesOf,
  viewOf,
  VIEWS_MODULE_ID,
  VIEWS_SPEAKER_KEY,
} from "./modules/views";
import { residentsRuntime } from "./modules/residents";
import { onContestRoll, VOTING_MODULE_ID } from "./modules/voting";
import { BALLOT_MEASURES_MODULE_ID, measureVoteOf } from "./modules/elections";

/**
 * The facts that name the counted household a record happened to and its
 * members (the drives engine's countedHousehold and countedSubjects keys,
 * written by housing-homeless `countedFacts`).
 */
const COUNTED_HOUSEHOLD = "counted-household";
const COUNTED_SUBJECTS = "counted-subjects";

/**
 * A race's gifts and endorsements: a paper tells a race's money and backing
 * as one story a week, not one for each donor or endorser (a town's gifts were
 * 94 of its 142 front-page stories in the weeks after filings opened,
 * Williamstown, Kentucky, seed survey-b), and a national outlet carries only a
 * federal race's endorsements (`nationalCarries`).
 */
const RACE_KINDS: ReadonlySet<string> = new Set([
  "campaign-gift",
  "campaign-endorsed",
]);
/** A national outlet carries a federal race's endorsements, never a donor's gift or a state or county race's. */
const nationalCarries = (item: WireItem): boolean =>
  !RACE_KINDS.has(item.kind) ||
  (item.kind === "campaign-endorsed" && item.level === "nation");
const raceTold = (item: WireItem): string | null =>
  RACE_KINDS.has(item.kind) && item.facts?.contestId
    ? `${item.kind}:${item.facts.contestId}`
    : null;

/** The record kinds a local outlet prints in its briefs column. */
const BRIEF_KINDS: ReadonlySet<string> = new Set(briefs.kinds);
/** The briefs about the whole town, which name no one: they involve every follower. */
const TOWN_WIDE_BRIEFS: ReadonlySet<string> = new Set(briefs.townWide);

/** A body's regular sitting, as office-day records it. */
const MEETING_KIND = "public-meeting";
/** A reader's letter to the editor (the press's weekly letters step). */
const LETTER_KIND = "press.letter";
/** The week's sittings that took up nothing, printed as one brief. */
export const MEETINGS_WEEK_KIND = "meetings-week";

export interface DeskOutlet {
  readonly id: string;
  readonly organizationId: string;
  readonly placeId: string;
  readonly ownerId?: string | null;
  readonly headId: string | null;
  readonly reporterIds: readonly string[];
  readonly lean: number;
  readonly audienceRevenueMinor: number;
  readonly tier?: "local" | "national";
}

/** Why a reporter picked a story, by term. */
export interface PickReasons {
  readonly proximity: number;
  /** How strongly the outlet's followers hold views on its topic, 0 to 1. */
  readonly readerCare: number;
  /** People in town it names (log scale). */
  readonly people: number;
  /** Public figures it names, such as a president or a governor (log scale). */
  readonly renown: number;
  /** The reporter's own causes on its topic and grudges against those it names. */
  readonly drive: number;
  readonly score: number;
  /** Its place among the items the reporter weighed (1 is first). */
  readonly rank: number;
  readonly weighed: number;
  /** The vote it was covered with, when it came up at the same sitting. */
  readonly sitting?: string;
}

/** How a story came to read as it does, by term (each -1 to 1 before weighting). */
export interface SlantReasons {
  readonly lean: number;
  readonly tie: number;
  readonly publisher: number;
  /** The owner's regard for the people named. */
  readonly owner?: number;
  /** The owner's regard for their rivals, turned: a rival the owner dislikes helps. */
  readonly rivals?: number;
  readonly advertiser: number;
}

export interface PrintedStory {
  readonly id: string;
  readonly outletId: string;
  readonly organizationId: string;
  readonly reporterId: string;
  /** The public record (or interview) it reports. */
  readonly wireId: string;
  readonly kind: string;
  readonly date: string;
  readonly topic: string;
  /** The change the story argues for, after its slant. */
  readonly desiredChange: string;
  /** The change the record itself made. */
  readonly recordedChange: string;
  readonly ending: boolean;
  readonly subjectIds: readonly string[];
  /** For (+) or against (-) the recorded change and the people named, -1 to 1. */
  readonly slant: number;
  readonly pick: PickReasons | null;
  readonly slantReasons: SlantReasons;
  readonly readers: number;
  /**
   * Who received it: the named followers its deliveries reach (each holds
   * the story in what they know), and the town's counted residents who follow
   * the outlet, in the same share.
   */
  readonly receivedNamed: number;
  readonly receivedCounted: number;
  readonly interviewId: string | null;
}

/** What the desk needs from the press module. */
export interface DeskContext {
  readonly parameter: (key: string) => number;
  readonly followers: (outletId: string) => readonly string[];
  readonly townPlaceId: string;
  /** Yearly ad money a person's campaign spent at this outlet. */
  readonly adMoney: (outlet: DeskOutlet, personId: string) => number;
  /** The candidates running against a person in their open races. */
  readonly rivals: (personId: string) => readonly string[];
  readonly printed: (wireId: string, outletId: string) => boolean;
  /** The town's counted residents who follow an outlet. */
  readonly countedFollowers: (outlet: DeskOutlet) => number;
  readonly save: (story: PrintedStory) => void;
  /** The reporter who took a comment on a record for its story, or null. */
  readonly commentTakenBy?: (wireId: string) => string | null;
}

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));

const PROXIMITY: Readonly<Record<WireLevel, string>> = {
  town: "storyProximityTown",
  county: "storyProximityCounty",
  state: "storyProximityState",
  nation: "storyProximityNation",
};
/** A national outlet weighs the nation first and a town least. */
const NATIONAL_PROXIMITY: Readonly<Record<WireLevel, string>> = {
  town: "nationalProximityTown",
  county: "nationalProximityCounty",
  state: "nationalProximityState",
  nation: "nationalProximityNation",
};

/** How close two people are today (0 to 1), from the core's relationship record. */
export function closeness(api: CoreAPI, a: string, b: string): number {
  if (a === b) return 1;
  return closenessBetween(api.state as CoreState, a, b);
}

/** How strong a person's grudge against another is (0 to 1), from their drives. */
export function grudge(
  api: CoreAPI,
  holderId: string,
  targetId: string,
): number {
  const person = api.state.people.get(holderId);
  if (!person) return 0;
  // A grudge's id names its target (the drives engine's `kind:topic`).
  const drive = person.drives.get(`grudge:grudge:${targetId}`);
  return drive ? clamp(drive.strength, 0, 1) : 0;
}

/**
 * One person's regard for another, -1 to 1: how close they are, less a
 * grudge, and how near their views sit (the lean scale's full width apart
 * is -1, the same lean +1), weighted.
 */
export function regard(
  api: CoreAPI,
  p: (key: string) => number,
  holderId: string,
  otherId: string,
): number {
  const apart = Math.abs(leanOf(api, holderId) - leanOf(api, otherId));
  return clamp(
    closeness(api, holderId, otherId) -
      grudge(api, holderId, otherId) +
      p("regardViewsWeight") * (1 - apart / 2),
  );
}

/** A person's lean, -2 to 2; level where the world keeps no views. */
function leanOf(api: CoreAPI, id: string): number {
  return api.state.modules.has(VIEWS_MODULE_ID)
    ? (viewOf(api, id)?.lean ?? 0)
    : 0;
}

/**
 * How strongly an outlet's followers hold views on each topic: the mean of
 * their stances' strength and, for a policy topic, how far their lean puts
 * them on one side of it.
 */
function readerCare(
  api: CoreAPI,
  followerIds: readonly string[],
  topics: ReadonlySet<string>,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!followerIds.length) return out;
  const views = api.state.modules.has(VIEWS_MODULE_ID);
  for (const id of followerIds) {
    if (views)
      for (const stance of stancesOf(api, id))
        if (topics.has(stance.topic))
          out.set(stance.topic, (out.get(stance.topic) ?? 0) + stance.strength);
    const lean = leanOf(api, id) / 2;
    for (const topic of topics)
      if (isPolicyTopic(topic))
        out.set(
          topic,
          (out.get(topic) ?? 0) + Math.abs(lean * questionAxis(topic)),
        );
  }
  for (const [topic, sum] of out)
    out.set(topic, clamp(sum / followerIds.length, 0, 1));
  return out;
}

/**
 * How far a law on an amount (a wage floor, a tax rate) moves what it sets,
 * 0 to 1: the change against the amount it replaced. A policy law is read
 * through its readers' stances instead; an amount law has none, so the size of
 * its move is the care it asks of its readers. A new amount, or one that
 * replaced nothing recorded, moves nothing it can be measured against.
 */
function amountMove(item: WireItem): number {
  if (item.kind !== "law-took-effect" || isPolicyTopic(item.topic)) return 0;
  const was = Number(item.facts?.priorValue);
  const now = Number(item.facts?.inForceValue);
  if (!(Math.abs(was) > 0) || !Number.isFinite(now)) return 0;
  return clamp(Math.abs(now - was) / Math.abs(was), 0, 1);
}

/** The weight of a reporter's own causes and grudges on an item. */
function driveTerm(api: CoreAPI, reporterId: string, item: WireItem): number {
  const person = api.state.people.get(reporterId);
  if (!person) return 0;
  let out = 0;
  for (const drive of person.drives.values())
    if (drive.topic === item.topic) out += drive.strength;
  for (const id of item.subjectIds) out += grudge(api, reporterId, id);
  return clamp(out, 0, 1);
}

/** The slant of a story at an outlet by a reporter. */
export function slantOf(
  api: CoreAPI,
  ctx: Pick<DeskContext, "parameter" | "adMoney" | "rivals">,
  outlet: DeskOutlet,
  reporterId: string,
  item: Pick<WireItem, "topic" | "desiredChange" | "subjectIds">,
): { slant: number; reasons: SlantReasons } {
  const p = ctx.parameter;
  // The outlet's line on the change: its lean times the question's side.
  const sign =
    item.desiredChange === "repeal"
      ? -1
      : item.desiredChange === "enact"
        ? 1
        : 0;
  const lean = isPolicyTopic(item.topic)
    ? clamp((outlet.lean / 2) * questionAxis(item.topic) * sign)
    : 0;
  const named = item.subjectIds.filter((id) => api.state.people.has(id));
  const mean = (f: (id: string) => number) =>
    named.length ? named.reduce((s, id) => s + f(id), 0) / named.length : 0;
  const tie = clamp(
    mean((id) => closeness(api, reporterId, id) - grudge(api, reporterId, id)),
  );
  const head = outlet.headId;
  const publisher = head
    ? clamp(mean((id) => closeness(api, head, id) - grudge(api, head, id)))
    : 0;
  // The owner's regard for the people named, and for their rivals: an owner
  // who has fallen out with a candidate's opponent turns the candidate's
  // coverage warmer, though the candidate did nothing for it.
  const owner = outlet.ownerId ?? null;
  const ownerTerm = owner ? mean((id) => regard(api, p, owner, id)) : 0;
  const rivalsTerm = owner
    ? mean((id) => {
        const rivals = ctx
          .rivals(id)
          .filter((r) => r !== owner && api.state.people.has(r));
        return rivals.length
          ? -rivals.reduce((s, r) => s + regard(api, p, owner, r), 0) /
              rivals.length
          : 0;
      })
    : 0;
  const advertiser = clamp(
    mean((id) =>
      outlet.audienceRevenueMinor > 0
        ? ctx.adMoney(outlet, id) / outlet.audienceRevenueMinor
        : 0,
    ),
    0,
    1,
  );
  const reasons = {
    lean,
    tie,
    publisher,
    owner: ownerTerm,
    rivals: rivalsTerm,
    advertiser,
  };
  return {
    slant: clamp(
      p("slantLeanWeight") * lean +
        p("slantTieWeight") * tie +
        p("slantPublisherWeight") * publisher +
        p("slantOwnerWeight") * ownerTerm +
        p("slantRivalWeight") * rivalsTerm +
        p("slantAdvertiserWeight") * advertiser,
    ),
    reasons,
  };
}

const FLIP: Readonly<Record<string, string>> = {
  enact: "repeal",
  repeal: "enact",
};

/** Print a story: record it and send it to the outlet's followers. */
export function printItem(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: DeskOutlet,
  reporterId: string,
  item: WireItem,
  pick: PickReasons | null,
  options: {
    readonly interviewId?: string;
    readonly slant?: { slant: number; reasons: SlantReasons };
    readonly facts?: Readonly<Record<string, string>>;
  } = {},
): PrintedStory {
  const { slant, reasons } =
    options.slant ?? slantOf(api, ctx, outlet, reporterId, item);
  const argued =
    slant < 0
      ? (FLIP[item.desiredChange] ?? item.desiredChange)
      : item.desiredChange;
  const readers = ctx.followers(outlet.id);
  const story: PrintedStory = {
    id: `printed:${outlet.id}:${item.id}`,
    outletId: outlet.id,
    organizationId: outlet.organizationId,
    reporterId,
    wireId: item.id,
    kind: item.kind,
    date: api.state.date,
    topic: item.topic,
    desiredChange: argued,
    recordedChange: item.desiredChange,
    ending: item.ending,
    subjectIds: item.subjectIds,
    slant,
    pick,
    slantReasons: reasons,
    readers: readers.length,
    receivedNamed: 0,
    receivedCounted: 0,
    interviewId: options.interviewId ?? null,
  };
  const received = printStory(
    api,
    {
      id: story.id,
      kind: "press.printed",
      outletId: outlet.organizationId,
      date: api.state.date,
      placeId: ctx.townPlaceId,
      topic: story.topic,
      // Readers take a side only on a question they can hold one on (a policy
      // or a budget line); a jobs report or a filing informs without one.
      ...(isPolicyTopic(story.topic) ? { desiredChange: argued } : {}),
      framing: slant,
      moodImpulse: (ctx.parameter("storyImpulse") * (1 + Math.abs(slant))) / 2,
      facts: {
        ...item.facts,
        sourceRecordId: item.id,
        // What a reader can bring up: which outlet printed what. The reporter
        // makes the story's case, so a reader moves by their standing with
        // the reporter (views engine); the outlet's line already chose the
        // change the story argues.
        [`printed:${outlet.organizationId}:story`]: story.id,
        [VIEWS_SPEAKER_KEY]: reporterId,
        ...(options.facts ?? {}),
      },
    },
    readers as PersonId[],
  );
  const share = readers.length ? received / readers.length : 0;
  const saved: PrintedStory = {
    ...story,
    receivedNamed: received,
    receivedCounted: Math.round(ctx.countedFollowers(outlet) * share),
  };
  ctx.save(saved);
  recordNamed(api, ctx, outlet, item, saved);
  return saved;
}

/** The record of who a printed story names (recordNamed). */
export const PRESS_STORY_EVENT = "press-story";

/**
 * Who a printed story names, as a record the people it names read: the one
 * person its record is about, and the sponsor of the bill it covers, each
 * with whether the story runs for or against them. The story reaches its
 * readers through the news engine; this record is how an officeholder's own
 * office learns of it (a staffer brings it in). A story about one person runs
 * against them when its slant does; a story about a bill runs against its
 * sponsor when it argues for the opposite of the bill's own change.
 */
function recordNamed(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: DeskOutlet,
  item: WireItem,
  story: PrintedStory,
): void {
  const full = (id: string | undefined): id is string =>
    !!id && api.state.people.has(id);
  const people = item.subjectIds.filter(full);
  const subjectId = people.length === 1 ? people[0] : undefined;
  const billId = item.facts?.billId;
  const bill =
    billId && api.state.modules.has(LEGISLATURE_MODULE_ID)
      ? (api.moduleState(LEGISLATURE_MODULE_ID).table("bills").get(billId) as
          | {
              readonly number?: string;
              readonly sponsorId?: string;
              readonly provisions?: readonly { readonly value?: number }[];
            }
          | undefined)
      : undefined;
  // A bill is talked of by its number; one never filed has none to name.
  const sponsorId =
    bill?.number && full(bill.sponsorId) ? bill.sponsorId : undefined;
  if (!subjectId && !sponsorId) return;
  const side = (sign: number) =>
    sign < 0 ? "against" : sign > 0 ? "for" : "even";
  // The bill's own change, as its first provision makes it (press-topics).
  const billChange =
    (bill?.provisions?.[0]?.value ?? 1) > 0 ? "enact" : "repeal";
  api.emit({
    id: `${PRESS_STORY_EVENT}:${story.id}`,
    date: api.state.date,
    kind: PRESS_STORY_EVENT,
    personIds: [...new Set([subjectId, sponsorId].filter(full))],
    placeId: ctx.townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Story ${story.id}, printed by ${outlet.organizationId}`,
      asOf: api.state.date,
    },
    facts: {
      storyId: story.id,
      outletId: outlet.organizationId,
      reporterId: story.reporterId,
      wireId: item.id,
      topic: item.topic,
      ...(subjectId ? { subjectId, subjectFraming: side(story.slant) } : {}),
      ...(billId && sponsorId
        ? {
            billId,
            sponsorId,
            billFraming: side(
              story.slant === 0
                ? 0
                : story.desiredChange === billChange
                  ? 1
                  : -1,
            ),
          }
        : {}),
    },
  });
}

/** The kind of the news story the press writes about a record from before day one. */
export const ARCHIVE_STORY_KIND = "press.archived";

/**
 * Write a story about a record from before day one (the news archive): the
 * outlet's reporter slants and frames it exactly as a printed story, and it
 * is returned for the press's archive table, but nobody receives it going forward.
 * The archive (past-news.ts) decides who heard it and when, by the news
 * engine's delivery rule. With no reporter at the outlet the story is
 * unslanted and has no printed row.
 */
export function archiveItem(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: DeskOutlet,
  reporterId: string | null,
  item: WireItem,
  facts: Readonly<Record<string, string>>,
): { story: Story; printed: PrintedStory | null } {
  const { slant, reasons } = reporterId
    ? slantOf(api, ctx, outlet, reporterId, item)
    : {
        slant: 0,
        reasons: { lean: 0, tie: 0, publisher: 0, advertiser: 0 },
      };
  const argued =
    slant < 0
      ? (FLIP[item.desiredChange] ?? item.desiredChange)
      : item.desiredChange;
  const id = `printed:${outlet.id}:${item.id}`;
  const printed: PrintedStory | null = reporterId
    ? {
        id,
        outletId: outlet.id,
        organizationId: outlet.organizationId,
        reporterId,
        wireId: item.id,
        kind: item.kind,
        date: item.date,
        topic: item.topic,
        desiredChange: argued,
        recordedChange: item.desiredChange,
        ending: item.ending,
        subjectIds: item.subjectIds,
        slant,
        pick: null,
        slantReasons: reasons,
        readers: 0,
        receivedNamed: 0,
        receivedCounted: 0,
        interviewId: null,
      }
    : null;
  return {
    printed,
    story: {
      id,
      kind: ARCHIVE_STORY_KIND,
      outletId: outlet.organizationId,
      date: item.date,
      placeId: ctx.townPlaceId,
      topic: item.topic,
      ...(isPolicyTopic(item.topic) ? { desiredChange: argued } : {}),
      framing: slant,
      moodImpulse: (ctx.parameter("storyImpulse") * (1 + Math.abs(slant))) / 2,
      facts: { ...facts, recordKind: item.kind },
    },
  };
}

/** Whether a record is about a budget bill. */
function isBudgetBill(api: CoreAPI, item: WireItem): boolean {
  const billId = item.facts?.billId;
  if (!billId || !api.state.modules.has(LEGISLATURE_MODULE_ID)) return false;
  const bill = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .get(billId) as unknown as { kind?: string } | undefined;
  return bill?.kind === "budget";
}

/**
 * Whether a named official serves in a federal or state office (a president, a
 * governor): public figures by their office, though they are not full people.
 */
export function holdsHighOffice(api: CoreAPI, id: string): boolean {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return false;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  // The id names the term the official was first seated on, which a re-election or a move to
  // another seat ends: the terms the person serves now (`servingTermsOf`) are what they hold.
  const minted = offices
    .table("terms")
    .get(id.slice("official:".length)) as unknown as
    { personId: string } | undefined;
  if (!minted) return false;
  return servingTermsOf(api, minted.personId).some((term) => {
    const office = offices.table("offices").get(term.officeId) as unknown as
      { level?: string } | undefined;
    return office?.level === "federal" || office?.level === "state";
  });
}

/** Whether the person serves a term in a local (not a state or federal) office. */
function servesLocally(api: CoreAPI, personId: string): boolean {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return false;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  return (
    offices.table("terms").query("byPerson", [personId]) as unknown as {
      status?: string;
      officeId: string;
    }[]
  ).some((term) => {
    if (term.status !== "serving") return false;
    const level = (
      offices.table("offices").get(term.officeId) as unknown as
        { level?: string } | undefined
    )?.level;
    return level !== undefined && level !== "federal" && level !== "state";
  });
}

/**
 * Between two items of equal score, the one more people saw happen leads
 * (the witnesses its record names), then the earlier, and only then the id:
 * never the alphabet alone (the President's inaugural address lost every
 * national desk to a cabinet nomination on its id, Arrowhead Springs,
 * Wyoming, seed da5c1844fcee4270). Returns the rule that decided.
 */
export function tieRule(
  a: WireItem,
  b: WireItem,
): { readonly order: number; readonly rule: "witnesses" | "date" | "id" } {
  const witnesses = (b.witnessCount ?? 0) - (a.witnessCount ?? 0);
  if (witnesses) return { order: witnesses, rule: "witnesses" };
  const date = a.date.localeCompare(b.date);
  if (date) return { order: date, rule: "date" };
  return { order: a.id.localeCompare(b.id), rule: "id" };
}

const tieOrder = (a: WireItem, b: WireItem): number => tieRule(a, b).order;

/**
 * One week at an outlet: each reporter, in turn, weighs the fresh items its
 * outlet has not printed and files their best, up to their week's count.
 */
export function runDesk(
  api: CoreAPI,
  ctx: DeskContext,
  outlet: DeskOutlet,
  wire: readonly WireItem[],
): PrintedStory[] {
  const p = ctx.parameter;
  const since = addDays(makeIsoDate(api.state.date), -p("storyFreshDays"));
  const open = wire.filter(
    (item) =>
      item.date >= since &&
      !ctx.printed(item.id, outlet.id) &&
      !(outlet.tier === "national" && !nationalCarries(item)),
  );
  if (!open.length || !outlet.reporterIds.length) return [];
  // A body's sitting is news for what it did, not that it sat (CTO, Nov 1,
  // under the owner's "real ones with some good fluff or else it will get
  // old"): one that took up business is told by its votes, one story a
  // bill, so its own record prints only where none of its votes reached the
  // wire; one that took up nothing goes in the week's meetings brief. A
  // county board's sittings filled 94 of a year's headlines in Blunt, South
  // Dakota, seed paper-nov1:2, all "Hughes County Board of Commissioners
  // meets".
  const routine = open.filter(
    (item) => item.kind === MEETING_KIND && !(Number(item.facts?.items) > 0),
  );
  const toldByVotes = (item: WireItem) =>
    item.kind === MEETING_KIND &&
    wire.some(
      (vote) =>
        sittingVote(vote) &&
        vote.date === item.date &&
        vote.facts?.chamber === item.facts?.officeId,
    );
  const told = new Set([
    ...routine.map((item) => item.id),
    ...open.filter(toldByVotes).map((item) => item.id),
  ]);
  const followers = ctx.followers(outlet.id);
  const care = readerCare(api, followers, new Set(open.map((i) => i.topic)));
  const core = api.state as CoreState;
  const inTown = (id: string) =>
    core.people.get(id)?.placeId === ctx.townPlaceId;
  // The counted people a record happened to (a counted household's eviction
  // names its members by its facts, not as people), in town by the same rule
  // as a full subject: where their counted record lives, or where they live
  // once filled in.
  const counted = residentsRuntime(core)?.store;
  const countedInTown = (item: WireItem): number => {
    const listed = item.facts?.[COUNTED_SUBJECTS];
    if (!listed) return api.parameter("zero");
    const h = counted?.liveHousehold(item.facts?.[COUNTED_HOUSEHOLD] ?? "");
    const here =
      h?.placeId === ctx.townPlaceId
        ? new Set(counted!.memberIdsOf(h))
        : undefined;
    return (JSON.parse(listed) as string[]).filter((id) =>
      core.people.has(id) ? inTown(id) : here?.has(id) === true,
    ).length;
  };
  // A law taking effect names no one, but it involves the outlet's followers
  // it reaches: the named ones the law-reach records name (every named
  // follower where they hold no record for it, since a law in force binds the
  // town) and the counted followers, who are read by the same rule as a
  // full follower.
  // The jurisdictions whose law binds the town: the nation, its state, its
  // county, its township and the town itself (the laws engine's chain).
  const chainJurisdictions = api.state.modules.has(LAWS_MODULE_ID)
    ? new Set(lawChain(api).levels.map((level) => level.jurisdiction))
    : null;
  const bindsTown = (lawId: string): boolean => {
    if (!chainJurisdictions) return true;
    const row = api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as
      { jurisdiction?: string } | undefined;
    return !row?.jurisdiction || chainJurisdictions.has(row.jurisdiction);
  };
  // Who a count's result concerns: the named voters on its roll.
  const countRoll = (item: WireItem): ((id: string) => boolean) | null => {
    const facts = item.facts ?? {};
    if (
      item.kind === "election-result" &&
      facts.contestId &&
      api.state.modules.has(VOTING_MODULE_ID)
    )
      return (id) => onContestRoll(api, facts.contestId!, id);
    if (
      item.kind === "ballot-measure-result" &&
      facts.measureId &&
      api.state.modules.has(BALLOT_MEASURES_MODULE_ID)
    )
      return (id) => !!measureVoteOf(api, facts.measureId!, id);
    // A recall's vote is put to every adult of the town (recalls.ts
    // `townVoters`); its petition's steps are not a count.
    if (
      item.kind === "recall-outcome" &&
      (facts.outcome === "removed" || facts.outcome === "kept")
    )
      return (id) => inTown(id);
    return null;
  };
  const involved = (item: WireItem): number => {
    // A charge against, or an exposure of, someone serving in a local office
    // is the town's business: it involves every follower, named or counted,
    // as a law in force does, so it is not outranked by every law and town
    // hall that week.
    // stopgapId: SG-TRAITS-press-local-misconduct-reach
    if (
      (item.kind === "justice.charged" || item.kind === "press.exposed") &&
      item.subjectIds.some((id) => servesLocally(api, id))
    )
      return followers.length + ctx.countedFollowers(outlet);
    // The month's police log and the school year's results are the whole
    // town's, as a law in force is: every follower, named or counted.
    if (TOWN_WIDE_BRIEFS.has(item.kind))
      return followers.length + ctx.countedFollowers(outlet);
    // A local body's vote on a bill (the town's, or the county's that covers
    // it), carried or failed, decides a rule for the whole town as a law in
    // force binds it: every follower, named or counted, is involved (a
    // council member's own ordinance went unprinted behind town halls,
    // Mentor, Kentucky, Oct 29; a county board member's in Mimbres, New
    // Mexico, seed 2f279bff0762b7f00275).
    if (sittingVote(item))
      return followers.length + ctx.countedFollowers(outlet);
    // A budget the executive signs or vetoes binds the whole town as much as
    // a law in force: every follower, named or counted, is involved.
    if (item.kind === "executive-action" && isBudgetBill(api, item))
      return followers.length + ctx.countedFollowers(outlet);
    // A count of the town's voters (a race for a seat, a state question on
    // the town's ballot, a recall put to the town) is the business of every
    // follower who could vote in it, as a law in force binds everyone it
    // covers: the named followers on its roll (a ward seat's ward, the town
    // for an at-large or wider seat), and the counted followers in the same
    // share. A race once weighed only its three or four candidates and was
    // outranked by every vote and law of its week (Searsboro, Iowa, seed
    // de4ef0f8ff6efdfb:agree:15, drawn for concession-reported).
    const roll = countRoll(item);
    if (roll) {
      const named = followers.filter(roll).length;
      const share = followers.length ? named / followers.length : 1;
      return named + share * ctx.countedFollowers(outlet);
    }
    // A month's move in the town's conditions reaches every follower in
    // proportion to its size (the largest relative move among its facts).
    if (item.kind === OUTCOME_MONTH_KIND)
      return (
        Math.min(1, Number(item.facts?.magnitude ?? 0)) *
        (followers.length + ctx.countedFollowers(outlet))
      );
    // A budget line a measure changed binds what the line pays for, as a law
    // in force does: the people its engines applied the change to (else every
    // named follower) and the counted followers. The year's adoption is the
    // budget bill's story, not one per line.
    const lineChange =
      item.kind === "budget-line-changed" &&
      !item.id.endsWith(":adopted") &&
      !!item.facts?.line;
    const lawId = lineChange ? item.facts?.measureId : item.facts?.lawId;
    const key = lineChange
      ? `budget-line:${item.facts?.line}`
      : item.facts?.series;
    if ((item.kind !== "law-took-effect" && !lineChange) || !lawId || !key)
      return 0;
    // Another state's or town's law binds no one here: it involves none of
    // the outlet's followers (Hawaii's cannabis law outranked the
    // President's inaugural address on every national desk in Arrowhead
    // Springs, Wyoming, seed da5c1844fcee4270).
    if (item.kind === "law-took-effect" && !bindsTown(String(lawId))) return 0;
    const reached = new Set(reachedBy(api, key, lawId).map((r) => r.personId));
    const named = reached.size
      ? followers.filter((id) => reached.has(id)).length
      : followers.length;
    return named + ctx.countedFollowers(outlet);
  };
  // A reader's letter is the outlet's own page, never a reporter's pick or
  // the briefs column's: printed after the column, in the writer's words.
  const letters = open.filter(
    (item) => item.kind === LETTER_KIND && item.facts?.outletId === outlet.id,
  );
  const base = open
    .filter((item) => !told.has(item.id) && item.kind !== LETTER_KIND)
    .map((item) => ({
      item,
      proximity: p(
        (outlet.tier === "national" ? NATIONAL_PROXIMITY : PROXIMITY)[
          item.level
        ],
      ),
      readerCare: Math.max(care.get(item.topic) ?? 0, amountMove(item)),
      people: Math.log1p(
        Math.max(
          item.subjectIds.filter(inTown).length + countedInTown(item),
          involved(item),
        ),
      ),
      renown: Math.log1p(
        item.subjectIds.filter((id) => isPublicFigure(api, id)).length +
          (item.officialIds ?? []).filter((id) => holdsHighOffice(api, id))
            .length,
      ),
    }));
  const taken = new Set<string>();
  // The bills and races this outlet has a story on this week: one story
  // each, though a race's seats reach the wire on different days or a second
  // reporter takes another of its seats (Kewanna, Indiana, seed
  // 3c91e07a5d2f8b14:agree:0, printed council seats 0 and 2 of one race).
  const bills = new Set<string>();
  // The races whose money or backing this outlet has told this week.
  const racesTold = new Set<string>();
  const out: PrintedStory[] = [];
  for (const reporterId of outlet.reporterIds) {
    if (!api.state.people.get(reporterId)?.alive) continue;
    // Briefs are the column's, never a reporter's story.
    const scored = base
      .filter(
        (row) => !taken.has(row.item.id) && !BRIEF_KINDS.has(row.item.kind),
      )
      .map((row) => {
        const drive = driveTerm(api, reporterId, row.item);
        return {
          ...row,
          drive,
          score:
            row.proximity *
            (1 +
              p("storyReaderCareWeight") * row.readerCare +
              p("storyPeopleWeight") * row.people +
              p("storyRenownWeight") * row.renown +
              p("storyDriveWeight") * drive),
        };
      })
      .sort((a, b) => b.score - a.score || tieOrder(a.item, b.item))
      // One gift story and one endorsement story a race, the best of its
      // week's records, before any slot is spent on the rest.
      .filter((row, at, all) => {
        const race = raceTold(row.item);
        return (
          !race ||
          (!racesTold.has(race) &&
            all.findIndex((other) => raceTold(other.item) === race) === at)
        );
      })
      // A story the reporter asked someone to comment on is theirs to file
      // (a press interview whose ending keeps that the story runs): it comes
      // first among their week's stories, ahead of the rest by score.
      .sort(
        (a, b) =>
          Number(ctx.commentTakenBy?.(b.item.id) === reporterId) -
          Number(ctx.commentTakenBy?.(a.item.id) === reporterId),
      );
    const count = Math.min(
      p(
        outlet.tier === "national"
          ? "nationalStoriesPerReporterWeek"
          : "storiesPerReporterWeek",
      ),
      scored.length,
    );
    let rank = 0;
    for (const row of scored) {
      if (rank >= count) break;
      if (taken.has(row.item.id)) continue;
      rank += 1;
      // A local body's sitting is covered whole: the reporter who files one
      // of its votes files the others it took that day, one story a bill, as
      // a paper reports a meeting's actions (a county board member's
      // ordinance went unprinted behind the same board's three housing and
      // policing votes, Cooper Landing, Alaska, seed 12edebda89d90d033822).
      // An election night is covered whole the same way: the reporter who
      // files one of the races the town counted that day files the others,
      // one story a seat, as a paper prints the night's results (the mayor's
      // race took every outlet's week and the council race it was counted
      // with went unprinted, Searsboro, Iowa, seed de4ef0f8ff6efdfb:agree:15).
      const sitting =
        sittingVote(row.item) || row.item.kind === "election-result"
          ? scored.filter(
              (other) =>
                other === row ||
                (!taken.has(other.item.id) &&
                  sameSitting(row.item, other.item)),
            )
          : [row];
      for (const one of sitting) {
        taken.add(one.item.id);
        const race = raceTold(one.item);
        if (race) racesTold.add(race);
        // One story a bill: a failed bill's vote and its failure are one.
        // One story a race: the seats of a race that fills several at once
        // are one count, told once (Words lead, Nov 13, rule 30).
        const billId = String(
          one.item.facts?.billId ?? one.item.facts?.race ?? one.item.id,
        );
        if (bills.has(billId)) continue;
        bills.add(billId);
        out.push(
          printItem(api, ctx, outlet, reporterId, one.item, {
            proximity: one.proximity,
            readerCare: one.readerCare,
            people: one.people,
            renown: one.renown,
            drive: one.drive,
            score: one.score,
            rank,
            weighed: scored.length,
            ...(one === row ? {} : { sitting: row.item.id }),
          }),
        );
      }
    }
  }
  // The briefs column (owner, Oct 29: side stories, "a line or two"): a
  // local outlet prints the short items from the town's own records that its
  // reporters left (data/press/briefs.json), the most read first, up to its
  // space; a week whose records hold none prints none.
  const filer = outlet.reporterIds.find(
    (id) => api.state.people.get(id)?.alive,
  );
  if (outlet.tier !== "national" && filer) {
    const column = base
      .filter(
        (row) => !taken.has(row.item.id) && BRIEF_KINDS.has(row.item.kind),
      )
      .map((row) => ({
        ...row,
        score:
          row.proximity *
          (1 +
            p("storyReaderCareWeight") * row.readerCare +
            p("storyPeopleWeight") * row.people +
            p("storyRenownWeight") * row.renown),
      }))
      .sort((a, b) => b.score - a.score || tieOrder(a.item, b.item));
    const space = Math.min(p("briefsPerOutletWeek"), column.length);
    for (let rank = 0; rank < space; rank += 1) {
      const row = column[rank]!;
      taken.add(row.item.id);
      out.push(
        printItem(api, ctx, outlet, filer, row.item, {
          proximity: row.proximity,
          readerCare: row.readerCare,
          people: row.people,
          renown: row.renown,
          drive: 0,
          score: row.score,
          rank: rank + 1,
          weighed: column.length,
        }),
      );
    }
    // The week's sittings that took up nothing, in one brief after the
    // column: each body named once, however often it sat.
    const weekAgo = addDays(
      makeIsoDate(api.state.date),
      -api.parameter("daysPerWeek"),
    );
    const sat = routine
      .filter((item) => item.date > weekAgo)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const bodies = [
      ...new Set(sat.flatMap((item) => item.facts?.officeId ?? [])),
    ];
    if (bodies.length) {
      const proximity = p(PROXIMITY.town);
      out.push(
        printItem(
          api,
          ctx,
          outlet,
          filer,
          {
            id: `${MEETINGS_WEEK_KIND}:${outlet.id}:${api.state.date}`,
            kind: MEETINGS_WEEK_KIND,
            date: api.state.date,
            level: "town",
            topic: MEETINGS_WEEK_KIND,
            desiredChange: "met",
            ending: false,
            subjectIds: [],
            facts: {
              officeIds: bodies.join(","),
              meetingIds: sat.map((item) => item.id).join(","),
              // The day the week's first such sitting met, which the brief
              // is dated by, so no two weeks print the same line.
              sittingDate: sat[0]!.date,
            },
          },
          {
            proximity,
            readerCare: 0,
            people: 0,
            renown: 0,
            drive: 0,
            score: proximity,
            rank: column.length + 1,
            weighed: column.length + 1,
          },
        ),
      );
    }
  }
  // The week's letter, in the writer's own voice: the change it argues is
  // the writer's, and its readers are moved by their standing with the
  // writer, as with a reporter's story.
  for (const item of letters) {
    const writer = item.subjectIds[0];
    if (!writer || !api.state.people.get(writer)?.alive) continue;
    const proximity = p(PROXIMITY.town);
    out.push(
      printItem(
        api,
        ctx,
        outlet,
        // A letter is printed under its writer's name.
        writer,
        item,
        {
          proximity,
          readerCare: 0,
          people: 0,
          renown: 0,
          drive: 0,
          score: proximity,
          rank: 1,
          weighed: letters.length,
        },
        {
          slant: {
            slant: Math.min(1, Number(item.facts?.strength ?? 0)),
            reasons: { lean: 0, tie: 0, publisher: 0, advertiser: 0 },
          },
          facts: { [VIEWS_SPEAKER_KEY]: writer },
        },
      ),
    );
  }
  return out;
}

/**
 * Whether two items are one sitting's actions (a local body's votes on one
 * day) or one election night's results (the races of one level counted on
 * one day), covered whole by the reporter who files either.
 */
function sameSitting(a: WireItem, b: WireItem): boolean {
  if (a.date !== b.date) return false;
  if (a.kind === "election-result")
    return b.kind === "election-result" && a.level === b.level;
  return (
    sittingVote(a) && sittingVote(b) && a.facts?.chamber === b.facts?.chamber
  );
}

/** A local body's vote on a bill, carried or failed (one of a sitting's actions). */
function sittingVote(item: WireItem): boolean {
  return (
    (item.level === "town" || item.level === "county") &&
    (item.kind === "legislative-vote" || item.kind === "bill-failed") &&
    !!item.facts?.chamber
  );
}
