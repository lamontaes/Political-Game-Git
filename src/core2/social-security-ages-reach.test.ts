// @vitest-environment node
/** The three laws that set Social Security's claim ages reach the named people whose claim date the retirement engine decides from them. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const SERIES = [
  "social-security-earliest-claim-age",
  "social-security-full-retirement-age",
  "social-security-delayed-credit-age",
] as const;
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "social-security-ages-reach");

it(
  `the claim-age laws name the people whose claim they set: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 40));
      const counts = SERIES.map((series) => appliedOn(api, series).length);
      process.stdout.write(
        `SS-AGES ${place.name} (${place.key}, seed ${place.seed}): people named by the earliest, full and delayed age laws: ${counts.join(", ")}\n`,
      );
      if (counts.every((n) => n === 0)) {
        process.stdout.write(
          `SS-AGES ${place.name}: no named person was deciding a claim in the run; nothing to name\n`,
        );
        return;
      }
      // One engine read decides all three ages for a person: each law names the same people.
      expect(new Set(counts).size).toBe(1);
      for (const series of SERIES)
        expect(appliedOn(api, series).every((r) => r.target === "person")).toBe(
          true,
        );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
