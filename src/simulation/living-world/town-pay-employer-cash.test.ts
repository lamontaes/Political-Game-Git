import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { observerSetup } from "../../presentation/observer-world";
import { createOrganization, createWorkRelationship } from "../life";
import { lifePlaceStateIdentities } from "../life-places";
import { resourcePositionAt } from "../resource-queries";
import {
  createResourcePosition,
  createResourceFlow,
  createWorkCompensation,
  money,
} from "../resources";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { BUSINESS_REVENUE_BASIS, OWNER_DRAW_BASIS } from "../local-economy";
import type { EntityId } from "../types";
import {
  settleTownCompensations,
  type TownCompensationPeriod,
} from "./town-pay";

const seed = "standby4-a60-recorded-employer-cash";
const places = lifePlaceStateIdentities();
const place = new SeededRng(seed).pick(places).jurisdictionKey;
const provenance = {
  kind: "authored" as const,
  note: "A60 controlled contract and recorded cash; not a natural wage or treasury estimate.",
};

function fixture(cash: number | null, workers = 1) {
  expect(places).toHaveLength(56);
  const small = smallWorld({ place, seed, date: "2026-01-05" });
  let world = createOrganization(small.world, {
    stableKey: "a60:employer",
    formedAt: small.world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled employer",
      classification: "enterprise:retail",
      locationJurisdictionId: small.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  const owner = { kind: "organization" as const, organizationId };
  if (cash !== null)
    world = createResourcePosition(world, {
      stableKey: "a60:cash",
      owner,
      openedAt: world.currentDate,
      openingBalance: money(cash, "USD"),
      provenance,
    });
  const periods: TownCompensationPeriod[] = [];
  const workerIds: EntityId[] = [];
  for (let index = 0; index < workers; index += 1) {
    const personId = world.personOrder[index]!;
    workerIds.push(personId);
    world = createWorkRelationship(world, {
      stableKey: `a60:work:${index}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Controlled clerk",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId: small.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: small.jurisdictionId,
        },
      },
    });
    const workRelationshipId = world.history.workRelationships.at(-1)!.id;
    world = createWorkCompensation(world, {
      stableKey: `a60:pay:${index}`,
      workRelationshipId,
      startsAt: world.currentDate,
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:town-weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    periods.push({
      payFlowId: flow.id,
      activityId: flow.id,
      stableKey: `a60:period:${index}`,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      onDate: world.currentDate,
    });
  }
  return { world, owner, periods, workerIds };
}

describe(`town payroll uses saved employer cash in ${place}, seed ${seed}`, () => {
  it.each([150_000, null])(
    "settles real incoming sales before payroll, preserving customer debit and replay (customer cash %s)",
    (customerCash) => {
      const base = fixture(0);
      let world = createOrganization(base.world, {
        stableKey: "a60:customers",
        formedAt: base.world.currentDate,
        initialProfile: {
          name: "Controlled customers",
          classification: "custom:aggregate-customers",
          locationJurisdictionId: null,
        },
        provenance,
      });
      const customerOwner = {
        kind: "organization" as const,
        organizationId: world.history.organizations.at(-1)!.id,
      };
      if (customerCash !== null)
        world = createResourcePosition(world, {
          stableKey: "a60:customer-cash",
          owner: customerOwner,
          openedAt: world.currentDate,
          openingBalance: money(customerCash, "USD"),
          provenance,
        });
      world = createResourceFlow(world, {
        stableKey: "a60:actual-sale",
        source: customerOwner,
        recipient: base.owner,
        startsAt: world.currentDate,
        amount: money(100_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: BUSINESS_REVENUE_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const revenueFlowId = world.history.resourceFlows.at(-1)!.id;
      world = createResourceFlow(world, {
        stableKey: "a60:legacy-draw",
        source: base.owner,
        recipient: customerOwner,
        startsAt: world.currentDate,
        amount: money(50_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: OWNER_DRAW_BASIS,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const drawFlowId = world.history.resourceFlows.at(-1)!.id;
      const payday = makeIsoDate("2026-02-01");
      world = {
        ...world,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, payday),
      };
      const period = {
        ...base.periods[0]!,
        onDate: payday,
        periodStartsAt: payday,
        periodEndsAt: payday,
      };
      const paid = settleTownCompensations(world, [period]);
      const sale = paid.history.resourceTransferOutcomes.find(
        (outcome) => outcome.resourceFlowId === revenueFlowId,
      )!;
      const wage = paid.history.resourceTransferOutcomes.find(
        (outcome) => outcome.stableKey === period.stableKey,
      )!;
      expect(
        paid.history.resourceTransferOutcomes.some(
          (outcome) => outcome.resourceFlowId === drawFlowId,
        ),
      ).toBe(false);
      expect(sale.transferredAmount.minorUnits).toBe(
        customerCash === null ? 0 : 100_000,
      );
      expect(wage.transferredAmount.minorUnits).toBe(
        customerCash === null ? 0 : 100_000,
      );
      expect(
        resourcePositionAt(paid, base.owner, money(0, "USD").currency)!.liquidBalance.minorUnits,
      ).toBe(0);
      if (customerCash !== null)
        expect(
          resourcePositionAt(paid, customerOwner, money(0, "USD").currency)!.liquidBalance
            .minorUnits,
        ).toBe(50_000);
      else expect(sale.status).toBe("blocked");
      const replay = deserializeWorld(serializeWorld(paid));
      expect(settleTownCompensations(replay, [period])).toEqual(replay);
    },
  );
  it("opens a new game in a random place with the current payroll code", () => {
    const openingSeed = "standby4-a60-current-main-new-game-20261002";
    const setup = observerSetup(openingSeed);
    const opened = generateOpeningLife(
      prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
    );
    expect(opened.game).not.toBeNull();
    const game = opened.game!;
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    expect(game.world.history.workRelationships.length).toBeGreaterThan(0);
    expect(
      game.world.history.resourceFlows.some(
        (flow) => flow.basisKind === "compensation:work",
      ),
    ).toBe(true);
    process.stdout.write(
      JSON.stringify({
        receipt: "A60 new game",
        seed: openingSeed,
        placeKey: setup.placeKey,
        playerPersonId: game.playerPersonId,
        date: game.world.currentDate,
        workRelationships: game.world.history.workRelationships.length,
      }) + "\n",
    );
  });
  it("blocks unknown employer cash without opening an invented employer position", () => {
    const { world, owner, periods } = fixture(null);
    const paid = settleTownCompensations(world, periods);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === periods[0]!.stableKey,
    )!;
    expect(outcome.status).toBe("blocked");
    expect(outcome.attemptedAmount.minorUnits).toBe(100_000);
    expect(outcome.transferredAmount.minorUnits).toBe(0);
    expect(outcome.reasonKind).toBe("capacity:unrecorded-employer-cash");
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency),
    ).toBeUndefined();
  });

  it.each([0, 35_000])(
    "records the actual shortfall when saved employer cash is %i",
    (cash) => {
      const { world, owner, periods } = fixture(cash);
      const paid = settleTownCompensations(world, periods);
      const outcome = paid.history.resourceTransferOutcomes.find(
        (row) => row.stableKey === periods[0]!.stableKey,
      )!;
      expect(outcome.status).toBe(cash === 0 ? "missed" : "partial");
      expect(outcome.attemptedAmount.minorUnits).toBe(100_000);
      expect(outcome.transferredAmount.minorUnits).toBe(cash);
      expect(outcome.reasonKind).toBe("capacity:insufficient-employer-cash");
      expect(
        resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
          .minorUnits,
      ).toBe(0);
    },
  );

  it("shares one balance across workers without spending it twice and survives reload", () => {
    const { world, owner, periods } = fixture(150_000, 2);
    const paid = settleTownCompensations(world, [...periods, periods[0]!]);
    const outcomes = paid.history.resourceTransferOutcomes.filter((row) =>
      periods.some((period) => row.stableKey === period.stableKey),
    );
    expect(
      outcomes.map((row) => [row.status, row.transferredAmount.minorUnits]),
    ).toEqual([
      ["completed", 100_000],
      ["partial", 50_000],
    ]);
    expect(outcomes.map((row) => row.attemptedAmount.minorUnits)).toEqual([
      100_000, 100_000,
    ]);
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
        .minorUnits,
    ).toBe(0);
    const reopened = deserializeWorld(serializeWorld(paid));
    expect(settleTownCompensations(reopened, periods)).toBe(reopened);
  });

  it("pays the full recorded contract when employer cash covers it", () => {
    const { world, owner, periods } = fixture(200_000);
    const paid = settleTownCompensations(world, periods);
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.stableKey === periods[0]!.stableKey,
    )!;
    expect(outcome.status).toBe("completed");
    expect(outcome.transferredAmount.minorUnits).toBe(100_000);
    expect(outcome.reasonKind).toBeNull();
    expect(
      resourcePositionAt(paid, owner, money(0, "USD").currency)!.liquidBalance
        .minorUnits,
    ).toBe(100_000);
  });
});
