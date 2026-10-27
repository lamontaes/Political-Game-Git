/**
 * A police line doubled lowers the violent crime the case flow arrests for,
 * through the same `crime.violent` link the crime engine applies to assaults
 * and robberies, while the clearance rises: arrests follow the crime the
 * crime engine records (pool item justice-police-raise-arrests-fall). A place
 * drawn from all 56, the line doubled the day after the opening and held.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { placeOutcome } from "./modules/outcome-web";
import { offenseRate } from "./public-safety";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`arrests for assault and robbery follow the violent-crime link when police are doubled (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const tried: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "police-arrests");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      let doubled = 0;
      for (const gov of governments(api)) {
        if (gov.level === "federal") continue;
        const line = budgetsOf(api, gov.id).find((b) => b.startsOn <= core.date)
          ?.spendingMinor.police;
        if (!line) continue;
        amendBudget(api, {
          governmentId: gov.id,
          line: "police",
          deltaMinor: line,
          measureId: "TEST-POLICE-DOUBLE",
          carry: true,
        });
        doubled += 1;
      }
      if (!doubled) {
        tried.push(`${where}: no police line to double`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), 120));
      const town = lawChain(api).townPlaceId;
      const stateKey = lawChain(api).stateKey;
      const violent = placeOutcome(api, town, "crime.violent");
      for (const measure of ["crime.assault", "crime.robbery"]) {
        const web = placeOutcome(api, town, measure)?.value;
        if (!web) continue;
        const read = offenseRate(api, town, stateKey, measure);
        // The case flow's rate carries the violent link; the web's own
        // assault value does not, so the read is lower once police rise.
        expect(
          read,
          `${where}: ${measure} read ${read} against the web's ${web}`,
        ).toBeLessThan(web);
      }
      expect(violent, `${where}: crime.violent`).toBeDefined();
      return;
    }
    throw new Error(`no drawn place had a police line: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
