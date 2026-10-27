/**
 * A budget line that pays for people (police, fire, corrections,
 * administration, schools) reaches them in a played world: a raise funds the
 * employer for more positions, it posts openings, and the jobs engine fills
 * them from named and counted seekers alike, each hire recorded as the line's
 * reach; a cut withdraws what is unfilled and lays off the line's own hires
 * first, each recorded, and back at its base no hire stays recorded as the
 * raise's. A place is drawn from all 56 on a seed nobody chose
 * (STAFFING_LINE_SEED pins one); a place whose employer has no staff to copy
 * a job from is redrawn.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { budgetToday } from "./law-reach/group-a-money";
import {
  currentStaff,
  reachParameter,
  STAFFING,
  townOrganizations,
} from "./law-reach/group-a-records";
import { staffingOf } from "./law-reach/group-a-staffing";
import { advanceCore } from "./life";
import { amendBudget, governments } from "./modules/budgets";
import { fundedOpenings } from "./modules/jobs";
import { countedJobsOf } from "./residents-economy";
import { coreAPI } from "./state";

const seed = process.env.STAFFING_LINE_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

for (const key of Object.keys(STAFFING))
  it(`${key}: a raise hires through the jobs engine, a cut lays off the line's hires first`, () => {
    const line = key.slice("budget-line:".length);
    const tried: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const place = drawPlace(`${seed}:${key}:${draw}`, "staffing-line");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const gov = STAFFING[key]!.levels.map((level) =>
        governments(api).find(
          (g) =>
            g.level === level &&
            (budgetToday(api, g)?.spendingMinor[line] ?? 0) > 0,
        ),
      ).find((g) => g);
      const employers = townOrganizations(api, STAFFING[key]!.employers);
      // Named staff and counted workers alike hold the funded positions.
      const staff = () =>
        employers.reduce(
          (n, o) =>
            n +
            currentStaff(api, o.id).length +
            countedJobsOf(core, o.id).length,
          0,
        );
      const held = staff();
      if (!gov) {
        tried.push(`${where}: no government carries ${line}`);
        continue;
      }
      const amount = budgetToday(api, gov)!.spendingMinor[line]!;
      if (!employers.length || held < 1) {
        // No such employer with staff in town (a volunteer fire company, a
        // county jail elsewhere): the positions the raise funds stand on the
        // government's own record, and nobody is hired here.
        if (employers.length) {
          tried.push(
            `${where}: ${line} employer has no staff to copy a job from`,
          );
          continue;
        }
        // A raise of at least one position's cost, so a small town's line
        // funds a whole position.
        amendBudget(api, {
          governmentId: gov.id,
          line,
          deltaMinor: Math.max(
            amount,
            reachParameter("publicPositionAnnualMinor"),
          ),
          measureId: `test:${line}:up`,
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 2));
        const row = staffingOf(api, key, gov.organizationId);
        expect(
          row?.positions,
          `${where}: ${line} on the record`,
        ).toBeGreaterThan(0);
        expect(
          appliedOn(api, key).some(
            (r) =>
              r.targetId === gov.organizationId && r.what === "staff-funded",
          ),
          `${where}: ${line} applied to the government`,
        ).toBe(true);
        return;
      }
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: amount,
        measureId: `test:${line}:up`,
      });
      // The employer posts its openings the next morning; the jobs engine's
      // weekly matching fills them from whoever is looking. A town where
      // nobody takes one in twelve weeks has no seeker for it: redraw.
      advanceCore(core, addDays(makeIsoDate(core.date), 1 + 7));
      for (let week = 1; week < 12 && staff() <= held; week += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 7));
      if (staff() <= held) {
        tried.push(`${where}: no seeker took a ${line} opening in 12 weeks`);
        continue;
      }
      const funded = employers.reduce(
        (n, o) => n + Math.round(staffingOf(api, key, o.id)!.positions),
        0,
      );
      const up = staff();
      const posted = employers.reduce(
        (n, o) => n + fundedOpenings(api, o.id, key).length,
        0,
      );
      const hired = appliedOn(api, key).filter(
        (r) => r.what === "hired-on-budget-line",
      );
      const detail = `${where}: ${line} ${amount} doubled; ${held} staff, ${funded} funded, ${up} now, ${posted} still posted, hires ${hired.map((r) => `${r.id} (${r.target})`).join(", ")}`;
      expect(funded, detail).toBeGreaterThan(held);
      // Every position the raise funds is held by a new hire or still posted.
      expect(up - held + posted, detail).toBe(funded - held);
      expect(up, detail).toBeGreaterThan(held);
      // Each hire is recorded as the line's reach, named or counted, and is
      // one of the employer's workers now.
      expect(hired.length, detail).toBe(up - held);
      for (const row of hired)
        expect(
          employers.some((o) =>
            row.target === "group"
              ? countedJobsOf(core, o.id).some(
                  (j) => j.personId === row.targetId,
                )
              : currentStaff(api, o.id).some(
                  (s) => s.personId === row.targetId,
                ),
          ),
          `${detail}: ${row.id}`,
        ).toBe(true);
      // Back to the base: the unfilled openings are withdrawn and the
      // line's own hires are let go, each recorded.
      amendBudget(api, {
        governmentId: gov.id,
        line,
        deltaMinor: -amount,
        measureId: `test:${line}:base`,
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const down = staff();
      const laidOff = appliedOn(api, key).filter(
        (r) => r.what === "laid-off-budget-cut",
      );
      expect(
        employers.reduce(
          (n, o) => n + fundedOpenings(api, o.id, key).length,
          0,
        ),
        detail,
      ).toBe(0);
      expect(down, detail).toBeLessThan(up);
      expect(laidOff.length, detail).toBe(up - down);
      expect(
        laidOff.filter((l) => hired.some((h) => h.targetId === l.targetId))
          .length,
        `${detail}: laid off ${laidOff.map((r) => r.targetId).join(", ")}`,
      ).toBe(Math.min(hired.length, laidOff.length));
      // Back at its base the line pays for no raise: no hire stays recorded
      // as the raise's (one the base had room for holds a base position).
      expect(
        appliedOn(api, key)
          .filter((r) => r.what === "hired-on-budget-line")
          .map((r) => r.id),
        detail,
      ).toEqual([]);
      return;
    }
    throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
  }, 3_600_000);
