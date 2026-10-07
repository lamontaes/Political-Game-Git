import { describe, expect, it } from "vitest";

import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  enterSupportedTerm,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import { DOMESTIC_SCENE_IDS } from "./scene-registry";
import { savedRoleSummary, type SavedRoleSummary } from "./save-role-summary";
import { civicAmbientCycle } from "./title-ambient";
import {
  civicBackdropKind,
  civicTitlePictures,
  eligibleBackdropRow,
  isHomePlace,
  isNationalPlace,
  rolePlaceCandidates,
  pictureForChosenState,
  pictureForChosenTown,
  rotationForSave,
  titlePictureId,
  TITLE_LIGHTS,
  type BackdropManifestRow,
} from "./title-civic-rotation";
import { TITLE_TABLEAU_REGISTRY } from "./title-tableau";

/**
 * The title screen is civic (Lamontae, Sept. 27), never opens on the
 * apartment when there is a saved game (Sept. 28), and shows the places the
 * whole country recognizes, not state capitols or a town's rooms (Oct. 7).
 * These run against the real backdrop manifest, so a picture added to
 * art/backdrops is checked the day it lands.
 */

const ROWS = manifest.backdrops as readonly BackdropManifestRow[];
// Every file resolves to a URL here; the build's own URL table is Vite's.
const urlFor = (file: string) => `/art/backdrops/${file}`;
const PICTURES = civicTitlePictures(ROWS, urlFor);
const CYCLE = civicAmbientCycle(PICTURES);
const HOMES = [
  "small-apartment",
  "rowhouse",
  "suburban-house",
  "large-house",
  "mobile-home",
  "rural-farmhouse",
];
const NATIONAL = [
  "oval-office",
  "us-capitol-exterior",
  "us-senate-floor",
  "us-house-floor",
  "supreme-courtroom",
  "rally-stage",
  "convention-hall",
  "debate-stage",
  "election-night-venue",
  "tv-studio",
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

  it("includes every eligible national picture, by day and at night, once", () => {
    const eligible = new Set(
      ROWS.filter(
        (row) =>
          eligibleBackdropRow(row) &&
          isNationalPlace(row.place) &&
          civicBackdropKind(row.place),
      ).map((row) => titlePictureId(row)),
    );
    const shown = CYCLE.map((room) => room.sceneId);
    expect(new Set(shown)).toEqual(eligible);
    expect(shown.length).toBe(eligible.size);
    for (const room of CYCLE)
      expect(TITLE_LIGHTS).toContain(room.picture!.variant);
  });

  it("shows the nation's places and no state's, county's or town's", () => {
    const shown = new Set(PICTURES.map((picture) => picture.place));
    for (const place of NATIONAL) {
      expect(shown.has(place), place).toBe(true);
      // The White House at night, and every other national place too.
      expect(
        PICTURES.some((p) => p.place === place && p.variant === "night"),
        `${place} at night`,
      ).toBe(true);
    }
    for (const place of shown) expect(isNationalPlace(place), place).toBe(true);
    const local = ROWS.map((row) => row.place).filter(
      (place) =>
        /^state-|^county-|city-hall|council|clerk|town-hall|public-meeting|township|school-board|governor|mayor|campaign-storefront/.test(
          place,
        ),
    );
    // 50 states, D.C. and five territories, each with its own capitol.
    expect(
      new Set(local.filter((place) => /^state-capitol-[a-z]{2}$/.test(place)))
        .size,
    ).toBe(56);
    for (const place of local) expect(shown.has(place), place).toBe(false);
    for (const place of ["diner", "store", "factory-floor", "park"])
      expect(shown.has(place), place).toBe(false);
  });

  it("finds a new national picture by its name, with no list to update", () => {
    const added = civicTitlePictures(
      [
        ...ROWS,
        {
          place: "us-capitol-rotunda",
          variant: "midday",
          file: "us-capitol-rotunda__midday.jpg",
          approval: "pending-owner-review-2026-10-07",
        },
        {
          place: "state-capitol-zz",
          variant: "midday",
          file: "state-capitol-zz__midday.jpg",
          approval: "pending-owner-review-2026-10-07",
        },
      ],
      urlFor,
    ).map((picture) => picture.place);
    expect(added).toContain("us-capitol-rotunda");
    // A new state capitol does not join, and a rejected picture never does.
    expect(added).not.toContain("state-capitol-zz");
    expect(
      civicTitlePictures(
        [
          {
            place: "us-capitol-exterior",
            variant: "midday",
            file: "x.jpg",
            approval: "rejected-2026-10-07",
          },
        ],
        () => "/x.jpg",
      ),
    ).toEqual([]);
  });

  it("opens on the White House by day, and spreads each kind through the rest", () => {
    expect(CYCLE[0]!.picture?.kind).toBe("white-house");
    expect(CYCLE[0]!.picture?.variant).toBe("midday");
    let run = 0;
    let longest = 0;
    for (const room of CYCLE.slice(1)) {
      run = room.picture?.kind === "campaign" ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest).toBeLessThanOrEqual(2);
    // Each place is met by day before it is met at night.
    for (const place of NATIONAL) {
      const day = CYCLE.findIndex(
        (room) => room.picture?.place === place && room.picture.variant === "midday",
      );
      const night = CYCLE.findIndex(
        (room) => room.picture?.place === place && room.picture.variant === "night",
      );
      expect(day, place).toBeLessThan(night);
    }
  });
});

