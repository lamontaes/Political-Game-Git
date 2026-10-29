import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { preStartHistory } from "../core2/past";
import { knownCard } from "./card";
import { schoolsOf } from "./words";

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
      ...preStartHistory(core, { personId: parentId! as PersonId }).map(
        (row) => row.id,
      ),
      ...schoolsOf(core, parentId!).map((row) => row.recordId),
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

  it("tells a life for anyone opened, tied to the player or not", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-history-all");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const viewer = [...core.people.values()].find(
      (person) => person.familyIds.size > 0,
    )!;
    const tied = new Set<string>(viewer.familyIds);
    for (const id of core.relationshipsByPerson.get(viewer.id) ?? []) {
      const row = core.relationships.get(id);
      if (row) tied.add(row.actorId === viewer.id ? row.otherId : row.actorId);
    }
    const strangers = [...core.people.values()].filter(
      (person) => person.id !== viewer.id && !tied.has(person.id),
    );
    // An official (a seat reached before the start), a neighbor and a coworker.
    const seatHolder = strangers.find(
      (person) =>
        preStartHistory(core, {
          kind: "office.seat-reached",
          personId: person.id,
        }).length,
    );
    const worker = strangers.find(
      (person) =>
        preStartHistory(core, {
          kind: "person.work-spell",
          personId: person.id,
        }).length,
    );
    const neighbor = strangers.find(
      (person) =>
        person !== seatHolder &&
        person !== worker &&
        person.placeId === viewer.placeId &&
        person.alive,
    );
    const chosen = { seatHolder, worker, neighbor };
    for (const [role, person] of Object.entries(chosen)) {
      expect(person, `${where}: a ${role}`).toBeDefined();
      const card = knownCard(core, viewer.id, person!.id);
      process.stdout.write(
        `${where} ${role} ${person!.id}: ${card.history.length} lines: ${card.history.map((l) => l.text).join(" | ")}\n`,
      );
      const records = new Set<string>([
        ...(person!.pastFacts ?? []).map((fact) => fact.id),
        ...preStartHistory(core, { personId: person!.id }).map((row) => row.id),
        ...core.relationships.keys(),
        ...schoolsOf(core, person!.id).map((row) => row.recordId),
      ]);
      for (const line of card.history)
        expect(records.has(line.recordId), `${where}: ${line.recordId}`).toBe(
          true,
        );
      expect(card.history.length, `${where}: ${role}`).toBeGreaterThanOrEqual(
        4,
      );
    }
  }, 600_000);
});
