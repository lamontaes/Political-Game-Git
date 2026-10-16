/**
 * Officials are paid by paycheck (gov-official-salary-through-payroll): each
 * monthly salary comes from the matching treasury as a gross paycheck, the
 * law in force takes its taxes out to each government that keeps a treasury,
 * and every figure carries its provenance. Played world, a place and seed
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { lineForPost } from "./budgets-treasury";
import { governments, withholdingOf } from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { OFFICIAL_PAY_MODULE_ID, officialSalary } from "./modules/official-pay";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "official-salary-payroll");

it(`pays officials by paycheck with withholding in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const openedOn = core.date;
  const seatedAtOpening = new Set(
    (
      api
        .moduleState(OFFICIALS_MODULE_ID)
        .table("officials")
        .rows() as unknown as OfficialRow[]
    ).map((o) => o.id),
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as OfficialRow[];
  const state = lawChain(api).stateKey;
  const govs = governments(api);
  const ownState = govs.find((g) => g.level === "state" && g.id === state)!;
  const federal = govs.find((g) => g.level === "federal")!;
  const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");

  // Every salary carries its provenance: sourced with a citation, or an
  // estimate with its spread.
  let sourced = 0;
  let estimated = 0;
  for (const row of officials) {
    const salary = officialSalary(row);
    if (!salary) continue;
    expect(salary.citation.length, `${where}: ${row.id}`).toBeGreaterThan(0);
    if (salary.tag === "SOURCED") sourced += 1;
    else {
      expect(salary.spreadPct, `${where}: ${row.id}`).toBeGreaterThan(0);
      expect(salary.estimatedFrom).toBeTruthy();
      estimated += 1;
    }
  }
  expect(sourced + estimated, where).toBeGreaterThan(0);

  // The treasury that pays: the town's state for its own state's offices.
  // Federal and other states' officials are outside payers (the federal
  // treasury here holds only the town's share), with taxes still withheld.
  let paidOwnState = 0;
  let paidFederal = 0;
  const paycheck: string[] = [];
  let measured = 0;
  let caughtUp = 0;
  for (const row of officials) {
    const record = pay.get(row.id) as unknown as
      { payerId: string; source: { tag: string } } | undefined;
    if (!record) continue;
    const federalOffice = [
      "president",
      "vice-president",
      "us-senate",
      "us-house",
    ].includes(row.officeKind);
    if (federalOffice) {
      expect(record.payerId, `${where}: ${row.id}`).not.toBe(
        federal.organizationId,
      );
      paidFederal += 1;
    } else if (row.stateKey === state) {
      expect(record.payerId, `${where}: ${row.id}`).toBe(
        ownState.organizationId,
      );
      paidOwnState += 1;
    }
    const checks = withholdingOf(api, row.id).filter((w) =>
      w.payrollReceiptId.startsWith("salary:"),
    );
    if (!checks.length) continue;
    for (const check of checks) {
      // The paycheck's taxes leave the official's cash for treasuries.
      expect(
        check.postings[0]!.deltaMinor,
        `${where}: ${check.id}`,
      ).toBeLessThan(0);
      expect(
        check.postings.reduce((sum, p) => sum + p.deltaMinor, 0),
        check.id,
      ).toBe(0);
      expect(check.lines.length).toBeGreaterThan(0);
    }
    paycheck.push(row.id);
    // The treasury pays the days served: what it could not cover on a payday
    // (a state treasury before its first close) is owed and paid later.
    const annualMinor = (record as unknown as { annualMinor: number })
      .annualMinor;
    if (seatedAtOpening.has(row.id) && annualMinor >= 3_000_000) {
      // The days served run from the opening to the pay date now.
      const served =
        (Date.parse((record as unknown as { paidFrom: string }).paidFrom) -
          Date.parse(openedOn)) /
        86_400_000;
      const earned = (annualMinor * served) / 365;
      const paid = checks.reduce((sum, w) => sum + w.paidMinor, 0);
      const owed = (record as unknown as { owedMinor?: number }).owedMinor ?? 0;
      expect(
        Math.abs(paid + owed - earned),
        `${where}: ${row.id}`,
      ).toBeLessThanOrEqual(earned / 100);
      caughtUp += owed === 0 ? 1 : 0;
      measured += 1;
    }
  }
  // Once the treasury has taken in its first month, nobody is left owed.
  expect(caughtUp, where).toBeGreaterThanOrEqual(Math.floor(measured / 2));
  expect(paidOwnState + paidFederal, where).toBeGreaterThan(0);
  // At least one official's pay had taxes withheld in the year.
  expect(paycheck.length, where).toBeGreaterThan(0);
  // The pay is the treasury's spending on its administration line.
  expect(lineForPost("state", "job:office:official:x")).toBe("administration");
}, 1_800_000);
