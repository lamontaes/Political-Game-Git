import { expect, it } from "vitest";
import { createLifeCore, advanceCore } from "./life";
import { coreAPI } from "./state";
import { worldCoreData } from "./modules/world";
import { lawInForce, openLaws } from "./modules/laws";
import { incomeTaxAct } from "./law-reach/group-b-money";
import { reachParameter } from "./law-reach/group-b-people";
import { addDays, makeIsoDate } from "./kernel/dates";

// A vote that ends a place's graduated income tax writes a flat tax at that
// place's own old top rate times the median share real conversions chose.
// Pinned to Los Angeles, California (place 0644000, seed flat-repeal-1),
// whose state income tax is graduated.
it("ending a graduated income tax writes the place's own top rate times the conversion share (place 0644000, seed flat-repeal-1)", () => {
  const core = createLifeCore(
    {
      seed: "flat-repeal-1",
      startedAt: "2026-10-15",
      people: [],
      households: [],
      organizations: [],
      jobs: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
      placeMetadata: { placeKey: "0644000" },
    },
    { data: worldCoreData(), modules: [], scheduledWork: false },
  );
  openLaws(core);
  const api = coreAPI(core);
  const state = () =>
    lawInForce(api, "income-tax").levels.find((l) => l.level === "state")!.row!;
  const old = state();
  expect(old.value, "California's top rate").toBeGreaterThan(10);
  expect(old.terms?.schedules, "graduated at the opening").toBeDefined();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  incomeTaxAct(api, {
    key: "us-policy-positions:fiscal.graduated-income-tax",
    level: "state",
    lawId: "fixture:flat-repeal",
    enacting: false,
    graduated: true,
  });
  const flat = state();
  expect(flat.id).not.toBe(old.id);
  expect(flat.unit).toBe("percent-flat");
  expect(flat.terms?.schedules).toBeUndefined();
  expect(flat.value).toBe(
    Math.round(
      old.value! * reachParameter("graduatedRepealFlatShareOfTopRate") * 1000,
    ) / 1000,
  );
  // Not the one national rate every place used to get.
  expect(flat.value).not.toBe(reachParameter("stateFlatIncomeTaxPercent"));
});
