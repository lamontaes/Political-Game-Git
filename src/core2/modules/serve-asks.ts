/**
 * Asking someone to serve (brief J, Nov 14, 2026): the player asks a person
 * to take a seat the player fills (a running mate on their ticket, a town
 * department head as mayor or a cabinet member as governor; aides by the same
 * read later), and the person answers from their own record. Nothing is rolled: the answer is a sum of named terms
 * (`src/core2/data/serve/willingness.json`), yes where it is above zero, and the same
 * person asked on the same record gives the same answer.
 *
 * The ask is a scene: `askToServe` keeps the ask and emits `serve-asked`, the
 * director plays it as the player's ask (`ask-to-serve`), and only the
 * scene's ending seats anyone: a yes names the person through the seat's own
 * engine (`chooseRunningMate` for a ticket; the "name a department head" act
 * or `appointGovernor` for a post, with the council's or the chamber's
 * confirmation as before), a no is kept with its reason and date and the
 * seat stays open. A no stands for now (owner, Nov 14 05:17Z: "Yes, but ask
 * again later"): the player may ask again after `askAgain.days`, or sooner
 * once what the no rested on has changed on the record.
 *
 * One row per seat and person, written over when asked again: the table
 * holds at most the people offered for the player's own open seats.
 *
 * "Choose for me" (or a post left to the official's own choice) plays no
 * scene and seats the world's pick as before, and
 * the world's own picks do not read this willingness (pool item
 * world-picks-read-serve-willingness).
 */
import willingness from "../data/serve/willingness.json" with { type: "json" };
import { ambitionOf } from "../candidate-pool";
import { closenessBetween } from "../closeness";
import { meetInTalk } from "./people";
import { workHeld } from "../person-work";
import { PLATFORM_QUESTIONS, type Stance } from "../campaign-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import type { ModuleRow } from "../module-data";
import { registerModule } from "../state";
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import {
  CAMPAIGNS_MODULE_ID,
  endorsementsOf,
  parsePlatform,
} from "./campaigns";
import { NEWS_MODULE_ID, storiesHeard } from "./news";
import {
  ELECTIONS_MODULE_ID,
  ticketOfficeContest,
  type ContestRow,
  type FilingRow,
} from "./elections";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { officialOf } from "./officials";
import {
  fillInStateCandidate,
  headCandidates,
  postConfirmed,
  postRecord,
  postsToFill,
  stateCandidates,
  statePostsToFill,
} from "./executive";
import { appointGovernor, prepareAct } from "./office-day";
import { campaignParameter } from "../campaign-data";
import { viewOn } from "./views";
import { contestPositions } from "../contest-positions";
import {
  chooseRunningMate,
  runningMateChoice,
  scandalStoriesOf,
  voterLean,
} from "./voting";

export const SERVE_ASKS_MODULE_ID = "core2-serve-asks-v1";
/** The event an ask is played from: the director's `ask-to-serve` cause. */
export const SERVE_ASKED_EVENT = "serve-asked";

/** The scene endings that seat the person, and the ones that keep a no. */
/** A yes, and a yes on the player's promise (the price end). */
const YES_ENDINGS: ReadonlySet<string> = new Set(["serving", "promised"]);
const NO_ENDINGS: ReadonlySet<string> = new Set(["turned-down"]);

type Tagged = { readonly value: number };
type SeatWeights = Readonly<Record<string, Tagged | string>>;
const SEATS = willingness.seats as unknown as Readonly<
  Record<string, SeatWeights>
>;
const w = (seat: string, key: string): number =>
  (SEATS[seat]?.[key] as Tagged | undefined)?.value ?? 0;

/** The terms a no can rest on, as its reason; the words name each. */
export type ServeReason =
  | "own-seat"
  | "own-race"
  | "apart"
  | "heard"
  | "stranger"
  | "long-shot"
  | "pays-less"
  | "own-job";

/** The terms a yes rests on, as its reason. */
export type ServeYesReason =
  "trust" | "step-up" | "agree" | "real-race" | "pay";

/** What the read stood on: kept with the ask, so a change on the record lets the player ask again. */
export interface ServeGrounds {
  /** The question the asked person holds most strongly, and both stances on it. */
  readonly question: string;
  readonly theirStance: number;
  readonly playerStance: number;
  /** A seat they hold now, by its term and its office's title, and whether it is on the same year's ballot. */
  readonly seatTermId: string | null;
  readonly seatTitle: string | null;
  readonly seatUp: boolean;
  /** Whether the record holds when their term in that seat ends. */
  readonly seatEnds: boolean;
  /** The scandal stories against the player they heard (news stories, by id), and the outlet of the newest. */
  readonly stories: readonly string[];
  readonly storyOutletId: string | null;
  readonly knows: boolean;
  /** The player's own standing in the race: an office held, endorsements given, dollars raised. */
  readonly heldOffice: boolean;
  readonly endorsements: number;
  readonly raisedMinor: number;
  /** The player's filing's standing (petitioning, on the ballot, nominee). */
  readonly filingStatus: string;
  /** For a post: the record of the work they hold now (a job, or their identity's work fact), and its hourly pay. */
  readonly jobId?: string | null;
  readonly hourlyMinor?: number;
  /** For a post: whether their work on the record is in the post's own field. */
  readonly inField?: boolean;
  /** For a post: whether a council or chamber still confirms whoever is named. */
  readonly confirmed?: boolean;
  /**
   * For a ticket: the question they hold most strongly among those the
   * ticket's office can decide, and their stance on it. Their price is named
   * on it, since only a question the player's own vote or signature in that
   * office can settle is one a promise can be kept or broken on (Account
   * lead, Nov 15 10:45Z). Null where the office can decide none they hold.
   */
  readonly priceQuestion?: string | null;
  readonly priceStance?: number;
}

