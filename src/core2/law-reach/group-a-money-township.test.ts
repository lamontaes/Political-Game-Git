/**
 * The government a paid-leave law runs through is picked from every level in
 * the law chain, a township included: with only a township's law in force,
 * the township's treasury runs the program. A place is drawn from all 56 on a
 * seed nobody chose (LEAVE_TOWNSHIP_SEED pins one); places whose chain has no
 * township in its records, or already has the law in force at another level,
 * are skipped, and the test throws naming each place tried when the draws run out.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import {
  BUDGETS_MODULE_ID,
  governments,
  type GovernmentRow,
} from "../modules/budgets";
import { lawChainForPlace } from "../laws-starting";
import { LAWS_MODULE_ID, lawChain, yesLevels } from "../modules/laws";
import { coreAPI } from "../state";
import type { ModuleRow } from "../module-data";
import { mechanicRow } from "./group-a-records";
import { LEAVE_KEY, paidLeave } from "./group-a-money";

/** Places drawn (records only) and places built among them. */
const DRAWS = 400;
const BUILDS = 6;
const seed = process.env.LEAVE_TOWNSHIP_SEED ?? randomBytes(8).toString("hex");

it("a township-only paid-leave law selects the township treasury", () => {
  const tried: string[] = [];
  const before = setBookkeeping(false);
  try {
    // Drawing and reading a place's records is cheap; only a place with a
    // township is built, at most BUILDS of them.
    let built = 0;
    for (let draw = 0; draw < DRAWS && built < BUILDS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "leave-township");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      // The place's records say whether a township stands over it, before any
      // world is built (a build is seconds; most places have none).
      if (
        !lawChainForPlace(place.key).levels.some((l) => l.level === "township")
      ) {
        tried.push(`${where}: no township in the law chain`);
        continue;
      }
      built += 1;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const township = lawChain(api).levels.find((l) => l.level === "township");
      if (!township) {
        tried.push(`${where}: no township in the law chain`);
        continue;
      }
      if (!api.state.modules.has(BUDGETS_MODULE_ID)) {
        tried.push(`${where}: no budgets module`);
        continue;
      }
      if (yesLevels(api, LEAVE_KEY).length) {
        tried.push(`${where}: the law is already in force at another level`);
        continue;
      }
      // The township's law (its board's own row) and its treasury.
      const lawId = `law:${township.jurisdiction}:township:${LEAVE_KEY}:test`;
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .put({
          id: lawId,
          jurisdiction: township.jurisdiction,
          level: "township",
          series: LEAVE_KEY,
          tier: "general",
          value: 1,
          effectiveDate: api.state.date,
          endDate: null,
          source: "township-only regression",
          retrieved: api.state.date,
          estimate: true,
        } as unknown as ModuleRow);
      const treasury = [...api.state.organizations.values()][0]!;
      const gov: GovernmentRow = {
        id: `government:${township.jurisdiction}`,
        level: "township" as GovernmentRow["level"],
        name: "Township",
        organizationId: treasury.id,
        fiscalYearStart: "01-01",
        residents: 1,
      };
      api
        .moduleState(BUDGETS_MODULE_ID)
        .table("governments")
        .put(gov as unknown as ModuleRow);
      expect(
        yesLevels(api, LEAVE_KEY).map((l) => l.level),
        where,
      ).toEqual(["township"]);
      paidLeave(api, {
        key: LEAVE_KEY,
        lawId,
        inForce: true,
        level: "township",
        value: 1,
        placeId: lawChain(api).townPlaceId,
      });
      const row = mechanicRow(api, LEAVE_KEY);
      expect(row?.active, `${where}: the program is active`).toBe(true);
      expect(row?.facts.governmentId, where).toBe(gov.id);
      expect(row?.facts.treasuryId, where).toBe(treasury.id);
      expect(governments(api).some((g) => g.id === gov.id)).toBe(true);
      process.stdout.write(
        `TOWNSHIP LEAVE seed ${seed} draw ${draw}: ${where}; law ${lawId} selected ${gov.id}, treasury ${treasury.id}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a township and no leave law (seed ${seed}): ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(before);
  }
}, 900_000);
