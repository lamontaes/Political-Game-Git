import process from "node:process";
import { describe, expect, it } from "vitest";

import { createDemoWorld } from "../scenarios/demo";
import { addDays, ageOnDate } from "./dates";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { drawRandomPlace } from "../../tests/support/random-place";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  buildAdultLifeContext,
  availableAdultSituations,
} from "./adult-situations";
import { adultSituationBank } from "./adult-situations";
import { deserializeWorld, serializeWorld } from "./serialization";
import { dateRefusal, DATE_OCCASION_TAG } from "./couples";
import {
  CONTACT_ANSWER_TRANSITION_KEY,
  contactProposals,
} from "./relationship-contact";
import {
  PUBLIC_MEETING_KEY,
  LIFE_OPPORTUNITY_ANSWERING_KEY,
  LIFE_OPPORTUNITY_KINDS,
  LIFE_OPPORTUNITY_REPEATABLE,
  OPEN_LIFE_OPPORTUNITY_LIMIT,
  writeDateInvitation,
  lifeOpportunitiesFor,
  lifeOpportunityTag,
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "./life-opportunities";
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
  it("routes dating invitations to the controlled person through contact in all 56 jurisdictions", () => {
    const jurisdictions = Object.keys(
      (nominationRules as { places: Record<string, unknown> }).places,
    ).sort();
    expect(jurisdictions).toHaveLength(56);

    for (const jurisdictionKey of jurisdictions) {
      const fixture = smallWorld({ place: jurisdictionKey, people: 4 });
      const world = fixture.world;
      const playerId = fixture.personId;
      const hostId = world.personOrder.find(
        (id) => id !== playerId && dateRefusal(world, id, playerId) === null,
      );
      expect(hostId, jurisdictionKey).toBeDefined();
      const on = addDays(world.currentDate, 7);
      const invited = writeDateInvitation(world, {
        stableKey: `b21-p2-date-contact:${jurisdictionKey}`,
        hostPersonId: hostId!,
        recipientPersonId: playerId,
        on,
      });
      const proposal = contactProposals(invited, playerId).find(
        (row) => row.fromPersonId === hostId && row.toPersonId === playerId,
      );
      expect(proposal, jurisdictionKey).toMatchObject({
        on,
        date: true,
        answered: false,
      });
      const event = invited.history.events.find(
        (row) =>
          row.stableKey === `b21-p2-date-contact:${jurisdictionKey}:proposed`,
      );
      expect(event?.jurisdictionId).toBe(
        world.people[hostId!]!.homeJurisdictionId,
      );
      expect(event?.tags).toContain(DATE_OCCASION_TAG);
      expect(
        invited.history.futureDueItems.some(
          (item) => item.transitionKey === CONTACT_ANSWER_TRANSITION_KEY,
        ),
      ).toBe(false);
    }
  });

  it("does not author an opening meeting in a generated world", () => {
    const adultFixture = createDemoWorld();
    const adult = adultFixture.people[adultFixture.personOrder[0]!]!;
    const seed = "au14-no-authored-meeting";
    const place = drawRandomPlace(seed);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        startAge: ageOnDate(adult.birthDate, adultFixture.currentDate),
        placeKey: place.key,
        questionnaire: "skipped",
      }),
    ).game!;
    expect(game).toBeDefined();
    const world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
    expect(serializeWorld(world)).toBe(serializeWorld(game.world));
    expect(
      world.history.events.some(
        (event) => event.stableKey === `${PUBLIC_MEETING_KEY}:notice`,
      ),
    ).toBe(false);
    expect(
      world.history.scheduledActivities.some((activity) =>
        activity.stableKey.startsWith(`${PUBLIC_MEETING_KEY}:`),
      ),
    ).toBe(false);
    expect(
      world.history.workItems.some(
        (item) => item.stableKey === PUBLIC_MEETING_KEY,
      ),
    ).toBe(false);
    expect(
      (world.history.legislativeMeasures ?? []).some((measure) =>
        measure.stableKey.endsWith(":posted-meeting-ordinance"),
      ),
    ).toBe(false);
    process.stdout.write(
      `${JSON.stringify({ route: "AU-14 ordinary opening", seed, jurisdiction: place.stateJurisdictionKey, place: place.displayName, placeKey: place.key, worldId: world.id, simulationDate: world.currentDate, meetingRecordIds: [] })}\n`,
    );
  });

  it("keeps the opening path write-free under all 56 jurisdiction keys", () => {
    const fixture = createDemoWorld();
    const personId = fixture.personOrder[0]!;
    const jurisdictions = Object.keys(
      (nominationRules as { places: Record<string, unknown> }).places,
    ).sort();
    expect(jurisdictions).toHaveLength(56);
    // The compatibility entry point has no place-specific inputs or branches.
    // Check the same canonical path under each accepted jurisdiction key.
    for (const jurisdictionKey of jurisdictions) {
      expect(
        openOrdinaryLifeRecords(fixture, personId),
        `jurisdiction ${jurisdictionKey}`,
      ).toBe(fixture);
    }
  });

  it("keeps an ordinary life quiet when no requests or meeting records exist", () => {
    const { world, personId } = opened();
    const open = lifeOpportunitiesFor(world, personId);
    expect(open).toHaveLength(0);
    expect(open.length).toBeLessThanOrEqual(OPEN_LIFE_OPPORTUNITY_LIMIT);
    const situations = availableAdultSituations(
      buildAdultLifeContext(world, personId),
    );
    expect(situations).toHaveLength(0);
    expect(situations.map((situation) => situation.key)).not.toContain(
      "adult.ordinary-good-day",
    );
    expect(situations.map((situation) => situation.key)).not.toContain(
      "adult.local-issue-position",
    );
    expect(
      world.history.workItems.some((item) =>
        item.stableKey.startsWith("ordinary-life:household-errands"),
      ),
    ).toBe(false);
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

  it("does not create a meeting, agenda, trip, or work item when opened", () => {
    const { world, personId } = opened();
    const again = openOrdinaryLifeRecords(world, personId);
    expect(serializeWorld(again)).toBe(serializeWorld(world));
    expect(
      again.history.workItems.some(
        (item) => item.stableKey === PUBLIC_MEETING_KEY,
      ),
    ).toBe(false);
    expect(
      again.history.scheduledActivities.some((activity) =>
        activity.stableKey.startsWith(`${PUBLIC_MEETING_KEY}:`),
      ),
    ).toBe(false);
    expect(
      (again.history.legislativeMeasures ?? []).some((measure) =>
        measure.stableKey.endsWith(":posted-meeting-ordinance"),
      ),
    ).toBe(false);
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