export interface ServeStanding {
  /** Above zero: yes. */
  readonly lean: number;
  readonly terms: Readonly<Record<string, number>>;
  /** The term weighing most against the ask, and the one weighing most for it. */
  readonly reason: ServeReason;
  readonly yesReason: ServeYesReason;
  readonly grounds: ServeGrounds;
}

export interface ServeAskRow {
  /** `<seat key>|<person id>`. */
  readonly id: string;
  /** The kind of seat: "ticket" or "post". */
  readonly seat: string;
  /** The seat being filled: a ticket's id, or a post and its appointer. */
  readonly seatKey: string;
  /** A post's key and whether the town or the state fills it. */
  readonly post?: { readonly key: string; readonly level: "town" | "state" };
  /** The office the seat is, as its record titles it, and the office the player runs for. */
  readonly office: string;
  readonly raceOffice: string;
  /** The filing a ticket is for; empty for a post. */
  readonly filingId: string;
  readonly askerId: string;
  readonly askedId: string;
  readonly date: string;
  /** The event the scene plays from. */
  readonly eventId: string;
  readonly standing: ServeStanding;
  readonly answer: "asked" | "no";
  readonly answeredOn: string | null;
  /**
   * Asked again after a no: what weighed for the ask that moved most since
   * that no, so a changed answer can say what changed ("met": they know the
   * player now; "standing": money, endorsements or an office won; "agree":
   * the player's stance moved toward theirs; "heard": what they heard has
   * faded; "seat": their own seat or race no longer stands in the way).
   * Null on a first ask or where nothing moved for the ask.
   */
  readonly moved: ServeMoved | null;
  /**
   * Asked again after a no: the event of the ask they turned down, so the
   * talk can say it was asked before. Null on a first ask.
   */
  readonly askedBefore?: string | null;
  /** The reason that weighed most against the ask at that no. */
  readonly reasonBefore?: string | null;
  /** How many times they have said no to this seat before this ask. */
  readonly noesBefore?: number;
}

export type ServeMoved = "met" | "standing" | "agree" | "heard" | "seat";

/** The term of a read that moved most for the ask since an earlier read. */
function movedSince(was: ServeStanding, now: ServeStanding): ServeMoved | null {
  const groups: Record<ServeMoved, readonly string[]> = {
    met: ["known", "stranger"],
    standing: ["standing"],
    agree: ["question"],
    heard: ["heard"],
    seat: ["own-seat", "own-race"],
  };
  let best: ServeMoved | null = null;
  let most = 0;
  for (const [key, terms] of Object.entries(groups) as [
    ServeMoved,
    readonly string[],
  ][]) {
    const delta = terms.reduce(
      (sum, t) => sum + (now.terms[t] ?? 0) - (was.terms[t] ?? 0),
      0,
    );
    if (delta > most) {
      most = delta;
      best = key;
    }
  }
  return best;
}

export const SERVE_ASKS_MODULE: CoreModule = {
  id: SERVE_ASKS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      asks: { indexes: { bySeat: { fields: ["seatKey"] } } },
    },
  },
  eventKinds: ["scene.reply", "election-result"],
  onEvent: (api, event) => {
    if (event.kind === "election-result") raceOver(api, event);
    else answerAsk(api, event);
  },
};

export function openServeAsks(core: CoreState): void {
  if (!core.modules.has(SERVE_ASKS_MODULE_ID))
    registerModule(core, SERVE_ASKS_MODULE);
}

const table = (api: CoreAPI) =>
  api.moduleState(SERVE_ASKS_MODULE_ID).table("asks");

/** Every ask kept for one seat. */
export function asksFor(api: CoreAPI, seatKey: string): readonly ServeAskRow[] {
  if (!api.state.modules.has(SERVE_ASKS_MODULE_ID)) return [];
  return table(api).query("bySeat", [seatKey]) as unknown as ServeAskRow[];
}

export function serveAsk(api: CoreAPI, id: string): ServeAskRow | undefined {
  if (!api.state.modules.has(SERVE_ASKS_MODULE_ID)) return undefined;
  return table(api).get(id) as unknown as ServeAskRow | undefined;
}

function filingOf(api: CoreAPI, filingId: string): FilingRow | undefined {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
}

function contestOf(api: CoreAPI, contestId: string): ContestRow | undefined {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow | undefined;
}

