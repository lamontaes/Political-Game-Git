import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  amendBudget,
  budgetsOf,
  governments,
  putBudget,
} from "../core2/modules/budgets";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

function budgetVisitWorld() {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(
    "79fd128d42b1a599b62573d62451eafcad97b83f8ffd48db7c91ea95058921b7",
    gameStartDate(),
    { twoLevel: true, placeKey: "2128900" },
  );
  const api = coreAPI(core);
  const city = governments(api).find((g) => g.level === "city")!;
  const mayor = townSeats(api).find((s) => s.office.kind === "mayor")!.holder!
    .personId;
  core.focusPersonIds.add(mayor);
  director.watch(core, mayor);
  return { core, director, api, city, mayor };
}

it("the fire chief explains the original vote after a second amendment changes the same line", () => {
  const { core, director, api, city, mayor } = budgetVisitWorld();
  const budget = budgetsOf(api, city.id).at(-1)!;
  const cut = Math.round(budget.spendingMinor.fire * 0.05);
  const amend = (deltaMinor: number, measureId: string) =>
    amendBudget(api, {
      governmentId: city.id,
      line: "fire",
      deltaMinor,
      measureId,
    });
  const amended = amend(-cut, "fixture-city-cut")!;
  const causeId =
    "budget-line-changed:" + amended.id + ":fire:fixture-city-cut";
  const revised = amend(Math.floor(cut / 3), "fixture-restore")!;
  expect(revised.spendingMinor.fire).toBeGreaterThan(
    amended.spendingMinor.fire,
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  director.stageDoors(core, mayor);
  const book = director.ledger.people.get(mayor)!;
  const visit = book.schedule.find(
    (s) =>
      book.momentsById.get(s.momentId)?.causeId === causeId &&
      s.bindings.some((b) => b.typeKey === "budget-cut"),
  );
  expect(visit).toBeDefined();
  const result = purposeScene(core, director, mayor, visit!, {
    typeKey: "budget-cut",
  });
  expect(result?.kind).toBe("composed");
  if (result?.kind === "composed") {
    expect(result.scene.facts.map((fact) => fact.key)).not.toContain(
      "budget-line-highways",
    );
    expect(result.scene.talk.state.text).not.toContain("$180,000");
    expect(
      result.scene.talk.tree.replies.map((reply) => reply.line.move),
    ).toEqual(expect.arrayContaining(["ask", "agree", "refuse", "bargain"]));
    expect(result.scene.facts).toEqual(
      expect.arrayContaining([
        {
          key: "budget-line-fire",
          text: "fire protection",
          recordIds: [causeId],
        },
        { key: "original-percent", text: "5", recordIds: [causeId] },
        { key: "original-cut", text: "$180,000", recordIds: [causeId] },
        {
          key: "still-needed",
          text: "$120,000",
          recordIds: [causeId, amended.id],
        },
        {
          key: "restored-amount",
          text: "$60,000",
          recordIds: [causeId, amended.id],
        },
        { key: "remaining-funds", text: "$3,400,000", recordIds: [causeId] },
      ]),
    );
  }
  amend(cut - Math.floor(cut / 3), "fixture-restore-rest");
  expect(
    purposeScene(core, director, mayor, visit!, { typeKey: "budget-cut" })
      ?.kind,
  ).toBe("skipped");
}, 120_000);

it("the director stops describing the road account as empty when a later vote refills it", () => {
  const { core, director, api, city, mayor } = budgetVisitWorld();
  const budget = budgetsOf(api, city.id).at(-1)!;
  const amendRoads = (deltaMinor: number, measureId: string) =>
    amendBudget(api, {
      governmentId: city.id,
      line: "highways",
      deltaMinor,
      measureId,
    })!;
  const amount = budget.spendingMinor.highways;
  expect(amount).toBeGreaterThan(1);
  const cut = amendRoads(-amount, "fixture-empty-roads");
  const causeId =
    "budget-line-changed:" + cut.id + ":highways:fixture-empty-roads";
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  director.stageDoors(core, mayor);
  const book = director.ledger.people.get(mayor)!;
  const visit = book.schedule.find(
    (entry) =>
      book.momentsById.get(entry.momentId)?.causeId === causeId &&
      entry.bindings.some((binding) => binding.typeKey === "budget-cut"),
  );
  expect(visit).toBeDefined();
  const scene = () => {
    const result = purposeScene(core, director, mayor, visit!, {
      typeKey: "budget-cut",
    });
    if (result?.kind !== "composed")
      throw new Error("Expected the public works director to visit");
    return result.scene;
  };
  const empty = scene();
  expect(empty.facts).toContainEqual({
    key: "empty-appropriation",
    text: "$0",
    recordIds: [causeId, cut.id],
  });
  const tenure = empty.facts.find(
    (fact) => fact.key === "inherited-budget-year",
  );
  expect(tenure?.text).toBe(String(budget.fiscalYear));
  expect(tenure?.recordIds).toContain(budget.id);
  const appointment = core.durableLog.get(tenure!.recordIds[0]!)!;
  expect(appointment.kind).toBe("official-appointed");
  expect(appointment.facts?.appointee).toBe(empty.askerId);
  // Older saves can have the holder on file without the original appointment event.
  core.durableLog.delete(appointment.id);
  try {
    expect(
      scene().facts.some((fact) => fact.key === "inherited-budget-year"),
    ).toBe(false);
  } finally {
    core.durableLog.set(appointment.id, appointment);
  }
  // The records cannot establish which happened first on the same day.
  putBudget(api, { ...cut, adoptedOn: appointment.date });
  try {
    expect(
      scene().facts.some((fact) => fact.key === "inherited-budget-year"),
    ).toBe(false);
  } finally {
    putBudget(api, cut);
  }
  const half = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 2,
  }).format(amount / 200);
  expect(empty.facts).toEqual(
    expect.arrayContaining([
      {
        key: "budget-year",
        text: String(budget.fiscalYear),
        recordIds: [causeId, cut.id],
      },
      { key: "half-restoration", text: half, recordIds: [causeId, cut.id] },
    ]),
  );
  expect(
    empty.talk.tree.replies.find((reply) => reply.line.move === "bargain")?.line
      .text,
  ).toContain(half);
  expect(empty.talk.state.placed?.needs).toContain("empty-appropriation");
  amendRoads(1, "fixture-restore-one-cent");
  const refilled = scene();
  expect(
    refilled.facts.some((fact) =>
      ["empty-appropriation", "half-restoration", "budget-year"].includes(
        fact.key,
      ),
    ),
  ).toBe(false);
  expect(refilled.talk.state.placed?.needs).not.toContain(
    "empty-appropriation",
  );
}, 120_000);
