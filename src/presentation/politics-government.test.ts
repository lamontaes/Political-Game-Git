import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import { describe, expect, it } from "vitest";

import { lifePlaceSearch } from "../simulation";
import type { World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  GOVERNMENT_SCOPES,
  issuesPlaceForSelection,
  projectGovernmentBrowser,
} from "./politics-government";
import { politicsIssueAccess } from "./politics-issues";

function newLife(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

describe("Politics hub government browser", () => {
  it("keeps state and federal branches while showing only recorded local institutions", () => {
    const { world, personId } = newLife("ui-follow-government");
    for (const scope of GOVERNMENT_SCOPES) {
      const view = projectGovernmentBrowser(world, personId, { scope });
      expect(view.scope).toBe(scope);
      if (scope !== "local")
        expect(view.branches.map((branch) => branch.branch)).toEqual([
          "legislative",
          "executive",
          "judicial",
        ]);
      for (const branch of view.branches) {
        expect(branch.entries.length > 0).toBe(branch.absent === null);
        const text = [
          branch.absent ?? "",
          ...branch.entries.flatMap((entry) => [
            entry.title,
            entry.detail ?? "",
          ]),
        ].join(" ");
        expect(text).not.toMatch(/vacan/i);
      }
      for (const entry of view.branches.flatMap((branch) => branch.entries)) {
        expect(entry.holderPersonId === null).toBe(entry.holderName === null);
        if (entry.holderPersonId) {
          expect(world.people[entry.holderPersonId]).toBeDefined();
        }
      }
    }
  });

  it("keeps Buchanan's government identity out of legislative and executive branches", () => {
    const { world, personId } = newLife("w65-buchanan-government");
    const place = lifePlaceSearch("Buchanan", 10, {
      stateJurisdictionKey: "US-MI",
      scope: "locality",
    }).find((row) => row.displayName.includes("Buchanan"))!;
    expect(place).toBeDefined();
    const before = JSON.stringify(world);
    const view = projectGovernmentBrowser(world, personId, {
      jurisdictionId: place.context.jurisdiction.id,
    });
    expect(view.localGovernments.length).toBeGreaterThan(0);
    expect(
      view.localGovernments.some((row) => /Buchanan/.test(row.title)),
    ).toBe(true);
    expect(view.branches).toEqual([]);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("shows saved municipal members and managers without inventing missing seats", () => {
    const place = requireLifePlace("5114968");
    const government = municipalGovernmentForLifePlace(place)!;
    let world = createScenarioWorld("w65-saved-local-roster", place.context, {
      peopleCount: 8,
    });
    const personId = world.personOrder[0]!;
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    for (const [index, role] of (
      ["member", "professional-manager"] as const
    ).entries()) {
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId: world.personOrder[index + 1]!,
        startedAt: world.currentDate,
        role,
        seatLabel: role === "member" ? "Seat 1" : "City Manager",
      });
    }
    const before = JSON.stringify(world);
    const view = projectGovernmentBrowser(world, personId, {
      jurisdictionId: place.context.jurisdiction.id,
    });
    const body = view.branches.find((row) => row.branch === "legislative")!;
    expect(body.entries[0]!.roster?.map((row) => row.holderPersonId)).toEqual([
      world.personOrder[1],
    ]);
    expect(body.entries[0]!.rosterNote).toBeUndefined();
    expect(
      view.branches.find((row) => row.branch === "executive")!.entries[0]!
        .holderPersonId,
    ).toBe(world.personOrder[2]);
    expect(view.branches.some((row) => row.branch === "judicial")).toBe(false);
    expect(view.localGovernments).toEqual([]);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("retains a separately sourced mayor and saved holder without inventing a court", () => {
    const place = requireLifePlace("5167000");
    const government = municipalGovernmentForLifePlace(place)!;
    let world = createScenarioWorld("w65-richmond-mayor", place.context, {
      peopleCount: 8,
    });
    const personId = world.personOrder[0]!;
    world = installMunicipalGovernment(world, {
      governmentKey: government.key,
      jurisdictionId: place.context.jurisdiction.id,
      formedAt: world.currentDate,
    });
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: world.personOrder[1]!,
      startedAt: world.currentDate,
      role: "mayor",
      seatLabel: "Mayor",
    });
    const view = projectGovernmentBrowser(world, personId, {
      jurisdictionId: place.context.jurisdiction.id,
    });
    const office = view.branches
      .find((row) => row.branch === "executive")!
      .entries.find((row) => row.title === "Mayor")!;
    expect(office.holderPersonId).toBe(world.personOrder[1]);
    expect(view.branches.some((row) => row.branch === "judicial")).toBe(false);
  });

  it("defaults to where the character is and labels any other chosen place", () => {
    const { world, personId } = newLife("ui-follow-government-place");
    const here = projectGovernmentBrowser(world, personId);
    expect(here.browsing.isHere).toBe(true);
    expect(here.browsing.jurisdictionId).toBe(here.here.jurisdictionId);

    const alamo = lifePlaceSearch("Alamo", 5, {
      stateJurisdictionKey: "US-NV",
      scope: "locality",
    })[0];
    expect(alamo).toBeDefined();
    const before = JSON.stringify(world);
    const elsewhere = projectGovernmentBrowser(world, personId, {
      scope: "state",
      jurisdictionId: alamo!.context.jurisdiction.id,
    });
    expect(JSON.stringify(world)).toBe(before);
    expect(elsewhere.browsing.isHere).toBe(false);
    expect(elsewhere.browsing.isHome).toBe(false);
    expect(elsewhere.browsing.label).toBe(alamo!.displayName);
    expect(elsewhere.governs).toBe("Nevada");
  });

  it("never gives a state-scope place a local institution", () => {
    const { world, personId } = newLife("ui-follow-government-state");
    const nevada = lifePlaceSearch("Nevada", 20, { scope: "state" }).find(
      (place) => place.stateJurisdictionKey === "US-NV",
    );
    if (!nevada) return;
    const view = projectGovernmentBrowser(world, personId, {
      scope: "local",
      jurisdictionId: nevada.context.jurisdiction.id,
    });
    expect(view.branches.every((branch) => branch.entries.length === 0)).toBe(
      true,
    );
  });
});

function openingLife(seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed }),
  ).game!;
  return { world: game.world, personId: game.playerPersonId };
}

