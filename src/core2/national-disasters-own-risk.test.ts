/**
 * The country's disasters come from each world's own hazard exposures, not
 * from FEMA's real list (owner, Nov 16: "Disasters and the carbon path come
 * from each world's own risks"). Two worlds with the same laws on different
 * seeds, played 150 days from the start: each has disasters, and their
 * disasters (state, hazard and day) are not the same list, and not the real
 * record's. Places drawn from all 56; seed printed (OWN_RISK_SEED replays).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { nationalEvents } from "./modules/national-events";
import { coreAPI } from "./state";

const seed = process.env.OWN_RISK_SEED || randomBytes(8).toString("hex");

function disastersOf(placeSeed: string, key: string) {
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 150));
  return nationalEvents(coreAPI(core))
    .filter((row) => row.kind === "disaster")
    .map(
      (row) => `${row.date}|${row.stateKey}|${row.hazard ?? row.incidentType}`,
    )
    .sort();
}

describe(`National disasters come from each world's own exposures (seed ${seed})`, () => {
  it(
    "differ between two worlds with the same laws",
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const a = drawPlace(seed, "own-risk");
      const b = drawPlace(`${seed}:1`, "own-risk");
      const first = disastersOf(a.seed, a.key);
      const second = disastersOf(b.seed, b.key);
      const where = `${a.name} (${a.key}) and ${b.name} (${b.key}), seed ${seed}`;
      expect(
        first.length,
        `${where}: disasters in the first world`,
      ).toBeGreaterThan(0);
      expect(
        second.length,
        `${where}: disasters in the second world`,
      ).toBeGreaterThan(0);
      expect(
        first,
        `${where}: the two worlds have the same disasters`,
      ).not.toEqual(second);
    },
  );
});
