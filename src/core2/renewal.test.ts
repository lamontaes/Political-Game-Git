/** Unplanned pregnancies and the decision, read in a drawn place's played world. */
import { createHash, randomBytes } from "node:crypto";
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

const PLACES = 4;
const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface Decision {
  continues: boolean;
  scores: { continue: number; end: number };
  travelMinor: number;
}

it(
  "an unplanned pregnancy is decided from her records and the law in force where she lives",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:${n}`).digest("hex"),
        "unplanned-pregnancy",
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name}, ${draw.state} (${draw.key}), seed ${draw.seed}`;
      // A played year through the ordinary producers: no fixture fills anything in.
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const plans = renewal
        .table("plans")
        .rows()
        .filter((row) => row.unplanned === true);
      const couples = renewal
        .table("couples")
        .rows()
        .filter((c) => c.status === "active");
      tried.push(
        `${label}: ${plans.length} unplanned plans, ${couples.length} active couples`,
      );
      // Nothing unplanned ever happens in the player's own household.
      const playerHome = core.people.get(core.playerId!)?.householdId;
      for (const plan of plans)
        expect(
          core.people.get(String(plan.motherId))?.householdId,
          `${label} ${plan.id}`,
        ).not.toBe(playerHome);
      if (!plans.length || !couples.length) continue;
      // Every unplanned plan cites the law record in force on its date, and
      // carries or ends by her own scores; an ended one pays her trip.
      let ended = 0;
      for (const plan of plans) {
        expect(plan.lawId, `${label} ${plan.id}`).toBe(
          lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing
            ?.id ?? null,
        );
        const decision = (plan.decisions as unknown as Decision[])[0]!;
        expect(decision.continues, `${label} ${plan.id}`).toBe(
          decision.scores.continue >= decision.scores.end,
        );
        const pregnancy = renewal
          .table("pregnancies")
          .get(`${plan.id}:pregnancy`);
        expect(pregnancy, `${label} ${plan.id}`).toBeDefined();
        expect(pregnancy!.status, `${label} ${plan.id}`).toBe(
          decision.continues ? pregnancy!.status : "ended",
        );
        if (pregnancy!.status !== "ended") continue;
        ended += 1;
        expect(
          Number(pregnancy!.paidMinor),
          `${label} ${plan.id}`,
        ).toBeLessThanOrEqual(decision.travelMinor);
        if (decision.travelMinor > 0)
          expect(
            Number(pregnancy!.paidMinor),
            `${label} ${plan.id}: the trip is paid`,
          ).toBeGreaterThan(0);
      }
      // The decision reads the law: an active couple weighs the trip the law in force sets.
      const law = lawInForce(api, ABORTION_LAW_SERIES);
      const decision = decideUnplanned(
        api,
        couples[0] as unknown as BirthCouple,
      );
      expect(decision.restricted, label).toBe((law.value ?? 0) > 0);
      expect(decision.lawId, label).toBe(law.governing?.id ?? null);
      const plan = plans[0]!;
      const first = (plan.decisions as unknown as Decision[])[0]!;
      const pregnancy = renewal
        .table("pregnancies")
        .get(`${plan.id}:pregnancy`)!;
      process.stdout.write(
        `UNPLANNED ${label}: ${plans.length} unplanned plans (${ended} ended); ${plan.motherId}'s ${plan.id} on ${String(plan.date)}, ${first.continues ? "carried" : "ended"} (continue ${first.scores.continue.toFixed(3)}, end ${first.scores.end.toFixed(3)}), law ${String(plan.lawId)}, ${pregnancy.id} ${String(pregnancy.status)}${pregnancy.status === "ended" ? ` paid ${String(pregnancy.paidMinor)} of ${first.travelMinor}` : ""}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had an unplanned pregnancy and an active couple in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // The run that found Leeds, Utah spent 566 seconds in its tests on a 4-core container (about 5 minutes a drawn year); up to PLACES of them.
  },
  PLACES * 400_000,
);
