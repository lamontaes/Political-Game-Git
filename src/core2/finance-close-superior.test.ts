/**
 * A firm closes only from a recorded unfunded obligation, never by a thrown error (pool item
 * finance-close-employer-no-current-receipt): the Superior, Colorado world that threw "Closure requires
 * an actual current unfunded obligation receipt." within three years is replayed for three years with
 * every module installed (`buildBenchWorld`, bookkeeping off), and so is a place drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const cases = [
  {
    label: "the item's repro",
    key: "0875640",
    name: "Superior, Colorado",
    seed: "a352f38e75486e3885a7fdd8f2dc6c1112a2e6da7628ff7c20dc4aca4c849a54",
  },
  (() => {
    const place = drawPlace(`${seed}-close`, "finance-close-employer");
    return {
      label: "drawn",
      key: place.key,
      name: place.name,
      seed: place.seed,
    };
  })(),
];

for (const row of cases)
  it(
    `three years close no firm by a thrown error: ${row.label}, ${row.name} [${row.key}], seed ${row.seed}`,
    { timeout: 3_600_000 },
    () => {
      setBookkeeping(false);
      const { core } = buildBenchWorld(row.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: row.key,
      });
      expect(() =>
        advanceCore(core, addDays(makeIsoDate(core.date), 3 * 365)),
      ).not.toThrow();
    },
  );
