import { describe, expect, it } from "vitest";

import { stateNameForUsps } from "../player/useWorldOrientation";
import { projectWorldOrientation } from "./living-world-orientation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  projectOpeningFamily,
  projectOpeningLegislature,
  projectOpeningTown,
  projectOpeningYear,
} from "./opening-story";
import { observerPlace, observerSetup } from "./observer-world";
import { openOrdinaryLife } from "./ordinary-life";
import { projectOrientationView } from "./world-orientation";

/**
 * The opening's new screens read only what the World records. These run on
 * real openings in three kinds of place: a consolidated city-county
 * (Lexington), a city with a seated mayor and a minor at home (Minneapolis),
 * and a statewide start in the one-chamber legislature (Nebraska).
 */
function opening(placeKey: string, startAge: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "opening-story-test",
      placeKey,
      startAge,
      depth: startAge >= 18 ? "summarize-earlier-life" : "play-formative-years",
    }),
  ).game!;
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  return { world, personId: game.playerPersonId };
}

const LEXINGTON = opening("2146027", 34);
const MINNEAPOLIS = opening("2743000", 12);
const NEBRASKA = opening("nebraska", 40);
const ALL = [LEXINGTON, MINNEAPOLIS, NEBRASKA];

describe("In the year 2026", () => {
  it("names the President, divides Congress, gives the economy and real headlines", () => {
    for (const { world, personId } of ALL) {
      const view = projectOpeningYear(
        world,
        personId,
        projectOrientationView(
          projectWorldOrientation(world, personId),
          stateNameForUsps,
        ),
      );
      expect(view.year).toBe(world.currentDate.slice(0, 4));
      expect(view.lines[0]).toMatch(/ is President/);
      expect(view.lines.some((line) => /Senate: \d+ /.test(line))).toBe(true);
      expect(
        view.lines.some((line) => /House of Representatives: \d+ /.test(line)),
      ).toBe(true);
      expect(
        view.lines.some((line) =>
          /\d\.\d% of people looking for work/.test(line),
        ),
      ).toBe(true);
      // Each headline is one the World published, not written here.
      const published = new Set(
        world.history.publications.map((publication) => publication.headline),
      );
      expect(view.headlines.length).toBeGreaterThan(0);
      expect(view.headlines.length).toBeLessThanOrEqual(2);
      for (const headline of view.headlines)
        expect(published.has(headline)).toBe(true);
    }
  });
});

