import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { bookkeeping, setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { moduleData } from "./module-data";
import { moduleTableSizes } from "./module-state";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "module-data-copy");

const frozenDeep = (value: unknown): boolean =>
  value === null ||
  typeof value !== "object" ||
  (Object.isFrozen(value) &&
    Object.values(value as object).every((inner) => frozenDeep(inner)));

describe(`a written module row, ${place.name} (seed ${seed})`, () => {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const sample = Object.entries(moduleTableSizes(world.core))
    .filter(([, size]) => size > 0)
    .flatMap(([key]) => {
      const [id, name] = key.split("/") as [string, string];
      return (api.moduleState(id).table(name).rows() as unknown as object[])
        .slice(0, 3)
        .map((row) => row);
    });
  it.each([true, false])(
    "is frozen all the way down and equal in value to its input (bookkeeping %s)",
    (checks) => {
      const was = bookkeeping();
      setBookkeeping(checks);
      try {
        expect(sample.length).toBeGreaterThan(0);
        for (const row of sample) {
          const copy = moduleData(JSON.parse(JSON.stringify(row)));
          expect(frozenDeep(copy)).toBe(true);
          expect(JSON.stringify(copy)).toBe(JSON.stringify(row));
        }
      } finally {
        setBookkeeping(was);
      }
    },
    600_000,
  );
  it("refuses a field that would set the prototype", () => {
    const was = bookkeeping();
    setBookkeeping(false);
    try {
      expect(() =>
        moduleData(JSON.parse('{"id":"x","__proto__":{"a":1}}')),
      ).toThrow(/prototype/);
    } finally {
      setBookkeeping(was);
    }
  });
});
