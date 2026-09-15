import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import {
  layoutRelationshipWeb,
  neighborsOf,
  otherPersonId,
  projectRelationshipWeb,
  readableDate,
  recordedConnection,
} from "./relationship-web";

function newLife(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("how the player knows the selected person", () => {
  it("answers only with the web's own direct edge between the two", () => {
    const { world, personId } = newLife("ui-finish-connection");
    const web = projectRelationshipWeb(world, personId);
    const neighbors = neighborsOf(web, personId);
    expect(neighbors.length).toBeGreaterThan(0);
    for (const edge of neighbors) {
      const other = otherPersonId(edge, personId);
      const connection = recordedConnection(web, personId, other);
      expect(connection.edges.length).toBeGreaterThan(0);
      for (const found of connection.edges) {
        expect(web.edges).toContain(found);
        expect([found.fromId, found.toId].sort()).toEqual(
          [personId, other].sort(),
        );
      }
      expect([...connection.personIds].sort()).toEqual(
        [personId, other].sort(),
      );
    }
  });

  it("infers nothing for somebody with no direct record, and nothing for the player", () => {
    const { world, personId } = newLife("ui-finish-connection-none");
    const web = projectRelationshipWeb(world, personId);
    const direct = new Set(
      neighborsOf(web, personId).map((edge) => otherPersonId(edge, personId)),
    );
    const indirect = web.nodes.find(
      (node) => !node.isPlayer && !direct.has(node.personId),
    );
    if (indirect) {
      const none = recordedConnection(web, personId, indirect.personId);
      expect(none.edges).toEqual([]);
      expect(none.personIds.size).toBe(0);
    }
    expect(recordedConnection(web, personId, personId).edges).toEqual([]);
  });

  it("keeps the player's neighbors on the drawing when somebody else is centered", () => {
    const { world, personId } = newLife("ui-finish-connection-layout");
    const playerWeb = projectRelationshipWeb(world, personId);
    const someone = neighborsOf(playerWeb, personId)[0];
    expect(someone).toBeDefined();
    const other = otherPersonId(someone!, personId);
    const focused = projectRelationshipWeb(world, personId, other);
    const drawn = new Set(
      layoutRelationshipWeb(focused, false, 640, 460, personId).nodes.map(
        (node) => node.personId,
      ),
    );
    for (const edge of neighborsOf(playerWeb, personId)) {
      expect(drawn.has(otherPersonId(edge, personId))).toBe(true);
    }
    for (const node of layoutRelationshipWeb(focused, false, 640, 460, personId)
      .nodes) {
      expect(node.y + 26 + 17).toBeLessThanOrEqual(460);
      expect(node.y - 26).toBeGreaterThanOrEqual(0);
    }
  });

  it("writes stored dates for a reader", () => {
    expect(readableDate("2001-01-28")).toBe("January 28, 2001");
    expect(readableDate("not a date")).toBe("not a date");
  });
});
