import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../simulation/demo";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../simulation/life";
import { recordWorldEvent } from "../simulation/world";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { electionClerksForPerson } from "./election-clerk";
import { bindElectionClerkConversation } from "./election-clerk-conversation";
import { projectPlayerConversation } from "./player-conversation";
import { proseDate } from "./prose-dates";
import { linePartsOf } from "./english-composition";
import { commitConversationTurn } from "./run-b-conversation";

function fixture() {
  let world = createDemoWorld("session13-clerk-presence");
  const player = world.personOrder[0]!;
  const clerk = world.personOrder[1]!;
  world = { ...world, control: { kind: "person", personId: player } };
  const jurisdictionId = world.people[player]!.homeJurisdictionId;
  world = createOrganization(world, {
    stableKey: "session13:clerk-office",
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "Clerk adapter fixture." },
    initialProfile: {
      name: "Recorded Clerk's Office",
      classification: "sector:local-government-office",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organization = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: "session13:clerk-job",
    personId: clerk,
    organizationId: organization.id,
    startedAt: world.currentDate,
    kind: "employment:public-service",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Recorded clerk job for adapter checks.",
    },
    initialRole: {
      title: "City clerk",
      occupationClassification: "profession:municipal-clerk",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  return { world, player, clerk, organization, jurisdictionId };
}

function encounter(f: ReturnType<typeof fixture>, atOffice: boolean) {
  return recordWorldEvent(f.world, {
    stableKey: `session13:clerk-encounter:${atOffice}`,
    type: "life.scene.opened",
    occurredAt: f.world.currentDate,
    recordedAt: f.world.currentDate,
    jurisdictionId: f.jurisdictionId,
    involvedEntityIds: [f.player, f.clerk, f.organization.id],
    participants: [f.player, f.clerk].map((personId) => ({
      personId,
      role: "presence:participant",
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [`moment:${JSON.stringify(f.world.currentMoment)}`],
    summary: "Recorded encounter for the clerk adapter fixture.",
    context: {
      location: {
        jurisdictionId: f.jurisdictionId,
        label: atOffice ? "Recorded Clerk's Office" : "Home",
        setting: atOffice ? "office" : "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("election clerk contextual adapter", () => {
  it("does not turn active employment or a shared home encounter into office presence", () => {
    const f = fixture();
    expect(
      electionClerksForPerson(f.world, f.player).find(
        (row) => row.personId === f.clerk,
      )?.presenceEventId,
    ).toBeNull();
    expect(() =>
      bindElectionClerkConversation(f.world, f.player, f.clerk),
    ).toThrow("not recorded here");
    const atHome = encounter(f, false);
    expect(() =>
      bindElectionClerkConversation(atHome, f.player, f.clerk),
    ).toThrow("not recorded here");
  });

  it("replays the recorded clerk through existing contextual dispatch and conversation commit", () => {
    const f = fixture();
    const present = encounter(f, true);
    const bound = bindElectionClerkConversation(present, f.player, f.clerk);
    expect(bindElectionClerkConversation(bound, f.player, f.clerk)).toBe(bound);
    for (const world of [bound, deserializeWorld(serializeWorld(bound))]) {
      const view = projectPlayerConversation(
        world,
        f.player,
        "scene-election-clerk",
      )!;
      expect(view).not.toBeNull();
      expect(view.room.physicallyPresentPersonIds).toContain(f.clerk);
      expect(view.openingLine).toBe("Which office are you interested in?");
      const committed = commitConversationTurn(world, {
        session: view.session,
        room: view.room,
        progress: view.progress,
        turnOrdinal: view.turnOrdinal,
        addressee: view.addressee,
        audibility: view.audibility,
        intent: "leave",
      }).world;
      expect(
        projectPlayerConversation(committed, f.player, "scene-election-clerk")!
          .settled,
      ).toBe(true);
    }
  });

  it("retains the composer parts of a requirements reply in the shared turn", () => {
    const f = fixture();
    const bound = bindElectionClerkConversation(
      encounter(f, true),
      f.player,
      f.clerk,
    );
    const view = projectPlayerConversation(
      bound,
      f.player,
      "scene-election-clerk",
    )!;
    const question = view.intents.find((intent) =>
      intent.key.startsWith("requirements:"),
    );
    expect(question).toBeDefined();
    const result = commitConversationTurn(bound, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: view.addressee,
      audibility: view.audibility,
      intent: question!.key,
    });
    const committed = result.world;

    const turn = committed.history.events.find((event) =>
      event.tags.includes(`conversation.intent.${question!.key}`),
    )!;
    if (process.env.OCD_CAPTURE_CLERK_PROSE === "1") {
      const binding = JSON.parse(
        bound.history.events
          .at(-1)!
          .tags.find((tag) => tag.startsWith("scene.binding.v1:"))!
          .slice("scene.binding.v1:".length),
      );
      const options = JSON.parse(binding.facts.offices);
      const selected = options.find(
        (office: { key: string }) =>
          `requirements:${office.key}` === question!.key,
      );
      writeFileSync(
        "/tmp/session13-clerk-grounding-packet.txt",
        [
          "SURFACE: dialogue and choices",
          "CHARACTER: The player is the controlled person in this authored unit fixture.",
          "RELATIONSHIPS: The other participant is the recorded active City clerk. No earlier conversation or personal familiarity is established.",
          "KNOWN WORLD FACTS: This is an authored adapter fixture, not real-game visual proof. Both people have a current recorded encounter at the clerk's actual recorded office.",
          `Office review snapshot: ${JSON.stringify(selected)}`,
          `Filing deadline: ${selected.filingDeadline ? proseDate(selected.filingDeadline) : "not established"}. Its basis is ${selected.filingBasis ?? "not established"}.`,
          "PLAYER KNOWLEDGE: The player chose to ask about this office. The opening asks which office interests them.",
          "CHARACTER KNOWLEDGE: The clerk's bound review reads the same current qualification and calendar readers as filing. Their saved role, status and encounter establish this review context.",
          "ESTABLISHED TRAITS: The actual fixture speaker traits feed the existing composer; no trait establishes a legal fact.",
          "EARLIER CHOICES: The player asked the selected requirements question.",
          "ALLOWED INTERPRETATION: Ordinary courteous question/answer phrasing only.",
          "UNKNOWN / DO NOT ASSUME: No paper, fee, phone call, arrival, weekday, motive, guarantee of winning, or successful filing is established.",
          "PURPOSE: Explain the selected office requirements without filing.",
          "OUTPUT REQUEST: Opening, selected question, and actual composed requirements reply only.",
        ].join("\n"),
      );
      writeFileSync(
        "/tmp/session13-clerk-grounding-output.txt",
        `result: SAFE_RENDER\nprose: ${view.openingLine}\n${question!.spokenWords}\n${result.presentation.beat!.dialogue}\n`,
      );
    }
    expect(linePartsOf(turn.tags)).toContain(
      "election-clerk:requirements:core:requirements-from-record",
    );
    expect(deserializeWorld(serializeWorld(committed)).history.events).toEqual(
      committed.history.events,
    );
  });

  it("removes the former clerk after their recorded employment ends", () => {
    const f = fixture();
    const office = electionClerksForPerson(f.world, f.player).find(
      (row) => row.personId === f.clerk,
    )!;
    const ended = recordWorkStatus(f.world, {
      stableKey: "session13:clerk-ended",
      workRelationshipId: office.workRelationshipId,
      effectiveAt: f.world.currentDate,
      status: "ended",
      reason: "Fixture employment ended.",
      provenance: { kind: "authored", note: "Ended clerk fixture." },
      supersedesStatusId: office.statusRecordId,
    });
    expect(
      electionClerksForPerson(ended, f.player).some(
        (row) => row.personId === f.clerk,
      ),
    ).toBe(false);
  });
});
