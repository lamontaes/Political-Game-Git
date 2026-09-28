import { describe, expect, it } from "vitest";

import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { DOMESTIC_SCENE_IDS, SCENE_REGISTRY } from "./scene-registry";
import { savedRoleSummary, type SavedRoleSummary } from "./save-role-summary";
import { civicAmbientCycle } from "./title-ambient";
import {
  civicBackdropKind,
  civicTitlePictures,
  eligibleBackdropRow,
  isHomePlace,
  rolePlaceCandidates,
  rotationForSave,
  type BackdropManifestRow,
} from "./title-civic-rotation";
import type { EngineRecipe } from "./appearance-engine/pack";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import type { BrowserWorldSummary } from "./browser-world-repository";
import { titlePictureHero } from "./title-picture-hero";
import { TITLE_TABLEAU_REGISTRY } from "./title-tableau";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

/**
 * The title screen is civic (Lamontae, Sept. 27), shows every approved civic
 * picture rather than two rooms, and never opens on the apartment when there
 * is a saved game (Sept. 28). These run against the real backdrop manifest,
 * so a picture added to art/backdrops is checked the day it lands.
 */

const ROWS = manifest.backdrops as readonly BackdropManifestRow[];
// Every file resolves to a URL here; the build's own URL table is Vite's.
const PICTURES = civicTitlePictures(ROWS, (file) => `/art/backdrops/${file}`);
const CYCLE = civicAmbientCycle(
  TITLE_TABLEAU_REGISTRY,
  SCENE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
  PICTURES,
);
const HOMES = [
  "small-apartment",
  "rowhouse",
  "suburban-house",
  "large-house",
  "mobile-home",
  "rural-farmhouse",
];