/** The player's stated platform on a filing (the campaign's, else the filing's own). */
function platformOf(api: CoreAPI, filing: FilingRow): readonly Stance[] {
  const campaign = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? (api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("campaigns")
        .get(filing.id) as unknown as { platform?: Stance[] } | undefined)
    : undefined;
  return campaign?.platform ?? parsePlatform(filing.platform);
}

/** A seat the person holds now, from the offices engine's terms. */
function servingTerm(api: CoreAPI, personId: string): TermRow | undefined {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return undefined;
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]
  )
    .filter((t) => t.status === "serving")
    .sort((a, b) => a.id.localeCompare(b.id))[0];
}

/**
 * Where the asked person stands on being asked onto the player's ticket:
 * every term from their record and the player's, and what the read stood on.
 */
export function ticketStanding(
  api: CoreAPI,
  filing: FilingRow,
  ticket: ContestRow,
  askedId: string,
): ServeStanding | null {
  const asked = api.state.people.get(askedId);
  const player = api.state.people.get(filing.personId);
  if (!asked || !player) return null;
  const seat = "ticket";
  const price = priceRead(api, asked, contestPositions(api, ticket));
  const { question, theirStance, playerStance, heard, knows } = sharedRead(
    api,
    asked,
    player,
    platformOf(api, filing),
  );
  // The seat they hold, and whether its race is on the ticket's own ballot.
  const term = servingTerm(api, asked.id);
  const year = Number(ticket.electionDate.slice(0, 4));
  const seatUp =
    !!term &&
    (officialOf(api, asked.id)?.nextElectionYear === year ||
      (term.endDate !== null &&
        Number(term.endDate.slice(0, 4)) >= year &&
        Number(term.endDate.slice(0, 4)) <= year + 1));
  const seatTitle = term
    ? ((
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(term.officeId) as { title?: string } | undefined
      )?.title ?? null)
    : null;
  // The player's own standing in the race, from what the race keeps.
  const heldOffice = everHeldOffice(api, player.id);
  const endorsements = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? endorsementsOf(api, filing.id).filter((row) => row.answer === "yes")
        .length
    : 0;
  const raisedMinor = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? ((
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(filing.id) as unknown as { raisedMinor?: number } | undefined
      )?.raisedMinor ?? 0)
    : 0;
  const distance = Math.abs(theirStance - playerStance) / 2;
  const terms: Record<string, number> = {
    base: w(seat, "base"),
    ambition: w(seat, "ambition") * ambitionOf(asked),
    known: knows
      ? w(seat, "known") *
        closenessBetween(api.state, asked.id, player.id as PersonId)
      : 0,
    stranger: knows ? 0 : -w(seat, "stranger"),
    "own-seat": term ? -w(seat, "ownSeat") : 0,
    "own-race": seatUp ? -w(seat, "ownRace") : 0,
    // Near on their question pulls toward yes, far pulls away.
    question: w(seat, "apart") * (w(seat, "agreeAt") - distance),
    heard: -w(seat, "heard") * share(heard.length, w(seat, "heardScale")),
    // A candidate with an office behind them, people backing them and money
    // raised is running a real race; one with none of it is a long shot.
    standing:
      w(seat, "standing") *
        ((heldOffice ? 1 : 0) +
          share(endorsements, w(seat, "endorsementScale")) +
          share(raisedMinor, w(seat, "raisedScaleMinor"))) -
      w(seat, "longShot"),
  };
  // Yes above zero and no below; the TUNABLE base sets where the line
  // falls. A yes with a price near the line is pool item
  // gov-serve-ask-price-end.
  const lean = Object.values(terms).reduce((sum, value) => sum + value, 0);
  // The term weighing most against them and the one weighing most for them;
  // a tie goes to the first named. Giving up a seat is one reason, said as
  // the race where the seat is up.
  const reason = pick<ServeReason>(
    {
      [seatUp ? "own-race" : "own-seat"]:
        terms["own-seat"]! + terms["own-race"]!,
      apart: terms.question!,
      heard: terms.heard!,
      stranger: terms.stranger!,
      "long-shot": terms.standing!,
    } as Record<ServeReason, number>,
    -1,
  );
  const yesReason = pick<ServeYesReason>(
    {
      trust: terms.known!,
      "step-up": terms.ambition!,
      agree: terms.question!,
      "real-race": terms.standing!,
    } as Record<ServeYesReason, number>,
    1,
  );
  return {
    lean,
    terms,
    reason,
    yesReason,
    grounds: {
      question,
      theirStance,
      playerStance,
      seatTermId: term?.id ?? null,
      seatTitle,
      seatUp,
      seatEnds: !!term?.endDate,
      stories: heard.map((story) => story.id).sort(),
      storyOutletId: heard[0]?.outletId ?? null,
      knows,
      heldOffice,
      endorsements,
      raisedMinor,
      filingStatus: filing.status ?? "",
      priceQuestion: price?.question ?? null,
      priceStance: price?.stance ?? 0,
    },
  };
}

