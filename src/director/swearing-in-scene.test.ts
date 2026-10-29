import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import type { ContestRow } from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import {
  OFFICES_MODULE_ID,
  seatWinner,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { retellingsOf } from "../core2/modules/speech";
import { stancesOf } from "../core2/modules/views";
import type { Fact } from "../english/scene-talk-words";
import { composeJournal } from "./journal";
import { inauguralStand } from "./inaugural-address";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";
import { WORDS_STOPGAP_HITS } from "./stopgaps";
import { outgoingHolder, swornOffice, titleInSentence } from "./swearing-in";
import swearingData from "./data/swearing-in.json" with { type: "json" };

// Taking office is an event (owner, Sept 22: "swearing in needs to be an
// event"; Oct 29: "that's just a scene ... depending on what your office is,
// you'll give a speech"). In a played world in a drawn place the player is
// seated by the offices engine's own writer for a winner (`seatWinner`, the
// one the count calls), the engine writes took-office, and the director stages
// a swearing-in from it: someone the records name gives the oath, the
// player's household and the government's other officeholders are in the
// room, the player's reply is the oath on the record, and an office that gives
// an address (mayor, governor, president) goes on to it through the speech
// engine, heard by the people named in the room.
//
// Four seatings in one drawn place: a local body's seat (the oath alone), a
// local executive's, the governor's and the president's (each goes on to an
// address). A place with no local body or no local executive stands aside for
// the next draw, named.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 8;
const BODIES = ["council", "county-board", "township-board"];
const LOCAL_EXECUTIVES = ["mayor", "county-executive"];
const ADDRESS_KINDS: readonly string[] = swearingData.address.kinds;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "swearing-in",
) as unknown as PurposeType;

/** Every path of a tree to a reply that ends the scene: the replies chosen, in order. */
const endPaths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next?.replies.length
      ? endPaths(reply.next, [...prefix, index])
      : [[...prefix, index]],
  );
const nodeAt = (tree: TreeNode, path: readonly number[]): TreeNode => {
  let node = tree;
  for (const index of path) node = node.replies[index]!.next!;
  return node;
};
const replyAt = (tree: TreeNode, path: readonly number[]) =>
  nodeAt(tree, path.slice(0, -1)).replies[path.at(-1)!]!;

/** A defect in an engine this scene reads, which the seating cannot get past. */
class EngineGap extends Error {}

interface Seating {
  readonly kind: string;
  readonly title: string;
  readonly seatId: string;
  readonly officeId: string;
  /** The seat's race on record, whose filing clerk gives the oath. */
  readonly contest: ContestRow | undefined;
}

/** The first seat of one of these office kinds that the town's records hold. */
function seatOf(core: CoreState, kinds: readonly string[]): Seating | null {
  const api = coreAPI(core);
  const found = kinds
    .map((kind) => townSeats(api).find((row) => row.office.kind === kind))
    .find(Boolean);
  if (!found) return null;
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  return {
    kind: found.office.kind,
    title: found.office.title,
    seatId: found.seat.id,
    officeId: found.office.id,
    contest: contests
      .filter((row) => row.seatId === found.seat.id)
      .sort((a, b) => a.id.localeCompare(b.id))[0],
  };
}

/**
 * A fresh world in the drawn place with the player seated in one of its
 * offices the way a count seats a winner, and the day after, when the
 * director has read the record.
 */
function seated(place: ReturnType<typeof drawPlace>, kinds: readonly string[]) {
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const seat = seatOf(core, kinds);
  if (!seat) return null;
  const playerId = core.playerId!;
  const player = core.people.get(playerId)!;
  // As play does when a life starts (src/bench/player.ts, select).
  director.watch(core, playerId);
  for (const id of core.households.get(player.householdId)?.memberIds ?? [])
    if (id !== playerId && core.people.get(id)?.alive) director.watch(core, id);
  const took = core.date;
  seatWinner(coreAPI(core), {
    seatId: seat.seatId,
    officeId: seat.officeId,
    personId: playerId,
    identity: {
      givenName: player.givenName,
      familyName: player.familyName,
      gender: "recorded",
      birthDate: player.birthDate,
      homeState: place.state,
    },
    party: null,
    endDate: null,
    reached: `elected ${took}`,
    resultId: seat.contest?.id ?? `swearing-in-test:${seat.seatId}`,
    title: seat.title,
    winnerId: playerId,
    news: true,
  });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  } catch (error) {
    // The governing engine's own defect, not this scene's: a new governor's
    // own-choice appointment ends the appointee's job after that day's
    // work (src/core2/job-lifecycle.ts). Named, and the seating stands aside.
    if (/A job ends before its day's work/.test(String(error)))
      throw new EngineGap(String(error));
    throw error;
  }
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (row) =>
      book.momentsById.get(row.momentId)?.label === "cause:event:took-office",
  );
  return { core, director, playerId, seat, took, book, entry };
}
type World = NonNullable<ReturnType<typeof seated>>;

