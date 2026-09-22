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
  /** What an ordinary forty-year-old can do about a seat here, today. */
  readonly candidacy: CandidacyToday;
  /** Why this place is in the set, rather than any other town. */
  readonly note: string;
}

/**
 * What the game actually lets a new life do about a legislative seat.
 *
 * Recorded per state rather than assumed, because running the set showed it is
 * not the same everywhere, and the differences are findings rather than noise.
 * Four of the nine refuse an ordinary forty-year-old a candidacy on the
 * January 5, 2026 start date, for three different reasons, and one of those
 * reasons says nothing to the player at all.
 *
 * `because` is asserted against what the campaign surface actually says, so a
 * state whose refusal changes shape fails rather than passing on the old
 * wording, and a state that starts working fails too and can be promoted to
 * `stands`.
 *
 * It is a LIST of fragments, all of which must appear, and each fragment is
 * chosen to be the part of the sentence that carries the meaning rather than
 * the part that carries the voice.
 *
 * That distinction was paid for. These rows held whole sentences, and two
 * separate pieces of work then rewrote those sentences without changing a
 * single verdict: the sweep that took statute citations off player screens,
 * and the change that made a town split across several districts say so. Both
 * were improvements to prose, and both turned this file red, which held a
 * correct branch out of main as a manual click. A row that pins a whole
 * sentence is a veto over the wording of a screen this file does not own.
 *
 * So a fragment here must survive an honest rewording and must not survive a
 * changed answer. "The district-residence rule requires 1 year" holds through
 * every rewrite of why the year cannot be counted, and disappears the moment
 * the rule stops being asked about. A fragment that merely names the state, or
 * the word "cannot", would pass on a blank refusal and is not good enough.
 *
 * What still catches a state that starts working is `kind`, checked first and
 * separately: a jurisdiction that begins offering seats fails on the office
 * browser being present, before any sentence is read.
 */
export type CandidacyToday =
  /** Seats on offer, and the lower chamber can be filed for. */
  | { readonly kind: "stands" }
  /** No office browser at all; the surface says why, or should. */
  | { readonly kind: "no-seats"; readonly because: readonly string[] }
  /** Seats on offer, but filing is not available; the surface says why. */
  | { readonly kind: "cannot-file"; readonly because: readonly string[] };

export const TEST_JURISDICTIONS: readonly TestJurisdiction[] = [
  {
    name: "Lexington, Kentucky",
    state: "Kentucky",
    place: "Lexington",
    placeKey: "lexington-fayette",
    packId: "us-ky-general-assembly-v1",
    chamberKeys: ["house", "senate"],
    municipal: true,
    candidacy: { kind: "stands" },
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
    candidacy: {
      kind: "no-seats",
      /*
       * This used to assert the citation, the observation date and the play
       * date in one sentence. The citation sweep replaced the sentence
       * outright rather than trimming a prefix, because those dates were
       * provenance sitting in the body of a player-facing line.
       *
       * What is kept is the refusal's two loads: that the rules exist and that
       * the game will not place them in this time. What is dropped is every
       * date. One thing the row can no longer do is vary with the play date —
       * the same rows at 1900 and at 2026 produce this character for
       * character. Written down rather than left to be found later as a test
       * that quietly stopped discriminating.
       */
      because: [
        "The game knows Nebraska's rules for who may stand",
        "not whether they were already in force this far back",
      ],
    },
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
    candidacy: { kind: "stands" },
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
    candidacy: {
      kind: "no-seats",
      /*
       * Alaska still refuses. What changed is the reason, not the answer.
       *
       * Measured in the browser on this head: the refusal a player reads is
       * now the district-residence one — the rule asks for a year and the
       * world holds no proved start date for the interval, so the question
       * cannot be answered either way. It used to be the observation-date
       * refusal about minimum age. Why it moved is not established here and
       * this comment does not guess: the office-qualification corpus carries
       * no Alaska rows at all (69 rows, MA MN MO NE NJ NV OH), so Alaska's
       * requirements come from its legislature pack rather than from the
       * sourced-row path, and the two paths refuse for different reasons.
       *
       * The flip to "stands" that was expected here does not happen. An
       * ordinary browser start records no proved residence interval, and this
       * branch's candidacy work is reached through lives that do. Nebraska and
       * Minnesota do not flip either: their rows are still CURRENT_OBSERVATION
       * on this head, 13 and 6, so they refuse exactly as recorded below.
       */
      /*
       * Only the rule and its length. The clause explaining why the year
       * cannot be counted has been rewritten once already — from "the world
       * has no proved start date for that residence interval" to the
       * split-district explanation — with the verdict unmoved both times.
       */
      because: ["The district-residence rule requires 1 year"],
    },
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
    candidacy: {
      kind: "cannot-file",
      because: ["Upcoming election timing is not established in this save"],
    },
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
    candidacy: { kind: "stands" },
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
    candidacy: {
      kind: "no-seats",
      /*
       * The requirement, not the reason it cannot be answered. Ohio comes
       * through the sourced-row path and Anchorage through the legislature
       * pack, and the two produce different sentences for the same underlying
       * refusal; the branch that makes a split town say so changes this one's
       * second half and not its first.
       */
      because: ["This office requires 1 year of residence"],
    },
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
    candidacy: { kind: "stands" },
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
    candidacy: { kind: "stands" },
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
