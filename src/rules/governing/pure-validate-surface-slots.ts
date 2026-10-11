// STOPGAP RULES3-GOV-099: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/environment/environment-scene-spec.ts; RULES-3, 2026-10-11.

export const SCENE_SURFACE_KINDS = [
  "monitor-or-screen",
  "television",
  "monitor-or-bulletin-board",
  "roll-call-board",
  "large-wall-map",
  "podium-placard",
  "desk-document",
  "picture-frame",
  "civic-symbol",
  "podium-speech-notes",
  "agenda-board",
  "large-framed-chart",
  "official-portrait-slot",
  "office-nameplate",
  "title-banner-safe",
  "window-view",
] as const;

export type SceneSurfaceKind = (typeof SCENE_SURFACE_KINDS)[number];

export type SemanticContentClass =
  | "jurisdiction-name"
  | "jurisdiction-seal"
  | "campaign-name"
  | "candidate-name"
  | "bill-number"
  | "bill-title"
  | "headline"
  | "agenda"
  | "election-result"
  | "vote-tally"
  | "calendar-date"
  | "map-label"
  | "officeholder-portrait"
  | "officeholder-name"
  | "briefing-slide"
  | "document-body";

export const SEMANTIC_CONTENT_CLASSES: readonly SemanticContentClass[] = [
  "jurisdiction-name",
  "jurisdiction-seal",
  "campaign-name",
  "candidate-name",
  "bill-number",
  "bill-title",
  "headline",
  "agenda",
  "election-result",
  "vote-tally",
  "calendar-date",
  "map-label",
  "officeholder-portrait",
  "officeholder-name",
  "briefing-slide",
  "document-body",
];

export const SCENE_SURFACE_CONTENT_CLASSES = [
  ...SEMANTIC_CONTENT_CLASSES,
  "jurisdiction-flag",
  "neutral-art",
] as const;

export const DYNAMIC_SURFACE_CONTENT_CLASSES: ReadonlySet<string> =
  new Set<string>([...SEMANTIC_CONTENT_CLASSES, "jurisdiction-flag"]);

export const CIVIC_SYMBOL_CONTENT_CLASSES: ReadonlySet<string> = new Set([
  "jurisdiction-seal",
  "jurisdiction-flag",
]);

export const CIVIC_SYMBOL_POLICY = "canonical-source-only" as const;

export const MINIMUM_DYNAMIC_SURFACE_WIDTH_PERCENT = 5;

export const MINIMUM_DYNAMIC_SURFACE_HEIGHT_PERCENT = 5;

export const LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT = 1080;

export const FORESHORTENED_SURFACE_KINDS: readonly SceneSurfaceKind[] = [
  "desk-document",
  "podium-speech-notes",
];

export const FORESHORTENED_MINIMUM_HEIGHT_PERCENT = 3;

export const NON_COMPONENT_SURFACE_KINDS: readonly SceneSurfaceKind[] = [
  "civic-symbol",
  "official-portrait-slot",
  "office-nameplate",
  "picture-frame",
  "window-view",
];

function minimumLegibleHeightPercent(kind: string): number {
  return (FORESHORTENED_SURFACE_KINDS as readonly string[]).includes(kind)
    ? FORESHORTENED_MINIMUM_HEIGHT_PERCENT
    : MINIMUM_DYNAMIC_SURFACE_HEIGHT_PERCENT;
}

export const SURFACE_INFORMATION_ACCESS_CLASSES = [
  /** Fed by whatever a broadcaster aired. */
  "public-broadcast",
  /** A person's own room and their own post. */
  "personal-household",
  /** Posted, filed, or read into the public record of an institution. */
  "public-record",
  /** An institution's or an office's own working material. */
  "institutional-working",
] as const;

export type SurfaceInformationAccess =
  (typeof SURFACE_INFORMATION_ACCESS_CLASSES)[number];

function isSurfaceInformationAccess(
  value: string,
): value is SurfaceInformationAccess {
  return (SURFACE_INFORMATION_ACCESS_CLASSES as readonly string[]).includes(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function describeValue(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isNaN(value) ? "NaN" : `${value}`;
  if (typeof value === "boolean" || typeof value === "undefined") {
    return `${value}`;
  }
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return "symbol";
  if (typeof value === "function") return "function";
  return "object";
}

function validateOptionalNonEmptyString(
  object: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
): void {
  if (object[field] !== undefined && !isNonEmptyString(object[field])) {
    errors.push(`${path}.${field} must be a non-empty string when present.`);
  }
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: string[],
  options: { sourceIds?: ReadonlySet<string>; requireNonEmpty?: boolean } = {},
): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  if (options.requireNonEmpty && value.length === 0) {
    errors.push(`${path} must contain at least one reference.`);
  }
  value.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isNonEmptyString(entry)) {
      errors.push(`${entryPath} must be a non-empty string.`);
    } else if (options.sourceIds && !options.sourceIds.has(entry)) {
      errors.push(`${entryPath} references unrecognized source ID '${entry}'.`);
    }
  });
}

