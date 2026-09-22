import {
  createScheduledActivity,
  performScheduledActivity,
  addSimulationMinutes,
} from "../simulation";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  serializeWorld,
  deserializeWorld,
  recordPersonDeath,
  recordWorldEvent,
  recordEventKnowledge,
} from "../simulation";
import { projectLivingSceneOpening } from "./living-scene-facts";
import {
  livingSceneCaption,
  LIVING_SCENE_FAMILIES,
  livingSceneStagePacket,
  genericTitleStage,
  genericTitleCaption,
  type LivingSceneFamily,
} from "./living-scene-prose";
import { projectLivingSceneSurface } from "./living-scene-surfaces";
import { correctPublication } from "../simulation/public-information";
import { lifePlaceByKey } from "../simulation/life-places";
import { openOrdinaryLifeRecords } from "../simulation/life-opportunities";

function life(placeKey: string, seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed,
      startKind: "custom",
      startAge: 34,
      household: "shares-a-home",
    }),
  ).game!;
}

describe("saved living-scene roles and content", () => {
  it.each(Object.keys(LIVING_SCENE_FAMILIES) as LivingSceneFamily[])(
    "keeps the generic %s caption independent of saved people",
    (family) => {
      const stage = genericTitleStage(family);
      const visible = {
        castKeys: ["cast-a", "cast-b"],
        action: stage.visibleAction,
        props: [...stage.props],
        contactsVerified: true,
        regionalContextCompatible: true,
      };
      expect(genericTitleCaption(family, visible)).not.toBe("");
      expect(
        genericTitleCaption(family, { ...visible, contactsVerified: false }),
      ).toBe("");
      expect(genericTitleCaption(family, { ...visible, castKeys: [] })).toBe(
        "",
      );
      expect(stage.records).toEqual([]);
    },
  );

  it.each(["2743000", "1150000"])(
    "binds actual roles and geographic alternatives in %s without navigation writes",
    (placeKey) => {
      const game = life(placeKey, `living-scenes:${placeKey}`);
      const saved = serializeWorld(game.world);
      const packet = projectLivingSceneOpening(game.world, game.playerPersonId);
      expect(packet.chapters.map((chapter) => chapter.key)).toEqual([
        "executive",
        "state",
        "congress",
        "locality",
        "your-life",
      ]);
      const executive = packet.chapters[0]!;
      expect(executive.actors.map((actor) => actor.role)).toEqual([
        "president",
        "vice-president",
      ]);
      expect(
        new Set(executive.actors.map((actor) => actor.person.personId)).size,
      ).toBe(2);
      expect(
        packet.chapters[1]!.actors.some((actor) => actor.role === "governor"),
      ).toBe(placeKey !== "1150000");
      if (placeKey === "1150000")
        expect(packet.chapters[1]!.publicFacts.join(" ")).toContain(
          "Mayor and Council",
        );
      for (const chapter of packet.chapters)
        for (const actor of chapter.actors) {
          expect(game.world.people[actor.person.personId]).toBeDefined();
          expect(actor.recordIds.length).toBeGreaterThan(0);
        }
      expect(
        packet.startingActors.every(
          (actor) => actor.person.personId !== game.playerPersonId,
        ),
      ).toBe(true);
      expect(
        projectLivingSceneOpening(deserializeWorld(saved), game.playerPersonId),
      ).toEqual(packet);
      expect(serializeWorld(game.world)).toBe(saved);
    },
  );
  it("follows a canonical successor and actual office absence without name patches", () => {
    const game = life("2309585", "living-scenes-successor");
    const original = projectLivingSceneOpening(game.world, game.playerPersonId);
    const former = original.chapters[0]!.actors.find(
      (actor) => actor.role === "president",
    )!;
    const dead = recordPersonDeath(game.world, {
      stableKey: "fixture:office-death",
      personId: former.person.personId,
      diedAt: game.world.currentDate,
      causeKey: "custom:fixture",
      sourceEntityIds: [former.person.personId],
      summary: "Fixture office vacancy.",
      provenance: {
        kind: "authored",
        note: "Office-binding regression fixture",
      },
    });
    expect(
      projectLivingSceneOpening(dead, game.playerPersonId).chapters[0]!
        .unavailableRoles,
    ).toContain("president");
    const successor = original.chapters[1]!.actors[0]!;
    const next = recordWorldEvent(dead, {
      stableKey: "fixture:successor-tenure",
      type: "world.office-tenure",
      occurredAt: dead.currentDate,
      recordedAt: dead.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [
        successor.person.personId,
        former.provenance.institutionId!,
      ],
      participants: [
        {
          personId: successor.person.personId,
          role: "focus:subject",
          detail: "President of the United States",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["office:us-president"],
      summary: "An authored successor term for the binding regression.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const actor = projectLivingSceneOpening(
      next,
      game.playerPersonId,
    ).chapters[0]!.actors.find((entry) => entry.role === "president")!;
    expect(actor.person.personId).toBe(successor.person.personId);
    expect(actor.person.title).toBe("President of the United States");
    expect(actor.recordIds).toContain(next.history.events.at(-1)!.id);
  });
  it("reads the old saved life without synthesizing officials or events", () => {
    const world = deserializeWorld(
      readFileSync(
        new URL(
          "./fixtures/playtest65-context-legacy-171bb.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    if (world.control.kind !== "person") throw Error("Expected fixture player");
    const before = serializeWorld(world);
    const projected = projectLivingSceneOpening(world, world.control.personId);
    expect(projected.chapters[0]!.actors).toEqual([]);
    expect(serializeWorld(world)).toBe(before);
  });
  it("names visible document review only when compatible actors and props are actually supplied", () => {
    const game = life("2743000", "living-scenes-caption");
    const stage = projectLivingSceneOpening(game.world, game.playerPersonId)
      .chapters[0]!.stage;
    const visible = {
      action: stage.visibleAction,
      personIds: stage.roles.map((role) => role.personId),
      props: ["papers"],
      contactsVerified: true,
      regionalContextCompatible: true,
    };
    expect(livingSceneCaption(stage, visible)).toBe(
      `${stage.roles[0]!.name} and ${stage.roles[1]!.name} review papers.`,
    );
    expect(livingSceneCaption(stage, { ...visible, props: [] })).toBe(
      stage.fallback,
    );
    expect(
      livingSceneCaption(stage, {
        ...visible,
        personIds: visible.personIds.slice(0, 1),
      }),
    ).toBe(stage.fallback);
    const duplicate = {
      ...stage,
      roles: [stage.roles[0]!, { ...stage.roles[0]!, slotKey: "duplicate" }],
    };
    expect(livingSceneCaption(duplicate, visible)).toBe(stage.fallback);
    const fishing = livingSceneStagePacket({
      ...stage,
      family: "regional-leisure",
    });
    expect(
      livingSceneCaption(fishing, {
        ...visible,
        action: "fish-at-water",
        props: ["fishing-rod"],
      }),
    ).toBe(fishing.fallback);
    const unrelated = {
      ...fishing,
      regionKey: "2743000",
      leisureContextRecordIds: [game.world.history.events[0]!.id],
    };
    expect(
      livingSceneCaption(
        unrelated,
        { ...visible, action: "fish-at-water", props: ["fishing-rod"] },
        { world: game.world, viewerPersonId: game.playerPersonId },
      ),
    ).toBe(fishing.fallback);
    expect(Object.keys(LIVING_SCENE_FAMILIES)).toHaveLength(8);
    expect(genericTitleStage("regional-leisure").identityBasis).toBe(
      "presentation-only",
    );
  });
  it("requires current, local, directly known leisure for the actual visible person", () => {
    const game = life("2743000", "living-scenes-known-leisure");
    const actor = projectLivingSceneOpening(game.world, game.playerPersonId)
      .chapters[0]!.stage.roles[0]!;
    const occurred = recordWorldEvent(game.world, {
      stableKey: "fixture:explicit-leisure",
      type: "life.regional-leisure",
      occurredAt: game.world.currentDate,
      recordedAt: game.world.currentDate,
      jurisdictionId: lifePlaceByKey("2743000")!.context.jurisdiction.id,
      involvedEntityIds: [actor.personId, game.playerPersonId],
      participants: [actor.personId, game.playerPersonId].map((personId) => ({
        personId,
        role: "presence:participant" as const,
        detail: "Fixture fishing scene",
      })),
      personFactConstraints: [],
      visibility: "private",
      tags: ["activity:fishing", "place:2743000"],
      summary: "An explicit fixture fishing scene.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = occurred.history.events.at(-1)!;
    const stage = livingSceneStagePacket({
      family: "regional-leisure",
      roles: [actor],
      publicFacts: [],
      asOf: occurred.currentDate,
      regionKey: "2743000",
      leisureContextRecordIds: [event.id],
    });
    const visible = {
      action: stage.visibleAction,
      personIds: [actor.personId],
      props: ["fishing-rod"],
      contactsVerified: true,
      regionalContextCompatible: true,
    };
    expect(
      livingSceneCaption(stage, visible, {
        world: occurred,
        viewerPersonId: game.playerPersonId,
      }),
    ).toBe(stage.fallback);
    const known = recordEventKnowledge(occurred, {
      stableKey: "fixture:known-leisure",
      personId: game.playerPersonId,
      eventId: event.id,
      learnedAt: occurred.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const saved = serializeWorld(known);
    const context = { world: known, viewerPersonId: game.playerPersonId };
    expect(livingSceneCaption(stage, visible, context)).toBe(
      `${actor.name} fishes by the water.`,
    );
    expect(
      livingSceneCaption({ ...stage, regionKey: "1150000" }, visible, context),
    ).toBe(stage.fallback);
    const stranger = known.personOrder.find(
      (id) => id !== actor.personId && id !== game.playerPersonId,
    )!;
    expect(
      livingSceneCaption(
        { ...stage, roles: [{ ...actor, personId: stranger }] },
        { ...visible, personIds: [stranger] },
        context,
      ),
    ).toBe(stage.fallback);
    expect(
      livingSceneCaption(
        { ...stage, asOf: "2000-01-01" as typeof stage.asOf },
        visible,
        context,
      ),
    ).toBe(stage.fallback);
    expect(serializeWorld(known)).toBe(saved);
  });
  it("updates real newspaper content only after a canonical publication correction", () => {
    const game = life("2309585", "living-scenes-news");
    const first = projectLivingSceneSurface(game.world, game.playerPersonId, {
      kind: "news",
    });
    expect(first.status).toBe("bound");
    if (first.detail?.kind !== "article")
      throw Error("Expected actual article");
    const old = first.detail.article;
    const corrected = correctPublication(game.world, {
      stableKey: "fixture:corrected-publication",
      correctsPublicationId: old.id,
      headline: "Corrected public record",
      body: old.body,
      correctionNote: "Fixture correction tests dynamic identity.",
    });
    const id = corrected.history.publications!.at(-1)!.id;
    const saved = serializeWorld(corrected);
    const shown = projectLivingSceneSurface(corrected, game.playerPersonId, {
      kind: "news",
      publicationId: id,
    });
    expect(shown.heading).toBe("Corrected public record");
    expect(shown.recordIds).toContain(id);
    expect(shown.revision).not.toBe(first.revision);
    expect(
      projectLivingSceneSurface(corrected, game.playerPersonId, {
        kind: "news",
        publicationId: null,
      }).status,
    ).toBe("empty");
    expect(serializeWorld(corrected)).toBe(saved);
  });
  it("reads the actual agenda but withholds private calendar content from another person", () => {
    const game = life("2309585", "living-scenes-agenda");
    const world = openOrdinaryLifeRecords(game.world, game.playerPersonId);
    const meeting = world.history.scheduledActivities.find(
      (entry) => entry.location.locationKey === "ordinary-life:meeting-room",
    )!;
    const saved = serializeWorld(world);
    const agenda = projectLivingSceneSurface(world, game.playerPersonId, {
      kind: "agenda",
      activityId: meeting.id,
    });
    expect(agenda.status).toBe("bound");
    expect(agenda.heading).toBe(meeting.title);
    const poster = projectLivingSceneSurface(world, game.playerPersonId, {
      kind: "community-poster",
      activityId: meeting.id,
    });
    const notice = world.history.events.find(
      (event) => event.id === poster.recordIds[0],
    )!;
    expect(notice.type).toBe("civic.meeting-notice");
    expect(notice.visibility).toBe("public");
    expect(poster.lines).toContain(notice.summary);
    expect(poster.projection.facts.get("agenda")?.channel).toBe(
      "public-record",
    );
    expect(agenda.detail).toEqual({
      kind: "entity",
      ref: { kind: "commitment", id: meeting.id },
    });
    const other = world.personOrder.find((id) => id !== game.playerPersonId)!;
    expect(
      projectLivingSceneSurface(world, other, {
        kind: "agenda",
        activityId: meeting.id,
      }).status,
    ).toBe("withheld");
    expect(serializeWorld(world)).toBe(saved);
  });
  it("withholds an old venue sign after further travel or a recorded return home", () => {
    const game = life("2743000", "living-scenes-venue");
    const arrival = (
      world: typeof game.world,
      label: string,
      setting: string,
    ) =>
      recordWorldEvent(world, {
        stableKey: `fixture:arrival:${setting}:${world.history.nextSequence}`,
        type: "life.scene.arrived",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: world.people[game.playerPersonId]!.homeJurisdictionId,
        involvedEntityIds: [game.playerPersonId],
        participants: [
          {
            personId: game.playerPersonId,
            role: "presence:participant",
            detail: label,
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [`place:${setting}`],
        summary: `Arrived at ${label}.`,
        context: {
          location: {
            jurisdictionId:
              world.people[game.playerPersonId]!.homeJurisdictionId,
            label,
            setting,
          },
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    const shop = arrival(game.world, "Local grocery store", "grocery");
    const id = shop.history.events.at(-1)!.id;
    const selection = { kind: "venue-sign" as const, arrivalEventId: id };
    expect(
      projectLivingSceneSurface(shop, game.playerPersonId, selection).heading,
    ).toBe("Local grocery store");
    const scheduled = createScheduledActivity(shop, {
      stableKey: "fixture:later-journey",
      title: "Walk away",
      summary: "An explicit fixture journey.",
      kind: "travel",
      start: shop.currentMoment,
      end: addSimulationMinutes(shop.currentMoment, 5),
      participantPersonIds: [game.playerPersonId],
      responsiblePersonId: game.playerPersonId,
      location: {
        locationKey: "fixture:journey",
        label: "On the way home",
        jurisdictionId: shop.people[game.playerPersonId]!.homeJurisdictionId,
      },
      sourceEntityIds: [id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [game.playerPersonId] },
    });
    const traveled = performScheduledActivity(
      scheduled,
      scheduled.history.scheduledActivities.at(-1)!.id,
    );
    expect(
      projectLivingSceneSurface(traveled, game.playerPersonId, selection)
        .status,
    ).toBe("withheld");
    const home = arrival(traveled, "Home", "home");
    expect(
      projectLivingSceneSurface(home, game.playerPersonId, selection).status,
    ).toBe("withheld");
  });
});