describe("The Senate on the opening card", () => {
  // Lamontae's playtest showed 58 + 39 + 2 = 99 senators: the opening drew a
  // vacant seat and the card left it out. Places are drawn from all 56;
  // seed s99-b drew a vacant Hawaii seat before the fix.
  const senateCount = (line: string) =>
    [...line.matchAll(/(\d+) [A-Z]/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    );
  it.each(["senate-100-a", "s99-b"])(
    "seats 100 senators in a new world (seed %s)",
    (seed) => {
      const place = observerPlace(seed);
      const game = generateOpeningLife(
        prepareOpeningLife({ ...observerSetup(seed), startAge: 25 }),
      ).game!;
      const orientation = projectOrientationView(
        projectWorldOrientation(game.world, game.playerPersonId),
        stateNameForUsps,
      );
      const senate = orientation.steps
        .find((step) => step.key === "congress")!
        .chambers.find((chamber) => chamber.chamberKey === "us-senate")!;
      expect(senate.members, place.key).toBe(100);
      const line = projectOpeningYear(
        game.world,
        game.playerPersonId,
        orientation,
      ).lines.find((text) => text.startsWith("In the United States Senate"))!;
      expect(senateCount(line), `${place.key}: ${line}`).toBe(100);

      // A seat a death or resignation leaves empty is named, so the card
      // still accounts for all 100.
      const [first, ...rest] = senate.roster;
      const leaving = senate.parties.find(
        (party) =>
          party.partyOrganizationId ===
          (first!.person?.partyOrganizationId ?? null),
      )!;
      const withVacancy = {
        ...orientation,
        steps: orientation.steps.map((step) =>
          step.key !== "congress"
            ? step
            : {
                ...step,
                chambers: step.chambers.map((chamber) =>
                  chamber !== senate
                    ? chamber
                    : {
                        ...chamber,
                        members: 99,
                        vacancies: 1,
                        parties: chamber.parties.map((party) =>
                          party === leaving
                            ? { ...party, members: party.members - 1 }
                            : party,
                        ),
                        roster: [
                          {
                            ...first!,
                            status: "vacancy" as const,
                            person: null,
                          },
                          ...rest,
                        ],
                      },
                ),
              },
        ),
      };
      const vacantLine = projectOpeningYear(
        game.world,
        game.playerPersonId,
        withVacancy,
      ).lines.find((text) => text.startsWith("In the United States Senate"))!;
      expect(senateCount(vacantLine)).toBe(99);
      expect(vacantLine).toContain(`a ${first!.seatLabel} seat is vacant`);
    },
  );
});

describe("Your legislature", () => {
  it("names the body, counts each chamber by party, and names your own members", () => {
    const kentucky = projectOpeningLegislature(
      LEXINGTON.world,
      LEXINGTON.personId,
    );
    expect(kentucky.bodyName).toBe("Kentucky General Assembly");
    expect(kentucky.chambers).toHaveLength(2);
    for (const line of kentucky.chambers)
      expect(line).toMatch(
        /^Kentucky (House of Representatives|Senate): \d+ [A-Z]/,
      );
    // Party names, never internal keys.
    expect(kentucky.chambers.join(" ")).not.toMatch(
      /\b(republican|democratic)\b/,
    );
    expect(kentucky.yours).toHaveLength(2);
    for (const line of kentucky.yours)
      expect(line).toMatch(/ represents you in the /);

    const nebraska = projectOpeningLegislature(
      NEBRASKA.world,
      NEBRASKA.personId,
    );
    expect(nebraska.chambers).toHaveLength(1);
    expect(nebraska.chambers[0]).toMatch(/^Nebraska Legislature: \d+ /);
  });
});

describe("Your county and town", () => {
  it("names a seated mayor and the proposal people are weighing, and invents neither", () => {
    const minneapolis = projectOpeningTown(
      MINNEAPOLIS.world,
      MINNEAPOLIS.personId,
    );
    expect(minneapolis.officials.some((line) => /, Mayor of /.test(line))).toBe(
      true,
    );
    expect(minneapolis.matters.length).toBeGreaterThan(0);
    for (const matter of minneapolis.matters)
      expect(matter).toMatch(/posted a proposal/);
    // Lexington records no seated mayor, so none is named.
    expect(
      projectOpeningTown(LEXINGTON.world, LEXINGTON.personId).officials,
    ).toEqual([]);
  });
});

describe("Your family", () => {
  it("names parents and guardians with their recorded work, and your household", () => {
    const child = projectOpeningFamily(MINNEAPOLIS.world, MINNEAPOLIS.personId);
    expect(child.parents.length).toBeGreaterThan(0);
    for (const parent of child.parents)
      expect(parent.introduction).toMatch(
        /, your (mom|dad|mother|father|parent|guardian)/,
      );
    const adult = projectOpeningFamily(LEXINGTON.world, LEXINGTON.personId);
    expect(adult.parents.length).toBeGreaterThan(0);
    // Work is said only where a record holds it.
    for (const member of [
      ...adult.parents,
      ...adult.household,
      ...child.parents,
    ])
      if (member.work) expect(member.work).toMatch(/^an? /);
    // Nobody is listed as both a parent and a household member.
    const parents = new Set(child.parents.map((member) => member.personId));
    for (const member of child.household)
      expect(parents.has(member.personId)).toBe(false);
  });
});
