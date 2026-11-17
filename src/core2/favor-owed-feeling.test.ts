import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween, feelingBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { PROMISES_MODULE_ID } from "./modules/promises";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A debt owed is part of how one feels toward the one owed: an open promise
// the holder gave the other pulls the holder toward them (the first most, each
// next less), and not the other way round. HAND-STAGED: the promises are
// written the way a scene reply writes them (the record the promises engine
// files); the pull itself is the engine's own read through feelingBetween.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "favor-owed");

it(`open promises the holder gave pull their feeling toward the one owed, by diminishing steps, in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  expect(
    core.modules.has(PROMISES_MODULE_ID),
    `${where}: promises installed`,
  ).toBe(true);
  const api = coreAPI(core);
  const people = [...core.people.values()]
    .filter((p) => p.alive && p.tier !== "husk" && p.id.startsWith("person_"))
    .sort((x, y) => x.id.localeCompare(y.id))
    .map((p) => p.id as PersonId);
  // Two people whose closeness leaves room under the scale's top.
  const a = people[0];
  const b = people.find(
    (id) => id !== a && closenessBetween(core, a!, id) < 0.5,
  );
  expect(a && b, `${where}: two people with room`).toBeTruthy();
  const promise = (n: number) =>
    api.emit({
      id: `scene-reply:favor-owed:${n}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [a!, b!],
      placeId: core.people.get(a!)!.placeId,
      publicRecord: false,
      facts: { promise: n === 1 ? "show-around" : "see-a-doctor" },
      source: { tag: "SOURCED", citation: "Staged promise.", asOf: core.date },
    });
  const none = feelingBetween(core, a!, b!);
  expect(none, `${where}: no promise, no pull`).toBe(
    closenessBetween(core, a!, b!),
  );
  promise(1);
  const one = feelingBetween(core, a!, b!);
  promise(2);
  const two = feelingBetween(core, a!, b!);
  expect(one, `${where}: one open promise pulls`).toBeGreaterThan(none);
  expect(two, `${where}: a second pulls more`).toBeGreaterThan(one);
  expect(two - one, `${where}: by less than the first`).toBeLessThan(
    one - none,
  );
  // The one owed feels no pull from it.
  expect(feelingBetween(core, b!, a!), where).toBe(
    closenessBetween(core, b!, a!),
  );
}, 200_000);