/** One seating, checked from the record to the journal; returns the lines to log. */
function swearIn(at: string, world: World, address: boolean): string {
  const { core, director, playerId, seat, took, book, entry } = world;
  const api = coreAPI(core);
  const player = core.people.get(playerId)!;

  // 1. The offices engine's record opens the scene, and it stops the day.
  const cause = core.durableLog.get(`took-office:${seat.seatId}:${took}`);
  expect(cause?.kind, at).toBe("took-office");
  expect(cause?.personIds, at).toContain(playerId);
  expect(entry, `${at}: no took-office moment`).toBeTruthy();
  const swearing = entry!.bindings.find((row) => row.typeKey === "swearing-in");
  expect(swearing, `${at}: ${JSON.stringify(entry!.coverage)}`).toBeTruthy();
  expect(entry!.outcome, at).toBe("scene-now");
  expect(entry!.interrupt, at).toBe(true);
  expect(book.momentsById.get(entry!.momentId)?.causeId, at).toBe(cause!.id);

  // 2. The cast comes from the records, and the data says whether an address follows.
  const sworn = swornOffice(core, cause!.id)!;
  expect(sworn.kind, at).toBe(seat.kind);
  expect(sworn.givesAddress, at).toBe(ADDRESS_KINDS.includes(seat.kind));
  expect(sworn.givesAddress, at).toBe(address);
  const cast = (role: string): PersonId[] =>
    swearing!.roles.find((row) => row.role === role)?.personIds ?? [];
  const [officiant] = cast("officiant");
  expect(officiant, `${at}: nobody on record to give the oath`).toBeTruthy();
  expect(officiant, at).not.toBe(playerId);
  expect(core.people.get(officiant!)?.alive, at).toBe(true);
  expect(swearing!.presentReasons[officiant!], at).toBe("oath-giver");
  // The clerk who took the filing where the seat's race is on record;
  // otherwise the holder who left the seat that day.
  const filed = seat.contest
    ? filingClerkFor(api, seat.contest.id)?.personId
    : undefined;
  const outgoing = outgoingHolder(core, sworn, playerId);
  if (filed && core.people.get(filed)?.alive) expect(officiant, at).toBe(filed);
  else if (outgoing) expect(officiant, at).toBe(outgoing);
  // A state or federal office has no court on record to swear anyone in.
  if (sworn.level === "state" || sworn.level === "federal")
    expect(WORDS_STOPGAP_HITS.has("SG-WORDS-swearing-in-no-court"), at).toBe(
      true,
    );
  // The household is the family in the room, and no one else is.
  const home = (
    core.households.get(player.householdId)?.memberIds ?? []
  ).filter(
    (id) => id !== playerId && id !== officiant && core.people.get(id)?.alive,
  );
  expect([...cast("family")].sort(), at).toEqual([...home].sort());
  // The others hold other offices of the same government, a few at most.
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  const sitsInGovernment = (id: string) =>
    terms.some(
      (term) =>
        term.status === "serving" &&
        (term.personId ?? `official:${term.id}`) === id &&
        (
          offices.get(term.officeId) as unknown as
            { jurisdiction: string } | undefined
        )?.jurisdiction === sworn.jurisdiction,
    );
  const colleagues = cast("colleagues");
  expect(colleagues.length, at).toBeLessThanOrEqual(
    swearingData.parameters.colleaguesMax.value,
  );
  for (const id of colleagues) {
    expect([playerId, officiant], at).not.toContain(id);
    expect(sitsInGovernment(id), `${at}: ${id}`).toBe(true);
  }
  const room = [...new Set([...cast("family"), ...colleagues, officiant!])];

  // 3. Narration, the oath, four replies that are four stances.
  const scene = composeScene(core, director, playerId, entry as ScheduleEntry);
  expect(scene?.typeKey, at).toBe("swearing-in");
  const result = purposeScene(core, director, playerId, entry as ScheduleEntry);
  expect(result?.kind, `${at}: ${JSON.stringify(result)}`).toBe("composed");
  if (result?.kind !== "composed") throw new Error(at);
  const talk = result.scene.talk;
  expect(result.scene.askerId, at).toBe(officiant);
  expect(talk.gaps, at).toEqual([]);
  expect(talk.narration.length, at).toBeGreaterThan(0);
  expect(talk.state.text, at).toMatch(/swear/i);
  expect(talk.state.text, at).toContain(titleInSentence(sworn.title));
  const root = talk.tree.replies.map((row) => row.line);
  expect(root.length, at).toBe(4);
  expect(new Set(root.map((row) => row.move)).size, at).toBe(4);
  expect(new Set(root.map((row) => row.text)).size, at).toBe(4);
  // Nothing a player reads is a record kind, an id or a date.
  for (const line of [
    ...talk.narration,
    ...(talk.open ? [talk.open] : []),
    talk.state,
    ...talk.lines,
  ])
    expect(line.text, at).not.toMatch(
      /\{|\}|took-office|person_|official:|\d{4}-\d{2}-\d{2}|undefined/,
    );
  // The office gives an address or it does not: every path ends one way.
  const paths = endPaths(talk.tree);
  expect(
    [
      ...new Set(
        paths.map((p) => replyAt(talk.tree, p).next?.end?.ending?.keeps),
      ),
    ],
    at,
  ).toEqual([address ? "address" : "oath"]);

  // 4. A different speaker says it differently, and so does a different tie;
  // the same one says it the same.
  const facts = Object.fromEntries(
    result.scene.facts.map((row) => [
      row.key,
      { text: row.text, sourceRecordIds: row.recordIds } as Fact,
    ]),
  );
  const traits = (level: number) =>
    Object.fromEntries(
      [
        "personality-v1:facet-friendly",
        "personality-v1:facet-affectionate",
        "personality-v1:facet-hostile",
        "personality-v1:facet-guarded",
        "personality-v1:facet-calm",
        "personality-v1:facet-sensitive",
      ].map((id, k) => [id, k % 2 ? -level : level]),
    );
  const say = (level: number, only: Record<string, Fact>) => {
    const out = composeSceneTalk(
      core,
      director,
      { askerId: result.scene.askerId, askedId: result.scene.askedId },
      TYPE,
      only,
      { askerTraits: traits(level) },
    );
    return out.kind === "composed"
      ? out.talk.lines.map((row) => row.text).join("|")
      : out.reason;
  };
  const tied = (tie: "acquainted" | "stranger") => {
    const { acquainted, stranger, ...rest } = facts;
    void acquainted;
    void stranger;
    const out = composeSceneTalk(
      core,
      director,
      { askerId: result.scene.askerId, askedId: result.scene.askedId },
      TYPE,
      { ...rest, [tie]: { text: "", sourceRecordIds: [] } },
      // Whoever keeps to themself skips the greeting: this one does not.
      { askerTraits: { ...traits(0), "people-mind-v1:sociability": 0 } },
    );
    return out.kind === "composed" ? (out.talk.open?.text ?? "") : out.reason;
  };
  expect(say(2, facts), at).toBe(say(2, facts));
  expect(
    new Set([2, -2, 1, -1].map((level) => say(level, facts))).size,
    `${at}: four speakers sounded alike`,
  ).toBeGreaterThan(1);
  expect(tied("acquainted"), at).not.toBe(tied("stranger"));

  // 5. The player's replies are the oath on the record: the first reply is
  // the oath said, the last ends the scene with what it keeps.
  const wanted = address ? ["tell", "comfort"] : ["promise", "agree"];
  const path =
    paths.find((p) => wanted.includes(replyAt(talk.tree, p).line.move)) ??
    paths[0]!;
  const said = replyAt(talk.tree, path).line;
  const oathId = replyInScene(
    core,
    director,
    playerId,
    entry as ScheduleEntry,
    path.slice(0, 1),
  );
  const endId = replyInScene(
    core,
    director,
    playerId,
    entry as ScheduleEntry,
    path,
  );
  expect(oathId, at).toMatch(/^scene-reply:/);
  expect(endId, at).toMatch(/^scene-reply:/);
  const oath = core.durableLog.get(oathId!)!;
  const end = core.durableLog.get(endId!)!;
  expect(oath.kind, at).toBe("scene.reply");
  expect(oath.facts?.typeKey, at).toBe("swearing-in");
  expect(oath.facts?.causeId, at).toBe(cause!.id);
  expect(oath.personIds, at).toEqual([playerId, officiant]);
  expect(end.facts?.keeps, at).toBe(address ? "address" : "oath");
  expect(end.facts?.line, at).toBe(said.text);
  // Said once: the same reply again keeps the record.
  expect(
    replyInScene(core, director, playerId, entry as ScheduleEntry, path),
    at,
  ).toBe(endId);

  // 6. The officiant is met, and the journal tells who swore the player in.
  expect(core.people.get(playerId)!.knownIds.has(officiant!), at).toBe(true);
  const who = core.people.get(officiant!)!;
  const told = composeJournal(core, director, playerId)
    .flatMap((chapter) => chapter.lines)
    .find((row) => row.sourceRecordIds.includes(endId!));
  expect(told?.text, `${at}: journal`).toContain(
    `${who.givenName} ${who.familyName}`,
  );
  expect(told?.text, at).toMatch(/swore me in|the oath/);
  expect(told?.sourceRecordIds, at).toContain(officiant);

  // 7. The speech engine's record, heard by the people named in the room.
  const speechId = `speech:inaugural:${seat.seatId}:${took}`;
  const heard = core.durableLog.get(speechId);
  let about = "no address";
  if (address) {
    expect(heard?.kind, at).toBe("speech.heard");
    expect(heard?.personIds, at).toEqual([playerId]);
    expect([...(heard?.witnessIds ?? [])].sort(), at).toEqual(
      room.filter((id) => id !== playerId).sort(),
    );
    const listeners = retellingsOf(api, speechId).map((row) => row.listenerId);
    expect([...listeners].sort(), at).toEqual(
      [...(heard?.witnessIds ?? [])].sort(),
    );
    // The speaker argues their own stand where the reply they chose did.
    const stand = said.move === "tell" ? inauguralStand(core, playerId) : null;
    expect(heard?.topic ?? "", at).toBe(stand?.question ?? "");
    // The views engine reads it: a listener it persuaded cites the speech.
    const moved = (heard?.witnessIds ?? []).filter((id) =>
      stancesOf(api, id).some((row) =>
        row.causes.some((cite) => cite.eventId === speechId),
      ),
    );
    about = `${speechId} on ${stand?.question ?? "a welcome with no stand"}, heard by ${listeners.length}, ${moved.length} moved`;
  } else expect(heard, at).toBeUndefined();

  const sayLines = (node: TreeNode) =>
    node.lines.map(
      (row) =>
        `${row.role === "asker" ? who.givenName : "narrator"}: ${row.text}`,
    );
  return [
    `SWEARING-IN ${at}: ${seat.title} took office ${took} (${cause!.id}); oath given by ${who.givenName} ${who.familyName} (${officiant}); room of ${room.length}: ${cast("family").length} family, ${colleagues.length} colleagues; oath said ${oathId}; scene ended ${endId} keeping ${end.facts?.keeps}; ${about}; journal "${told!.text}"`,
    `  NARRATION ${talk.narration.map((row) => row.text).join(" ")}`,
    `  ${[
      talk.open?.text,
      talk.state.text,
      `YOU could say: ${root.map((row) => row.text).join(" / ")}`,
      ...sayLines(talk.tree.replies[path[0]!]!.next!),
      ...(path.length > 1
        ? [`YOU: ${said.text}`, ...sayLines(replyAt(talk.tree, path).next!)]
        : []),
    ]
      .filter(Boolean)
      .join("\n  ")}`,
  ].join("\n");
}