describe("Government rosters, representation and the Issues place", () => {
  const life = openingLife("ui46-politics-rosters");

  it("lists every Congress seat with its saved holder, recorded vacancy or no current record", () => {
    const view = projectGovernmentBrowser(life.world, life.personId, {
      scope: "federal",
    });
    const chambers = view.branches
      .find((branch) => branch.branch === "legislative")!
      .entries.filter((entry) => entry.counts);
    expect(chambers.map((entry) => entry.counts!.seats)).toEqual([100, 435]);
    for (const chamber of chambers) {
      const roster = chamber.roster!;
      const counts = chamber.counts!;
      expect(roster).toHaveLength(counts.seats);
      expect(roster.filter((row) => row.status === "member")).toHaveLength(
        counts.members,
      );
      expect(roster.filter((row) => row.status === "vacancy")).toHaveLength(
        counts.vacancies,
      );
      expect(
        roster.filter((row) => row.status === "no-current-record"),
      ).toHaveLength(counts.noCurrentRecord);
      for (const row of roster) {
        if (row.status === "member") {
          expect(life.world.people[row.holderPersonId!]).toBeDefined();
          expect(row.note).toBeNull();
        } else if (row.status === "vacancy") {
          expect(row.holderPersonId).toBeNull();
          // An American date and the recorded reason.
          expect(row.note).toMatch(
            /^Vacant since [A-Z][a-z]+ \d{1,2}, \d{4}\. It was already vacant when this world began\.$/,
          );
        }
      }
    }
  });

  it("says no current record, never vacant, when a seat's record is missing", () => {
    const view = projectGovernmentBrowser(life.world, life.personId, {
      scope: "federal",
    });
    const house = view.branches
      .find((branch) => branch.branch === "legislative")!
      .entries.find((entry) => entry.key === "chamber:us-house")!;
    const seatKey = house.roster!.find((row) => row.status === "member")!.key;
    const edited: World = {
      ...life.world,
      history: {
        ...life.world.history,
        events: life.world.history.events.filter(
          (event) => !event.tags.includes(`seat:${seatKey}`),
        ),
      },
    };
    const after = projectGovernmentBrowser(edited, life.personId, {
      scope: "federal",
    });
    const row = after.branches
      .find((branch) => branch.branch === "legislative")!
      .entries.find((entry) => entry.key === "chamber:us-house")!
      .roster!.find((entry) => entry.key === seatKey)!;
    expect(row.status).toBe("no-current-record");
    expect(row.holderPersonId).toBeNull();
    expect(row.note).toBeNull();
  });

  it("names who represents the home separately from Here and Home", () => {
    const view = projectGovernmentBrowser(life.world, life.personId);
    const rows = view.representedBy!;
    expect(rows).not.toBeNull();
    expect(rows.map((row) => row.key).slice(0, 2)).toEqual([
      "us-house",
      "us-senate",
    ]);
    const senate = rows.find((row) => row.key === "us-senate")!;
    expect(senate.holders).toHaveLength(2);
    const house = rows.find((row) => row.key === "us-house")!;
    // No district is guessed from a city name.
    if (house.district === null) {
      expect(house.holders).toHaveLength(0);
      expect(house.note).toMatch(/not recorded/);
    } else {
      expect(house.holders).toHaveLength(1);
    }
    for (const row of rows.filter((entry) => entry.key.startsWith("state:"))) {
      expect(row.holders).toHaveLength(0);
      expect(row.note).toBeTruthy();
    }
  });

  it("gives a state legislature its chambers without inventing members", () => {
    const view = projectGovernmentBrowser(life.world, life.personId, {
      scope: "state",
    });
    const legislative = view.branches.find(
      (branch) => branch.branch === "legislative",
    )!;
    for (const entry of legislative.entries.filter((item) =>
      item.key.startsWith("chamber:"),
    )) {
      expect(entry.roster ?? []).toHaveLength(0);
      expect(entry.rosterNote).toMatch(/No current record/);
    }
  });

  it("points Issues at the place chosen in Government and says which", () => {
    const { world, personId } = life;
    const here = issuesPlaceForSelection(world, personId, {
      place: "here",
      scope: "local",
    });
    const base = projectGovernmentBrowser(world, personId);
    expect(here.label.startsWith("Here: ")).toBe(true);
    if (here.jurisdictionId !== null)
      expect(here.jurisdictionId).toBe(base.here.jurisdictionId);
    const federal = issuesPlaceForSelection(world, personId, {
      place: "here",
      scope: "federal",
    });
    expect(federal.note).toMatch(/Federal public finances/);
    const home = issuesPlaceForSelection(world, personId, {
      place: "home",
      scope: "local",
    });
    if (base.home.jurisdictionId !== base.here.jurisdictionId) {
      expect(home.label.startsWith("Home: ")).toBe(true);
    } else {
      // With nothing to choose between, Home is simply Here.
      expect(home.label).toBe(here.label);
    }
  });

  it("does not offer transit or tax configuration to a citizen without office", () => {
    const { world, personId } = life;
    expect(politicsIssueAccess(world, personId)).toEqual({
      transit: false,
      tax: false,
    });
  });
});
