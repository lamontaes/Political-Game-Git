/**
 * The director's board (the Story lead's board design, Nov 16; owner, Nov 15,
 * 3:39 PM: read the whole set of scenes that could happen to this player, cut
 * it by who they are and what the records say, pick a few). Each moment's
 * bound cards (scheduling.ts bindMoment) pass the gates here, every one a
 * yes-or-no fact of the records, and each cut keeps the first gate it failed.
 * A card that a record stop rule stages (the person's own record, the
 * household's, a tie met today, a type that stops the day, a moment felt at or
 * over the interrupt line) stops the day whatever else the day holds. Every
 * other card waits on the day's board: once a day, for each watched person,
 * `pickFromBoard` weighs today's waiting moments and every scene from
 * circumstance the producer offered, by the amount each was felt, checks the
 * wordings of the best before it is picked, and picks one while the life has
 * room (its pace over the trailing year, counted in picks made). Ties break
 * by the stable hash; nothing is drawn by chance.
 */
import { stableHash } from "../core2/kernel/ids";
import { lastMetOnRow } from "../core2/closeness";
import { coreAPI } from "../core2/state";
import { OFFICE_DAY_MODULE_ID, stopsOf } from "../core2/modules/office-day";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState, IsoDate, PersonId } from "../core2/types";
import { LETTER_TYPE, letterFacts } from "./letter-facts";
import { nextMeetingFacts } from "./meeting-facts";
import {
  bindMoment,
  paceOf,
  paceRank,
  receives,
  SITUATION_LIBRARY,
  type CoverageRow,
  type SceneBinding,
  type ScheduleEntry,
  type SituationLibrary,
} from "./scheduling";
import type { Moment, PersonLedger } from "./types";

const zero = P.zero;
const one = P.one;

/** A tie that grew: the friend's ask (situation-types.json). */
const FRIENDS_TYPE = "becoming-friends";

/**
 * The first gate a card or a candidate failed, in the order they are read:
 * a type that yields to another bound for the same cause, a race already
 * decided, a kind the player filtered out, a season full, nothing changed
 * since the same scene, nothing the game can settle to ask, a cast the
 * type's receive rule refuses, a sitting already staged today that took the
 * cause in, an office stop the player switched off; then, on the day's board,
 * no wordings past the opener or no one to speak, a skip that only a scene met
 * where the player is can stop, a life with no room left in its year, and a
 * candidate another outscored.
 */
export type BoardCut =
  | "yields"
  | "contest-passed"
  | "not-allowed"
  | "season-cap"
  | "nothing-changed"
  | "nothing-to-ask"
  | "not-received"
  | "joined"
  | "switched-off"
  | "silent"
  | "nothing-said"
  | "skipping"
  | "no-room"
  | "outscored";

/** A scene from circumstance the producer offered and the board never stored. */
export interface BoardOffer {
  rowId: string;
  typeKey: string;
  causeId: string;
  castId: PersonId;
  score: number;
  cut: BoardCut;
}

/** What the board did with one moment, on its schedule entry (dev mode reads it). */
export interface EntryBoard {
  /** Each type the moment bound, with the first gate it failed (none: it staged). */
  cards: { typeKey: string; cut?: BoardCut }[];
  /** The amounts the score read: how strongly the moment was felt. */
  reads: { impact: number };
  score: number;
  /** On the day's board, waiting for the day's pick. */
  pending?: true;
  /** The day's pick. */
  picked?: true;
  /** Why the moment was not the day's pick. */
  cut?: BoardCut;
  /** The day's scenes from circumstance weighed beside it and never stored. */
  offers?: BoardOffer[];
}

/**
 * Weighs one stored moment as it arrives: its cards through the gates, and
 * whether a record stop rule stages it now. Pure over the core and the
 * ledger; the caller stores the entry. A moment no stop rule stages waits on
 * the day's board (`pending`) for `pickFromBoard`.
 */
