import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import { projectPeopleDirectory } from "./people-directory";
import { projectPersonalRecord } from "./personal-record";
import {
  layoutRelationshipWeb,
  neighborhoodIds,
  neighborsOf,
  otherPersonId,
  projectRelationshipWeb,
} from "./relationship-web";
import type { EntityId, World } from "../simulation";

function newLife(seed: string, household: "shares-a-home" | "lives-alone") {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household,
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

function snapshot(world: World) {
  return JSON.stringify(world);
}

describe("the relationship web", () => {
  it("is a read-only projection of a generated life", () => {
    const { world, personId } = newLife("web-readonly", "shares-a-home");
    const before = snapshot(world);
    const web = projectRelationshipWeb(world, personId);
    expect(snapshot(world)).toBe(before);
    expect(web.nodes.some((node) => node.isPlayer)).toBe(true);
    expect(
      web.nodes.some((node) => node.personId === personId && node.isPlayer),
    ).toBe(true);
  });

  it("puts household kin on a family or household edge, never a friendship meter", () => {
    const { world, personId } = newLife("web-family", "shares-a-home");
    const housemate = projectPersonalRecord(world, personId)?.household[0];
    expect(housemate).toBeDefined();
    const web = projectRelationshipWeb(world, personId);
    const edge = web.edges.find(
      (entry) =>
        otherPersonId(entry, personId) === housemate!.personId ||
        (entry.fromId === housemate!.personId &&
          entry.toId === housemate!.personId),
    );
    const touching = web.edges.filter(
      (entry) =>
        entry.fromId === housemate!.personId ||
        entry.toId === housemate!.personId,
    );
    expect(touching.length).toBeGreaterThan(0);
    expect(
      touching.some(
        (entry) => entry.kind === "family" || entry.kind === "household",
      ),
    ).toBe(true);
    expect(JSON.stringify(web)).not.toMatch(/closeness|meter|score/i);
    expect(edge ?? touching[0]).toBeDefined();
  });

  it("does not invent nodes for people the directory does not have", () => {
    const { world, personId } = newLife("web-unknown", "lives-alone");
    const directory = projectPeopleDirectory(world, personId);
    const web = projectRelationshipWeb(world, personId);
    const extra = web.nodes.filter(
      (node) =>
        !node.isPlayer &&
        !directory.people.some((row) => row.personId === node.personId),
    );
    expect(extra).toEqual([]);
  });

  it("does not leak a raw kinship the player has no standing to see", () => {
    const { world, personId } = newLife("web-secret", "shares-a-home");
    const strangerA = "person-secret-a" as EntityId;
    const strangerB = "person-secret-b" as EntityId;
    const donor = Object.values(world.people).find(
      (person) => person && person.id !== personId,
    );
    expect(donor).toBeDefined();
    const template = world.history.kinshipRelationships[0];
    expect(template).toBeDefined();
    const clone = (suffix: string, id: EntityId) => ({
      ...donor!,
      id,
      givenName: `Secret${suffix}`,
      familyName: "Stranger",
    });
    const secretWorld: World = {
      ...world,
      people: {
        ...world.people,
        [strangerA]: clone("A", strangerA),
        [strangerB]: clone("B", strangerB),
      },
      history: {
        ...world.history,
        kinshipRelationships: [
          ...world.history.kinshipRelationships,
          {
            ...template!,
            id: "kin-secret" as EntityId,
            stableKey: "kin-secret",
            personIds: [strangerA, strangerB],
          },
        ],
      },
    };
    const web = projectRelationshipWeb(secretWorld, personId);
    expect(web.nodes.some((node) => node.personId === strangerA)).toBe(false);
    expect(web.nodes.some((node) => node.personId === strangerB)).toBe(false);
    expect(
      web.edges.some(
        (edge) =>
          (edge.fromId === strangerA && edge.toId === strangerB) ||
          (edge.fromId === strangerB && edge.toId === strangerA),
      ),
    ).toBe(false);
  });

  it("keeps a stable layout for the same focus while expansion only adds people", () => {
    const { world, personId } = newLife("web-layout", "shares-a-home");
    const web = projectRelationshipWeb(world, personId);
    const compact = layoutRelationshipWeb(web, false);
    const again = layoutRelationshipWeb(web, false);
    expect(
      compact.nodes.map((node) => [node.personId, node.x, node.y]),
    ).toEqual(again.nodes.map((node) => [node.personId, node.x, node.y]));
    const near = neighborhoodIds(web, false);
    const all = neighborhoodIds(web, true);
    for (const id of near) expect(all.has(id)).toBe(true);
    expect(all.size).toBe(web.nodes.length);
  });

  it("names neighbors of the player from actual edges", () => {
    const { world, personId } = newLife("web-neighbors", "shares-a-home");
    const web = projectRelationshipWeb(world, personId);
    for (const edge of neighborsOf(web, personId)) {
      expect([edge.fromId, edge.toId]).toContain(personId);
      expect(otherPersonId(edge, personId)).not.toBe(personId);
    }
  });
});
