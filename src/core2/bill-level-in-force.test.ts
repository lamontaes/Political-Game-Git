/**
 * A bill's "in force today" on the draft card (`billCatalog`) and the "before"
 * on its paper (`billSections`) are one value: what is in force for the
 * government the bill makes law for, read through `inForceAtLevel`. The levels
 * of an income tax stack, so a state bill meets the state's rate (not the
 * federal 37% top rate that sits first in the chain), a town council's the
 * town's and a county board's the county's; a budget line is the line in the
 * budget that government has in force, the budget the bill amends.
 *
 * In a played world of a place drawn from all 56 (and Brookside, Delaware,
 * where the lane saw a state income tax of 0% on the card against a federal
 * 37% on the paper), for a state legislature, the town's council and a county
 * board: an income-tax bill, a minimum-wage, property-tax, estate-tax and
 * corporate-income-tax bill, and a budget-line bill, the card's amount and
 * the paper's before are equal and match the law row (or the budget line) of
 * the bill's own government, by record id. A county with its own income tax
 * (Indiana, Maryland) in a town with a government of its own shows the
 * county's, never the town's.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { budgetInForce } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import type { LawRowInput } from "./laws-starting";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { governments } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import {
  billSections,
  bodyJurisdiction,
  bodyRow,
  draftBill,
  inForceAtLevel,
  memberKey,
  members,
  type Provision,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Where the lane found it (#6843): the state's 0% on the card, the federal 37% on the paper. */
const BROOKSIDE = {
  name: "Brookside, Delaware",
  key: "1009850",
  seed: "4d50e1f88df997f9",
};

/** The three kinds of lawmaking body: the state's chamber, the town's own council, a county's board. */
type Kind = "state" | "council" | "county";

interface Body {
  readonly kind: Kind;
  readonly officeId: string;
  readonly officeKind: string;
  readonly sponsorId: string;
  /** The government its bills make law for, from the chain, not from `bodyJurisdiction`. */
  readonly expected: string;
}

function bodyOfKind(api: CoreAPI, kind: Kind): Body | null {
  const chain = lawChain(api);
  const town = chain.levels[chain.levels.length - 1]!.jurisdiction;
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
    kind === "state"
      ? offices.find(
          (o) =>
            o.jurisdiction === chain.stateKey &&
            /^legislature-(lower|unicameral)$/.test(o.kind),
        )
      : kind === "county"
        ? offices.find((o) => bodyRow(o.kind)?.level === "county")
        : offices.find(
            (o) =>
              bodyRow(o.kind)?.level === "city" &&
              bodyRow(o.kind)?.law !== "township",
          );
  if (!office) return null;
  const expected =
    kind === "state"
      ? chain.stateKey
      : kind === "council"
        ? town
        : bodyJurisdiction(api, office.id);
  if (kind === "county")
    expect(
      chain.levels.some(
        (l) => l.level === "county" && l.jurisdiction === expected,
      ),
      `a county board's bills make law for a county in the town's chain, not ${expected}`,
    ).toBe(true);
  return {
    kind,
    officeId: office.id,
    officeKind: office.kind,
    sponsorId: memberKey(members(api, office.id)[0]!),
    expected,
  };
}

/** The law row for the government the body makes law for, read straight off the chain's levels. */
function ownRow(api: CoreAPI, series: string, body: Body): LawRowInput | null {
  const answer = lawInForce(api, series);
  const own = (name: string) =>
    answer.levels.find(
      (l) =>
        l.level === name &&
        (name !== "county" || l.jurisdiction === body.expected),
    )?.row ?? null;
  const level =
    body.kind === "state"
      ? "state"
      : body.kind === "council"
        ? "city"
        : "county";
  if (answer.doctrine === "additive") return own(level);
  if (answer.doctrine === "floor")
    return body.kind === "state"
      ? (own("state") ?? own("federal"))
      : body.kind === "council"
        ? answer.governing
        : own("county");
  // One level sets it: the deepest row at or above the body's government,
  // never another county's.
  const reach = answer.levels.findIndex(
    (l) =>
      l.level === level &&
      (level !== "county" || l.jurisdiction === body.expected),
  );
  return (
    answer.levels
      .slice(0, reach + 1)
      .filter(
        (l, i) => level !== "county" || l.level !== "county" || i === reach,
      )
      .reverse()
      .find((l) => l.row)?.row ?? null
  );
}

/** The budget the body's government has in force. */
function ownBudget(api: CoreAPI, body: Body) {
  const gov = governments(api).find((g) => g.id === body.expected);
  return gov ? (budgetInForce(api, gov.id) ?? null) : null;
}

interface Check {
  readonly what: string;
  readonly card: number | null | "not listed";
  readonly paper: number | null;
  readonly recordId: string | null;
}

