import { describe, expect, it, vi } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { composeWorldTimeHandlers } from "../simulation/campaigns";
import { addDays, makeIsoDate } from "../simulation/dates";
import { resolveFutureDueItemsThrough } from "../simulation/future-transitions";
import {
  familyPlans,
  proposeFamilyPlan,
} from "../simulation/people-family-plan";
import {
  createHousehold,
  createOrganization,
  createPartnership,
  createWorkRelationship,
  recordHouseholdLocation,
  recordWorkStatus,
  startHouseholdMembership,
} from "../simulation/life";
import { personName } from "../simulation/people";
import { workStatusAt } from "../simulation/life-queries";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { TOWN_JOB_END_REASONS } from "../simulation/living-world/town-labor-market";
import { relocateHousehold } from "../simulation/migration/relocate";
import { SeededRng, pickDistinct } from "../simulation/rng";
import type { EntityId, World } from "../simulation/types";
import { recordEventKnowledge } from "../simulation/records";
import { recordWorldEvent } from "../simulation/world";
import { JOB_ENDED_EVENT } from "../simulation/neighbor-news";
import * as upbringing from "../simulation/people-upbringing";
import {
  CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
  WORLD_SNAPSHOT_FORMAT_VERSION,
  deserializeWorld,
  serializeWorldAs,
} from "../simulation/serialization";
import { explicitNewGameSetup } from "./new-game-geography";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { projectLivesRecord } from "./lives-record";

/**
 * LIVES step 5: what the screen reads. One place per file, drawn from all 56
 * by the seed, on a small world (tests/fixtures/small-world.ts).
 */
const SEED = "lives-screens-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const small = smallWorld({
  place: state!.jurisdictionKey,
  seed: SEED,
  people: 5,
});
const provenance = (note: string) => ({ kind: "authored" as const, note });

function withHousehold(world: World, personId: EntityId, key: string): World {
  let next = createHousehold(world, {
    stableKey: `${key}:household`,
    formedAt: world.currentDate,
    label: "Fixture household",
    provenance: provenance("LIVES screens fixture."),
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: next.people[personId]!.homeJurisdictionId,
    label: "Fixture residence",
    kind: "residence:community-base",
    provenance: provenance("LIVES screens fixture."),
    supersedesLocationId: null,
  });
  return startHouseholdMembership(next, {
    stableKey: `${key}:membership`,
    personId,
    householdId,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance: provenance("LIVES screens fixture."),
  });
}

/** The player is told of an event by somebody, through the knowledge writer. */
function tell(world: World, eventId: EntityId, toldBy: EntityId): World {
  const event = world.history.events.find((row) => row.id === eventId)!;
  return recordEventKnowledge(world, {
    stableKey: `lives-screens:told:${eventId}`,
    personId: small.personId,
    eventId,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "told-by", sourcePersonId: toldBy, claimId: null },
  });
}

