import { describe, expect, it } from "vitest";

import { addDays } from "./dates";
import { createStableId } from "./ids";
import {
  correctPublication,
  projectPublicInformationDigest,
  publishPublicEvent,
} from "./public-information";
import { recordLegislativeCommitment } from "./legislative-politics";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";
import { recordWorldEvent } from "./world";
import {
  applyLegislativeCommand,
  openLegislativeWork,
  type LegislativeAssignment,
} from "../presentation/legislation-world";
import { createNewGameWorld } from "../presentation/new-game";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import { projectDynamicSurfaces } from "../presentation/surface-projection";
import { SCENE_REGISTRY } from "../presentation/scene-registry";
import {
  bindSceneSurfaces,
  dynamicSurfacePayloads,
} from "../presentation/surface-binding";
import { availableMeasureSteps } from "./legislation";

interface OpenedWork {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly measureId: EntityId;
  readonly assignment: LegislativeAssignment;
}

function openWork(seed: string): OpenedWork {
  const game = createNewGameWorld({
    seed,
    placeKey: "kentucky",
    startAge: 30,
    depth: "summarize-earlier-life",
    startingLife: "legislative-office",
    household: "shares-a-home",
    givenName: null,
    familyName: null,
  });
  const capabilities = resolvePlayerCapabilities(game.world);
  const jurisdictionId = capabilities.legislativeJurisdictionId!;
  const opened = openLegislativeWork(game.world, {
    scenarioKey: capabilities.legislativeScenarioKey!,
    playerPersonId: game.playerPersonId,
    jurisdictionId,
  });
  return {
    world: opened.world,
    playerPersonId: game.playerPersonId,
    jurisdictionId,
    measureId: opened.assignment.measureId,
    assignment: opened.assignment,
  };
}