export function scheduleMoment(
  core: Readonly<CoreState>,
  book: PersonLedger,
  moment: Moment,
  options: {
    mode: string;
    interruptImpact: number;
    /**
     * The scene kinds the player allows to interrupt (their filter record);
     * absent means every kind. A moment whose scenes are all filtered out
     * becomes a journal line and stops nothing.
     */
    allowedKinds?: ReadonlySet<string>;
    /**
     * A kind of place tried first for a type (situation-type key to setting
     * kind), set by dev mode's force-scene; the type's own order follows.
     */
    preferredSettings?: ReadonlyMap<string, string>;
  },
  library: SituationLibrary = SITUATION_LIBRARY,
): ScheduleEntry {
  const person = core.people.get(moment.personId);
  if (!person) throw new Error(`Scheduled moment has no person: ${moment.id}`);
  const pace = paceOf(library, person.birthDate, moment.date);
  const rank = paceRank(library, book, moment);
  const { found, staged, standing, cuts, ...bound } = bindMoment(
    core,
    book,
    moment,
    options,
    library,
  );
  let coverage: CoverageRow | undefined = bound.coverage;
  // The player's filter: only the scene kinds they allow stage or interrupt.
  const allowed = options.allowedKinds;
  // One sitting covers a day: a scene of the same kind with the same people
  // already staged today takes this cause in (five bills signed in one
  // afternoon are one press availability, not five). A later day is a new
  // cause with its own record: what holds a repeat back is the record, below.
  const castOf = (row: SceneBinding) =>
    `${row.typeKey}|${row.roles
      .flatMap((role) => role.personIds)
      .sort()
      .join(",")}`;
  const sittingToday = new Set(
    book.schedule
      .filter(
        (entry) =>
          entry.date === moment.date &&
          entry.momentId !== moment.id &&
          // A moment waiting on today's board is the day's sitting too.
          (entry.outcome !== "journal-line" || !!entry.board?.pending),
      )
      .flatMap((entry) => entry.bindings.map((row) => castOf(row))),
  );
  const wanted = allowed
    ? staged.filter((row) => allowed.has(row.typeKey))
    : staged;
  const eachCause = (row: SceneBinding) =>
    library.types.find((type) => type.key === row.typeKey)?.eachCause ?? false;
  // One type cannot take a season: past its cap of scenes in the season's
  // window, its causes go to the journal (the plan of Oct 28, section 3: the
  // floor vote fired 121 times in one played year).
  const seasonStart = addDays(
    makeIsoDate(moment.date),
    -library.scheduling.seasonCap.days,
  );
  const inSeason = new Map<string, number>();
  for (const entry of book.schedule)
    if (
      entry.date > seasonStart &&
      entry.date <= moment.date &&
      entry.momentId !== moment.id &&
      entry.outcome !== "journal-line"
    )
      for (const typeKey of new Set(entry.bindings.map((row) => row.typeKey)))
        inSeason.set(typeKey, (inSeason.get(typeKey) ?? zero) + one);
  // A cast the type's receive rule refuses goes to the journal: nobody who
  // lives with the person comes to the house, and a seat scene reaches only
  // someone in office.
  const receivable = (row: SceneBinding) => {
    const type = library.types.find((t) => t.key === row.typeKey);
    const askerIds = type?.asker
      ? (row.roles.find((role) => role.role === type.asker)?.personIds ?? [])
      : [];
    return receives(
      core,
      book.personId,
      standing,
      type?.receive,
      askerIds,
      row.setting.kind,
    );
  };
  // A letter from a writer whose earlier letter was already staged plays
  // again only with something on record since: news of the writer's life, a
  // birthday they missed at the reader's table or their own birthday near
  // (letter-facts.ts). The same ask with nothing changed goes to the journal.
  const lettered = new Set(
    book.schedule
      .filter(
        (entry) =>
          entry.date <= moment.date &&
          entry.momentId !== moment.id &&
          entry.outcome !== "journal-line",
      )
      .flatMap((entry) =>
        entry.bindings
          .filter((row) => row.typeKey === LETTER_TYPE)
          .map((row) => castOf(row)),
      ),
  );
  const sameLetter = (row: SceneBinding) => {
    if (row.typeKey !== LETTER_TYPE || !lettered.has(castOf(row))) return false;
    const writer = row.roles.find((role) => role.role === "writer")?.personIds[
      zero
    ];
    const reader = row.roles.find((role) => role.role === "reader")?.personIds[
      zero
    ];
    if (!writer || !reader) return false;
    const said = letterFacts(
      core,
      LETTER_TYPE,
      moment.causeId,
      writer,
      reader,
      () => null,
    );
    return Object.keys(said).length === zero;
  };
  // The same scene with the same people about the same record again is not
  // staged: an earlier day's scene of this cast was staged for a cause record of
  // the same kind with the same facts, so nothing on record is new. A record
  // with any fact of its own (another bill, another law, another speech) is a
  // new cause and stages. A letter reads what has happened since instead
  // (above), and a scene about each cause keeps every one.
  const factsKey = (id: string) => {
    const record = core.durableLog.get(id);
    return record
      ? `${record.kind}|${JSON.stringify(Object.entries(record.facts ?? {}).sort(([a], [b]) => a.localeCompare(b)))}`
      : "";
  };
  const stagedCauses = new Map<string, Set<string>>();
  for (const entry of book.schedule) {
    if (
      entry.date >= moment.date ||
      entry.momentId === moment.id ||
      entry.outcome === "journal-line"
    )
      continue;
    const cause = book.momentsById.get(entry.momentId)?.causeId;
    const key = cause ? factsKey(cause) : "";
    if (!key) continue;
    for (const row of entry.bindings) {
      const seen = stagedCauses.get(castOf(row)) ?? new Set<string>();
      seen.add(key);
      stagedCauses.set(castOf(row), seen);
    }
  }
  const sameRecordAgain = (row: SceneBinding) =>
    !eachCause(row) &&
    row.typeKey !== LETTER_TYPE &&
    !!stagedCauses.get(castOf(row))?.has(factsKey(moment.causeId));
  // A scene the player pressed for themselves (their own ask to a colleague
  // to sign on, to vote, to serve) is not counted against a season: each one
  // is a record of the player's own act, already limited by what is on the
  // record (one sitting a day with the same person, the same bill asked of
  // the same person once in the repeat window, a person who said no knows it
  // and says so). A door on the player's canvass is the circumstance
  // producer's pick of the day and stays under the cap.
  const pressedByPlayer = (row: SceneBinding) => {
    const type = library.types.find((t) => t.key === row.typeKey);
    return (
      !!type?.playerAsks &&
      type.causes.every(
        (cause) => cause.match?.label?.startsWith("cause:event:") ?? false,
      )
    );
  };
  // A friend asks only for what the game can settle now (the Words lead,
  // Nov 15; owner's ruling: a colleague asks only for what the game can do):
  // the next posted town meeting the player may come to. With none, the
  // scene is not staged rather than dropped at its request.
  const nothingToAsk = (row: SceneBinding) =>
    row.typeKey === FRIENDS_TYPE && !nextMeetingFacts(core).meeting;
  const seasonFull = (row: SceneBinding) =>
    !pressedByPlayer(row) &&
    !library.types.find((type) => type.key === row.typeKey)?.openDecision &&
    (inSeason.get(row.typeKey) ?? zero) >= library.scheduling.seasonCap.value;
  const heldBack = wanted.flatMap(
    (row): NonNullable<ScheduleEntry["heldBack"]> =>
      seasonFull(row)
        ? [{ typeKey: row.typeKey, reason: "season-cap" }]
        : sameLetter(row) || sameRecordAgain(row)
          ? [{ typeKey: row.typeKey, reason: "nothing-changed" }]
          : nothingToAsk(row)
            ? [{ typeKey: row.typeKey, reason: "nothing-to-ask" }]
            : [],
  );
  // Each card's first failed gate, in the order the gates are read.
  const cardCut = (row: SceneBinding): BoardCut | undefined =>
    cuts.get(row.typeKey) ??
    (allowed && !allowed.has(row.typeKey)
      ? "not-allowed"
      : (heldBack.find((held) => held.typeKey === row.typeKey)?.reason ??
        (!receivable(row)
          ? "not-received"
          : !eachCause(row) && sittingToday.has(castOf(row))
            ? "joined"
            : undefined)));
  const cards = found.map((row) => {
    const cut = cardCut(row);
    return { typeKey: row.typeKey, ...(cut ? { cut } : {}) };
  });
  const bindings = wanted.filter((row) => !cardCut(row));
  // The day's own sitting takes this cause in, so its scene cites both
  // records. A sitting on an earlier day within the repeat window does not:
  // that scene has been played.
  const sittings = new Map(
    book.schedule
      .filter(
        (entry) =>
          entry.date === moment.date &&
          entry.momentId !== moment.id &&
          // A moment waiting on today's board is the day's sitting too.
          (entry.outcome !== "journal-line" || !!entry.board?.pending),
      )
      .flatMap((entry) =>
        entry.bindings.map((row) => [castOf(row), row] as const),
      ),
  );
  for (const row of wanted) {
    if (eachCause(row)) continue;
    const sitting = sittings.get(castOf(row));
    if (!sitting) continue;
    sitting.joined ??= [];
    if (!sitting.joined.some((entry) => entry.momentId === moment.id))
      sitting.joined.push({ momentId: moment.id, causeId: moment.causeId });
  }
  // News from the household's own records (a parent's lost job, a death, a
  // serious illness) is a family scene at home whatever its size (owner,
  // Oct 14, 2026, night: the director picks the family scene the
  // household's records make apply).
  // A record of the whole household (an eviction) is a family scene for
  // each of them, with no one else named.
  // A record of one's own life that names them (a filing, the count of their
  // own race, a story against them) is met where its scene is set that day:
  // at home, or for an officeholder at the office or by phone.
  const household = person.householdId;
  const met = new Set(library.scheduling.ownRecordSettings ?? ["home"]);
  const householdNews =
    ((library.scheduling.householdScenes.includes(moment.label) &&
      moment.counterpartIds.some(
        (id) => core.people.get(id)?.householdId === household,
      )) ||
      (library.scheduling.householdRecordScenes?.includes(moment.label) ??
        false)) &&
    bindings.some((row) => row.setting.kind === "home");
  const ownNews =
    (library.scheduling.ownRecordScenes?.includes(moment.label) ?? false) &&
    moment.selfNamed === true &&
    bindings.some((row) => met.has(row.setting.kind) || row.setting.seat);
  const familyNews = householdNews || ownNews;
  // A tie that turned with someone the person spent time with (a friendship
  // grown over many meetings, a falling-out) is met then, with them: its
  // cause is the relationship record, contacted on the day its change was
  // measured or the day before, as a day's ties are read once it closes.
  const contacted = moment.label.startsWith("tie:")
    ? (() => {
        const row = core.relationships.get(moment.causeId);
        return row ? (lastMetOnRow(row) ?? undefined) : undefined;
      })()
    : undefined;
  const tieMet =
    !!contacted &&
    contacted >= addDays(makeIsoDate(moment.date), -one) &&
    contacted <= moment.date;
  const waits =
    bindings.length > zero &&
    bindings.every(
      (row) => library.types.find((type) => type.key === row.typeKey)?.waits,
    );
  // The one whose record it is: named by the moment, or by the cause record
  // itself (a birth names its parents, though its moment is about the child).
  const ownRecord =
    moment.selfNamed === true ||
    !!core.durableLog.get(moment.causeId)?.personIds.includes(moment.personId);
  // A scene that follows an office stop the player switched off (a desk
  // visit, the desk switch) neither stops the day nor waits for them: the
  // player is away from it, and the moment is the Journal's line.
  const switchedOff = (row: (typeof bindings)[number]) => {
    const type = library.types.find((each) => each.key === row.typeKey);
    return (
      !!type?.stopSwitch &&
      core.modules.has(OFFICE_DAY_MODULE_ID) &&
      stopsOf(coreAPI(core), moment.personId)[type.stopSwitch] === false
    );
  };
  const away =
    bindings.length > zero && bindings.every((row) => switchedOff(row));
  const stopsDay =
    ownRecord &&
    bindings.some(
      (row) =>
        !switchedOff(row) &&
        library.types.find((type) => type.key === row.typeKey)?.stopsDay,
    );
  const stops =
    bindings.length > zero &&
    !away &&
    (moment.impact >= options.interruptImpact ||
      familyNews ||
      tieMet ||
      stopsDay) &&
    !waits;
  if (!found.length)
    coverage ??= {
      momentId: moment.id,
      personId: moment.personId,
      label: moment.label,
      impact: moment.impact,
      reason: "no-type",
    };
  // Which of the record stop rules stopped the day, kept for dev mode's trace.
  const stopsBecause = stops
    ? (
        [
          ["impact", moment.impact >= options.interruptImpact],
          ["household", householdNews],
          ["own-record", ownNews],
          ["tie", tieMet],
          ["stops-day", stopsDay],
        ] as const
      )
        .filter(([, holds]) => holds)
        .map(([rule]) => rule)
    : [];
  const live = options.mode === "live";
  // Bound and not stopped by a rule: the moment waits on the day's board.
  const pending = bindings.length > zero && !away && !stops;
  return {
    momentId: moment.id,
    date: moment.date,
    outcome: stops ? "scene-now" : "journal-line",
    mode: options.mode,
    interrupt: stops,
    ...(stopsBecause.length ? { stopsBecause } : {}),
    stopsSkip: !live && stops,
    rank,
    pace,
    bindings,
    ...(heldBack.length ? { heldBack } : {}),
    ...(found.length ? {} : { coverage }),
    board: {
      cards,
      reads: { impact: moment.impact },
      score: moment.impact,
      ...(pending ? { pending: true as const } : {}),
      ...(away ? { cut: "switched-off" as const } : {}),
    },
  };
}