/**
 * The question the asked person holds most strongly among those the office
 * can decide (`contestPositions`: the questions its government may decide,
 * the same check a body files by), and their stance on it; null where it can
 * decide none they hold.
 */
function priceRead(
  api: CoreAPI,
  asked: Readonly<PersonState>,
  decided: readonly string[],
): { question: string; stance: number } | null {
  const theirLean = voterLean(api, asked);
  const can = new Set(decided);
  let best: { question: string; stance: number } | null = null;
  for (const question of PLATFORM_QUESTIONS) {
    if (!can.has(question)) continue;
    const stance = viewOn(api, asked.id, question, theirLean);
    if (stance === 0 || Math.abs(stance) <= Math.abs(best?.stance ?? 0))
      continue;
    best = { question, stance };
  }
  return best;
}

const share = (count: number, scale: number) => count / (count + scale);

/** The term weighing most (for, 1; against, -1); a tie goes to the first named. */
const pick = <K extends string>(rows: Record<K, number>, most: 1 | -1) =>
  (Object.keys(rows) as K[]).reduce((best, key) =>
    most * rows[key] > most * rows[best] ? key : best,
  );

/**
 * What every seat's read stands on: the question the asked person holds most
 * strongly and where each stands on it (the player by their stated platform,
 * else their own view), the scandal stories against the player that reached
 * them (ask-why: a person weighs only what reached them), newest first, and
 * whether the two know each other.
 */
function sharedRead(
  api: CoreAPI,
  asked: Readonly<PersonState>,
  player: Readonly<PersonState>,
  stated: readonly Stance[],
) {
  const theirLean = voterLean(api, asked);
  let question = PLATFORM_QUESTIONS[0]!;
  let theirStance = 0;
  for (const q of PLATFORM_QUESTIONS) {
    const stance = viewOn(api, asked.id, q, theirLean);
    if (Math.abs(stance) > Math.abs(theirStance)) {
      question = q;
      theirStance = stance;
    }
  }
  const playerStance =
    stated.find((s) => s.question === question)?.position ??
    viewOn(api, player.id, question, voterLean(api, player));
  const scandals = new Set(scandalStoriesOf(api, player.id, api.state.date));
  const heard = api.state.modules.has(NEWS_MODULE_ID)
    ? storiesHeard(api, asked.id).filter((story) => scandals.has(story.id))
    : [];
  return {
    question,
    theirStance,
    playerStance,
    heard,
    knows: knowsEachOther(asked, player),
  };
}

/**
 * The platform the player last stood on: their newest filing's (a sitting
 * official's is the one they won on). Empty where they never filed.
 */
function lastPlatform(api: CoreAPI, personId: string): readonly Stance[] {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const newest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).reduce<FilingRow | undefined>(
    (best, row) => (!best || row.id.localeCompare(best.id) > 0 ? row : best),
    undefined,
  );
  return newest ? platformOf(api, newest) : [];
}

/**
 * Where the asked person stands on being asked to take a post the player
 * appoints: the shared read, and what the post pays against what they earn
 * now, and the job they would leave. A ticket's race terms do not apply.
 */
export function postStanding(
  api: CoreAPI,
  appointerId: string,
  askedId: string,
  post: { readonly key: string; readonly level: "town" | "state" },
): ServeStanding | null {
  const asked = api.state.people.get(askedId);
  const player = api.state.people.get(appointerId);
  if (!asked || !player) return null;
  const seat = "post";
  const { question, theirStance, playerStance, heard, knows } = sharedRead(
    api,
    asked,
    player,
    lastPlatform(api, player.id),
  );
  // The work they hold now and its hourly pay, against the post's: a job in
  // the played world, or the work their home town's records give someone
  // filled in from elsewhere. Work with no published wage pulls neither way
  // on pay; the job itself is still given up.
  const held = workHeld(api.state as CoreState, asked.id);
  const working = held !== null;
  const hourlyMinor = held?.hourlyMinor ?? 0;
  const postHourly = campaignParameter("appointeeHourlyMinor");
  const distance = Math.abs(theirStance - playerStance) / 2;
  const terms: Record<string, number> = {
    base: w(seat, "base"),
    ambition: w(seat, "ambition") * ambitionOf(asked),
    known: knows
      ? w(seat, "known") *
        closenessBetween(api.state, asked.id, player.id as PersonId)
      : 0,
    stranger: knows ? 0 : -w(seat, "stranger"),
    // A raise pulls toward yes and a cut away, on a sliding scale; someone
    // out of work has the whole pull.
    pay:
      held && held.hourlyMinor === null
        ? 0
        : w(seat, "pay") *
          ((postHourly - hourlyMinor) / (postHourly + hourlyMinor)),
    "own-job": working ? -w(seat, "ownJob") : 0,
    question: w(seat, "apart") * (w(seat, "agreeAt") - distance),
    heard: -w(seat, "heard") * share(heard.length, w(seat, "heardScale")),
  };
  const lean = Object.values(terms).reduce((sum, value) => sum + value, 0);
  const reason = pick<ServeReason>(
    {
      "pays-less": terms.pay!,
      "own-job": terms["own-job"]!,
      apart: terms.question!,
      heard: terms.heard!,
      stranger: terms.stranger!,
    } as Record<ServeReason, number>,
    -1,
  );
  const yesReason = pick<ServeYesReason>(
    {
      trust: terms.known!,
      "step-up": terms.ambition!,
      agree: terms.question!,
      pay: terms.pay!,
    } as Record<ServeYesReason, number>,
    1,
  );
  return {
    lean,
    terms,
    reason,
    yesReason,
    grounds: {
      question,
      theirStance,
      playerStance,
      seatTermId: null,
      seatTitle: null,
      seatUp: false,
      seatEnds: false,
      stories: heard.map((story) => story.id).sort(),
      storyOutletId: heard[0]?.outletId ?? null,
      knows,
      heldOffice: true,
      endorsements: 0,
      raisedMinor: 0,
      filingStatus: "",
      jobId: held?.recordId ?? null,
      hourlyMinor,
      inField:
        postRecord(api, asked, post.key, api.state.date).relatedYears > 0,
      confirmed: postConfirmed(api, post.level, post.key),
    },
  };
}

