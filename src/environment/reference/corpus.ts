import evidence from "./evidence.json";
import { assertReferenceCatalog } from "./catalog";
import type {
  ReferenceCatalog,
  BuildingReference,
  SceneReference,
  VenueEra,
  MeasuredGeometry,
} from "./types";

/** Authored transcription, not a source-substrate acquisition or a World initializer. */
const corpus: ReferenceCatalog = {
  version: "venue-reference-v1",
  coverage: {
    kind: "bounded",
    note: "Ten requested states and six congressional office-building families, transcribed from 43A/18J. Current use coverage is bounded to the researched 2026 era; this is not a national room inventory, individual office assignment, art release, or acquired measured-plan corpus.",
    unencodedResearch: [
      "Remaining 40-state 18J rows and generalized presets (no room-specific evidence class assigned).",
      "Remaining 43A state and municipal tranches, including the separate 45 municipal continuation.",
      "Exact temporary chamber, private-office, suite and hearing-room geometry; source drawing identifiers and reproduction calibration.",
      "Room-by-room photographic extraction, rights clearance, final art and later canonical-history artifact slots.",
      "Federal district offices, unlisted congressional hearing rooms and individual member assignments.",
      "Exact relocation/return dates where research gives only an era or projected reopening; no future reopening assumed.",
    ],
  },
  sources: evidence.sources as ReferenceCatalog["sources"],
  claims: evidence.claims as ReferenceCatalog["claims"],
  campuses: [],
  buildings: [],
  rooms: [],
  geometry: [],
  venues: [],
  eras: [],
  scenes: [],
};
const current = { start: "2026-01-01", end: "2026-12-31" };
const unknownBounds = { start: null, end: null };
const cite = (key: string) => [`claim.backbone.${key}`];
function campus(
  key: string,
  name: string,
  jurisdiction: string,
  claims: string[],
) {
  const id = `campus.${key}`;
  corpus.campuses.push({
    id,
    name,
    jurisdictionId: `jurisdiction.${jurisdiction}`,
    governmentId: `government.${jurisdiction}`,
    claimIds: claims,
  });
  return id;
}
function building(
  key: string,
  name: string,
  jurisdiction: string,
  campusId: string | null,
  claims: string[],
  options: Partial<BuildingReference> = {},
) {
  const id = `building.${key}`;
  corpus.buildings.push({
    id,
    name,
    jurisdictionId: `jurisdiction.${jurisdiction}`,
    governmentId: `government.${jurisdiction}`,
    campusId,
    address: null,
    ownerOperator: null,
    assetFamily: `asset.${key}`,
    baseGeometryFamily: `geometry.${key}`,
    uniquenessClass: "jurisdiction-variant",
    fixedInstitutionalFeatures: [],
    visualAntiAssumptions: [],
    referencePack: "pending",
    extractedAssetStatus: "not-acquired",
    claimIds: claims,
    ...options,
  });
  return id;
}
function venue(
  key: string,
  buildingId: string,
  claims: string[],
  room: {
    name: string;
    number?: string;
    family: string;
    features?: string[];
  } | null = null,
) {
  const id = `venue.${key}`;
  const roomId = room ? `room.${key}` : null;
  if (room && roomId)
    corpus.rooms.push({
      id: roomId,
      buildingId,
      verifiedName: room.name,
      verifiedNumber: room.number ?? null,
      roomFunctionFamily: `room-function.${room.family}`,
      fixedInstitutionalFeatures: room.features ?? [],
      visualAntiAssumptions: [],
      claimIds: claims,
    });
  corpus.venues.push({
    id,
    buildingId,
    roomId,
    walkingTransitionGroup: corpus.buildings.find((b) => b.id === buildingId)!
      .campusId,
    claimIds: claims,
  });
  return id;
}
function era(
  venueId: string,
  claims: string[],
  options: Partial<VenueEra> = {},
) {
  corpus.eras.push({
    id: `era.${venueId.slice(6)}.2026`,
    venueId,
    effective: { ...unknownBounds },
    observedDuring: { ...current },
    currentEraStatus: "current-researched",
    state: "normal",
    availability: "available",
    publicAccessState: "unknown",
    securityState: "unknown",
    note: "2026 research coverage; exact opening and closing dates unestablished. Availability describes researched use, not actor access.",
    claimIds: claims,
    ...options,
  });
}
function scene(
  venueId: string,
  body: string,
  role: string,
  type: string,
  claims: string[],
  options: Partial<SceneReference> = {},
) {
  const v = corpus.venues.find((v) => v.id === venueId)!;
  const b = corpus.buildings.find((b) => b.id === v.buildingId)!;
  corpus.scenes.push({
    id: `scene-reference.${venueId.slice(6)}.${body}.${role}.${type}`,
    venueId,
    jurisdictionId: b.jurisdictionId,
    governmentId: b.governmentId,
    institutionId: `institution.${b.jurisdictionId.slice(13)}.${body}`,
    branch: body === "executive" ? "branch.executive" : "branch.legislative",
    officeRole: `role.${role}`,
    sceneType: `scene.${type}`,
    use: "institutional-default",
    meetingId: null,
    effective: { ...unknownBounds },
    observedDuring: { ...current },
    assignment: v.roomId === null ? "building-family" : "named-room",
    claimIds: claims,
    ...options,
  });
}
function family(
  key: string,
  buildingId: string,
  claims: string[],
  bodies: string[],
  role: string,
  type: string,
  options: Partial<VenueEra> = {},
) {
  const v = venue(key, buildingId, claims);
  era(v, claims, options);
  for (const body of bodies) scene(v, body, role, type, claims);
  return v;
}
function named(
  key: string,
  buildingId: string,
  claims: string[],
  name: string,
  body: string,
  role: string,
  type: string,
  number?: string,
  options: Partial<VenueEra> = {},
) {
  const v = venue(key, buildingId, claims, { name, number, family: type });
  era(v, claims, options);
  scene(v, body, role, type, claims);
  return v;
}
const stateNames: Record<string, string> = {
  ky: "Kentucky",
  va: "Virginia",
  tn: "Tennessee",
  ca: "California",
  mn: "Minnesota",
  tx: "Texas",
  ny: "New York",
  nd: "North Dakota",
  ne: "Nebraska",
  nm: "New Mexico",
};
const campuses: Record<string, string> = {};
const capitols: Record<string, string> = {};
for (const [state, name] of Object.entries(stateNames)) {
  const refs = [...cite(state), ...cite(`${state}.base`)];
  campuses[state] = campus(
    `us.${state}.capitol`,
    `${name} Capitol campus`,
    `us.${state}`,
    refs,
  );
  capitols[state] = building(
    `us.${state}.capitol`,
    state === "nm"
      ? "New Mexico State Capitol (Roundhouse)"
      : `${name} State Capitol`,
    `us.${state}`,
    campuses[state]!,
    refs,
    {
      uniquenessClass: ["ny", "nd", "ne", "nm"].includes(state)
        ? "unique"
        : "jurisdiction-variant",
      referencePack: ["va", "tx", "ny", "nd", "ne", "nm"].includes(state)
        ? "strong-source-family"
        : "pending",
      visualAntiAssumptions: [
        "A Capitol identity does not establish an everyday working office or a current occupant.",
      ],
    },
  );
}
// Physical chamber identities are retained independently of each institution/use era.
for (const state of Object.keys(stateNames).filter((s) => s !== "ne")) {
  for (const body of ["house", "senate"]) {
    const label =
      body === "house"
        ? state === "ca" || state === "ny"
          ? "Assembly Chamber"
          : state === "va"
            ? "House of Delegates Chamber"
            : "House Chamber"
        : "Senate Chamber";
    named(
      `us.${state}.capitol.${body}`,
      capitols[state]!,
      [...cite(state), ...cite(`${state}.base`)],
      label,
      body,
      "member",
      "chamber",
      undefined,
      state === "ky"
        ? {
            state: "construction",
            availability: "closed",
            publicAccessState: "closed",
            effective: { start: "2025-08-20", end: null },
            observedDuring: { start: "2025-08-20", end: "2026-12-31" },
            note: "Closed for multiyear renovation from August 20, 2025. Reopening is not established.",
          }
        : {},
    );
  }
}
// Kentucky: the temporary structure, Annex and off-campus executive building are separate.
const kyAnnex = building(
  "us.ky.annex",
  "Capitol Annex",
  "us.ky",
  campuses.ky!,
  cite("ky"),
  {
    visualAntiAssumptions: [
      "Do not inherit historic chamber dimensions or furnishings.",
    ],
  },
);
const kyTemporary = building(
  "us.ky.temporary-chambers",
  "Temporary legislative structure near the east end of the Capitol Annex",
  "us.ky",
  campuses.ky!,
  cite("ky"),
  { baseGeometryFamily: "geometry.temporary-legislative-hall" },
);
const kyExecutiveCampus = campus(
  "us.ky.high-street",
  "501 High Street executive location",
  "us.ky",
  cite("ky"),
);
const kyExecutive = building(
  "us.ky.high-street",
  "501 High Street",
  "us.ky",
  kyExecutiveCampus,
  cite("ky"),
  {
    address: "501 High Street, 2nd Floor, Frankfort",
    visualAntiAssumptions: [
      "Relocated working office; not the historic Capitol executive suite.",
    ],
  },
);
for (const body of ["house", "senate"]) {
  named(
    `us.ky.temporary.${body}`,
    kyTemporary,
    cite("ky"),
    `Temporary ${body === "house" ? "House" : "Senate"} Chamber`,
    body,
    "member",
    "chamber",
    undefined,
    {
      state: "temporary",
      publicAccessState: "restricted",
      note: "2026 session temporary chamber reference. Public viewing uses designated Annex rooms via livestream; exact sitting dates and room geometry are unestablished.",
    },
  );
  family(
    `us.ky.annex.${body}-office`,
    kyAnnex,
    cite("ky"),
    [body],
    "member",
    "working-office",
  );
}
family(
  "us.ky.annex.committee",
  kyAnnex,
  cite("ky"),
  ["house", "senate"],
  "committee-member",
  "hearing",
);
family(
  "us.ky.annex.public-viewing",
  kyAnnex,
  cite("ky"),
  ["house", "senate"],
  "visitor",
  "livestream-viewing",
  {
    state: "temporary",
    note: "Designated Annex public-viewing rooms; exact room numbers are not supplied in the consumed text.",
  },
);
family(
  "us.ky.governor.working",
  kyExecutive,
  cite("ky"),
  ["executive"],
  "governor",
  "working-office",
  { state: "temporary" },
);
for (const s of corpus.scenes.filter((s) =>
  s.venueId.startsWith("venue.us.ky.capitol."),
)) {
  s.effective = { start: "2025-08-20", end: null };
  s.observedDuring = { start: "2025-08-20", end: "2026-12-31" };
}
// Bounded pre-closure evidence, not an inferred unlimited historic date range.
for (const body of ["house", "senate"]) {
  const v = `venue.us.ky.capitol.${body}`;
  era(v, cite("ky"), {
    id: `era.us.ky.capitol.${body}.pre-closure`,
    state: "normal",
    currentEraStatus: "historical-reference",
    effective: { start: null, end: "2025-08-19" },
    observedDuring: { start: "2025-01-01", end: "2025-08-19" },
    note: "Historic chamber configuration before documented closure; no assumption about reopening.",
  });
  scene(v, body, "member", "chamber", cite("ky"), {
    id: `scene-reference.us.ky.capitol.${body}.pre-closure`,
    effective: { start: null, end: "2025-08-19" },
    observedDuring: { start: "2025-01-01", end: "2025-08-19" },
  });
}
// Virginia's refreshed executive, modern legislative and residence families.
const vaPatrick = building(
  "us.va.patrick-henry",
  "Patrick Henry Building",
  "us.va",
  campuses.va!,
  cite("va"),
  {
    address: "1111 East Broad Street",
    referencePack: "strong-source-family",
    fixedInstitutionalFeatures: [
      "2025–26 refresh: lighter natural palette, sliding privacy doors and upgraded audiovisual systems.",
    ],
    visualAntiAssumptions: [
      "Do not reuse older dark executive interiors for the refreshed 2026 family.",
    ],
  },
);
const vaGAB = building(
  "us.va.general-assembly",
  "General Assembly Building",
  "us.va",
  campuses.va!,
  cite("va"),
  {
    referencePack: "strong-source-family",
    fixedInstitutionalFeatures: [
      "Modern building incorporates the preserved 1912 facade, two-story lobby, atrium and tunnel connections.",
    ],
    visualAntiAssumptions: [
      "Current family opened in 2023; not temporary Pocahontas space.",
    ],
  },
);
const vaMansion = building(
  "us.va.executive-mansion",
  "Executive Mansion",
  "us.va",
  campuses.va!,
  cite("va"),
  { referencePack: "strong-source-family" },
);
family(
  "us.va.patrick-henry.governor",
  vaPatrick,
  cite("va"),
  ["executive"],
  "governor",
  "working-office",
);
family(
  "us.va.patrick-henry.cabinet",
  vaPatrick,
  cite("va"),
  ["executive"],
  "cabinet-member",
  "meeting",
);
family(
  "us.va.gab.office",
  vaGAB,
  cite("va"),
  ["house", "senate"],
  "member",
  "working-office",
);
family(
  "us.va.gab.hearing",
  vaGAB,
  cite("va"),
  ["house", "senate"],
  "committee-member",
  "hearing",
);
family(
  "us.va.mansion.residence",
  vaMansion,
  cite("va"),
  ["executive"],
  "governor",
  "residence",
);
family(
  "us.va.mansion.ceremony",
  vaMansion,
  cite("va"),
  ["executive"],
  "governor",
  "ceremony",
  { state: "ceremonial_only" },
);
named(
  "us.va.capitol.old-governor",
  capitols.va!,
  cite("va"),
  "Old Governor's Office",
  "executive",
  "visitor",
  "historical-visit",
  undefined,
  {
    state: "historic_only",
    note: "Historical office, not the modern daily executive workplace.",
  },
);
// Tennessee: chambers in Capitol; everyday legislative work in Cordell Hull.
const tnHull = building(
  "us.tn.cordell-hull",
  "Cordell Hull Building",
  "us.tn",
  campuses.tn!,
  cite("tn"),
  {
    baseGeometryFamily: "geometry.modern-legislative-office",
    visualAntiAssumptions: [
      "Do not copy historic Capitol chamber finishes into modern offices.",
    ],
  },
);
family(
  "us.tn.cordell-hull.office",
  tnHull,
  cite("tn"),
  ["house", "senate"],
  "member",
  "working-office",
);
named(
  "us.tn.cordell-hull.hearing-ii",
  tnHull,
  cite("tn"),
  "House Hearing Room II",
  "house",
  "committee-member",
  "hearing",
);
family(
  "us.tn.capitol.clerk",
  capitols.tn!,
  cite("tn"),
  ["house"],
  "chief-clerk",
  "working-office",
);
// California: building-family candidacy is not a universal member assignment.
const caSwing = building(
  "us.ca.o-street",
  "1021 O Street — Capitol Annex Swing Space",
  "us.ca",
  campuses.ca!,
  [...cite("ca"), ...cite("ca.base")],
  {
    address: "1021 O Street",
    baseGeometryFamily: "geometry.modern-swing-office",
    visualAntiAssumptions: [
      "Not every member is assigned here; use the actual member or committee assignment.",
    ],
  },
);
named(
  "us.ca.o-street.governor",
  caSwing,
  cite("ca.base"),
  "Governor's office, Suite 9000",
  "executive",
  "governor",
  "working-office",
  "9000",
  { state: "swing_space" },
);
family(
  "us.ca.o-street.member",
  caSwing,
  cite("ca"),
  ["house", "senate"],
  "member",
  "working-office",
  { state: "swing_space" },
);
family(
  "us.ca.o-street.committee",
  caSwing,
  cite("ca"),
  ["house", "senate"],
  "committee-member",
  "working-office",
  { state: "swing_space" },
);
// Minnesota: newer resolved temporary-office correction is used explicitly.
const mnSOB = building(
  "us.mn.state-office",
  "State Office Building",
  "us.mn",
  campuses.mn!,
  cite("mn"),
);
const mnCentennial = building(
  "us.mn.centennial",
  "Centennial Office Building",
  "us.mn",
  campuses.mn!,
  cite("mn"),
  { address: "658 Cedar Street" },
);
const mnSenate = building(
  "us.mn.senate-building",
  "Minnesota Senate Building",
  "us.mn",
  campuses.mn!,
  [...cite("mn"), ...cite("mn.rooms")],
);
family(
  "us.mn.state-office.house",
  mnSOB,
  cite("mn"),
  ["house"],
  "member",
  "working-office",
  {
    state: "construction",
    availability: "closed",
    publicAccessState: "closed",
    note: "Closed for renovation. Expected 2027 return is not a verified reopening date.",
  },
);
family(
  "us.mn.centennial.house",
  mnCentennial,
  cite("mn"),
  ["house"],
  "member",
  "working-office",
  { state: "temporary" },
);
family(
  "us.mn.senate-building.office",
  mnSenate,
  cite("mn"),
  ["senate"],
  "member",
  "working-office",
  { publicAccessState: "screened", securityState: "screening" },
);
family(
  "us.mn.senate-building.hearing",
  mnSenate,
  cite("mn.rooms"),
  ["senate"],
  "committee-member",
  "hearing",
  { publicAccessState: "screened", securityState: "screening" },
);
for (const number of ["309A", "316", "317", "317A", "317B", "318", "B971"]) {
  const type = number === "B971" ? "press-conference" : "meeting";
  named(
    `us.mn.capitol.room-${number.toLowerCase()}`,
    capitols.mn!,
    cite("mn.rooms"),
    number === "318"
      ? "Public Business Center"
      : number === "B971"
        ? "Press conference room"
        : `Room ${number}`,
    "legislature",
    number === "B971" ? "press" : "visitor",
    type,
    number,
    { publicAccessState: "screened", securityState: "screening" },
  );
}
// Texas: named executive functions and separate underground Extension family.
const txExtension = building(
  "us.tx.extension",
  "Capitol Extension",
  "us.tx",
  campuses.tx!,
  cite("tx"),
  {
    baseGeometryFamily: "geometry.underground-modern-extension",
    fixedInstitutionalFeatures: [
      "Modern 1990s underground office, committee and service environment.",
    ],
    visualAntiAssumptions: ["Not a historic Capitol basement texture."],
  },
);
for (const [key, b] of [
  ["capitol", capitols.tx!],
  ["extension", txExtension],
])
  family(
    `us.tx.${key}.member`,
    b!,
    cite("tx"),
    ["house", "senate"],
    "member",
    "working-office",
  );