describe("the title rotation", () => {
  it("contains no home", () => {
    for (const home of HOMES) {
      expect(isHomePlace(home), home).toBe(true);
      expect(civicBackdropKind(home), home).toBeNull();
    }
    for (const room of CYCLE) {
      expect(DOMESTIC_SCENE_IDS, room.sceneId).not.toContain(room.sceneId);
      expect(room.sceneId, room.sceneId).not.toMatch(/residence|apartment/);
      if (room.picture) expect(isHomePlace(room.picture.place)).toBe(false);
    }
    // Nor does the resolver's own registry hold a home any more.
    for (const tableau of [
      ...TITLE_TABLEAU_REGISTRY.tableaux,
      ...TITLE_TABLEAU_REGISTRY.neutralBank,
    ])
      expect(DOMESTIC_SCENE_IDS).not.toContain(tableau.sceneId);
  });

  it("includes every eligible civic backdrop, once", () => {
    const eligible = new Set(
      ROWS.filter(
        (row) => eligibleBackdropRow(row) && civicBackdropKind(row.place),
      ).map((row) => row.place),
    );
    const shown = CYCLE.flatMap((room) =>
      room.picture ? [room.picture.place] : [],
    );
    expect(new Set(shown)).toEqual(eligible);
    expect(shown.length).toBe(eligible.size);
  });

  it("finds the capitols, chambers, courts, city hall and campaign office by kind", () => {
    const shown = new Set(PICTURES.map((picture) => picture.place));
    const capitols = ROWS.filter((row) =>
      /^state-capitol-[a-z]{2}$/.test(row.place),
    ).map((row) => row.place);
    // 50 states, D.C. and five territories, each with its own picture.
    expect(new Set(capitols).size).toBe(56);
    for (const place of capitols) expect(shown.has(place), place).toBe(true);
    for (const place of [
      "oval-office",
      "us-capitol-exterior",
      "us-house-floor",
      "us-senate-floor",
      "state-legislative-chamber-bicameral",
      "council-chamber",
      "county-commission",
      "supreme-courtroom",
      "county-courtroom",
      "city-hall-exterior",
      "governor-office",
      "campaign-storefront",
    ])
      expect(shown.has(place), place).toBe(true);
    // A place with no civic purpose stays out, as a home does.
    for (const place of ["diner", "store", "factory-floor", "park"])
      expect(shown.has(place), place).toBe(false);
    // Both released registered civic rooms ride along.
    const scenes = CYCLE.filter((room) => !room.picture).map(
      (room) => room.sceneId,
    );
    expect(scenes).toEqual(
      expect.arrayContaining([
        "civic-hearing-room-production",
        "legislative-chamber-production",
      ]),
    );
  });

  it("finds a new capitol by its name, with no list to update", () => {
    const added = civicTitlePictures(
      [
        ...ROWS,
        {
          place: "state-capitol-zz",
          variant: "midday",
          file: "state-capitol-zz__midday.jpg",
          approval: "pending-owner-review-2026-09-28",
        },
      ],
      (file) => `/art/backdrops/${file}`,
    );
    expect(added.map((picture) => picture.place)).toContain("state-capitol-zz");
    // A rejected one does not.
    const rejected = civicTitlePictures(
      [
        {
          place: "state-capitol-zz",
          variant: "midday",
          file: "x.jpg",
          approval: "rejected-2026-09-28",
        },
      ],
      () => "/x.jpg",
    );
    expect(rejected).toEqual([]);
  });

  it("opens on the White House, and spreads the capitols through the rest", () => {
    expect(CYCLE[0]!.picture?.kind).toBe("white-house");
    let run = 0;
    let longest = 0;
    for (const room of CYCLE) {
      run = room.picture?.kind === "capitol" ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    // 59 capitols among about 25 other places: three in a row is the least
    // possible, and four (one minute at 15 seconds a picture) the most.
    expect(longest).toBeLessThanOrEqual(4);
  });
});

describe("a saved character's first picture", () => {
  const role = (
    kind: SavedRoleSummary["kind"],
    extra: Partial<SavedRoleSummary> = {},
  ): SavedRoleSummary => ({ kind, title: kind, stateUsps: "KY", ...extra });

  it("is their role's civic place", () => {
    const first = (value: SavedRoleSummary | null) =>
      rotationForSave(PICTURES, value).first?.place;
    expect(first(role("president"))).toBe("oval-office");
    expect(first(role("member-of-congress", { chamber: "senate" }))).toBe(
      "us-senate-floor",
    );
    expect(first(role("member-of-congress", { chamber: "house" }))).toBe(
      "us-house-floor",
    );
    expect(first(role("governor"))).toBe("governor-office");
    expect(first(role("state-legislator", { chamber: "senate" }))).toBe(
      "state-legislative-chamber-bicameral",
    );
    expect(first(role("state-legislator", { chamber: "unicameral" }))).toBe(
      "state-legislative-chamber-unicameral",
    );
    expect(first(role("council-member"))).toBe("council-chamber");
    expect(first(role("county-commissioner"))).toBe("county-commission");
    expect(first(role("mayor"))).toBe("city-hall-exterior");
    expect(first(role("judge", { court: "trial" }))).toBe("county-courtroom");
    expect(first(role("judge", { court: "supreme" }))).toBe(
      "supreme-courtroom",
    );
    expect(first(role("candidate"))).toBe("campaign-storefront");
    // Nothing narrower: their own state's capitol.
    expect(first(role("state-executive"))).toBe("state-capitol-ky");
    expect(first(role("public-servant", { workplace: "legislature" }))).toBe(
      "state-capitol-ky",
    );
  });

  it("is the town's city hall, not home, when they hold no role", () => {
    expect(rotationForSave(PICTURES, null).first?.place).toBe(
      "city-hall-exterior",
    );
    for (const kind of [
      "president",
      "judge",
      "candidate",
      "public-servant",
    ] as const)
      for (const place of rolePlaceCandidates(role(kind)))
        expect(isHomePlace(place), place).toBe(false);
  });

  it("puts the role's place first and keeps every other picture after it", () => {
    const { first, rest } = rotationForSave(PICTURES, role("judge"));
    expect(first?.place).toBe("county-courtroom");
    expect(rest.length).toBe(PICTURES.length - 1);
    expect(rest.map((picture) => picture.place)).not.toContain(
      "county-courtroom",
    );
  });
});

describe("the role a save records", () => {
  it("names a sitting legislator's seat, from the canonical records", () => {
    const fixture = recordedTermFixture("player");
    const world = enterSupportedTerm(fixture.world, fixture.personId);
    const role = savedRoleSummary(world, fixture.personId);
    expect(role?.kind).toBe("state-legislator");
    expect(role?.title.length).toBeGreaterThan(0);
    expect(role?.stateUsps).toMatch(/^[A-Z]{2}$/);
    const first = rotationForSave(PICTURES, role).first?.place ?? "";
    expect(civicBackdropKind(first)).not.toBeNull();
  });

  it("records nothing for a life before it holds a seat", () => {
    const fixture = recordedTermFixture("player");
    expect(savedRoleSummary(fixture.world, fixture.personId)?.kind).not.toBe(
      "state-legislator",
    );
  });
});

describe("the saved character in front of their place", () => {
  const pack = PEOPLE_PACK.presentations.feminine;
  const look: EngineRecipe = {
    presentation: "feminine",
    build: "average",
    shade: 4,
    face: pack.faces[0]!.id,
    hair: pack.hair[0]!.id,
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
  };
  const saved = (role: SavedRoleSummary | undefined) =>
    ({
      saveId: "save-1",
      playerPersonId: "person-1",
      playerName: "Ada Moss",
      playerAge: 52,
      residence: null,
      playerLooks: { casual: look, business: look, formal: look },
      ...(role ? { playerRole: role } : {}),
    }) as unknown as BrowserWorldSummary;

  it("is posed for their role", () => {
    const legislator = titlePictureHero(
      saved({
        kind: "state-legislator",
        title: "State Senator",
        stateUsps: "KY",
      }),
      "state-legislative-chamber-bicameral",
    );
    expect(legislator?.engine.pose).toBe("podium");
    const judge = titlePictureHero(
      saved({ kind: "judge", title: "Judge", stateUsps: "KY" }),
      "county-courtroom",
    );
    expect(judge?.engine.pose).toBe("seated");
    expect(
      titlePictureHero(saved(undefined), "city-hall-exterior")?.engine.pose,
    ).toBe("arms-folded");
  });

  it("draws nobody for a watched world or a save with no look", () => {
    expect(
      titlePictureHero(
        { ...saved(undefined), observing: true } as BrowserWorldSummary,
        "city-hall-exterior",
      ),
    ).toBeNull();
    expect(
      titlePictureHero(
        { ...saved(undefined), playerLooks: undefined } as BrowserWorldSummary,
        "city-hall-exterior",
      ),
    ).toBeNull();
  });
});
