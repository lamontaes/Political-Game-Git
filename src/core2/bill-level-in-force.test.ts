/**
 * A bill's "in force today" on the draft card (`billCatalog`) and the "before"
 * on its paper (`billSections`) are one value: what is in force at the level
 * the bill legislates at, read through `inForceAtLevel`. The levels of an
 * income tax stack, so a state bill meets the state's rate (not the federal
 * 37% top rate that sits first in the chain) and a town's bill the town's;
 * a budget line is the line in the budget its government has in force.
 *
 * In a played world of a place drawn from all 56 (and Brookside, Delaware,
 * where the lane saw a state income tax of 0% on the card against a federal
 * 37% on the paper), for an income-tax bill at the state level and at the
 * town's, a minimum-wage, property-tax and corporate-income-tax bill, and a
 * budget-line bill, the card's amount and the paper's before are equal and
 * match the law row (or the budget line) at the bill's own level, by record id.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { budgetInForce } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { lawRowAtLevel } from "./laws-in-force";
import type { LawRowInput } from "./laws-starting";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { governments } from "./modules/budgets";
import {
  billSections,
  bodyRow,
  draftBill,
  inForceAtLevel,
  memberKey,
  members,
  type Provision,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Where the lane found it (#6843): the state's 0% on the card, the federal 37% on the paper. */
const BROOKSIDE = {
  name: "Brookside, Delaware",
  key: "1009850",
  seed: "4d50e1f88df997f9",
};

type Level = "state" | "city";

interface Body {
  readonly officeId: string;
  readonly kind: string;
  readonly sponsorId: string;
}

/** The lawmaking body of a level: the state's chamber, or the town's own (a county's where it has none). */
function bodyAt(api: CoreAPI, level: Level): Body | null {
  const chain = lawChain(api);
  const offices = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
      jurisdiction: string;
    }[]
  )
    .filter((o) => bodyRow(o.kind) && members(api, o.id).length)
    .sort((a, b) => a.id.localeCompare(b.id));
  const office =
    level === "state"
      ? offices.find(
          (o) =>
            o.jurisdiction === chain.stateKey &&
            /^legislature-(lower|unicameral)$/.test(o.kind),
        )
      : (offices.find((o) => bodyRow(o.kind)?.level === "city") ??
        offices.find((o) => bodyRow(o.kind)?.level === "county"));
  return office
    ? {
        officeId: office.id,
        kind: office.kind,
        sponsorId: memberKey(members(api, office.id)[0]!),
      }
    : null;
}

/** The law row at the bill's own level, read straight off the chain's levels. */
function ownRow(
  api: CoreAPI,
  series: string,
  level: Level,
): LawRowInput | null {
  const answer = lawInForce(api, series);
  const row = (name: string) =>
    answer.levels.find((l) => l.level === name)?.row ?? null;
  if (answer.doctrine === "additive") return row(level);
  if (answer.doctrine === "floor")
    return level === "state"
      ? (row("state") ?? row("federal"))
      : answer.governing;
  // One level sets it: the deepest row at or above the bill's level.
  const reach =
    level === "state"
      ? ["federal", "state"]
      : answer.levels.map((l) => l.level);
  return (
    [...answer.levels]
      .filter((l) => reach.includes(l.level))
      .reverse()
      .find((l) => l.row)?.row ?? null
  );
}

/** The budget the level's government has in force; a town with no government of its own is the county that carries its whole local share. */
function ownBudget(api: CoreAPI, level: Level) {
  const chain = lawChain(api);
  const id =
    level === "state"
      ? chain.stateKey
      : chain.levels[chain.levels.length - 1]!.jurisdiction;
  const gov =
    governments(api).find((g) => g.id === id) ??
    (level === "city"
      ? governments(api).find((g) => g.base === "county-whole")
      : undefined);
  return gov ? (budgetInForce(api, gov.id) ?? null) : null;
}

interface Check {
  readonly what: string;
  readonly level: Level;
  readonly card: number | null | "not listed";
  readonly paper: number | null;
  readonly recordId: string | null;
}

/** Draft the bill and read both screens' value for it. */
function readBoth(
  api: CoreAPI,
  body: Body,
  level: Level,
  provision: Provision,
  policyId: string,
) {
  const bill = draftBill(api, {
    bodyOfficeId: body.officeId,
    sponsorId: body.sponsorId,
    provisions: [provision],
  });
  const [section] = billSections(api, bill);
  const listed = billCatalog(api, level)
    .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
    .find((policy) => policy.id === policyId);
  return { section: section!, listed };
}

function lawBill(series: string, value: number): Provision {
  return { kind: "law-amount", series, value, unit: "percent" };
}

function checkLaw(
  api: CoreAPI,
  where: string,
  body: Body,
  level: Level,
  series: string,
  value: number,
): Check {
  const { section, listed } = readBoth(
    api,
    body,
    level,
    series === "minimum-wage"
      ? { kind: "law-amount", series, value, unit: "minor/hour" }
      : lawBill(series, value),
    `law:${series}`,
  );
  const row = ownRow(api, series, level);
  const label = `${where}: ${series} bill at the ${level} level (${body.kind})`;
  // The paper's before is the law row at the bill's own level, by record id.
  expect(section.before.lawId, label).toBe(row?.id ?? null);
  expect(section.before.value, label).toBe(row?.value ?? null);
  // The card's amount is that same value, where the catalog offers the policy at this level.
  if (listed) {
    expect(listed.inForce, label).toBe(section.before.value);
    expect(listed.inForceUnit, label).toBe(section.before.unit);
  }
  // The one function both screens read gives the same row.
  expect(
    inForceAtLevel(api, { kind: "law-amount", series }, level).recordId,
    label,
  ).toBe(row?.id ?? null);
  // The levels stack: a state or town income tax is never the federal rate.
  if (lawInForce(api, series).doctrine === "additive") {
    const federal = lawInForce(api, series).levels.find(
      (l) => l.level === "federal",
    )?.row;
    if (federal && row?.id !== federal.id)
      expect(section.before.lawId, label).not.toBe(federal.id);
  }
  return {
    what: `${series} ${level}`,
    level,
    card: listed ? listed.inForce : "not listed",
    paper: section.before.value,
    recordId: row?.id ?? null,
  };
}

