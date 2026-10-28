/**
 * The director's threads fade by the core's closeness (engine map line 11,
 * X2): in a drawn place, after a month of play, each thread the director
 * keeps for the player over a relationship record fades by exactly the share
 * of the closeness at the last contact that `currentCloseness` says is gone,
 * the one fade the card and every engine read.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { closenessBetween, currentCloseness } from "../core2/closeness";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("fades each thread by the core's closeness record", () => {
  const place = drawPlace(seed, "thread-fade");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  director.watch(core, me);
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  const later = addDays(makeIsoDate(core.date), 365);
  let checked = 0;
  for (const thread of director.ledger.people.get(me)!.threads.values()) {
    const key =
      me < thread.otherId
        ? `${me}:${thread.otherId}`
        : `${thread.otherId}:${me}`;
    const row = core.relationships.get(key);
    if (!row || row.level <= 0 || thread.sharedHome) continue;
    if (thread.renewedAt && thread.renewedAt > row.lastContactDate) continue;
    if ((thread.lastContact ?? row.lastContactDate) !== row.lastContactDate)
      continue;
    expect(
      director.fading(me, thread.otherId, later),
      `${where}: ${key}`,
    ).toBeCloseTo(1 - currentCloseness(core, row, later) / row.level, 12);
    expect(
      director.fading(me, thread.otherId, core.date),
      `${where}: ${key}`,
    ).toBeCloseTo(
      1 - closenessBetween(core, me, thread.otherId) / row.level,
      12,
    );
    checked += 1;
  }
  expect(checked, `${where}: no thread over a relationship`).toBeGreaterThan(0);
  console.log(`${where}: ${checked} threads fade by the core's closeness`);
}, 600_000);
