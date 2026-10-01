import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { enterLifePath } from "../../src/simulation/life-paths2";
import { settleTownCompensations } from "../../src/simulation/living-world/town-pay";
import { money, recordResourceFlowTerms } from "../../src/simulation/resources";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import { recordedPayStubs } from "../../src/simulation/resource-income";
import {
  statutoryTaxBalances,
  assessPaychecksTaxes,
} from "../../src/simulation/statutory-tax";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import { personName } from "../../src/simulation/people";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import type { World } from "../../src/simulation/types";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((places.get(state)?.[1] ?? -1) < Number(count))
    places.set(state, [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);

describe.each([...places.values()].map(([key]) => key))(
  "employment tax payroll in %s",
  (placeKey) => {
    it("uses the existing SS cap and Medicare threshold, records matching employer books and preserves player/NPC/reopen/replay parity", () => {
      const seed = `employment-tax-payroll:${placeKey}`;
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        startingLife: "ordinary-life",
        household: "lives-alone",
        questionnaire: "skipped",
        priors: [],
      });
      const entered = enterLifePath(game.world, "shop-assistant");
      expect(entered.ok, entered.message).toBe(true);
      const work = entered.world.history.workRelationships.at(-1)!;
      const flow = entered.world.history.resourceFlows.find(
        (row) =>
          row.basisReference.kind === "work" &&
          row.basisReference.workRelationshipId === work.id,
      )!;
      const start = entered.world.currentDate;
      const dates = [start, addDays(start, 1), addDays(start, 2)];
      // Authored pay-contract controls reach two existing legal boundaries.
      // These are not new population incomes, rates, or ordinary-calendar proof.
      const gross = [18_449_000, 10_000, 1_542_000];
      let base = entered.world;
      for (const due of base.history.futureDueItems) {
        const status = base.history.futureDueItemStates
          .filter((row) => row.dueItemId === due.id)
          .at(-1);
        if (status?.status === "scheduled" && due.dueAt <= dates[2]!)
          base = cancelFutureDueItem(base, {
            stableKey: `fixture:employment-tax-clock:${due.id}`,
            dueItemId: due.id,
            effectiveAt: start,
            reasonKey: "fixture:controlled-pay-period",
            context:
              "Focused recorded payroll comparison; no ordinary clock run claimed.",
          });
      }
      const periods = dates.map((onDate, i) => ({
        payFlowId: flow.id,
        activityId: flow.id,
        stableKey: `fixture:employment-tax-pay:${i}`,
        periodStartsAt: onDate,
        periodEndsAt: onDate,
        onDate,
      }));
      const run = (controlled: boolean) =>
        withWorldIntegrityDeferred(() => {
          let world: World = {
            ...base,
            control: controlled
              ? { kind: "person" as const, personId: game.playerPersonId }
              : { kind: "observer" as const },
          };
          for (const [i, period] of periods.entries()) {
            world = {
              ...world,
              currentDate: period.onDate,
              currentMoment: simulationMomentOnLocalDate(
                world.currentMoment,
                period.onDate,
              ),
            };
            const prior = resourceFlowTermsAt(world, flow.id)!;
            world = recordResourceFlowTerms(world, {
              stableKey: `fixture:employment-tax-terms:${i}`,
              resourceFlowId: flow.id,
              effectiveAt: period.onDate,
              status: "active",
              amount: money(gross[i]!, "USD"),
              cadenceKind: "schedule:weekly",
              reason: "Authored recorded-gross boundary control.",
              provenance: {
                kind: "authored",
                note: "Existing-rule cap/threshold fixture; not a population wage.",
              },
              supersedesTermsId: prior.id,
            });
            world = settleTownCompensations(world, [period]);
          }
          return world;
        });
      const player = run(true);
      const npc = run(false);
      expect(player.history).toEqual(npc.history);
      const second = player.history.resourceTransferOutcomes.find(
        (row) => row.stableKey === periods[1]!.stableKey,
      )!;
      const third = player.history.resourceTransferOutcomes.find(
        (row) => row.stableKey === periods[2]!.stableKey,
      )!;
      const rowsFor = (id: string) =>
        Object.fromEntries(
          player.history
            .statutoryTaxLiabilities!.filter(
              (row) => row.sourceOutcomeId === id,
            )
            .map((row) => [row.taxKey, row]),
        );
      const secondRows = rowsFor(second.id);
      const thirdRows = rowsFor(third.id);
      const ss = secondRows["us-federal:social-security-employee"]!;
      if (ss.status === "rule-unknown") {
        // Existing coverage research gaps stay explicit, not a zero-tax pass.
        for (const key of [
          "us-federal:social-security-employee",
          "us-federal:medicare-employee",
          "us-federal:additional-medicare-withholding",
          "us-federal:social-security-employer",
          "us-federal:medicare-employer",
        ]) {
          expect(secondRows[key]!.liability).toBeNull();
          expect(secondRows[key]!.researchQuestionId).toBeTruthy();
        }
      } else {
        expect(ss.taxableAmount!.minorUnits).toBe(1000);
        expect(ss.liability!.minorUnits).toBe(62);
        expect(
          secondRows["us-federal:social-security-employer"]!.liability!
            .minorUnits,
        ).toBe(62);
        expect(
          secondRows["us-federal:medicare-employee"]!.liability!.minorUnits,
        ).toBe(145);
        expect(
          secondRows["us-federal:medicare-employer"]!.liability!.minorUnits,
        ).toBe(145);
        expect(
          thirdRows["us-federal:social-security-employee"]!.liability!
            .minorUnits,
        ).toBe(0);
        expect(
          thirdRows["us-federal:social-security-employer"]!.liability!
            .minorUnits,
        ).toBe(0);
        expect(
          thirdRows["us-federal:additional-medicare-withholding"]!
            .taxableAmount!.minorUnits,
        ).toBe(1000);
        expect(
          thirdRows["us-federal:additional-medicare-withholding"]!.liability!
            .minorUnits,
        ).toBe(9);
        expect(
          thirdRows["us-federal:additional-medicare-employer"],
        ).toBeUndefined();
        const books = statutoryTaxBalances(player, flow.source);
        const employerRows = books.filter(
          (row) =>
            row.liability.sourceOutcomeId === second.id &&
            row.liability.taxKey !== "us-federal:futa",
        );
        expect(
          employerRows
            .filter(
              (row) =>
                row.liability.taxKey ===
                  "us-federal:social-security-employer" ||
                row.liability.taxKey === "us-federal:medicare-employer",
            )
            .map((row) => row.unpaid.minorUnits)
            .sort((a, b) => a - b),
        ).toEqual([62, 145]);
        expect(
          employerRows.every(
            (row) =>
              row.liability.collection === "payable-by-payer" &&
              row.liability.dueAt === null,
          ),
        ).toBe(true);
        const stub = recordedPayStubs(player, game.playerPersonId).find(
          (row) => row.paycheck.id === second.id,
        )!;
        for (const key of [
          "us-federal:social-security-employee",
          "us-federal:medicare-employee",
        ]) {
          const tax = stub.taxes.find((row) => row.liability.taxKey === key)!;
          expect(tax.withheld).toEqual(tax.liability.liability);
        }
      }
      const saved = serializeWorld(player);
      const reopened = deserializeWorld(saved);
      expect(settleTownCompensations(reopened, periods)).toBe(reopened);
      expect(assessPaychecksTaxes(reopened, [second.id, third.id])).toBe(
        reopened,
      );
      expect(serializeWorld(reopened)).toBe(saved);
      console.log(
        JSON.stringify({
          placeKey,
          seed,
          person: personName(player.people[game.playerPersonId]!),
          personId: game.playerPersonId,
          sourceOutcomeId: second.id,
          ssStatus: ss.status,
          socialSecurityMinor: ss.liability?.minorUnits ?? null,
          additionalMedicareMinor:
            thirdRows["us-federal:additional-medicare-withholding"]!.liability
              ?.minorUnits ?? null,
        }),
      );
    }, 120000);
  },
);
