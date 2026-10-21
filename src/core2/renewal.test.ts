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

const PLACES = 4;

type Decision = {
  continues: boolean;
  restricted: boolean;
  lawId: string | null;
  miles: number;
  travelMinor: number;
  scores: { continue: number; end: number };
};

/**
 * Drawn places play a year each. A year's own exposure gives few full-tier
 * unplanned pregnancies (none in three drawn towns with 28 couples between
 * them), so after the year every waiting couple outside the player's home is
 * brought to a whole unit of exposure and the engine's next review decides
 * and pays for each. Draws continue, bounded, until one plan was decided and
 * one ended with its trip paid; a miss names every place tried.
 */
it(
  "an unplanned pregnancy is decided from her records, the law in force and the miles where she lives",
  () => {
    const tried: string[] = [];
    let decided = 0;
    let paid = 0;
    for (let n = 0; n < PLACES && (decided === 0 || paid === 0); n++) {
      const draw = drawPlace(
        randomBytes(32).toString("hex"),
        `unplanned-pregnancy:${n}`,
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      const unplanned = () =>
        renewal
          .table("plans")
          .rows()
          .filter((row) => row.unplanned === true);
      const natural = unplanned().length;
      const playerHome = core.people.get(core.playerId!)?.householdId;
      for (const c of renewal.table("couples").rows())
        if (
          c.status === "active" &&
          core.people.get(String(c.motherId))?.householdId !== playerHome &&
          renewal
            .table("pregnancies")
            .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0
        )
          renewal.table("exposure").put({ id: c.id, carry: 1 });
      advanceCore(core, addDays(makeIsoDate(core.date), 100));
      const miles = (
        providerDistance.places as unknown as Record<
          string,
          { milesBefore: { miles: number }; milesNow: { miles: number } }
        >
      )[draw.state]!;
      const plans = unplanned();
      let paidHere = 0;
      for (const plan of plans) {
        const where = `${label} ${plan.id}`;
        // Nothing unplanned ever happens in the player's own household.
        expect(
          core.people.get(String(plan.motherId))?.householdId,
          where,
        ).not.toBe(playerHome);
        // The plan cites the law record in force that day, and she carries or ends by her scores.
        const law = lawInForce(api, ABORTION_LAW_SERIES, String(plan.date));
        expect(plan.lawId, where).toBe(law.governing?.id ?? null);
        const decision = (plan.decisions as unknown as Decision[])[0]!;
        expect(decision.continues, where).toBe(
          decision.scores.continue >= decision.scores.end,
        );
        expect(decision.restricted, where).toBe((law.value ?? 0) > 0);
        // The trip is the miles recorded for her state, before or after a restriction.
        expect(decision.miles, where).toBe(
          decision.restricted ? miles.milesNow.miles : miles.milesBefore.miles,
        );
        // The couple's own decision reads the same law and the same miles.
        const couple = renewal.table("couples").get(String(plan.coupleId));
        expect(couple, where).toBeDefined();
        const again = decideUnplanned(
          api,
          couple as unknown as BirthCouple,
          String(plan.date),
        );
        expect(again.lawId, where).toBe(decision.lawId);
        expect(again.miles, where).toBe(decision.miles);
        const pregnancy = renewal
          .table("pregnancies")
          .get(`${plan.id}:pregnancy`);
        expect(pregnancy?.status, where).toMatch(
          decision.continues ? /pregnant|delivered/ : /ended/,
        );
        if (!decision.continues) {
          const trip = Number(pregnancy!.paidMinor);
          expect(trip, where).toBeLessThanOrEqual(decision.travelMinor);
          if (trip > 0) {
            paidHere += 1;
            process.stdout.write(
              `unplanned trip paid: ${where} paid ${trip} of ${decision.travelMinor}, ${decision.miles} miles, law ${decision.lawId}\n`,
            );
          }
        }
      }
      decided += plans.length;
      paid += paidHere;
      tried.push(
        `${label}: ${natural} unplanned in the year, ${plans.length} in all, ${paidHere} ended with a paid trip`,
      );
    }
    process.stdout.write(`unplanned draws: ${tried.join("; ")}\n`);
    expect(
      decided,
      `no unplanned decision: ${tried.join("; ")}`,
    ).toBeGreaterThan(0);
    expect(
      paid,
      `no ended pregnancy with a paid trip: ${tried.join("; ")}`,
    ).toBeGreaterThan(0);
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container (three towns); up to PLACES of them and 100 days more each.
  },
  PLACES * 300_000,
);

/**
 * The player's own household is left out: the player plays as the mother of
 * a waiting couple, the couple is brought to a whole unit of exposure, and
 * the review settles it with no plan and leaves the exposure unspent.
 */
it(
  "never puts an unplanned pregnancy in the player's own household",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const draw = drawPlace(
        randomBytes(32).toString("hex"),
        `unplanned-player-home:${n}`,
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      // Couples are formed at their first review, within the first month.
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const waiting = renewal
        .table("couples")
        .rows()
        .find(
          (c) =>
            c.status === "active" &&
            core.people.has(String(c.motherId)) &&
            renewal
              .table("pregnancies")
              .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
        );
      tried.push(`${label}: ${waiting ? waiting.id : "no waiting couple"}`);
      if (!waiting) continue;
      core.playerId = String(waiting.motherId);
      const playerHome = core.people.get(core.playerId)!.householdId;
      renewal.table("exposure").put({ id: waiting.id, carry: 1 });
      advanceCore(core, addDays(makeIsoDate(core.date), 100));
      const atHome = renewal
        .table("plans")
        .rows()
        .filter(
          (row) =>
            row.unplanned === true &&
            core.people.get(String(row.motherId))?.householdId === playerHome,
        );
      expect(atHome, label).toEqual([]);
      expect(
        Number(renewal.table("exposure").get(waiting.id)?.carry),
        `${label} ${waiting.id} is never reviewed into a pregnancy`,
      ).toBe(1);
      process.stdout.write(
        `player home left out: ${label}; couple ${waiting.id}; player ${core.playerId}\n`,
      );
      return;
    }
    throw new Error(`no waiting couple to play as: ${tried.join("; ")}`);
    // A drawn town built in 4 to 44 seconds and plays 130 days in about a
    // third of a year's 36 to 184 seconds; up to PLACES of them.
  },
  PLACES * 120_000,
);
