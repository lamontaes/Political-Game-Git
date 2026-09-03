/**
 * PRODUCTION CARGO — which surfaces in the approved library the simulation
 * owns, which stay painted, and what may be drawn on the ones it owns.
 *
 * Thirteen visible frames and screens were inspected across the six rooms. Four
 * became runtime surfaces. Nine stayed decor, and the reason is always the same
 * one: they are too small to be told something true. A 43-by-61 pixel frame on a
 * bookshelf at 1080p can hold a smudge of colour or an illegible face, and the
 * second of those is worse than the first because it asserts a person nobody
 * chose.
 *
 * So the ambient declarations below are not filler. Each one is a decision to
 * REFUSE a surface that a generative model made look available, recorded so
 * that a later pass cannot quietly promote it. `validateDynamicSurfaceAuthoring`
 * plus `slotIsPromotable` make the refusal enforceable rather than
 * aspirational.
 *
 * The four promotions are the surfaces where a fact about the world genuinely
 * belongs, and where there is room to read it:
 *
 * - Three televisions, one per apartment. A television that is off is a
 *   television; one with a permanent painted news broadcast is one evening.
 * - A wall map in the Lexington staff office. It is currently Lexington's own
 *   street grid, which is exactly why it has to be replaceable — the plate
 *   cannot serve a second city otherwise.
 * - A podium placard in the meeting hall, and a desk dossier, a focal frame and
 *   a flag standard in the executive office.
 *
 * Two windows are also declared, and they are the one case where a surface is
 * dynamic without carrying information: time of day and weather are properties
 * of the world, not statements about a person, so a window slot has no
 * semantic content classes and no component families at all.
 */

import type { SceneDynamicSurfaceAuthoring } from "../dynamic-surfaces";
import type { SlotComponentBinding } from "../dynamic-components";

// ---------------------------------------------------------------------------
// Which surfaces the simulation owns, and which stay painted
// ---------------------------------------------------------------------------

export const CIVIC_MEETING_HALL_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "civic-community-meeting-hall",
  semanticSurfaces: [
    {
      slotId: "podium-front-placard",
      contentClasses: ["jurisdiction-seal", "candidate-name", "campaign-name"],
      emptyStateDecor: "furniture-detail",
      note: "The single most jurisdiction-specific object in the composition, and the largest flat face in it. Painting anything here would fix the hall to one meeting.",
    },
    {
      slotId: "podium-speech-notes",
      contentClasses: ["briefing-slide", "document-body", "agenda"],
      emptyStateDecor: "paper-shapes",
      note: "Paper on a lectern. The fallback is ruled lines with no words, which reads as notes without claiming to be any.",
    },
    {
      slotId: "hall-title-banner-area",
      contentClasses: ["headline", "jurisdiction-name"],
      emptyStateDecor: "wall-artwork",
      note: "Left-hand title-safe wall. Kept clear for the shell rather than painted with an event name.",
    },
  ],
  bakedDecor: [
    {
      decorId: "hall-audience-sprites",
      decorClass: "furniture-detail",
      bakedText: "none",
      note: "The seated audience is painted into the plate. Only the podium hero slot and the right foreground chair accept modular people; the rest of the hall is scenery.",
    },
    {
      decorId: "hall-wall-fixtures",
      decorClass: "lighting-fixture",
      bakedText: "none",
    },
  ],
  bakedTextReview: "reviewed",
};

export const APARTMENT_STARTER_01_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "apartment-starter-01",
  semanticSurfaces: [
    {
      slotId: "television-screen-slot",
      contentClasses: ["headline", "election-result", "candidate-name"],
      emptyStateDecor: "furniture-detail",
      note: "7% by 17.5% of the plate: narrow but tall enough to read a result board. Its fallback is a dark screen, which is what a television looks like when nobody is watching it.",
    },
  ],
  bakedDecor: [
    {
      decorId: "corner-shelf-frame",
      decorClass: "wall-artwork",
      regionPercent: {
        x_percent: 61.5,
        y_percent: 25,
        width_percent: 4,
        height_percent: 8,
      },
      bakedText: "none",
      note: "A stylised geometric print in a shelf grouping. Non-semantic, and at 4% by 8% far too small to carry anything else.",
    },
    {
      decorId: "wall-edge-frame-right",
      decorClass: "wall-artwork",
      regionPercent: {
        x_percent: 96,
        y_percent: 18.5,
        width_percent: 4,
        height_percent: 20,
      },
      bakedText: "none",
      note: "Cut by the plate boundary. Even at a usable size it could not carry content, because part of it is not in the picture.",
    },
  ],
  bakedTextReview: "reviewed",
};