/** Whether the player has ever held a seat, from the offices engine's terms. */
function everHeldOffice(api: CoreAPI, personId: string): boolean {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return false;
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("byPerson", [personId]) as unknown as TermRow[]
  ).some((t) => t.startDate <= api.state.date);
}

function knowsEachOther(
  a: Readonly<PersonState>,
  b: Readonly<PersonState>,
): boolean {
  return (
    a.knownIds.has(b.id) ||
    b.knownIds.has(a.id) ||
    a.familyIds.has(b.id) ||
    b.familyIds.has(a.id)
  );
}

/**
 * Whether the player may ask this person now: never asked, or the last ask
 * was not a no, or the no's time has passed, or what the no rested on has
 * changed on the record (its own reason's grounds, or the player's filing
 * moving on, such as a primary won).
 */
export function mayAskAgain(
  api: CoreAPI,
  row: ServeAskRow | undefined,
  now: ServeStanding | null,
): boolean {
  if (!row || row.answer !== "no") return true;
  const after = addDays(
    makeIsoDate(row.answeredOn ?? row.date),
    willingness.askAgain.days.value,
  );
  if (api.state.date >= after) return true;
  if (!now) return false;
  const was = row.standing.grounds;
  const is = now.grounds;
  if (is.filingStatus !== was.filingStatus) return true;
  switch (row.standing.reason) {
    case "own-seat":
    case "own-race":
      return is.seatTermId !== was.seatTermId || is.seatUp !== was.seatUp;
    case "apart":
      return (
        is.question !== was.question || is.playerStance !== was.playerStance
      );
    case "heard":
      return is.stories.join(",") !== was.stories.join(",");
    case "stranger":
      return is.knows !== was.knows;
    case "long-shot":
      return (
        is.heldOffice !== was.heldOffice ||
        is.endorsements !== was.endorsements ||
        is.raisedMinor !== was.raisedMinor
      );
    case "pays-less":
    case "own-job":
      return is.jobId !== was.jobId || is.hourlyMinor !== was.hourlyMinor;
  }
}

/**
 * The ticket a governor filing names a running mate on, its contest, the
 * player's willing read for it (a person would say yes now and is not
 * holding a no that still stands), and the people offered with that read:
 * never only people who would turn the player down where anyone would not.
 */
function ticketFor(api: CoreAPI, filingId: string) {
  const filing = filingOf(api, filingId);
  const governor = filing ? contestOf(api, filing.contestId) : undefined;
  const ticket = governor ? ticketOfficeContest(api, governor) : null;
  if (!filing || !governor || !ticket) return null;
  const seatKey = `${ticket.id}|ticket:${filing.personId}`;
  const willing = (personId: string): boolean => {
    const now = ticketStanding(api, filing, ticket, personId);
    if (!now || now.lean <= 0) return false;
    return mayAskAgain(api, serveAsk(api, `${seatKey}|${personId}`), now);
  };
  const ranked = runningMateChoice(api, filingId, willing);
  if (!ranked) return null;
  // Someone the player already asked stays on the list while their answer is
  // kept, even where the world's ranking has since moved past them, so a no
  // can be seen and asked again (owner, Nov 14 05:17Z). Bounded by the asks
  // kept for the seat.
  const shown = new Set(ranked.choices.map((c) => c.id));
  const kept = asksFor(api, seatKey).flatMap((row) => {
    const person = api.state.people.get(row.askedId as PersonId);
    return shown.has(row.askedId) || !person?.alive
      ? []
      : [
          {
            id: row.askedId,
            name: `${person.givenName} ${person.familyName}`,
            seatId: null,
            roles: [],
          },
        ];
  });
  const choice = kept.length
    ? { ...ranked, choices: [...ranked.choices, ...kept] }
    : ranked;
  return {
    choice,
    filing,
    ticket,
    raceOffice: governor.title,
    seatKey,
    willing,
  };
}

