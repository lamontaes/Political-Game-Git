/**
 * Housing and credit laws, wired end to end in one played world: each law is
 * read by the engine that applies it (lease renewal, the builders' monthly
 * decision, the eviction hearing, the loan quote, the monthly housing line),
 * records whom it reached, full and counted, with the money it moved, and a
 * repeal ends it. Places are drawn from all 56 by a random seed; a drawn
 * place with no subject for a law is redrawn and every place tried is named.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../tests/golden-path/place";
import { townFigures } from "./modules/housing";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import {
  appliedOn,
  LAW_APPLIED_TABLE,
  type LawAppliedRow,
} from "./law-reach/applied";
import { LAW_REACH_HOST_ID } from "./law-reach/host";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState } from "./types";
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };

const P = "us-policy-positions:";
const KEYS = {
  rent: `${P}housing-land-use.rent-stabilization`,
  inclusionary: `${P}housing-land-use.inclusionary-requirement`,
  multifamily: `${P}housing-land-use.allow-multifamily-in-single-family-zones`,
  counsel: `${P}housing-land-use.right-to-counsel-in-eviction`,
  gas: `${P}environment-energy.ban-new-gas-hookups`,
  farmland: `${P}agriculture-natural-resources.protect-farmland-from-development`,
  cap: `${P}business-commerce.cap-consumer-loan-rates`,
  housing: "budget-line:housing",
} as const;
const QUESTIONS = [
  KEYS.rent,
  KEYS.inclusionary,
  KEYS.multifamily,
  KEYS.counsel,
  KEYS.gas,
  KEYS.farmland,
  KEYS.cap,
];
/** A place with fewer renters than this has too few leases, evictions and loans to follow in a year. */
const MIN_RENTERS = 1500;
/** Long enough for a first lease anniversary, a hearing and a loan's first payments. */
const DAYS = Number(process.env.HOUSING_DAYS ?? 460);

const step = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

/** Put a question in force (or out of it everywhere it is yes) at the town's lowest level, effective tomorrow. */
function setQuestion(api: CoreAPI, key: string, value: 0 | 1): void {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const effectiveDate = addDays(makeIsoDate(api.state.date), 1);
  const chain = lawChain(api).levels;
  const enact = (level: string, jurisdiction: string) =>
    enactLaw(api, {
      jurisdiction,
      level: level as LawRowInput["level"],
      series: key,
      value,
      effectiveDate,
      measureId: `law-wiring-housing-${value}`,
      citation: "Law-wiring test",
    });
  if (value === 1) {
    const now = lawInForce(api, key);
    if (now.value === 1) return;
    // Where a row says no, a yes at the same level replaces it.
    if (now.governing)
      return void enact(now.governing.level, now.governing.jurisdiction);
    for (const level of ["city", "county", "state", "federal"]) {
      const at = chain.find((l) => l.level === level);
      if (at) return void enact(at.level, at.jurisdiction);
    }
    return;
  }
  for (const { level, jurisdiction } of chain) {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (latest?.value === 1) enact(level, jurisdiction);
  }
}

/** Every row an engine recorded for the key, current or ended by a later law row taking effect (the engine records the new one at its next read). */
const rowsOn = (api: CoreAPI, key: string): readonly LawAppliedRow[] =>
  (
    api
      .moduleState(LAW_REACH_HOST_ID)
      .table(LAW_APPLIED_TABLE)
      .rows() as unknown as LawAppliedRow[]
  ).filter((r) => r.key === key);

