import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { observerSetup } from "../presentation/observer-world";
import { createOrganization, createWorkRelationship } from "./life";
import { readOpeningEmployerCashEstimate } from "./opening-employer-cash";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import type { EntityId, OrganizationClassification, World } from "./types";

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
      openingBalance: money(cash, "USD"),
      provenance,
    });
  for (let index = 0; index < workers; index++)
    next = createWorkRelationship(next, {
      stableKey: `${key}:work:${index}`,
      personId: world.personOrder[index]!,
      organizationId: id,
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
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
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
  it("reports an empty cohort rather than inventing starting cash", () => {
    const { world, id } = fixture();
    const before = JSON.stringify(world);
    expect(readOpeningEmployerCashEstimate(world, id, "USD")).toEqual({
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
    const result = readOpeningEmployerCashEstimate(world, target.id, "USD");
    expect(result.status).toBe("estimated");
    if (result.status !== "estimated") throw new Error(result.reason);
    expect(result.amount).toEqual(money(45_000, "USD"));
    expect(result.donors).toHaveLength(2);
    expect(
      result.donors.every((donor) => donor.positionId && donor.profileId),
    ).toBe(true);
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
      amount: money(30_000, "USD"),
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
      attemptedAmount: money(30_000, "USD"),
      transferredAmount: money(30_000, "USD"),
      reasonKind: "custom:paid",
      note: null,
      provenance,
    });
    const result = readOpeningEmployerCashEstimate(world, target.id, "USD");
    if (result.status !== "estimated") throw new Error(result.reason);
    expect(result.amount).toEqual(money(60_000, "USD"));
    expect(result.donors[0]!.outcomeIds).toEqual([
      world.history.resourceTransferOutcomes.at(-1)!.id,
    ]);
  });

  it("opens a random actual game and exposes the absent comparable bootstrap", () => {
    const seed = "standby4-a60-comparable-opening-20261002";
    const setup = observerSetup(seed);
    const session = generateOpeningLife(
      prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
    );
    expect(session.game).toBeDefined();
    const world = session.game!.world;
    const employerIds = new Set<EntityId>(
      world.history.workRelationships
        .filter((work) => work.compensation === "paid")
        .map((work) => work.organizationId),
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
    const result = readOpeningEmployerCashEstimate(world, target!.id, "USD");
    expect(result).toEqual({
      status: "blocked",
      reason: "empty-comparable-cash-cohort",
    });
    process.stdout.write(
      JSON.stringify({
        receipt: "A60 comparable opening blocked",
        seed,
        placeKey: setup.placeKey,
        organizationId: target!.id,
        result,
      }) + "\n",
    );
  });
});
