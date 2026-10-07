import type { SavedRoleSummary } from "./save-role-summary";

/**
 * WHAT THE TITLE SCREEN SHOWS: THE NATION'S PLACES OF GOVERNMENT.
 *
 * Lamontae, Sept. 27: the title screen is civic, not apartments. Sept. 28: "no
 * other images seem to be wired on the homescreen. and it needs to stop
 * defaulting to the apartment when there is a saved game." Oct. 7: "right now
 * the home screen is a bunch of state capitals, and I don't want that. No
 * one's going to be able to recognize those... scenes like the Lincoln
 * Memorial or the White House at night... some kind of rally or a national
 * convention."
 *
 * The rotation is every approved national picture in the owner's place
 * backdrops (art/backdrops), by day and at night, found by what its name says
 * it is: a federal place (the U.S. Capitol, its two floors, the Supreme Court,
 * the Oval Office) or a national stage of a campaign (a rally, a convention, a
 * debate, an election night, a television studio). A new one joins the day it
 * lands, with no list to update. A state capitol, a town's or a county's own
 * room and a home never join it: the creator paints a chosen state's capitol
 * from the same pictures (pictureForChosenState), and play paints the rest.
 *
 * PRESENTATION ONLY, and pure: no World, no clock, no randomness. The screen
 * hands it the manifest rows and a URL lookup and paints what comes back.
 */

export type CivicBackdropKind =
  | "white-house"
  | "capitol"
  | "chamber"
  | "court"
  | "executive"
  | "city-hall"
  | "campaign"
  | "media";

/** The order kinds take their turn in, and the order of the first pass. */
export const CIVIC_BACKDROP_KINDS: readonly CivicBackdropKind[] = [
  "white-house",
  "capitol",
  "chamber",
  "court",
  "city-hall",
  "executive",
  "campaign",
  "media",
];

/** First match wins. Each rule names a kind of public place, never one file. */
const KIND_RULES: readonly (readonly [RegExp, CivicBackdropKind])[] = [
  [/^white-house|^oval-office$/, "white-house"],
  [/capitol/, "capitol"],
  [/courtroom|courthouse/, "court"],
  [
    /chamber|(house|senate)-floor$|commission|township-board|public-meeting-room|town-hall/,
    "chamber",
  ],
  [/city-hall|clerk-counter/, "city-hall"],
  [/governor-office|mayor-office/, "executive"],
  [
    /campaign|party-office|phone-bank|rally-stage|debate-stage|election-night|convention-hall/,
    "campaign",
  ],
  [/tv-studio/, "media"],
];

/**
 * The places the whole country knows, by name: the federal government's own
 * (us-, white-house, the Oval Office, the Supreme Court) and the stages a
 * national campaign is fought on. Everything else is somebody's state, county
 * or town, and stays out of the title rotation.
 */
const NATIONAL_PLACE =
  /^(us-|white-house|oval-office$|supreme-)|^(rally-stage|convention-hall|debate-stage|election-night-venue|tv-studio)$/;

export function isNationalPlace(place: string): boolean {
  return NATIONAL_PLACE.test(place);
}

/**
 * The light each national place is shown in, in the order a lap meets them:
 * every place by day, then every place again at night (Oct. 7: "the White
 * House at night"). Every light of a place shares its staging spots
 * (art/backdrops/staging.json), so the same people can stand in both.
 */
export const TITLE_LIGHTS: readonly string[] = ["midday", "night"];

/**
 * Homes, by name. They are checked first and win over every civic rule, so a
 * home can never enter the title rotation by a name that happens to match one
 * (a "courthouse" is not a "house"; a "suburban-house" is).
 */
const HOME_PLACE =
  /(^|-)(apartment|rowhouse|farmhouse|mobile-home|suburban-house|large-house|residence|home)(-|$)/;

export function isHomePlace(place: string): boolean {
  return HOME_PLACE.test(place);
}

/** The civic kind of a place backdrop, or null when it is not civic. */
export function civicBackdropKind(place: string): CivicBackdropKind | null {
  if (isHomePlace(place)) return null;
  return KIND_RULES.find(([rule]) => rule.test(place))?.[1] ?? null;
}

/** One row of art/backdrops/manifest.json, as far as this module reads it. */
export interface BackdropManifestRow {
  readonly place: string;
  readonly variant: string;
  readonly file: string;
  readonly approval?: string;
}