/**
 * Where an asked person would stand were the player to leave their own
 * stance on the asked person's question unsaid (a hedge): the question term
 * read again with the player's stance at the middle, the other terms as kept.
 */
export function leanIfHedged(row: ServeAskRow): number {
  const { terms, grounds } = row.standing;
  const hedged =
    w(row.seat, "apart") *
    (w(row.seat, "agreeAt") - Math.abs(grounds.theirStance) / 2);
  const lean = row.standing.lean - (terms.question ?? 0) + hedged;
  // A drop too small for them to feel costs nothing: the dodge weighs as
  // the stance on the record (willingness.json `dodgeNoticed`).
  return row.standing.lean - lean < w(row.seat, "dodgeNoticed")
    ? row.standing.lean
    : lean;
}

/**
 * What the player's word on the asked person's own question is worth to them
 * (willingness.json `promise`, times how strongly they hold it). Someone whose
 * read is short of yes by less than this names the promise as their price;
 * the player accepts it or refuses (gov-serve-ask-price-end). Zero where the
 * seat weighs no promise or they hold no question.
 */
export function promiseWorth(row: ServeAskRow): number {
  const { grounds } = row.standing;
  if (!grounds.priceQuestion) return 0;
  // A price is named only for the side a played world has shown: no place
  // probed (about 77 worlds, Nov 15) gave a price against a question, so the
  // lines for one were taken out, and a read against falls to no price, never
  // to an empty line (Words lead and Account lead, Nov 15 12:26Z; pool item
  // views-strongest-state-view-always-for).
  if ((grounds.priceStance ?? 0) < 0) return 0;
  return w(row.seat, "promise") * Math.abs(grounds.priceStance ?? 0);
}

/** The running mate choice as the player is offered it: with the willing read. */
export function offeredRunningMates(api: CoreAPI, filingId: string) {
  return ticketFor(api, filingId)?.choice ?? runningMateChoice(api, filingId);
}

/**
 * "Choose for me": no scene; the strongest of the people offered who would
 * say yes is named. Where nobody would, the world's own pick is named.
 */
export function chooseRunningMateForMe(api: CoreAPI, filingId: string): void {
  const found = ticketFor(api, filingId);
  if (!found)
    throw new Error("There is no running mate to name for this race.");
  const pick = found.choice.choices.find((c) => found.willing(c.id));
  chooseRunningMate(api, filingId, pick?.id ?? null, found.willing);
  dropAsks(api, found.seatKey);
}

/** The asks kept for a seat, dropped once the seat is filled or its race is over. */
function dropAsks(api: CoreAPI, seatKey: string): void {
  for (const row of asksFor(api, seatKey)) table(api).remove(row.id);
}

/**
 * Each person offered for the player's running mate, with whether they turned
 * the player down and whether the player may ask them now.
 */
export function ticketAsks(
  api: CoreAPI,
  filingId: string,
): readonly {
  readonly personId: string;
  readonly declined: {
    readonly reason: ServeReason;
    readonly on: string;
  } | null;
  readonly mayAsk: boolean;
}[] {
  const found = ticketFor(api, filingId);
  if (!found) return [];
  return found.choice.choices.map((c) => {
    const row = serveAsk(api, `${found.seatKey}|${c.id}`);
    const now =
      row?.answer === "no"
        ? ticketStanding(api, found.filing, found.ticket, c.id)
        : null;
    return {
      personId: c.id,
      declined:
        row?.answer === "no"
          ? {
              reason: row.standing.reason,
              on: row.answeredOn ?? row.date,
            }
          : null,
      mayAsk: mayAskAgain(api, row, now),
    };
  });
}

/**
 * The player asks one of the people offered to be their running mate. The
 * ask is kept and played as a scene; nothing is seated until the scene ends.
 */