function advance(opened: OpenedWork, untilVote: boolean): World {
  let world = opened.world;
  for (let count = 0; count < 30; count += 1) {
    if (
      untilVote &&
      (world.history.legislativeVotes ?? []).some(
        (vote) => vote.measureId === opened.measureId,
      )
    ) {
      return world;
    }
    const step = availableMeasureSteps(world, opened.measureId)[0];
    if (!step) return world;
    world = applyLegislativeCommand(world, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
    if (!untilVote) return world;
  }
  return world;
}

function latestVoteSource(world: World): EntityId {
  const vote = (world.history.legislativeVotes ?? []).at(-1)!;
  const action = (world.history.legislativeActions ?? []).find(
    (candidate) => candidate.voteId === vote.id,
  )!;
  return action.eventId;
}

describe("canonical public information", () => {
  it("drives one recorded vote through publication, digest, and television", () => {
    const opened = openWork("news-help2-vote-path");
    const voted = advance(opened, true);
    const vote = (voted.history.legislativeVotes ?? []).at(-1)!;
    const published = publishPublicEvent(voted, {
      stableKey: "civic-ledger:vote-path",
      sourceEventId: latestVoteSource(voted),
    });

    const digest = projectPublicInformationDigest(
      published,
      opened.jurisdictionId,
    );
    expect(digest.items).toHaveLength(1);
    expect(digest.items[0]).toMatchObject({
      kind: "recorded-vote",
      eventTime: vote.takenAt,
      publicationTime: published.currentDate,
    });
    expect(digest.items[0]!.body).toContain(
      `Recorded vote: ${vote.tally.yea} yea, ${vote.tally.nay} nay; ${vote.outcome}.`,
    );

    const projection = projectDynamicSurfaces(published, {
      jurisdictionId: opened.jurisdictionId,
      measureId: opened.measureId,
    });
    expect(projection.facts.get("headline")?.text).toBe(
      digest.items[0]!.headline,
    );
    const televisionScene = SCENE_REGISTRY.scenes.get(
      "residence-apartment-living-canonical-03",
    )!;
    const television = bindSceneSurfaces(
      televisionScene,
      dynamicSurfacePayloads(projection),
    ).find((binding) => binding.slotId === "living-room-television")!;
    expect(television).toMatchObject({
      state: "bound",
      contentClass: "headline",
      shows: digest.items[0]!.headline,
      access: "public-broadcast",
    });
  });

  it("keeps publication explicit, deterministic, append-only, and persistent", () => {
    const opened = openWork("news-help2-corrections");
    const progressed = advance(opened, false);
    const action = (progressed.history.legislativeActions ?? []).at(-1)!;
    const beforeRead = serializeWorld(progressed);
    expect(projectPublicInformationDigest(progressed).items).toEqual([]);
    expect(serializeWorld(progressed)).toBe(beforeRead);

    const first = publishPublicEvent(progressed, {
      stableKey: "civic-ledger:first-edition",
      sourceEventId: action.eventId,
    });
    expect(() =>
      publishPublicEvent(first, {
        stableKey: "civic-ledger:duplicate-edition",
        sourceEventId: action.eventId,
      }),
    ).toThrow(/already has an initial edition/u);
    const original = first.history.publications![0]!;
    const corrected = correctPublication(first, {
      stableKey: "civic-ledger:first-correction",
      correctsPublicationId: original.id,
      headline: `${original.headline} — corrected`,
      body: `${original.body} The public record remains the source.`,
      correctionNote: "Clarified the description without changing the event.",
    });
    const item = projectPublicInformationDigest(corrected).items[0]!;
    expect(item.publicationId).toBe(original.id);
    expect(item.corrections).toHaveLength(1);
    expect(item.headline).toContain("corrected");
    expect(corrected.history.publications![0]).toEqual(original);

    const loaded = deserializeWorld(serializeWorld(corrected));
    expect(projectPublicInformationDigest(loaded)).toEqual(
      projectPublicInformationDigest(corrected),
    );
    expect(loaded.history.publications).toEqual(corrected.history.publications);
  });

  it("publishes another represented civic event and keeps person references typed", () => {
    const opened = openWork("news-help2-civic-event");
    const eventWorld = recordWorldEvent(opened.world, {
      stableKey: "civic:community-meeting",
      type: "civic.community-meeting-held",
      occurredAt: opened.world.currentDate,
      recordedAt: opened.world.currentDate,
      jurisdictionId: opened.jurisdictionId,
      involvedEntityIds: [opened.jurisdictionId, opened.playerPersonId],
      participants: [
        {
          personId: opened.playerPersonId,
          role: "presence:attendee",
          detail: null,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["civic"],
      summary: "Residents met for the scheduled public community meeting.",
      context: {
        location: {
          jurisdictionId: opened.jurisdictionId,
          label: "Community meeting room",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = eventWorld.history.events.at(-1)!;
    const published = publishPublicEvent(eventWorld, {
      stableKey: "civic-ledger:community-meeting",
      sourceEventId: event.id,
    });
    const item = projectPublicInformationDigest(published).items[0]!;
    expect(item.kind).toBe("civic-event");
    expect(item.people).toEqual([
      expect.objectContaining({
        kind: "person",
        personId: opened.playerPersonId,
      }),
    ]);
  });

  it("rejects future, private, nonexistent, and plumbing facts", () => {
    const opened = openWork("news-help2-negative-controls");
    const progressed = advance(opened, false);
    const publicAction = (progressed.history.legislativeActions ?? []).at(-1)!;
    expect(() =>
      publishPublicEvent(progressed, {
        stableKey: "civic-ledger:future",
        sourceEventId: publicAction.eventId,
        publishedAt: addDays(progressed.currentDate, 1),
      }),
    ).toThrow(/cannot exceed the current world date/u);

    const privateWorld = recordWorldEvent(progressed, {
      stableKey: "private:vote-intention",
      type: "politics.private-vote-intention",
      occurredAt: progressed.currentDate,
      recordedAt: progressed.currentDate,
      jurisdictionId: opened.jurisdictionId,
      involvedEntityIds: [opened.playerPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["private"],
      summary: "PRIVATE-VOTE-INTENTION",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(() =>
      publishPublicEvent(privateWorld, {
        stableKey: "civic-ledger:private",
        sourceEventId: privateWorld.history.events.at(-1)!.id,
      }),
    ).toThrow(/completed public civic event/u);
    expect(() =>
      publishPublicEvent(progressed, {
        stableKey: "civic-ledger:missing",
        sourceEventId: createStableId("event", "missing"),
      }),
    ).toThrow(/No such publication source event/u);

    const timeEvent = progressed.history.events.find((event) =>
      event.type.startsWith("simulation."),
    );
    if (timeEvent) {
      expect(() =>
        publishPublicEvent(progressed, {
          stableKey: "civic-ledger:plumbing",
          sourceEventId: timeEvent.id,
        }),
      ).toThrow(/completed public civic event/u);
    }
  });

  it("does not turn a vote commitment or future vote into a result", () => {
    const opened = openWork("news-help2-commitment-control");
    const progressed = advance(opened, false);
    const action = (progressed.history.legislativeActions ?? []).at(-1)!;
    const withCommitment = recordLegislativeCommitment(progressed, {
      stableKey: "commitment:not-a-vote",
      holderPersonId: opened.playerPersonId,
      subject: {
        question: {
          measureId: opened.measureId,
          purpose: "floor-stage",
          forumKey: null,
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "passage",
      },
      stance: "support",
      firmness: "explicit",
      audience: "private",
      eventId: action.eventId,
      heardByPersonIds: [opened.playerPersonId],
      statement: "I intend to support the measure when it reaches a vote.",
    });
    const published = publishPublicEvent(withCommitment, {
      stableKey: "civic-ledger:development-with-commitment",
      sourceEventId: action.eventId,
    });
    const digest = projectPublicInformationDigest(published);
    expect(digest.items[0]!.kind).toBe("legislative-development");
    expect(digest.items[0]!.body).not.toContain("Recorded vote:");
    expect(published.history.legislativeVotes ?? []).toHaveLength(0);
    const surfaces = projectDynamicSurfaces(published, {
      jurisdictionId: opened.jurisdictionId,
      measureId: opened.measureId,
    });
    expect(surfaces.facts.has("vote-tally")).toBe(false);
    expect(surfaces.empty.has("vote-tally")).toBe(true);
  });
});