describe(`LIVES screens in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("reads how the player grew up from the upbringing record, and writes nothing", () => {
    const first = projectLivesRecord(small.world, small.personId);
    expect(first.upbringing.length).toBeGreaterThanOrEqual(3);
    for (const line of first.upbringing) expect(line).toMatch(/[.]$/);
    expect(projectLivesRecord(small.world, small.personId)).toEqual(first);
    // No trait was ever recorded for this person, so none is claimed.
    expect(first.leanings).toEqual([]);
    expect(first.around).toEqual([]);
    expect(first.upbringing.join(" ")).not.toContain("ESTIMATED FROM AVERAGE");
    expect(first.upbringing.join(" ")).not.toMatch(/caregivers? per child/);
    const family = upbringing.upbringingFor(
      small.world,
      small.personId,
    ).familyContext!;
    expect(family.parentIds).toEqual([]);
    expect(family.estimatedParentCount).toBeNull();
    expect(family.placeId).not.toBeNull();
    expect(first.upbringing).toContain(
      `You grew up in ${small.world.jurisdictions[family.placeId!]!.name}.`,
    );
    // Composition estimates do not fabricate how caregivers treated someone.
    expect(first.upbringing.join(" ")).toContain("not on record");
  });

  it("keeps an ordinary profile's family records without estimate labels or capacity ratios, including a prior save format", () => {
    const seed = "team3-oct4-ordinary-profile-labels";
    const place = drawRandomPlace(seed);
    const game = generateOpeningLife(
      prepareOpeningLife(explicitNewGameSetup({ placeKey: place.key, seed })),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const before = JSON.stringify(world);
    const record = upbringing.upbringingFor(world, game.playerPersonId);
    const profile = projectLivesRecord(world, game.playerPersonId);
    const lines = profile.upbringing.join(" ");
    expect(record.familyContext).toBeDefined();
    expect(record.money.some((row) => row.source.kind !== "world-record")).toBe(
      true,
    );
    expect(lines).not.toContain("ESTIMATED FROM AVERAGE");
    expect(lines).not.toMatch(/caregivers? per child/);
    expect(lines).toMatch(/Growing up,|As a small child,/);
    expect(lines).toMatch(/Your parents were|You grew up/);
    if (record.familyContext!.estimatedSiblingCount !== null)
      expect(lines).toMatch(/You grew up with \d+ siblings?\./);
    if (record.familyContext!.congregationIds.length)
      expect(lines).toContain("Your family belonged to a congregation.");

    const carePersonId = [game.playerPersonId, ...world.personOrder].find(
      (id) =>
        upbringing.upbringingFor(world, id).caregiving === "estimated-care",
    );
    expect(carePersonId).toBeDefined();
    const careRecord = upbringing.upbringingFor(world, carePersonId!);
    expect(careRecord.familyContext!.caregiverCapacity).not.toBeNull();
    expect(projectLivesRecord(world, carePersonId!).upbringing).toContain(
      "Adults shared the care of the children in your family.",
    );
    expect(
      projectLivesRecord(world, carePersonId!).upbringing.join(" "),
    ).not.toMatch(/ESTIMATED FROM AVERAGE|caregivers? per child/);
    expect(upbringing.upbringingFor(world, game.playerPersonId)).toEqual(
      record,
    );
    expect(JSON.stringify(world)).toBe(before);

    // Existing, unpacked save formats retain every field and its provenance.
    // The snapshot stays in memory; no player save or live UI is touched.
    const saved = serializeWorldAs(
      world,
      world.contentPacks === undefined
        ? WORLD_SNAPSHOT_FORMAT_VERSION
        : CONTENT_PACK_SNAPSHOT_FORMAT_VERSION,
    );
    const restored = deserializeWorld(saved);
    expect(projectLivesRecord(restored, game.playerPersonId)).toEqual(profile);
    expect(upbringing.upbringingFor(restored, game.playerPersonId)).toEqual(
      record,
    );
    expect(upbringing.upbringingFor(restored, carePersonId!)).toEqual(
      careRecord,
    );
    expect(JSON.stringify(world)).toBe(before);
    expect(restored.currentDate).toBe(world.currentDate);
    console.info(
      JSON.stringify({
        receipt: "team3-oct4-ordinary-profile-labels",
        seed,
        place: place.displayName,
        placeKey: place.key,
        people: world.personOrder.length,
        currentDate: world.currentDate,
        playerProfile: profile.upbringing,
        caregiverProfile: projectLivesRecord(restored, carePersonId!)
          .upbringing,
        oldSaveFormat: JSON.parse(saved).formatVersion,
        worldUnchanged: true,
        clockUnchanged: true,
        provenanceRetained: true,
      }),
    );
  });

  it("keeps the legacy profile fallback and does not turn unrecorded care into a fact", () => {
    const legacy = { ...upbringing.upbringingFor(small.world, small.personId) };
    delete legacy.familyContext;
    const reader = vi
      .spyOn(upbringing, "upbringingFor")
      .mockReturnValue(legacy);
    const before = JSON.stringify(small.world);
    try {
      const profile = projectLivesRecord(small.world, small.personId);
      expect(profile.upbringing.join(" ")).toContain("not on record");
      expect(profile.upbringing.join(" ")).toMatch(
        /You stayed in one home|You moved a few times|Home kept being upended/,
      );
      expect(profile.upbringing.join(" ")).not.toMatch(
        /ESTIMATED FROM AVERAGE|caregivers? per child/,
      );
      expect(JSON.stringify(small.world)).toBe(before);
    } finally {
      reader.mockRestore();
    }
  });

  it("shows a neighbor's recorded job loss, with who and where, and not an unrelated end", () => {
    const neighbor = small.world.personOrder[1]!;
    let next = createOrganization(small.world, {
      stableKey: "lives-screens:employer",
      formedAt: small.world.currentDate,
      provenance: provenance("LIVES screens fixture employer."),
      initialProfile: {
        name: "Fixture Employer",
        classification: "custom:fixture-employer",
        locationJurisdictionId: small.jurisdictionId,
      },
    });
    const organizationId = next.history.organizations.at(-1)!.id;
    next = createWorkRelationship(next, {
      stableKey: "lives-screens:job",
      personId: neighbor,
      organizationId,
      startedAt: addDays(next.currentDate, -60),
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: provenance("LIVES screens fixture job."),
      initialRole: {
        title: "Fixture worker",
        occupationClassification: "service:fixture",
        locationJurisdictionId: small.jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 32, maximumHours: 40 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: small.jurisdictionId,
        },
      },
    });
    const job = next.history.workRelationships.at(-1)!;
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    next = recordWorkStatus(next, {
      stableKey: "lives-screens:job-lost",
      workRelationshipId: job.id,
      effectiveAt: next.currentDate,
      status: "ended",
      reason: TOWN_JOB_END_REASONS.laidOff,
      provenance: provenance("LIVES screens fixture layoff."),
      supersedesStatusId: workStatusAt(next, job.id)!.id,
    });
    // The layoff is a work status, and nobody has written an event for it, so
    // there is nothing to be told of: the screen shows nothing.
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    // A producer that did write the event, and told the player, would show it.
    const employer = "Fixture Employer";
    const who = personName(next.people[neighbor]!);
    next = recordWorldEvent(next, {
      stableKey: "lives-screens:job-ended-event",
      type: JOB_ENDED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: small.jurisdictionId,
      involvedEntityIds: [neighbor, organizationId],
      participants: [
        { personId: neighbor, role: "focus:subject", detail: "Lost the job" },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["work.job-ended", "reason:labor:laid-off"],
      summary: `${who} was laid off from ${employer}.`,
      context: {
        location: null,
        socialContext: "A layoff in town.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = next.history.events.at(-1)!.id;
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    const told = tell(next, eventId, small.world.personOrder[2]!);
    const [line] = projectLivesRecord(told, small.personId).around;
    expect(line).toMatchObject({ kind: "job-loss", at: told.currentDate });
    expect(line!.sentence).toContain(next.people[neighbor]!.givenName);
    expect(line!.sentence).toContain(employer);
  });

  it("shows a household moving out of town, from the recorded move", () => {
    const mover = small.world.personOrder[2]!;
    const before = withHousehold(small.world, mover, "lives-screens:mover");
    const moved = relocateHousehold(before, {
      stableKey: "lives-screens:move",
      personId: mover,
      toJurisdictionId: small.stateJurisdictionId,
      reason: "work:transfer",
      waveKey: null,
      why: "took a job elsewhere",
    });
    expect(projectLivesRecord(moved, small.personId).around).toEqual([]);
    const moveEvent = moved.history.events.find(
      (row) => row.type === "migration.moved",
    )!;
    const told = tell(moved, moveEvent.id, small.world.personOrder[3]!);
    const move = projectLivesRecord(told, small.personId).around.find(
      (line) => line.kind === "move",
    );
    expect(move, "the move is on the player's screen once told").toBeDefined();
    expect(move!.sentence).toContain("moved from");
    expect(move!.sentence).toContain("took a job elsewhere");
    expect(makeIsoDate(move!.at)).toBe(moved.currentDate);
  });

  it("shows a birth in town with its named parents", () => {
    const [a, b] = [small.world.personOrder[3]!, small.world.personOrder[4]!];
    let next = withHousehold(small.world, a, "lives-screens:parents");
    const householdId = next.history.households.at(-1)!.id;
    next = startHouseholdMembership(next, {
      stableKey: "lives-screens:parents:membership-b",
      personId: b,
      householdId,
      startedAt: next.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance: provenance("LIVES screens fixture."),
    });
    next = createPartnership(next, {
      stableKey: "lives-screens:partnership",
      personIds: [a, b].sort() as [EntityId, EntityId],
      kind: "legal:marriage",
      startedAt: addDays(next.currentDate, -400),
      provenance: provenance("LIVES screens fixture."),
    });
    next = resolveFutureDueItemsThrough(
      proposeFamilyPlan(next, { personId: a, kind: "birth" }),
      addDays(next.currentDate, 5),
      composeWorldTimeHandlers(),
    );
    const plan = familyPlans(next, a)[0]!;
    expect(plan.answer).toBe("agreed");
    next = resolveFutureDueItemsThrough(
      next,
      makeIsoDate(plan.resolvesOn!),
      composeWorldTimeHandlers(),
    );
    expect(projectLivesRecord(next, small.personId).around).toEqual([]);
    const birthEvent = next.history.events.find(
      (row) => row.type === "life.family-member-added",
    )!;
    const told = tell(next, birthEvent.id, a);
    const birth = projectLivesRecord(told, small.personId).around.find(
      (line) => line.kind === "birth",
    );
    expect(birth, "the birth is on the screen once told").toBeDefined();
    expect(birth!.sentence).toContain("was born to");
    expect(birth!.sentence).toContain(next.people[a]!.givenName);
    expect(birth!.sentence).toContain(next.people[b]!.givenName);
  });
});
