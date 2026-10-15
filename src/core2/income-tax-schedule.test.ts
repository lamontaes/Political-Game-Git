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
