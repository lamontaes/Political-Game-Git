import { expect, type Page } from "@playwright/test";

/**
 * Places the browser suite starts lives in, and what each one is here to prove.
 *
 * The suite had drifted into one town. Across `tests/e2e`, Kentucky was named
 * in 121 of the explicit state choices and Lexington in 122 of the place
 * choices, against a handful of everywhere else, and the shared route into a
 * legislative seat named a Kentucky General Assembly house seat by its literal
 * key. The game itself never assumed Lexington — `requireExplicitPlaceKey`
 * refuses to start a life without a place, and the creator makes a player
 * choose a state and then a town — so the suite was proving the game works in
 * one town rather than that it works.
 *
 * These are not the same scenario relabelled. Each entry differs from the
 * others in something the game actually models: how many chambers the state
 * legislature has, what that chamber is called, and whether the place sits
 * under a municipal government the corpus carries.
 *
 * Every place key, pack id and chamber key here is read back from the live
 * geography by `tests/jurisdiction-table.test.ts`, so a table entry cannot
 * quietly stop describing the world.
 */
export interface TestJurisdiction {
  /** Short label for a test title. */
  readonly name: string;
  /** Canonical state name, as the creator's state search takes it. */
  readonly state: string;
  /** Town name, as the creator's place list shows it. */
  readonly place: string;
  /** The life place key the creator resolves that town to. */
  readonly placeKey: string;
  /** The state legislature's rule pack for that state. */
  readonly packId: string;
  /** The chamber keys the pack carries, in the pack's own order. */
  readonly chamberKeys: readonly string[];
  /** Whether the municipal corpus carries a city government for the place. */
  readonly municipal: boolean;
  /** Why this place is in the set, rather than any other town. */
  readonly note: string;
}

export const TEST_JURISDICTIONS: readonly TestJurisdiction[] = [
  {
    name: "Lexington, Kentucky",
    state: "Kentucky",
    place: "Lexington",
    placeKey: "lexington-fayette",
    packId: "us-ky-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: true,
    note: "A consolidated city-county: one urban county government where most places have a city and a county separately. Kept as the long-standing regression scenario.",
  },
  {
    name: "Omaha, Nebraska",
    state: "Nebraska",
    place: "Omaha",
    placeKey: "3137000",
    packId: "us-ne-legislature-v1",
    chamberKeys: ["legislature"],
    municipal: false,
    note: "The one unicameral state legislature. A route that assumes a lower and an upper chamber cannot run here at all.",
  },
  {
    name: "Reno, Nevada",
    state: "Nevada",
    place: "Reno",
    placeKey: "3260600",
    packId: "us-nv-legislature-v1",
    chamberKeys: ["assembly", "senate"],
    municipal: true,
    note: "Nevada's lower chamber is an Assembly, not a House. A route that names 'house' by its literal key silently skips this state.",
  },
  {
    name: "Anchorage, Alaska",
    state: "Alaska",
    place: "Anchorage",
    placeKey: "0203000",
    packId: "us-ak-legislature-v1",
    chamberKeys: ["house", "senate"],
    municipal: true,
    note: "A unified municipality, and a state with boroughs rather than counties.",
  },
  {
    name: "Minneapolis, Minnesota",
    state: "Minnesota",
    place: "Minneapolis",
    placeKey: "2743000",
    packId: "us-mn-legislature-v1",
    chamberKeys: ["house", "senate"],
    municipal: false,
    note: "A large city the municipal corpus does not carry, so the place has a state legislature but no city government record.",
  },
  {
    name: "Baltimore, Maryland",
    state: "Maryland",
    place: "Baltimore",
    placeKey: "2404000",
    packId: "us-md-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: true,
    note: "An independent city, belonging to no county.",
  },
  {
    name: "Columbus, Ohio",
    state: "Ohio",
    place: "Columbus",
    placeKey: "3918000",
    packId: "us-oh-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: true,
    note: "An ordinary city inside an ordinary county, which is what most of the country looks like.",
  },
  {
    name: "Springfield, Illinois",
    state: "Illinois",
    place: "Springfield",
    placeKey: "1772000",
    packId: "us-il-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: false,
    note: "A state capital that is not its largest city, and no municipal record.",
  },
  {
    name: "Kansas City, Missouri",
    state: "Missouri",
    place: "Kansas City",
    placeKey: "2938000",
    packId: "us-mo-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: false,
    note: "A city spanning several counties, and a name that also names a city in another state.",
  },
];