/** A candidate on the day's board: a waiting moment, or a scene from circumstance offered. */
interface Candidate {
  /** The waiting moment's entry, for a moment already stored. */
  entry?: ScheduleEntry;
  /** The offer, for a scene from circumstance not stored until it is weighed. */
  offer?: BoardOfferInput;
  /** The row says its scene comes ahead of the day's others (circumstances.json `before`). */
  before: boolean;
  score: number;
  key: string;
}

/** A scene from circumstance the producer offers the day's board (ledger.ts produceCircumstances). */
export interface BoardOfferInput {
  rowId: string;
  typeKey: string;
  causeId: string;
  castId: PersonId;
  /** The amount it would be felt, on the same scale as a moment's impact. */
  score: number;
  before: boolean;
  /** The row follows a record of the player's own life: met as their own record, whatever the score. */
  lived: boolean;
  /** Stores its moment, as any moment is stored and weighed, and returns its entry. */
  stage: () => ScheduleEntry | undefined;
}

/** Scenes picked by the board over the trailing year: the life's room is its pace less these. */
export function picksInYear(
  library: SituationLibrary,
  book: PersonLedger,
  date: IsoDate,
): number {
  const since = addDays(makeIsoDate(date), -library.scheduling.trailingDays);
  let picks = zero;
  for (let at = book.schedule.length - one; at >= zero; at -= one) {
    const entry = book.schedule[at]!;
    if (entry.date <= since) break;
    if (entry.board?.picked) picks += one;
  }
  return picks;
}

