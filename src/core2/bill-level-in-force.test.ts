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
 * county's, never the town's, and every reader of the bill's stance (the
 * vote, the room) reads the county's. A township board's budget line is its
 * treasury's, which is keyed by the town's place. A passed bill's paper keeps
 * the law as it stood before the bill: its before and after read the same
 * after it is enacted and its law has taken effect.
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
import { enactLaw, LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import {
  billOf,
  billSections,
  billStance,
  bodyJurisdiction,
  bodyRow,
  castMemberVote,
  chambersOf,
  draftBill,
  effectiveRule,
  executiveDecision,
  executiveOf,
  holdVote,
  inForceAtLevel,
  memberKey,
  members,
  provisionStance,
  type BillRow,
  type Provision,
} from "./modules/legislature";
import { localBillStance } from "./modules/meetings";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** Where the lane found it (#6843): the state's 0% on the card, the federal 37% on the paper. */
const BROOKSIDE = {
  name: "Brookside, Delaware",
  key: "1009850",
  seed: "4d50e1f88df997f9",
};

/** The four kinds of lawmaking body: the state's chamber, the town's own council, a county's board, a township's board. */
type Kind = "state" | "council" | "county" | "township";

interface Body {
  readonly kind: Kind;
  readonly officeId: string;
  readonly officeKind: string;
  readonly sponsorId: string;
  /** The government its bills make law for, from the chain, not from `bodyJurisdiction`. */
  readonly expected: string;
  /** The government whose treasury holds its budget lines: a township's is keyed by the town's place. */
  readonly treasury: string;
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
        : kind === "township"
          ? offices.find((o) => bodyRow(o.kind)?.law === "township")
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
        : kind === "township"
          ? office.jurisdiction
          : bodyJurisdiction(api, office.id);
  if (kind === "county" || kind === "township")
    expect(
      chain.levels.some((l) => l.level === kind && l.jurisdiction === expected),
      `a ${kind} board's bills make law for a ${kind} in the town's chain, not ${expected}`,
    ).toBe(true);
  // A township's treasury is the town's own (keyed by its place), and says
  // whose it is by the township's unit id.
  const treasury = kind === "township" ? town : expected;
  if (kind === "township") {
    const gov = governments(api).find((g) => g.id === treasury);
    expect(
      gov,
      `the township ${expected} has a treasury at ${treasury}`,
    ).toBeDefined();
    expect(
      api.state.organizations.get(gov!.organizationId)?.governmentFacts
        ?.governmentKey,
    ).toBe(expected);
  }
  return {
    kind,
    officeId: office.id,
    officeKind: office.kind,
    sponsorId: memberKey(members(api, office.id)[0]!),
    expected,
    treasury,
  };
}

/** The law row for the government the body makes law for, read straight off the chain's levels. */
function ownRow(api: CoreAPI, series: string, body: Body): LawRowInput | null {
  const answer = lawInForce(api, series);
  const level =
    body.kind === "state"
      ? "state"
      : body.kind === "council"
        ? "city"
        : body.kind;
  const named = (name: string) => name === "county" || name === "township";
  const own = (name: string) =>
    answer.levels.find(
      (l) =>
        l.level === name && (!named(name) || l.jurisdiction === body.expected),
    )?.row ?? null;
  if (answer.doctrine === "additive") return own(level);
  if (answer.doctrine === "floor")
    return body.kind === "state"
      ? (own("state") ?? own("federal"))
      : body.kind === "council"
        ? answer.governing
        : own(level);
  // One level sets it: the deepest row at or above the body's government,
  // never another county's.
  const reach = answer.levels.findIndex(
    (l) =>
      l.level === level && (!named(level) || l.jurisdiction === body.expected),
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

/** The budget the body's treasury has in force. */
function ownBudget(api: CoreAPI, body: Body) {
  return budgetInForce(api, body.treasury) ?? null;
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

const ENACTED = ["enacted", "signed", "overridden"];

/** The bill a body's members all vote for, and the executive signs where one must. */
function voteThrough(
  api: CoreAPI,
  core: CoreState,
  body: Body,
  bill: BillRow,
): BillRow {
  for (const chamber of chambersOf(api, bill))
    for (const term of members(api, chamber))
      castMemberVote(api, bill.id, memberKey(term), "yes");
  let decided = holdVote(api, bill.id);
  if (decided.status === "awaiting-signature") {
    const executive = executiveOf(api, body.officeId).term?.personId;
    if (executive) {
      (core as unknown as { playerId: string }).playerId = executive;
      decided = executiveDecision(api, bill.id, true);
    }
  }
  return decided;
}

/**
 * One stance per bill: a county's income tax cut by a quarter point is a cut to
 * the vote and to the room (`localBillStance`), where the town's own reading
 * (no income tax, so a raise) would say the opposite.
 */
function checkStance(api: CoreAPI, where: string, body: Body): string | null {
  if (body.kind !== "county") return null;
  const row = ownRow(api, "income-tax", body);
  if (!row?.value) return null;
  const provision: Provision = {
    kind: "law-amount",
    series: "income-tax",
    value: row.value - 0.25,
    unit: "percent",
  };
  const bill = draftBill(api, {
    bodyOfficeId: body.officeId,
    sponsorId: body.sponsorId,
    provisions: [provision],
  });
  const label = `${where}: a cut of the county's income tax ${row.id}`;
  const stance = billStance(api, provision, bill);
  expect(stance, label).not.toBeNull();
  expect(stance!.position, label).toBeLessThan(0);
  expect(localBillStance(api, bill), label).toEqual(stance);
  const town = provisionStance(api, provision);
  expect(town!.position, `${label}: read at the town's law`).toBeGreaterThan(0);
  return `stance on ${provision.value}% against the county's ${row.value}% (${row.id}): ${stance!.position} for the vote and the room, where the town's law would read ${town!.position}`;
}

/**
 * A budget-line bill and a law-amount bill passed by the body: the budget the
 * card named is the one the bill amends, and the paper reads the same before
 * and after as it did the day it was drafted, after the law has taken effect.
 */
function checkEnacted(
  api: CoreAPI,
  core: CoreState,
  where: string,
  body: Body,
): string[] {
  const lines: string[] = [];
  const required = body.kind === "township";
  const label = `${where}: ${body.kind} body ${body.officeKind} (${body.expected})`;
  const budget = ownBudget(api, body);
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
        (budget?.spendingMinor[p.line] ?? 0) > 0,
    );
  if (required)
    expect(budget && policy, `${label}: a budget line`).toBeTruthy();
  if (budget && policy) {
    const line = policy.line!;
    const line0 = budget.spendingMinor[line]!;
    const delta = 100_000;
    const bill = draftBill(api, {
      bodyOfficeId: body.officeId,
      sponsorId: body.sponsorId,
      provisions: [{ kind: "budget-line", line, value: delta }],
    });
    const drafted = billSections(api, bill)[0]!;
    // The card, the paper and the budget the bill amends are one record.
    const card = billCatalog(
      api,
      body.kind === "state" ? "state" : "city",
      bodyJurisdiction(api, body.officeId),
    )
      .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
      .find((p) => p.id === policy.id)!;
    expect(card.inForce, label).toBe(line0);
    expect(drafted.before.value, label).toBe(line0);
    expect(
      inForceAtLevel(api, { kind: "budget-line", line }, body.expected)
        .recordId,
      label,
    ).toBe(budget.id);
    const decided = voteThrough(api, core, body, bill);
    if (required)
      expect(ENACTED, `${label}: budget bill ${decided.status}`).toContain(
        decided.status,
      );
    if (ENACTED.includes(decided.status)) {
      const now = budgetInForce(api, body.treasury)!;
      expect(now.id, label).toBe(budget.id);
      expect(
        now.spendingMinor[line],
        `${label}: the bill changed ${line}`,
      ).toBe(line0 + delta);
      expect(now.adoptedBy, label).toContain(`amended by ${decided.number}`);
      const paper = billSections(api, billOf(api, bill.id))[0]!;
      expect(paper.before, `${label}: paper before`).toEqual(drafted.before);
      expect(paper.after, `${label}: paper after`).toEqual(drafted.after);
      expect(billOf(api, bill.id).wasInForce, label).toHaveLength(1);
      lines.push(
        `budget-line bill ${decided.number} (${line}) ${decided.status} into ${now.id}: card ${card.inForce}, paper ${drafted.before.value} to ${drafted.after.value}, the line is now ${now.spendingMinor[line]}, and the decided paper still reads ${paper.before.value} to ${paper.after.value}`,
      );
    } else lines.push(`budget-line bill ${decided.status}: not enacted here`);
  }

  // A law-amount bill: once its row has taken effect, the live law is the
  // bill's own, and a paper that read it live would say "X to X".
  const series = "property-tax";
  const row0 = ownRow(api, series, body);
  const value = (row0?.value ?? 0) + 0.25;
  const law = draftBill(api, {
    bodyOfficeId: body.officeId,
    sponsorId: body.sponsorId,
    provisions: [{ kind: "law-amount", series, value, unit: "percent" }],
  });
  const was = billSections(api, law)[0]!;
  expect(was.before.lawId, label).toBe(row0?.id ?? null);
  const passed = voteThrough(api, core, body, law);
  if (required)
    expect(ENACTED, `${label}: ${series} bill ${passed.status}`).toContain(
      passed.status,
    );
  if (!ENACTED.includes(passed.status)) {
    lines.push(`${series} bill ${passed.status}: not enacted here`);
    return lines;
  }
  const made = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  ).find((r) => r.terms?.enactedByBill === law.id);
  expect(made, `${label}: the law row the bill wrote`).toBeDefined();
  if (made!.effectiveDate >= core.date)
    advanceCore(core, addDays(makeIsoDate(made!.effectiveDate), 1));
  expect(
    ownRow(api, series, body)?.id,
    `${label}: the bill's own row is now the law in force`,
  ).toBe(made!.id);
  const paper = billSections(api, billOf(api, law.id))[0]!;
  expect(paper.before, `${label}: paper before`).toEqual(was.before);
  expect(paper.after, `${label}: paper after`).toEqual(was.after);
  expect(paper.before.value, label).not.toBe(paper.after.value);
  lines.push(
    `${series} bill ${passed.number} ${passed.status}, law ${made!.id} in force on ${core.date}: paper before ${paper.before.value} (${paper.before.lawId ?? "no law"}) after ${paper.after.value}, as drafted`,
  );
  return lines;
}

const describeCheck = (c: Check) =>
  `${c.what}: card ${c.card}, paper ${c.paper}, record ${c.recordId ?? "none (no law there)"}`;

function checkWorld(
  name: string,
  placeKey: string,
  worldSeed: string,
  options: {
    /** Pass bills in this world and read their papers after (the body kinds to try, in order). */
    readonly enact?: readonly Kind[];
    /** Give up, with null, where the world seats no body of this kind. */
    readonly need?: Kind;
  } = {},
): { readonly report: string; readonly checks: readonly Check[] } | null {
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
  const bodies = (["state", "council", "county", "township"] as const).flatMap(
    (kind) => {
      const body = bodyOfKind(api, kind);
      if (!body) lines.push(`no ${kind} body here`);
      return body ? [body] : [];
    },
  );
  if (options.need && !bodies.some((b) => b.kind === options.need)) return null;
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
    const stance = checkStance(api, where, body);
    if (stance) lines.push(stance);

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
              : body.kind,
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
  for (const kind of options.enact ?? []) {
    const body = bodies.find((b) => b.kind === kind);
    if (body) lines.push(...checkEnacted(api, core, where, body));
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

/** Towns with no municipality and a township over them, in Midwestern and New England states. */
function drawTownshipPlaces(count: number) {
  const place = drawPlace(`${seed}:township`, "bill-level-in-force");
  const states = [
    "US-MI",
    "US-OH",
    "US-PA",
    "US-NJ",
    "US-NY",
    "US-WI",
    "US-IN",
    "US-IL",
    "US-ME",
    "US-NH",
    "US-VT",
    "US-MA",
    "US-CT",
  ];
  const state = states[parseInt(place.seed.slice(0, 8), 16) % states.length]!;
  const own = [...placeLocalities(state)]
    .sort((a, b) => a.key.localeCompare(b.key))
    .filter((l) => {
      const units = placeLocalGovernmentUnits(corePlaceByKey(l.key));
      return units.municipal.length === 0 && units.townships.length > 0;
    });
  const start = parseInt(place.seed.slice(8, 16), 16) % own.length;
  return Array.from({ length: count }, (_, i) => {
    const locality = own[(start + i * 7) % own.length]!;
    return { name: locality.displayName, key: locality.key, seed: place.seed };
  });
}

it(`a bill's draft card and paper read one value for the government the bill makes law for, by record (seed ${seed})`, () => {
  setBookkeeping(false);
  const report: string[] = [];
  const must = <T>(value: T | null, what: string): T => {
    expect(value, what).not.toBeNull();
    return value!;
  };
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "bill-level-in-force");
    report.push(
      must(checkWorld(place.name, place.key, place.seed), place.name).report,
    );
  }
  // Brookside, Delaware: the state's rate, the county's and the town's are what the
  // screens show, never the federal 37%, and a state with no estate tax shows none.
  const brookside = must(
    checkWorld(BROOKSIDE.name, BROOKSIDE.key, BROOKSIDE.seed),
    "Brookside",
  );
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
  const counties = must(
    checkWorld(county.name, county.key, county.seed, { enact: ["county"] }),
    county.name,
  );
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
  expect(counties.report, "the stance of a county's cut").toContain(
    "stance on",
  );
  report.push(counties.report);
  // A township board in a town with no municipality: its budget lines are
  // its treasury's, keyed by the town's place, and its bills amend that budget.
  let township: ReturnType<typeof checkWorld> = null;
  for (const place of drawTownshipPlaces(3)) {
    township = checkWorld(place.name, place.key, place.seed, {
      need: "township",
      enact: ["township"],
    });
    if (township) break;
  }
  const seated = must(township, "a drawn township with a board seated");
  const lineCheck = seated.checks.find(
    (c) => c.what.startsWith("budget line") && c.what.endsWith("(township)"),
  );
  expect(lineCheck, "the township board's budget-line bill").toBeDefined();
  expect(lineCheck!.recordId, "the township's budget").toMatch(
    /^budget:place:/,
  );
  expect(lineCheck!.card, "the township's line on the card").toBe(
    lineCheck!.paper,
  );
  expect(seated.report, "the township's bills were passed").toContain(
    "into budget:place:",
  );
  report.push(seated.report);
  process.stdout.write(`BILL-LEVEL ${report.join("\n")}\n`);
}, 1_800_000);