export const APARTMENT_ORDINARY_02_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "apartment-ordinary-02",
  semanticSurfaces: [
    {
      slotId: "television-screen-slot",
      contentClasses: ["headline", "election-result", "briefing-slide"],
      emptyStateDecor: "furniture-detail",
    },
  ],
  bakedDecor: [
    {
      decorId: "frame-wall-autumn-landscape",
      decorClass: "wall-artwork",
      regionPercent: {
        x_percent: 12.5,
        y_percent: 23.5,
        width_percent: 9.3,
        height_percent: 17.5,
      },
      bakedText: "none",
      note: "A finished painting of an autumn path. Large enough to promote and deliberately not promoted: it is good domestic decor, neutral across every player background, and there is nothing canonical it should become.",
    },
    {
      decorId: "table-side-frame",
      decorClass: "neutral-photograph",
      regionPercent: {
        x_percent: 79.5,
        y_percent: 59,
        width_percent: 1.5,
        height_percent: 3,
      },
      bakedText: "none",
      note: "About 16 by 23 pixels at 1080p. Small enough that a face in it would be four pixels wide.",
    },
    {
      decorId: "window-view-backdrop",
      decorClass: "window-view",
      bakedText: "none",
      note: "The window itself is a declared slot; the brick and sky behind it are the painted fallback.",
    },
  ],
  bakedTextReview: "reviewed",
};

export const APARTMENT_SETTLED_03_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "apartment-settled-03",
  semanticSurfaces: [
    {
      slotId: "television-screen-slot",
      contentClasses: [
        "headline",
        "election-result",
        "briefing-slide",
        "candidate-name",
      ],
      emptyStateDecor: "furniture-detail",
      note: "The largest of the three televisions, and the one an election-night scene would use.",
    },
  ],
  bakedDecor: [
    {
      decorId: "frame-left-wall-art",
      decorClass: "wall-artwork",
      regionPercent: {
        x_percent: 5.2,
        y_percent: 13.5,
        width_percent: 11.3,
        height_percent: 23,
      },
      bakedText: "none",
      note: "Large enough by area, and refused anyway: it is angled on a side wall, so anything projected into it would need a perspective skew the pipeline cannot verify.",
    },
    {
      decorId: "bookcase-frame-01",
      decorClass: "neutral-photograph",
      regionPercent: {
        x_percent: 5.5,
        y_percent: 41,
        width_percent: 4,
        height_percent: 8,
      },
      bakedText: "none",
      note: "About 43 by 61 pixels at 1080p.",
    },
    {
      decorId: "bookcase-frame-02",
      decorClass: "neutral-photograph",
      regionPercent: {
        x_percent: 8.5,
        y_percent: 44.5,
        width_percent: 3.5,
        height_percent: 4.5,
      },
      bakedText: "none",
    },
    {
      decorId: "bookcase-frame-03",
      decorClass: "neutral-photograph",
      regionPercent: {
        x_percent: 13.5,
        y_percent: 43,
        width_percent: 3,
        height_percent: 4.5,
      },
      bakedText: "none",
    },
    {
      decorId: "bookcase-frame-04",
      decorClass: "neutral-photograph",
      regionPercent: {
        x_percent: 16,
        y_percent: 41,
        width_percent: 3.5,
        height_percent: 6.5,
      },
      bakedText: "none",
    },
    {
      decorId: "coffee-table-clutter",
      decorClass: "paper-shapes",
      bakedText: "none",
      note: "A cup and a magazine stack. Shapes of paper, not documents.",
    },
    {
      decorId: "bookcase-spines",
      decorClass: "books",
      bakedText: "shapes-only",
      note: "Book spines read as text-shaped texture at the target viewport and do not resolve into words. That is the honest state, not `none`.",
    },
  ],
  bakedTextReview: "reviewed",
};

export const EXECUTIVE_PRIVATE_OFFICE_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "executive-private-office",
  semanticSurfaces: [
    {
      slotId: "desk-active-dossier",
      contentClasses: ["document-body", "bill-title", "briefing-slide"],
      emptyStateDecor: "paper-shapes",
      note: "The desk's focal object. Its fallback is a closed binder, which asserts nothing about what is inside it.",
    },
    {
      slotId: "executive-center-frame",
      contentClasses: ["officeholder-portrait", "jurisdiction-seal"],
      emptyStateDecor: "wall-artwork",
      note: "Dual-mode. The plate already carries a dignified river landscape, and that is the default; the slot exists so a jurisdiction that seats an executive can hang their portrait or seal instead. Neither is invented — an empty office keeps the landscape.",
    },
    {
      slotId: "jurisdiction-state-flag",
      contentClasses: ["jurisdiction-seal"],
      emptyStateDecor: "textiles",
      note: "A ceremonial indoor standard. Its content is a civic symbol identity, never a data component, and never an AI-generated flag.",
    },
  ],
  bakedDecor: [
    {
      decorId: "door-side-watercolor",
      decorClass: "wall-artwork",
      regionPercent: {
        x_percent: 88.1,
        y_percent: 22.5,
        width_percent: 2.4,
        height_percent: 13.3,
      },
      bakedText: "none",
      note: "A narrow vertical strip beside the door. 2.4% of plate width is under the component floor twice over.",
    },
    {
      decorId: "left-window-capitol-view",
      decorClass: "window-view",
      regionPercent: {
        x_percent: 14,
        y_percent: 7,
        width_percent: 12,
        height_percent: 40,
      },
      bakedText: "none",
      note: "Baked, and a declared mismatch. The dome in this window is a real capitol; the family is jurisdiction-scoped because of it, and it is masked or accepted per binding rather than silently reused.",
    },
    {
      decorId: "executive-bookshelves",
      decorClass: "books",
      bakedText: "shapes-only",
    },
  ],
  bakedTextReview: "reviewed",
};

