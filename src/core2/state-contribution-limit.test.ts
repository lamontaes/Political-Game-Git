// @vitest-environment node
/** A state's limit on a gift to a candidate is state law in force the legislature can change, and the campaigns engine reads it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import finance from "../../data/research/campaigns/campaign-finance-2026.json";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { contributionLimit } from "./modules/campaigns";
import { lawChainForPlace } from "./laws-starting";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
type Limits = Record<string, Record<string, { usd?: unknown } | undefined>>;
const limits = (finance as unknown as { limits: Limits }).limits;
const numeric = (state: string, office: string) =>
  typeof limits[state]?.[office]?.usd === "number";
const place = drawPlace(replay, "state-contribution-limit", (key) => {
  try {
    return numeric(lawChainForPlace(key).stateKey, "stateHouse");
  } catch {
    return false;
  }
});

it(
  `a state lowering its legislature's contribution limit moves what campaigns may take: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const state = lawChain(api).stateKey;
      const contests = api
        .moduleState("core2-elections-v1" as never)
        .table("contests")
        .rows() as unknown as {
        id: string;
        family: string;
        officeId: string;
        jurisdiction?: string;
      }[];
      const legislative = contests.find(
        (c) =>
          c.family === "stateLegislative" &&
          c.officeId.endsWith("legislature-lower"),
      );
      if (!legislative || !numeric(state, "stateHouse")) {
        process.stdout.write(
          `STATE-LIMIT ${place.name} (${place.key}, seed ${place.seed}): ${state} has no numeric state house limit in the research or no house contest; nothing to change\n`,
        );
        return;
      }
      const researched = (limits[state]!.stateHouse!.usd as number) * 100;
      const before = contributionLimit(api, legislative.id);
      // The law in force is the research's number, now as a law row.
      expect(before.minor).toBe(researched);
      enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series: "state-contribution-limit-state-house",
        value: 500,
        unit: "USD/election",
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: "state-contribution-limit-lower",
        citation: "Test: the state lowers its house limit",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      const after = contributionLimit(api, legislative.id);
      expect(after.minor).toBe(50_000);
      process.stdout.write(
        `STATE-LIMIT ${place.name} (${place.key}, seed ${place.seed}): ${state} house contest ${legislative.id}: limit ${before.minor! / 100} to ${after.minor! / 100} dollars an election after the state's act\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