family(
  "us.tx.extension.hearing",
  txExtension,
  cite("tx"),
  ["house", "senate"],
  "committee-member",
  "hearing",
);
named(
  "us.tx.capitol.reception",
  capitols.tx!,
  [...cite("tx"), ...cite("tx.rooms")],
  "Governor's Public Reception Room",
  "executive",
  "governor",
  "reception",
  "2S.1",
  { state: "ceremonial_only" },
);
named(
  "us.tx.capitol.press",
  capitols.tx!,
  cite("tx.rooms"),
  "Governor's Press Conference space",
  "executive",
  "governor",
  "press-conference",
  "2S.2",
);
named(
  "us.tx.capitol.business",
  capitols.tx!,
  cite("tx.rooms"),
  "Governor's Business Office / Legislative Division",
  "executive",
  "staff",
  "working-office",
  "1S.1",
);
family(
  "us.tx.capitol.governor",
  capitols.tx!,
  cite("tx"),
  ["executive"],
  "governor",
  "working-office",
);
// New York: distinct chamber styles, LOB and separate mansion.
corpus.rooms.find(
  (r) => r.id === "room.us.ny.capitol.house",
)!.fixedInstitutionalFeatures = [
  "Leopold Eidlitz Moorish Gothic chamber family.",
];
corpus.rooms.find(
  (r) => r.id === "room.us.ny.capitol.senate",
)!.fixedInstitutionalFeatures = [
  "H. H. Richardson carved/ornamental chamber family and decorated ceiling.",
];
const nyLOB = building(
  "us.ny.legislative-office",
  "Legislative Office Building",
  "us.ny",
  campuses.ny!,
  cite("ny"),
);
family(
  "us.ny.lob.office",
  nyLOB,
  cite("ny"),
  ["house", "senate"],
  "member",
  "working-office",
);
family(
  "us.ny.capitol.office",
  capitols.ny!,
  cite("ny"),
  ["house"],
  "member",
  "working-office",
);
named(
  "us.ny.capitol.red-room",
  capitols.ny!,
  cite("ny"),
  "Red Room",
  "executive",
  "governor",
  "ceremony",
);
const nyMansionCampus = campus(
  "us.ny.mansion",
  "Executive Mansion location",
  "us.ny",
  cite("ny"),
);
const nyMansion = building(
  "us.ny.executive-mansion",
  "Executive Mansion",
  "us.ny",
  nyMansionCampus,
  cite("ny"),
  { referencePack: "strong-source-family" },
);
family(
  "us.ny.mansion.residence",
  nyMansion,
  cite("ny"),
  ["executive"],
  "governor",
  "residence",
);
// Preserve named North Dakota rooms, never Committee Room A/B substitutions.
corpus.buildings.find((b) => b.id === capitols.nd)!.fixedInstitutionalFeatures =
  ["Art Deco high-rise statehouse."];
