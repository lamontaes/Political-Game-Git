/**
 * Which backdrop picture a place, a home or a job is shown in: the state
 * capitol, the kind of dwelling, the employer's kind or the worker's
 * occupation. Moved from the old screens' `place-backdrops.ts`.
 */
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import placeKinds from "../../data/content/place-kinds.json" with { type: "json" };

/** A recorded dwelling kind, `residential:apartment` and the like. */
export type DwellingClassification = `${
  "residential" | "institutional" | "assigned" | "custom"}:${string}`;
/** A recorded occupation, `custom:onet-25-2021` and the like. */
export type OccupationClassification = `${
  | "occupation"
  | "profession"
  | "trade"
  | "practice"
  | "service"
  | "custom"}:${string}`;

interface BackdropRecord {
  readonly place: string;
  readonly variant: string;
  readonly file: string;
  readonly tags?: readonly string[];
}

interface PlaceKinds {
  readonly businessKinds: Readonly<Record<string, readonly string[]>>;
  readonly classifications: Readonly<Record<string, readonly string[]>>;
}

const PLACE_KINDS = placeKinds as PlaceKinds;

/** The places painted at midday, from the art manifest: the one list every picker reads. */
const PICTURED: ReadonlySet<string> = new Set(
  (manifest.backdrops as readonly BackdropRecord[])
    .filter((record) => record.variant === "midday")
    .map((record) => record.place),
);

export function hasBackdrop(place: string): boolean {
  return PICTURED.has(place);
}

/** States whose capitol is a tower rather than a dome. */
const TOWER_CAPITOLS: ReadonlySet<string> = new Set(["FL", "LA", "ND", "NE"]);

/**
 * The capitol picture for a state, D.C. or a territory: its own building when
 * that place has a picture (`state-capitol-tx`, `state-capitol-dc`), else the
 * shared tower or dome. D.C.'s is the John A. Wilson Building, where the
 * Council sits.
 */
export function capitolPlaceFor(usps: string | null): string {
  const own = usps ? `state-capitol-${usps.toLowerCase()}` : null;
  if (own && hasBackdrop(own)) return own;
  return usps && TOWER_CAPITOLS.has(usps)
    ? "state-capitol-tower"
    : "state-capitol-dome";
}

/** The kind of home, from the dwelling's recorded building type. */
export function homePlaceFor(
  classification: DwellingClassification | null,
): string {
  switch (classification) {
    case "residential:multi-unit":
    case "residential:apartment":
      return "small-apartment";
    case "residential:mobile-home":
    case "residential:other-mobile":
      return "mobile-home";
    // The town's homes record these kinds (the old engine's town-homes.ts).
    case "residential:rowhouse":
      return "rowhouse";
    case "residential:large-house":
      return "large-house";
    case "residential:farmhouse":
      return "rural-farmhouse";
    // A detached or unknown house reads suburban.
    default:
      return "suburban-house";
  }
}

/**
 * Where a job is done. O*NET codes go by their major group; the game's own
 * work kinds go by name.
 */
export function workplacePlaceFor(
  classification: OccupationClassification | null,
  employerPlace: string | null = null,
  businessKind?: string | null,
): string {
  const kind =
    businessKind ??
    (employerPlace &&
    !hasBackdrop(employerPlace) &&
    PLACE_KINDS.businessKinds[employerPlace]
      ? employerPlace
      : null);
  const hasBusinessKind = Boolean(kind);
  if (kind) {
    const room = employerPlaceForKind(kind);
    if (room) return room;
  }
  if (employerPlace && hasBackdrop(employerPlace)) return employerPlace;
  if (!classification)
    return hasBusinessKind ? genericEmployerPlace() : "office";
  const onet = /^custom:onet-(\d\d)/.exec(classification);
  if (onet)
    return (
      ONET_MAJOR_GROUP_PLACE[onet[1]!] ??
      (hasBusinessKind ? genericEmployerPlace() : "office")
    );
  const name = classification.slice(classification.indexOf(":") + 1);
  for (const [pattern, place] of WORK_NAME_PLACE) {
    if (pattern.test(name)) return place;
  }
  return hasBusinessKind ? genericEmployerPlace() : "office";
}

function genericEmployerPlace() {
  return employerPlaceForKind("unlisted-employer") ?? "main-street";
}

/** The room selected from a recorded employer kind before the worker's job. */
function employerPlaceForKind(businessKind: string): string | null {
  const requiredTags = PLACE_KINDS.businessKinds[businessKind] ??
    PLACE_KINDS.classifications[businessKind] ?? ["business-general"];
  for (const tag of requiredTags) {
    const room = (manifest.backdrops as readonly BackdropRecord[]).find(
      (record) => record.variant === "midday" && record.tags?.includes(tag),
    )?.place;
    if (room) return room;
  }
  return null;
}

const ONET_MAJOR_GROUP_PLACE: Readonly<Record<string, string>> = {
  "21": "community-room",
  "25": "classroom",
  "29": "hospital-hallway",
  "31": "hospital-hallway",
  "33": "main-street",
  "35": "diner",
  "39": "main-street",
  "41": "store",
  "45": "rural-farmhouse",
  "47": "construction-site",
  "49": "factory-floor",
  "51": "factory-floor",
  "53": "main-street",
};

const WORK_NAME_PLACE: readonly (readonly [RegExp, string])[] = [
  [/cashier|retail|store|stock/, "store"],
  [/teach|school|education/, "classroom"],
  [/college|university/, "college-quad"],
  [/food|server|cook|diner|restaurant/, "diner"],
  [/nurs|hospital|medical|health/, "hospital-hallway"],
  [/carpent|apprentice|construct|electric|plumb/, "construction-site"],
  [/mechanic|factory|production|assembl|machin/, "factory-floor"],
  [/journalis|news|broadcast/, "tv-studio"],
  [/campaign/, "campaign-storefront"],
  [/court|judicial|legal/, "county-courthouse"],
  [/library|community/, "community-room"],
  [/hair|barber|salon/, "main-street"],
];
