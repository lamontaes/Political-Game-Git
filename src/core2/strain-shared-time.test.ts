/**
 * A strain reaches the whole tie (pool item core-strain-lost-on-shared-time-ties).
 * At a named place and seed, two state senators who share nothing but the
 * chamber have no relationship row; their closeness is the sittings they
 * shared (sitting-closeness.ts). A strain written through the one relationship
 * writer (a broken word found out) takes off what the read prices, a strain
 * larger than the whole tie stops at zero, and a pair that shares no time
 * another engine reads keeps the old floor at zero hours.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  closenessBetween,
  closenessBetweenAfter,
  sharedHoursBetween,
  temperedHours,
} from "./closeness";
import { gameStartDate } from "./game-start";
import { bodyOf, memberKey, members } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const PLACE = { key: "4846968", seed: "8647-mason" };

it("a strain on a tie built from shared sittings takes closeness off, never below zero", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const chamber = townSeats(api).find(
    (row) =>
      row.office.level === "state" &&
      bodyOf(api, row.office.id) &&
      members(api, row.office.id).length >= 3,
  )!.office.id;
  const ids = members(api, chamber)
    .map(memberKey)
    .filter((id) => core.people.get(id as PersonId)?.alive)
    .sort() as PersonId[];
  const pairs = ids.flatMap((a, i) =>
    ids.slice(i + 1).map((b) => [a, b] as const),
  );
  const tied = pairs.filter(
    ([a, b]) =>
      !core.relationships.has(`${a}:${b}`) &&
      sharedHoursBetween(core, a, b) > 0,
  );
  expect(
    tied.length,
    `${chamber}: pairs tied only by sittings`,
  ).toBeGreaterThan(1);
  const strain = (a: PersonId, b: PersonId, hours: number) =>
    api.relationship(a, b, "contact", -hours, undefined, {
      cause: "found-out",
    });
  // A broken word worth half the hours they shared.
  const [a, b] = tied[0]!;
  const shared = sharedHoursBetween(core, a, b);
  const before = closenessBetween(core, a, b);
  const hours = shared / 2;
  const priced = closenessBetweenAfter(
    core,
    a,
    b,
    temperedHours(core, core.people.get(a), core.people.get(b), -hours),
  );
  strain(a, b, hours);
  const after = closenessBetween(core, a, b);
  process.stdout.write(
    `STRAIN ${PLACE.key} seed ${PLACE.seed} ${chamber} ${a} and ${b}: shared ${shared.toFixed(3)} hours, closeness ${before.toFixed(5)} -> ${after.toFixed(5)} (priced ${priced.toFixed(5)}), owed ${core.relationships.get(`${a}:${b}`)?.owedHours?.toFixed(3)}\n`,
  );
  expect(after).toBeLessThan(before);
  expect(after).toBeCloseTo(priced, 10);
  // A strain far beyond the whole tie: closeness stops at zero, and what the
  // row keeps owed is no more than the hours they shared.
  const [c, d] = tied[1]!;
  strain(c, d, 1000);
  expect(closenessBetween(core, c, d)).toBe(0);
  expect(
    core.relationships.get(`${c}:${d}`)?.owedHours ?? 0,
  ).toBeLessThanOrEqual(sharedHoursBetween(core, c, d));
  // A senator and someone they share no sitting or row with: the strain
  // stops at zero hours and nothing is kept owed, as before.
  const apart = ids
    .flatMap((x) =>
      [...core.people.keys()].slice(0, 400).map((y) => [x, y] as const),
    )
    .find(
      ([x, y]) =>
        x !== y &&
        !core.relationships.has(x < y ? `${x}:${y}` : `${y}:${x}`) &&
        sharedHoursBetween(core, x, y) === 0,
    )!;
  strain(apart[0], apart[1], 5);
  const row = core.relationships.get(
    apart[0] < apart[1] ? `${apart[0]}:${apart[1]}` : `${apart[1]}:${apart[0]}`,
  );
  expect(row?.level).toBe(0);
  expect(row?.owedHours).toBeUndefined();
}, 60_000);
