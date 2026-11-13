/**
 * A date in another year is said with its year or as "last February"; a
 * bare month and day always means this year (Fable A, Nov 13, rule 3;
 * Playtester P2, Hewitt NJ: on January 31st, "Aaron Hamilton stops you in the
 * street about what happened on February 20th", a February a year gone). A
 * played world in a place drawn from all 56 (seed from GOLDEN_PATH_SEED,
 * random when unset) is played past the new year, then every scene on the
 * player's schedule is composed on that day: a scene whose record is from the
 * year before says when it was with the year, never as a bare date.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import type { PersonId } from "../core2/types";
import { dateSaid } from "../english/day-words";
import { composeScene } from "./scene";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(10).toString("hex");
const MORNING = 8 * 60;
/** Past the new year from the game's start in late January. */
const PLAY_DAYS = 380;

it(`a scene about a record from another year says its year (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "scene-date-year");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const player = playerId as PersonId;
  director.watch(core, player);
  core.focusPersonIds.add(player);
  let packet = advancePlayerV1(core, {
    controlledPersonId: player,
    through: {
      date: addDays(makeIsoDate(core.date), PLAY_DAYS),
      minuteOfDay: P.zero,
    },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, { kind: "own-choice", pauseId: packet.pauseId });
  const book = director.ledger.people.get(player)!;
  const year = core.date.slice(0, 4);
  const told: string[] = [];
  let older = 0;
  for (const entry of book.schedule) {
    if (!entry.bindings.length) continue;
    const moment = book.momentsById.get(entry.momentId);
    if (!moment || moment.date.slice(0, 4) === year) continue;
    older += 1;
    const scene = composeScene(
      core,
      director,
      player,
      entry,
      undefined,
      MORNING,
    );
    if (!scene) continue;
    const bare = dateSaid(moment.date);
    for (const line of scene.narration) {
      // Its own day, said bare, would read as this year.
      expect(
        line.text.includes(bare) &&
          !line.text.includes(`${bare}, ${moment.date.slice(0, 4)}`),
        `${where}: a ${moment.date} record told on ${core.date}: "${line.text}"`,
      ).toBe(false);
      if (/\blast [A-Z][a-z]+\b|\bin [A-Z][a-z]+ \d{4}\b/.test(line.text))
        told.push(`${moment.date}: ${line.text}`);
    }
  }
  process.stderr.write(
    `date in another year, ${where}, told on ${core.date}: ${older} scenes about records from before ${year}, ${told.length} lines saying when\n` +
      told
        .slice(0, 6)
        .map((line) => `  ${line}`)
        .join("\n") +
      "\n",
  );
  expect(
    older,
    `${where}: no scene about a record from before ${year}`,
  ).toBeGreaterThan(0);
}, 1_200_000);
