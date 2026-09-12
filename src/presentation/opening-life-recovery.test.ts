import {
  episodeCapabilities,
  episodeFacts,
  eligibleEpisodeBeats,
} from "../simulation/life-episodes";
import { OPENING_LIFE_FAMILIES } from "../simulation/opening-life-content";
import { addDays } from "../simulation/dates";
import { describe, expect, it } from "vitest";
import {
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  serializeWorld,
  deserializeWorld,
  createStableId,
  currentLifeCutoff,
} from "../simulation";
import {
  lifeCircumstancesFor,
  refreshLifeCircumstances,
} from "../simulation/life-circumstances";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";

function withColleague() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 24,
    seed: "recovered-request",
    depth: "summarize-earlier-life",
  });
  const colleagueId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const jurisdictionId =
    game.world.people[game.playerPersonId]!.homeJurisdictionId;
  const provenance = {
    kind: "generated" as const,
    generatorKey: "test:recovery",
  };
  const organizationId = createStableId(
    "organization",
    `${game.world.id}:test:employer`,
  );
  const world = applyCharacterHistoryPlan(game.world, {
    stableKey: "test:actual-colleague",
    mode: "quick-generated",
    personId: game.playerPersonId,
    transitions: [
      {
        kind: "organization",
        input: {
          stableKey: "test:employer",
          formedAt: game.world.currentDate,
          provenance,
          initialProfile: {
            name: "Test employer",
            classification: "enterprise:retail",
            locationJurisdictionId: jurisdictionId,
          },
        },
      },
      ...[game.playerPersonId, colleagueId].map((personId) => ({
        kind: "work" as const,
        input: {
          stableKey: `test:work:${personId}`,
          personId,
          organizationId,
          startedAt: game.world.currentDate,
          kind: "employment:part-time" as const,
          compensation: "paid" as const,
          authority: "directed" as const,
          dependency: "dependent" as const,
          economicRisk: "organization-borne" as const,
          provenance,
          initialRole: {
            title: "Store assistant",
            occupationClassification: "occupation:retail-assistant",
            locationJurisdictionId: jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 2, maximumHours: 8 },
              attention: "low" as const,
              concurrency: "mostly-concurrent" as const,
              scheduleRigidity: "flexible" as const,
              interruptibility: "interruptible" as const,
              locationJurisdictionId: jurisdictionId,
            },
          },
        },
      })),
    ],
  }).world;
  return { ...game, world, colleagueId };
}

describe("recovered circumstance boundaries", () => {
  it("writes a real request once, saves it, and grants no agreement or performed work", () => {
    const game = withColleague();
    const world = refreshLifeCircumstances(game.world, game.playerPersonId);
    const request = lifeCircumstancesFor(world, game.playerPersonId).find(
      (item) => item.kind === "colleague-coverage-request",
    );
    expect(request).toBeDefined();
    expect(request!.counterpartPersonId).toBe(game.colleagueId);
    expect(
      world.history.knowledge.some(
        (item) =>
          item.eventId === request!.eventId &&
          item.personId === game.playerPersonId,
      ),
    ).toBe(true);
    expect(world.history.lifeCommitments).toEqual(
      game.world.history.lifeCommitments,
    );
    expect(world.history.scheduledActivities).toEqual(
      game.world.history.scheduledActivities,
    );
    expect(refreshLifeCircumstances(world, game.playerPersonId)).toBe(world);
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(
      serializeWorld(refreshLifeCircumstances(loaded, game.playerPersonId)),
    ).toBe(saved);
    assertWorldIntegrity(world);
  });
  it("cannot expose a later request through an earlier historical cutoff", () => {
    const game = withColleague();
    const cutoff = currentLifeCutoff(game.world);
    const world = refreshLifeCircumstances(game.world, game.playerPersonId);
    const before = serializeWorld(world);
    expect(lifeCircumstancesFor(world, game.playerPersonId, cutoff)).toEqual(
      [],
    );
    expect(
      lifeCircumstancesFor(world, game.playerPersonId).length,
    ).toBeGreaterThan(0);
    expect(serializeWorld(world)).toBe(before);
  });
  it("does not invent employment or adult requests for a child", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 7,
      seed: "no-adult-request",
    });
    expect(refreshLifeCircumstances(game.world, game.playerPersonId)).toBe(
      game.world,
    );
  });
});

describe("historical episode eligibility recovery", () => {
  it("does not lend a later job to an earlier capability or fact read", () => {
    const game = withColleague();
    const earlier = addDays(game.world.currentDate, -1);
    const before = serializeWorld(game.world);
    expect(
      episodeCapabilities(game.world, game.playerPersonId).get("paid-work")
        ?.holds,
    ).toBe(true);
    expect(
      episodeCapabilities(game.world, game.playerPersonId, earlier).get(
        "paid-work",
      )?.holds,
    ).toBe(false);
    expect(
      episodeFacts(game.world, game.playerPersonId, earlier).get(
        "work.employed",
      )?.holds,
    ).toBe(false);
    expect(serializeWorld(game.world)).toBe(before);
  });
  it("reports the missing required person instead of silently losing the stage", () => {
    const game = withColleague();
    const authored = OPENING_LIFE_FAMILIES.find((family) =>
      family.roles.includes("guardian"),
    )!;
    expect(authored).toBeDefined();
    const result = eligibleEpisodeBeats({
      world: game.world,
      personId: game.playerPersonId,
      families: [
        {
          ...authored,
          key: "test:missing-person",
          roles: ["guardian"],
          exits: [],
          stages: [
            {
              ...authored.stages[0]!,
              key: "test:needs-guardian",
              requires: [],
              lines: ["{role:guardian} asks a question."],
              options: [],
            },
          ],
        },
      ],
    });
    expect(result.beats).toEqual([]);
    expect(result.exclusions).toContainEqual(
      expect.objectContaining({
        episodeKey: "test:missing-person",
        stageKey: "test:needs-guardian",
        requirement: { kind: "role", role: "guardian" },
      }),
    );
  });
});
