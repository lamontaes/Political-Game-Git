import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import {
  TOWN_PAY_VERSION,
  PAYDAY_TRANSITION_KEY,
  nextPaydayDate,
  payPeriodEndingOn,
  paydayHandler,
  payTownPaydays,
} from "../../src/simulation/living-world/town-pay";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
} from "../../src/simulation/resources";
import { ensureLifePathPersonalPosition } from "../../src/simulation/life-paths2-resources";
import { FEDERAL_INCOME_TAX_KEY } from "../../src/simulation/statutory-tax";
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";

function allPlaces() {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [key, count] = pair.split(":") as [string, string];
    const state = key.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(count))
      largest.set(state, [key, Number(count)]);
  }
  // The table's largest Hawaii entry is a county; use its recorded city.
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  expect(largest.size).toBe(56);
  return [...largest].map(([state, [key]]) => ({
    state,
    key,
    seed: `player-town-payroll:${key}`,
  }));
}

describe.each(allPlaces())(
  "one payroll for a played worker in $state ($seed)",
  ({ key, seed }: ReturnType<typeof allPlaces>[number]) => {
    it("matches the NPC's gross, tax rows, net and employer cash and survives reopening", () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: key,
          startAge: 30,
          questionnaire: "skipped",
        }),
      ).game!;
      const since = game.world.currentDate;
      const work = game.world.history.workRelationships.find(
        (item) =>
          item.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
          item.compensation === "paid" &&
          item.organizationId,
      )!;
      expect(work, key).toBeDefined();
      // Identical authored contract controls the comparison; it is not a new
      // population wage/rate assumption. The actor/job/employer are generated.
      let base = createWorkCompensation(game.world, {
        stableKey: `${TOWN_PAY_VERSION}:job-pay:${work.id}`,
        workRelationshipId: work.id,
        startsAt: since,
        amount: money(200_000, "USD"),
        cadenceKind: "schedule:town-weekly",
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Parity fixture: identical weekly contract, not empirical pay.",
        },
      });
      let date = nextPaydayDate(addDays(since, 7));
      // The shared calendar also contains semimonthly paydays. Select a full
      // weekly period for this contract rather than assuming its next date fits.
      while (!payPeriodEndingOn("weekly", date, 0)) date = nextPaydayDate(date);
      base = withWorldIntegrityDeferred(() => {
        let next = base;
        for (const item of base.history.futureDueItems) {
          const state = base.history.futureDueItemStates
            .filter((row) => row.dueItemId === item.id)
            .at(-1);
          if (state?.status !== "scheduled" || item.dueAt >= date) continue;
          next = cancelFutureDueItem(next, {
            stableKey: `fixture:payday-context:${item.id}`,
            dueItemId: item.id,
            effectiveAt: since,
            reasonKey: "fixture:controlled-payday-context",
            context:
              "Controlled payday context; no ordinary intervening-day advancement claimed.",
          });
        }
        return {
          ...next,
          currentDate: date,
          currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
        };
      });
      const employer = {
        kind: "organization" as const,
        organizationId: work.organizationId!,
      };
      if (!resourcePositionAt(base, employer, money(0, "USD").currency))
        base = createResourcePosition(base, {
          stableKey: `fixture:payroll-cash:${work.organizationId}`,
          owner: employer,
          openedAt: date,
          openingBalance: money(10_000_000, "USD"),
          provenance: {
            kind: "authored",
            note: "Identical employer-cash test control; not a population estimate.",
          },
        });
      base = ensureLifePathPersonalPosition(
        base,
        work.personId,
        money(0, "USD").currency,
      );
      const employee = { kind: "person" as const, personId: work.personId };
      const beforeNet = resourcePositionAt(
        base,
        employee,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const due = game.world.history.futureDueItems.find(
        (item) => item.transitionKey === PAYDAY_TRANSITION_KEY,
      )!;
      expect(due).toBeDefined();
      const npc = withWorldIntegrityDeferred(
        () =>
          paydayHandler({ ...base, control: { kind: "observer" } }, due).world,
      );
      const player = withWorldIntegrityDeferred(
        () =>
          paydayHandler(
            { ...base, control: { kind: "person", personId: work.personId } },
            due,
          ).world,
      );
      // Both control identities use the same saved payday and common writer.
      // Every saved record, withholding payment and cash movement must match.
      expect(player.history).toEqual(npc.history);
      const flow = player.history.resourceFlows.find(
        (item) =>
          item.basisReference.kind === "work" &&
          item.basisReference.workRelationshipId === work.id,
      )!;
      const pay = player.history.resourceTransferOutcomes.filter(
        (item) => item.resourceFlowId === flow.id,
      );
      expect(pay.length).toBeGreaterThan(0);
      expect(
        pay.every((item) => item.transferredAmount.minorUnits === 200_000),
      ).toBe(true);
      expect(
        player.history.statutoryTaxLiabilities?.filter((item) =>
          pay.some((paid) => paid.id === item.sourceOutcomeId),
        ).length,
      ).toBeGreaterThan(0);
      const liabilities = player.history.statutoryTaxLiabilities!.filter(
        (row) => pay.some((paid) => paid.id === row.sourceOutcomeId),
      );
      const withheld = (player.history.statutoryTaxPayments ?? []).filter(
        (row) =>
          liabilities.some((liability) => liability.id === row.liabilityId),
      );
      const pricedWithholding = liabilities.filter(
        (row) =>
          row.collection === "withheld-from-pay" &&
          row.liability !== null &&
          row.liability.minorUnits > 0,
      );
      // Unpriced territory rules remain unpriced in both routes. An absent
      // payment is not evidence that an unknown liability is a lawful zero.
      if (pricedWithholding.length > 0)
        expect(withheld.length).toBeGreaterThan(0);
      else expect(withheld).toEqual([]);
      for (const payment of withheld) {
        expect(payment.amount.minorUnits).toBeGreaterThan(0);
        const transfer = player.history.resourceTransferOutcomes.find(
          (row) => row.id === payment.resourceOutcomeId,
        )!;
        expect(transfer.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
          payment.amount.minorUnits,
        );
      }
      const grossMinor = pay.reduce(
        (sum, row) => sum + row.transferredAmount.minorUnits,
        0,
      );
      const withheldMinor = withheld.reduce(
        (sum, row) => sum + row.amount.minorUnits,
        0,
      );
      const netMinor = grossMinor - withheldMinor;
      expect(
        resourcePositionAt(player, employee, money(0, "USD").currency)!
          .liquidBalance.minorUnits - beforeNet,
      ).toBe(netMinor);
      const federal = liabilities.filter(
        (row) => row.taxKey === FEDERAL_INCOME_TAX_KEY,
      );
      expect(federal).toHaveLength(pay.length);
      const stateIncome = liabilities.filter((row) =>
        row.taxKey.endsWith(":wage-income-tax"),
      );
      expect(stateIncome).toHaveLength(pay.length);
      expect(
        resourcePositionAt(
          player,
          { kind: "organization", organizationId: work.organizationId! },
          money(0, "USD").currency,
        ),
      ).toEqual(
        resourcePositionAt(
          npc,
          { kind: "organization", organizationId: work.organizationId! },
          money(0, "USD").currency,
        ),
      );
      expect(
        resourcePositionAt(
          player,
          { kind: "person", personId: work.personId },
          money(0, "USD").currency,
        ),
      ).toEqual(
        resourcePositionAt(
          npc,
          { kind: "person", personId: work.personId },
          money(0, "USD").currency,
        ),
      );
      const reopened = deserializeWorld(serializeWorld(player));
      expect(reopened.history.statutoryTaxLiabilities).toEqual(
        player.history.statutoryTaxLiabilities,
      );
      expect(reopened.history.statutoryTaxPayments).toEqual(
        player.history.statutoryTaxPayments,
      );
      expect(
        withWorldIntegrityDeferred(() => payTownPaydays(reopened, since, null)),
      ).toBe(reopened);
      const person = player.people[work.personId]!;
      console.info(
        JSON.stringify({
          place: key,
          seed,
          person: `${person.givenName} ${person.familyName}`,
          personId: person.id,
          date,
          grossMinor,
          withheldMinor,
          netMinor,
          federal: federal.map((row) => ({
            status: row.status,
            amountMinor: row.liability?.minorUnits ?? null,
          })),
          stateIncome: stateIncome.map((row) => ({
            authority: row.authorityKey,
            status: row.status,
            amountMinor: row.liability?.minorUnits ?? null,
          })),
        }),
      );
    }, 120_000);
  },
);
