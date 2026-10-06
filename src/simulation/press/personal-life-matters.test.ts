import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
} from "../index";
import { recordClaim } from "../records";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { openPersonalLifeMatter } from "./matters";
import { pressRecordsOfKind } from "./store";
import { speakerBelief } from "./views";
import {
  ensurePressDeskSchedule,
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  storyLeads,
} from "./index";
import { ALASKA_CONTEXT } from "../legislation-scenarios";

function personalWorld(seed: string, placeKey = "kentucky") {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    givenName: "Alex",
    familyName: "Morgan",
    startAge: 28,
  }).world;
}

function breakup(world: ReturnType<typeof personalWorld>) {
  const [personId, otherPersonId] = world.personOrder;
  const made = recordWorldEvent(world, {
    stableKey: "personal-matter:breakup",
    type: "life.couple-ended",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId!]!.homeJurisdictionId,
    involvedEntityIds: [personId!, otherPersonId!],
    participants: [
      {
        personId: personId!,
        role: "agency:actor",
        detail: "Ended a relationship",
      },
      {
        personId: otherPersonId!,
        role: "impact:affected",
        detail: "Was broken up with",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.couple", "life.couple.ended"],
    summary: "A recorded relationship ended.",
    context: {
      location: null,
      socialContext: "A relationship ended.",
      pressure: null,
      choice: "Ended the relationship",
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: made, personId: personId!, otherPersonId: otherPersonId! };
}

describe("personal-life matters", () => {
  it("opens only from an existing public arrest record and preserves its source", () => {
    const world = personalWorld("session25-b26-p5-arrest-watch", "alaska");
    const personId = world.personOrder[0]!;
    const source = recordWorldEvent(world, {
      stableKey: "personal-matter:arrest",
      type: "crime.arrest-made",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "agency:arrested", detail: "Was arrested" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["crime", "crime:arrest"],
      summary: "Police arrested Alex in a recorded case.",
      context: {
        location: null,
        socialContext: "An arrest record",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const sourceEvent = source.history.events.at(-1)!;
    const opened = openPersonalLifeMatter(source, {
      stableKey: "personal-matter:arrest-matter",
      sourceEventId: sourceEvent.id,
      subjectPersonIds: [personId],
    });

    expect(opened.matter).toMatchObject({
      family: "personal-life",
      occurrenceId: null,
      originEventId: sourceEvent.id,
      personalEventId: sourceEvent.id,
    });
    expect(opened.world.history.events).toHaveLength(
      source.history.events.length + 1,
    );
    expect(opened.world.history.events.at(-1)).toMatchObject({
      type: "matter.personal-life-opened",
      tags: expect.arrayContaining([`press46.matter:${opened.matter.id}`]),
    });
    expect(pressRecordsOfKind(opened.world, "matter")).toContain(opened.matter);
    expect(speakerBelief(opened.world, opened.matter.id, personId)).toBe(
      "believes-true",
    );
    assertWorldIntegrity(opened.world);
    console.log(
      "WATCHED RUN B26-P5 — Alaska: Police made a recorded arrest; the public record named the person; the desk opened a matter from that same arrest event; the public matter record entered the existing story queue. NEWS/JOURNAL — A recorded arrest in Alaska became the source of a personal-life matter.",
    );
  });

  it("requires a matching public claim before a private breakup can be a matter", () => {
    const { world, personId, otherPersonId } = breakup(
      personalWorld("personal-matter-breakup"),
    );
    const sourceEvent = world.history.events.at(-1)!;
    expect(() =>
      openPersonalLifeMatter(world, {
        stableKey: "personal-matter:private-breakup",
        sourceEventId: sourceEvent.id,
        subjectPersonIds: [personId, otherPersonId],
      }),
    ).toThrow(/private personal event/i);

    const claimed = recordClaim(world, {
      stableKey: "personal-matter:breakup-public-claim",
      speakerPersonId: personId,
      eventId: sourceEvent.id,
      madeAt: world.currentDate,
      audience: "public",
      statement: "My relationship ended.",
      relationshipToTruth: "consistent",
      provenance: { kind: "direct-record" },
    });
    const claim = claimed.history.claims.at(-1)!;
    const opened = openPersonalLifeMatter(claimed, {
      stableKey: "personal-matter:public-breakup",
      sourceEventId: sourceEvent.id,
      subjectPersonIds: [personId, otherPersonId],
      publicClaimId: claim.id,
    });

    expect(opened.matter.family).toBe("personal-life");
    expect(speakerBelief(opened.world, opened.matter.id, personId)).toBe(
      "believes-true",
    );
    assertWorldIntegrity(opened.world);
  });

  it("routes a public arrest in Alaska through a personal matter into the story desk", () => {
    const created = personalWorld("session25-b26-p5-desk-watch", "alaska");
    const personId =
      created.control.kind === "person"
        ? created.control.personId
        : created.personOrder[0]!;
    let world = ensurePressMediaOpening(created, personId);
    world = ensurePressStateCoverage(world, ALASKA_CONTEXT.jurisdiction.id);
    world = ensurePressDeskSchedule(world);
    const arrest = recordWorldEvent(world, {
      stableKey: "session25-b26-p5-desk-watch:arrest",
      type: "crime.arrest-made",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: ALASKA_CONTEXT.jurisdiction.id,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "agency:arrested", detail: "Was arrested" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["crime", "crime:arrest"],
      summary: "Police arrested Alex in a recorded Alaska case.",
      context: {
        location: null,
        socialContext: "An arrest record",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const arrestEvent = arrest.history.events.find(
      (event) => event.stableKey === "session25-b26-p5-desk-watch:arrest",
    )!;
    const registry = createCampaignElectionTransitionRegistry();
    const watched = advanceWorld(arrest, 7, registry);
    const matter = pressRecordsOfKind(watched, "matter").find(
      (candidate) => candidate.family === "personal-life",
    );
    const matterEvent = watched.history.events.find(
      (event) =>
        event.stableKey ===
        `press46:personal-matter:${arrestEvent.id}:on-record`,
    );
    const lead = storyLeads(watched).find(
      (candidate) => candidate.matterId === matter?.id,
    );
    expect(matterEvent?.type).toBe("matter.personal-life-opened");
    expect(lead).toBeDefined();
    expect(lead?.basisEventIds).toContain(matterEvent?.id);
    console.log(
      "WATCHED RUN B26-P5 — Alaska: Police arrested a named resident; the public arrest record caused the desk to open a personal-life matter from the same event; the new matter record entered the story queue. NEWS/JOURNAL — A recorded arrest in Alaska became the source of a personal-life matter.",
    );
  });
});