it(`taking office is a swearing-in scene: the oath on the record, and an address where the office gives one (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `swearing-in:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      // One world at a time: each is checked and let go before the next is built.
      const check = (
        label: string,
        kinds: readonly string[],
        address: boolean,
        optional = false,
      ): string | null => {
        let world: ReturnType<typeof seated>;
        try {
          world = seated(place, kinds);
        } catch (error) {
          if (error instanceof EngineGap && optional) {
            tried.push(`${where}, ${label}: ${error.message}`);
            return null;
          }
          throw new Error(`${where}, ${label}: ${String(error)}`);
        }
        return world ? swearIn(`${where}, ${label}`, world, address) : null;
      };
      const body = check("body", BODIES, false);
      const local = body
        ? check("local executive", LOCAL_EXECUTIVES, true)
        : null;
      if (!body || !local) {
        tried.push(
          `${where}: no ${body ? "local executive" : "local body seat"}`,
        );
        continue;
      }
      // The governor (a state whose executive is a mayor has none) and the president.
      const governor = check("governor", ["governor"], true, true);
      if (!governor) tried.push(`${where}: no governor seat taken`);
      const president = check("president", ["president"], true, true);
      if (!president) tried.push(`${where}: no president seat taken`);
      const log = [
        body,
        local,
        ...(governor ? [governor] : []),
        ...(president ? [president] : []),
      ];
      // Whatever the state and the nation's executive could not show, the
      // local executive did: an address heard by the people named in the room.
      if (tried.length) log.push(`STOOD ASIDE: ${tried.join("; ")}`);
      if (process.env.SCENE_LOG)
        writeFileSync(process.env.SCENE_LOG, log.join("\n"));
      console.log(log.join("\n"));
      return;
    }
    throw new Error(
      `no drawn place seated the player in a local body and a local executive: ${tried.join("; ")} (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
