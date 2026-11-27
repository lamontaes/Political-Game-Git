import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";

// A business record in a town opened at its Census size stands for many firms, so a founding of
// one is many firms opened at once: a market that drew a founder every month opened a record a
// month in every kind (2572600, seed q7a: 40 founded in a year from a stock of 32). A founding
// in a weighted market builds as a pull of one over its weight, as the jobs engine's turnover
// builds (modules/business.ts `foundingDue`), so a year opens fewer records than the town
// started with. The place is drawn from all 56 on a seed nobody chose (BUSINESS_FOUND_SEED pins
// one for a re-run); a place with too few counted jobs for the weight to matter is passed over
// and named.
const seed = process.env.BUSINESS_FOUND_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 10;
const COUNTED_JOBS = 100;

it("a drawn town with counted workers opens fewer business records in a year than it started with", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let i = 0; i < DRAWS; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "business-founding-paced");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const counted = residentsRuntime(core)!.jobs.size;
    if (counted < COUNTED_JOBS) {
      passed.push(
        `${place.name ?? place.key} (${place.key}), seed ${place.seed}: ${counted} counted jobs`,
      );
      continue;
    }
    const start = [...core.finance.businesses].filter(
      ([, book]) => !book.closedAt,
    ).length;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    let founded = 0;
    for (const id of core.finance.businesses.keys())
      if (
        id.startsWith("organization:founded:") ||
        id.startsWith("organization:location:")
      )
        founded += 1;
    expect(
      founded,
      `${place.name ?? place.key} (${place.key}), seed ${place.seed}: ${founded} records founded in a year from a stock of ${start}; passed over: ${passed.join("; ") || "none"}`,
    ).toBeLessThan(start);
    return;
  }
  throw new Error(
    `no drawn place had ${COUNTED_JOBS} counted jobs in ${DRAWS} draws (base ${seed}); passed over ${passed.join("; ")}`,
  );
}, 3_600_000);
