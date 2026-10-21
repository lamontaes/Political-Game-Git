/** Unplanned pregnancies and the decision, read in a drawn place's played world. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { ABORTION_LAW_SERIES, decideUnplanned } from "./births-unplanned";
import type { BirthCouple } from "./births-plan";
import { lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

it("an unplanned pregnancy is decided from her records and the law in force where she lives", () => {
  const draw = drawPlace(
    randomBytes(32).toString("hex"),
    "unplanned-pregnancy",
  );
  setBookkeeping(false);
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const renewal = api.moduleState(RENEWAL_MODULE_ID);
  const law = lawInForce(api, ABORTION_LAW_SERIES);
  const label = `${draw.key} seed ${draw.seed}`;
  // Every unplanned plan cites the law record in force, and carries or ends by her scores.
  const plans = renewal
    .table("plans")
    .rows()
    .filter((row) => row.unplanned === true);
  for (const plan of plans) {
    expect(plan.lawId, label).toBe(
      lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing?.id ??
        null,
    );
    const decision = (
      plan.decisions as unknown as Array<{
        continues: boolean;
        scores: { continue: number; end: number };
      }>
    )[0]!;
    expect(decision.continues, label).toBe(
      decision.scores.continue >= decision.scores.end,
    );
  }
  // The decision reads the law: the same couple weighs a longer trip where it restricts.
  const couple = renewal
    .table("couples")
    .rows()
    .find((c) => c.status === "active");
  if (couple) {
    const decision = decideUnplanned(api, couple as unknown as BirthCouple);
    expect(decision.restricted, label).toBe((law.value ?? 0) > 0);
    expect(decision.lawId, label).toBe(law.governing?.id ?? null);
  }

  // Exposure is a carried total: bring every waiting couple to a whole unit, so the
  // next review (within a quarter) must settle each one by her own scores.
  const waiting = renewal
    .table("couples")
    .rows()
    .filter(
      (c) =>
        c.status === "active" &&
        renewal
          .table("pregnancies")
          .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
    );
  // One waiting couple's mother is the player: her household never has one
  // (owner ruling), while every other waiting couple's next review settles it.
  expect(waiting.length, `${label}: waiting couples`).toBeGreaterThan(1);
  const mine = waiting[0]!;
  core.playerId = String(mine.motherId) as typeof core.playerId;
  const home = core.people.get(core.playerId!)!.householdId;
  const switched = core.date;
  for (const c of waiting)
    renewal.table("exposure").put({ id: c.id, carry: 1 });
  const before = plans.length;
  advanceCore(core, addDays(makeIsoDate(core.date), 100));
  const after = renewal
    .table("plans")
    .rows()
    .filter((row) => row.unplanned === true);
  expect(after.length, label).toBeGreaterThan(before);
  for (const plan of after.filter((row) => String(row.date) >= switched)) {
    expect(plan.coupleId, label).not.toBe(mine.id);
    for (const id of [plan.motherId, plan.otherParentId])
      expect(
        id && core.people.get(String(id))?.householdId,
        `${label}: ${String(plan.id)} is in the player's household`,
      ).not.toBe(home);
  }
  for (const plan of after) {
    expect(plan.lawId, label).toBe(
      lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing?.id ??
        null,
    );
    const pregnancy = renewal.table("pregnancies").get(`${plan.id}:pregnancy`);
    if (pregnancy?.status === "ended") {
      const trip = (
        plan.decisions as unknown as Array<{ travelMinor: number }>
      )[0]!.travelMinor;
      expect(Number(pregnancy.paidMinor), label).toBeGreaterThanOrEqual(0);
      expect(Number(pregnancy.paidMinor), label).toBeLessThanOrEqual(trip);
    }
    expect(
      renewal.table("pregnancies").get(`${plan.id}:pregnancy`)?.status,
      label,
    ).toMatch(/pregnant|ended|delivered/);
  }
}, 900_000);
