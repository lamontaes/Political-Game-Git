import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { drawFamilyShape, recordedFamilyEstimates } from "./family-shape";
import { recordKinship } from "./life";
import { establishDrawnAdultFamily } from "./character-history";
import { createWorld } from "./world";
import { createDemoWorld } from "./demo";

function fixture() {
  const demo = createDemoWorld("recorded-family-estimate-fixture");
  const people = demo.personOrder.slice(0, 5).map((id, index) => ({
    id,
    generationKey: demo.people[id]!.generationKey,
    givenName: demo.people[id]!.givenName,
    familyName: demo.people[id]!.familyName,
    homeJurisdictionId: demo.people[id]!.homeJurisdictionId,
    detailLevel: "lightweight" as const,
    establishedFacts: demo.people[id]!.establishedFacts.filter(
      (fact) =>
        fact.kind === "birth-date" ||
        fact.kind === "birthplace" ||
        (fact.kind === "residence" && fact.endedAt === null),
    ).map((fact) => ({
      ...fact,
      occurredAt: makeIsoDate(
        ["1960-01-01", "1964-01-01", "1990-01-01", "1994-01-01", "1998-01-01"][
          index
        ]!,
      ),
      summary: "Authored birth date for controlled family fixture.",
    })),
    birthDate: makeIsoDate(
      ["1960-01-01", "1964-01-01", "1990-01-01", "1994-01-01", "1998-01-01"][
        index
      ]!,
    ),
  }));
  let world = createWorld({
    seed: "recorded-family-estimate-fixture",
    currentDate: makeIsoDate("2026-01-01"),
    jurisdictions: Object.values(demo.jurisdictions),
    people,
  });
  const link = (
    a: number,
    b: number,
    kind: "lineal:parent-child" | "collateral:sibling",
  ) => {
    world = recordKinship(world, {
      stableKey: `fixture:${a}:${b}:${kind}`,
      personIds: [people[a]!.id, people[b]!.id],
      establishedAt: world.currentDate,
      kind,
      provenance: {
        kind: "authored",
        note: "Controlled family-record fixture; not an observed population.",
      },
    });
  };
  link(0, 2, "lineal:parent-child");
  link(1, 2, "lineal:parent-child");
  link(0, 3, "lineal:parent-child");
  link(2, 3, "collateral:sibling");
  return { world, people };
}

describe("recorded game family estimates", () => {
  it("uses actual saved kinship IDs and game means/spreads", () => {
    const { world, people } = fixture();
    const reading = recordedFamilyEstimates(world);
    expect(reading.samples.map((row) => row.personId).sort()).toEqual(
      [people[2]!.id, people[3]!.id].sort(),
    );
    expect(reading.secondParent).toEqual({
      mean: 0.5,
      standardDeviation: 0.5,
      count: 2,
    });
    expect(reading.siblingCount).toEqual({
      mean: 1,
      standardDeviation: 0,
      count: 2,
    });
    expect(reading.parentAgeGapYears).toEqual({
      mean: 4,
      standardDeviation: 0,
      count: 1,
    });
    expect(reading.parentAgeAtChildBirth?.mean).toBe(30);
    expect(reading.parentAgeAtChildBirth?.count).toBe(3);
    expect(reading.parentAgeAtChildBirth?.standardDeviation).toBeCloseTo(
      Math.sqrt(32 / 3),
    );
    expect(reading.siblingSpacingYears).toEqual({
      mean: 4,
      standardDeviation: 0,
      count: 2,
    });
    const ids = new Set(
      world.history.kinshipRelationships.map((row) => row.id),
    );
    expect(
      reading.samples.every((row) => row.kinshipIds.every((id) => ids.has(id))),
    ).toBe(true);
    expect(reading.note).toContain(
      "ESTIMATED: averaged from this game's recorded families",
    );
  });
  it("responds to an additional actual game family instead of an outside average", () => {
    const { world, people } = fixture();
    const next = recordKinship(world, {
      stableKey: "fixture:additional-child",
      personIds: [people[1]!.id, people[4]!.id],
      establishedAt: world.currentDate,
      kind: "lineal:parent-child",
      provenance: { kind: "authored", note: "Controlled additional record." },
    });
    expect(recordedFamilyEstimates(next).secondParent?.mean).toBe(1 / 3);
    expect(recordedFamilyEstimates(next).siblingCount?.mean).toBe(2 / 3);
  });
  it("preserves source world, ordering, replay and every existing birth date", () => {
    const { world } = fixture();
    const before = JSON.stringify(world);
    const reading = recordedFamilyEstimates(world);
    expect(recordedFamilyEstimates(JSON.parse(before))).toEqual(reading);
    expect(
      recordedFamilyEstimates({
        ...world,
        history: {
          ...world.history,
          kinshipRelationships: [
            ...world.history.kinshipRelationships,
          ].reverse(),
        },
      }),
    ).toEqual(reading);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("does not turn absent records into observed zero families", () => {
    const { world } = fixture();
    const reading = recordedFamilyEstimates({
      ...world,
      history: { ...world.history, kinshipRelationships: [] },
    });
    expect(reading.samples).toEqual([]);
    expect(reading.secondParent).toBeNull();
    expect(reading.parentAgeGapYears).toBeNull();
  });
});

describe("game family shape receiving path", () => {
  it("uses the current game pattern and birth intervals without seed rolls", () => {
    const { world } = fixture();
    const shape = drawFamilyShape(world, "controlled-player");
    expect(shape.grandparentAgesAtBirth).toEqual([
      [30, 30],
      [30, 30],
    ]);
    expect(shape.parentAgeGapYears).toBe(4);
    expect(
      shape.estimate.samples.some(
        (row) =>
          JSON.stringify([...row.siblingOffsetsYears].sort((a, b) => b - a)) ===
          JSON.stringify(shape.siblingOffsetsYears),
      ),
    ).toBe(true);
    expect(
      drawFamilyShape({ ...world, seed: "different-seed" }, "another-player"),
    ).toEqual(shape);
  });
  it("does not invent birth ages for an empty comparable cohort", () => {
    const { world } = fixture();
    const empty = {
      ...world,
      history: { ...world.history, kinshipRelationships: [] },
    };
    const shape = drawFamilyShape(empty, "controlled-player");
    expect(shape.secondParent).toBe(false);
    expect(shape.siblingOffsetsYears).toEqual([]);
    expect(shape.grandparentAgesAtBirth).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(shape.estimate.samples).toEqual([]);
  });
});

it("receives World in the existing adult-family caller and saves estimate provenance", () => {
  const { world, people } = fixture();
  const input = {
    personId: people[2]!.id,
    jurisdictionId: people[2]!.homeJurisdictionId,
  };
  const next = establishDrawnAdultFamily(world, input);
  expect(next.people[people[2]!.id]!.birthDate).toBe(
    world.people[people[2]!.id]!.birthDate,
  );
  expect(next.people[people[0]!.id]!.birthDate).toBe(
    world.people[people[0]!.id]!.birthDate,
  );
  const added = next.history.kinshipRelationships.slice(
    world.history.kinshipRelationships.length,
  );
  expect(added.length).toBeGreaterThan(0);
  expect(
    added.every(
      (row) =>
        row.provenance.kind === "authored" &&
        row.provenance.note.includes(
          "ESTIMATED: averaged from this game's recorded families",
        ),
    ),
  ).toBe(true);
  expect(establishDrawnAdultFamily(next, input)).toBe(next);
});
