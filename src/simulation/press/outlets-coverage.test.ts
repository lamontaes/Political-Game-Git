import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createOrganization, createWorkRelationship } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import type { World } from "../types";
import {
  newsworthiness,
  outletCovers,
  storyLeads,
  ensurePressDeskSchedule,
} from "./desk";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { ensurePressHomeCoverage, mediaOutlets } from "./outlets";
import { advanceWorld, recordWorldEvent } from "../world";

/**
 * Who gets a newsroom. Every town a player lives in has local journalism, a
 * state's politics has a newsroom before the player holds office there, and
 * Puerto Rico's press is its own.
 */

function opening(placeKey: string, seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey,
    }),
  ).game!;
}

describe("press coverage", () => {
  it("covers San Juan with its own local and commonwealth press, with no city government on record", () => {
    const game = opening("7276770", "press-coverage-san-juan");
    const home = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    const outlets = mediaOutlets(game.world);
    const local = outlets.filter((outlet) => outlet.scope === "local");
    const state = outlets.filter((outlet) => outlet.scope === "state");

    expect(local.map((outlet) => outlet.primaryJurisdictionIds)).toEqual([
      [home],
    ]);
    expect(local[0]!.name).toMatch(/de San Juan$/);
    expect(state.map((outlet) => outlet.primaryJurisdictionIds)).toEqual([
      [stateJurisdictionForKey("US-PR")!.id],
    ]);
    expect(state[0]!.name).not.toMatch(/Statehouse|Capitol Dispatch/);
  });

  it("gives an ordinary Columbus resident a state newsroom before any office", () => {
    const game = opening("3918000", "press-coverage-columbus");
    const state = mediaOutlets(game.world).filter(
      (outlet) => outlet.scope === "state",
    );
    expect(state).toHaveLength(1);
    expect(
      game.world.jurisdictions[state[0]!.primaryJurisdictionIds[0]!]!.name,
    ).toBe("Ohio");
  });

  it("covers a state the player later takes a legislative job in", () => {
    const game = opening("3918000", "press-coverage-later-entry");
    const kentucky = stateJurisdictionForKey("US-KY")!;
    let world: World = ensureStateJurisdictionForKey(game.world, "US-KY");
    world = createOrganization(world, {
      stableKey: "press-coverage:ky-house",
      formedAt: world.currentDate,
      detailLevel: "detailed",
      provenance: { kind: "authored", note: "Press coverage test." },
      initialProfile: {
        name: "Kentucky House of Representatives",
        classification: "sector:government",
        locationJurisdictionId: kentucky.id,
      },
    });
    const organization = world.history.organizations.at(-1)!;
    world = createWorkRelationship(world, {
      stableKey: "press-coverage:ky-house:seat",
      personId: game.playerPersonId,
      organizationId: organization.id,
      startedAt: world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "shared",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Press coverage test." },
      initialRole: {
        title: "State representative",
        occupationClassification: "service:elected-legislator",
        locationJurisdictionId: kentucky.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 45 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: kentucky.id,
        },
      },
    });
    const before = mediaOutlets(world).filter((o) => o.scope === "state");
    expect(before.flatMap((o) => o.primaryJurisdictionIds)).not.toContain(
      kentucky.id,
    );

    const after = ensurePressHomeCoverage(world);
    const covered = mediaOutlets(after)
      .filter((outlet) => outlet.scope === "state")
      .flatMap((outlet) => outlet.primaryJurisdictionIds);
    expect(covered).toContain(kentucky.id);
    expect(ensurePressHomeCoverage(after)).toBe(after);
  });

  // Four real openings: each builds a whole life, so this one runs long.
  it("gives towns different kinds of newsroom, stable for a save", () => {
    const local = (place: string) =>
      mediaOutlets(opening(place, "press-coverage-variety").world).find(
        (outlet) => outlet.scope === "local",
      )!;
    const kinds = new Set(
      ["3918000", "3260600", "1304000"].map((place) => {
        const outlet = local(place);
        return `${outlet.product}/${outlet.resourceTier}/${outlet.cadence}`;
      }),
    );
    expect(kinds.size).toBeGreaterThan(1);
    expect(local("4865384").name).toBe(local("4865384").name);
  }, 120_000);

  it("Nome's paper covers its own resident even when the record is the state's", () => {
    const game = opening("0254920", "press-coverage-nome");
    const world = game.world;
    const person = world.people[game.playerPersonId]!;
    const local = mediaOutlets(world).find(
      (outlet) =>
        outlet.scope === "local" &&
        outlet.primaryJurisdictionIds.includes(person.homeJurisdictionId),
    )!;
    const alaska = stateJurisdictionForKey("US-AK")!.id;
    const decided = (key: string, named: boolean) =>
      recordWorldEvent(world, {
        stableKey: `press-coverage-nome:${key}`,
        type: "governing.matter-decided",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: alaska,
        involvedEntityIds: named ? [person.id] : [alaska],
        participants: named
          ? [{ personId: person.id, role: "focus:subject", detail: null }]
          : [],
        personFactConstraints: [],
        visibility: "public",
        tags: ["office:us-ak-governor"],
        summary: "The governor decided a matter.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    const plain = decided("plain", false);
    const named = decided("named", true);
    expect(local).toBeDefined();
    expect(outletCovers(plain, local, plain.history.events.at(-1)!)).toBe(
      false,
    );
    const event = named.history.events.at(-1)!;
    expect(outletCovers(named, local, event)).toBe(true);
    expect(
      newsworthiness(named, local, event).reasons.map((reason) => reason.key),
    ).toContain("resident");
  }, 120_000);
});

describe("a paper does not reprint the same story", () => {
  it("covers a development once, not every time the same words recur", () => {
    const game = opening("0254920", "press-no-reprint");
    const person = game.world.people[game.playerPersonId]!;
    const home = person.homeJurisdictionId;
    const record = (world: World, key: string, summary: string) =>
      recordWorldEvent(world, {
        stableKey: `press-no-reprint:${key}`,
        type: "governing.matter-decided",
        occurredAt: world.currentDate,
        recordedAt: world.currentDate,
        jurisdictionId: home,
        involvedEntityIds: [person.id],
        participants: [
          { personId: person.id, role: "focus:subject", detail: null },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["importance:major"],
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
    const handlers = createCampaignElectionTransitionRegistry();
    let world = ensurePressDeskSchedule(game.world);
    world = record(world, "first", "The town adopted the road repair plan.");
    const first = world.history.events.at(-1)!.id;
    world = advanceWorld(world, 8, handlers);
    world = record(world, "again", "The town adopted the road repair plan.");
    const again = world.history.events.at(-1)!.id;
    world = record(world, "new", "The town adopted the park shelter rules.");
    const fresh = world.history.events.at(-1)!.id;
    world = advanceWorld(world, 8, handlers);
    const bases = new Set(
      storyLeads(world).flatMap((lead) => lead.basisEventIds),
    );
    expect(bases.has(first)).toBe(true);
    expect(bases.has(again)).toBe(false);
    expect(bases.has(fresh)).toBe(true);
  }, 600_000);
});
