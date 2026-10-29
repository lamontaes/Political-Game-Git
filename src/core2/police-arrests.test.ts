/**
 * Arrests follow the crimes the crime engine recorded (engine map E13b: the
 * victims were counted twice, once by the crime engine and again by public
 * safety from the same rates). Each month the counted cases filed for an
 * offense with a victim name the crime engine's month record they followed,
 * and their defendants add up to that record's crimes reported to police,
 * times the offense's clearance rate and the police service the town's lines
 * fund. The police line is doubled the day after the opening, so the service
 * is not one. A place drawn from all 56; a place with no police line, or no
 * reported crime in the months run, is passed over and named.
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
import { crimeMonths } from "./modules/crime";
import { countedCases } from "./modules/justice";
import { lawChain } from "./modules/laws";
import {
  PUBLIC_SAFETY_MODULE_ID,
  safetyParameter,
  type SafetyMonth,
} from "./public-safety";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Public safety's offense, the crime engine's kind it follows, and its clearance row. */
const FOLLOWS = [
  // Assault is left out: self-defense claims end some adult cases at charging.
  { offense: "robbery", crime: "robbery", cleared: "clearedRobbery" },
  { offense: "burglary", crime: "burglary", cleared: "clearedBurglary" },
  { offense: "property", crime: "other-property", cleared: "clearedProperty" },
] as const;

it(`a month's arrests are the crime engine's reported crimes, cleared, at the police the lines fund (seed ${seed})`, () => {
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
      const cases = [
        ...countedCases(api, "charged"),
        ...countedCases(api, "decided"),
      ];
      const elasticity = safetyParameter("policeServiceElasticity");
      const checked: string[] = [];
      for (const crimes of crimeMonths(api, town)) {
        const safety = api
          .moduleState(PUBLIC_SAFETY_MODULE_ID)
          .table("months")
          .get(`safety:${crimes.month}`) as unknown as SafetyMonth | undefined;
        if (!safety) continue;
        for (const { offense, crime, cleared } of FOLLOWS) {
          const reported = crimes.types[crime].reported;
          if (!reported) continue;
          const filed = cases.filter(
            (c) => c.offense === offense && c.crimeRecordId === crimes.id,
          );
          const defendants = filed.reduce((n, c) => n + c.count, 0);
          const expected =
            reported *
            safetyParameter(cleared) *
            Math.pow(safety.policeService, elasticity);
          expect(
            defendants,
            `${where}: ${offense} in ${crimes.id}, ${reported} reported`,
          ).toBeCloseTo(expected, 6);
          checked.push(
            `${crimes.id} ${offense}: ${reported} reported, ${defendants.toFixed(3)} charged in ${filed.length} cases (${filed[0]!.id})`,
          );
        }
        // No case follows a crime record other than this place's.
      }
      if (!checked.length) {
        tried.push(`${where}: no reported crime with a victim in 120 days`);
        continue;
      }
      expect(
        cases.every(
          (c) => !c.crimeRecordId || c.crimeRecordId.startsWith(`${town}:`),
        ),
        where,
      ).toBe(true);
      const service = (
        api
          .moduleState(PUBLIC_SAFETY_MODULE_ID)
          .table("months")
          .rows() as unknown as SafetyMonth[]
      ).map((m) => m.policeService);
      // A place whose lines fund police only at the baseline never exercises
      // the service factor, so its equal-to-baseline counts prove nothing
      // about it: pass it over and draw the next place.
      if (!(Math.max(...service) > 1)) {
        tried.push(`${where}: police service never above the baseline`);
        continue;
      }
      console.log(
        `POLICE-ARRESTS ${where}: ${checked.length} offense-months; ${checked[0]}; passed over: ${tried.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(`no drawn place had reported crime: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
