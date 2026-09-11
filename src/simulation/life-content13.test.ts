import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  deserializeWorld,
  eligibleEpisodeBeats,
  episodeFacts,
  playEpisodeOption,
  serializeWorld,
} from "./index";
import { EPISODE_FAMILIES } from "./episode-bank";
import {
  lifeCircumstancesFor,
  refreshLifeCircumstances,
} from "./life-circumstances";
import {
  LIFE_CONTENT_62_KERNEL_KEYS,
  lifeContentKernelCounts,
  reconcileLifeContent62Kernels,
} from "./life-content-reconciliation";
import { createStableId } from "./ids";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";

function withColleagueOnly(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 24,
    seed,
    depth: "summarize-earlier-life",
  });
  const colleagueId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const jurisdictionId =
    game.world.people[game.playerPersonId]!.homeJurisdictionId;
  const provenance = {
    kind: "generated" as const,
    generatorKey: "test:life-content13",
  };
  const organizationId = createStableId(
    "organization",
    `${game.world.id}:test:employer`,
  );
  const world = applyCharacterHistoryPlan(game.world, {
    stableKey: "test:colleague-only",
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
            occupationClassification: "occupation:retail-assistant" as const,
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

function withWorkAndSchool(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 19,
    seed,
    depth: "summarize-earlier-life",
  });
  const colleagueId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const jurisdictionId =
    game.world.people[game.playerPersonId]!.homeJurisdictionId;
  const provenance = {
    kind: "generated" as const,
    generatorKey: "test:life-content13",
  };
  const organizationId = createStableId(
    "organization",
    `${game.world.id}:test:employer`,
  );
  const schoolId = createStableId(
    "organization",
    `${game.world.id}:test:school`,
  );
  const world = applyCharacterHistoryPlan(game.world, {
    stableKey: "test:life-content13:setup",
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
      {
        kind: "organization",
        input: {
          stableKey: "test:school",
          formedAt: game.world.currentDate,
          provenance,
          initialProfile: {
            name: "Test college",
            classification: "service:college",
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
      })),
      {
        kind: "education",
        input: {
          stableKey: "test:enrollment",
          personId: game.playerPersonId,
          organizationId: schoolId,
          startedAt: game.world.currentDate,
          programKind: "postsecondary:office-certificate",
          contextKind: "track:open-learning",
          provenance,
        },
      },
    ],
  }).world;
  return { ...game, world, colleagueId };
}

describe("LIFE-CONTENT13 exact-key reconciliation", () => {
  it("declares exactly 62 kernel keys", () => {
    expect(LIFE_CONTENT_62_KERNEL_KEYS).toHaveLength(62);
    expect(new Set(LIFE_CONTENT_62_KERNEL_KEYS).size).toBe(62);
  });

  it("maps more kernels than the first wave alone", () => {
    const counts = lifeContentKernelCounts();
    expect(counts["registered-existing-content"]).toBeGreaterThanOrEqual(19);
    expect(counts["opening-adaptation"]).toBeGreaterThanOrEqual(20);
    expect(
      counts["registered-existing-content"] +
        counts["opening-adaptation"] +
        counts["premise-blocked"] +
        counts["no-exact-mapping-verified"],
    ).toBe(62);
  });

  it("names every newly reachable priority kernel", () => {
    const rows = reconcileLifeContent62Kernels();
    const byKey = new Map(rows.map((row) => [row.key, row]));
    expect(byKey.get("early.community.curious-neighbor")?.status).toBe(
      "opening-adaptation",
    );
    expect(byKey.get("early.family.packing-boxes")?.status).toBe(
      "opening-adaptation",
    );
    expect(byKey.get("adult.trans.college-vs-work")?.status).toBe(
      "opening-adaptation",
    );
    expect(byKey.get("adult.trans.drop-class-keep-job")?.status).toBe(
      "opening-adaptation",
    );
    expect(byKey.get("rel.encounter.shift-breakroom")?.status).toBe(
      "registered-existing-content",
    );
    expect(byKey.get("rel.encounter.bus-stop-regular")?.status).toBe(
      "registered-existing-content",
    );
    expect(byKey.get("rel.encounter.campaign-canvass-partner")?.status).toBe(
      "registered-existing-content",
    );
  });
});

describe("LIFE-CONTENT13 circumstance-backed play", () => {
  it("writes supervisor and commute premises once, then survives reload", () => {
    const game = withWorkAndSchool("supervisor-commute");
    let refreshed = game.world;
    for (let day = 0; day < 14; day++) {
      refreshed = refreshLifeCircumstances(refreshed, game.playerPersonId);
      refreshed = advanceWorld(refreshed, 1);
    }
    const kinds = new Set(
      lifeCircumstancesFor(refreshed, game.playerPersonId).map(
        (entry) => entry.kind,
      ),
    );
    expect(
      kinds.has("supervisor-extra-shift") ||
        kinds.has("commute-schedule-conflict"),
    ).toBe(true);
    const facts = episodeFacts(refreshed, game.playerPersonId);
    expect(
      facts.get("work.supervisor-shift-requested")?.holds ||
        facts.get("school.commute-schedule-conflict")?.holds,
    ).toBe(true);
    const saved = serializeWorld(refreshed);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    assertWorldIntegrity(loaded);
  });

  it("reaches coworker follow-through after performed coverage and reload", () => {
    const game = withColleagueOnly("coverage-follow-through");
    let world = refreshLifeCircumstances(game.world, game.playerPersonId);
    const asked = eligibleEpisodeBeats({
      world,
      personId: game.playerPersonId,
      families: EPISODE_FAMILIES,
    }).beats.find(
      (beat) =>
        beat.episodeKey === "work.the-shift-you-were-asked-for" &&
        beat.stageKey === "asked-by-a-colleague",
    );
    expect(asked).toBeDefined();
    world = playEpisodeOption(world, {
      personId: game.playerPersonId,
      beat: asked!,
      optionKey: "cover-it",
      families: EPISODE_FAMILIES,
    }).world;
    for (let day = 0; day < 130; day++) {
      world = advanceWorld(world, 1);
      world = refreshLifeCircumstances(world, game.playerPersonId);
    }
    const followUp = eligibleEpisodeBeats({
      world,
      personId: game.playerPersonId,
      families: EPISODE_FAMILIES,
    }).beats.find(
      (beat) =>
        beat.episodeKey === "work.the-shift-you-were-asked-for" &&
        beat.stageKey === "it-came-back-round",
    );
    expect(followUp).toBeDefined();
    const before = serializeWorld(world);
    expect(serializeWorld(deserializeWorld(before))).toBe(before);
  });
});
