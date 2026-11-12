import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { createDirector } from "./ledger";

/**
 * The director's memory goes into a save and comes back whole
 * (agreements/3-5.md, Lane 5's path 6, quit and come back). In a played month
 * of a drawn place, a save restored into a fresh director saves the same; and
 * a director restored to an earlier save forgets what came after it.
 * Whether the world then runs as the original is Lane 5's check
 * (snapshot-played.test.ts).
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a director's save restores whole (seed ${seed})`, () => {
  const place = drawPlace(seed, "director-save");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    {
      twoLevel: true,
      placeKey: place.key,
    },
  );
  director.watch(core, playerId!);
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  const saved = director.save();
  // The watched person with the most remembered.
  const [watchedId, book] = [...saved.ledger.people.entries()].sort(
    (a, b) => b[1].moments.length - a[1].moments.length,
  )[0] ?? [undefined, undefined];
  expect(
    book?.moments.length,
    `${where}: the player's book is empty`,
  ).toBeGreaterThan(0);

  // Into a fresh director: the same memory.
  const fresh = createDirector({ watch: [] });
  fresh.restore(saved);
  expect(fresh.save(), where).toEqual(saved);
  expect(fresh.ledger.people.get(watchedId!)?.moments.length, where).toBe(
    book!.moments.length,
  );

  // The original, played on, then restored: what came after is forgotten.
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  const later = director.save();
  expect(
    later.ledger.people.get(watchedId!)!.moments.length,
    where,
  ).toBeGreaterThanOrEqual(book!.moments.length);
  director.restore(saved);
  expect(director.save(), where).toEqual(saved);
  process.stdout.write(
    `DIRECTOR SAVE ${where}: ${saved.ledger.people.size} books, the player's ${book!.moments.length} moments, ${later.ledger.people.get(watchedId!)!.moments.length} after 30 more days\n`,
  );
}, 900_000);
