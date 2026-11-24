// @vitest-environment node
/** Law levels: a county board weighs a bill against the county's own law in force, not the town's. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enactLaw, lawChain } from "./modules/laws";
import { provisionStance, type Provision } from "./modules/legislature";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "county-body-law", (key) =>
  lawChainForPlace(key).levels.some((l) => l.level === "county"),
);

it(`a bill's direction is read against the body's own jurisdiction: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const county = lawChain(api).levels.find((l) => l.level === "county")!;
    // The county sets a high income tax rate; the town sets none.
    enactLaw(api, {
      jurisdiction: county.jurisdiction,
      level: "county",
      series: "income-tax",
      value: 90,
      effectiveDate: addDays(makeIsoDate(api.state.date), 1),
      measureId: "TEST-COUNTY-RATE",
      citation: "Test measure",
    });
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), 2));
    const lower = {
      kind: "law-amount",
      series: "income-tax",
      value: 50,
    } as Provision;
    const byCounty = provisionStance(api, lower, "city", county.jurisdiction);
    expect(byCounty, "a cut below the county's own rate").not.toBeNull();
    const byTown = provisionStance(api, lower);
    // Read against the county's 90 it is a cut; read against the town's own
    // law in force it is not the same reading.
    expect(byCounty).not.toEqual(byTown);
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
