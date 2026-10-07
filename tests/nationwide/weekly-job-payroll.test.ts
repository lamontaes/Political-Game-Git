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
import { cancelFutureDueItem } from "../../src/simulation/future-transitions";
import { settleJobPay } from "../../src/simulation/job-market";
import { ensureLifePathPersonalPosition } from "../../src/simulation/life-paths2-resources";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  resolveWorkCompensationPeriod,
} from "../../src/simulation/resources";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { assessPaycheckTaxes } from "../../src/simulation/statutory-tax";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { TOWN_EMPLOYMENT_VERSION } from "../../src/simulation/living-world/town-employment";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";

function allPlaces() {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [key, count] = pair.split(":") as [string, string];
    const state = key.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(count))
      largest.set(state, [key, Number(count)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  expect(largest.size).toBe(56);
  return [...largest.values()].map(([placeKey]) => placeKey);
}

describe.each(allPlaces())("weekly job payroll in %s", (placeKey) => {
  it("preserves the existing gross contract, adds canonical withholding and gives the player the NPC's saved result", () => {
    const seed = `one-weekly-payroll:${placeKey}`;
    let base = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!.world;
    const since = base.currentDate;
    const work = base.history.workRelationships.find(
      (row) =>
        row.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
        row.compensation === "paid" &&
        row.organizationId,
    )!;
    expect(work).toBeDefined();
    base = createWorkCompensation(base, {
      stableKey: `job-pay:${work.id}`,
      workRelationshipId: work.id,
      startsAt: since,
      amount: money(200_000, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Identical weekly-contract parity control, not a population wage estimate.",
      },
    });
    const flow = base.history.resourceFlows.at(-1)!;
    const date = addDays(since, 7);
    base = withWorldIntegrityDeferred(() => {
      let next = base;
      for (const due of base.history.futureDueItems) {
        const status = base.history.futureDueItemStates
          .filter((row) => row.dueItemId === due.id)
          .at(-1);
        if (status?.status === "scheduled" && due.dueAt < date)
          next = cancelFutureDueItem(next, {
            stableKey: `fixture:weekly-payday:${due.id}`,
            dueItemId: due.id,
            effectiveAt: since,
            reasonKey: "fixture:controlled-payday-context",
            context:
              "Focused settlement comparison; ordinary clock advancement not claimed.",
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
        stableKey: `fixture:weekly-cash:${work.organizationId}`,
        owner: employer,
        openedAt: date,
        openingBalance: money(10_000_000, "USD"),
        provenance: {
          kind: "authored",
          note: "Identical employer cash fixture; not inferred real-world assets.",
        },
      });
    base = ensureLifePathPersonalPosition(
      base,
      work.personId,
      money(0, "USD").currency,
    );
    const personOwner = { kind: "person" as const, personId: work.personId };
    const initialNet = resourcePositionAt(
      base,
      personOwner,
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    // Main's previous weekly occurrence writer, then the existing tax writer:
    // gross/employer behavior is preserved; withholding is the intended addition.
    const grossBaseline = withWorldIntegrityDeferred(() =>
      resolveWorkCompensationPeriod(base, {
        stableKey: `${flow.stableKey}:${since}`,
        workRelationshipId: work.id,
        periodStartsAt: since,
        periodEndsAt: addDays(date, -1),
        occurredAt: date,
        status: "completed",
        reasonKind: null,
        note: "Pay for the week.",
        provenance: flow.provenance,
      }),
    );
    const priorPay = grossBaseline.history.resourceTransferOutcomes.at(-1)!;
    const expected = withWorldIntegrityDeferred(() =>
      assessPaycheckTaxes(grossBaseline, priorPay.id),
    );
    const npc = withWorldIntegrityDeferred(() =>
      settleJobPay({ ...base, control: { kind: "observer" } }, work.personId),
    );
    const played = withWorldIntegrityDeferred(() =>
      settleJobPay(
        { ...base, control: { kind: "person", personId: work.personId } },
        work.personId,
      ),
    );
    expect(played.history).toEqual(npc.history);
    expect(played.history).toEqual(expected.history);
    const pay = played.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow.id,
    );
    expect(pay).toHaveLength(1);
    expect(pay[0]!.transferredAmount).toEqual(priorPay.transferredAmount);
    expect(
      resourcePositionAt(played, employer, money(0, "USD").currency)!
        .liquidBalance,
    ).toEqual(
      resourcePositionAt(grossBaseline, employer, money(0, "USD").currency)!
        .liquidBalance,
    );
    const liabilities = played.history.statutoryTaxLiabilities!.filter(
      (row) => row.sourceOutcomeId === pay[0]!.id,
    );
    expect(liabilities.length).toBeGreaterThan(0);
    const withholding = (played.history.statutoryTaxPayments ?? []).filter(
      (row) =>
        liabilities.some((liability) => liability.id === row.liabilityId),
    );
    const withheldMinor = withholding.reduce(
      (sum, row) => sum + row.amount.minorUnits,
      0,
    );
    expect(
      resourcePositionAt(played, personOwner, money(0, "USD").currency)!
        .liquidBalance.minorUnits - initialNet,
    ).toBe(200_000 - withheldMinor);
    const reopened = deserializeWorld(serializeWorld(played));
    expect(
      withWorldIntegrityDeferred(() => settleJobPay(reopened, work.personId)),
    ).toBe(reopened);
    expect(reopened.history.statutoryTaxPayments).toEqual(
      played.history.statutoryTaxPayments,
    );
    const person = played.people[work.personId]!;
    console.info(
      JSON.stringify({
        placeKey,
        seed,
        person: `${person.givenName} ${person.familyName}`,
        personId: person.id,
        date,
        grossMinor: 200_000,
        withheldMinor,
        netMinor: 200_000 - withheldMinor,
      }),
    );
  }, 120_000);
});