corpus.buildings
  .find((b) => b.id === capitols.nd)!
  .claimIds.push(...cite("nd.appearance"));
for (const [key, name] of [
  ["roughrider", "Roughrider"],
  ["peace-garden", "Peace Garden"],
  ["pioneer", "Pioneer"],
  ["harvest", "Harvest"],
  ["red-river", "Red River"],
  ["sakakawea", "Sakakawea"],
  ["fort-lincoln", "Fort Lincoln"],
  ["fort-totten", "Fort Totten"],
  ["fort-union", "Fort Union"],
  ["brynhild-haugland", "Brynhild Haugland"],
  ["prairie", "Prairie"],
])
  named(
    `us.nd.capitol.${key}`,
    capitols.nd!,
    cite("nd"),
    `${name} Room`,
    "legislature",
    "committee-member",
    "hearing",
  );
for (const [body, feature] of [
  ["house", "Moon/stars ceiling and lighting treatment."],
  ["senate", "English-oak and sunset treatment."],
]) {
  const room = corpus.rooms.find((r) => r.id === `room.us.nd.capitol.${body}`)!;
  room.fixedInstitutionalFeatures.push(feature!);
  room.claimIds.push(...cite("nd.appearance"));
}
corpus.rooms.find(
  (r) => r.id === "room.us.tx.capitol.reception",
)!.fixedInstitutionalFeatures = [
  "Restored/original marble-topped table, brass chandelier and S-shaped tête-à-tête sofa.",
];
// Nebraska: do not create a bicameral legislature from 18J's generic column headings.
family(
  "us.ne.capitol.legislature",
  capitols.ne!,
  [...cite("ne"), ...cite("ne.base")],
  ["legislature"],
  "member",
  "chamber",
);
named(
  "us.ne.capitol.governor-hearing",
  capitols.ne!,
  cite("ne"),
  "Governor's Suite Hearing Room",
  "executive",
  "governor",
  "hearing",
);
named(
  "us.ne.capitol.governor-reception",
  capitols.ne!,
  cite("ne"),
  "Governor's Suite Reception Area",
  "executive",
  "governor",
  "reception",
  undefined,
  { state: "ceremonial_only" },
);
// New Mexico numbered-room records are grounded in 2025 schedules, not asserted 2026 assignments.
corpus.buildings.find((b) => b.id === capitols.nm)!.fixedInstitutionalFeatures =
  [
    "Circular/Zia architectural identity, multi-level rotunda/skylight and integrated institutional art program.",
  ];