/** Draft the bill and read both screens' value for it. */
function readBoth(api: CoreAPI, body: Body, provision: Provision, id: string) {
  const bill = draftBill(api, {
    bodyOfficeId: body.officeId,
    sponsorId: body.sponsorId,
    provisions: [provision],
  });
  const [section] = billSections(api, bill);
  // The draft card: the catalog of the body, read at the government it makes law for.
  const listed = billCatalog(
    api,
    body.kind === "state" ? "state" : "city",
    bodyJurisdiction(api, body.officeId),
  )
    .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
    .find((policy) => policy.id === id);
  return { section: section!, listed };
}

function checkLaw(
  api: CoreAPI,
  where: string,
  body: Body,
  series: string,
  value: number,
): Check {
  const { section, listed } = readBoth(
    api,
    body,
    {
      kind: "law-amount",
      series,
      value,
      unit: series === "minimum-wage" ? "minor/hour" : "percent",
    },
    `law:${series}`,
  );
  const row = ownRow(api, series, body);
  const label = `${where}: ${series} bill of a ${body.kind} body (${body.officeKind}, ${body.expected})`;
  // The paper's before is the law row of the bill's own government, by record id.
  expect(section.before.lawId, label).toBe(row?.id ?? null);
  expect(section.before.value, label).toBe(row?.value ?? null);
  // The card's amount is that same value, where the catalog offers the policy.
  if (listed) {
    expect(listed.inForce, label).toBe(section.before.value);
    expect(listed.inForceUnit, label).toBe(section.before.unit);
  }
  // The one function both screens read gives the same row.
  expect(
    inForceAtLevel(api, { kind: "law-amount", series }, body.expected).recordId,
    label,
  ).toBe(row?.id ?? null);
  // The levels stack: a state, town or county tax is never the federal rate.
  if (lawInForce(api, series).doctrine === "additive") {
    const federal = lawInForce(api, series).levels.find(
      (l) => l.level === "federal",
    )?.row;
    if (federal && row?.id !== federal.id)
      expect(section.before.lawId, label).not.toBe(federal.id);
  }
  return {
    what: `${series} (${body.kind})`,
    card: listed ? listed.inForce : "not listed",
    paper: section.before.value,
    recordId: row?.id ?? null,
  };
}

function checkBudgetLine(
  api: CoreAPI,
  where: string,
  body: Body,
): Check | null {
  const budget = ownBudget(api, body);
  if (!budget) return null;
  const policy = billCatalog(
    api,
    body.kind === "state" ? "state" : "city",
    bodyJurisdiction(api, body.officeId),
  )
    .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
    .find(
      (p) =>
        p.kind === "budget-line" &&
        p.line &&
        (budget.spendingMinor[p.line] ?? 0) > 0,
    );
  if (!policy) return null;
  const { section, listed } = readBoth(
    api,
    body,
    { kind: "budget-line", line: policy.line!, value: 100_000 },
    policy.id,
  );
  const line = budget.spendingMinor[policy.line!]!;
  const label = `${where}: budget-line bill (${policy.line}) of a ${body.kind} body (${body.officeKind}, ${body.expected})`;
  expect(listed, label).toBeDefined();
  expect(listed!.inForce, label).toBe(line);
  expect(section.before.value, label).toBe(line);
  expect(section.before.unit, label).toBe("minor");
  expect(listed!.inForceUnit, label).toBe("minor");
  expect(section.after.value, label).toBe(line + 100_000);
  expect(
    inForceAtLevel(
      api,
      { kind: "budget-line", line: policy.line },
      body.expected,
    ).recordId,
    label,
  ).toBe(budget.id);
  // The bill enacts into this government's budget, not another's: where the
  // town has a government of its own, the county board's line is not the town's.
  if (body.kind === "county") {
    const town = lawChain(api).levels.at(-1)!.jurisdiction;
    const townBudget = governments(api).some((g) => g.id === town)
      ? budgetInForce(api, town)
      : undefined;
    if (townBudget)
      expect(line, label).not.toBe(townBudget.spendingMinor[policy.line!]);
  }
  return {
    what: `budget line ${policy.line} (${body.kind})`,
    card: listed!.inForce,
    paper: section.before.value,
    recordId: budget.id,
  };
}

