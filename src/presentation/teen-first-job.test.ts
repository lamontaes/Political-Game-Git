import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation/types";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { LEGACY_FIRST_JOB_WORK_KEY } from "../simulation/job-market";
import { workStatusAt } from "../simulation/life-queries";
import { createExplicitGeographyLife } from "./new-game-geography";
import { chooseFormativeOption } from "./formative-play";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import {
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { CAREER_PROVIDERS } from "./career-path7-provider";

/**
 * A teenager's first job, played from the new-game route, never Kentucky. It
 * was recorded as paid and never paid, so lives that kept it into adulthood
 * had no money. It now pays weekly from the day it is taken. Who the employer
 * is stays as it was; that is separate work.
 */

const ELY = "3223500";
const HOUMA = "2236255";
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
      work.stableKey === LEGACY_FIRST_JOB_WORK_KEY,
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
  it("pays weekly from the day it is taken, across a save and reload", () => {
    const { world, personId } = teen(ELY, "teen-job-ely");
    const hired = takeTheJob(world, personId);
    const work = firstJob(hired, personId)!;
    expect(work).toBeDefined();
    expect(workStatusAt(hired, work.id)?.status).toBe("active");
    expect(paymentsFor(hired, work.id).flow?.startsAt).toBe(hired.currentDate);

    const reloaded = deserializeWorld(serializeWorld(hired));
    assertWorldIntegrity(reloaded);
    const later = passOrdinaryDays(reloaded, 21);
    const { paid } = paymentsFor(later, work.id);
    expect(paid.length).toBe(3);
    // 11 hours, the middle of its 8 to 14, at the federal minimum: the
    // marked placeholder.
    expect(paid[0]!.transferredAmount.minorUnits).toBe(725 * 11);
    assertWorldIntegrity(later);
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

/** A first job held since the teenage years, as a saved game carries it. */
function withFirstJob(world: World, personId: EntityId) {
  const grocery = createOrganization(world, {
    stableKey: "formative-play:first-job",
    formedAt: world.currentDate,
    provenance: { kind: "generated", generatorKey: "formative-first-job-v1" },
    initialProfile: {
      name: "Neighborhood grocery",
      classification: "enterprise:retail",
      locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
    },
  });
  const next = createWorkRelationship(grocery, {
    stableKey: LEGACY_FIRST_JOB_WORK_KEY,
    personId,
    organizationId: grocery.history.organizations.at(-1)!.id,
    startedAt: grocery.currentDate,
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
  return { world: next, workId: next.history.workRelationships.at(-1)!.id };
}

function grownUp(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({ placeKey, seed, startAge: 24 });
  const personId = life.game.playerPersonId;
  return { personId, world: openOrdinaryLife(life.game.world, personId) };
}

describe("the first job, once an adult job starts", () => {
  const shop = CAREER_PROVIDERS.find((p) => p.pathId === "shop-assistant")!;

  it("ends the day the adult job begins, naming it", () => {
    const adult = grownUp(ELY, "first-job-ends");
    const { world, workId } = withFirstJob(adult.world, adult.personId);
    const sought = seekCareerOffer(world, shop).world;
    const offer = sought.history.workRelationships.at(-1)!;
    const accepted = respondCareerOffer(sought, offer.id, shop, true).world;
    const begun = startCareerWork(
      passOrdinaryDays(accepted, 1),
      offer.id,
      shop,
    );
    expect(begun.ok).toBe(true);
    const status = workStatusAt(begun.world, workId)!;
    expect(status.status).toBe("ended");
    expect(status.reason).toBe("Left for work as shop assistant.");
    expect(status.effectiveAt).toBe(begun.world.currentDate);
    assertWorldIntegrity(begun.world);
  });

  it("ends in a saved game where the adult job already started, from the next day on", () => {
    const adult = grownUp(HOUMA, "first-job-saved");
    const { world, workId } = withFirstJob(adult.world, adult.personId);
    const shopJob = createWorkRelationship(world, {
      stableKey: "saved-shop-job",
      personId: adult.personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:life-paths2-shop-assistant",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "generated", generatorKey: "saved-game-fixture" },
      initialRole: {
        title: "Shop assistant",
        occupationClassification: "occupation:retail-sales",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 28 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const later = passOrdinaryDays(shopJob, 1);
    const status = workStatusAt(later, workId)!;
    expect(status.status).toBe("ended");
    expect(status.effectiveAt).toBe(later.currentDate);
    assertWorldIntegrity(later);
  });
});
