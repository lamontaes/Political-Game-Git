/**
 * A card's own gates and weights (card-facts.ts; docs/design/director-board.md,
 * sections 2 and 3) at a drawn place, through the game's own calls: a party's
 * chair asks the player to run (a `party-asked` record entered through the
 * core's one event entry, as dev mode's force route enters a cause), the
 * player says no in the scene (`replyInScene`), and the next ask from the
 * same chair is cut on the board (`excludes`: the no is on record); a cause
 * invitation after the no reads the declined party, by the no's record id,
 * and weighs more than the amount felt alone. A season later the ask is staged again; a second no and a third
 * ask a season after that is cut by the board's default exclusion
 * (`asked-twice`). Every library row's facts and reads are known. Places are
 * drawn from all 56 (seed from GOLDEN_PATH_SEED, random when unset); a place
 * with no party chair to ask is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { partiesHere } from "../core2/modules/parties";
import { pairKey } from "../core2/kernel/ids";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { readExists } from "./arc-variant";
import { knownFact } from "./card-facts";
import { CIRCUMSTANCES } from "./circumstance";
import type { Director } from "./ledger";
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode } from "./scene-talk";
import { SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(10).toString("hex");
const DRAWS = 6;

it("every card's facts and reads are known", () => {
  for (const row of [...SITUATION_LIBRARY.types, ...CIRCUMSTANCES.rows]) {
    const id = "key" in row ? row.key : row.id;
    for (const fact of [...(row.requires ?? []), ...(row.excludes ?? [])])
      expect(knownFact(fact), `${id}: ${fact}`).toBe(true);
    for (const term of row.weights ?? [])
      expect(readExists(term.read), `${id}: ${term.read}`).toBe(true);
  }
});

/** A record entered through the core's one event entry, then the day measured. */
function enter(
  core: CoreState,
  record: {
    id: string;
    kind: string;
    personIds: PersonId[];
    witnessIds?: PersonId[];
    facts: Record<string, string>;
    topic?: string;
    desiredChange?: string;
    moodImpulse?: number;
    stressImpulse?: number;
  },
): void {
  applyCoreEvent(core, {
    ...record,
    witnessIds: record.witnessIds ?? [],
    date: core.date,
    placeId: core.people.get(record.personIds[0]!)!.placeId,
    source: {
      tag: "ESTIMATED",
      citation: `Board cards test: ${record.kind}`,
      asOf: core.date,
    },
  } as never);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
}

/** The player's entry for a cause, with the card of this type on it. */
function entryFor(
  director: Director,
  playerId: PersonId,
  causeId: string,
): ScheduleEntry | undefined {
  const book = director.ledger.people.get(playerId)!;
  return book.schedule.find(
    (entry) => book.momentsById.get(entry.momentId)?.causeId === causeId,
  );
}

/** The player says no in the scene: the first reply whose move is a decline. */
function sayNo(
  core: CoreState,
  director: Director,
  playerId: PersonId,
  entry: ScheduleEntry,
  typeKey: string,
): string | null {
  const result = purposeScene(core, director, playerId, entry, {
    includeHeld: true,
    typeKey,
  });
  if (result?.kind !== "composed") return null;
  const replies = playedNode(result.scene.talk.tree).replies;
  const at = replies.findIndex((reply) => reply.line.move === "decline");
  if (at < 0) return null;
  return replyInScene(core, director, playerId, entry, [at], {
    includeHeld: true,
    typeKey,
  });
}

