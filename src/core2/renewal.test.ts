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
import providerDistance from "../../data/research/people/abortion-provider-distance.json" with { type: "json" };

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
  const playerHome = core.people.get(core.playerId!)?.householdId;
  const homeOf = (motherId: unknown) =>
    core.people.get(String(motherId))?.householdId;
  const everyWaiting = renewal
    .table("couples")
    .rows()
    .filter(
      (c) =>
        c.status === "active" &&
        renewal
          .table("pregnancies")
          .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
    );
  // The player's own household is brought to a whole unit too, to show it is left out.
  const waiting = everyWaiting.filter((c) => homeOf(c.motherId) !== playerHome);
  for (const c of everyWaiting)
    renewal.table("exposure").put({ id: c.id, carry: 1 });
  const before = plans.length;
  advanceCore(core, addDays(makeIsoDate(core.date), 100));
  const after = renewal
    .table("plans")
    .rows()
    .filter((row) => row.unplanned === true);
  if (waiting.length) expect(after.length, label).toBeGreaterThan(before);
  // Nothing unplanned ever happens in the player's own household.
  for (const plan of after)
    expect(homeOf(plan.motherId), `${label} ${plan.id}`).not.toBe(playerHome);
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

it("the trip in an unplanned decision is the miles recorded for the state where she lives", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const draw = drawPlace(
      randomBytes(32).toString("hex"),
      "unplanned-provider-distance",
    );
    tried.push(`${draw.key} seed ${draw.seed}`);
    setBookkeeping(false);
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    const renewal = api.moduleState(RENEWAL_MODULE_ID);
    const playerHome = core.people.get(core.playerId!)?.householdId;
    // Bring every waiting couple outside the player's home to a whole unit of exposure.
    for (const c of renewal.table("couples").rows())
      if (
        c.status === "active" &&
        core.people.get(String(c.motherId))?.householdId !== playerHome
      )
        renewal.table("exposure").put({ id: c.id, carry: 1 });
    advanceCore(core, addDays(makeIsoDate(core.date), 100));
    const plans = renewal
      .table("plans")
      .rows()
      .filter((row) => row.unplanned === true);
    if (!plans.length) continue;
    const row = (
      providerDistance.places as unknown as Record<
        string,
        { milesBefore: { miles: number }; milesNow: { miles: number } }
      >
    )[draw.state]!;
    for (const plan of plans) {
      const decision = (
        plan.decisions as unknown as Array<{
          miles: number;
          restricted: boolean;
        }>
      )[0]!;
      expect(decision.miles, `${draw.key} ${plan.id}`).toBe(
        decision.restricted ? row.milesNow.miles : row.milesBefore.miles,
      );
    }
    const first = plans[0]!;
    process.stderr.write(
      `provider distance: place ${draw.key} (${draw.state}) seed ${draw.seed} plan ${first.id} miles ${
        (first.decisions as unknown as Array<{ miles: number }>)[0]!.miles
      }\n`,
    );
    return;
  }
  throw new Error(
    `No unplanned decision in any drawn place: ${tried.join("; ")}`,
  );
}, 1_800_000);