corpus.buildings
  .find((b) => b.id === capitols.nm)!
  .claimIds.push(...cite("nm.appearance"));
for (const [number, body] of [
  ["307", "house-appropriations-finance"],
  ["317", "house-commerce-economic-development"],
]) {
  const v = named(
    `us.nm.capitol.room-${number}`,
    capitols.nm!,
    cite("nm"),
    `Room ${number}`,
    body!,
    "committee-member",
    "hearing",
    number,
    {
      observedDuring: { start: "2025-03-08", end: "2025-03-08" },
      note: "Exact schedule exemplar date; no claim this committee occupies the room throughout 2026.",
    },
  );
  const s = corpus.scenes.find((s) => s.venueId === v)!;
  s.observedDuring = { start: "2025-03-08", end: "2025-03-08" };
  s.use = "meeting-specific";
  s.meetingId = `meeting.us.nm.${body}.2025-03-08`;
}
// Washington: six physical families; no specific contemporary member suite invented.
const federalCampus = campus(
  "us.congress",
  "United States Capitol congressional campus",
  "us.federal",
  [...cite("cannon"), ...cite("russell")],
);
const federal = [
  [
    "cannon",
    "Cannon House Office Building",
    "house",
    "Beaux-Arts historic office fabric, modernized infrastructure; original single-room dimensions are historical only.",
  ],
  [
    "longworth",
    "Longworth House Office Building",
    "house",
    "Interwar neoclassical suite lineage: greeting/staff room and separate private office.",
  ],
  [
    "rayburn",
    "Rayburn House Office Building",
    "house",
    "Postwar mid-century building with expanded staff, committee and four-chamber suite lineage.",
  ],
  [
    "russell",
    "Russell Senate Office Building",
    "senate",
    "Classical historic fabric, large-window/fireplace-capable rooms; modern suites combine earlier offices.",
  ],
  [
    "dirksen",
    "Dirksen Senate Office Building",
    "senate",
    "Mid-century functional offices; two-story wood-paneled hearing rooms with raised daises and broadcast facilities.",
  ],
  [
    "hart",
    "Hart Senate Office Building",
    "senate",
    "Late-modern duplex suites, movable partitions and skylit central atrium.",
  ],
];
for (const [key, name, body, feature] of federal) {
  const b = building(
    `us.congress.${key}`,
    name!,
    "us.federal",
    federalCampus,
    cite(key!),
    {
      uniquenessClass: "unique",
      referencePack: "strong-source-family",
      fixedInstitutionalFeatures: [feature!],
      visualAntiAssumptions: [
        "Original suite configurations are not exact current room assignments.",
        "No occupant photographs, campaign material, books or awards are inferred.",
      ],
    },
  );
  family(
    `us.congress.${key}.office`,
    b,
    cite(key!),
    [body!],
    "member",
    "working-office",
  );
}
// 18J reported dimensions: transcribed exactly, with their missing primary-sheet evidence.
const chamberDimensions: Record<string, [number[], number[]]> = {
  ky: [
    [76, 58, 34],
    [54, 46, 30],
  ],
  va: [
    [72, 56, 32],
    [52, 44, 28],
  ],
  tn: [
    [70, 55, 35],
    [48, 40, 30],
  ],
  ca: [
    [78, 64, 35],
    [64, 50, 35],
  ],
  mn: [
    [78, 64, 38],
    [62, 52, 34],
  ],
  tx: [
    [88, 68, 40],
    [62, 52, 35],
  ],
  ny: [
    [84, 70, 45],
    [60, 50, 50],
  ],
  nd: [
    [72, 56, 26],
    [52, 44, 24],
  ],
};
function measure(
  subjectId: string,
  dimension: string,
  value: number | [number, number] | null,
  unit: "ft" | "in",
  state: string,
  appliesTo: MeasuredGeometry["appliesTo"] = "room",
) {
  corpus.geometry.push({
    id: `measurement.${subjectId}.${dimension}`,
    subjectId,
    dimension: `dimension.${dimension}`,
    value:
      value === null
        ? {
            state: "unknown",
            reason:
              "Not supplied by the consumed research for this physical room.",
          }
        : {
            state: "reported",
            magnitude: Array.isArray(value)
              ? { kind: "range", min: value[0], max: value[1] }
              : { kind: "scalar", value },
            unit,
            confidence: "exact",
          },
    primaryEvidence: "not-supplied",
    appliesTo,
    claimIds: [`claim.geometry.${state}`],
  });
}
for (const [state, dims] of Object.entries(chamberDimensions))
  for (const [i, body] of ["house", "senate"].entries())
    for (const [j, dimension] of ["length", "width", "height"].entries())
      measure(
        `room.us.${state}.capitol.${body}`,
        dimension,
        dims[i]![j]!,
        "ft",
        state,
      );
