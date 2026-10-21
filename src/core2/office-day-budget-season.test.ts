/**
 * A mayor or county executive sends the budget as an act in its season (pool
 * item office-budget-season-mayor-act): the act opens the lead time before
 * the fiscal year starts, the executive's changes by line become the
 * government's priorities, the council or board votes the budget with them at
 * the year's start, and the act is on the executive's record. A place is
 * drawn from all 56 on a seed nobody chose (BUDGET_SEASON_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { budgetPriorities, budgetsOf, governments } from "./modules/budgets";
import { officeActsOf, officeHost, prepareAct } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import {
  executiveBudgetChanges,
  LEGISLATURE_MODULE_ID,
  memberKey,
  type BillRow,
} from "./modules/legislature";
import { hireStaff, servingStaffOf, staffCandidates } from "./modules/staff";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.BUDGET_SEASON_SEED ?? randomBytes(8).toString("hex");

it("the executive's budget act opens in its season and its changes are what the council votes", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "budget-season");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const mayor = townSeats(api).find(
      (s) => s.office.kind === "mayor" && s.holder?.personId,
    );
    const city = governments(api).find((g) => g.level === "city");
    if (!mayor || !city) {
      tried.push(`${where}: no mayor or city government`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    // Go to the first day of the season: the lead time before the next fiscal year.
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    if (core.date > open) continue;
    const due = budgetProposalDue(api, officeHost, mayorId);
    expect(due, `${where}: the season opened on ${open}`).not.toBeNull();
    expect(
      budgetProposalDue(api, officeHost, mayorId)?.governmentId,
      where,
    ).toBe(city.id);
    const handler = officeActHandlers(officeHost)["propose-budget"]!;
    const line = Object.keys(
      budgetsOf(api, city.id)[0]!.spendingMinor,
    ).sort()[0]!;
    // The executive sends their changes; the act is kept with the priorities' record id.
    prepareAct(api, mayorId, "propose-budget", {
      budget: { changes: { [line]: 1_000_000 } },
    });
    handler(api, mayorId, {} as never);
    expect(budgetPriorities(api, city.id)?.changes, where).toEqual({
      [line]: 1_000_000,
    });
    const kept = officeActsOf(api, mayorId).filter(
      (r) => r.kind === "propose-budget",
    );
    expect(
      kept.map((r) => r.recordId),
      where,
    ).toEqual([`priorities:${city.id}`]);
    // Sent: the act is not offered again this season.
    expect(budgetProposalDue(api, officeHost, mayorId), where).toBeNull();
    // The council votes the budget at the year's start with the executive's changes in its bill.
    advanceCore(core, addDays(makeIsoDate(next), 1));
    // The budget bill the council voted carries the executive's line change, sponsored by the executive.
    const bill = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[]
    ).find(
      (row) =>
        row.sponsorId === mayorId &&
        row.provisions.some(
          (p) =>
            p.kind === "budget-line" &&
            p.line === line &&
            p.value === 1_000_000,
        ),
    );
    expect(
      bill,
      `${where}: the budget bill with the executive's change`,
    ).toBeDefined();
    // The priorities are spent once the budget is voted.
    expect(budgetPriorities(api, city.id), where).toBeNull();
    const adopted = budgetsOf(api, city.id).find(
      (b) => b.adoptedOn === next || b.startsOn === next,
    );
    console.log(
      `${where}: mayor ${mayorId} sent priorities:${city.id}; bill ${bill!.id}; adopted ${adopted?.id}`,
    );
    return;
  }
  throw new Error(
    `no mayor with a city budget in 6 places: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);

it("the character's own budget is cut by an aide's read of the council", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:advice:${draw}`, "budget-advice");
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
    if (!mayor || !city) {
      tried.push(`${where}: no mayor or city`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    const pick = staffCandidates(api, mayorId)[0];
    if (!pick) {
      tried.push(`${where}: no aide candidate`);
      continue;
    }
    hireStaff(api, {
      officialId: mayorId,
      personId: pick.personId,
      role: "aide",
    });
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    expect(
      servingStaffOf(api, mayorId).length,
      `${where}: the aide serves`,
    ).toBeGreaterThan(0);
    const own = executiveBudgetChanges(api, city.id, Number(next.slice(0, 4)));
    if (!own || !Object.keys(own.changes).length) {
      tried.push(`${where}: the mayor's lean changes no line`);
      continue;
    }
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    const sent = budgetPriorities(api, city.id)?.changes ?? {};
    for (const [line, delta] of Object.entries(sent)) {
      expect(Math.sign(delta), `${where} ${line}`).toBe(
        Math.sign(own.changes[line]!),
      );
      expect(Math.abs(delta), `${where} ${line}`).toBeLessThanOrEqual(
        Math.abs(own.changes[line]!),
      );
    }
    const kept = officeActsOf(api, mayorId).find(
      (r) => r.kind === "propose-budget",
    );
    expect(kept?.detail, where).toMatch(/advice /);
    console.log(
      `${where}: ${kept!.detail}; lines ${Object.keys(own.changes).length} to ${Object.keys(sent).length}`,
    );
    return;
  }
  throw new Error(
    `no mayor with an aide and a budget in 6 places: ${tried.join("; ")}; ${seed}`,
  );
}, 3_600_000);
