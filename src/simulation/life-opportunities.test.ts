import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./demo";
import {
  buildAdultLifeContext,
  availableAdultSituations,
} from "./adult-situations";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  peopleInHouseholdAt,
} from "./life-queries";
import { relationshipLeverage } from "./relationship-leverage";
import { adultSituationBank } from "./adult-situations";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  ASSISTANCE_OFFER_DEPENDENCY_FLOOR,
  HOUSEHOLD_ERRANDS_KEY,
  HOUSEHOLD_WEEK_DAYS,
  LIFE_OPPORTUNITY_ANSWERING_KEY,
  LIFE_OPPORTUNITY_KINDS,
  LIFE_OPPORTUNITY_REPEATABLE,
  OPEN_LIFE_OPPORTUNITY_LIMIT,
  householdErrandsFor,
  lifeOpportunitiesFor,
  lifeOpportunityTag,
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "./life-opportunities";
import { advanceWorld, recordWorldEvent } from "./world";
import { applyCharacterHistoryPlan } from "./character-history";
import { createStableId } from "./ids";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import type { EntityId, World } from "./types";

/**
 * The writer that keeps an adult life going, held to the rules a writer has to
 * keep.
 *
 * The scene bank next door proves that a situation reads its premise and never
 * invents one. That is only half a contract: a world that never writes a
 * premise leaves the bank correct and the game unplayable, which is exactly
 * what the P2A2 audit reproduced. These are the other half — that the writing
 * happens, that it happens once, that it happens only at a transition, and that
 * it never reaches for a fact it has not been given.
 */

function opened(): { world: World; personId: EntityId } {
  const bare = createDemoWorld();
  const personId = bare.personOrder[0]!;
  return {
    world: refreshLifeOpportunities(
      openOrdinaryLifeRecords(bare, personId),
      personId,
    ),
    personId,
  };
}

describe("a life is given something to do", () => {
  it("leaves an opened adult life with more than one thing in front of them", () => {
    const { world, personId } = opened();
    const open = lifeOpportunitiesFor(world, personId);
    expect(open.length).toBeGreaterThan(1);
    expect(open.length).toBeLessThanOrEqual(OPEN_LIFE_OPPORTUNITY_LIMIT);
    expect(
      availableAdultSituations(buildAdultLifeContext(world, personId)).length,
    ).toBeGreaterThan(4);
  });

  it("writes the same world twice when it is called twice", () => {
    const { world, personId } = opened();
    const again = refreshLifeOpportunities(world, personId);
    expect(serializeWorld(again)).toBe(serializeWorld(world));
    const third = refreshLifeOpportunities(
      refreshLifeOpportunities(again, personId),
      personId,
    );
    expect(serializeWorld(third)).toBe(serializeWorld(world));
  });

  it("writes the same world after a save and a reload", () => {
    const { world, personId } = opened();
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(serializeWorld(refreshLifeOpportunities(reloaded, personId))).toBe(
      serializeWorld(world),
    );
  });

  it("opens the ordinary week once, however often it is asked", () => {
    const { world, personId } = opened();
    const again = openOrdinaryLifeRecords(world, personId);
    expect(
      again.history.workItems.filter((item) =>
        item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY),
      ),
    ).toHaveLength(
      world.history.workItems.filter((item) =>
        item.stableKey.startsWith(HOUSEHOLD_ERRANDS_KEY),
      ).length,
    );
  });

  it("writes nothing at all for somebody the formative interval still holds", () => {
    const world = createDemoWorld();
    const child = world.personOrder.find(
      (candidate) =>
        (world.people[candidate]?.birthDate ?? "0000-01-01") > "2010-01-01",
    );
    if (!child) return;
    expect(serializeWorld(refreshLifeOpportunities(world, child))).toBe(
      serializeWorld(world),
    );
  });

  it("writes nothing for somebody who is not in the world", () => {
    const world = createDemoWorld();
    expect(
      serializeWorld(
        refreshLifeOpportunities(world, "person_nobody" as EntityId),
      ),
    ).toBe(serializeWorld(world));
  });
});

