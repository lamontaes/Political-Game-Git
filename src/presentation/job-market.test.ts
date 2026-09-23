import { describe, expect, it } from "vitest";
import {
  ageOnDate,
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation/types";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { kinshipRelationshipsAt } from "../simulation/life-queries";
import { createResourceFlow, money } from "../simulation/resources";
import {
  JOB_MARKET_WORK_KIND,
  JOB_TIMING,
  advanceJobMarket,
  answerJobOffer,
  applyForJob,
  applicationsFor,
  introducersFor,
  jobOpening,
  latestApplicationStep,
  openJobListings,
  startJob,
} from "../simulation/job-market";
import { createExplicitGeographyLife } from "./new-game-geography";
import { openOrdinaryLife } from "./ordinary-life";
import { letAdultTimePass } from "./adult-life";
import { projectJobMarket } from "./job-listings-view";

/**
 * Jobs, played through the new-game route in several places, never Kentucky:
 * a small Nevada town, a Louisiana parish seat, a Nevada city and San Juan,
 * Puerto Rico. Each step is the player's own action or time passing.
 */

const ELY = "3223500";
const HOUMA = "2236255";
const RENO = "3260600";
const SAN_JUAN = "7276770";

function begin(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({
    placeKey,
    seed,
    startAge: 24,
  } as Parameters<typeof createExplicitGeographyLife>[0]);
  const personId = life.game.playerPersonId;
  return {
    personId,
    world: openOrdinaryLife(life.game.world, personId),
  };
}

function untilListed(world: World, personId: EntityId, weeks = 12): World {
  let next = world;
  for (let week = 0; week < weeks; week += 1) {
    if (openJobListings(next, personId).length > 0) return next;
    next = letAdultTimePass(next, 7);
  }
  return next;
}

function passUntil(
  world: World,
  done: (world: World) => boolean,
  limitDays = 40,
): World {
  let next = world;
  for (let day = 0; day < limitDays && !done(next); day += 1)
    next = letAdultTimePass(next, 1);
  return next;
}

/** A town business in the shape the ordinary-life lane seats: an owner-run shop with staff on monthly wages. */
function seatShop(
  world: World,
  jurisdictionId: EntityId,
  staffPersonId: EntityId,
  name: string,
): World {
  let next = createOrganization(world, {
    stableKey: `test-shop:${jurisdictionId}:${name}`,
    formedAt: "2010-01-01",
    provenance: { kind: "authored", note: "test fixture" },
    initialProfile: {
      name,
      classification: "enterprise:retail",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const shop = next.history.organizations.at(-1)!;
  next = createWorkRelationship(next, {
    stableKey: `test-shop:${name}:staff`,
    personId: staffPersonId,
    organizationId: shop.id,
    startedAt: "2020-01-01",
    kind: "employment:local-business",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "test fixture" },
    initialRole: {
      title: "Cashier",
      occupationClassification: "occupation:cashier",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 45 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  return createResourceFlow(next, {
    stableKey: `test-shop:${name}:wages`,
    source: { kind: "organization", organizationId: shop.id },
    recipient: { kind: "person", personId: staffPersonId },
    startsAt: "2020-01-01",
    amount: money(280_000, "USD"),
    cadenceKind: "schedule:monthly",
    basisKind: "compensation:wages",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId,
    provenance: { kind: "authored", note: "test fixture" },
  });
}

function adultStranger(world: World, personId: EntityId): EntityId {
  return world.personOrder.find((id) => {
    const person = world.people[id]!;
    return (
      id !== personId &&
      ageOnDate(person.birthDate, world.currentDate) >= 25 &&
      !kinshipRelationshipsAt(world, personId).some((kin) =>
        kin.personIds.includes(id),
      )
    );
  })!;
}

describe("jobs in a town", () => {
  it("lists the town's own public employers with actual pay and hours, in several places", () => {
    for (const [place, seed] of [
      [ELY, "jobs-ely"],
      [HOUMA, "jobs-houma"],
      [RENO, "jobs-reno"],
    ] as const) {
      const start = begin(place, seed);
      const world = untilListed(start.world, start.personId);
      const view = projectJobMarket(world, start.personId);
      expect(view.listings.length, place).toBeGreaterThan(0);
      for (const listing of view.listings) {
        expect(listing.termsLine).toMatch(
          /^\$[\d,]+(\.\d\d)? (an hour|a year) · usually \d+(–\d+)? hours a week$/,
        );
        expect(listing.employerLine).not.toMatch(/fictional|County of /);
        expect(listing.closesLine).toMatch(/^Taking applications through /);
        // The median is optional detail, never the offer line.
        expect(listing.termsLine).not.toMatch(/median/i);
      }
      assertWorldIntegrity(world);
    }
    const ely = untilListed(
      begin(ELY, "jobs-ely").world,
      begin(ELY, "jobs-ely").personId,
    );
    expect(
      projectJobMarket(ely, begin(ELY, "jobs-ely").personId).townName,
    ).toBe("Ely");
  });

  it("draws each recruitment window once, inside the owner's range, and a reload keeps it", () => {
    const start = begin(ELY, "jobs-window");
    const world = untilListed(start.world, start.personId);
    const opening = openJobListings(world, start.personId)[0]!;
    const days =
      (Date.parse(opening.closesAt) - Date.parse(opening.opensAt)) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(
      JOB_TIMING.recruitmentWindowDays.minimum,
    );
    expect(days).toBeLessThanOrEqual(JOB_TIMING.recruitmentWindowDays.maximum);
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(jobOpening(reloaded, opening.id)).toEqual(opening);
    // Reading and refreshing the same day writes nothing new.
    expect(
      advanceJobMarket(reloaded, start.personId).history.jobOpenings,
    ).toEqual(reloaded.history.jobOpenings);
  });

  it("turns down an applicant for a reason tied to the role", () => {
    const start = begin(HOUMA, "jobs-decline");
    let world = untilListed(start.world, start.personId);
    const opening = openJobListings(world, start.personId).find(
      (row) => row.weeklyHours.minimumHours >= 30,
    );
    if (!opening) throw new Error("expected a full-time opening in Houma");
    // The player already works full time somewhere else in town.
    world = seatShop(
      world,
      world.people[start.personId]!.homeJurisdictionId,
      adultStranger(world, start.personId),
      "Bayou Feed & Seed",
    );
    world = createWorkRelationship(world, {
      stableKey: "test:player-full-time",
      personId: start.personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:local-business",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "test fixture" },
      initialRole: {
        title: "Cashier",
        occupationClassification: "occupation:cashier",
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const applied = applyForJob(world, start.personId, opening.id);
    expect(applied.ok).toBe(true);
    const application = applicationsFor(applied.world, start.personId)[0]!;
    const answered = passUntil(
      applied.world,
      (w) => latestApplicationStep(w, application.id) !== null,
    );
    const step = latestApplicationStep(answered, application.id)!;
    expect(step.kind).toBe("declined");
    expect(step.reason).toMatch(/full-time/);
    expect(
      projectJobMarket(answered, start.personId).applications[0]!.status,
    ).toMatch(/^They turned you down\./);
  });

  it("hires through someone the player knows, and pays the job weekly once started", () => {
    const start = begin(SAN_JUAN, "jobs-san-juan");
    let world = start.world;
    const home = world.people[start.personId]!.homeJurisdictionId;
    // Puerto Rico has no Census government listing, so no public body is
    // named; a town business is the employer here.
    expect(
      openJobListings(untilListed(world, start.personId, 2), start.personId),
    ).toEqual([]);
    const relative = kinshipRelationshipsAt(world, start.personId)
      .flatMap((kin) => kin.personIds)
      .find(
        (id) =>
          id !== start.personId &&
          ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 30,
      )!;
    world = seatShop(world, home, relative, "Colmado La Esquina");
    world = untilListed(world, start.personId);
    const opening = openJobListings(world, start.personId)[0]!;
    expect(introducersFor(world, start.personId, opening.id)).toEqual([
      relative,
    ]);
    const listing = projectJobMarket(world, start.personId).listings[0]!;
    expect(listing.employerLine).toMatch(/^Colmado La Esquina/);
    expect(listing.introducers[0]!.label).toMatch(/^Ask .+ to put in a word$/);

    const applied = applyForJob(world, start.personId, opening.id, relative);
    expect(applied.ok).toBe(true);
    const application = applicationsFor(applied.world, start.personId)[0]!;
    expect(application.route).toBe("introduced");
    world = passUntil(
      applied.world,
      (w) => latestApplicationStep(w, application.id) !== null,
    );
    const offer = latestApplicationStep(world, application.id)!;
    expect(offer.kind).toBe("offered");
    const replyDays =
      (Date.parse(offer.replyBy!) - Date.parse(offer.occurredAt)) / 86_400_000;
    expect(replyDays).toBeGreaterThanOrEqual(JOB_TIMING.offerReplyDays.minimum);
    expect(replyDays).toBeLessThanOrEqual(JOB_TIMING.offerReplyDays.maximum);

    // Save and reopen with the offer outstanding: the deadline does not move.
    world = deserializeWorld(serializeWorld(world));
    expect(latestApplicationStep(world, application.id)).toEqual(offer);

    const accepted = answerJobOffer(world, application.id, true);
    expect(accepted.ok).toBe(true);
    world = passUntil(accepted.world, (w) => w.currentDate >= offer.startAt!);
    const started = startJob(world, application.id);
    expect(started.ok).toBe(true);
    world = started.world;
    const work = world.history.workRelationships.at(-1)!;
    expect(work.kind).toBe(JOB_MARKET_WORK_KIND);
    expect(projectJobMarket(world, start.personId).heldJobs).toHaveLength(1);
    world = letAdultTimePass(world, 15);
    const flow = world.history.resourceFlows.find(
      (row) => row.stableKey === `job-pay:${work.id}`,
    )!;
    const paid = world.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow.id,
    );
    expect(paid.length).toBe(2);
    expect(paid[0]!.transferredAmount.minorUnits).toBe(
      opening.pay.amount.minorUnits * offer.agreedWeeklyHours!,
    );
    assertWorldIntegrity(world);
  });

  it("follows up or withdraws after a missed start, and lets an unanswered offer lapse", () => {
    const outcomes = new Set<string>();
    let lapsed = false;
    for (let index = 1; index <= 24; index += 1) {
      if (lapsed && outcomes.size === 2) break;
      const seed = `miss-${index}`;
      const start = begin(ELY, `jobs-${seed}`);
      let world = untilListed(start.world, start.personId);
      const opening = openJobListings(world, start.personId)[0]!;
      world = applyForJob(world, start.personId, opening.id).world;
      const application = applicationsFor(world, start.personId)[0]!;
      world = passUntil(
        world,
        (w) => latestApplicationStep(w, application.id) !== null,
      );
      const offer = latestApplicationStep(world, application.id)!;
      if (offer.kind !== "offered") continue;
      if (!lapsed) {
        // Nobody answers this one.
        const ignored = passUntil(
          world,
          (w) => latestApplicationStep(w, application.id)!.kind !== "offered",
        );
        expect(latestApplicationStep(ignored, application.id)!.kind).toBe(
          "offer-lapsed",
        );
        lapsed = true;
      }
      world = answerJobOffer(world, application.id, true).world;
      // The player never turns up.
      world = passUntil(
        world,
        (w) => latestApplicationStep(w, application.id)!.kind !== "accepted",
      );
      const after = latestApplicationStep(world, application.id)!;
      expect(["followed-up", "withdrawn"]).toContain(after.kind);
      outcomes.add(after.kind);
      if (after.kind === "followed-up") {
        world = passUntil(
          world,
          (w) =>
            latestApplicationStep(w, application.id)!.kind !== "followed-up",
        );
        expect(latestApplicationStep(world, application.id)!.kind).toBe(
          "withdrawn",
        );
        expect(
          projectJobMarket(world, start.personId).applications[0]!.status,
        ).toMatch(
          /^They withdrew the offer\. You missed the second start date/,
        );
      }
      assertWorldIntegrity(world);
    }
    expect(lapsed).toBe(true);
    expect([...outcomes].sort()).toEqual(["followed-up", "withdrawn"]);
  });
});
