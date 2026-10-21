/**
 * A cut to a city's administration line ends a named city employee's job (pool
 * item office-budget-line-reaches-pay): the mayor's amended line is the adopted
 * line, the staffing reach reads it, and city hall ends its newest hires' jobs,
 * so their later paychecks stop. A place is drawn from all 56 on a seed nobody
 * chose (ADMIN_LINE_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { staffingOf } from "./law-reach/group-a-staffing";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { countedStaffOf } from "./modules/residents";
import { memberKey } from "./modules/legislature";
import { prepareAct, officeHost } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.ADMIN_LINE_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

for (const direction of ["cut", "raise"] as const)
  it(`a ${direction} to the city's administration line moves named city employees' jobs (a cut ends them, a raise hires)`, () => {
    const tried: string[] = [];
    for (let draw = 0; draw < 25; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "admin-line");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const mayor = townSeats(api).find(
        (s) => s.office.kind === "mayor" && s.holder?.personId,
      );
      const city = governments(api).find((g) => g.level === "city");
      const district = [...core.organizations.values()].find((o) =>
        (o.classification ?? "").startsWith("service:municipal-government"),
      );
      const employees = (organizationId: string) =>
        [...core.jobs.values()].filter(
          (j) => j.organizationId === organizationId && !j.endsAt,
        );
      // City hall employees: named jobs and counted workers on its payroll.
      const staffIn = (organizationId: string) =>
        employees(organizationId).length + countedStaffOf(core, organizationId);
      if (!mayor || !city || !district || employees(district.id).length < 4) {
        tried.push(`${where}: no mayor, city or city hall with employees`);
        continue;
      }
      const mayorId = memberKey(mayor.holder!);
      const lead = api.parameter("budgetProposalLeadDays");
      const year = Number(core.date.slice(0, 4));
      const next =
        `${year}-${city.fiscalYearStart}` > core.date
          ? `${year}-${city.fiscalYearStart}`
          : `${year + 1}-${city.fiscalYearStart}`;
      const open = addDays(makeIsoDate(next), -(lead - 1));
      if (core.date < open) advanceCore(core, open);
      if (core.date > open) continue;
      const priorLine = budgetsOf(api, city.id).at(-1)!.spendingMinor
        .administration;
      if (!priorLine) {
        tried.push(`${where}: the city budget has no administration line`);
        continue;
      }
      expect(budgetProposalDue(api, officeHost, mayorId), where).not.toBeNull();
      const staffBefore = employees(district.id).map((j) => j.personId);
      const staffInPlace = staffIn(district.id);
      // The mayor asks to cut or raise the administration line by a third.
      const change = (direction === "cut" ? -1 : 1) * Math.floor(priorLine / 3);
      prepareAct(api, mayorId, "propose-budget", {
        budget: { changes: { administration: change } },
      });
      officeActHandlers(officeHost)["propose-budget"]!(
        api,
        mayorId,
        {} as never,
      );
      advanceCore(core, addDays(makeIsoDate(next), 10));
      const adopted = budgetsOf(api, city.id).find(
        (b) => b.startsOn === next || b.adoptedOn === next,
      );
      expect(adopted?.spendingMinor.administration, where).toBe(
        priorLine + change,
      );
      const laidOff = staffBefore.filter(
        (personId) =>
          ![...core.jobs.values()].some(
            (j) =>
              j.personId === personId &&
              j.organizationId === district.id &&
              !j.endsAt,
          ),
      );
      // The bill reaches city hall: it is funded for its staff times the
      // line after the bill against the line before it.
      const row = staffingOf(api, "budget-line:administration", district.id);
      const detail = `${where}: administration line ${priorLine} ${direction} by ${Math.abs(change)}, adopted ${adopted?.id}; ${staffBefore.length} employees before`;
      expect(row, detail).not.toBeNull();
      // The base is every employee in place, named or counted, and the line
      // after the bill against the line before it funds more or fewer.
      expect(row!.baseStaff, detail).toBe(staffInPlace);
      expect(row!.positions, detail).toBeCloseTo(
        row!.baseStaff * ((priorLine + change) / priorLine),
      );
      if (direction === "cut") {
        expect(row!.positions, detail).toBeLessThan(staffInPlace);
        expect(laidOff.length, detail).toBeGreaterThan(0);
        // Their later pay stops: each laid-off person's job at city hall
        // carries an end date, by job record id.
        for (const personId of laidOff) {
          const ended = [...core.jobs.values()].find(
            (j) => j.personId === personId && j.organizationId === district.id,
          );
          expect(ended?.endsAt, `${detail}: ${ended?.id}`).toBeDefined();
        }
      } else expect(row!.positions, detail).toBeGreaterThan(staffInPlace);
      return;
    }
    throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
  }, 1_800_000);
