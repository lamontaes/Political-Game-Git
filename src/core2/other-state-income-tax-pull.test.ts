// @vitest-environment node
/** A state outside the town repeals its income tax, and the counted movers' pull toward it follows the law in force. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { pullBetween, runtimeOf } from "./modules/counted-moves";
import { enactLaw, lawChain, stateLawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "other-state-income-tax-pull");
const WAGES = 60_000;
/** Big states with a wage income tax in the research, so a repeal has something to remove. */
const CANDIDATES = ["CA", "NY", "NJ", "OR", "MN", "MA", "IL", "PA"];

it(
  `an outside state's income tax repeal raises the pull toward it: ${place.name}, replay ${replay}`,
  { timeout: 600_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const home = lawChain(api).stateKey;
      const other = CANDIDATES.map((u) => `US-${u}`).find((s) => s !== home)!;
      const usps = other.slice("US-".length);
      const rt = runtimeOf(api)!;
      const before = stateLawInForce(api, other, "income-tax");
      const stateRow = before.levels.find((l) => l.level === "state")?.row;
      expect(stateRow, `${other} has an income tax row in force`).toBeTruthy();
      rt.netCache.clear();
      const pullBefore = pullBetween(
        api,
        rt,
        rt.townState,
        usps,
        WAGES,
        new Map(),
      ).income;
      // The state's legislature repeals the tax: the amount becomes nothing.
      const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
      const repeal = enactLaw(api, {
        jurisdiction: other,
        level: "state",
        series: "income-tax",
        value: 0,
        unit: "percent-flat",
        effectiveDate,
        measureId: "outside-state-repeal",
        citation: "Test: the state repeals its income tax",
      });
      advanceCore(world.core, addDays(makeIsoDate(effectiveDate), 2));
      const after = stateLawInForce(api, other, "income-tax");
      expect(after.levels.find((l) => l.level === "state")?.row?.id).toBe(
        repeal.id,
      );
      rt.netCache.clear();
      const pullAfter = pullBetween(
        api,
        rt,
        rt.townState,
        usps,
        WAGES,
        new Map(),
      ).income;
      process.stdout.write(
        `OUTSIDE-TAX ${place.name} (${place.key}, seed ${place.seed}), home ${home}: ${other} income tax ${stateRow!.value} ${stateRow!.unit} repealed by ${repeal.id}; pull toward it at $${WAGES} ${pullBefore.toFixed(4)} to ${pullAfter.toFixed(4)} (log units)\n`,
      );
      expect(pullAfter).toBeGreaterThan(pullBefore);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