/** A picture the title may show. */
export interface TitlePicture {
  readonly place: string;
  /** The light it is painted in (manifest variant): "midday" or "night". */
  readonly variant: string;
  readonly kind: CivicBackdropKind;
  readonly url: string;
  /** The place in plain words, for the line a screen reader hears. */
  readonly label: string;
}

/**
 * A picture is eligible when the owner has not turned it down and it is one
 * of the title's lights. The owner approved the first fifty as placeholders;
 * they are shown in play today, so they are shown here. A rejected or
 * withdrawn picture never is.
 */
export function eligibleBackdropRow(row: BackdropManifestRow): boolean {
  return (
    TITLE_LIGHTS.includes(row.variant) &&
    !/reject|withdraw/i.test(row.approval ?? "")
  );
}

/** The id a picture goes by in the rotation: its place, and its light after day. */
export function titlePictureId(picture: {
  readonly place: string;
  readonly variant?: string;
}): string {
  return !picture.variant || picture.variant === "midday"
    ? `picture:${picture.place}`
    : `picture:${picture.place}:${picture.variant}`;
}

/** Federal places lead their kind; the rest follow by name. */
const LEADS: readonly string[] = [
  "white-house-exterior",
  "oval-office",
  "us-capitol-exterior",
  "us-senate-floor",
  "us-house-floor",
  "supreme-courtroom",
];

function leadOrder(place: string): number {
  const index = LEADS.indexOf(place);
  return index === -1 ? LEADS.length : index;
}

function lightOrder(variant: string | undefined): number {
  const index = TITLE_LIGHTS.indexOf(variant ?? "midday");
  return index === -1 ? TITLE_LIGHTS.length : index;
}

/** Day before night, federal places first, then by name. */
function comparePictures(
  left: { readonly place: string; readonly variant?: string },
  right: { readonly place: string; readonly variant?: string },
): number {
  return (
    lightOrder(left.variant) - lightOrder(right.variant) ||
    leadOrder(left.place) - leadOrder(right.place) ||
    (left.place < right.place ? -1 : left.place > right.place ? 1 : 0)
  );
}

/**
 * Spreads each kind evenly through the whole rotation, so five campaign
 * stages are not a minute and a quarter of campaign stages in a row. This is a
 * smooth weighted round-robin: each kind earns its share of turns (its number
 * of pictures) every step, the kind furthest ahead takes the next turn, and
 * pays back the total. Ties go by the kinds' own order. Stable for a given
 * set of pictures.
 */
export function interleaveByKind<
  T extends {
    readonly kind: CivicBackdropKind;
    readonly place: string;
    readonly variant?: string;
  },
>(items: readonly T[]): readonly T[] {
  const groups = CIVIC_BACKDROP_KINDS.flatMap((kind) => {
    const members = items
      .filter((item) => item.kind === kind)
      .sort(comparePictures);
    return members.length > 0
      ? [{ members, weight: members.length, credit: 0, next: 0 }]
      : [];
  });
  const total = items.length;
  const ordered: T[] = [];
  while (ordered.length < total) {
    let best: (typeof groups)[number] | null = null;
    for (const group of groups) {
      if (group.next >= group.members.length) continue;
      group.credit += group.weight;
      if (!best || group.credit > best.credit) best = group;
    }
    if (!best) break;
    best.credit -= total;
    ordered.push(best.members[best.next]!);
    best.next += 1;
  }
  return ordered;
}

const LABELS: Readonly<Record<string, string>> = {
  "white-house-exterior": "The White House",
  "oval-office": "The Oval Office",
  "us-capitol-exterior": "The U.S. Capitol",
  "us-senate-floor": "The U.S. Senate floor",
  "us-house-floor": "The U.S. House floor",
  "supreme-courtroom": "The Supreme Court",
};

