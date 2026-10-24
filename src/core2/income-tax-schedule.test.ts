/** Controlled transitions: repeated reviews cannot undo a repeal or a later act. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { worldCoreData } from "./modules/world";
import { enactLaw, lawChain, lawInForce, openLaws } from "./modules/laws";
import { incomeTaxAct } from "./law-reach/group-b-money";
import { graduatedSchedule, reachParameter } from "./law-reach/group-b-people";
import { addDays, makeIsoDate } from "./kernel/dates";
import { withholdingFor } from "./tax-withholding";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };

it("keeps a starting schedule repealed through reviews and restores it once without overwriting another act", () => {
  const draw = drawPlace(
    randomBytes(32).toString("hex"),
    "income-tax-transition",
  );
  const core = createLifeCore(
    {
      seed: draw.seed,
      startedAt: "2026-10-15",
      people: [],
      households: [],
      organizations: [],
      jobs: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
      placeMetadata: { placeKey: draw.key },
    },
    { data: worldCoreData(), modules: [], scheduledWork: false },
  );
  openLaws(core);
  const api = coreAPI(core);
  const key = "us-policy-positions:fiscal.graduated-income-tax";
  const next = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const current = () =>
    lawInForce(api, "income-tax").levels.find((l) => l.level === "state")!.row!;
  const write = (value: number, terms?: Record<string, unknown>) =>
    enactLaw(api, {
      jurisdiction: lawChain(api).stateKey,
      level: "state",
      series: "income-tax",
      value,
      unit: terms ? "percent" : "percent-flat",
      effectiveDate: core.date,
      measureId: `fixture:${core.date}`,
      citation: "Controlled schedule transition fixture.",
      ...(terms ? { terms } : {}),
    });
  const schedule = graduatedSchedule("state");
  const original = write(Math.max(...schedule.brackets.map((b) => b.rate)), {
    schedules: { single: schedule },
  });
  next();
  const review = (enacting: boolean) =>
    incomeTaxAct(api, {
      key,
      level: "state",
      lawId: "fixture:graduated-policy",
      enacting,
      graduated: true,
    });
  review(false);
  const flat = current();
  expect(flat.value).toBe(reachParameter("stateFlatIncomeTaxPercent"));
  expect(flat.terms?.schedules).toBeUndefined();
  for (let i = 0; i < 3; i++) {
    next();
    review(false);
    expect(current().id).toBe(flat.id);
  }
  next();
  review(true);
  const restored = current();
  expect(restored.terms?.schedules).toEqual(original.terms?.schedules);
  for (let i = 0; i < 3; i++) {
    next();
    review(true);
    expect(current().id).toBe(restored.id);
  }
  next();
  review(false);
  const flatAgain = current();
  expect(flatAgain.terms?.schedules).toBeUndefined();
  next();
  review(false);
  expect(current().id).toBe(flatAgain.id);
  next();
  const independent = write(reachParameter("localFlatIncomeTaxPercent"));
  next();
  review(true);
  expect(current().id).toBe(independent.id);
  next();
  review(true);
  expect(current().id).toBe(independent.id);
  // A flat tax's deduction schedule is not a graduated tax.
  next();
  const flatTerms = {
    system: "flat",
    schedules: {
      single: {
        standardDeduction: schedule.standardDeduction,
        brackets: [
          { over: 0, rate: reachParameter("stateFlatIncomeTaxPercent") },
        ],
      },
    },
  };
  const scheduledFlat = write(
    reachParameter("stateFlatIncomeTaxPercent"),
    flatTerms,
  );
  const otherReview = (enacting: boolean) =>
    incomeTaxAct(api, {
      key: `${key}:controlled-flat`,
      level: "state",
      lawId: "fixture:flat-policy",
      enacting,
      graduated: true,
    });
  next();
  otherReview(false);
  expect(current().id).toBe(scheduledFlat.id);
  next();
  otherReview(true);
  expect(current().terms?.system).toBe("graduated");
  next();
  otherReview(false);
  expect(current().terms?.schedules).toEqual(flatTerms.schedules);
  const restoredFlat = current();
  next();
  otherReview(false);
  expect(current().id).toBe(restoredFlat.id);
  next();
  const laterGraduated = write(
    original.value!,
    original.terms as Record<string, unknown>,
  );
  next();
  otherReview(false);
  expect(current().id).toBe(laterGraduated.id);
});

it("keeps a territory's own income tax in place of the federal one when its legislature flattens it", () => {
  // A place drawn from all 56 whose starting income tax stands in place of
  // the federal one (26 U.S.C. 931 to 933), read from the law data.
  const jurisdictions = startingLaw.jurisdictions as unknown as Record<
    string,
    readonly { series?: string; terms?: { replacesFederal?: boolean } }[]
  >;
  const replaces = (state: string) =>
    (jurisdictions[state] ?? []).some(
      (row) =>
        row.series === "income-tax" && row.terms?.replacesFederal === true,
    );
  const base = randomBytes(16).toString("hex");
  let draw = drawPlace(base, "territory-income-tax");
  for (let n = 1; n < 400 && !replaces(draw.state); n++)
    draw = drawPlace(`${base}:${n}`, "territory-income-tax");
  expect(replaces(draw.state), `no territory in 400 draws (${base})`).toBe(
    true,
  );
  const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
  const core = createLifeCore(
    {
      seed: draw.seed,
      startedAt: "2026-01-05",
      people: [],
      households: [],
      organizations: [],
      jobs: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
      placeMetadata: { placeKey: draw.key },
    },
    { data: worldCoreData(), modules: [], scheduledWork: false },
  );
  openLaws(core);
  const api = coreAPI(core);
  const federalSetAside = () =>
    lawInForce(api, "income-tax").levels.find((l) => l.level === "federal")
      ?.setAside;
  const paycheck = () =>
    withholdingFor({
      paidMinor: 200_000,
      periodDays: 14,
      yearToDateMinor: 0,
      incomeTax: lawInForce(api, "income-tax"),
      socialSecurity: lawInForce(api, "social-security-tax"),
      medicare: lawInForce(api, "medicare-tax"),
    }).map((line) => `${line.level}:${line.tax}`);
  const opening = lawInForce(api, "income-tax").levels.find(
    (l) => l.level === "state",
  )!.row!;
  expect(federalSetAside(), where).toBeDefined();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  // Its legislature repeals the graduated tax: the act flattens it, as the
  // Northern Mariana Islands' SB 9 did in a played year (seed 0000cfeb...).
  incomeTaxAct(api, {
    key: "us-policy-positions:fiscal.graduated-income-tax",
    level: "state",
    lawId: "fixture:territory-flatten",
    enacting: false,
    graduated: true,
  });
  const flat = lawInForce(api, "income-tax").levels.find(
    (l) => l.level === "state",
  )!.row!;
  expect(flat.id, where).not.toBe(opening.id);
  expect(flat.value, where).toBe(reachParameter("stateFlatIncomeTaxPercent"));
  expect(federalSetAside(), `${where}: ${flat.id}`).toBeDefined();
  const lines = paycheck();
  expect(lines, where).not.toContain("federal:income");
  expect(lines, where).toContain("state:income");
  expect(lines, where).toContain("federal:social-security");
  expect(lines, where).toContain("federal:medicare");
  console.log(`TERRITORY ${where}: ${flat.id}, paycheck ${lines.join(", ")}`);
});
