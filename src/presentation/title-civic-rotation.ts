import type { SavedRoleSummary } from "./save-role-summary";

/**
 * WHAT THE TITLE SCREEN SHOWS: THE PLACES OF GOVERNMENT.
 *
 * Lamontae, Sept. 27: the title screen is civic, not apartments. Sept. 28: "no
 * other images seem to be wired on the homescreen. and it needs to stop
 * defaulting to the apartment when there is a saved game."
 *
 * The rotation is every approved civic picture in the owner's place backdrops
 * (art/backdrops), found by the kind of place its name says it is, so a new
 * capitol, chamber or courtroom joins the rotation the day it lands, with no
 * list to update. A home never joins it.
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
  | "campaign";

/** The order kinds take their turn in, and the order of the first pass. */
export const CIVIC_BACKDROP_KINDS: readonly CivicBackdropKind[] = [
  "white-house",
  "capitol",
  "chamber",
  "court",
  "city-hall",
  "executive",
  "campaign",
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
];

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
  readonly kind: CivicBackdropKind;
  readonly url: string;
  /** The place in plain words, for the line a screen reader hears. */
  readonly label: string;
}

/**
 * A picture is eligible when the owner has not turned it down and this build
 * actually ships its daytime version. The owner approved the first fifty as
 * placeholders and has the capitols in review; both are shown in play today,
 * so both are shown here. A rejected or withdrawn picture never is.
 */
export function eligibleBackdropRow(row: BackdropManifestRow): boolean {
  return (
    row.variant === "midday" && !/reject|withdraw/i.test(row.approval ?? "")
  );
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

function comparePlaces(left: string, right: string): number {
  return (
    leadOrder(left) - leadOrder(right) ||
    (left < right ? -1 : left > right ? 1 : 0)
  );
}

/**
 * Spreads each kind evenly through the whole rotation, so fifty-eight
 * capitols are not a quarter of an hour of capitols in a row. This is a
 * smooth weighted round-robin: each kind earns its share of turns (its number
 * of pictures) every step, the kind furthest ahead takes the next turn, and
 * pays back the total. Ties go by the kinds' own order. Stable for a given
 * set of pictures.
 */
export function interleaveByKind<
  T extends { readonly kind: CivicBackdropKind; readonly place: string },
>(items: readonly T[]): readonly T[] {
  const groups = CIVIC_BACKDROP_KINDS.flatMap((kind) => {
    const members = items
      .filter((item) => item.kind === kind)
      .sort((a, b) => comparePlaces(a.place, b.place));
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
 * Every eligible civic picture, the White House first and then each kind
 * spread through the rest. One picture per place: the daytime one.
 */
export function civicTitlePictures(
  rows: readonly BackdropManifestRow[],
  urlFor: (file: string) => string | null,
): readonly TitlePicture[] {
  const seen = new Set<string>();
  const pictures: TitlePicture[] = [];
  for (const row of rows) {
    if (!eligibleBackdropRow(row) || seen.has(row.place)) continue;
    const kind = civicBackdropKind(row.place);
    if (!kind) continue;
    const url = urlFor(row.file);
    if (!url) continue;
    seen.add(row.place);
    pictures.push({
      place: row.place,
      kind,
      url,
      label: civicPlaceLabel(row.place),
    });
  }
  const whiteHouse = pictures
    .filter((picture) => picture.kind === "white-house")
    .sort((a, b) => comparePlaces(a.place, b.place));
  return [
    ...whiteHouse,
    ...interleaveByKind(
      pictures.filter((picture) => picture.kind !== "white-house"),
    ),
  ];
}

/**
 * Where a saved character's role is done, as place backdrops in order of
 * preference: their own room first, then their state's capitol, then the
 * shared capitol pictures. With no role at all, the town's city hall stands in
 * for their home (Lamontae, Sept. 28: never the apartment when a civic scene
 * can be shown). The caller takes the first one it can paint.
 */
export function rolePlaceCandidates(
  role: SavedRoleSummary | null | undefined,
): readonly string[] {
  if (!role) return ["city-hall-exterior", "council-chamber"];
  const usps = role.stateUsps?.toLowerCase() ?? null;
  const capitols = [
    ...(usps ? [`state-capitol-${usps}`] : []),
    "state-capitol-dome",
    "us-capitol-exterior",
  ];
  const own = ((): readonly string[] => {
    switch (role.kind) {
      case "president":
        return ["oval-office", "white-house-exterior"];
      case "member-of-congress":
        return role.chamber === "senate"
          ? ["us-senate-floor", "us-capitol-exterior"]
          : ["us-house-floor", "us-capitol-exterior"];
      case "governor":
        return ["governor-office"];
      case "state-executive":
        return [];
      case "state-legislator":
        return role.chamber === "unicameral"
          ? ["state-legislative-chamber-unicameral"]
          : ["state-legislative-chamber-bicameral"];
      case "mayor":
        return ["city-hall-exterior", "council-chamber"];
      case "council-member":
        return ["council-chamber", "city-hall-exterior"];
      case "county-commissioner":
        return ["county-commission", "county-courthouse"];
      case "judge":
        return role.court === "supreme"
          ? ["supreme-courtroom", "appellate-courtroom"]
          : role.court === "appellate"
            ? ["appellate-courtroom", "county-courtroom"]
            : ["county-courtroom", "county-courthouse"];
      case "candidate":
        return ["campaign-storefront", "county-party-office"];
      case "public-servant":
        return role.workplace === "court"
          ? ["county-courthouse", "county-courtroom"]
          : role.workplace === "county"
            ? ["county-commission", "county-courthouse"]
            : role.workplace === "legislature"
              ? []
              : ["city-hall-exterior", "clerk-counter"];
    }
  })();
  return [...own, ...capitols];
}

/**
 * The rotation a returning player sees: their role's place first, then every
 * other civic picture in the usual order. A picture the role names that this
 * build does not have is skipped, never borrowed from another place.
 */
export function rotationForSave(
  pictures: readonly TitlePicture[],
  role: SavedRoleSummary | null | undefined,
): {
  readonly first: TitlePicture | null;
  readonly rest: readonly TitlePicture[];
} {
  const byPlace = new Map(pictures.map((picture) => [picture.place, picture]));
  const firstPlace = rolePlaceCandidates(role).find((place) =>
    byPlace.has(place),
  );
  const first = firstPlace ? byPlace.get(firstPlace)! : null;
  return {
    first,
    rest: first ? pictures.filter((picture) => picture !== first) : pictures,
  };
}