const describeCheck = (c: Check) =>
  `${c.what}: card ${c.card}, paper ${c.paper}, record ${c.recordId ?? "none (no law there)"}`;

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
  const lines: string[] = [];
  const checks: Check[] = [];
  const keep = (check: Check) => {
    checks.push(check);
    return describeCheck(check);
  };
  const bodies = (["state", "council", "county"] as const).flatMap((kind) => {
    const body = bodyOfKind(api, kind);
    if (!body) lines.push(`no ${kind} body here`);
    return body ? [body] : [];
  });
  expect(
    bodies.some((b) => b.kind === "state"),
    `${where}: a state legislature to draft before`,
  ).toBe(true);

  for (const body of bodies) {
    lines.push(
      `${body.kind} body ${body.officeKind} makes law for ${body.expected}`,
    );
    // An income tax stacks: each government's own rate, never the first level that has one.
    lines.push(keep(checkLaw(api, where, body, "income-tax", 3)));
    // A wage floor, and a property tax set by one level.
    lines.push(keep(checkLaw(api, where, body, "minimum-wage", 1600)));
    lines.push(keep(checkLaw(api, where, body, "property-tax", 1)));
    if (body.kind === "state") {
      // Taxes only the nation and the state levy: a state with none shows none,
      // not the federal estate tax.
      lines.push(keep(checkLaw(api, where, body, "corporate-income-tax", 5)));
      lines.push(keep(checkLaw(api, where, body, "estate-tax", 10)));
    }
    const budget = checkBudgetLine(api, where, body);
    lines.push(
      budget ? keep(budget) : `no budget line to read for ${body.expected}`,
    );

    // Where no income tax is on record for the bill's government, a law its
    // body passed earlier is read the same way by both screens, and no other
    // government's stands in for it.
    if (!ownRow(api, "income-tax", body)) {
      const row = enactLaw(api, {
        jurisdiction: body.expected,
        level:
          body.kind === "state"
            ? "state"
            : body.kind === "council"
              ? "city"
              : "county",
        series: "income-tax",
        value: 1.5,
        unit: "percent-flat",
        effectiveDate: core.date,
        measureId: "Ordinance 2025-0",
        citation: "an earlier ordinance of the body (test edge case)",
      });
      expect(ownRow(api, "income-tax", body)?.id, where).toBe(row.id);
      const after = checkLaw(api, where, body, "income-tax", 3);
      expect(after.paper, where).toBe(1.5);
      expect(after.recordId, where).toBe(row.id);
      lines.push(
        `after a ${body.kind} income tax of 1.5% is enacted: ${describeCheck(after)}`,
      );
    }
  }
  return { report: `${where}\n  ${lines.join("\n  ")}`, checks };
}

/** A town in Indiana or Maryland (counties with an income tax of their own) with a government of its own. */
function drawCountyIncomeTaxPlace() {
  const place = drawPlace(`${seed}:county-income-tax`, "bill-level-in-force");
  const states = ["US-IN", "US-MD"];
  const state = states[parseInt(place.seed.slice(0, 8), 16) % states.length]!;
  const own = [...placeLocalities(state)]
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter(
      (l) =>
        placeLocalGovernmentUnits(corePlaceByKey(l.key)).municipal.length > 0,
    );
  const locality = own[parseInt(place.seed.slice(8, 16), 16) % own.length]!;
  return { name: locality.displayName, key: locality.key, seed: place.seed };
}

it(`a bill's draft card and paper read one value for the government the bill makes law for, by record (seed ${seed})`, () => {
  setBookkeeping(false);
  const report: string[] = [];
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "bill-level-in-force");
    report.push(checkWorld(place.name, place.key, place.seed).report);
  }
  // Brookside, Delaware: the state's rate, the county's and the town's are what the
  // screens show, never the federal 37%, and a state with no estate tax shows none.
  const brookside = checkWorld(BROOKSIDE.name, BROOKSIDE.key, BROOKSIDE.seed);
  for (const check of brookside.checks.filter((c) =>
    c.what.startsWith("income-tax"),
  )) {
    expect(check.paper, `${check.what} paper`).not.toBe(37);
    expect(check.card, `${check.what} card`).not.toBe(37);
  }
  const estate = brookside.checks.find((c) => c.what === "estate-tax (state)");
  expect(estate, "Brookside's state estate-tax bill").toBeDefined();
  expect(estate!.paper, "Brookside has no state estate tax: paper").toBeNull();
  expect(estate!.card, "Brookside has no state estate tax: card").toBeNull();
  report.push(brookside.report);
  // A county with an income tax of its own, in a town with a government of its own.
  const county = drawCountyIncomeTaxPlace();
  const counties = checkWorld(county.name, county.key, county.seed);
  const countyTax = counties.checks.find(
    (c) => c.what === "income-tax (county)",
  );
  expect(countyTax, "the county board's income-tax bill").toBeDefined();
  expect(
    countyTax!.recordId,
    "the county's own income tax is on record",
  ).toMatch(/^law:county:/);
  expect(countyTax!.paper, "the county's rate").not.toBeNull();
  expect(countyTax!.card, "the county's rate on the card").toBe(
    countyTax!.paper,
  );
  report.push(counties.report);
  process.stdout.write(`BILL-LEVEL ${report.join("\n")}\n`);
}, 1_200_000);
