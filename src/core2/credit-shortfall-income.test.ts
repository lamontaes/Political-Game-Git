/**
 * A household asks a lender only when its cash and the month's income fall
 * short of the month's costs, and the income every lender and every asker
 * reads is one: the pay that arrives, Social Security and pension awards, and
 * unemployment benefits, for full and counted households alike
 * (credit.ts `monthlyIncome`). Pinned to Cherry Hill, Virginia (place
 * 5115176, world seed "promises-real-loan-1").
 *
 * Old premise (credit.ts `householdApplications`, a builder's line, no
 * ruling): any household with cash below a month of its costs asked, whatever
 * came in, and a counted household's income was its wages alone. With the
 * survey's opening balances (#9117) the first 30 days held 2,550
 * applications, 2,496 of them from counted households, a retiree with a
 * pension read as having no income, and the storefront lender's cash was $0
 * from March on. Account lead, Nov 15: one reader for a household's monthly
 * income, used by both the asking and the lending side.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { monthlyIncome } from "./modules/credit";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PLACE = "5115176";
const SEED = "promises-real-loan-1";

it("asks for loans at Cherry Hill, Virginia only for a month its cash and income cannot cover", () => {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const opened = makeIsoDate(core.date);
  const where = `Cherry Hill VA (${PLACE}), world ${core.seed}, opened ${opened}`;
  advanceCore(core, makeIsoDate(addDays(opened, 1)));
  const rt = residentsRuntime(core)!;
  const town = core.people.get(core.playerId)!.placeId;
  // A counted household of retirees with no pay is judged on its awards.
  const retirees = [...rt.store.liveHouseholds()].filter(
    (h) =>
      h.placeId === town &&
      !core.households.has(h.id) &&
      h.incomeContracts.length > 0 &&
      rt.store.factsOfHousehold(h).every((m) => !m.jobId),
  );
  expect(retirees.length, where).toBeGreaterThan(0);
  const h = retirees[0]!;
  const awards = h.incomeContracts.reduce(
    (n, row) => n + row.amountMinor / row.periodMonths,
    0,
  );
  const income = monthlyIncome(
    api,
    rt.store.factsOfHousehold(h).map((m) => m.id),
  );
  expect(income, `${where}: ${h.id}`).toBeGreaterThan(0);
  expect(Math.round(income), `${where}: ${h.id}`).toBe(Math.round(awards));
  // Thirty days on: no household whose month's income covers its costs asked.
  const monthEnd = makeIsoDate(addDays(opened, 30));
  advanceCore(core, monthEnd);
  const days = api.parameter("businessDaysPerMonth");
  const costsOf = (householdId: string) => {
    const full = core.households.get(householdId);
    const members = full
      ? full.memberIds.flatMap((id) => {
          const person = core.people.get(id);
          return person ? [person] : [];
        })
      : rt.store.factsOfHousehold(
          [...rt.store.liveHouseholds()].find((row) => row.id === householdId)!,
        );
    return members.reduce((n, m) => n + m.livingCostDailyMinor, 0) * days;
  };
  const applications = (
    api.moduleState("credit").table("applications").rows() as unknown as {
      date: string;
      householdId: string | null;
      kind: string;
      monthlyIncomeMinor: number;
    }[]
  ).filter(
    (row) =>
      row.householdId &&
      row.date <= monthEnd &&
      (row.kind === "personal" || row.kind === "small-dollar"),
  );
  for (const row of applications)
    expect(
      row.monthlyIncomeMinor,
      `${where}: ${row.kind} ${row.householdId} on ${row.date}`,
    ).toBeLessThan(costsOf(row.householdId!));
  // The storefront lender still has money to lend at the month's end.
  const lender = api.moduleState("credit").table("lenders").rows()[0] as
    { organizationId: string } | undefined;
  const till = lender
    ? (core.organizations.get(lender.organizationId)?.liquidMinor ?? 0)
    : 0;
  expect(till, where).toBeGreaterThan(0);
  process.stdout.write(
    `credit shortfall income: ${where}; retiree household ${h.id} income ${Math.round(income)} a month from awards ${Math.round(awards)}; ${applications.length} applications in the first 30 days; storefront cash ${till} on ${core.date}\n`,
  );
}, 160_000);
