import { describe, expect, it } from "vitest";

import {
  PLACEHOLDER_HEARING_ROOM_A,
  PLACEHOLDER_HEARING_ROOM_ARCHETYPE,
  PLACEHOLDER_MEASURED_ROOMS,
} from "./fixtures/measured-geometry";
import {
  ARCHETYPE_IS_NOT_A_REPLICA_CLAIM,
  deriveLengthFromScale,
  dimensionsOfKind,
  scaleSupportsDerivation,
  validateGeometryArchetype,
  validateMeasuredRoom,
  type DrawingScale,
  type MeasuredDimension,
  type MeasuredRoom,
} from "./measured-geometry";

const RESOLVED_SCALE: DrawingScale = {
  scaleId: "scale-1",
  sourceId: "source-1",
  state: "resolved",
  printedScale: "1:100",
  referenceLength: 6,
  referencePixelSpan: 300,
  unit: "m",
};

function room(
  dimensions: readonly MeasuredDimension[],
  scales: readonly DrawingScale[] = [RESOLVED_SCALE],
): MeasuredRoom {
  return {
    roomId: "room-1",
    buildingIdentifier: "BUILDING_1",
    roomIdentifier: "ROOM_1",
    sources: [
      { sourceId: "source-1", title: "Sheet A-101", rightsStatus: "unknown" },
    ],
    drawingScales: scales,
    dimensions,
  };
}

function codes(result: { findings: readonly { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

describe("direct-published versus scale-derived", () => {
  it("accepts a published dimension that names its source", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "room-width",
          basis: "direct-published",
          value: 14.6,
          unit: "m",
          publishedIn: "source-1",
        },
      ]),
    );
    expect(result.valid).toBe(true);
  });

  it("refuses a scale-derived number dressed up as directly published", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "aisle-width",
          basis: "direct-published",
          value: 1.2,
          unit: "m",
          publishedIn: "source-1",
          derivedFrom: { scaleId: "scale-1", measuredPixelSpan: 60 },
        },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("direct-published-with-scale-derivation");
  });

  it("refuses a published claim with nothing that published it", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "room-width",
          basis: "direct-published",
          value: 14.6,
          unit: "m",
        },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("direct-published-without-source");
  });

  it("refuses a scale-derived number that shows no working", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "aisle-width",
          basis: "scale-derived",
          value: 1.2,
          unit: "m",
        },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("scale-derived-without-derivation");
  });

  it("refuses derivation through a scale that was never resolved", () => {
    const printedOnly: DrawingScale = {
      scaleId: "scale-1",
      sourceId: "source-1",
      state: "printed-only",
      printedScale: "1:100",
      reason: "The reproduction was rescaled.",
    };
    const result = validateMeasuredRoom(
      room(
        [
          {
            dimensionId: "d1",
            kind: "aisle-width",
            basis: "scale-derived",
            value: 1.2,
            unit: "m",
            derivedFrom: { scaleId: "scale-1", measuredPixelSpan: 60 },
          },
        ],
        [printedOnly],
      ),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("scale-derived-without-resolved-scale");
  });

  it("will not derive a length from an unresolved scale", () => {
    expect(
      deriveLengthFromScale(
        {
          scaleId: "s",
          sourceId: "source-1",
          state: "printed-only",
          printedScale: "1:50",
        },
        60,
      ),
    ).toBeNull();
    expect(scaleSupportsDerivation(RESOLVED_SCALE)).toBe(true);
  });

  it("derives a length through a resolved scale", () => {
    const derived = deriveLengthFromScale(RESOLVED_SCALE, 60);
    expect(derived).not.toBeNull();
    expect(derived!.value).toBeCloseTo(1.2, 6);
    expect(derived!.unit).toBe("m");
  });
});

describe("bounded estimates stay ranges", () => {
  it("requires both bounds", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "dais-height",
          basis: "bounded-estimate",
          value: null,
          unit: "m",
          lowerBound: 0.3,
        },
      ]),
    );
    expect(codes(result)).toContain("bounded-estimate-without-bounds");
  });

  it("refuses to let an estimate collapse into a single number", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "dais-height",
          basis: "bounded-estimate",
          value: 0.45,
          unit: "m",
          lowerBound: 0.3,
          upperBound: 0.6,
        },
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("bounded-estimate-with-value");
  });

  it("catches inverted bounds", () => {
    const result = validateMeasuredRoom(
      room([
        {
          dimensionId: "d1",
          kind: "dais-height",
          basis: "bounded-estimate",
          value: null,
          unit: "m",
          lowerBound: 0.9,
          upperBound: 0.4,
        },
      ]),
    );
    expect(codes(result)).toContain("bounds-inverted");
  });
});

describe("archetypes generalise rather than replicate", () => {
  it("lets many measured rooms inform one archetype", () => {
    const knownIds = new Set(
      PLACEHOLDER_MEASURED_ROOMS.map((entry) => entry.roomId),
    );
    const result = validateGeometryArchetype(
      PLACEHOLDER_HEARING_ROOM_ARCHETYPE,
      knownIds,
    );
    expect(result.valid).toBe(true);
    expect(
      PLACEHOLDER_HEARING_ROOM_ARCHETYPE.contributingRoomIds.length,
    ).toBeGreaterThan(1);
  });

  it("warns when an archetype rests on a single room", () => {
    const result = validateGeometryArchetype(
      {
        archetypeId: "single",
        label: "One room",
        contributingRoomIds: ["room-1"],
      },
      new Set(["room-1"]),
    );
    expect(codes(result)).toContain("archetype-single-room");
  });

  it("rejects an archetype citing a room nobody measured", () => {
    const result = validateGeometryArchetype(
      {
        archetypeId: "ghost",
        label: "Ghost",
        contributingRoomIds: ["room-1", "room-missing"],
      },
      new Set(["room-1"]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("archetype-references-unknown-room");
  });

  it("states in code that evidence is not a replica claim", () => {
    expect(ARCHETYPE_IS_NOT_A_REPLICA_CLAIM).toBe(true);
  });
});

describe("placeholder fixtures", () => {
  it("validate cleanly under the contract", () => {
    for (const measuredRoom of PLACEHOLDER_MEASURED_ROOMS) {
      const result = validateMeasuredRoom(measuredRoom);
      expect(result.findings.filter((f) => f.severity === "error")).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it("assert no jurisdiction anywhere", () => {
    const serialized = JSON.stringify(PLACEHOLDER_MEASURED_ROOMS).toLowerCase();
    for (const forbidden of ["kentucky", "lexington", "fayette"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("keep unknown rights unknown", () => {
    for (const measuredRoom of PLACEHOLDER_MEASURED_ROOMS) {
      for (const source of measuredRoom.sources) {
        expect(source.rightsStatus).toBe("unknown");
      }
    }
  });

  it("expose dimensions by kind", () => {
    expect(
      dimensionsOfKind(PLACEHOLDER_HEARING_ROOM_A, "room-width"),
    ).toHaveLength(1);
    expect(
      dimensionsOfKind(PLACEHOLDER_HEARING_ROOM_A, "seat-pitch"),
    ).toHaveLength(0);
  });
});