it(`a no on record cuts the ask and weighs another door (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `board-cards:${draw}`);
    const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const playerId = world.playerId as PersonId;
    director.watch(core, playerId);
    const player = core.people.get(playerId)!;
    const api = coreAPI(core);
    const party = partiesHere(api).find(
      (row) =>
        row.leaderId &&
        row.leaderId !== playerId &&
        core.people.get(row.leaderId as PersonId)?.alive &&
        core.people.get(row.leaderId as PersonId)?.householdId !==
          player.householdId,
    );
    // A recruiter for a cause: someone the player has a tie with who does not live with them.
    const recruiter = [...core.people.values()]
      .filter(
        (p) =>
          p.id !== playerId &&
          p.id !== party?.leaderId &&
          p.alive &&
          p.householdId !== player.householdId &&
          core.relationships.has(pairKey(playerId, p.id)),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]?.id;
    // The races the chair asks about, soonest first, as an ask names one: a
    // later ask is about a later race.
    const contests = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as {
        id: string;
        title: string;
        electionDate: string;
        filingDeadline: string;
      }[]
    )
      .filter((row) => row.electionDate > core.date)
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      );
    const [contest, later] = contests;
    if (!party || !recruiter || !contest || !later) {
      passed.push(
        `${where}: ${!party ? "no party chair" : !recruiter ? "no one known to invite" : "not two races to come"}`,
      );
      continue;
    }
    const chairId = party.leaderId as PersonId;
    const ask = (n: number, race: typeof contest) => {
      const id = `board-cards:party-asked:${n}:${core.date}`;
      enter(core, {
        id,
        kind: "party-asked",
        personIds: [playerId, chairId],
        facts: {
          askedId: playerId,
          chairId,
          partyId: party.id,
          party: party.name,
          contestId: race.id,
          office: race.title,
          filingDeadline: race.filingDeadline,
        },
      });
      return id;
    };
    const invite = (n: number) => {
      const id = `board-cards:cause.shared:${n}:${core.date}`;
      enter(core, {
        id,
        kind: "cause.shared",
        personIds: [recruiter],
        witnessIds: [playerId],
        topic: "health:stroke",
        desiredChange: "health:stroke",
        // The share's pull on the one told, as share-drive sizes it from the
        // drive's strength; a middling strength (as cause-invite-topics.test.ts).
        stressImpulse: 0.5,
        moodImpulse: -0.5,
        facts: {},
      });
      // The invitation is met the next time the two are together.
      for (let day = 0; day < 14 && !entryFor(director, playerId, id); day++)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      return id;
    };

    // The chair asks; the player says no in the scene.
    const first = ask(1, contest);
    const firstEntry = entryFor(director, playerId, first);
    expect(
      firstEntry?.bindings.map((row) => row.typeKey),
      `${where}: the first ask is staged`,
    ).toContain("party-recruit");
    const no1 = sayNo(core, director, playerId, firstEntry!, "party-recruit");
    expect(no1, `${where}: the player's no is recorded`).toBeTruthy();
    expect(core.durableLog.get(no1!)?.facts?.ending, where).toBe(
      "not-this-time",
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 1));

    // The same chair asks again: cut on the board, the no on record.
    const second = ask(2, contest);
    const secondCards = entryFor(director, playerId, second)?.board?.cards;
    expect(
      secondCards?.find((row) => row.typeKey === "party-recruit")?.cut,
      `${where}: ${second} after ${no1}`,
    ).toBe("excludes");

    // A cause invitation after the no reads the declined party, and weighs more.
    const after = entryFor(director, playerId, invite(1));
    expect(
      after?.bindings.map((row) => row.typeKey),
      `${where}: the invitation binds (${JSON.stringify(after?.board?.cards)})`,
    ).toContain("cause-invite");
    expect(after!.board!.reads["declined-party"], where).toBeGreaterThan(0);
    expect(after!.board!.readIds, where).toContain(no1);
    expect(after!.board!.score, where).toBeGreaterThan(
      after!.board!.reads.impact,
    );

    // A season on, the no no longer excludes the ask: it is staged, and the
    // player says no again; a season after that, the third ask is cut by the
    // board's default exclusion.
    const season = SITUATION_LIBRARY.scheduling.endedDays!.value;
    for (let day = 0; day <= season; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const third = ask(3, later);
    const thirdEntry = entryFor(director, playerId, third);
    expect(
      thirdEntry?.bindings.map((row) => row.typeKey),
      `${where}: the ask a season on is staged`,
    ).toContain("party-recruit");
    const no2 = sayNo(core, director, playerId, thirdEntry!, "party-recruit");
    expect(no2, `${where}: the second no is recorded`).toBeTruthy();
    for (let day = 0; day <= season; day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const fourth = ask(4, later);
    expect(
      entryFor(director, playerId, fourth)?.board?.cards.find(
        (row) => row.typeKey === "party-recruit",
      )?.cut,
      `${where}: ${fourth} after ${no1} and ${no2}`,
    ).toBe("asked-twice");
    process.stderr.write(
      `board cards at ${where}: player ${playerId}, chair ${chairId}; no ${no1}; ${second} cut excludes; ${after!.momentId} declined-party ${after!.board!.reads["declined-party"]!.toFixed(3)} score ${after!.board!.score.toFixed(3)} from ${after!.board!.reads.impact.toFixed(3)}; second no ${no2}; ${fourth} cut asked-twice. Passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a party chair to ask: ${passed.join("; ")}`,
  );
}, 900_000);