/** The place in plain words: "State capitol (KY)" for a state's own. */
export function civicPlaceLabel(place: string): string {
  const known = LABELS[place];
  if (known) return known;
  const capitol = /^state-capitol-([a-z]{2})$/.exec(place);
  if (capitol) return `State capitol (${capitol[1]!.toUpperCase()})`;
  const words = place.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Every eligible national picture, the White House by day first and then
 * each kind spread through the rest, day before night. One picture per place
 * and light.
 */
export function civicTitlePictures(
  rows: readonly BackdropManifestRow[],
  urlFor: (file: string) => string | null,
): readonly TitlePicture[] {
  const seen = new Set<string>();
  const pictures: TitlePicture[] = [];
  for (const row of rows) {
    if (!eligibleBackdropRow(row) || !isNationalPlace(row.place)) continue;
    const id = titlePictureId(row);
    if (seen.has(id)) continue;
    const kind = civicBackdropKind(row.place);
    if (!kind) continue;
    const url = urlFor(row.file);
    if (!url) continue;
    seen.add(id);
    pictures.push({
      place: row.place,
      variant: row.variant,
      kind,
      url,
      label: civicPlaceLabel(row.place),
    });
  }
  const lead = pictures
    .filter((picture) => picture.kind === "white-house")
    .sort(comparePictures)[0];
  return lead
    ? [lead, ...interleaveByKind(pictures.filter((p) => p !== lead))]
    : interleaveByKind(pictures);
}

/**
 * Where a saved character's role is done, as national pictures in order of
 * preference: the federal room their role sits in, when it has one (the Oval
 * Office, the Senate or House floor, the Supreme Court), else a national stage
 * that fits what they do (a candidate's rally), else the U.S. Capitol. A
 * state capitol or a town's own room is never the title's (Lamontae, Oct. 7);
 * a home never was (Sept. 28). The caller takes the first one it can paint.
 */
export function rolePlaceCandidates(
  role: SavedRoleSummary | null | undefined,
): readonly string[] {
  const own = ((): readonly string[] => {
    switch (role?.kind) {
      case "president":
        return ["oval-office"];
      case "member-of-congress":
        return [role.chamber === "senate" ? "us-senate-floor" : "us-house-floor"];
      case "judge":
        return role.court === "supreme" ? ["supreme-courtroom"] : [];
      case "candidate":
        return ["rally-stage", "debate-stage"];
      default:
        return [];
    }
  })();
  return [...own, "us-capitol-exterior"];
}

/**
 * The rotation a returning player sees: their role's place by day first, then
 * every other picture in the usual order. A picture the role names that this
 * build does not have is skipped, never borrowed from another place.
 */
export function rotationForSave(
  pictures: readonly TitlePicture[],
  role: SavedRoleSummary | null | undefined,
): {
  readonly first: TitlePicture | null;
  readonly rest: readonly TitlePicture[];
} {
  const byPlace = new Map(
    [...pictures]
      .sort(comparePictures)
      .reverse()
      .map((picture) => [picture.place, picture]),
  );
  const firstPlace = rolePlaceCandidates(role).find((place) =>
    byPlace.has(place),
  );
  const first = firstPlace ? byPlace.get(firstPlace)! : null;
  return {
    first,
    rest: first ? pictures.filter((picture) => picture !== first) : pictures,
  };
}

/**
 * The picture behind a new life once its state is chosen: that state's own
 * capitol by day when the build paints one (OW-4), read from the whole
 * manifest, since no state capitol is in the title rotation. Null when it
 * does not, so the caller falls back to its rotation rather than a federal
 * picture.
 */
export function pictureForChosenState(
  rows: readonly BackdropManifestRow[],
  urlFor: (file: string) => string | null,
  usps: string,
): TitlePicture | null {
  const place = `state-capitol-${usps.toLowerCase()}`;
  const row = rows.find(
    (candidate) =>
      candidate.place === place &&
      candidate.variant === "midday" &&
      eligibleBackdropRow(candidate),
  );
  const url = row ? urlFor(row.file) : null;
  return row && url
    ? {
        place,
        variant: row.variant,
        kind: "capitol",
        url,
        label: civicPlaceLabel(place),
      }
    : null;
}

/**
 * The town's own picture once a town is chosen (OW-4): its city hall, only
 * when the staging table places people in it and the build paints it. The
 * state capitol is the fallback before then. Never the main street (OW-19).
 */
export const TOWN_BACKDROP_ORDER = ["city-hall-exterior"] as const;

export function pictureForChosenTown(
  staged: ReadonlySet<string>,
  urlFor: (place: string) => string | null,
): TitlePicture | null {
  for (const place of TOWN_BACKDROP_ORDER) {
    const url = staged.has(place) ? urlFor(place) : null;
    if (url)
      return {
        place,
        variant: "midday",
        kind: "city-hall",
        url,
        label: civicPlaceLabel(place),
      };
  }
  return null;
}
