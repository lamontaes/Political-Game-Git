import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { amendBudget, budgetsOf, governments } from "../core2/modules/budgets";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

it("the fire chief explains the original vote after a second amendment changes the same line", () => {
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