/** The long-standing Kentucky scenario, named rather than assumed. */
export const KENTUCKY_LEXINGTON = TEST_JURISDICTIONS[0]!;

export function jurisdictionNamed(name: string): TestJurisdiction {
  const found = TEST_JURISDICTIONS.find((entry) => entry.name === name);
  if (!found) throw new Error(`No test jurisdiction named ${name}`);
  return found;
}

/**
 * A stable, varied place for a case that does not care where it happens.
 *
 * A spec that needs *a* life, not a particular one, passes something that
 * identifies it — its own file name reads well — and gets the same place on
 * every run while different specs get different places. Deliberately not
 * random: a suite whose place changes between runs cannot be compared with
 * its own previous run, which is the whole difficulty this set is fixing.
 */
export function jurisdictionFor(key: string): TestJurisdiction {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 0x7fffffff;
  }
  return TEST_JURISDICTIONS[hash % TEST_JURISDICTIONS.length]!;
}

/** What a caller means by a chamber, before knowing how many a state has. */
export type ChamberChoice = "lower" | "upper";

/**
 * Chamber keys the shipped packs use, lower chamber first.
 *
 * `legislature` is Nebraska's single chamber, which is neither a lower nor an
 * upper chamber because there is no other one. It answers to both.
 */
const LOWER_CHAMBER_KEYS = ["house", "assembly", "legislature"] as const;
const UPPER_CHAMBER_KEYS = ["senate", "legislature"] as const;

export function chamberKeyFor(
  jurisdiction: TestJurisdiction,
  choice: ChamberChoice,
): string {
  const wanted = choice === "lower" ? LOWER_CHAMBER_KEYS : UPPER_CHAMBER_KEYS;
  const found = wanted.find((key) => jurisdiction.chamberKeys.includes(key));
  if (!found) {
    throw new Error(
      `${jurisdiction.name} has no ${choice} chamber among ${jurisdiction.chamberKeys.join(", ")}`,
    );
  }
  return found;
}

/** `<packId>:<chamberKey>`, the office key the campaign browser offers. */
export function legislativeOfficeKey(
  jurisdiction: TestJurisdiction,
  choice: ChamberChoice = "lower",
): string {
  return `${jurisdiction.packId}:${chamberKeyFor(jurisdiction, choice)}`;
}

/**
 * Selects the state legislative seat the player's own place offers.
 *
 * Reads the office out of the browser the player is looking at rather than
 * naming one, so the same call works wherever the life was started. Returns
 * the key it chose, for a caller that wants to assert on it.
 */
export async function chooseStateLegislativeOffice(
  page: Page,
  choice: ChamberChoice = "lower",
): Promise<string> {
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toBeVisible();
  const keys = choice === "lower" ? LOWER_CHAMBER_KEYS : UPPER_CHAMBER_KEYS;
  for (const chamber of keys) {
    const radio = browser.locator(
      `input[name="campaign-office"][value$=":${chamber}"]`,
    );
    if ((await radio.count()) === 0) continue;
    const first = radio.first();
    await first.press("Space");
    await expect(first).toBeChecked();
    return (await first.getAttribute("value")) ?? "";
  }
  const offered = await browser
    .locator('input[name="campaign-office"]')
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );
  throw new Error(
    `No ${choice} state legislative seat on offer here; the browser offered ${offered.join(", ") || "nothing"}.`,
  );
}