describe("a saved character's first picture", () => {
  const role = (
    kind: SavedRoleSummary["kind"],
    extra: Partial<SavedRoleSummary> = {},
  ): SavedRoleSummary => ({ kind, title: kind, stateUsps: "KY", ...extra });

  it("is their role's own federal room by day, else a national scene", () => {
    const first = (value: SavedRoleSummary | null) => {
      const picture = rotationForSave(PICTURES, value).first;
      expect(picture?.variant).toBe("midday");
      return picture?.place;
    };
    expect(first(role("president"))).toBe("oval-office");
    expect(first(role("member-of-congress", { chamber: "senate" }))).toBe(
      "us-senate-floor",
    );
    expect(first(role("member-of-congress", { chamber: "house" }))).toBe(
      "us-house-floor",
    );
    expect(first(role("judge", { court: "supreme" }))).toBe(
      "supreme-courtroom",
    );
    expect(first(role("candidate"))).toBe("rally-stage");
    // No federal room of their own: the U.S. Capitol, never their state's.
    for (const value of [
      role("governor"),
      role("state-legislator", { chamber: "senate" }),
      role("state-executive"),
      role("council-member"),
      role("county-commissioner"),
      role("mayor"),
      role("judge", { court: "trial" }),
      role("public-servant", { workplace: "legislature" }),
      null,
    ])
      expect(first(value), value?.kind ?? "no role").toBe(
        "us-capitol-exterior",
      );
  });

  it("is never a state capitol, a town's room or a home", () => {
    for (const kind of [
      "president",
      "governor",
      "judge",
      "candidate",
      "mayor",
      "public-servant",
    ] as const)
      for (const place of rolePlaceCandidates(role(kind))) {
        expect(isHomePlace(place), place).toBe(false);
        expect(isNationalPlace(place), place).toBe(true);
      }
  });

  it("puts the role's place first and keeps every other picture after it", () => {
    const { first, rest } = rotationForSave(
      PICTURES,
      role("judge", { court: "supreme" }),
    );
    expect(first?.place).toBe("supreme-courtroom");
    expect(rest.length).toBe(PICTURES.length - 1);
    expect(rest).not.toContain(first);
    // The courtroom at night stays in its turn.
    expect(
      rest.some((p) => p.place === "supreme-courtroom" && p.variant === "night"),
    ).toBe(true);
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
    expect(isNationalPlace(first), first).toBe(true);
  });

  it("records nothing for a life before it holds a seat", () => {
    const fixture = recordedTermFixture("player");
    expect(savedRoleSummary(fixture.world, fixture.personId)?.kind).not.toBe(
      "state-legislator",
    );
  });
});

describe("OW-4: the creator's backdrop follows the chosen state", () => {
  const capitols = [
    ...new Set(
      ROWS.filter(
        (row) =>
          /^state-capitol-[a-z]{2}$/.test(row.place) &&
          row.variant === "midday",
      ).map((row) => row.place),
    ),
  ];

  it("paints the chosen state's own capitol by day, never the White House", () => {
    expect(capitols.length).toBeGreaterThan(0);
    // A place drawn from every capitol the build paints, named in the message.
    const index = Math.floor(Math.random() * capitols.length);
    const capitol = capitols[index]!;
    const usps = capitol.slice(-2).toUpperCase();
    const chosen = pictureForChosenState(ROWS, urlFor, usps);
    expect(chosen?.place, `state ${usps}`).toBe(capitol);
    expect(chosen?.variant).toBe("midday");
    expect(chosen?.kind).toBe("capitol");
  });

  it("returns nothing for a state the build has no capitol for", () => {
    expect(pictureForChosenState(ROWS, urlFor, "ZZ")).toBeNull();
  });
});

describe("OW-4/OW-19: once a town is chosen, its city hall leads", () => {
  const url = (place: string) => `/art/backdrops/${place}.png`;

  it("takes city hall only where staged and painted, never the main street", () => {
    const both = new Set(["main-street", "city-hall-exterior"]);
    expect(pictureForChosenTown(both, url)?.place).toBe("city-hall-exterior");
    expect(pictureForChosenTown(new Set(["main-street"]), url)).toBeNull();
    expect(pictureForChosenTown(new Set(), url)).toBeNull();
  });
});
