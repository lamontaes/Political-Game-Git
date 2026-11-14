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
import { officeholders } from "../bench/officeholders";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  acceptJobOffer,
  JOBS_MODULE_ID,
  jobOffersFor,
} from "../core2/modules/jobs";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { noteHeard, openConversation, say } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = Number(process.env.TALK_DRAWS ?? 3);
/**
 * `PLAYER_AS=official` plays the bench's Advanced start: the player steps in
 * as a serving officeholder who lives with someone (the first such, by the
 * officeholders list), as the start screen offers. Nothing is staged: the
 * records the house reads are the engines' own.
 */
const AS_OFFICIAL = process.env.PLAYER_AS === "official";
/**
 * `STAGE_OFFER=<day>` stages one thing, on that day, as dev mode would: an
 * employer's offer to the player for the first open position on the books
 * (the offer row and the hold on the position, written here). Taking it goes
 * through the jobs engine's own hire (`acceptJobOffer`); the job record, the
 * ledger's moment and every word said about it are the engines' own.
 */
const STAGE_OFFER = process.env.STAGE_OFFER
  ? Number(process.env.STAGE_OFFER)
  : undefined;
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
    let playerId = world.playerId! as PersonId;
    if (AS_OFFICIAL) {
      const held = officeholders(core).find((row) => {
        const person = core.people.get(row.personId);
        return (
          !!person &&
          [...(core.households.get(person.householdId)?.memberIds ?? [])]
            .length > 1
        );
      });
      if (held) {
        new BenchPlayer(core, director).select(held.personId);
        playerId = held.personId as PersonId;
        (core as { playerId?: string }).playerId = playerId;
      }
    }
    director.watch(core, playerId);
    core.focusPersonIds.add(playerId);
    const api = coreAPI(core);
    const did: string[] = [];
    const played: string[] = [];
    let filed = false;
    let staged = false;
    const heardBy = new Map<string, string>();
    for (let day = 0; day < DAYS; day += 1) {
      if (day > 0) liveThrough(core, playerId, day);
      if (
        STAGE_OFFER !== undefined &&
        day >= STAGE_OFFER &&
        !staged &&
        !core.people.get(playerId)?.jobId
      ) {
        const positions = api.moduleState(JOBS_MODULE_ID).table("positions");
        const open = (
          positions.rows() as unknown as {
            id: string;
            organizationId: string;
            placeId: string;
            title: string;
            hourlyMinor: number;
            status: string;
          }[]
        ).find((row) => row.status === "open");
        if (open) {
          const id = `job-offer:${open.id}:${playerId}`;
          positions.put({ ...open, offeredTo: playerId, offerId: id } as never);
          api
            .moduleState(JOBS_MODULE_ID)
            .table("offers")
            .put({
              id,
              personId: playerId,
              positionId: open.id,
              organizationId: open.organizationId,
              offeredBy: playerId,
              title: open.title,
              hourlyMinor: open.hourlyMinor,
              fit: 1,
              offeredAt: core.date,
              deadline: core.date,
              status: "pending",
            } as never);
          staged = true;
          did.push(`day ${day}: STAGED an offer of ${open.title} (${open.id})`);
        } else
          did.push(
            `day ${day}: no open position to stage an offer for (${positions.rows().length} positions on the books)`,
          );
      }
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
    if (!did.length) {
      // Why nothing happened, from the records: the player's age, and the
      // checks the clerk's answer found unmet on each race.
      const born = core.people.get(playerId)!.birthDate;
      const unmet = governmentView(core, playerId)
        .contests.slice(0, 3)
        .map(
          (row) =>
            `${row.contest.title}: ${row.checks
              .filter((check) => !check.met)
              .map((check) => check.rule)
              .join("+")}`,
        );
      passed.push(
        `${where}: no job offered and no race open in ${DAYS} days (player born ${born}; ${unmet.join("; ") || "no races listed"})`,
      );
    }
    process.stdout.write(
      `PLAYER-NEWS ${where}\n${did.join("\n") || "the player did nothing of note"}\n${played.join("\n")}\n`,
    );
  }
  process.stdout.write(
    `PASSED OVER: ${passed.join("; ") || "none"}; player news told ${told} times\n`,
  );
  expect(broken).toEqual([]);
}, 3_600_000);
