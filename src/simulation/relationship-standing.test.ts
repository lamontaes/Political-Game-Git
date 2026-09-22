import { describe, expect, it } from "vitest";

import { createDemoWorld } from "./demo";
import { createWorld } from "./world";
import { recordRelationshipInteraction } from "./records";
import { deriveRelationshipSummary } from "./queries";
import {
  describeRelationshipStanding,
  RELATIONSHIP_DIMENSIONS,
  rawWeight,
  readRelationshipStanding,
} from "./relationship-standing";
import type {
  EntityId,
  IsoDate,
  Person,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  World,
} from "./types";

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function personId(world: World, index: number): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error("Missing test person.");
  return id;
}

let stableKeyCounter = 0;

function log(
  world: World,
  pair: readonly [EntityId, EntityId],
  kind: RelationshipInteractionKind,
  change: RelationshipChange,
  significance: RelationshipSignificance,
  occurredAt: string,
  tags: readonly string[] = [],
): World {
  stableKeyCounter += 1;
  return recordRelationshipInteraction(world, {
    stableKey: `standing-test:${stableKeyCounter}`,
    personIds: [pair[0], pair[1]],
    eventId: null,
    occurredAt: occurredAt as IsoDate,
    kind,
    change,
    significance,
    summary: "Something happened between two people.",
    tags: [...tags],
  });
}

