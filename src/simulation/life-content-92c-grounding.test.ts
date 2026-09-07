import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { EPISODE_FAMILIES } from "./episode-bank";
import { addDays, dateAtAge, simulationMomentOnLocalDate } from "./dates";
import { createStableId } from "./ids";
import { createStartingPerson } from "./people";
import { createWorld, recordWorldEvent } from "./world";
import { createDemoWorld } from "./demo";
import {
  createIncidentDefinition,
  createIncidentCatalog,
} from "./incident-catalog";
import { createExactQuantity } from "./quantity";
import {
  evaluateIncident,
  occurIncident,
  activeIncidentsAt,
} from "./incidents";
import { recordLifeCommitment } from "./life";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  eligibleEpisodeBeats,
  episodeInstanceKey,
  episodeRoleBindings,
  playEpisodeOption,
  type EpisodeFamily,
} from "./life-episodes";
import { lifeContent92cStages } from "./life-content-92c";
import type { EntityId, World } from "./types";

function fixture(age = 7) {
  return createNewGameWorld({
    placeKey: "kentucky",
    startAge: age,
    startKind: "custom",
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "c119b-grounding",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  });
}

// Explicit synthetic people and encounters, only in tests. No production
// initializer is changed to make any scene eligible.
function familiar(world: World, personId: EntityId, age: number, key: string) {
  const template = createStartingPerson({
    worldId: world.id,
    worldSeed: key,
    currentDate: world.currentDate,
    homeJurisdictionId: world.people[personId]!.homeJurisdictionId,
    age,
    givenName: key,
    familyName: "Fixture",
  });
  const generationKey = `fixture:c119b:${key}`;
  const id = createStableId("person", `${world.id}:${generationKey}`);
  const person = {
    ...template,
    id,
    generationKey,
    establishedFacts: template.establishedFacts.map((fact) => ({
      ...fact,
      id: createStableId("fact", `${id}:${fact.stableKey}`),
    })),
  };
  world = {
    ...world,
    personOrder: [...world.personOrder, person.id],
    people: { ...world.people, [person.id]: person },
  };
  world = recordWorldEvent(world, {
    stableKey: `fixture:encounter:${key}`,
    type: "life.encounter",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, person.id],
    participants: [personId, person.id].map((id) => ({
      personId: id,
      role: "presence:participant",
      detail: "Fixture encounter",
    })),
    personFactConstraints: [],
    visibility: "limited",
    tags: ["thread.companionship"],
    summary: "The two met.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world, personId: person.id };
}

function beats(world: World, personId: EntityId, families = EPISODE_FAMILIES) {
  return eligibleEpisodeBeats({ world, personId, families }).beats;
}
function atAge(world: World, personId: EntityId, age: number): World {
  const date = dateAtAge(world.people[personId]!.birthDate, age);
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
  };
}

const withheld = [
  "called-in",
  "asked-by-a-colleague",
  "it-came-back-round",
  "pooled-tips",
  "what-you-said-stuck",
  "the-commute",
  "carrying-the-group",
  "the-family-shop",
  "the-third-weekend",
  "sandbag-line",
];