function registerSceneId(
  id: unknown,
  path: string,
  sceneIds: Map<string, string>,
  errors: string[],
): id is string {
  if (!isNonEmptyString(id)) {
    errors.push(`${path}.id must be a non-empty string.`);
    return false;
  }
  const priorPath = sceneIds.get(id);
  if (priorPath) {
    errors.push(
      `Duplicate scene ID '${id}' at ${path}; first used at ${priorPath}.`,
    );
    return false;
  }
  sceneIds.set(id, path);
  return true;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPercent(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function validatePercentField(
  object: Record<string, unknown>,
  field: string,
  path: string,
  errors: string[],
  required: boolean,
): void {
  const value = object[field];
  if (value === undefined) {
    if (required) errors.push(`${path}.${field} is required.`);
    return;
  }
  if (!isPercent(value)) {
    errors.push(`${path}.${field} must be a percentage between 0 and 100.`);
  }
}

function validatePercentRect(
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object of plate percentages.`);
    return;
  }
  for (const field of [
    "x_percent",
    "y_percent",
    "width_percent",
    "height_percent",
  ]) {
    validatePercentField(value, field, path, errors, true);
  }
}

function validateSurfaceSlots(
  value: unknown,
  sceneIds: Map<string, string>,
  errors: string[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push("surface_slots must be an array when present.");
    return;
  }
  value.forEach((entry, index) => {
    const path = `surface_slots[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    registerSceneId(entry.slot_id, path, sceneIds, errors);
    if (
      typeof entry.kind !== "string" ||
      !(SCENE_SURFACE_KINDS as readonly string[]).includes(entry.kind)
    ) {
      errors.push(
        `${path}.kind must be one of ${SCENE_SURFACE_KINDS.join(", ")}; found ${describeValue(entry.kind)}.`,
      );
    }
    validatePercentRect(entry.rect_percent, `${path}.rect_percent`, errors);
    if (!isFiniteNumber(entry.z_order)) {
      errors.push(`${path}.z_order must be a finite number.`);
    }
    validateStringArray(
      entry.allowed_content_classes,
      `${path}.allowed_content_classes`,
      errors,
      { requireNonEmpty: true },
    );

    const classes = Array.isArray(entry.allowed_content_classes)
      ? entry.allowed_content_classes.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    for (const contentClass of classes) {
      if (
        !(SCENE_SURFACE_CONTENT_CLASSES as readonly string[]).includes(
          contentClass,
        )
      ) {
        errors.push(
          `${path}.allowed_content_classes contains '${contentClass}', which is not one of ${SCENE_SURFACE_CONTENT_CLASSES.join(", ")}.`,
        );
      }
    }

    const dynamic = classes.some((contentClass) =>
      DYNAMIC_SURFACE_CONTENT_CLASSES.has(contentClass),
    );
    const rect = entry.rect_percent;
    if (dynamic && isRecord(rect)) {
      const width = rect.width_percent;
      const height = rect.height_percent;
      const kind = typeof entry.kind === "string" ? entry.kind : "";
      const heightFloor = minimumLegibleHeightPercent(kind);
      const imageOnly = (
        NON_COMPONENT_SURFACE_KINDS as readonly string[]
      ).includes(kind);
      const widthFloor = imageOnly ? 0 : MINIMUM_DYNAMIC_SURFACE_WIDTH_PERCENT;
      if (
        isFiniteNumber(width) &&
        isFiniteNumber(height) &&
        (width < widthFloor || height < heightFloor)
      ) {
        errors.push(
          `${path} presents dynamic content on a ${width}% x ${height}% surface, below the ${widthFloor}% x ${heightFloor}% legibility floor for a '${kind}' (about ${Math.round((heightFloor / 100) * LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT)} lines at ${LEGIBILITY_REFERENCE_VIEWPORT_HEIGHT}p). A surface too small to read a change on stays ambient decoration.`,
        );
      }
    }

    const civic = classes.some((contentClass) =>
      CIVIC_SYMBOL_CONTENT_CLASSES.has(contentClass),
    );
    if (civic && entry.civic_symbol_policy !== CIVIC_SYMBOL_POLICY) {
      errors.push(
        `${path} may present a civic symbol and must declare civic_symbol_policy '${CIVIC_SYMBOL_POLICY}'. A seal or flag comes from its canonical source; it is never generated, redrawn or approximated.`,
      );
    }
    if (!civic && entry.civic_symbol_policy !== undefined) {
      errors.push(
        `${path} declares civic_symbol_policy but presents no civic symbol class.`,
      );
    }

    if (entry.information_access !== undefined) {
      if (
        typeof entry.information_access !== "string" ||
        !isSurfaceInformationAccess(entry.information_access)
      ) {
        errors.push(
          `${path}.information_access must be one of ${SURFACE_INFORMATION_ACCESS_CLASSES.join(", ")}; found ${describeValue(entry.information_access)}.`,
        );
      }
      if (!dynamic) {
        errors.push(
          `${path} declares information_access but carries no class that follows simulation state, so nothing would ever come down that pipe.`,
        );
      }
    }

    validateOptionalNonEmptyString(entry, "fallback_decoration", path, errors);
  });
}

/** Pure adapter: original validators mutate only local copies; caller buffers stay unchanged. */
export function validateSurfaceSlotsRule(
  value: unknown,
  priorSceneIds: ReadonlyMap<string, string> = new Map(),
  priorErrors: readonly string[] = [],
) {
  const sceneIds = new Map(priorSceneIds);
  const errors = [...priorErrors];
  validateSurfaceSlots(value, sceneIds, errors);
  return { sceneIds, errors };
}
