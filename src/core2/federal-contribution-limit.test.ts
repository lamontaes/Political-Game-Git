// @vitest-environment node
/** The federal limit on a gift to a candidate is law in force Congress can change, and the campaigns engine reads it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { contributionLimit } from "./modules/campaigns";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

const SERIES = "federal-campaign-contribution-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-contribution-limit");

it(
  `Congress lowering the federal contribution limit changes what the campaigns engine allows: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const contests = api
        .moduleState("core2-elections-v1" as never)
        .table("contests")
        .rows() as unknown as {
        id: string;
        family: string;
        officeId: string;
      }[];
      const federalContest = contests.find(
        (c) => c.family === "usHouse" || c.officeId.endsWith(":us-senate"),
      );
      expect(federalContest, "a federal contest in the opening").toBeDefined();
      const start = lawInForce(api, SERIES);
      expect(start.value).toBe(3500);
      expect(
        start.levels.find((l) => l.level === "federal")?.row?.terms,
      ).toBeDefined();
      const before = contributionLimit(api, federalContest!.id);
      expect(before.minor).toBe(350_000);
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      // Congress lowers it to a thousand dollars an election.
      enactLaw(api, {
        jurisdiction: federal.jurisdiction,
        level: "federal",
        series: SERIES,
        value: 1000,
        unit: "USD/election",
        effectiveDate: addDays(makeIsoDate(api.state.date), 1),
        measureId: "federal-contribution-limit-lower",
        citation: "Test: Congress lowers the limit",
      });
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      const after = contributionLimit(api, federalContest!.id);
      expect(after.minor).toBe(100_000);
      expect(
        billCatalog(api, "federal", "US")
          .flatMap((s) => s.topics.flatMap((t) => t.policies))
          .some((p) => "series" in p && p.series === SERIES),
        "on the federal bill paper",
      ).toBe(true);
      process.stdout.write(
        `CONTRIBUTION-LIMIT ${place.name} (${place.key}, seed ${place.seed}): federal contest ${federalContest!.id}: limit ${before.minor! / 100} to ${after.minor! / 100} dollars an election after Congress's act\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
