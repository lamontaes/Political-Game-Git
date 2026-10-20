/**
 * A cut to a city's schools line lays off named public-school teachers (pool
 * item office-budget-line-reaches-pay): the mayor's amended line is the adopted
 * line, the staffing reach reads it, and the district ends its newest teachers'
 * jobs. A place is drawn from all 56 on a seed nobody chose (SCHOOLS_LINE_SEED
 * pins one).
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
import { memberKey } from "./modules/legislature";
import { prepareAct, officeHost } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.SCHOOLS_LINE_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

for (const direction of ["cut", "raise"] as const)
  it(`a ${direction} to the city's schools line moves the public schools' funded teachers`, () => {
    const tried: string[] = [];
    for (let draw = 0; draw < 25; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "schools-line");
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
        (o.classification ?? "").startsWith("service:school"),
      );
      const teachers = (organizationId: string) =>
        [...core.jobs.values()].filter(
          (j) => j.organizationId === organizationId && !j.endsAt,
        );
      if (!mayor || !city || !district || teachers(district.id).length < 4) {
        tried.push(`${where}: no mayor, city or district with teachers`);
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
      const priorLine = budgetsOf(api, city.id).at(-1)!.spendingMinor.schools;
      if (!priorLine) {
        tried.push(`${where}: the city budget has no schools line`);
        continue;
      }
      expect(budgetProposalDue(api, officeHost, mayorId), where).not.toBeNull();
      const staffBefore = teachers(district.id).map((j) => j.personId);
      // The mayor asks to cut or raise the schools line by a third.
      const change = (direction === "cut" ? -1 : 1) * Math.floor(priorLine / 3);
      prepareAct(api, mayorId, "propose-budget", {
        budget: { changes: { schools: change } },
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
      expect(adopted?.spendingMinor.schools, where).toBe(priorLine + change);
      const laidOff = staffBefore.filter(
        (personId) =>
          ![...core.jobs.values()].some(
            (j) =>
              j.personId === personId &&
              j.organizationId === district.id &&
              !j.endsAt,
          ),
      );
      // The bill reaches the district: it is funded for its staff times the
      // line after the bill against the line before it.
      const row = staffingOf(api, "budget-line:schools", district.id);
      const detail = `${where}: schools line ${priorLine} ${direction} by ${Math.abs(change)}, adopted ${adopted?.id}; ${staffBefore.length} teachers before`;
      expect(row, detail).not.toBeNull();
      expect(row!.positions, detail).toBeCloseTo(
        row!.baseStaff * ((priorLine + change) / priorLine),
      );
      if (direction === "cut") {
        expect(row!.positions, detail).toBeLessThan(row!.baseStaff);
        expect(laidOff.length, detail).toBeGreaterThan(0);
      } else expect(row!.positions, detail).toBeGreaterThan(row!.baseStaff);
      return;
    }
    throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
  }, 1_800_000);