describe("relationship standing", () => {
  it("applies no fading of its own, since the pace is not answered yet", () => {
    /*
     * THIS TEST IS EXPECTED TO CHANGE. lamontae ruled on 2026-09-22 that
     * relationships should fade with absence and that the fading must not read
     * as a number; the shape is with ChatGPT as
     * `relationship-fading-with-absence`. Until that answer lands, this file
     * must not invent a pace of its own, and two worlds with the same conduct
     * and thirty-odd years between them read identically. When the answer
     * arrives this becomes a test of the fading it specifies, per line, rather
     * than a test that there is none.
     */
    let recent = bareWorld("standing-no-decay");
    let distant = bareWorld("standing-no-decay");
    const recentPair = [personId(recent, 0), personId(recent, 1)] as const;
    const distantPair = [personId(distant, 0), personId(distant, 1)] as const;
    // Both people are adults by this year in either world; the two worlds are
    // the same seed, so the only difference between them is how long ago.
    const adultYear =
      Math.max(
        ...recentPair.map((id) =>
          Number(recent.people[id]!.birthDate.slice(0, 4)),
        ),
      ) + 21;
    const recentYear = Number(recent.currentDate.slice(0, 4)) - 1;
    expect(recentYear - adultYear).toBeGreaterThan(20);

    for (const month of ["03", "06", "09"]) {
      recent = log(
        recent,
        recentPair,
        "care:looked-after",
        "strengthened",
        "major",
        `${recentYear}-${month}-01`,
      );
      distant = log(
        distant,
        distantPair,
        "care:looked-after",
        "strengthened",
        "major",
        `${adultYear}-${month}-01`,
      );
    }

    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      expect(
        readRelationshipStanding(distant, distantPair[0], distantPair[1])
          .readings[dimension].band,
      ).toBe(
        readRelationshipStanding(recent, recentPair[0], recentPair[1]).readings[
          dimension
        ].band,
      );
    }
  });

  it("separates the lines, so somebody can be rated at work and not wanted at home", () => {
    let world = bareWorld("standing-independent");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    for (const date of [
      "2020-01-06",
      "2020-02-03",
      "2020-03-02",
      "2021-01-04",
    ]) {
      world = log(
        world,
        pair,
        "work:project",
        "strengthened",
        "meaningful",
        date,
      );
    }

    const standing = readRelationshipStanding(world, pair[0], pair[1]);
    expect(standing.readings.respect.band).not.toBe("none");
    expect(standing.readings.trust.band).not.toBe("none");
    // Working well together is not affection, and the old single sum could not
    // tell the two apart.
    expect(standing.readings.warmth.band).toBe("none");
    expect(standing.readings.commitment.band).toBe("none");
  });

  it("keeps a quarrel live until the two of them settle it, and not before", () => {
    let world = bareWorld("standing-tension");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    world = log(
      world,
      pair,
      "conflict:falling-out",
      "strained",
      "major",
      "2005-04-01",
    );
    const afterQuarrel = readRelationshipStanding(world, pair[0], pair[1]);
    expect(afterQuarrel.readings.tension.band).not.toBe("none");

    // Twenty years of nothing at all. The quarrel is exactly as live.
    const stillUnsettled = readRelationshipStanding(world, pair[0], pair[1]);
    expect(stillUnsettled.readings.tension.band).toBe(
      afterQuarrel.readings.tension.band,
    );

    const liveTension = rawWeight(world, pair[0], pair[1], "tension");
    world = log(
      world,
      pair,
      "contact:visit",
      "strengthened",
      "major",
      "2025-04-01",
    );
    world = log(
      world,
      pair,
      "support:helped",
      "strengthened",
      "major",
      "2025-05-01",
    );
    // Settled by what they did, and only by what they did.
    expect(rawWeight(world, pair[0], pair[1], "tension")).toBeLessThan(
      liveTension,
    );
    expect(
      readRelationshipStanding(world, pair[0], pair[1]).readings.tension.band,
    ).toBe("none");
  });

  it("never lets a quarrel cancel what one of them is owed", () => {
    let world = bareWorld("standing-commitment-floor");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    world = log(
      world,
      pair,
      "commitment:undertaking",
      "formed",
      "major",
      "2015-01-01",
    );
    const owed = rawWeight(world, pair[0], pair[1], "commitment");
    expect(owed).toBeGreaterThan(0);

    world = log(world, pair, "conflict:row", "strained", "major", "2016-01-01");
    // The row cools warmth and trust. It does not release the undertaking.
    expect(rawWeight(world, pair[0], pair[1], "warmth")).toBeLessThan(0);
    expect(rawWeight(world, pair[0], pair[1], "commitment")).toBe(owed);
    // And commitment never falls below nothing, whatever else is logged.
    expect(
      rawWeight(world, pair[0], pair[1], "commitment"),
    ).toBeGreaterThanOrEqual(0);
  });

  it("reads help given and help taken from different sides when the record says who acted", () => {
    let world = bareWorld("standing-asymmetry");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    world = log(
      world,
      pair,
      "support:carried-them",
      "strengthened",
      "major",
      "2019-02-01",
      [`relationship.actor:${String(pair[0])}`],
    );

    const giver = readRelationshipStanding(world, pair[0], pair[1]);
    const receiver = readRelationshipStanding(world, pair[1], pair[0]);
    // The person who was carried trusts the one who carried them.
    expect(receiver.readings.trust.band).not.toBe("none");
    // The person who did the carrying holds what they took on, not new trust.
    expect(giver.readings.trust.band).toBe("none");
    expect(giver.readings.commitment.band).not.toBe("none");
  });

  it("reads an older save with no recorded direction the same way from both sides", () => {
    // Every interaction written before the actor tag existed carries no
    // direction. Both people read it identically, which is the honest reading
    // of a record that never said who gave; it is not a claim of symmetry.
    let world = bareWorld("standing-legacy-save");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    world = log(
      world,
      pair,
      "support:helped",
      "strengthened",
      "major",
      "1998-05-01",
    );

    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      expect(
        readRelationshipStanding(world, pair[0], pair[1]).readings[dimension]
          .band,
      ).toBe(
        readRelationshipStanding(world, pair[1], pair[0]).readings[dimension]
          .band,
      );
    }
  });

  it("treats an unclassified interaction as nothing, not as a small good thing", () => {
    let world = bareWorld("standing-unknown");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    for (const date of [
      "2020-01-01",
      "2020-02-01",
      "2020-03-01",
      "2020-04-01",
    ]) {
      world = log(
        world,
        pair,
        "other:unspecified",
        "strengthened",
        "major",
        date,
      );
    }
    const standing = readRelationshipStanding(world, pair[0], pair[1]);
    for (const dimension of RELATIONSHIP_DIMENSIONS) {
      expect(standing.readings[dimension].band).toBe("none");
    }
    // It still happened: the count is the log, and only the reading abstains.
    expect(standing.interactionCount).toBe(4);
  });

  it("stores nothing on anybody", () => {
    let world = bareWorld("standing-derived");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    world = log(
      world,
      pair,
      "care:looked-after",
      "strengthened",
      "major",
      "2020-01-01",
    );
    readRelationshipStanding(world, pair[0], pair[1]);
    const subject = world.people[pair[0]]!;
    expect(subject).not.toHaveProperty("standing");
    expect(subject).not.toHaveProperty("warmth");
    expect(JSON.stringify(world.people)).not.toMatch(
      /warmth|tension|standing|closeness/i,
    );
  });

  it("says where you stand in plain words, with no measurement in them", () => {
    let world = bareWorld("standing-sentence");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    for (const date of ["2020-01-01", "2020-02-01", "2020-03-01"]) {
      world = log(
        world,
        pair,
        "care:looked-after",
        "strengthened",
        "major",
        date,
      );
    }
    world = log(world, pair, "conflict:row", "strained", "major", "2021-01-01");

    const sentence = describeRelationshipStanding(
      readRelationshipStanding(world, pair[0], pair[1]),
      "Dana",
    );
    expect(sentence).not.toBeNull();
    expect(sentence!).toMatch(/Dana/);
    expect(sentence!).not.toMatch(/\d/);
    expect(sentence!).not.toMatch(/score|meter|closeness|warmth|band|record/i);
  });

  it("says nothing at all when the record holds nothing that bears on it", () => {
    const world = bareWorld("standing-silent");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    expect(
      describeRelationshipStanding(
        readRelationshipStanding(world, pair[0], pair[1]),
        "Dana",
      ),
    ).toBeNull();
  });

  it("keeps the four buckets answering, now off the same reading", () => {
    let world = bareWorld("standing-buckets");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    expect(deriveRelationshipSummary(world, pair[0], pair[1]).closeness).toBe(
      "none",
    );

    for (const date of ["2020-01-01", "2020-02-01", "2020-03-01"]) {
      world = log(
        world,
        pair,
        "care:looked-after",
        "strengthened",
        "major",
        date,
      );
    }
    expect(deriveRelationshipSummary(world, pair[0], pair[1]).closeness).toBe(
      "close",
    );

    world = log(
      world,
      pair,
      "conflict:falling-out",
      "ended",
      "major",
      "2021-01-01",
    );
    expect(deriveRelationshipSummary(world, pair[0], pair[1]).closeness).toBe(
      "estranged",
    );

    // And a quarrel that the two of them actually settle is not permanent.
    world = log(
      world,
      pair,
      "contact:visit",
      "strengthened",
      "major",
      "2022-01-01",
    );
    world = log(
      world,
      pair,
      "support:helped",
      "strengthened",
      "major",
      "2022-02-01",
    );
    world = log(
      world,
      pair,
      "care:looked-after",
      "strengthened",
      "major",
      "2022-03-01",
    );
    expect(
      deriveRelationshipSummary(world, pair[0], pair[1]).closeness,
    ).not.toBe("estranged");
  });
});