/**
 * The Lexington staff office, whose plate IS in the repository.
 *
 * It is the only room here whose surfaces can be checked against real pixels
 * rather than an inspection note, and the only one with a mask raster already
 * derived. Its wall map is the library's clearest promotion: the plate is
 * painted with one city's street grid, so either the map is replaceable or the
 * room is a hero asset that has been passed off as a family.
 */
export const COUNCIL_STAFF_OFFICE_SURFACES: SceneDynamicSurfaceAuthoring = {
  sceneId: "office-council-staff-fixture",
  semanticSurfaces: [
    {
      slotId: "desk-working-document",
      contentClasses: ["document-body", "bill-title", "bill-number"],
      emptyStateDecor: "paper-shapes",
    },
    {
      slotId: "wall-district-map-slot",
      contentClasses: ["map-label", "jurisdiction-seal", "jurisdiction-name"],
      emptyStateDecor: "wall-artwork",
      note: "Currently painted as Lexington and Fayette County. Replaceable, or the plate serves exactly one city.",
    },
    {
      slotId: "monitor-primary-widescreen",
      contentClasses: ["document-body", "agenda", "election-result"],
      emptyStateDecor: "furniture-detail",
    },
    {
      slotId: "monitor-secondary-portrait",
      contentClasses: ["document-body", "agenda"],
      emptyStateDecor: "furniture-detail",
    },
  ],
  bakedDecor: [
    {
      decorId: "wall-stacked-cert-upper",
      decorClass: "paper-shapes",
      regionPercent: {
        x_percent: 34.8,
        y_percent: 27.8,
        width_percent: 3.8,
        height_percent: 5.9,
      },
      bakedText: "none",
      note: "About 41 by 45 pixels at 1080p. A credential drawn here would be a smudge asserting a qualification.",
    },
    {
      decorId: "wall-stacked-cert-lower",
      decorClass: "paper-shapes",
      regionPercent: {
        x_percent: 34.8,
        y_percent: 35.1,
        width_percent: 3.8,
        height_percent: 5.9,
      },
      bakedText: "none",
    },
    {
      decorId: "corkboard-pinned-directive",
      decorClass: "paper-shapes",
      regionPercent: {
        x_percent: 89,
        y_percent: 27,
        width_percent: 4.5,
        height_percent: 8,
      },
      bakedText: "none",
      note: "Promoted by the inspection and demoted here. 4.5% of plate width is about 46 pixels at 1080p — tall enough to see, too narrow to read. It stays a pinned rectangle of paper.",
    },
    {
      decorId: "office-plants",
      decorClass: "plants",
      bakedText: "none",
    },
    {
      decorId: "office-shelving",
      decorClass: "shelving",
      bakedText: "shapes-only",
    },
  ],
  bakedTextReview: "reviewed",
};

export const PRODUCTION_DYNAMIC_SURFACE_AUTHORING: readonly SceneDynamicSurfaceAuthoring[] =
  [
    APARTMENT_ORDINARY_02_SURFACES,
    APARTMENT_SETTLED_03_SURFACES,
    APARTMENT_STARTER_01_SURFACES,
    CIVIC_MEETING_HALL_SURFACES,
    COUNCIL_STAFF_OFFICE_SURFACES,
    EXECUTIVE_PRIVATE_OFFICE_SURFACES,
  ];

// ---------------------------------------------------------------------------
// What may actually be drawn on each surface
// ---------------------------------------------------------------------------

/**
 * The component families each promoted surface can host.
 *
 * Read these as constraints, not menus. A television gets a result board and a
 * storm track because those are what a television carries; it does not get a
 * roll-call grid, because a domestic set is not a chamber voting board and
 * drawing one there would be a category error nobody would catch at runtime.
 *
 * The two window slots bind NO families at all. A window shows weather and time
 * of day, which the world owns but which no data component draws.
 */
export const PRODUCTION_SLOT_COMPONENT_BINDINGS: Readonly<
  Record<string, readonly SlotComponentBinding[]>
