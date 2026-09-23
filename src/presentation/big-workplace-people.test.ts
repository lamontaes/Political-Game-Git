import { describe, expect, it } from "vitest";

import {
  lifePlaceSearch,
  organizationProfileAt,
  stateCandidacyPack,
} from "../simulation";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { recordRelationshipInteraction } from "../simulation/records";
import type { EntityId, World } from "../simulation/types";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  EVERYBODY_KNOWS_EVERYBODY_LIMIT,
  projectPeopleDirectory,
} from "./people-directory";
import {
  layoutRelationshipWeb,
  projectRelationshipWeb,
  type RelationshipWeb,
} from "./relationship-web";

/**
 * Taking a seat in a chamber of two hundred made every member somebody the
 * player knew on the first day: "Work 181", and a web of overlapping faces
 * nobody could read (Texas House playtest, 2026-09-23). A big workplace is
 * people to meet; a small one is still people you know.
 */
function openLife(seed: string) {
  const found = lifePlaceSearch("Valentine", 20).find(
    (place) => place.displayName === "Valentine, Nebraska",
  )!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: found.key,
      startAge: 40,
      seed,
    }),
  ).game!;
}

function seat(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  stableKey: string,
): World {
  return createWorkRelationship(world, {
    stableKey,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:big-workplace-test",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: "Big workplace fixture." },
    initialRole: {
      title: "Member",
      occupationClassification: null,
      locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
    },
  });
}

/** The player takes a seat in the chamber the opening already filled. */
function inTheChamber(seed: string) {
  const game = openLife(seed);
  const personId = game.playerPersonId;
  const usps = homeStateUsps(game.world, personId)!;
  const members = stateLegislators(
    game.world,
    stateCandidacyPack(`US-${usps}`)!.packId,
  );
  const bodyId = game.world.history.workRelationships.find(
    (work) => work.personId === members[0]!.personId,
  )!.organizationId!;
  const world = seat(game.world, personId, bodyId, `${seed}:seat`);
  const bodyName = organizationProfileAt(world, bodyId)!.name;
  return {
    world,
    personId,
    bodyName,
    others: members.map((member) => member.personId),
  };
}

describe("a big workplace is people to meet, not people you know", () => {
  it("keeps colleagues you have not met out of the count and the web", () => {
    const { world, personId, bodyName, others } = inTheChamber("big-workplace");
    expect(others.length).toBeGreaterThan(EVERYBODY_KNOWS_EVERYBODY_LIMIT);
    const directory = projectPeopleDirectory(world, personId);
    const known = new Set(directory.people.map((row) => row.personId));
    for (const id of others) expect(known.has(id)).toBe(false);
    expect(directory.counts.work).toBe(0);
    expect(directory.notYetMet.map((row) => row.personId).sort()).toEqual(
      [...others].sort(),
    );
    expect(directory.notYetMet[0]!.context).toBe(bodyName);
    const web = projectRelationshipWeb(world, personId);
    for (const id of others) {
      expect(web.nodes.some((node) => node.personId === id)).toBe(false);
    }

    // Once there is something between you, they are somebody you know.
    const met = others[0]!;
    const after = recordRelationshipInteraction(world, {
      stableKey: "big-workplace:met",
      personIds: [personId, met].sort() as unknown as readonly [
        EntityId,
        EntityId,
      ],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "contact:kept-in-touch",
      change: "maintained",
      significance: "minor",
      summary: "They talked after the session.",
      tags: [],
    });
    const later = projectPeopleDirectory(after, personId);
    expect(later.counts.work).toBe(1);
    expect(later.people.find((row) => row.personId === met)?.context).toBe(
      bodyName,
    );
    expect(later.notYetMet.some((row) => row.personId === met)).toBe(false);
  }, 120_000);

  it("still knows everybody in a small workplace", () => {
    const opened = inTheChamber("small-workplace");
    let world = createOrganization(opened.world, {
      stableKey: "small-workplace:employer",
      formedAt: opened.world.currentDate,
      provenance: { kind: "authored", note: "Small workplace fixture." },
      initialProfile: {
        name: "Sandhills Feed and Seed",
        classification: "sector:private",
        locationJurisdictionId: null,
      },
    });
    const shop = world.history.organizations.at(-1)!.id;
    const personId = opened.personId;
    const others = opened.others.slice(0, 4);
    for (const id of [personId, ...others]) {
      world = seat(world, id, shop, `small-workplace:${id}`);
    }
    const directory = projectPeopleDirectory(world, personId);
    expect(directory.counts.work).toBe(4);
    // Still in the chamber too: those four are known from the shop, and the
    // rest of the chamber is still somebody to meet.
    for (const id of others) {
      expect(directory.notYetMet.some((row) => row.personId === id)).toBe(
        false,
      );
    }
    expect(directory.notYetMet.length).toBe(opened.others.length - 4);
    for (const id of others) {
      expect(directory.people.some((row) => row.personId === id)).toBe(true);
    }
  }, 120_000);
});

