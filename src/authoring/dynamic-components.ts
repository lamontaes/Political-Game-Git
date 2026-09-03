/**
 * WHAT A DYNAMIC SURFACE IS ALLOWED TO SHOW.
 *
 * `dynamic-surfaces.ts` draws the line between decor and information. This
 * module is the next question down: given that a slot carries information, what
 * KIND of thing can actually be drawn in it, and what does it draw when the
 * simulation has nothing?
 *
 * The twelve component families below are the vocabulary of government data
 * presentation — a trend line, a roll call, a district map, a briefing card.
 * Each names the surface kinds it can be drawn on and the honest empty state it
 * falls back to. Neither is decoration:
 *
 * - A roll-call grid on a desk blotter and a budget stack on a podium placard
 *   are both nonsense, and a slot that accepts anything will eventually be
 *   asked to draw one.
 * - Every family has an empty state that says nothing rather than a plausible
 *   nothing. `NO FORMAL DOCKET POSTED FOR THIS DATE` is honest; a docket with
 *   invented items is a lie the art will keep telling forever.
 *
 * And the whole vocabulary is gated on legibility. A surface too small to read
 * cannot host any of these, however blank and inviting it looks in the plate.
 * That gate is `slotIsPromotable`, and it is the reason a room full of empty
 * picture frames does not become a room full of dashboards.
 *
 * Nothing here renders. It is the contract a renderer and a scene author have
 * to agree on before either is written.
 */

import type { SceneSurfaceSlot } from "../environment/environment-scene-spec";
import type { PercentRect } from "../environment/environment-scene-spec";
import {
  isSemanticContentClass,
  type BakedDecorClass,
  type SemanticContentClass,
} from "./dynamic-surfaces";

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/**
 * The physical affordances a plate can offer. A slot's `kind` is one of these.
 *
 * These describe the OBJECT, not its content: `monitor-display` is a screen,
 * whether it shows an election board or a spreadsheet. Content is decided at
 * runtime from canonical state; the object is decided when the room is painted.
 */
export type DynamicSurfaceKind =
  | "monitor-display"
  | "desk-document"
  | "district-map"
  | "podium-placard"
  | "podium-speech-notes"
  | "bulletin-board-slot"
  | "roll-call-scoreboard"
  | "agenda-board"
  | "large-framed-chart"
  | "title-banner-safe"
  | "official-portrait-slot"
  | "flag-standard"
  | "court-seal-placard"
  | "office-nameplate"
  | "window-view";

export const DYNAMIC_SURFACE_KINDS: readonly DynamicSurfaceKind[] = [
  "monitor-display",
  "desk-document",
  "district-map",
  "podium-placard",
  "podium-speech-notes",
  "bulletin-board-slot",
  "roll-call-scoreboard",
  "agenda-board",
  "large-framed-chart",
  "title-banner-safe",
  "official-portrait-slot",
  "flag-standard",
  "court-seal-placard",
  "office-nameplate",
  "window-view",
];

