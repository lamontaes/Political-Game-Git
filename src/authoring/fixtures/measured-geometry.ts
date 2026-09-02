/**
 * MEASURED-GEOMETRY FIXTURES.
 *
 * These exercise the System 4 contract with the shape real research output will
 * have. They are ILLUSTRATIVE PLACEHOLDERS, not researched claims: the building
 * and room identifiers are deliberately generic, no jurisdiction is named, and
 * the source documents are fictitious stand-ins carrying `rightsStatus:
 * "unknown"`.
 *
 * Nothing downstream may treat these numbers as evidence about any real place.
 * They exist so the validator, the archetype logic and the scale-derivation
 * refusals have something to run against before real cargo arrives.
 */

import type { GeometryArchetype, MeasuredRoom } from "../measured-geometry";

const PLACEHOLDER_NOTE =
  "Illustrative placeholder for contract testing. Not a researched measurement of any real building.";

export const PLACEHOLDER_HEARING_ROOM_A: MeasuredRoom = {
  roomId: "placeholder-hearing-room-a",
  buildingIdentifier: "PLACEHOLDER_CIVIC_BUILDING_A",
  roomIdentifier: "PLACEHOLDER_HEARING_ROOM_A",
  roomUse: "public hearing room",
  note: PLACEHOLDER_NOTE,
  sources: [
    {
      sourceId: "placeholder-source-a1",
      title: "Placeholder facility description sheet A",
      rightsStatus: "unknown",
      note: PLACEHOLDER_NOTE,
    },
    {
      sourceId: "placeholder-source-a2",
      title: "Placeholder floor plan sheet A-101",
      sheetIdentifier: "A-101",
      rightsStatus: "unknown",
      note: PLACEHOLDER_NOTE,
    },
  ],
  drawingScales: [
    {
      scaleId: "placeholder-scale-a",
      sourceId: "placeholder-source-a2",
      state: "resolved",
      printedScale: "1:100",
      referenceLength: 6,
      referencePixelSpan: 300,
      unit: "m",
      method:
        "A dimensioned 6 m structural bay on the same reproduction was measured at 300 px.",
    },
  ],
  dimensions: [
    {
      dimensionId: "placeholder-hearing-a-room-width",
      kind: "room-width",
      basis: "direct-published",
      value: 14.6,
      unit: "m",
      publishedIn: "placeholder-source-a1",
    },
    {
      dimensionId: "placeholder-hearing-a-aisle-width",
      kind: "aisle-width",
      basis: "scale-derived",
      value: 1.2,
      unit: "m",
      derivedFrom: {
        scaleId: "placeholder-scale-a",
        measuredPixelSpan: 60,
        note: "Centre aisle measured between seat block edges.",
      },
    },
    {
      dimensionId: "placeholder-hearing-a-dais-height",
      kind: "dais-height",
      basis: "bounded-estimate",
      value: null,
      unit: "m",
      lowerBound: 0.3,
      upperBound: 0.6,
      note: "Read from a photograph against a door; a range is the most that supports.",
    },
  ],
};

export const PLACEHOLDER_HEARING_ROOM_B: MeasuredRoom = {
  roomId: "placeholder-hearing-room-b",
  buildingIdentifier: "PLACEHOLDER_CIVIC_BUILDING_B",
  roomIdentifier: "PLACEHOLDER_HEARING_ROOM_B",
  roomUse: "board and hearing room",
  note: PLACEHOLDER_NOTE,
  sources: [
    {
      sourceId: "placeholder-source-b1",
      title: "Placeholder facility description sheet B",
      rightsStatus: "unknown",
      note: PLACEHOLDER_NOTE,
    },
  ],
  drawingScales: [
    {
      scaleId: "placeholder-scale-b",
      sourceId: "placeholder-source-b1",
      state: "printed-only",
      printedScale: "1:50",
      reason:
        "The reproduction has been rescaled and no reference span was measured on it, so the printed scale cannot be trusted for derivation.",
    },
  ],
  dimensions: [
    {
      dimensionId: "placeholder-hearing-b-room-width",
      kind: "room-width",
      basis: "direct-published",
      value: 11.9,
      unit: "m",
      publishedIn: "placeholder-source-b1",
    },
    {
      dimensionId: "placeholder-hearing-b-seat-spacing",
      kind: "seat-spacing",
      basis: "direct-published",
      value: 0.56,
      unit: "m",
      publishedIn: "placeholder-source-b1",
    },
  ],
};

export const PLACEHOLDER_HEARING_ROOM_C: MeasuredRoom = {
  roomId: "placeholder-hearing-room-c",
  buildingIdentifier: "PLACEHOLDER_CIVIC_BUILDING_C",
  roomIdentifier: "PLACEHOLDER_HEARING_ROOM_C",
  roomUse: "council and hearing room",
  note: PLACEHOLDER_NOTE,
  sources: [
    {
      sourceId: "placeholder-source-c1",
      title: "Placeholder facility description sheet C",
      rightsStatus: "unknown",
      note: PLACEHOLDER_NOTE,
    },
  ],
  drawingScales: [],
  dimensions: [
    {
      dimensionId: "placeholder-hearing-c-room-width",
      kind: "room-width",
      basis: "direct-published",
      value: 13.2,
      unit: "m",
      publishedIn: "placeholder-source-c1",
    },
    {
      dimensionId: "placeholder-hearing-c-dais-width",
      kind: "dais-width",
      basis: "direct-published",
      value: 7.1,
      unit: "m",
      publishedIn: "placeholder-source-c1",
    },
  ],
};

export const PLACEHOLDER_MEASURED_ROOMS: readonly MeasuredRoom[] = [
  PLACEHOLDER_HEARING_ROOM_A,
  PLACEHOLDER_HEARING_ROOM_B,
  PLACEHOLDER_HEARING_ROOM_C,
];

/**
 * Three placeholder rooms informing one reusable archetype.
 *
 * The many-to-one shape is the whole idea. What transfers to a generic hearing
 * room is the RELATIONSHIP — a dais spanning a bit over half the room's width —
 * not any single room's 14.6 m. A generic scene built against this archetype is
 * a plausible hearing room, and specifically not a picture of building A.
 */
export const PLACEHOLDER_HEARING_ROOM_ARCHETYPE: GeometryArchetype = {
  archetypeId: "PLACEHOLDER_HEARING_ROOM_ARCHETYPE",
  label: "Generic public hearing room proportions",
  contributingRoomIds: [
    "placeholder-hearing-room-a",
    "placeholder-hearing-room-b",
    "placeholder-hearing-room-c",
  ],
  proportions: [
    {
      proportionId: "dais-to-room-width",
      relationship: "dais-width / room-width",
      ratio: 0.54,
      observedAcrossRooms: 1,
      note: "Only one contributing room publishes both terms; the ratio is indicative and should not be treated as a mean.",
    },
  ],
  note: PLACEHOLDER_NOTE,
};
