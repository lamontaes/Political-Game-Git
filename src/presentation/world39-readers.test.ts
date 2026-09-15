import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectWorld39News } from "./world39-news";
import { projectWorld39Journal } from "./world39-journal";
import {
  recordWorldEvent,
  recordEventKnowledge,
  recordMemory,
  serializeWorld,
  deserializeWorld,
  type World,
  type EntityId,
  type EventVisibility,
  type EventParticipantRole,
} from "../simulation";
import { publishPublicEvent } from "../simulation/public-information";

function opening(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 34,
      givenName: "Maya",
      familyName: "Reed",
    }),
  ).game!;
}
function event(
  world: World,
  personId: EntityId,
  key: string,
  summary: string,
  visibility: EventVisibility,
  role: EventParticipantRole = "agency:actor",
) {
  return recordWorldEvent(world, {
    stableKey: key,
    type: "community.meeting",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role, detail: null }],
    personFactConstraints: [],
    visibility,
    tags: ["choice.attend"],
    summary,
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

describe("WORLD39 saved-world readers", () => {
  it("orients an actual opening life before any reporter event and never writes on reads", () => {
    const { world, playerPersonId } = opening("world39-populated");
    const before = serializeWorld(world);
    const model = projectWorld39News(world, playerPersonId);
    expect(model.publications.items).toHaveLength(0);
    expect(model.officeholders).toHaveLength(2);
    for (const holder of model.officeholders) {
      expect(world.people[holder.personId]).toBeDefined();
      expect(
        world.history.events.some((entry) => entry.id === holder.termId),
      ).toBe(true);
      expect(holder.institution).toBeTruthy();
    }
    const journal = projectWorld39Journal(world, playerPersonId);
    expect(journal.name).toBe("Maya Reed");
    expect(journal.entries[0]!.at).toBe(
      world.people[playerPersonId]!.birthDate,
    );
    expect(
      journal.entries.some((entry) => entry.text.includes("enrolled")),
    ).toBe(true);
    expect(serializeWorld(world)).toBe(before);
    expect(
      projectWorld39Journal(deserializeWorld(before), playerPersonId),
    ).toEqual(journal);
    expect(
      projectWorld39News(deserializeWorld(before), playerPersonId),
    ).toEqual(model);
  });

  it("keeps actual publications and raw public events separate, with canonical IDs and dates", () => {
    const game = opening("world39-publication");
    const acted = event(
      game.world,
      game.playerPersonId,
      "public-attendance",
      "Maya Reed attended the neighborhood meeting.",
      "public",
    );
    const source = acted.history.events.at(-1)!;
    const unpublished = projectWorld39News(acted, game.playerPersonId);
    expect(
      unpublished.publicEvents.find((entry) => entry.id === source.id)?.summary,
    ).toBe(source.summary);
    const published = publishPublicEvent(acted, {
      stableKey: "meeting-report",
      sourceEventId: source.id,
    });
    const model = projectWorld39News(published, game.playerPersonId);
    expect(model.publicEvents.some((entry) => entry.id === source.id)).toBe(
      false,
    );
    expect(model.publications.items[0]?.sourceEventId).toBe(source.id);
    expect(model.publications.items[0]?.publicationId).toBe(
      published.history.publications?.[0]?.id,
    );
    expect(model.publications.items[0]?.eventTime).toBe(source.occurredAt);
    expect(model.learnedEventIds.has(source.id)).toBe(false);
  });

  it("refuses private subject-only truth while retaining this person's fallible account", () => {
    const game = opening("world39-private");
    const hidden = event(
      game.world,
      game.playerPersonId,
      "private-subject",
      "The committee privately discussed canceling Maya's visit.",
      "private",
      "focus:subject",
    );
    const source = hidden.history.events.at(-1)!;
    expect(
      JSON.stringify(projectWorld39News(hidden, game.playerPersonId)),
    ).not.toContain(source.summary);
    expect(
      projectWorld39Journal(hidden, game.playerPersonId).entries.some(
        (entry) => entry.text === source.summary,
      ),
    ).toBe(false);
    const sourcePersonId = Object.keys(hidden.people).find(
      (id) => id !== game.playerPersonId,
    )! as EntityId;
    const informed = recordEventKnowledge(hidden, {
      stableKey: "heard-account",
      personId: game.playerPersonId,
      eventId: source.id,
      learnedAt: hidden.currentDate,
      believedSummary: "The visit may be postponed.",
      accuracy: "partial",
      confidence: "low",
      source: { kind: "rumor", sourcePersonId, chainDescription: null },
    });
    const journal = projectWorld39Journal(informed, game.playerPersonId);
    expect(
      journal.entries.find((entry) => entry.kind === "account")?.text,
    ).toBe("The visit may be postponed.");
    expect(journal.entries.some((entry) => entry.text === source.summary)).toBe(
      false,
    );
  });

  it("retains agreement as agreement and same-date action order after save/reopen", () => {
    const game = opening("world39-agreement");
    const agreed = event(
      game.world,
      game.playerPersonId,
      "agreement",
      "You agreed to cover the afternoon shift.",
      "private",
    );
    const performed = event(
      agreed,
      game.playerPersonId,
      "performance",
      "You completed the afternoon shift.",
      "private",
    );
    const before = projectWorld39Journal(agreed, game.playerPersonId);
    expect(before.entries.at(-1)?.text).toBe(
      "You agreed to cover the afternoon shift.",
    );
    expect(
      before.entries.some((entry) =>
        entry.text.includes("completed the afternoon"),
      ),
    ).toBe(false);
    const after = projectWorld39Journal(
      deserializeWorld(serializeWorld(performed)),
      game.playerPersonId,
    );
    expect(after.entries.slice(-2).map((entry) => entry.text)).toEqual([
      "You agreed to cover the afternoon shift.",
      "You completed the afternoon shift.",
    ]);
    expect(performed.currentMoment).toEqual(game.world.currentMoment);
  });

  it("labels a private secondhand memory as recollection, never event truth", () => {
    const game = opening("world39-memory");
    const hidden = event(
      game.world,
      game.playerPersonId,
      "private-memory",
      "Maya was discussed privately.",
      "private",
      "focus:subject",
    );
    const source = hidden.history.events.at(-1)!;
    const remembered = recordMemory(hidden, {
      stableKey: "memory-account",
      personId: game.playerPersonId,
      eventId: source.id,
      formedAt: hidden.currentDate,
      rememberedSummary: "You remember being told the visit would go ahead.",
      interpretation: "A recollection, not confirmation.",
      strength: "moderate",
      relevanceTags: [],
      supersedesMemoryId: null,
    });
    const model = projectWorld39Journal(remembered, game.playerPersonId);
    expect(model.entries.at(-1)?.kind).toBe("memory");
    expect(model.entries.at(-1)?.text).toBe(
      "You remember being told the visit would go ahead.",
    );
  });

  it("handles sparse and changed saves without retaining another life's names or events", () => {
    const first = opening("world39-first-save");
    projectWorld39Journal(first.world, first.playerPersonId);
    projectWorld39News(first.world, first.playerPersonId);
    const second = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "world39-sparse",
      startAge: 5,
      depth: "play-formative-years",
      givenName: "Avery",
      familyName: "Stone",
    });
    const model = projectWorld39News(second.world, second.playerPersonId);
    expect(model.officeholders).toHaveLength(0);
    expect(model.publications.items).toHaveLength(0);
    expect(
      projectWorld39Journal(second.world, second.playerPersonId).name,
    ).toBe("Avery Stone");
    expect(
      JSON.stringify(
        projectWorld39Journal(second.world, second.playerPersonId),
      ),
    ).not.toContain("Maya Reed");
  });
});