export function isDynamicSurfaceKind(
  value: string,
): value is DynamicSurfaceKind {
  return (DYNAMIC_SURFACE_KINDS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// The legibility gate
// ---------------------------------------------------------------------------

/**
 * The smallest surface that may carry information, as a share of plate height.
 *
 * Five percent of a 1080-line viewport is 54 lines: about enough for a chart
 * with two labelled axes, or three rows of a docket. Below it a data
 * visualisation is a smudge that asserts something nobody can read, which is
 * strictly worse than a painted rectangle.
 *
 * The generative failure this guards against is specific and common: models
 * paint two to five tiny frames on every shelf and sideboard, each blank and
 * each looking like an invitation. Promoting them yields a room of illegible
 * dashboards. They stay decor.
 */
export const MINIMUM_LEGIBLE_HEIGHT_PERCENT = 5;

/** The same threshold in pixels, at the viewport it was judged against. */
export const LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT = 1080;
export const MINIMUM_LEGIBLE_HEIGHT_PX =
  (MINIMUM_LEGIBLE_HEIGHT_PERCENT / 100) * LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT;

/**
 * The smallest surface a runtime CONTENT COMPONENT may be drawn into.
 *
 * Some slots carry information without carrying a component: a nameplate is a
 * line of text, a flag is a known image. Those have their own, lower bar. This
 * is the bar for anything with axes, rows or a legend.
 */
export const COMPONENT_MINIMUM_WIDTH_PERCENT = 5;

/**
 * Surfaces seen nearly flat, whose screen height is compressed by perspective.
 *
 * A page on a desk is a large physical object presenting a short rectangle to
 * the camera. Measuring it against the same unforeshortened height floor as a
 * wall-mounted screen would refuse every desk document in the library, which is
 * the wrong answer: the renderer draws into these with the plate's own skew, so
 * a reader sees a page, not a 38-pixel strip.
 *
 * The width floor still applies. Foreshortening compresses height, not width.
 */
export const FORESHORTENED_SURFACE_KINDS: readonly DynamicSurfaceKind[] = [
  "desk-document",
  "podium-speech-notes",
];

/** The height floor for a surface lying nearly flat to the camera. */
export const FORESHORTENED_MINIMUM_HEIGHT_PERCENT = 3;

/** Surface kinds that carry a known image or one line of text, not a component. */
export const NON_COMPONENT_SURFACE_KINDS: readonly DynamicSurfaceKind[] = [
  "flag-standard",
  "court-seal-placard",
  "official-portrait-slot",
  "office-nameplate",
  "window-view",
];

export interface PromotionVerdict {
  readonly promotable: boolean;
  /** Empty when promotable; otherwise every reason it is not. */
  readonly reasons: readonly string[];
}

/**
 * Whether a rectangle on a plate is big enough to be told something true.
 *
 * Height is the binding constraint because text and chart rows stack
 * vertically; a wide, short strip is a banner, not a dashboard, and the
 * component families that accept one say so.
 */
export function slotIsPromotable(
  rect: PercentRect,
  kind: DynamicSurfaceKind,
): PromotionVerdict {
  const reasons: string[] = [];
  const heightFloor = FORESHORTENED_SURFACE_KINDS.includes(kind)
    ? FORESHORTENED_MINIMUM_HEIGHT_PERCENT
    : MINIMUM_LEGIBLE_HEIGHT_PERCENT;
  if (rect.height_percent < heightFloor) {
    reasons.push(
      `${rect.height_percent}% of plate height is below the ${heightFloor}% legibility threshold (about ${Math.round((heightFloor / 100) * LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT)} lines at ${LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT}p).`,
    );
  }
  if (
    !NON_COMPONENT_SURFACE_KINDS.includes(kind) &&
    rect.width_percent < COMPONENT_MINIMUM_WIDTH_PERCENT
  ) {
    reasons.push(
      `${rect.width_percent}% of plate width is too narrow for a data component; ${COMPONENT_MINIMUM_WIDTH_PERCENT}% is the floor.`,
    );
  }
  return { promotable: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// The component families
// ---------------------------------------------------------------------------

export type DynamicComponentFamilyId =
  | "LINE_SERIES"
  | "BAR_COMPARE"
  | "STACKED_BUDGET"
  | "CHOROPLETH_MAP"
  | "DISTRICT_MAP"
  | "STORM_TRACK"
  | "KPI_CARD"
  | "ROLL_CALL_GRID"
  | "AGENDA_LIST"
  | "TIMELINE"
  | "RESULT_BOARD"
  | "BRIEFING_CARD";

export interface DynamicComponentFamily {
  readonly id: DynamicComponentFamilyId;
  /** Developer-facing description of what it shows. Never player copy. */
  readonly purpose: string;
  /** Surfaces it can honestly be drawn on. */
  readonly surfaceKinds: readonly DynamicSurfaceKind[];
  /** Semantic classes it can express, from the dynamic-surface vocabulary. */
  readonly expresses: readonly SemanticContentClass[];
  /**
   * What it draws when canonical state has nothing.
   *
   * Every one of these says the absence out loud. None invents a plausible
   * value, and none is silently blank in a way a reader could mistake for data.
   */
  readonly emptyState: string;
  /** Decor to fall back to when even the empty state would be noise. */
  readonly emptyStateDecor: BakedDecorClass;
  /** Inferences the family must never make, in the author's words. */
  readonly prohibitedInferences: readonly string[];
}

export const DYNAMIC_COMPONENT_FAMILIES: readonly DynamicComponentFamily[] = [
  {
    id: "LINE_SERIES",
    purpose:
      "A continuous trend over time: unemployment, labour-force participation, general-fund revenue, case counts.",
    surfaceKinds: ["monitor-display", "large-framed-chart"],
    expresses: ["briefing-slide", "headline"],
    emptyState: "Axes and a zero line, labelled as not yet published.",
    emptyStateDecor: "clock-face-block",
    prohibitedInferences: [
      "Never join points across an interval nobody measured; a gap stays a gap.",
      "Never smooth a seasonal cycle into a straight line without saying it is adjusted.",
    ],
  },
  {
    id: "BAR_COMPARE",
    purpose:
      "Discrete categories side by side: peer county rates, department allocations, district turnout.",
    surfaceKinds: ["monitor-display", "desk-document", "large-framed-chart"],
    expresses: ["briefing-slide", "vote-tally"],
    emptyState: "An empty grid frame, labelled as returning no comparison.",
    emptyStateDecor: "paper-shapes",
    prohibitedInferences: [
      "Never rank categories the source did not rank.",
      "Never draw a bar for a suppressed or unreported value.",
    ],
  },
  {
    id: "STACKED_BUDGET",
    purpose:
      "Revenue by source and expenditure by function, for a municipal, county or state balance sheet.",
    surfaceKinds: ["monitor-display", "desk-document", "large-framed-chart"],
    expresses: ["briefing-slide", "document-body"],
    emptyState: "A blank ledger, headed as pending adoption.",
    emptyStateDecor: "paper-shapes",
    prohibitedInferences: [
      "Never balance a budget the record does not balance.",
      "Never present a proposed figure as an adopted one.",
    ],
  },
  {
    id: "CHOROPLETH_MAP",
    purpose:
      "Statistical variation across geography: rates by county, turnout by precinct.",
    surfaceKinds: ["district-map", "monitor-display", "large-framed-chart"],
    expresses: ["map-label", "election-result"],
    emptyState:
      "Boundaries and terrain with no fill, labelled as awaiting release.",
    emptyStateDecor: "wall-artwork",
    prohibitedInferences: [
      "Never shade a unit whose value is missing; leave it unfilled and say so.",
      "Never choose a colour break that makes an unremarkable spread look extreme.",
    ],
  },
  {
    id: "DISTRICT_MAP",
    purpose:
      "Jurisdictional territory: district boundaries, municipal wards, who represents what.",
    surfaceKinds: ["district-map", "desk-document", "monitor-display"],
    expresses: ["map-label", "jurisdiction-name", "jurisdiction-seal"],
    emptyState:
      "A clean street or topographic grid with the jurisdiction named and no boundaries drawn.",
    emptyStateDecor: "wall-artwork",
    prohibitedInferences: [
      "Never draw a boundary the canonical geography does not carry.",
      "Never label a district with an officeholder the world has not seated.",
    ],
  },
  {
    id: "STORM_TRACK",
    purpose:
      "Severe weather tracks, evacuation corridors and flood stages during an actual incident.",
    surfaceKinds: ["monitor-display", "large-framed-chart"],
    expresses: ["headline", "map-label"],
    emptyState: "A regional radar plate reporting no active alerts.",
    emptyStateDecor: "window-view",
    prohibitedInferences: [
      "Never draw a forecast cone for an event that has not been declared.",
      "Never imply an evacuation order the world has not issued.",
    ],
  },
  {
    id: "KPI_CARD",
    purpose:
      "One headline indicator: current rate, fund balance, active declarations, registered voters.",
    surfaceKinds: [
      "monitor-display",
      "podium-placard",
      "bulletin-board-slot",
      "title-banner-safe",
    ],
    expresses: [
      "headline",
      "vote-tally",
      "jurisdiction-name",
      "candidate-name",
      "campaign-name",
    ],
    emptyState:
      "The card outline with the metric named and marked unavailable.",
    emptyStateDecor: "paper-shapes",
    prohibitedInferences: [
      "Never carry a stale figure forward as current.",
      "Never round a suppressed value into existence.",
    ],
  },
  {
    id: "ROLL_CALL_GRID",
    purpose:
      "A chamber's vote, member by member, with the denominator and the threshold it was taken against.",
    surfaceKinds: ["roll-call-scoreboard", "monitor-display", "agenda-board"],
    expresses: ["vote-tally", "bill-number", "bill-title"],
    emptyState: "A quorum-call board reporting no question pending.",
    emptyStateDecor: "calendar-grid-block",
    prohibitedInferences: [
      "Never infer a member's position from their party.",
      "Never fill an absence as a vote in either direction.",
    ],
  },
  {
    id: "AGENDA_LIST",
    purpose:
      "Calendars and orders of business: committee dockets, council agendas, scheduled testimony.",
    surfaceKinds: [
      "agenda-board",
      "bulletin-board-slot",
      "desk-document",
      "podium-speech-notes",
      "monitor-display",
    ],
    expresses: ["agenda", "bill-number", "bill-title", "calendar-date"],
    emptyState: "An official header reporting no docket posted for the date.",
    emptyStateDecor: "paper-shapes",
    prohibitedInferences: [
      "Never invent an item to fill a short agenda.",
      "Never imply an order of business the chamber has not set.",
    ],
  },
  {
    id: "TIMELINE",
    purpose:
      "Chronological milestones: a bill's progression, a campaign calendar, a recovery phase.",
    surfaceKinds: ["monitor-display", "desk-document", "large-framed-chart"],
    expresses: ["calendar-date", "bill-title", "bill-number"],
    emptyState: "A dormant spine reporting nothing scheduled.",
    emptyStateDecor: "calendar-grid-block",
    prohibitedInferences: [
      "Never project a future step as though it had happened.",
      "Never date an event the record leaves undated.",
    ],
  },
  {
    id: "RESULT_BOARD",
    purpose:
      "Election results: contests, standings, share of the vote, share of precincts reporting.",
    surfaceKinds: [
      "monitor-display",
      "bulletin-board-slot",
      "title-banner-safe",
    ],
    expresses: ["election-result", "candidate-name", "vote-tally"],
    emptyState:
      "A pre-election board naming the contest and when the first results are expected.",
    emptyStateDecor: "clock-face-block",
    prohibitedInferences: [
      "Never call a race the canonical result has not called.",
      "Never show a total without the share of precincts behind it.",
    ],
  },
  {
    id: "BRIEFING_CARD",
    purpose:
      "A decision memo, situation summary or testimony brief on a desk or a lectern.",
    surfaceKinds: ["desk-document", "podium-speech-notes", "monitor-display"],
    expresses: ["document-body", "briefing-slide", "bill-title"],
    emptyState:
      "Official letterhead with ruled lines and no memorandum on file.",
    emptyStateDecor: "paper-shapes",
    prohibitedInferences: [
      "Never attribute a recommendation to an official who did not make one.",
      "Never present a draft as signed.",
    ],
  },
];

const FAMILIES_BY_ID = new Map(
  DYNAMIC_COMPONENT_FAMILIES.map((family) => [family.id, family]),
);

export function dynamicComponentFamily(
  id: string,
): DynamicComponentFamily | undefined {
  return FAMILIES_BY_ID.get(id as DynamicComponentFamilyId);
}

/** Families that can honestly be drawn on a given surface kind. */
export function familiesForSurfaceKind(
  kind: DynamicSurfaceKind,
): readonly DynamicComponentFamily[] {
  return DYNAMIC_COMPONENT_FAMILIES.filter((family) =>
    family.surfaceKinds.includes(kind),
  );
}

// ---------------------------------------------------------------------------
// Binding a slot to the components it may host
// ---------------------------------------------------------------------------

/**
 * What a scene author says about one slot's runtime content.
 *
 * It annotates a `SceneSurfaceSlot`; it does not replace one. The slot says
 * where the surface is and what classes of information may appear there; this
 * says which component families may draw them and what happens when none can.
 */
/**
 * Content a KNOWN IMAGE answers, not a component.
 *
 * A jurisdiction's seal and a sitting officeholder's portrait are looked up in
 * the civic symbol library and painted; there is no chart to draw and no data
 * to plot. A slot that allows one of these and binds no component family for it
 * is correctly authored, so the "nothing can draw this" check skips them.
 */
export const IMAGE_CONTENT_CLASSES: readonly SemanticContentClass[] = [
  "jurisdiction-seal",
  "officeholder-portrait",
];

export interface SlotComponentBinding {
  readonly slotId: string;
  readonly surfaceKind: DynamicSurfaceKind;
  /** Empty is legitimate for a surface that carries an image, not a component. */
  readonly componentFamilies: readonly DynamicComponentFamilyId[];
  /**
   * What the surface shows when no component has anything. It must be decor:
   * a dark screen, a clean blotter, a plain placard.
   */
  readonly fallbackDecor: BakedDecorClass;
  readonly note?: string;
}

export type ComponentBindingFindingCode =
  | "unknown-surface-kind"
  | "unknown-component-family"
  | "family-cannot-draw-on-surface"
  | "slot-not-in-spec"
  | "slot-kind-disagrees-with-binding"
  | "slot-below-legibility-threshold"
  | "component-on-image-only-surface"
  | "content-class-no-family-expresses"
  | "binding-without-families";

export interface ComponentBindingFinding {
  readonly code: ComponentBindingFindingCode;
  readonly severity: "error" | "warning";
  readonly slotId: string;
  readonly message: string;
}

export interface ComponentBindingValidation {
  readonly valid: boolean;
  readonly findings: readonly ComponentBindingFinding[];
}

function bindingFinding(
  code: ComponentBindingFindingCode,
  severity: "error" | "warning",
  slotId: string,
  message: string,
): ComponentBindingFinding {
  return { code, severity, slotId, message };
}

/**
 * Checks that every bound slot can actually host what it claims.
 *
 * The check that matters most is the legibility one, because it is the check
 * that cannot be argued around by an author who badly wants a dashboard on a
 * bookshelf. A slot below the threshold is an error regardless of how good the
 * component would be.
 */
export function validateSlotComponentBindings(
  bindings: readonly SlotComponentBinding[],
  slots: readonly SceneSurfaceSlot[],
): ComponentBindingValidation {
  const findings: ComponentBindingFinding[] = [];
  const slotsById = new Map(slots.map((slot) => [slot.slot_id, slot]));

  for (const binding of bindings) {
    const slot = slotsById.get(binding.slotId);
    if (!slot) {
      findings.push(
        bindingFinding(
          "slot-not-in-spec",
          "error",
          binding.slotId,
          "The scene spec declares no surface slot with this id.",
        ),
      );
      continue;
    }
    if (!isDynamicSurfaceKind(binding.surfaceKind)) {
      findings.push(
        bindingFinding(
          "unknown-surface-kind",
          "error",
          binding.slotId,
          `Surface kind '${binding.surfaceKind}' is not one of ${DYNAMIC_SURFACE_KINDS.join(", ")}.`,
        ),
      );
      continue;
    }
    if (slot.kind !== binding.surfaceKind) {
      findings.push(
        bindingFinding(
          "slot-kind-disagrees-with-binding",
          "error",
          binding.slotId,
          `The spec calls this slot '${slot.kind}' and the binding calls it '${binding.surfaceKind}'.`,
        ),
      );
    }

    const imageOnly = NON_COMPONENT_SURFACE_KINDS.includes(binding.surfaceKind);
    if (imageOnly && binding.componentFamilies.length > 0) {
      findings.push(
        bindingFinding(
          "component-on-image-only-surface",
          "error",
          binding.slotId,
          `A '${binding.surfaceKind}' carries a known image or one line of text, not a data component.`,
        ),
      );
    }
    if (!imageOnly && binding.componentFamilies.length === 0) {
      findings.push(
        bindingFinding(
          "binding-without-families",
          "warning",
          binding.slotId,
          "A component surface with no bound families can only ever draw its fallback. Say so in a note, or drop the binding.",
        ),
      );
    }

    if (binding.componentFamilies.length > 0) {
      const verdict = slotIsPromotable(slot.rect_percent, binding.surfaceKind);
      if (!verdict.promotable) {
        for (const reason of verdict.reasons) {
          findings.push(
            bindingFinding(
              "slot-below-legibility-threshold",
              "error",
              binding.slotId,
              `${reason} It stays ambient decor.`,
            ),
          );
        }
      }
    }

    const bound: DynamicComponentFamily[] = [];
    for (const familyId of binding.componentFamilies) {
      const family = FAMILIES_BY_ID.get(familyId);
      if (!family) {
        findings.push(
          bindingFinding(
            "unknown-component-family",
            "error",
            binding.slotId,
            `Component family '${familyId}' is not one of the twelve.`,
          ),
        );
        continue;
      }
      bound.push(family);
      if (!family.surfaceKinds.includes(binding.surfaceKind)) {
        findings.push(
          bindingFinding(
            "family-cannot-draw-on-surface",
            "error",
            binding.slotId,
            `${family.id} cannot be drawn on a '${binding.surfaceKind}'; it draws on ${family.surfaceKinds.join(", ")}.`,
          ),
        );
      }
    }

    // Every semantic class the slot advertises needs somebody able to draw it,
    // otherwise the slot is promising content that will never arrive.
    const expressible = new Set(bound.flatMap((family) => family.expresses));
    for (const declared of slot.allowed_content_classes) {
      if (!isSemanticContentClass(declared)) continue;
      if (imageOnly) continue;
      if (IMAGE_CONTENT_CLASSES.includes(declared)) continue;
      if (!expressible.has(declared)) {
        findings.push(
          bindingFinding(
            "content-class-no-family-expresses",
            "warning",
            binding.slotId,
            `The slot allows '${declared}' but no bound component family expresses it, so that content could never appear.`,
          ),
        );
      }
    }
  }

  return {
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}
