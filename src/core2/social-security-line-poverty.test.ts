// @vitest-environment node
/**
 * The federal Social Security line moves who is poor through the awards it
 * sets, including the awards named people claim in play (outcome link
 * social-security-line-to-poverty, carried by the poverty engine). Two worlds
 * from one drawn place and seed: one where Congress's budget bill raises the
 * line a fifth, carried as a passed bill carries it, and one left alone. A
 * named person who claims in play is paid by the payer's monthly obligation,
 * which the line rerates; the poverty count reads that obligation as the
 * household's income. A place where no named person has claimed by the end
 * of the wait is passed over and named.
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
import { retirementClaims } from "./modules/retirement-claims";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { householdPoverty } from "./world-poverty";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINE = "socialSecurity";
const TRIES = 3;
const WAIT_DAYS = 80;

/**
 * Each named in-play claim's household and the award it is paid today, for
 * claims made before `before`: the treasury rerates an award at the monthly
 * close after its claim, so a claim made since the last close is still at
 * its base.
 */
function namedClaims(core: CoreState, before: string): Map<string, number> {
  const accounts = coreAPI(core).accounts();
  const out = new Map<string, number>();
  for (const [personId, claim] of retirementClaims(core)) {
    if (claim.counted || claim.date >= before) continue;
    const household = core.people.get(personId)?.householdId;
    const obligation = accounts.obligation(claim.obligationId);
    if (!household || !obligation || obligation.endedAt) continue;
    out.set(household, (out.get(household) ?? 0) + obligation.amountMinor);
  }
  return out;
}

/** A household's other recorded income: its members' pay and the awards the opening wrote. */
function otherIncome(core: CoreState, householdId: string): number {
  let minor = 0;
  for (const id of core.households.get(householdId)?.memberIds ?? []) {
    const person = core.people.get(id);
    if (!person?.alive) continue;
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (job && job.endsAt === undefined) minor += job.wageDailyMinor;
    for (const contractId of core.finance.incomeContractsByPerson.get(id) ??
      []) {
      const contract = core.finance.contracts.get(contractId);
      if (contract && !contract.endedAt) minor += contract.amountMinor;
    }
  }
  return minor;
}

it(`a raise in the federal Social Security line raises the poverty income of people who claimed in play (replay ${replay})`, () => {
  const link = WEB_LINKS.find(
    (l) => l.key === "social-security-line-to-poverty",
  );
  expect(link?.from).toBe(`budget.${LINE}-added-pct`);
  expect(link?.carriedBy).toMatch(/world-poverty\.ts/);
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const place = drawPlace(
        replay,
        `social-security-line-poverty:${attempt}`,
      );
      const where = `${place.name} (${place.key}), replay ${replay} draw social-security-line-poverty:${attempt}, world seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const raised = build();
      const alone = build();
      const api = coreAPI(raised);
      const federal = governments(api).find((g) => g.level === "federal")!;
      const budget = [...budgetsOf(api, federal.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0]!;
      const base = budget.spendingMinor[LINE] ?? 0;
      expect(base, where).toBeGreaterThan(0);
      expect(
        amendBudget(api, {
          governmentId: federal.id,
          line: LINE,
          deltaMinor: Math.round(base / 5),
          measureId: "H.R. 9010 (Social Security, test)",
          carry: true,
        }),
        where,
      ).not.toBeNull();
      // Long enough for named people to claim, and past a monthly close.
      const until = addDays(makeIsoDate(raised.date), WAIT_DAYS);
      advanceCore(raised, until);
      advanceCore(alone, until);
      // A month and a day before the end, so a monthly close follows each claim.
      const before = addDays(until, -32);
      const awardsRaised = namedClaims(raised, before);
      const awardsAlone = namedClaims(alone, before);
      // The same households claimed in both worlds, with nothing else of theirs moved.
      const alike = [...awardsRaised.keys()].filter(
        (id) =>
          awardsAlone.has(id) &&
          otherIncome(raised, id) === otherIncome(alone, id),
      );
      if (!alike.length) {
        passed.push(
          `${where}: no named person claimed in both worlds before ${before}`,
        );
        continue;
      }
      const months = api.parameter("monthsPerYear");
      const povertyAlone = new Map(
        householdPoverty(alone).map((row) => [row.householdId, row]),
      );
      const povertyRaised = new Map(
        householdPoverty(raised).map((row) => [row.householdId, row]),
      );
      for (const id of alike) {
        const rise = awardsRaised.get(id)! - awardsAlone.get(id)!;
        // The line rerates every award a fifth.
        expect(
          awardsRaised.get(id)! / awardsAlone.get(id)!,
          `${where}: household ${id} award`,
        ).toBeCloseTo(1.2, 2);
        // The poverty count reads the award as the household's income.
        const read =
          povertyRaised.get(id)!.incomeMinor -
          povertyAlone.get(id)!.incomeMinor;
        expect(read, `${where}: household ${id} income`).toBeCloseTo(
          rise * months,
          -2,
        );
      }
      process.stdout.write(
        `SOCIAL SECURITY ${where}: ${alike.length} named households claimed in play in both worlds; each award a fifth more, and each household's poverty income rose by its year of it. Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No place had a named claim: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
