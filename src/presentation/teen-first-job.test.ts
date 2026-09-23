import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation/types";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import {
  LEGACY_FIRST_JOB_WORK_KEY,
  applicationSteps,
  employerDisplayName,
} from "../simulation/job-market";
import { workStatusAt } from "../simulation/life-queries";
import { createExplicitGeographyLife } from "./new-game-geography";
import { formativeSituationAvailable } from "./formative-context";
import { chooseFormativeOption } from "./formative-play";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * A teenager's first job, played from the new-game route in several places,
 * never Kentucky. It used to be a weekend stock clerk at the same invented
 * grocery in every town, recorded as paid and never paid. Now it is one of
 * the town's own employers, hired through the job market, and it pays weekly.
 */

const ELY = "3223500";
const HOUMA = "2236255";
const SAN_JUAN = "7276770";
const JOB = "formative.teen-work-opportunity";

function teen(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge: 15,
    depth: "play-formative-years",
  });
  return { world: life.game.world, personId: life.game.playerPersonId };
}

function takeTheJob(world: World, personId: EntityId): World {
  return chooseFormativeOption(world, {
    personId,
    situationKey: JOB,
    optionKey: "accept",
    withPersonId: null,
  });
}

function firstJob(world: World, personId: EntityId) {
  return world.history.workRelationships.find(
    (work) =>
      work.personId === personId &&
      work.stableKey === `formative-play:first-job:${personId}:work`,
  );
}

function paymentsFor(world: World, workId: EntityId) {
  const flow = world.history.resourceFlows.find(
    (row) => row.stableKey === `job-pay:${workId}`,
  );
  if (!flow) return { flow: null, paid: [] };
  return {
    flow,
    paid: world.history.resourceTransferOutcomes.filter(
      (outcome) => outcome.resourceFlowId === flow.id,
    ),
  };
}

describe("a teenager's first job", () => {
  it("is with the town's own employer, hired through the job market, and pays weekly across a reload", () => {
    const { world, personId } = teen(ELY, "teen-job-ely");
    expect(formativeSituationAvailable(world, personId, JOB)).toBe(true);

    const hired = takeTheJob(world, personId);
    const work = firstJob(hired, personId)!;
    expect(work).toBeDefined();
    expect(workStatusAt(hired, work.id)?.status).toBe("active");
    expect(employerDisplayName(hired, work.organizationId!)).toMatch(
      /White Pine County|Ely/,
    );

    const application = hired.history.jobApplications!.find(
      (row) => row.personId === personId,
    )!;
    expect(
      applicationSteps(hired, application.id).map((step) => step.kind),
    ).toEqual(["offered", "accepted", "started"]);
    expect(
      applicationSteps(hired, application.id).at(-1)!.workRelationshipId,
    ).toBe(work.id);
    // Filled on the day, so it never shows as a listing.
    const opening = hired.history.jobOpenings!.find(
      (row) => row.id === application.openingId,
    )!;
    expect(opening.closesAt).toBe(opening.opensAt);

    const reloaded = deserializeWorld(serializeWorld(hired));
    assertWorldIntegrity(reloaded);
    const later = passOrdinaryDays(reloaded, 21);
    const { flow, paid } = paymentsFor(later, work.id);
    expect(flow).not.toBeNull();
    expect(paid.length).toBe(3);
    // 11 hours at the federal minimum, the marked placeholder.
    expect(paid[0]!.transferredAmount.minorUnits).toBe(725 * 11);
    assertWorldIntegrity(later);
  });

  it("differs by town: Ely and Houma hire with different employers", () => {
    const ely = teen(ELY, "teen-job-compare");
    const houma = teen(HOUMA, "teen-job-compare");
    const elyHired = takeTheJob(ely.world, ely.personId);
    const houmaHired = takeTheJob(houma.world, houma.personId);
    const elyEmployer = employerDisplayName(
      elyHired,
      firstJob(elyHired, ely.personId)!.organizationId!,
    );
    const houmaEmployer = employerDisplayName(
      houmaHired,
      firstJob(houmaHired, houma.personId)!.organizationId!,
    );
    expect(elyEmployer).not.toBe(houmaEmployer);
    expect(elyEmployer).not.toMatch(/Neighborhood/);
    expect(houmaEmployer).not.toMatch(/Neighborhood/);
  });

  it("is not offered in San Juan, where no employer is on file yet", () => {
    const { world, personId } = teen(SAN_JUAN, "teen-job-san-juan");
    expect(formativeSituationAvailable(world, personId, JOB)).toBe(false);
  });

  it("pays an older save's unpaid first job from now on, never for weeks already gone", () => {
    const { world, personId } = teen(HOUMA, "teen-job-legacy");
    const shop = createOrganization(world, {
      stableKey: "formative-play:first-job",
      formedAt: world.currentDate,
      provenance: { kind: "generated", generatorKey: "formative-first-job-v1" },
      initialProfile: {
        name: "Neighborhood grocery",
        classification: "enterprise:retail",
        locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
    });
    const organizationId = shop.history.organizations.at(-1)!.id;
    const legacy = createWorkRelationship(shop, {
      stableKey: LEGACY_FIRST_JOB_WORK_KEY,
      personId,
      organizationId,
      startedAt: shop.currentDate,
      kind: "employment:part-time",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "generated", generatorKey: "formative-first-job-v1" },
      initialRole: {
        title: "Weekend stock clerk",
        occupationClassification: "occupation:retail-stock",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 8, maximumHours: 14 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const work = legacy.history.workRelationships.at(-1)!;
    // Sixty days pass: the first settlement finds the unpaid job and starts
    // its pay on that day, owing nothing for the sixty.
    const found = passOrdinaryDays(legacy, 60);
    const first = paymentsFor(found, work.id);
    expect(first.flow?.startsAt).toBe(found.currentDate);
    expect(first.paid).toHaveLength(0);
    const after = passOrdinaryDays(found, 14);
    expect(paymentsFor(after, work.id).paid).toHaveLength(2);
    assertWorldIntegrity(after);
  });
});
