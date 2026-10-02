import manifest from "../../art/campuses/manifest.json" with { type: "json" };
import { optionalGlob } from "./optional-glob";

/**
 * THE COLLEGE CAMPUSES: A PICTURE FOR ANY COLLEGE.
 *
 * Each state's and territory's flagship university, the Ivy League schools,
 * and a few others are painted from a photo of their best-known landmark
 * (art/campuses). There are thousands of colleges, so a college without its
 * own painting borrows one that would look right there: a campus of the kind
 * it can stand in for, from the same state if one exists, otherwise from the
 * same region with the same climate and ground. It never borrows across
 * climates, so a Kentucky college is never shown with a desert behind it;
 * with no fitting campus it has no picture. A smaller campus can also stand
 * in for a community college (Lamontae, Sept. 28, 2026).
 *
 * Which campus, and why, is decided here and nowhere else.
 */

export type CollegeKind =
  | "flagship"
  | "land-grant"
  | "ivy-league"
  | "private-research"
  | "territorial"
  | "regional-public"
  | "private-college"
  | "community-college";

export interface CampusRecord {
  readonly campus: string;
  readonly name: string;
  readonly state: string;
  readonly region: string;
  readonly climate: string;
  readonly terrain: string;
  readonly kind: string;
  readonly size: string;
  readonly standsInFor: readonly string[];
  readonly variant: string;
  readonly file: string;
}

export interface CollegeToPicture {
  /** The college's own painted campus, when it has one (for example "harvard"). */
  readonly campus?: string;
  /** Used only to keep the same stand-in for the same college every time. */
  readonly name: string;
  /** Two-letter postal code, lower case ("ky", "pr"). */
  readonly state: string;
  readonly kind: CollegeKind;
}

export interface CampusPicture {
  readonly campus: CampusRecord;
  readonly url: string | null;
  /** "own": the college's own campus; "same-state" or "same-climate": a stand-in. */
  readonly match: "own" | "same-state" | "same-climate";
}

interface StateGround {
  readonly region: string;
  readonly climate: string;
  readonly terrain: string;
}

const urls = optionalGlob(() =>
  import.meta.glob<string>("../../art/campuses/*.jpg", {
    eager: true,
    query: "?url",
    import: "default",
  }),
);

const MIDDAY = (manifest.campuses as readonly CampusRecord[]).filter(
  (record) => record.variant === "midday",
);
const STATES = manifest.states as Readonly<Record<string, StateGround>>;

function pictureOf(
  record: CampusRecord,
  match: CampusPicture["match"],
): CampusPicture {
  return {
    campus: record,
    url: urls[`../../art/campuses/${record.file}`] ?? null,
    match,
  };
}

function canServe(record: CampusRecord, kind: CollegeKind): boolean {
  return record.kind === kind || record.standsInFor.includes(kind);
}

/** A stable pick among equally good campuses, so a college keeps its picture. */
function stablePick(
  records: readonly CampusRecord[],
  name: string,
): CampusRecord {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 16777619) >>> 0;
  }
  const sorted = [...records].sort((a, b) => a.campus.localeCompare(b.campus));
  return sorted[hash % sorted.length]!;
}

export function campusRecords(): readonly CampusRecord[] {
  return MIDDAY;
}

export function campusPictureFor(
  college: CollegeToPicture,
): CampusPicture | null {
  const own = college.campus
    ? MIDDAY.find((record) => record.campus === college.campus)
    : undefined;
  if (own) return pictureOf(own, "own");

  const fitting = MIDDAY.filter((record) => canServe(record, college.kind));
  const sameState = fitting.filter((record) => record.state === college.state);
  if (sameState.length > 0) {
    return pictureOf(stablePick(sameState, college.name), "same-state");
  }

  const ground = STATES[college.state];
  if (!ground) return null;
  const sameClimate = fitting.filter(
    (record) =>
      record.region === ground.region &&
      record.climate === ground.climate &&
      record.terrain === ground.terrain,
  );
  if (sameClimate.length > 0) {
    return pictureOf(stablePick(sameClimate, college.name), "same-climate");
  }
  return null;
}
