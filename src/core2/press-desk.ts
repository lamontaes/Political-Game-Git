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
import { addDays, makeIsoDate } from "./kernel/dates";
import { questionAxis } from "./campaign-views";
import { closenessBetween } from "./closeness";
import { isPolicyTopic, type WireItem, type WireLevel } from "./press-topics";
import type { CoreAPI, CoreState, PersonId } from "./types";
import { printStory, type Story } from "./modules/news";
import { isPublicFigure } from "./past-public";
import { reachedBy } from "./law-reach/host";
import {
  stancesOf,
  viewOf,
  VIEWS_MODULE_ID,
  VIEWS_SPEAKER_KEY,
} from "./modules/views";

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

/** A leaked story's facts as its readers get them: the leaker stays with the reporter. */
function withoutLeaker(
  facts: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(facts ?? {}).filter(
      ([key]) => key !== "leakedBy" && key !== "leakedTo",
    ),
  );
}

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
        ...withoutLeaker(item.facts),
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
  return saved;
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
    (item) => item.date >= since && !ctx.printed(item.id, outlet.id),
  );
  if (!open.length || !outlet.reporterIds.length) return [];
  const followers = ctx.followers(outlet.id);
  const care = readerCare(api, followers, new Set(open.map((i) => i.topic)));
  const core = api.state as CoreState;
  const inTown = (id: string) =>
    core.people.get(id)?.placeId === ctx.townPlaceId;
  // A law taking effect names no one, but it involves the outlet's followers
  // it reaches: the named ones the law-reach records name (every named
  // follower where they hold no record for it, since a law in force binds the
  // town) and the counted followers, who are read by the same rule as a
  // full follower.
  const involved = (item: WireItem): number => {
    const lawId = item.facts?.lawId;
    const key = item.facts?.series;
    if (item.kind !== "law-took-effect" || !lawId || !key) return 0;
    const reached = new Set(reachedBy(api, key, lawId).map((r) => r.personId));
    const named = reached.size
      ? followers.filter((id) => reached.has(id)).length
      : followers.length;
    return named + ctx.countedFollowers(outlet);
  };
  const base = open.map((item) => ({
    item,
    proximity: p(
      (outlet.tier === "national" ? NATIONAL_PROXIMITY : PROXIMITY)[item.level],
    ),
    readerCare: care.get(item.topic) ?? 0,
    people: Math.log1p(
      Math.max(item.subjectIds.filter(inTown).length, involved(item)),
    ),
    renown: Math.log1p(
      item.subjectIds.filter((id) => isPublicFigure(api, id)).length,
    ),
  }));
  const taken = new Set<string>();
  const out: PrintedStory[] = [];
  for (const reporterId of outlet.reporterIds) {
    if (!api.state.people.get(reporterId)?.alive) continue;
    const scored = base
      .filter(
        (row) =>
          !taken.has(row.item.id) &&
          // A leak was given to one reporter, and is theirs alone.
          (!row.item.facts?.leakedTo || row.item.facts.leakedTo === reporterId),
      )
      .map((row) => {
        const drive = driveTerm(api, reporterId, row.item);
        // A friend named in a story weighs against filing it; a leak from
        // someone the reporter trusts weighs for it (reads the closeness a
        // favor or a leak writes).
        const friend = Math.max(
          0,
          ...row.item.subjectIds.map((id) => closeness(api, reporterId, id)),
        );
        const leaker = row.item.facts?.leakedBy;
        const trusted = leaker
          ? Math.max(0, closeness(api, reporterId, leaker))
          : 0;
        return {
          ...row,
          drive,
          score:
            row.proximity *
            (1 +
              p("storyReaderCareWeight") * row.readerCare +
              p("storyPeopleWeight") * row.people +
              p("storyRenownWeight") * row.renown +
              p("storyDriveWeight") * drive -
              p("storyFriendWeight") * friend +
              p("storyLeakWeight") * trusted),
        };
      })
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    const count = Math.min(
      p(
        outlet.tier === "national"
          ? "nationalStoriesPerReporterWeek"
          : "storiesPerReporterWeek",
      ),
      scored.length,
    );
    for (let rank = 0; rank < count; rank += 1) {
      const row = scored[rank]!;
      taken.add(row.item.id);
      out.push(
        printItem(api, ctx, outlet, reporterId, row.item, {
          proximity: row.proximity,
          readerCare: row.readerCare,
          people: row.people,
          renown: row.renown,
          drive: row.drive,
          score: row.score,
          rank: rank + 1,
          weighed: scored.length,
        }),
      );
    }
  }
  return out;
}