describe("the web at the size of a chamber", () => {
  function starOf(count: number): RelationshipWeb {
    const center = "person:center" as EntityId;
    const nodes = [
      {
        personId: center,
        name: "You",
        isPlayer: true,
        alive: true,
        relationship: null,
        role: null,
      },
    ];
    const edges = [];
    for (let index = 0; index < count; index += 1) {
      const id = `person:${String(index).padStart(3, "0")}` as EntityId;
      nodes.push({
        personId: id,
        name: `Member ${index}`,
        isPlayer: false,
        alive: true,
        relationship: null,
        role: null,
      });
      edges.push({
        fromId: center,
        toId: id,
        kind: "work" as const,
        visibility: "known" as const,
        label: "Work",
      });
    }
    return { focusId: center, nodes, edges };
  }

  const distance = (
    left: { x: number; y: number },
    right: { x: number; y: number },
  ) => Math.hypot(left.x - right.x, left.y - right.y);

  it("draws what fits without overlap and counts the rest", () => {
    const web = starOf(204);
    const layout = layoutRelationshipWeb(web, true, 640, 460);
    expect(layout.nodes.length + layout.hiddenCount).toBe(205);
    expect(layout.hiddenCount).toBeGreaterThan(0);
    const ringed = layout.nodes.filter((node) => node.depth > 0);
    for (let a = 0; a < ringed.length; a += 1) {
      for (let b = a + 1; b < ringed.length; b += 1) {
        expect(distance(ringed[a]!, ringed[b]!)).toBeGreaterThan(44);
      }
    }
    // Names print only where they have room.
    const named = ringed.filter((node) => node.labeled);
    for (let a = 0; a < named.length; a += 1) {
      for (let b = a + 1; b < named.length; b += 1) {
        const [left, right] = [named[a]!, named[b]!];
        if (Math.abs(left.y - right.y) < 20) {
          expect(Math.abs(left.x - right.x)).toBeGreaterThan(100);
        }
      }
    }
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(640);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(460);
    }
  });

  it("names everybody in a small web and hides nobody", () => {
    const layout = layoutRelationshipWeb(starOf(6), true, 640, 460);
    expect(layout.hiddenCount).toBe(0);
    expect(layout.nodes.every((node) => node.labeled)).toBe(true);
  });

  it.each([6, 12, 18])(
    "prints no name over another face with %i people",
    (count) => {
      const layout = layoutRelationshipWeb(starOf(count), true, 640, 460);
      // As PeopleRelationshipWeb draws them: a 40-unit face (52 at the
      // center) and a name box below it, up to 20 characters wide.
      const face = (node: (typeof layout.nodes)[number]) =>
        node.depth === 0 ? 30 : 24;
      for (const named of layout.nodes.filter((node) => node.labeled)) {
        const half = Math.max(20, named.name.slice(0, 20).length * 3.75 + 6);
        const top = named.y + face(named) + 1;
        const bottom = top + 17;
        for (const other of layout.nodes) {
          if (other === named) continue;
          const nearX = Math.max(
            named.x - half,
            Math.min(other.x, named.x + half),
          );
          const nearY = Math.max(top, Math.min(other.y, bottom));
          expect(
            Math.hypot(other.x - nearX, other.y - nearY),
            `${named.name} over ${other.name}`,
          ).toBeGreaterThan(face(other));
        }
      }
    },
  );
});
