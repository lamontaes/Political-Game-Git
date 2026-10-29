import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";

describe("a person's history on their card", () => {
  it("tells a parent's life from their records, with your own birth as yours", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-history");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    // A child whose parent's record names them as a child.
    const pair = [...core.people.values()]
      .flatMap((child) =>
        (child.pastFacts ?? [])
          .filter((fact) => fact.kind === "family:parent")
          .map((fact) => ({ child, parentId: fact.facts?.otherPersonId })),
      )
      .find(
        ({ child, parentId }) =>
          parentId &&
          (core.people.get(parentId)?.pastFacts ?? []).some(
            (fact) =>
              fact.kind === "family:child" &&
              fact.facts?.otherPersonId === child.id,
          ),
      );
    expect(pair, `${where}: a parent and child`).toBeDefined();
    const { child, parentId } = pair!;
    const card = knownCard(core, child.id, parentId!);
    const records = new Set([
      ...(core.people.get(parentId!)?.pastFacts ?? []).map((fact) => fact.id),
      ...core.relationships.keys(),
    ]);
    expect(card.history.length, where).toBeGreaterThan(0);
    // Oldest first, each line on a record of theirs or of the tie.
    const dates = card.history.map((line) => line.date);
    expect(dates, where).toEqual([...dates].sort());
    for (const line of card.history)
      expect(records.has(line.recordId), `${where}: ${line.recordId}`).toBe(
        true,
      );
    // Your own birth is said to you, not by your name.
    const yours = card.history.filter((line) =>
      line.text.startsWith("You were born"),
    );
    expect(yours, where).toHaveLength(1);
    expect(
      card.history.some((line) =>
        line.text.startsWith(`${child.givenName} ${child.familyName} was born`),
      ),
      where,
    ).toBe(false);
  }, 600_000);
});
