/**
 * Patrol hours follow the police line and its staff. In a played world (the
 * bench world, every module installed) of a place drawn from all 56, the
 * town's patrol-hours row for its first full month holds the paid hours of
 * the staff whose posts resolve to the police line. The police lines that pay
 * them are then cut to half of what that staff is paid, and each of the next
 * two months' rows holds the staff's hours times the share of their pay the
 * line in force still pays, below the first row's hours. The world's own
 * bodies may amend the line again (a council restoring it): a month after
 * such a measure is not the cut's, so the draw is passed over and named, and
 * the next place drawn.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import {
  budgetInForce,
  lineWageShare,
  treasuryParameter,
} from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { patrolMonth } from "./modules/police-patrol";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const CUT = "TEST-POLICE-CUT";
const DRAWS = 12;

/** The month after a month, as YYYY-MM. */
function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

it(`a cut to the police line lowers the town's patrol hours by the share of the staff's pay it still pays (seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const tried: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "police-patrol");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      // The row is written on the 5th; the 6th is past it.
      const first = nextMonth(core.date.slice(0, "YYYY-MM".length));
      advanceCore(core, makeIsoDate(`${first}-06`));
      const before = patrolMonth(api, town, first);
      const firstId = `patrol:${town}:${first}`;
      expect(before, `${where}: no row ${firstId}`).toBeDefined();
      expect(before!.id, where).toBe(firstId);
      expect(
        before!.staff,
        `${where}: ${firstId} has no police staff`,
      ).toBeGreaterThan(0);
      expect(before!.staffHours, `${where}: ${firstId}`).toBeGreaterThan(0);
      expect(
        before!.lineWagesMinor,
        `${where}: ${firstId} has no line in force`,
      ).not.toBeNull();
      expect(before!.hours, `${where}: ${firstId}`).toBeCloseTo(
        before!.staffHours *
          Math.min(1, before!.lineWagesMinor! / before!.staffPayMinor),
        2,
      );

      // Cut every police line that pays the town's police to half the staff's pay.
      const months = treasuryParameter("monthsPerYear");
      const share = lineWageShare(api, "police");
      const govs = before!.governmentIds;
      const target = (before!.staffPayMinor * months) / 2 / share / govs.length;
      for (const governmentId of govs)
        amendBudget(api, {
          governmentId,
          line: "police",
          deltaMinor: Math.round(
            target -
              (budgetInForce(api, governmentId)?.spendingMinor.police ?? 0),
          ),
          measureId: CUT,
          carry: true,
        });

      const seen: string[] = [];
      let month = first;
      let passedOver = "";
      // Months the cut line paid less than the staff's pay; in the others the
      // staff shrank to what the cut line pays (officers let go or leaving).
      let limited = 0;
      for (let step = 0; step < 2; step += 1) {
        month = nextMonth(month);
        advanceCore(core, makeIsoDate(`${month}-06`));
        const others = govs.flatMap((g) => {
          const by = budgetInForce(api, g)?.adoptedBy.amendedBy ?? [];
          return by.slice(by.indexOf(CUT) + 1);
        });
        if (others.length) {
          passedOver = `${where}: police line amended again by ${others.join(",")} before ${month}`;
          break;
        }
        const row = patrolMonth(api, town, month);
        const id = `patrol:${town}:${month}`;
        expect(row, `${where}: no row ${id}`).toBeDefined();
        const lineWages = govs.reduce(
          (n, g) =>
            n +
            ((budgetInForce(api, g)?.spendingMinor.police ?? 0) * share) /
              months,
          0,
        );
        expect(row!.lineWagesMinor, `${where}: ${id} line wages`).toBe(
          Math.round(lineWages),
        );
        const paid = Math.min(1, row!.lineWagesMinor! / row!.staffPayMinor);
        if (paid < 1) limited += 1;
        // The row's line wages are rounded to the minor unit.
        expect(row!.hours, `${where}: ${id}`).toBeCloseTo(
          row!.staffHours * paid,
          2,
        );
        expect(
          row!.hours,
          `${where}: ${id} hours against ${firstId}`,
        ).toBeLessThan(before!.hours);
        seen.push(
          `${id} ${row!.staff} staff, ${row!.hours.toFixed(1)} of ${row!.staffHours.toFixed(1)} hours (line wages ${row!.lineWagesMinor}, staff pay ${row!.staffPayMinor})`,
        );
      }
      if (passedOver && !seen.length) {
        tried.push(passedOver);
        continue;
      }
      process.stdout.write(
        `POLICE-PATROL ${where}: ${firstId} ${before!.staff} staff, ${before!.hours.toFixed(1)} hours (line wages ${before!.lineWagesMinor}, staff pay ${before!.staffPayMinor}); cut ${govs.join(",")}; ${seen.join("; ")}${passedOver ? `; then ${passedOver}` : ""}; ${limited} months limited by the line; passed over: ${tried.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place kept the cut for a month: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 2_400_000);
