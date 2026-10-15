/**
 * SNAP in the played world, in a drawn place: the federal treasury pays an
 * eligible named household the allotment the law's table and its own income
 * give, pays the town's counted households together, every household poor
 * enough is paid, and the work requirement takes a household every member of
 * which it covers off the program after its time limit.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { governments } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";
import {
  ASSISTANCE_MODULE_ID,
  benefitDollars,
  snapBenefits,
  unearnedDollars,
} from "./modules/assistance";
import {
  forgetTownFacts,
  selectResidents,
  townFacts,
} from "./law-reach/group-b-people";
import { groupBPolicy } from "./law-reach/group-b";
import type { CoreState } from "./types";

const WORK =
  "us-policy-positions:health-human-services.work-requirement-for-assistance";

function termsOf(core: CoreState) {
  const row = lawInForce(coreAPI(core), "snap-maximum").governing!;
  const t = row.terms as {
    byHouseholdSize: Record<string, number>;
    additionalPerson: number;
  };
  return {
    lawId: row.id,
    bySize: t.byHouseholdSize,
    additionalPerson: t.additionalPerson,
    source: { tag: "SOURCED", asOf: core.date, citation: row.id },
  } as never;
}

it("pays the table's allotment to the poor, counts the rest of the town together, and the work requirement ends it for covered households", () => {
  const seed = randomBytes(32).toString("hex");
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const draw = drawPlace(seed, `snap:${attempt}`);
      let core: CoreState;
      try {
        ({ core } = buildBenchWorld(draw.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: draw.key,
        }));
      } catch (error) {
        if (/holds a resident aged/.test(String(error))) continue;
        throw error;
      }
      const api = coreAPI(core);
      const where = `seed ${draw.seed}, place ${draw.key}`;
      expect(core.modules.has(ASSISTANCE_MODULE_ID), where).toBe(true);
      // The reviews run on the third of the month: take each household's
      // figures the day before, and look at the program the day after.
      advanceCore(core, addDays(makeIsoDate(core.date), 41));
      expect(core.date.slice(8), where).toBe("02");
      const chain0 = lawChain(api);
      forgetTownFacts(api);
      const snapshot = new Map(
        [...townFacts(api, chain0.townPlaceId).households.values()].map(
          (h) => [h.id, h] as const,
        ),
      );
      const unearnedBefore = new Map(
        [...snapshot.keys()].map((id) => [id, unearnedDollars(core, id)]),
      );
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      expect(core.date.slice(8), where).toBe("04");
      const fed = governments(api).find((g) => g.level === "federal")!;
      const live = () => snapBenefits(api).filter((r) => !r.endedOn);
      const chain = lawChain(api);
      const need = (householdId: string) => {
        const h = snapshot.get(householdId)!;
        const terms = termsOf(core);
        const dollars = benefitDollars({
          terms,
          stateKey: chain.stateKey,
          householdSize: h.size,
          unitSize: h.size,
          earnedDollars: h.incomeDollars,
          unearnedDollars: unearnedBefore.get(h.id)!,
        });
        return {
          dollars,
          share:
            dollars /
            (terms as { bySize: Record<string, number> }).bySize[
              String(Math.min(h.size, 8))
            ]!,
        };
      };
      const paidHouseholds = new Map(
        live()
          .filter((r) => core.people.has(r.recipientId))
          .map((r) => [core.people.get(r.recipientId)!.householdId, r]),
      );
      // Each paid named household is owed by the federal treasury the table's
      // allotment its income gives (income drifts a little after the review).
      for (const [householdId, row] of paidHouseholds) {
        expect(row.governmentId, where).toBe(fed.id);
        const expected = 100 * need(householdId).dollars;
        expect(
          expected,
          `${where}: ${householdId} is not eligible`,
        ).toBeGreaterThan(0);
        expect(
          Math.abs(row.amountMinor - expected) / expected,
          `${where}: ${householdId}`,
        ).toBeLessThan(0.05);
        expect(
          api.accounts().obligation(row.obligationId)!.lastReceipt,
          `${where}: ${row.obligationId} never paid`,
        ).toBeDefined();
      }
      // A named household with nearly nothing to live on is always paid
      // (its benefit is most of the allotment), unless it runs a business,
      // whose owner's draw its record does not carry.
      const owners = new Set(
        (
          api.moduleState("business").table("owners").rows() as unknown as {
            ownerId: string;
          }[]
        ).map((r) => r.ownerId),
      );
      for (const household of snapshot.values()) {
        if (!household.named) continue;
        const members = core.households.get(household.id)!.memberIds;
        if (members.some((id) => owners.has(id))) continue;
        if (need(household.id).share < 0.7) continue;
        expect(
          paidHouseholds.has(household.id),
          `${where}: ${household.id} is poor enough and unpaid`,
        ).toBe(true);
      }
      // The counted households are paid together to the residents' account.
      const residentsOrg = residentsRuntime(core)?.input.accounts.find(
        (a) => a.placeId === chain.townPlaceId,
      )?.accountId;
      if (!paidHouseholds.size) continue;
      const counted = live().find((r) => r.recipientId === residentsOrg);
      if (snapshot.size > paidHouseholds.size && counted)
        expect(counted.households, where).toBeGreaterThan(0);
      expect(core.cashJournal.totals.grossDebitMinor).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
      // The work requirement: a named household every member of which it
      // covers, paid today.
      const people = groupBPolicy(WORK)!.people!;
      const fullyCovered = () => {
        forgetTownFacts(api);
        const f = townFacts(api, chain.townPlaceId);
        const by = new Map<string, number>();
        for (const r of selectResidents(f, people, chain.stateKey))
          by.set(r.householdId, (by.get(r.householdId) ?? 0) + 1);
        return [...by]
          .filter(([id, n]) => f.households.get(id)?.size === n)
          .map(([id]) => id)
          .filter((id) => f.households.get(id)!.named);
      };
      const target = fullyCovered().filter((id) => paidHouseholds.has(id));
      if (!target.length) continue;
      const state = chain.levels.find((l) => l.level === "state")!;
      enactLaw(api, {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: WORK,
        value: 1,
        effectiveDate: core.date,
        measureId: "test:snap-work",
        citation: "Controlled law case in a generated town.",
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 150));
      const stillPaid = new Set(
        live()
          .filter((r) => core.people.has(r.recipientId))
          .map((r) => core.people.get(r.recipientId)!.householdId),
      );
      const stillCovered = fullyCovered().filter((id) => target.includes(id));
      // A household that stayed covered the whole time is off the program;
      // one that found work in the meantime may still be on it.
      expect(
        stillCovered.length,
        `${where}: nobody stayed covered`,
      ).toBeGreaterThan(0);
      for (const id of stillCovered)
        expect(
          stillPaid.has(id),
          `${where}: ${id} still paid past the limit`,
        ).toBe(false);
      return;
    }
    throw new Error(
      `no town with a named SNAP household that the work requirement covers in 10 draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 2_700_000);
