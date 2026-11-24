// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { campaignDay } from "../bench/campaign";
import { announceForOffice, localRaces } from "../bench/government";
import { BenchPlayer } from "../bench/player";
import {
  buildBenchWorld,
  NoPlayerHereError,
  OPENING_WARMUP_DAYS,
} from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { FilingRow } from "../core2/modules/elections";

// The first Go of a new life ends in the porch talk (P41, owner: "I'm going to
// click go ... I can't do anything"). A new life's player is not explicitly
// controlled until the first advance binds the clock, so the day's doors
// outing must stage its porch scene for the outing's player itself, before
// that first advance, or the first Go lands on a porch with no talk.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const LABELS = [
  "circumstance:door-first",
  "circumstance:door-again",
  "circumstance:door-petition",
];

type Race = { contestId: string; mayAnnounce: boolean };

it(`the first Go of a new life, a day at the doors, stops on the porch talk (seed ${seed})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(draw === 0 ? seed : `${seed}:${draw}`, "first-go");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    let world;
    try {
      world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        warmUpDays: OPENING_WARMUP_DAYS,
      });
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passed.push(`${where}: no player can live here`);
      continue;
    }
    const { core, director } = world;
    const playerId = core.playerId!;
    const race = (localRaces(core) as unknown as { races: Race[] }).races.find(
      (row) => row.mayAnnounce,
    );
    if (!race) {
      passed.push(`${where}: no race to announce for on ${core.date}`);
      continue;
    }
    const made = announceForOffice(core, playerId, race.contestId);
    expect(made.status, `${where}: ${JSON.stringify(made)}`).toBe("announced");
    const filingId = (made as { filing: FilingRow }).filing.id;

    const player = new BenchPlayer(core, director);
    player.select(playerId);
    // The opening evening: no advance has run, so the clock is not bound.
    const book = director.ledger.people.get(playerId)!;
    const doorToday = () =>
      book.schedule.find(
        (row) =>
          row.date === core.date &&
          LABELS.includes(book.momentsById.get(row.momentId)?.label ?? ""),
      );
    // Go on Knock on doors, as /api/campaign/day runs it.
    const day = campaignDay(core, playerId, { filingId, kind: "canvass" });
    if (!(day.doorsKnocked > 0)) {
      passed.push(`${where}: the day knocked no doors`);
      continue;
    }
    director.stageDoors(core, playerId);
    expect(
      doorToday(),
      `${where}: no porch moment stored on the first Go`,
    ).toBeDefined();
    const spent = player.spend(day.hours);
    expect(spent?.packet.kind, `${where}: the first Go ended on`).toBe("stop");
    process.stdout.write(
      `door-stage-first-go (GOLDEN_PATH_SEED=${seed}): ${where}; passed over: ${passed.join(" | ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place let a new life knock doors on its first Go (seed ${seed}):\n${passed.join("\n")}`,
  );
}, 600_000);