/**
 * The day's one pick for a watched person, from every candidate on their
 * board: the moments waiting since today's weighing and the scenes from
 * circumstance offered. The best by the amount felt is read first (a row that
 * comes ahead of the day's others first of all; equal amounts by the stable
 * hash), its wordings checked, and the first whose wordings hold is picked
 * while the life has room. A scene met where the person is plays now; any
 * other waits for them, and while time is skipped only a scene met where they
 * are can stop the skip. Every candidate not picked keeps why on its entry.
 * Returns the pick, and the scene from circumstance staged first as the
 * person's own record.
 */
export function pickFromBoard(
  core: Readonly<CoreState>,
  book: PersonLedger,
  input: {
    date: IsoDate;
    mode: string;
    /** The moments weighed since the last pick that no stop rule staged. */
    pending: readonly ScheduleEntry[];
    offers: readonly BoardOfferInput[];
    /** Why the entry's scene cannot be worded (no one speaks, nothing past its opener), or nothing. */
    worded: (entry: ScheduleEntry) => "silent" | "nothing-said" | undefined;
  },
  library: SituationLibrary = SITUATION_LIBRARY,
): { picked?: ScheduleEntry; stops: ScheduleEntry[] } {
  const stops: ScheduleEntry[] = [];
  const candidates: Candidate[] = [];
  for (const entry of input.pending) {
    if (!entry.board?.pending) continue;
    delete entry.board.pending;
    candidates.push({
      entry,
      before: false,
      score: entry.board.score,
      key: entry.momentId,
    });
  }
  for (const offer of input.offers)
    candidates.push({
      offer,
      before: offer.before,
      score: offer.score,
      key: `${offer.rowId}|${offer.causeId}|${offer.castId}`,
    });
  if (!candidates.length) return { stops };
  const tie = (candidate: Candidate) =>
    stableHash(`${book.personId}:${input.date}:${candidate.key}`);
  candidates.sort(
    (a, b) =>
      Number(b.before) - Number(a.before) ||
      b.score - a.score ||
      tie(a).localeCompare(tie(b)),
  );
  const person = core.people.get(book.personId);
  const room = person
    ? paceOf(library, person.birthDate, input.date) -
      picksInYear(library, book, input.date)
    : zero;
  const live = input.mode === "live";
  // The best scene from circumstance that follows a record of the person's
  // own life (a door on their canvass, their own chamber's floor) is met as
  // their own record: a stop rule, whatever the score and the room. The
  // rest of them weigh like any other candidate.
  const lived = candidates.find((row) => row.offer?.lived);
  if (lived) {
    candidates.splice(candidates.indexOf(lived), one);
    const entry = lived.offer!.stage();
    if (entry?.board?.pending) {
      delete entry.board.pending;
      const unworded = input.worded(entry);
      if (unworded) entry.board.cut = unworded;
      else {
        entry.outcome = "scene-now";
        entry.interrupt = true;
        entry.stopsBecause = ["own-record"];
        entry.stopsSkip = !live;
        stops.push(entry);
      }
    }
  }
  const metWhereYouAre = library.scheduling.metWhereYouAre ?? [];
  const offered: BoardOffer[] = [];
  const passed: ScheduleEntry[] = [];
  let picked: ScheduleEntry | undefined;
  for (const candidate of candidates) {
    const cutOffer = (cut: BoardCut) =>
      offered.push({
        rowId: candidate.offer!.rowId,
        typeKey: candidate.offer!.typeKey,
        causeId: candidate.offer!.causeId,
        castId: candidate.offer!.castId,
        score: candidate.score,
        cut,
      });
    if (picked || room <= zero) {
      const cut = picked ? "outscored" : "no-room";
      if (candidate.entry) candidate.entry.board!.cut = cut;
      else cutOffer(cut);
      continue;
    }
    // A scene from circumstance is stored and weighed like any moment once
    // it is the best left on the board.
    const entry = candidate.entry ?? candidate.offer!.stage();
    if (!entry?.board) continue;
    passed.push(entry);
    // Its own weighing staged it (a record stop rule), or bound nothing.
    if (!candidate.entry && !entry.board.pending) continue;
    delete entry.board.pending;
    const moment = book.momentsById.get(entry.momentId);
    const metHere =
      !!moment &&
      metWhereYouAre.some((prefix) => moment.label.startsWith(prefix));
    const waits = entry.bindings.every(
      (row) => library.types.find((type) => type.key === row.typeKey)?.waits,
    );
    const now = metHere && !waits;
    if (!live && !now) {
      entry.board.cut = "skipping";
      continue;
    }
    const unworded = input.worded(entry);
    if (unworded) {
      entry.board.cut = unworded;
      continue;
    }
    entry.board.picked = true;
    entry.outcome = now ? "scene-now" : "scene-waiting";
    entry.interrupt = now;
    if (now) entry.stopsBecause = ["met-here"];
    entry.stopsSkip = !live && now;
    picked = entry;
  }
  // The offers never stored are kept on the day's pick, else on the last
  // entry the board weighed, so dev mode can show what the day held.
  const holder =
    picked ??
    passed[passed.length - one] ??
    candidates.find((row) => row.entry)?.entry;
  if (offered.length && holder?.board) holder.board.offers = offered;
  return { ...(picked ? { picked } : {}), stops };
}
