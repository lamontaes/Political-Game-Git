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
        // Carried, it is a pregnancy or a birth; ended, it is ended.
        if (decision.continues)
          expect(["pregnant", "delivered"], `${label} ${plan.id}`).toContain(
            pregnancy!.status,
          );
        else expect(pregnancy!.status, `${label} ${plan.id}`).toBe("ended");
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

it(
  "an unplanned pregnancy she ends pays her trip from her household's cash, on the journal (named regression)",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n += 1) {
      const draw = drawPlace(
        createHash("sha256").update(`${base}:ended:${n}`).digest("hex"),
        "unplanned-ended",
      );
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const label = `${draw.name}, ${draw.state} (${draw.key}), seed ${draw.seed}`;
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      const renewal = api.moduleState(RENEWAL_MODULE_ID);
      const playerHome = core.people.get(core.playerId!)?.householdId;
      // Couples whose own decision, read now, would end a pregnancy at a cost.
      const ending = renewal
        .table("couples")
        .rows()
        .filter(
          (c) =>
            c.status === "active" &&
            core.people.get(String(c.motherId))?.householdId !== playerHome &&
            renewal
              .table("pregnancies")
              .query("byMotherStatus", [c.motherId, "pregnant"]).length === 0,
        )
        .map((c) => ({
          couple: c,
          decision: decideUnplanned(api, c as unknown as BirthCouple),
        }))
        .filter((x) => !x.decision.continues && x.decision.travelMinor > 0);
      tried.push(`${label}: ${ending.length} couples who would end one`);
      if (!ending.length) continue;
      // Their households are in focus, so the journal keeps their receipts.
      for (const { couple } of ending)
        for (const id of core.households.get(
          core.people.get(String(couple.motherId))!.householdId,
        )?.memberIds ?? [])
          core.focusPersonIds.add(id);
      // An edge fixture beside the ordinary case above: exposure is a carried
      // total, and only these couples are brought to a whole unit, so the next
      // review settles each by her own scores.
      for (const { couple } of ending)
        renewal.table("exposure").put({ id: couple.id, carry: 1 });
      const ids = new Set(ending.map((x) => String(x.couple.id)));
      const endedNow = () =>
        renewal
          .table("pregnancies")
          .rows()
          .find(
            (row) =>
              row.unplanned === true &&
              row.status === "ended" &&
              ids.has(String(row.coupleId)),
          );
      for (let day = 0; day < 100 && !endedNow(); day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const pregnancy = endedNow();
      if (!pregnancy) {
        tried.push(`${label}: none ended at the review`);
        continue;
      }
      const plan = renewal.table("plans").get(String(pregnancy.planId))!;
      const decision = (plan.decisions as unknown as Decision[])[0]!;
      expect(decision.continues, label).toBe(false);
      expect(plan.lawId, label).toBe(
        lawInForce(api, ABORTION_LAW_SERIES, String(plan.date)).governing?.id ??
          null,
      );
      const paid = Number(pregnancy.paidMinor);
      expect(paid, `${label}: ${String(pregnancy.id)} paid`).toBeGreaterThan(0);
      expect(paid, label).toBeLessThanOrEqual(decision.travelMinor);
      // The cash left her household on the journal, in the trip's own entries.
      const household =
        core.households.get(
          core.people.get(String(pregnancy.motherId))!.householdId,
        )?.memberIds ?? [];
      const journal = core.cashJournal;
      let left = 0;
      const receipts: string[] = [];
      for (const id of household)
        for (const entry of journal.detailedByOwner.get(id) ?? []) {
          const receipt = journal.detailedReceipts.get(entry);
          if (
            !receipt?.sourceRef.id.startsWith(`${String(pregnancy.id)}:trip:`)
          )
            continue;
          receipts.push(receipt.sourceRef.id);
          for (const posting of receipt.postings)
            if (posting.accountId === `cash:${id}:residual`)
              left -= posting.deltaMinor;
        }
      expect(left, `${label}: ${receipts.join(", ")}`).toBe(paid);
      process.stdout.write(
        `UNPLANNED ENDED ${label}: ${String(pregnancy.motherId)}'s ${String(pregnancy.id)} on ${String(plan.date)}, ended (continue ${decision.scores.continue.toFixed(3)}, end ${decision.scores.end.toFixed(3)}), law ${String(plan.lawId)}, trip ${decision.travelMinor} paid ${paid} in ${[...new Set(receipts)].join(", ")}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a couple who would end an unplanned pregnancy in ${PLACES} places (base ${base}): ${tried.join("; ")}`,
    );
    // Marquette, Kansas took under five minutes for its opening, month and review on a 4-core container.
  },
  PLACES * 300_000,
);