describe("what it writes is a request, and only a request", () => {
  it("names an actual other person, and never one it invented", () => {
    const { world, personId } = opened();
    for (const entry of lifeOpportunitiesFor(world, personId)) {
      if (entry.counterpartPersonId === null) continue;
      expect(world.people[entry.counterpartPersonId]).toBeDefined();
      expect(entry.counterpartPersonId).not.toBe(personId);
    }
  });

  it("tells the person it is about, and nobody else", () => {
    const { world, personId } = opened();
    for (const entry of lifeOpportunitiesFor(world, personId)) {
      const event = world.history.events.find(
        (candidate) => candidate.id === entry.eventId,
      )!;
      // A private ask has two people in it. Nobody else is recorded as having
      // heard it, and nobody else is given knowledge of it.
      const knowers = world.history.knowledge
        .filter((record) => record.eventId === event.id)
        .map((record) => record.personId);
      expect(knowers).toContain(personId);
      for (const knower of knowers) {
        expect(event.involvedEntityIds).toContain(knower);
      }
      if (event.visibility === "private") {
        expect(event.involvedEntityIds.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("records no agreement, no outcome and no commitment", () => {
    const bare = createDemoWorld();
    const personId = bare.personOrder[0]!;
    const world = refreshLifeOpportunities(
      openOrdinaryLifeRecords(bare, personId),
      personId,
    );
    // An ask is an ask. Nothing about the player's answer exists yet: no
    // relationship interaction, no memory, no commitment, no participation.
    expect(world.history.relationshipInteractions.length).toBe(
      bare.history.relationshipInteractions.length,
    );
    expect(world.history.memories.length).toBe(bare.history.memories.length);
    expect(world.history.lifeCommitments.length).toBe(
      bare.history.lifeCommitments.length,
    );
    expect(world.history.organizationParticipations?.length ?? 0).toBe(
      bare.history.organizationParticipations?.length ?? 0,
    );
  });

  it("dates every occasion it writes on or after the day it was asked", () => {
    const { world, personId } = opened();
    for (const entry of lifeOpportunitiesFor(world, personId)) {
      if (entry.occasionDate === null) continue;
      expect(entry.occasionDate >= entry.openedAt).toBe(true);
    }
  });
});

describe("the bank and the writer agree about what they are for", () => {
  it("names an answering family that the bank actually authors", () => {
    const keys = new Set(adultSituationBank().map((entry) => entry.key));
    for (const kind of LIFE_OPPORTUNITY_KINDS) {
      expect(keys).toContain(LIFE_OPPORTUNITY_ANSWERING_KEY[kind]);
    }
  });

  it("declares exactly the situations that name it, and no others", () => {
    for (const situation of adultSituationBank()) {
      if (situation.opportunity === undefined) continue;
      expect(LIFE_OPPORTUNITY_ANSWERING_KEY[situation.opportunity]).toBe(
        situation.key,
      );
    }
    for (const kind of LIFE_OPPORTUNITY_KINDS) {
      const answering = adultSituationBank().find(
        (situation) => situation.key === LIFE_OPPORTUNITY_ANSWERING_KEY[kind],
      )!;
      expect(answering.opportunity).toBe(kind);
      expect(answering.withheld).toBeUndefined();
    }
  });

  it("repeats exactly the kinds whose scene is an ordinary one", () => {
    // The copy in `LIFE_OPPORTUNITY_REPEATABLE` exists because the bank cannot
    // be imported into the writer without a cycle. This is the pin that stops
    // the copy drifting from the original.
    for (const kind of LIFE_OPPORTUNITY_KINDS) {
      const answering = adultSituationBank().find(
        (situation) => situation.key === LIFE_OPPORTUNITY_ANSWERING_KEY[kind],
      )!;
      expect(LIFE_OPPORTUNITY_REPEATABLE[kind]).toBe(
        answering.stakes === "ordinary",
      );
    }
  });

  it("offers a scene only while its request is open", () => {
    const { world, personId } = opened();
    const context = buildAdultLifeContext(world, personId);
    const open = new Set(
      lifeOpportunitiesFor(world, personId).map((entry) => entry.kind),
    );
    for (const situation of availableAdultSituations(context)) {
      if (situation.opportunity === undefined) continue;
      expect(open.has(situation.opportunity)).toBe(true);
    }
  });

  it("tags every request with the kind it is, and one kind only", () => {
    const { world, personId } = opened();
    for (const entry of lifeOpportunitiesFor(world, personId)) {
      const event = world.history.events.find(
        (candidate) => candidate.id === entry.eventId,
      )!;
      const tags = event.tags.filter((tag) =>
        tag.startsWith("life.opportunity:"),
      );
      expect(tags).toStrictEqual([lifeOpportunityTag(entry.kind)]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Ordinary work and ordinary help                                             */
/* -------------------------------------------------------------------------- */

/**
 * A life with a job, a supervisor at that job, and a week gone by.
 *
 * The supervisor is the only thing the fixture adds beyond an ordinary new
 * game, and it is added because `relationship-leverage.ts` reads working where
 * somebody directs the work as one of the four strands a life can be leaning
 * on. Nothing here sets a dependency number; the reading comes out of the
 * employment records the same way it does in play.
 */
function employedLife(seed: string): {
  world: World;
  personId: EntityId;
  supervisorId: EntityId;
} {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    // An adult with a life already in progress. Below the formative interval
    // the writer declines to write anything at all, which is its own proof
    // elsewhere and would make this fixture prove nothing.
    startAge: 30,
    seed,
    depth: "summarize-earlier-life",
  });
  const personId = game.playerPersonId;
  // Somebody who does not live with them: the scene is about the person who
  // directs the work, and a housemate would fold two different kinds of
  // reliance into one reading.
  const household = new Set(
    peopleInHouseholdAt(game.world, personId, currentLifeCutoff(game.world)),
  );
  const supervisorId = game.world.personOrder.find(
    (id) => id !== personId && !household.has(id),
  )!;
  const jurisdictionId = game.world.people[personId]!.homeJurisdictionId;
  const organizationId = createStableId(
    "organization",
    `${game.world.id}:test:employer`,
  );
  const provenance = {
    kind: "generated" as const,
    generatorKey: "test:life-opportunities",
  };
  const job = (who: EntityId, authority: "directed" | "directs-others") => ({
    kind: "work" as const,
    input: {
      stableKey: `test:work:${who}`,
      personId: who,
      organizationId,
      startedAt: game.world.currentDate,
      kind: "employment:part-time" as const,
      compensation: "paid" as const,
      authority,
      dependency: "dependent" as const,
      economicRisk: "organization-borne" as const,
      provenance,
      initialRole: {
        title: "Store assistant",
        occupationClassification: "occupation:retail-assistant" as const,
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 8, maximumHours: 16 },
          attention: "low" as const,
          concurrency: "mostly-concurrent" as const,
          scheduleRigidity: "flexible" as const,
          interruptibility: "interruptible" as const,
          locationJurisdictionId: jurisdictionId,
        },
      },
    },
  });
  const world = applyCharacterHistoryPlan(game.world, {
    stableKey: `test:life-opportunities:${seed}`,
    mode: "quick-generated",
    personId,
    transitions: [
      {
        kind: "organization" as const,
        input: {
          stableKey: "test:employer",
          formedAt: game.world.currentDate,
          provenance,
          initialProfile: {
            name: "Test employer",
            classification: "enterprise:retail" as const,
            locationJurisdictionId: jurisdictionId,
          },
        },
      },
      job(personId, "directed"),
      job(supervisorId, "directs-others"),
    ],
  }).world;
  return { world, personId, supervisorId };
}

/** Stands in for the player having played a family, which is what closes it. */
function answerFamily(
  world: World,
  personId: EntityId,
  answeringKey: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `test:answered:${answeringKey}:${world.currentDate}`,
    type: "life.situation-answered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:chose", detail: "Answered the situation" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [answeringKey],
    summary: "The situation was answered.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("the job somewhere else, and the help with strings", () => {
  it("offers the other job from somebody who does not work where they work", () => {
    const { world: bare, personId } = employedLife("offer-elsewhere");
    let world = refreshLifeOpportunities(
      openOrdinaryLifeRecords(bare, personId),
      personId,
    );
    // A life is only ever given a few things at once, so the other families
    // are played first. The cap is proved elsewhere; what is proved here is
    // what this world writes once there is room for it.
    for (const kind of LIFE_OPPORTUNITY_KINDS) {
      if (kind === "employment-offer") continue;
      world = answerFamily(
        world,
        personId,
        LIFE_OPPORTUNITY_ANSWERING_KEY[kind],
      );
    }
    world = refreshLifeOpportunities(world, personId);
    const offer = lifeOpportunitiesFor(world, personId).find(
      (entry) => entry.kind === "employment-offer",
    );
    expect(offer).toBeDefined();

    const cutoff = currentLifeCutoff(world);
    const employerIds = new Set(
      activeWorkRelationshipsAt(world, personId, cutoff).map(
        (entry) => entry.relationship.organizationId,
      ),
    );
    // The point of the scene is that nobody at work has heard it. So the
    // person who mentioned it does not work there, and nobody who does is in
    // the record at all.
    const asker = offer!.counterpartPersonId!;
    expect(
      activeWorkRelationshipsAt(world, asker, cutoff).some((entry) =>
        employerIds.has(entry.relationship.organizationId),
      ),
    ).toBe(false);
    const event = world.history.events.find(
      (candidate) => candidate.id === offer!.eventId,
    )!;
    expect(event.visibility).toBe("private");
    expect(event.involvedEntityIds).toStrictEqual([personId, asker]);

    // And the scene that was withheld for exactly this record is now offered.
    expect(
      availableAdultSituations(buildAdultLifeContext(world, personId)).map(
        (situation) => situation.key,
      ),
    ).toContain("adult.work-offer-elsewhere");
  });

  it("starts no job and changes no employment by mentioning one", () => {
    const { world: bare, personId } = employedLife("offer-elsewhere-writes");
    const opened = openOrdinaryLifeRecords(bare, personId);
    const world = refreshLifeOpportunities(opened, personId);
    expect(world.history.workRelationships.length).toBe(
      opened.history.workRelationships.length,
    );
    expect(world.history.workStatuses.length).toBe(
      opened.history.workStatuses.length,
    );
  });

  it("offers help only about errands the record says are still outstanding", () => {
    const {
      world: bare,
      personId,
      supervisorId,
    } = employedLife("help-strings");
    // The reading the scene's own gate gets, out of the employment records.
    expect(
      relationshipLeverage(bare, personId, supervisorId).imbalance,
    ).toBeGreaterThanOrEqual(ASSISTANCE_OFFER_DEPENDENCY_FLOOR);

    const opened = openOrdinaryLifeRecords(bare, personId);
    // The day the errands arrive, they are not yet a thing anybody has failed
    // to deal with, and no offer of help is written about them.
    const sameDay = refreshLifeOpportunities(opened, personId);
    expect(
      lifeOpportunitiesFor(sameDay, personId).some(
        (entry) => entry.kind === "assistance-offer",
      ),
    ).toBe(false);

    // A week on, with the list still open and the other requests answered.
    let later = advanceWorld(sameDay, HOUSEHOLD_WEEK_DAYS + 1);
    expect(householdErrandsFor(later, personId)).not.toBeNull();
    for (const kind of LIFE_OPPORTUNITY_KINDS) {
      if (kind === "assistance-offer") continue;
      later = answerFamily(
        later,
        personId,
        LIFE_OPPORTUNITY_ANSWERING_KEY[kind],
      );
    }
    later = refreshLifeOpportunities(later, personId);

    const help = lifeOpportunitiesFor(later, personId).find(
      (entry) => entry.kind === "assistance-offer",
    );
    expect(help).toBeDefined();
    expect(help!.counterpartPersonId).toBe(supervisorId);
    const event = later.history.events.find(
      (candidate) => candidate.id === help!.eventId,
    )!;
    // The offer names the actual open item rather than a problem invented for
    // the scene.
    expect(event.summary).toContain(
      householdErrandsFor(later, personId)!.title.toLowerCase(),
    );
  });

  it("writes no offer of help where nothing says anybody is relied on", () => {
    const { world, personId } = opened();
    // The demo world has no lopsided relationship in it, so there is nobody
    // whose help would come with anything attached — and the honest answer is
    // silence rather than an offer from a person the world never leaned on.
    for (const candidate of world.personOrder) {
      if (candidate === personId) continue;
      expect(
        relationshipLeverage(world, personId, candidate).imbalance,
      ).toBeLessThan(ASSISTANCE_OFFER_DEPENDENCY_FLOOR);
    }
    expect(
      lifeOpportunitiesFor(world, personId).some(
        (entry) => entry.kind === "assistance-offer",
      ),
    ).toBe(false);
  });

  it("measures the dependency at the floor the scene itself reads", () => {
    // The floor is a copy, for the same reason the repeatable table is: the
    // bank cannot be imported into the writer without a cycle. This is the pin
    // that stops the writer offering help the bank would then refuse to show.
    const situation = adultSituationBank().find(
      (entry) => entry.key === "adult.help-with-strings",
    )!;
    const context = buildAdultLifeContext(opened().world, opened().personId);
    expect(
      situation.available({
        ...context,
        strongestDependency: ASSISTANCE_OFFER_DEPENDENCY_FLOOR,
      }),
    ).toBe(true);
    expect(
      situation.available({
        ...context,
        strongestDependency: ASSISTANCE_OFFER_DEPENDENCY_FLOOR - 0.01,
      }),
    ).toBe(false);
  });
});