export function askToServe(
  api: CoreAPI,
  input:
    | {
        readonly seat: "ticket";
        readonly filingId: string;
        readonly personId: string;
      }
    | {
        readonly seat: "post";
        readonly appointerId: string;
        readonly post: string;
        readonly personId: string;
      },
): ServeAskRow {
  if (input.seat === "post") return askToTakePost(api, input);
  const found = ticketFor(api, input.filingId);
  if (!found || found.choice.mateId !== null)
    throw new Error("There is no running mate to ask for this race.");
  if (!found.choice.choices.some((c) => c.id === input.personId))
    throw new Error("That person isn't one of the running mates offered.");
  const standing = ticketStanding(
    api,
    found.filing,
    found.ticket,
    input.personId,
  );
  if (!standing) throw new Error("That person can't be asked.");
  const id = `${found.seatKey}|${input.personId}`;
  const earlier = serveAsk(api, id);
  if (!mayAskAgain(api, earlier, standing))
    throw new Error("They turned you down; it is too soon to ask again.");
  const eventId = `${SERVE_ASKED_EVENT}:${id}:${api.state.date}`;
  const row: ServeAskRow = {
    id,
    seat: input.seat,
    seatKey: found.seatKey,
    office: found.choice.office,
    raceOffice: found.raceOffice,
    filingId: input.filingId,
    askerId: found.filing.personId,
    askedId: input.personId,
    date: api.state.date,
    eventId,
    standing,
    answer: "asked",
    answeredOn: null,
    moved:
      earlier?.answer === "no" ? movedSince(earlier.standing, standing) : null,
    askedBefore: earlier?.answer === "no" ? earlier.eventId : null,
    reasonBefore: earlier?.answer === "no" ? earlier.standing.reason : null,
    noesBefore: (earlier?.noesBefore ?? 0) + (earlier?.answer === "no" ? 1 : 0),
  };
  table(api).put(row as unknown as ModuleRow);
  api.emit({
    id: eventId,
    date: api.state.date,
    kind: SERVE_ASKED_EVENT,
    personIds: [found.filing.personId as PersonId, input.personId as PersonId],
    placeId: api.state.people.get(found.filing.personId)!.placeId,
    source: {
      tag: "SOURCED",
      citation: `The player asked someone to run on their ticket for ${found.choice.office}`,
      asOf: api.state.date,
    },
    facts: {
      askId: id,
      seat: input.seat,
      office: found.choice.office,
      filingId: input.filingId,
      askerId: found.filing.personId,
      askedId: input.personId,
      question: standing.grounds.question,
      // The side they hold on it.
      side: standing.grounds.theirStance < 0 ? "no" : "yes",
      // The question a price is named on, one the office can decide, and
      // their side on it: a promise they ask for is to hold it
      // (promise-kinds.json `hold-question`).
      ...(standing.grounds.priceQuestion
        ? {
            "price-question": standing.grounds.priceQuestion,
            "price-side":
              (standing.grounds.priceStance ?? 0) < 0 ? "no" : "yes",
          }
        : {}),
      reason: standing.reason,
    },
  });
  return row;
}

/**
 * An open post the player appoints (a town department head as mayor, a
 * cabinet member as governor), the people the official's own reasons offer
 * for it, best first, and the seat its asks are kept under.
 */
function postFor(api: CoreAPI, appointerId: string, post: string) {
  const town = postsToFill(api, appointerId).find((p) => p.key === post);
  const state = town
    ? undefined
    : statePostsToFill(api, appointerId).find((p) => p.key === post);
  const spec = town ?? state;
  if (!spec) return null;
  const level: "town" | "state" = town ? "town" : "state";
  const offered = (
    town ? headCandidates(api, post) : stateCandidates(api, appointerId, post)
  ).map((r) => r.candidateId);
  return {
    key: spec.key,
    title: spec.title,
    level,
    offered,
    seatKey: `post:${level}:${spec.key}|${appointerId}`,
  };
}

/** The office the player holds that appoints: its title, from their serving term. */
function appointerOffice(api: CoreAPI, personId: string): string {
  const term = servingTerm(api, personId);
  return term
    ? ((
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("offices")
          .get(term.officeId) as { title?: string } | undefined
      )?.title ?? "")
    : "";
}

/**
 * Each person offered for one of the player's open posts, with whether they
 * turned the player down and whether the player may ask them now.
 */
export function postAsks(
  api: CoreAPI,
  appointerId: string,
  post: string,
): readonly {
  readonly personId: string;
  readonly declined: {
    readonly reason: ServeReason;
    readonly on: string;
  } | null;
  readonly mayAsk: boolean;
}[] {
  const found = postFor(api, appointerId, post);
  if (!found) return [];
  // Someone already asked stays listed while their answer is kept, even on a
  // day the official's list has moved past them (bounded by the asks kept).
  const shown = new Set(found.offered);
  const kept = asksFor(api, found.seatKey)
    .map((row) => row.askedId)
    .filter((id) => !shown.has(id));
  return [...found.offered, ...kept].map((id) => {
    const row = serveAsk(api, `${found.seatKey}|${id}`);
    const now =
      row?.answer === "no" ? postStanding(api, appointerId, id, found) : null;
    return {
      personId: id,
      declined:
        row?.answer === "no"
          ? { reason: row.standing.reason, on: row.answeredOn ?? row.date }
          : null,
      mayAsk: mayAskAgain(api, row, now),
    };
  });
}