> = {
  "civic-community-meeting-hall": [
    {
      slotId: "podium-front-placard",
      surfaceKind: "podium-placard",
      componentFamilies: ["KPI_CARD"],
      fallbackDecor: "furniture-detail",
      note: "A placard holds one short line — an office, an event, a name. A chart on a lectern face would be unreadable from any seat in the room it depicts.",
    },
    {
      slotId: "podium-speech-notes",
      surfaceKind: "podium-speech-notes",
      componentFamilies: ["BRIEFING_CARD", "AGENDA_LIST"],
      fallbackDecor: "paper-shapes",
      note: "A printed agenda on a lectern is the same physical thing as a printed agenda in front of a committee member, so the list draws here too. A chart does not: nobody reads axes off a speaking script.",
    },
    {
      slotId: "hall-title-banner-area",
      surfaceKind: "title-banner-safe",
      componentFamilies: ["KPI_CARD", "RESULT_BOARD"],
      fallbackDecor: "wall-artwork",
    },
  ],
  "apartment-starter-01": [
    {
      slotId: "television-screen-slot",
      surfaceKind: "monitor-display",
      componentFamilies: ["RESULT_BOARD", "KPI_CARD"],
      fallbackDecor: "furniture-detail",
      note: "The smallest of the three sets. A trend line with two labelled axes does not fit; a result board and a single indicator do.",
    },
  ],
  "apartment-ordinary-02": [
    {
      slotId: "television-screen-slot",
      surfaceKind: "monitor-display",
      componentFamilies: [
        "RESULT_BOARD",
        "STORM_TRACK",
        "LINE_SERIES",
        "KPI_CARD",
      ],
      fallbackDecor: "furniture-detail",
    },
    {
      slotId: "window-backdrop-ordinary",
      surfaceKind: "window-view",
      componentFamilies: [],
      fallbackDecor: "window-view",
      note: "Time of day and weather only. A window carries no component, which is why it binds none.",
    },
  ],
  "apartment-settled-03": [
    {
      slotId: "television-screen-slot",
      surfaceKind: "monitor-display",
      componentFamilies: [
        "RESULT_BOARD",
        "STORM_TRACK",
        "LINE_SERIES",
        "KPI_CARD",
      ],
      fallbackDecor: "furniture-detail",
    },
    {
      slotId: "window-weather-backdrop",
      surfaceKind: "window-view",
      componentFamilies: [],
      fallbackDecor: "window-view",
      note: "Time of day and weather only.",
    },
  ],
  "office-council-staff-fixture": [
    {
      slotId: "desk-working-document",
      surfaceKind: "desk-document",
      componentFamilies: ["BRIEFING_CARD", "TIMELINE", "STACKED_BUDGET"],
      fallbackDecor: "paper-shapes",
    },
    {
      slotId: "wall-district-map-slot",
      surfaceKind: "district-map",
      componentFamilies: ["DISTRICT_MAP", "CHOROPLETH_MAP"],
      fallbackDecor: "wall-artwork",
    },
    {
      slotId: "monitor-primary-widescreen",
      surfaceKind: "monitor-display",
      componentFamilies: [
        "LINE_SERIES",
        "BAR_COMPARE",
        "STACKED_BUDGET",
        "AGENDA_LIST",
        "RESULT_BOARD",
      ],
      fallbackDecor: "furniture-detail",
      note: "The wide monitor is the only surface in the room big enough for a labelled chart, so it carries the charts. A result board is here because a staffer watches returns on the same screen they work on.",
    },
    {
      slotId: "monitor-secondary-portrait",
      surfaceKind: "monitor-display",
      componentFamilies: [
        "AGENDA_LIST",
        "TIMELINE",
        "KPI_CARD",
        "BRIEFING_CARD",
      ],
      fallbackDecor: "furniture-detail",
      note: "Portrait orientation: lists, cards and a memo read down the screen. Wide charts do not, so none is bound.",
    },
  ],
  "executive-private-office": [
    {
      slotId: "desk-active-dossier",
      surfaceKind: "desk-document",
      componentFamilies: ["BRIEFING_CARD", "STACKED_BUDGET"],
      fallbackDecor: "paper-shapes",
    },
    {
      slotId: "executive-center-frame",
      surfaceKind: "official-portrait-slot",
      componentFamilies: [],
      fallbackDecor: "wall-artwork",
      note: "A portrait or a seal is a known image, not a component. Binding a chart here would put a dashboard behind the desk of a head of government.",
    },
    {
      slotId: "jurisdiction-state-flag",
      surfaceKind: "flag-standard",
      componentFamilies: [],
      fallbackDecor: "textiles",
      note: "A flag is a civic symbol identity resolved from the jurisdiction. It is never drawn by a component and never generated.",
    },
  ],
};
