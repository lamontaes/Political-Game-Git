/**
 * The player's own news, brought up at home (words composer; lead, Nov 12:
 * "the people at home talk most about the person in front of them"). A
 * fortnight is played in a drawn place as the bench plays it: each evening
 * the player talks with everyone at home; a job the employer offers the
 * player is taken (the offer scene's "agree", `acceptJobOffer`), and the
 * player files for the first race open to them (the filing route,
 * `fileForOffice`) as soon as one is. The test prints every talk, what the
 * player did and when, and which places it passed over (no offer and no race
 * open in the fortnight). Over every place it plays it holds:
 *
 * - every subject of the player's news names a moment of the player's own
 *   ledger by its cause, said with the housemate's stance;
 * - a housemate never raises the player's news after another in the house
 *   told it, or after a scene played it.
 *
 * `TALK_DRAWS` (default 3) sets how many places are drawn.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { fileForOffice, governmentView } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { acceptJobOffer, jobOffersFor } from "../core2/modules/jobs";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = Number(process.env.TALK_DRAWS ?? 3);
const DAYS = 14;
const EVENING = 20 * 60 + 30;
const TURNS = 6;

function liveThrough(core: CoreState, playerId: PersonId, day: number) {
  let packet = advancePlayerV1(core, {
    controlledPersonId: playerId,
    through: {
      date: addDays(makeIsoDate(gameStartDate()), day),
      minuteOfDay: EVENING,
    },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, { kind: "own-choice", pauseId: packet.pauseId });
}

it(`the house talks about the player's own news (seed ${seed})`, () => {
  const broken: string[] = [];
  const passed: string[] = [];
  let told = 0;
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `home-talk-player-news:${draw}`);
    const where = `${place.name} (${place.key}), seed ${seed}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const playerId = world.playerId! as PersonId;
    director.watch(core, playerId);
    core.focusPersonIds.add(playerId);
    const api = coreAPI(core);
    const did: string[] = [];
    const played: string[] = [];
    let filed = false;
    const heardBy = new Map<string, string>();
    for (let day = 0; day < DAYS; day += 1) {
      if (day > 0) liveThrough(core, playerId, day);
      for (const offer of jobOffersFor(api, playerId))
        if (offer.status === "pending" && acceptJobOffer(api, offer.id))
          did.push(`day ${day}: took the job offered (${offer.id})`);
      if (!filed) {
        const open = governmentView(core, playerId).contests.find((row) =>
          row.checks.every((check) => check.met),
        );
        if (open)
          try {
            fileForOffice(core, playerId, open.contest.id);
            filed = true;
            did.push(`day ${day}: filed for ${open.contest.title}`);
          } catch (error) {
            did.push(`day ${day}: filing refused: ${(error as Error).message}`);
          }
      }
      const player = core.people.get(playerId)!;
      const room = [
        ...(core.households.get(player.householdId)?.memberIds ?? []),
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
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1)
          say(
            core,
            talk,
            talk.choices[(day + turn) % talk.choices.length]!.key,
          );
        played.push(
          `-- day ${day}, with ${core.people.get(otherId)!.givenName}`,
        );
        for (const line of talk.lines)
          played.push(
            `  ${line.speakerId === playerId ? "You" : core.people.get(line.speakerId)?.givenName}: ${line.text}`,
          );
        for (const line of talk.lines.filter(
          (row) => row.kind === "player-news" && row.speakerId === otherId,
        )) {
          told += 1;
          const cause = line.subjectId.replace(/^[^>]*>player-news:/, "");
          const moment = director.ledger.people
            .get(playerId)
            ?.moments.find((row) => row.causeId === cause);
          if (!moment)
            broken.push(
              `${where}, day ${day}: player news names no moment of the player's (${line.subjectId})`,
            );
          const before = heardBy.get(cause);
          if (before && before !== otherId)
            broken.push(
              `${where}, day ${day}: the player's news ${cause} told twice in the house`,
            );
          heardBy.set(cause, otherId);
        }
      }
    }
    if (!did.length)
      passed.push(`${where}: no job offered and no race open in ${DAYS} days`);
    process.stdout.write(
      `PLAYER-NEWS ${where}\n${did.join("\n") || "the player did nothing of note"}\n${played.join("\n")}\n`,
    );
  }
  process.stdout.write(
    `PASSED OVER: ${passed.join("; ") || "none"}; player news told ${told} times\n`,
  );
  expect(broken).toEqual([]);
}, 3_600_000);