/** The player asks someone offered for one of their open posts; the ask plays as a scene. */
function askToTakePost(
  api: CoreAPI,
  input: {
    readonly appointerId: string;
    readonly post: string;
    readonly personId: string;
  },
): ServeAskRow {
  const found = postFor(api, input.appointerId, input.post);
  if (!found) throw new Error("Not an open post you appoint.");
  if (!found.offered.includes(input.personId))
    throw new Error("Not someone this post could go to.");
  // One of the state's people the list names without holding them in full is
  // filled in where they live before they are asked, so they answer as
  // themselves (executive's fillInStateCandidate); the same person after.
  const personId =
    found.level === "state"
      ? fillInStateCandidate(api, found.key, input.personId)
      : input.personId;
  if (!personId) throw new Error("Not someone this post could go to.");
  const standing = postStanding(api, input.appointerId, personId, found);
  if (!standing) throw new Error("That person can't be asked.");
  const id = `${found.seatKey}|${personId}`;
  const earlier = serveAsk(api, id);
  if (!mayAskAgain(api, earlier, standing))
    throw new Error("They turned you down; it is too soon to ask again.");
  const eventId = `${SERVE_ASKED_EVENT}:${id}:${api.state.date}`;
  const row: ServeAskRow = {
    id,
    seat: "post",
    seatKey: found.seatKey,
    post: { key: found.key, level: found.level },
    office: found.title,
    raceOffice: appointerOffice(api, input.appointerId),
    filingId: "",
    askerId: input.appointerId,
    askedId: personId,
    date: api.state.date,
    eventId,
    standing,
    answer: "asked",
    answeredOn: null,
    moved:
      earlier?.answer === "no" ? movedSince(earlier.standing, standing) : null,
  };
  table(api).put(row as unknown as ModuleRow);
  api.emit({
    id: eventId,
    date: api.state.date,
    kind: SERVE_ASKED_EVENT,
    personIds: [input.appointerId as PersonId, personId as PersonId],
    placeId: api.state.people.get(input.appointerId as PersonId)!.placeId,
    source: {
      tag: "SOURCED",
      citation: `The player asked someone to serve as ${found.title}`,
      asOf: api.state.date,
    },
    facts: {
      askId: id,
      seat: "post",
      office: found.title,
      post: found.key,
      askerId: input.appointerId,
      askedId: personId,
      question: standing.grounds.question,
      // The side they hold on it: a promise they ask for is to hold it
      // (promise-kinds.json `hold-question`).
      side: standing.grounds.theirStance < 0 ? "no" : "yes",
      reason: standing.reason,
    },
  });
  return row;
}

/**
 * A yes to a post seats the person through the engine that seats a post
 * today: a town post is named at the official's "name a department head"
 * act (the council confirms where the form asks), a state post at once
 * (the chamber confirms where the law asks).
 */
function takePost(api: CoreAPI, row: ServeAskRow): void {
  const found = row.post && postFor(api, row.askerId, row.post.key);
  // The post may have been filled since the ask (the scene played late).
  if (!found || !found.offered.includes(row.askedId)) return;
  if (found.level === "town")
    prepareAct(api, row.askerId, "name-department-head", {
      nominee: { post: found.key, personId: row.askedId },
    });
  else appointGovernor(api, found.key, row.askedId);
  dropAsks(api, row.seatKey);
}

/** The scene's ending, read: a yes seats the person, a no is kept with its reason and date. */
function answerAsk(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const facts = event.facts ?? {};
  const ending = String(facts.ending ?? "");
  if (!YES_ENDINGS.has(ending) && !NO_ENDINGS.has(ending)) return;
  const cause = api.state.durableLog.get(String(facts.causeId ?? ""));
  if (cause?.kind !== SERVE_ASKED_EVENT) return;
  const row = serveAsk(api, String(cause.facts?.askId ?? ""));
  if (!row || row.eventId !== cause.id || row.answer !== "asked") return;
  // They sat down together: a stranger is met, whatever the answer (the
  // encounters engine's talk, the hours the ask took).
  const asked = api.state.people.get(row.askedId as PersonId);
  const met = meetInTalk(
    api,
    row.askerId,
    row.askedId,
    asked?.placeId ?? "",
    serveAskHours(),
    cause.id,
  );
  const yes = YES_ENDINGS.has(ending);
  if (yes && row.seat === "post") {
    takePost(api, row);
    return;
  }
  if (yes) {
    const found = ticketFor(api, row.filingId);
    // The seat may have been filled since the ask (the scene played late).
    if (
      !found ||
      found.choice.mateId !== null ||
      !found.choice.choices.some((c) => c.id === row.askedId)
    )
      return;
    chooseRunningMate(
      api,
      row.filingId,
      row.askedId,
      found.willing,
      asksFor(api, row.seatKey).map((r) => r.askedId),
    );
    // The seat is filled: nothing kept for it is read again.
    dropAsks(api, row.seatKey);
    return;
  }
  // A no from a stranger rests on not knowing the player; meeting at the ask
  // is not the change that lets the player ask again, so the no is kept as
  // from someone who now knows them.
  table(api).put({
    ...row,
    answer: "no",
    answeredOn: api.state.date,
    ...(met
      ? {
          standing: {
            ...row.standing,
            grounds: { ...row.standing.grounds, knows: true },
          },
        }
      : {}),
  } as unknown as ModuleRow);
}

/**
 * A race counted: the asks kept for its ticket go (the ticket's own contest,
 * or the governor's race the ticket rides on).
 */
function raceOver(api: CoreAPI, event: Readonly<CoreEventInput>): void {
  const contestId = String(event.facts?.contestId ?? "");
  if (!contestId) return;
  for (const row of table(api).rows() as unknown as ServeAskRow[])
    if (
      row.seatKey.startsWith(`${contestId}|`) ||
      filingOf(api, row.filingId)?.contestId === contestId
    )
      table(api).remove(row.id);
}

/** How long a sit-down to ask someone to serve takes on the player's clock. */
export function serveAskHours(): number {
  return willingness.askHours.value;
}