function checkBudgetLine(
  api: CoreAPI,
  where: string,
  body: Body,
  level: Level,
): Check | null {
  const budget = ownBudget(api, level);
  if (!budget) return null;
  const lines = billCatalog(api, level)
    .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
    .filter((policy) => policy.kind === "budget-line" && policy.line);
  const policy = lines.find((p) => (budget.spendingMinor[p.line!] ?? 0) > 0);
  if (!policy) return null;
  const { section, listed } = readBoth(
    api,
    body,
    level,
    { kind: "budget-line", line: policy.line!, value: 100_000 },
    policy.id,
  );
  const line = budget.spendingMinor[policy.line!]!;
  const label = `${where}: budget-line bill (${policy.line}) at the ${level} level (${body.kind})`;
  expect(listed, label).toBeDefined();
  expect(listed!.inForce, label).toBe(line);
  expect(section.before.value, label).toBe(line);
  expect(section.before.unit, label).toBe("minor");
  expect(listed!.inForceUnit, label).toBe("minor");
  expect(section.after.value, label).toBe(line + 100_000);
  expect(
    inForceAtLevel(api, { kind: "budget-line", line: policy.line }, level)
      .recordId,
    label,
  ).toBe(budget.id);
  return {
    what: `budget line ${policy.line} ${level}`,
    level,
    card: listed!.inForce,
    paper: section.before.value,
    recordId: budget.id,
  };
}

const describeCheck = (c: Check) =>
  `${c.what}: card ${c.card}, paper ${c.paper}, record ${c.recordId ?? "none (no law at that level)"}`;

function checkWorld(
  name: string,
  placeKey: string,
  worldSeed: string,
): { readonly report: string; readonly checks: readonly Check[] } {
  const where = `${name} (${placeKey}), seed ${worldSeed}`;
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const chain = lawChain(api);
  const lines: string[] = [];
  const checks: Check[] = [];
  const keep = (check: Check) => {
    checks.push(check);
    return describeCheck(check);
  };
  const state = bodyAt(api, "state");
  const town = bodyAt(api, "city");
  expect(state, `${where}: a state legislature to draft before`).not.toBeNull();
  const reads: [Body, Level][] = [[state!, "state"]];
  if (town) reads.push([town, "city"]);
  else lines.push("no town or county body here");

  for (const [body, level] of reads) {
    // An income tax stacks: each level's own rate, never the first level that has one.
    lines.push(keep(checkLaw(api, where, body, level, "income-tax", 3)));
    // A wage floor, a property tax set by one level and a tax only the nation and the state levy.
    lines.push(keep(checkLaw(api, where, body, level, "minimum-wage", 1600)));
    lines.push(keep(checkLaw(api, where, body, level, "property-tax", 1)));
    if (level === "state")
      lines.push(
        keep(checkLaw(api, where, body, level, "corporate-income-tax", 5)),
      );
    const budget = checkBudgetLine(api, where, body, level);
    lines.push(
      budget ? keep(budget) : `no budget line to read at the ${level} level`,
    );

    // Where no law is on record at the bill's level, a law passed there earlier
    // is read the same way by both screens, and no higher level stands in for it.
    if (!ownRow(api, "income-tax", level)) {
      const row = enactLaw(api, {
        jurisdiction:
          level === "state"
            ? chain.stateKey
            : chain.levels[chain.levels.length - 1]!.jurisdiction,
        level,
        series: "income-tax",
        value: 1.5,
        unit: "percent-flat",
        effectiveDate: core.date,
        measureId: "Ordinance 2025-0",
        citation: "an earlier ordinance of the body (test edge case)",
      });
      expect(ownRow(api, "income-tax", level)?.id, where).toBe(row.id);
      const after = checkLaw(api, where, body, level, "income-tax", 3);
      expect(after.paper, where).toBe(1.5);
      expect(after.recordId, where).toBe(row.id);
      lines.push(
        `after a ${level} income tax of 1.5% is enacted: ${describeCheck(after)}`,
      );
    }
  }
  // The pure rule agrees with the engine's answer.
  expect(
    lawRowAtLevel(lawInForce(api, "income-tax"), "state")?.id ?? null,
    where,
  ).toBe(
    inForceAtLevel(api, { kind: "law-amount", series: "income-tax" }, "state")
      .recordId,
  );
  return { report: `${where}\n  ${lines.join("\n  ")}`, checks };
}

it(`a bill's draft card and paper read one value at the bill's own level, by record (seed ${seed})`, () => {
  setBookkeeping(false);
  const report: string[] = [];
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "bill-level-in-force");
    report.push(checkWorld(place.name, place.key, place.seed).report);
  }
  // Brookside, Delaware: the state's rate and the town's are what the screens show, never the federal 37%.
  const brookside = checkWorld(BROOKSIDE.name, BROOKSIDE.key, BROOKSIDE.seed);
  for (const check of brookside.checks.filter((c) =>
    c.what.startsWith("income-tax"),
  )) {
    expect(check.paper, `${check.what} paper`).not.toBe(37);
    expect(check.card, `${check.what} card`).not.toBe(37);
  }
  report.push(brookside.report);
  process.stdout.write(`BILL-LEVEL ${report.join("\n")}\n`);
}, 900_000);