for (const [body, diameter] of [
  ["house", 65],
  ["senate", 52],
] as const) {
  measure(`room.us.nm.capitol.${body}`, "diameter", diameter, "ft", "nm");
  measure(`room.us.nm.capitol.${body}`, "height", null, "ft", "nm");
}
// The table's single dais column does not identify an individual chamber's dais.
const dais: Record<string, number | [number, number]> = {
  ky: [28, 30],
  va: 30,
  tn: 30,
  ca: 30,
  mn: 30,
  tx: [32, 34],
  ny: 34,
  nd: 28,
  ne: 28,
  nm: 26,
};
const corridor: Record<string, [number, number]> = {
  ky: [18, 26],
  va: [16, 24],
  tn: [14, 20],
  ca: [18, 26],
  mn: [18, 26],
  tx: [24, 36],
  ny: [18, 30],
  ne: [18, 30],
  nm: [14, 22],
};
for (const state of Object.keys(stateNames)) {
  measure(
    capitols[state]!,
    "dais-height-unassigned",
    dais[state]!,
    "in",
    state,
    "building-context",
  );
  if (corridor[state])
    measure(
      capitols[state]!,
      ["tx", "ne"].includes(state) ? "public-hall-width" : "corridor-width",
      corridor[state]!,
      "ft",
      state,
      "building-context",
    );
}
measure(
  capitols.nd!,
  "memorial-hall-width",
  25,
  "ft",
  "nd",
  "building-context",
);
// Retain Nebraska's conflicting House-column room mapping as unassigned building evidence.
for (const [i, dimension] of ["length", "width", "height"].entries())
  measure(
    capitols.ne!,
    `unassigned-chamber-${dimension}`,
    [68, 54, 32][i]!,
    "ft",
    "ne",
    "building-context",
  );
// A source row for a historic chamber never supplies temporary-room dimensions.
for (const body of ["house", "senate"])
  for (const dimension of ["length", "width", "height"]) {
    const subjectId = `room.us.ky.temporary.${body}`;
    corpus.geometry.push({
      id: `measurement.${subjectId}.${dimension}`,
      subjectId,
      dimension: `dimension.${dimension}`,
      value: {
        state: "unknown",
        reason:
          "18J historic Capitol dimensions do not establish temporary chamber geometry.",
      },
      primaryEvidence: "not-supplied",
      appliesTo: "room",
      claimIds: cite("ky"),
    });
  }
assertReferenceCatalog(corpus);
function freezeReference(value: object): void {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freezeReference(child);
  Object.freeze(value);
}
freezeReference(corpus);
export const sceneReferenceCorpus: ReferenceCatalog = corpus;
