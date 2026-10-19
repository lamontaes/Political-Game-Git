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
  advanceCore(core, addDays(makeIsoDate(core.date), 365 * 2));
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
}, 600_000);
