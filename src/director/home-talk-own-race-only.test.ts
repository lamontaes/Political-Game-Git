/**
 * The house talks about a race as the player's news only when the player is
 * in it (pool item play-player-entered-in-races-without-filing-press). The
 * director's ledger also holds the town's other races the player merely saw;
 * at Sherrodsville (place key 3972242, seed "scan-25") the town votes on
 * 2025-11-04 and the player, who never presses file, used to hear "I saw how
 * Mayor came out" and "I'm sorry about Council member" as though they had run.
 * The player lives each day to the week after that vote, and each evening
 * from the count on talks with everyone at home. The seed and the place key
 * are fixed here; nothing is drawn. A person who does file through the game's
 * own filing (`fileForOffice`) and then plays the same days still hears their
 * own race.
 */
import { appendFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";
import { purposeScene, replyInScene } from "./purpose-scene";

const EVENING = 20 * 60 + 30;
const VOTE = "2025-11-04";

const PLACE = "3972242";
const SEED = "scan-25";

type World = ReturnType<typeof buildBenchWorld>;

function liveThrough(
  world: World,
  playerId: PersonId,
  day: number,
  minuteOfDay = EVENING,
): void {
  const { core } = world;
  let packet = advancePlayerV1(core, {
    controlledPersonId: playerId,
    through: {
      date: addDays(makeIsoDate(gameStartDate()), day),
      minuteOfDay,
    },
  });
  while (packet.kind !== "complete") {
    if (packet.kind === "stop") answerPetitionOffer(world, playerId);
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, { kind: "own-choice", pauseId: packet.pauseId });
  }
}

/**
 * A player who is told their petition is short says yes, as a player does:
 * the engine offers and the player decides (OWNER-DECISIONS Oct 14). The
 * character on its own choice answers no scene.
 */
function answerPetitionOffer(world: World, playerId: PersonId): void {
  const { core, director } = world;
  const book = director.ledger.people.get(playerId);
  for (const entry of book?.schedule ?? []) {
    if (!entry.bindings.some((b) => b.typeKey === "petition-short")) continue;
    if (entry.answered?.includes("petition-short")) continue;
    const result = purposeScene(core, director, playerId, entry, {
      typeKey: "petition-short",
    });
    if (result?.kind !== "composed") continue;
    const yes = result.scene.talk.tree.replies.findIndex(
      (reply) => reply.line.move === "promise",
    );
    if (yes >= 0) replyInScene(core, director, playerId, entry, [yes]);
  }
}

/** What the player's housemates say of the player's news in the evenings, one line each. */
function homeNews(world: World, playerId: PersonId, day: number): string[] {
  const { core, director } = world;
  const said: string[] = [];
  const room = [
    ...(core.households.get(core.people.get(playerId)!.householdId)
      ?.memberIds ?? []),
  ]
    .filter((id) => id !== playerId && core.people.get(id)?.alive)
    .sort() as PersonId[];
  for (const otherId of room) {
    const talk = openConversation(core, playerId, otherId, {
      director,
      presentIds: room,
      minuteOfDay: EVENING,
    });
    if (!talk.lines.length) continue;
    noteHeard(core, talk);
    for (let turn = 0; turn < 6 && talk.choices.length; turn += 1)
      say(core, talk, talk.choices[(day + turn) % talk.choices.length]!.key);
    // HOME_TALK_PLAYED=<file> keeps every line said, for the played file.
    if (process.env.HOME_TALK_PLAYED)
      appendFileSync(
        process.env.HOME_TALK_PLAYED,
        `-- ${core.date}, with ${core.people.get(otherId)!.givenName}\n${talk.lines
          .map(
            (line) =>
              `  ${line.speakerId === playerId ? "You" : core.people.get(line.speakerId)?.givenName}: ${line.text}`,
          )
          .join("\n")}\n`,
      );
    for (const line of talk.lines)
      if (line.kind === "player-news" && line.speakerId === otherId)
        said.push(`${core.date}: ${line.subjectId} ${line.text}`);
  }
  return said;
}

const filingsOf = (world: World, personId: string) =>
  (
    coreAPI(world.core)
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).filter((row) => row.personId === personId);

const raceNews = (said: string[]) =>
  said.filter((row) =>
    /player-news:(election-result|primary-result|candidate-filed)/.test(row),
  );

function setUp() {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const playerId = world.playerId! as PersonId;
  world.director.watch(world.core, playerId);
  world.core.focusPersonIds.add(playerId);
  return { world, playerId };
}

const first = daysBetween(makeIsoDate(gameStartDate()), makeIsoDate(VOTE));

it("a race the player did not enter is not brought up as the player's own (Sherrodsville)", () => {
  const { world, playerId } = setUp();
  const said: string[] = [];
  for (let day = 1; day <= first + 6; day += 1) {
    liveThrough(world, playerId, day);
    if (day >= first) said.push(...homeNews(world, playerId, day));
  }
  // The player never filed, so none of their news is about a race or a filing.
  expect(filingsOf(world, playerId)).toEqual([]);
  expect(raceNews(said)).toEqual([]);
}, 100_000);