describe("C119B missing circumstances fail closed", () => {
  it.each(withheld)(
    "withholds %s even with every old eligibility gate satisfied",
    (key) => {
      const created = fixture(20);
      const entry = lifeContent92cStages().find(
        ({ stage }) => stage.key === key,
      )!;
      const family = EPISODE_FAMILIES.find(
        (candidate) => candidate.key === entry.episodeKey,
      )!;
      // Isolate the newly required circumstance from every old gate: no age,
      // job, kinship, incident, earlier yes, or elapsed time can bypass it.
      const isolated: EpisodeFamily = {
        ...family,
        exits: [],
        stages: [
          {
            ...entry.stage,
            requires: entry.stage.requires.filter((r) => r.kind === "withheld"),
          },
        ],
      };
      const result = eligibleEpisodeBeats({
        world: created.world,
        personId: created.playerPersonId,
        families: [isolated],
      });
      expect(result.beats).toEqual([]);
      expect(result.exclusions[0]?.requirement.kind).toBe("withheld");
      expect(result.exclusions[0]?.detail).toMatch(/Missing/);
    },
  );

  it.each(["incident:economic-slowdown", "incident:flood"] as const)(
    "a real remote %s cannot unlock a local sandbag scene",
    (incidentKind) => {
      const template = createDemoWorld("c119b-remote-incident");
      const home = template.jurisdictions[template.jurisdictionOrder[0]!]!;
      const remote = {
        ...home,
        id: createStableId("jurisdiction", "fixture:remote"),
        name: "Remote fixture",
        provenance: {
          ...home.provenance,
          jurisdiction: createStableId("jurisdiction", "fixture:remote"),
        },
      };
      const definition = createIncidentDefinition({
        stableKey: "incident.c119b-remote",
        label: "Remote fixture incident",
        description: "Explicit adversarial incident fixture.",
        incidentKind,
        occurrenceMode: "probabilistic",
        baseLikelihood: createExactQuantity(1, 1, "rate:share"),
        prerequisites: [],
        blockers: [],
        likelihoodModifiers: [],
        tags: ["incident.fixture"],
      });
      let world = createWorld({
        seed: template.seed,
        currentDate: template.currentDate,
        jurisdictions: [home, remote],
        people: template.personOrder.map((id) => template.people[id]!),
        incidentCatalog: createIncidentCatalog({ definitions: [definition] }),
      });
      const evaluation = evaluateIncident(world, {
        definitionId: definition.id,
        evaluationKey: "fixture:remote",
        scope: { jurisdictionId: remote.id, segmentKey: null },
        evaluatedAt: world.currentDate,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        exposure: createExactQuantity(1, 1, "rate:share"),
        vulnerability: createExactQuantity(1, 1, "rate:share"),
        resilience: createExactQuantity(0, 1, "rate:share"),
        consequences: [],
      });
      world = occurIncident(world, {
        stableKey: "fixture:remote-incident",
        evaluation,
        summary: "A remote incident occurred.",
        visibility: "public",
      });
      expect(
        activeIncidentsAt(world, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        }).length,
      ).toBe(1);
      const before = serializeWorld(world);
      expect(
        beats(world, world.personOrder[0]!).some(
          (b) => b.stageKey === "sandbag-line",
        ),
      ).toBe(false);
      expect(serializeWorld(world)).toBe(before);
    },
  );

  it("rejects a stale previously offered adult scene after grounding is withdrawn", () => {
    const { world, playerPersonId } = fixture(20);
    const entry = lifeContent92cStages().find(
      ({ stage }) => stage.key === "called-in",
    )!;
    const family = EPISODE_FAMILIES.find((f) => f.key === entry.episodeKey)!;
    const oldFamily = {
      ...family,
      exits: [],
      stages: [{ ...entry.stage, requires: [] }],
    };
    const oldBeat = beats(world, playerPersonId, [oldFamily])[0]!;
    expect(oldBeat).toBeDefined();
    const before = JSON.stringify(world);
    expect(() =>
      playEpisodeOption(world, {
        personId: playerPersonId,
        beat: oldBeat,
        optionKey: "take-the-shift",
        families: EPISODE_FAMILIES,
      }),
    ).toThrow();
    expect(JSON.stringify(world)).toBe(before);
  });

  it("family work cannot continue from an earlier yes and an active, ended or removed commitment alone", () => {
    const created = fixture(20);
    const family = EPISODE_FAMILIES.find(
      (f) => f.key === "kin.the-work-that-is-not-paid",
    )!;
    const roles = episodeRoleBindings(created.world, created.playerPersonId);
    const relative = roles.find((r) => r.role === "relative")!;
    expect(relative).toBeDefined();
    let world = recordWorldEvent(created.world, {
      stableKey: "fixture:old-family-yes",
      type: "life.episode.kin",
      occurredAt: created.world.currentDate,
      recordedAt: created.world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [created.playerPersonId, relative.personId],
      participants: [
        {
          personId: created.playerPersonId,
          role: "agency:actor",
          detail: "Earlier yes",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        `episode:${family.key}`,
        "episode-stage:the-family-shop",
        `episode-instance:${episodeInstanceKey(family.key, roles, family.roles)}`,
        "choice.say-yes",
      ],
      summary: "You agreed to work unpaid weekends.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const start = world.currentDate;
    world = recordLifeCommitment(world, {
      stableKey: "fixture:family-weekends",
      personId: created.playerPersonId,
      startsAt: start,
      endsAt: null,
      kind: "personal:family-labour",
      label: "Weekends at the family business",
      timeDemand: {
        expectedWeekly: { minimumHours: 8, maximumHours: 16 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
      provenance: {
        kind: "authored",
        note: "C119B adversarial fixture, no performance evidence",
      },
    });
    for (const days of [60, 120, 730]) {
      const date = addDays(start, days);
      const later = {
        ...world,
        currentDate: date,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
      };
      for (const candidate of [
        later,
        {
          ...later,
          history: {
            ...later.history,
            lifeCommitments: later.history.lifeCommitments.map((c) => ({
              ...c,
              endsAt: addDays(start, 30),
            })),
          },
        },
        { ...later, history: { ...later.history, lifeCommitments: [] } },
      ]) {
        expect(
          beats(candidate, created.playerPersonId).some(
            (b) => b.stageKey === "the-third-weekend",
          ),
        ).toBe(false);
      }
    }
  });
});

describe("C119B childhood cast and current scene history", () => {
  it("never casts an adult familiar as a seven-year-old's pact peer", () => {
    const created = fixture();
    const adult = familiar(created.world, created.playerPersonId, 35, "Adult");
    expect(
      episodeRoleBindings(adult.world, created.playerPersonId).some(
        (r) => r.role === "familiar" && r.personId === adult.personId,
      ),
    ).toBe(true);
    expect(
      beats(adult.world, created.playerPersonId).some(
        (b) => b.stageKey === "best-friend-pact",
      ),
    ).toBe(false);
  });

  it("binds a real child despite an adult familiar, then preserves that exact ID and event through the callback", () => {
    const created = fixture();
    const adult = familiar(created.world, created.playerPersonId, 35, "Adult");
    const peer = familiar(adult.world, created.playerPersonId, 7, "Peer");
    const pact = beats(peer.world, created.playerPersonId).find(
      (b) => b.stageKey === "best-friend-pact",
    )!;
    expect(pact?.bindings[0]?.personId).toBe(peer.personId);
    expect(pact.instanceKey).toContain(`familiar=${peer.personId}`);
    const played = playEpisodeOption(peer.world, {
      personId: created.playerPersonId,
      beat: pact,
      optionKey: "say-yes",
      families: EPISODE_FAMILIES,
    }).world;
    const event = played.history.events.find((e) =>
      e.tags.includes("episode-stage:best-friend-pact"),
    )!;
    expect(event.context?.pressure).toBe(pact.prose);
    const later = atAge(played, created.playerPersonId, 18);
    const callback = beats(later, created.playerPersonId).find(
      (b) => b.stageKey === "across-the-checkout",
    )!;
    expect(callback?.bindings[0]?.personId).toBe(peer.personId);
    expect(callback.instanceKey).toBe(pact.instanceKey);
    expect(callback.prose).not.toContain("as kids");
    expect(
      callback.causalInputs
        .flatMap((c) => c.satisfiedBy)
        .some((a) => a.recordId === event.id),
    ).toBe(true);
    expect(
      beats(
        atAge(peer.world, created.playerPersonId, 18),
        created.playerPersonId,
      ).some((b) => b.stageKey === "across-the-checkout"),
    ).toBe(false);
    const withoutPeer = {
      ...later,
      people: Object.fromEntries(
        Object.entries(later.people).filter(([id]) => id !== peer.personId),
      ),
    };
    expect(
      beats(withoutPeer, created.playerPersonId).some(
        (b) => b.stageKey === "across-the-checkout",
      ),
    ).toBe(false);
    const restored = deserializeWorld(serializeWorld(played));
    expect(
      restored.history.events.find((e) => e.id === event.id)?.context?.pressure,
    ).toBe(pact.prose);
  });

  it("records immediate childhood circumstances in the same event as the chosen action", () => {
    const created = fixture(5);
    const beat = beats(created.world, created.playerPersonId).find(
      (b) => b.stageKey === "cubby-space",
    )!;
    const before = JSON.stringify(created.world);
    const result = playEpisodeOption(created.world, {
      personId: created.playerPersonId,
      beat,
      optionKey: "leave-it",
      families: EPISODE_FAMILIES,
    }).world;
    expect(JSON.stringify(created.world)).toBe(before);
    const event = result.history.events.find((e) =>
      e.tags.includes("episode-stage:cubby-space"),
    )!;
    expect(event.context?.pressure).toBe(beat.prose);
    expect(event.summary).toBe("You left the coat where it was.");
    expect(result.history.educationEnrollments).toEqual(
      created.world.history.educationEnrollments,
    );
    expect(result.history.workRelationships).toEqual(
      created.world.history.workRelationships,
    );
  });
});
