import { describe, expect, it } from "vitest";
import { fundRecordedPayrollControl } from "../fixtures/recorded-payroll-capital";
import { settleAllOfficeSalaries } from "../../src/simulation/office-salary";
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
  startTownJobPay,
  raiseTeacherPayToFloor,
  payTownPaydays,
} from "../../src/simulation/living-world/town-pay";
import { noticeLawPayChanges } from "../../src/simulation/law-effects-noticed";
import {
  createWorkCompensation,
  recordWorkCompensationTerms,
  money,
} from "../../src/simulation/resources";
import { ensureLifePathPersonalPosition } from "../../src/simulation/life-paths2-resources";
import { FEDERAL_INCOME_TAX_KEY } from "../../src/simulation/statutory-tax";
import {
  scheduleFutureDueItem,
  cancelFutureDueItem,
} from "../../src/simulation/future-transitions";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../../src/simulation/resource-queries";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type { FutureDueItem, World } from "../../src/simulation/types";

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

/** NPC route through the same canonical payroll settlement as played work. */
function npcPayday(world: World, due: FutureDueItem): World {
  const since = due.stableKey.slice(
    `${TOWN_PAY_VERSION}:payday:`.length,
  ) as World["currentDate"];
  const played =
    world.control.kind === "person" ? world.control.personId : null;
  let next = startTownJobPay(world, played, since);
  next = raiseTeacherPayToFloor(next, played);
  next = settleAllOfficeSalaries(next);
  next = noticeLawPayChanges(next, since);
  next = payTownPaydays(next, since, played);
  return scheduleFutureDueItem(next, {
    stableKey: `${TOWN_PAY_VERSION}:payday:${next.currentDate}`,
    dueAt: nextPaydayDate(next.currentDate),
    transitionKey: PAYDAY_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
}

describe.each(allPlaces())(
  "one payroll for a played worker in $state ($seed)",
  ({ key, seed }) => {
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
      const openingFlow = game.world.history.resourceFlows.find(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      )!;
      const openingTerms = openingFlow
        ? resourceFlowTermsAt(game.world, openingFlow.id)!
        : null;
      const provenance = {
        kind: "authored" as const,
        note: "Parity fixture: identical weekly contract, not empirical pay.",
      };
      let base = openingTerms
        ? recordWorkCompensationTerms(game.world, {
            stableKey: `fixture:weekly-contract:${work.id}`,
            workRelationshipId: work.id,
            effectiveAt: since,
            status: "active",
            amount: money(200_000, "USD"),
            cadenceKind: "schedule:town-weekly",
            supersedesTermsId: openingTerms.id,
            reason: "Identical authored weekly contract for played/NPC parity.",
            provenance,
          })
        : createWorkCompensation(game.world, {
            stableKey: `${TOWN_PAY_VERSION}:job-pay:${work.id}`,
            workRelationshipId: work.id,
            startsAt: since,
            amount: money(200_000, "USD"),
            cadenceKind: "schedule:town-weekly",
            restrictionKind: null,
            jurisdictionId: null,
            provenance,
          });
      base = fundRecordedPayrollControl(base, 31, 200_000);
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
      const npc = withWorldIntegrityDeferred(() =>
        npcPayday({ ...base, control: { kind: "observer" } }, due),
      );
      const player = withWorldIntegrityDeferred(
        () =>
          paydayHandler(
            { ...base, control: { kind: "person", personId: work.personId } },
            due,
          ).world,
      );
      // Every saved history record matches the existing NPC route. Only control
      // identity differs; the former played-person exclusion is the intended fix.
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