function runOnce(place: ReturnType<typeof drawPlace>): string[] {
  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(message);
  };
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  // The housing records open on the first day.
  step(core, 1);
  // A place needs renters, a landlord and borrowers to be a subject of these laws.
  const town = lawChain(api).townPlaceId;
  const renters = townFigures(api, town).renters;
  const landlords = [...core.organizations.values()].filter(
    (o) => o.id.startsWith("organization:landlord:") && o.placeId === town,
  ).length;
  const figures = townFigures(api, town);
  if (
    renters < MIN_RENTERS ||
    landlords < 1 ||
    !figures.homeValueMinor ||
    !figures.rentMinor
  )
    return [`no subject: ${renters} renters, ${landlords} landlords`];
  try {
    // A body in play may repeal one of these laws before an engine reads it (a council undoing rent
    // stabilization before any lease's anniversary); the test puts it back each month so every read happens under it.
    for (let day = 0; day < DAYS; day += 30) {
      for (const key of QUESTIONS) setQuestion(api, key, 1);
      step(core, Math.min(30, DAYS - day));
    }

    // Rent stabilization: every renewed lease under the law, full and counted.
    const renewals = (
      api.moduleState("housing").table("renewals").rows() as unknown as {
        id: string;
        householdId?: string;
        tier?: string;
        lawId?: string | null;
        savedMinor?: number;
      }[]
    ).filter((r) => r.lawId);
    const rent = rowsOn(api, KEYS.rent);
    check(renewals.length > 0, "no lease was renewed under rent stabilization");
    check(
      rent.length > 0 && rent.every((r) => r.engine === "housing"),
      "rent stabilization reached nobody",
    );
    for (const r of renewals.slice(0, 5))
      check(
        rent.some((row) => row.targetId === r.householdId),
        `renewal ${r.id} has no applied row`,
      );
    check(
      rent.some((r) => r.target === "household") ||
        rent.some((r) => r.target === "group"),
      "rent stabilization recorded no household",
    );
    check(
      rent.reduce((s, r) => s + r.amountMinor, 0) >=
        renewals.reduce((s, r) => s + Math.max(0, r.savedMinor ?? 0), 0),
      "rent held below market is not in the applied rows",
    );

    // Construction decision: the builders' organization carries each law.
    for (const [name, key, what] of [
      ["multifamily", KEYS.multifamily, "apartments-permitted"],
      ["inclusionary", KEYS.inclusionary, "set-aside-required"],
      ["gas", KEYS.gas, "all-electric-required"],
      ["farmland", KEYS.farmland, "land-restricted"],
    ] as const) {
      const rows = rowsOn(api, key);
      check(
        rows.some((r) => r.target === "organization" && r.what === what),
        `${name}: no builder organization recorded`,
      );
    }
    const projects = api
      .moduleState("housing")
      .table("projects")
      .rows() as unknown as {
      id: string;
      lawIds?: Record<string, string>;
      affordableUnits: number;
    }[];
    check(
      projects.some((p) => p.lawIds?.inclusionary && p.affordableUnits > 0),
      "no project started with set-aside units under the inclusionary law",
    );
    check(
      rowsOn(api, KEYS.inclusionary).some((r) => r.amountMinor > 0),
      "inclusionary moved no money (forgone rent)",
    );
    const setAside = (
      api.moduleState("housing").table("affordable").rows() as unknown as {
        householdId: string;
        projectId: string;
      }[]
    ).filter((a) =>
      projects.some((p) => p.id === a.projectId && p.lawIds?.inclusionary),
    );
    for (const a of setAside)
      check(
        rowsOn(api, KEYS.inclusionary).some(
          (r) => r.targetId === a.householdId,
        ),
        `set-aside tenant ${a.householdId} has no applied row`,
      );

    // Right to counsel: a hearing paid by the government.
    const cases = (
      api.moduleState("housing").table("cases").rows() as unknown as {
        id: string;
        householdId: string;
        counselLawId?: string | null;
        counselPaidMinor?: number;
        counselPayerId?: string;
      }[]
    ).filter((r) => r.counselLawId);
    check(cases.length > 0, "no eviction hearing had a lawyer");
    const counsel = rowsOn(api, KEYS.counsel);
    for (const row of cases.slice(0, 5)) {
      check(
        counsel.some(
          (r) => r.targetId === row.householdId && r.amountMinor > 0,
        ),
        `case ${row.id}: household has no applied row with money`,
      );
      check(
        counsel.some(
          (r) => r.target === "government" && r.targetId === row.counselPayerId,
        ),
        `case ${row.id}: paying government has no applied row`,
      );
      check(
        (row.counselPaidMinor ?? 0) > 0 &&
          counsel.some(
            (r) =>
              r.targetId === row.householdId &&
              r.amountMinor === row.counselPaidMinor,
          ),
        `case ${row.id}: the counsel payment was not paid, or not the one the household's row records`,
      );
    }

    // Loan quote: each household whose quote was capped, and the interest it did not owe.
    const cap = rowsOn(api, KEYS.cap);
    check(
      cap.some((r) => r.target === "household" || r.target === "group"),
      "the rate cap recorded no borrower",
    );
    // Interest is moved only where the market rate is above the ceiling (a cap at 36 percent binds no prime-based quote).
    check(
      cap.every((r) => r.amountMinor >= 0) &&
        cap.every((r) => r.what !== "interest-capped" || r.amountMinor > 0),
      "the rate cap recorded interest that was not capped",
    );

    // The housing line, raised after the year above: enough extra to cover a hundred vouchers. (Raised on day one it left the leases unrenewed under the law in a large town; see the report.)
    const gov =
      governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county") ??
      governments(api).find((g) => g.level === "state");
    check(Boolean(gov), "no government to fund the housing line");
    const delta =
      parameters.parameters.housingAssistanceAnnualMinor.value * 100;
    if (gov) {
      check(
        budgetsOf(api, gov.id).length > 0,
        `${gov.id} has no budget this year`,
      );
      amendBudget(api, {
        governmentId: gov.id,
        line: "housing",
        deltaMinor: delta,
        measureId: "law-wiring-housing-line",
      });
    }
    step(core, 100);
    const help = rowsOn(api, KEYS.housing);
    check(help.length > 0, "the housing line reached no household");
    check(
      help.some((r) => r.amountMinor > 0) &&
        help.some((r) => r.engine === "housing" && r.amountMinor > 0),
      "the housing line paid no assistance",
    );

    // Repeal ends every row and the assistance.
    for (const key of QUESTIONS) setQuestion(api, key, 0);
    step(core, 40);
    for (const [name, key] of Object.entries(KEYS)) {
      if (key === KEYS.housing) continue;
      const open = appliedOn(api, key);
      check(
        open.length === 0,
        `${name}: ${open.length} rows still open after repeal (${open[0]?.id})`,
      );
    }
  } finally {
    // Nothing to undo: the world is dropped.
  }
  return failures;
}

describe("housing and credit laws reach people and move money", () => {
  it("wires every law in a played world", () => {
    const base =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
    const bookkeepingBefore = setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let attempt = 0; attempt < 14; attempt++) {
        const place = drawPlace(`${base}:${attempt}`, "law-wiring-housing");
        let failures: string[];
        try {
          failures = runOnce(place);
        } catch (error) {
          throw new Error(
            `${place.name} (${place.key}, seed ${place.seed}): ${(error as Error).message}`,
            { cause: error },
          );
        }
        // Each attempt builds a whole world; collect the last one before the next (the run needs --expose-gc to do so, and is otherwise only slower).
        (globalThis as { gc?: () => void }).gc?.();
        if (!failures.length) return;
        tried.push(
          `${place.name} (${place.key}, seed ${place.seed}): ${failures.join("; ")}`,
        );
        // Only a place with no subject is redrawn; a played place that fails fails the test.
        if (!failures[0]!.startsWith("no subject")) break;
      }
      expect.fail(`seed ${base}\n${tried.join("\n")}`);
    } finally {
      setBookkeeping(bookkeepingBefore);
    }
  }, 900_000);
});
