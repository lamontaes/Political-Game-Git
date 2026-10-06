import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { observerSetup } from "../presentation/observer-world";
import { createOrganization, createWorkRelationship } from "./life";
import {
  readOpeningEmployerCashEstimate,
  ensureEmployerCashPositions,
} from "./opening-employer-cash";
import { townBusinessKindBooks } from "./living-world/town-business-books";
import {
  lifePathDefinition,
  type LifePathDefinition,
} from "./life-paths2-catalog";
import { resourcePositionAt } from "./resource-queries";
import { advanceWorld } from "./world";
import { addDays } from "./dates";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  makeCurrencyCode,
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import type { EntityId, OrganizationClassification, World } from "./types";

const USD = makeCurrencyCode("USD");

const provenance = {
  kind: "authored" as const,
  note: "Controlled comparable-cash fixture; not an observed employer balance.",
};

function employer(
  world: World,
  key: string,
  cash: number | null,
  classification: OrganizationClassification = "enterprise:retail",
  workers = 1,
  shiftPath?: LifePathDefinition,
  weeklyHours?: number,
) {
  let next = createOrganization(world, {
    stableKey: key,
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: key,
      classification,
      locationJurisdictionId:
        world.people[world.personOrder[0]!]!.homeJurisdictionId,
    },
  });
  const id = next.history.organizations.at(-1)!.id;
  if (cash !== null)
    next = createResourcePosition(next, {
      stableKey: `${key}:cash`,
      owner: { kind: "organization", organizationId: id },
      openedAt: world.currentDate,
      openingBalance: money(cash, USD),
      provenance,
    });
  for (let index = 0; index < workers; index++)
    next = createWorkRelationship(next, {
      stableKey: `${key}:work:${index}`,
      personId: world.personOrder[index]!,
      organizationId: id,
      startedAt: world.currentDate,
      kind: shiftPath
        ? `employment:life-paths2-${shiftPath.id}`
        : "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Controlled clerk",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly:
            weeklyHours === undefined
              ? { minimumHours: 32, maximumHours: 40 }
              : { minimumHours: weeklyHours, maximumHours: weeklyHours },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
  return { world: next, id };
}

function fixture() {
  return employer(
    smallWorld({
      seed: "a60:comparable-cash",
      place: "US-OH",
      date: "2026-01-05",
    }).world,
    "target",
    null,
  );
}

describe("saved comparable employer cash reader", () => {
  it.each([
    { path: undefined, hours: 20 },
    {
      path: {
        ...lifePathDefinition("shop-assistant"),
        id: "unrecorded-shift-path",
      },
      hours: 20,
    },
    { path: lifePathDefinition("shop-assistant"), hours: 0 },
  ])(
    "preserves unannualizable completed-shift terms without opening cash ($hours hours, $path.id)",
    ({ path, hours }) => {
      const target = employer(
        smallWorld({
          seed: "a60:unannualizable-shift",
          place: "US-OH",
          date: "2026-01-05",
        }).world,
        "unannualizable-shift",
        null,
        "enterprise:retail",
        1,
        path,
        hours,
      );
      const world = createWorkCompensation(target.world, {
        stableKey: "unannualizable-shift:pay",
        workRelationshipId: target.world.history.workRelationships.at(-1)!.id,
        startsAt: target.world.currentDate,
        amount: money(
          lifePathDefinition("shop-assistant").sessionPayMinor,
          USD,
        ),
        cadenceKind: "work:completed-shift",
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const opened = ensureEmployerCashPositions(world, "opening");
      const owner = {
        kind: "organization" as const,
        organizationId: target.id,
      };
      expect(resourcePositionAt(opened, owner, USD)).toBeUndefined();
      expect(opened.history.resourceFlows).toEqual(world.history.resourceFlows);
      expect(opened.history.resourceFlowTerms).toEqual(
        world.history.resourceFlowTerms,
      );
      expect(opened.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      const restored = deserializeWorld(serializeWorld(opened));
      expect(ensureEmployerCashPositions(restored, "opening")).toEqual(
        restored,
      );
      expect(
        resourcePositionAt(
          ensureEmployerCashPositions(opened, "later"),
          owner,
          USD,
        ),
      ).toBeUndefined();
      const withPeer = employer(opened, "recorded-shift-peer", 61_234).world;
      const later = ensureEmployerCashPositions(withPeer, "later");
      expect(
        resourcePositionAt(later, owner, USD)!.liquidBalance.minorUnits,
      ).toBe(61_234);
      expect(later.history.resourceFlowTerms).toEqual(
        withPeer.history.resourceFlowTerms,
      );
      expect(later.history.resourceTransferOutcomes).toEqual(
        withPeer.history.resourceTransferOutcomes,
      );
    },
  );

  it("still refuses unrelated unrecorded payroll cadences", () => {
    const target = fixture();
    const world = createWorkCompensation(target.world, {
      stableKey: "target:unrecorded-cadence",
      workRelationshipId: target.world.history.workRelationships.at(-1)!.id,
      startsAt: target.world.currentDate,
      amount: money(lifePathDefinition("shop-assistant").sessionPayMinor, USD),
      cadenceKind: "schedule:unrecorded-pay-period",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    expect(() => ensureEmployerCashPositions(world, "opening")).toThrow(
      "No recorded calendar conversion for employer payroll cadence schedule:unrecorded-pay-period.",
    );
    expect(() => ensureEmployerCashPositions(world, "later")).toThrow(
      "No recorded calendar conversion for employer payroll cadence schedule:unrecorded-pay-period.",
    );
  });

  it.each([20, 10])(
    "annualizes completed shifts using the worker's recorded %s weekly hours",
    (weeklyHours) => {
      const path = lifePathDefinition("shop-assistant");
      const target = employer(
        smallWorld({
          seed: "a60:completed-shift-cash",
          place: "US-OH",
          date: "2026-01-05",
        }).world,
        "shift-employer",
        null,
        "enterprise:retail",
        1,
        path,
        weeklyHours,
      );
      const world = createWorkCompensation(target.world, {
        stableKey: "shift-employer:pay",
        workRelationshipId: target.world.history.workRelationships.at(-1)!.id,
        startsAt: target.world.currentDate,
        amount: money(path.sessionPayMinor, USD),
        cadenceKind: "work:completed-shift",
        restrictionKind: null,
        jurisdictionId: null,
        provenance,
      });
      const opened = ensureEmployerCashPositions(world, "opening");
      const yearlyPay =
        path.sessionPayMinor * (weeklyHours / (path.sessionMinutes / 60)) * 52;
      const costs = townBusinessKindBooks("retail");
      const expected = Math.round(
        (((yearlyPay / costs.payShare) * (1 - costs.margin)) / 365) * 19,
      );
      expect(
        resourcePositionAt(
          opened,
          { kind: "organization", organizationId: target.id },
          USD,
        )!.liquidBalance.minorUnits,
      ).toBe(expected);
      expect(opened.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      const restored = deserializeWorld(serializeWorld(opened));
      expect(ensureEmployerCashPositions(restored, "opening")).toEqual(
        restored,
      );
    },
  );

  it("bootstraps retail from daily outflows and sourced 19 days, preserving existing cash and save replay", () => {
    const target = fixture();
    const world = createWorkCompensation(target.world, {
      stableKey: "target:pay",
      workRelationshipId: target.world.history.workRelationships.at(-1)!.id,
      startsAt: target.world.currentDate,
      amount: money(100_000, USD),
      cadenceKind: "schedule:monthly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    const opened = ensureEmployerCashPositions(world, "opening");
    const owner = { kind: "organization" as const, organizationId: target.id };
    const costs = townBusinessKindBooks("retail");
    const yearlyPay = 100_000 * 12;
    const expected = Math.round(
      (((yearlyPay / costs.payShare) * (1 - costs.margin)) / 365) * 19,
    );
    expect(
      resourcePositionAt(opened, owner, USD)!.liquidBalance.minorUnits,
    ).toBe(expected);
    expect(opened.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    expect(opened.history.resourcePositions.at(-1)!.provenance).toMatchObject({
      kind: "authored",
      note: expect.stringContaining("JPMorgan Chase Institute"),
    });
    const restored = deserializeWorld(serializeWorld(opened));
    expect(ensureEmployerCashPositions(restored, "opening")).toEqual(restored);
  });

  it("uses saved comparable cash after opening instead of repeating the research bootstrap", () => {
    const target = fixture();
    const withDonor = employer(target.world, "donor", 61_234);
    const world = createWorkCompensation(withDonor.world, {
      stableKey: "target:pay",
      workRelationshipId: target.world.history.workRelationships.at(-1)!.id,
      startsAt: target.world.currentDate,
      amount: money(100_000, USD),
      cadenceKind: "schedule:monthly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    const later = ensureEmployerCashPositions(world, "later");
    expect(
      resourcePositionAt(
        later,
        { kind: "organization", organizationId: target.id },
        USD,
      )!.liquidBalance.minorUnits,
    ).toBe(61_234);
  });
  it("reports an empty cohort rather than inventing starting cash", () => {
    const { world, id } = fixture();
    const before = JSON.stringify(world);
    expect(readOpeningEmployerCashEstimate(world, id, USD)).toEqual({
      status: "blocked",
      reason: "empty-comparable-cash-cohort",
    });
    expect(JSON.stringify(world)).toBe(before);
  });

  it("averages each comparable employer once, including known zero and excluding other classifications, unknown cash and the target", () => {
    const target = fixture();
    let world = employer(
      target.world,
      "funded",
      90_000,
      "enterprise:retail",
      2,
    ).world;
    world = employer(world, "zero", 0).world;
    world = employer(world, "unknown", null).world;
    world = employer(
      world,
      "different",
      900_000,
      "enterprise:food-service",
    ).world;
    const result = readOpeningEmployerCashEstimate(world, target.id, USD);
    expect(result.status).toBe("estimated");
    if (result.status !== "estimated") throw new Error(result.reason);
    expect(result.amount).toEqual(money(45_000, USD));
    expect(result.donors).toHaveLength(2);
    expect(
      result.donors.every((donor) => donor.positionId && donor.profileId),
    ).toBe(true);
  });

  it("opens unpaid-record cash gaps from a fixed saved classification cohort, preserving zero and replay", () => {
    const base = fixture().world;
    const classification = "custom:unclassified-employer" as const;
    const first = employer(base, "unclassified:first", null, classification);
    const second = employer(
      first.world,
      "unclassified:second",
      null,
      classification,
    );
    let world = employer(
      second.world,
      "unclassified:donor",
      90_000,
      classification,
      2,
    ).world;
    world = employer(world, "unclassified:known-zero", 0, classification).world;
    world = employer(
      world,
      "unrelated:donor",
      900_000,
      "enterprise:retail",
    ).world;
    const opening = ensureEmployerCashPositions(world, "opening");
    for (const organizationId of [first.id, second.id]) {
      const cash = resourcePositionAt(
        opening,
        { kind: "organization", organizationId },
        USD,
      )!;
      expect(cash.liquidBalance.minorUnits).toBe(45_000);
      expect(
        opening.history.resourcePositions.find(
          (row) => row.id === cash.positionId,
        )!.provenance,
      ).toMatchObject({
        note: expect.stringContaining("recorded classification cohort"),
      });
    }
    const zeroEmployerId = world.history.organizations.find(
      (organization) => organization.stableKey === "unclassified:known-zero",
    )!.id;
    expect(
      opening.history.resourcePositions.filter(
        (row) =>
          row.owner.kind === "organization" &&
          row.owner.organizationId === zeroEmployerId,
      ),
    ).toHaveLength(1);
    expect(opening.history.resourceFlows).toEqual(world.history.resourceFlows);
    expect(opening.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    const restored = deserializeWorld(serializeWorld(opening));
    expect(ensureEmployerCashPositions(restored, "opening")).toEqual(restored);
  });

  it(
    "admits recorded comparable accounts in a random ordinary opening and preserves them through reload",
    { timeout: 180000 },
    () => {
      const seed = "standby4-comparable-unclassified-opening-20261002";
      const setup = observerSetup(seed);
      const session = generateOpeningLife(
        prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
      );
      expect(session.game).toBeDefined();
      const world = session.game!.world;
      const accounts = world.history.resourcePositions.filter(
        (row) =>
          row.provenance.kind === "authored" &&
          row.provenance.note?.startsWith(
            "ESTIMATED OPENING STOCK from the recorded classification cohort.",
          ),
      );
      const restored = deserializeWorld(serializeWorld(world));
      expect(ensureEmployerCashPositions(restored, "opening")).toEqual(
        restored,
      );
      process.stdout.write(
        JSON.stringify({
          receipt: "Comparable unclassified ordinary opening",
          seed,
          placeKey: setup.placeKey,
          accounts: accounts.map((row) => ({
            positionId: row.id,
            owner: row.owner,
            amount: row.openingBalance,
            provenance: row.provenance,
          })),
          activePaidWork: world.history.workRelationships.filter(
            (row) => row.compensation === "paid",
          ).length,
          reloadParity: true,
        }) + "\n",
      );
      expect(
        accounts.length,
        "ordinary opening must exercise comparable account admission",
      ).toBeGreaterThan(0);
    },
  );

  it("keeps an unclassified opening cash gap explicit when no recorded cohort exists", () => {
    const target = employer(
      fixture().world,
      "unclassified:alone",
      null,
      "custom:unclassified-employer",
    );
    const opening = ensureEmployerCashPositions(target.world, "opening");
    expect(
      resourcePositionAt(
        opening,
        { kind: "organization", organizationId: target.id },
        USD,
      ),
    ).toBeUndefined();
    expect(readOpeningEmployerCashEstimate(opening, target.id, USD)).toEqual({
      status: "blocked",
      reason: "empty-comparable-cash-cohort",
    });
  });

  it("reads cash after actual paid outcomes and retains their provenance", () => {
    const target = fixture();
    const donor = employer(target.world, "donor", 90_000);
    let world = createResourceFlow(donor.world, {
      stableKey: "donor:outflow",
      source: { kind: "organization", organizationId: donor.id },
      recipient: { kind: "person", personId: donor.world.personOrder[0]! },
      startsAt: donor.world.currentDate,
      basisKind: "compensation:work",
      basisReference: {
        kind: "work",
        workRelationshipId: donor.world.history.workRelationships.at(-1)!.id,
      },
      amount: money(30_000, USD),
      cadenceKind: "schedule:town-weekly",
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "donor:paid",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(30_000, USD),
      transferredAmount: money(30_000, USD),
      reasonKind: "custom:paid",
      note: null,
      provenance,
    });
    const result = readOpeningEmployerCashEstimate(world, target.id, USD);
    if (result.status !== "estimated") throw new Error(result.reason);
    expect(result.amount).toEqual(money(60_000, USD));
    expect(result.donors[0]!.outcomeIds).toEqual([
      world.history.resourceTransferOutcomes.at(-1)!.id,
    ]);
  });

  it("opens a random actual game with recorded employer cash and pays wages during its first 14 days", () => {
    const seed = "standby4-a60-comparable-opening-20261002";
    const setup = observerSetup(seed);
    const session = generateOpeningLife(
      prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
    );
    expect(session.game).toBeDefined();
    const world = session.game!.world;
    const employerIds = new Set<EntityId>(
      world.history.resourceFlows.flatMap((flow) =>
        flow.basisKind === "compensation:work" &&
        flow.source.kind === "organization"
          ? [flow.source.organizationId]
          : [],
      ),
    );
    const target = world.history.organizations.find(
      (organization) =>
        employerIds.has(organization.id) &&
        world.history.organizationProfiles.some(
          (profile) =>
            profile.organizationId === organization.id &&
            profile.classification.startsWith("enterprise:"),
        ),
    );
    expect(target).toBeDefined();
    const cash = resourcePositionAt(
      world,
      { kind: "organization", organizationId: target!.id },
      USD,
    );
    expect(cash!.liquidBalance.minorUnits).toBeGreaterThan(0);
    const later = advanceWorld(world, 14);
    expect(later.currentDate).toBe(addDays(world.currentDate, 14));
    const flowIds = new Set(
      world.history.resourceFlows
        .filter((flow) => flow.basisKind === "compensation:work")
        .map((flow) => flow.id),
    );
    const paid = later.history.resourceTransferOutcomes.filter(
      (outcome) =>
        flowIds.has(outcome.resourceFlowId) &&
        outcome.occurredAt > world.currentDate &&
        outcome.transferredAmount.minorUnits > 0,
    );
    expect(paid.length).toBeGreaterThan(0);
    const amountPaid = paid.reduce(
      (sum, outcome) => sum + outcome.transferredAmount.minorUnits,
      0,
    );
    process.stdout.write(
      JSON.stringify({
        receipt: "A60 funded opening and 14 days",
        seed,
        placeKey: setup.placeKey,
        organizationId: target!.id,
        openingCashMinor: cash!.liquidBalance.minorUnits,
        date: later.currentDate,
        paidOutcomes: paid.length,
        amountPaidMinor: amountPaid,
      }) + "\n",
    );
  });
});
