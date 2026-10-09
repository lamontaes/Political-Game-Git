import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { ageOnDate } from "../simulation";

import { stateNameForUsps } from "./state-name";
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

const LEXINGTON = opening("lexington-fayette", 34);
const MINNEAPOLIS = opening("2743000", 12);
const NEBRASKA = opening("nebraska", 40);
const ALL = [LEXINGTON, MINNEAPOLIS, NEBRASKA];

describe("In the year 2026", () => {
  it("names the President, gives the economy and real headlines, and leaves Congress to its own stop", () => {
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
      // Record values under labels, never sentences (menu reset).
      const value = (label: RegExp) =>
        view.facts.find((fact) => label.test(fact.label))?.value;
      expect(view.facts[0]!.label).toBe("President");
      // Congress is told once, on its own stop beside its chart (owner
      // playtest, October 8, 2026: the year card counted it a second time).
      expect(
        view.facts.filter((fact) =>
          /Senate|House of Representatives/.test(fact.label),
        ),
      ).toEqual([]);
      expect(value(/^Unemployment$/)).toMatch(/^\d+\.\d%$/);
      expect(value(/^Prices over a year$/)).toMatch(/^[+-]?\d+\.\d%$/);
      for (const fact of view.facts)
        expect(`${fact.label} ${fact.value}`).not.toMatch(/[.!?]$/);
      // Every masthead and headline comes from the same published record.
      expect(view.publications.length).toBeLessThanOrEqual(2);
      for (const publication of view.publications)
        expect(world.history.publications).toContainEqual(
          expect.objectContaining(publication),
        );
    }
  });
});

describe("The Senate on the Congress stop", () => {
  // Lamontae's playtest showed 58 + 39 + 2 = 99 senators: the opening drew a
  // vacant seat and the card left it out. Places are drawn from all 56;
  // seed s99-b drew a vacant Hawaii seat before the fix. The year card no
  // longer counts Congress, so the stop's chart, which draws each party's
  // members, the vacant seats and the seats with no recorded holder, is the
  // one place that has to account for all 100.
  const seatsDrawn = (chamber: {
    readonly parties: readonly { readonly members: number }[];
    readonly vacancies: number;
    readonly unrecorded: number;
  }) =>
    chamber.parties.reduce((sum, party) => sum + party.members, 0) +
    chamber.vacancies +
    chamber.unrecorded;
  it.each(["senate-100-a", "s99-b"])(
    "seats 100 senators in a new world (seed %s)",
    (seed) => {
      const place = observerPlace(seed);
      const game = generateOpeningLife(
        prepareOpeningLife({ ...observerSetup(seed), startAge: 25 }),
      ).game!;
      const recorded = projectWorldOrientation(game.world, game.playerPersonId);
      const senateOf = (orientation: typeof recorded) =>
        projectOrientationView(orientation, stateNameForUsps)
          .steps.find((step) => step.key === "congress")!
          .chambers.find((chamber) => chamber.chamberKey === "us-senate")!;
      const senate = senateOf(recorded);
      expect(senate.members, place.key).toBe(100);
      expect(seatsDrawn(senate), place.key).toBe(100);

      // A seat a death or resignation leaves empty is counted, so the stop
      // still accounts for all 100.
      const chamber = recorded.congress!.senate;
      const leaving = chamber.seats.findIndex(
        (seat) =>
          seat.occupant.kind === "member" &&
          seat.occupant.member.partyOrganizationId !== null,
      );
      const occupant = chamber.seats[leaving]!.occupant;
      const party =
        occupant.kind === "member" ? occupant.member.partyOrganizationId : null;
      const withVacancy = senateOf({
        ...recorded,
        congress: {
          ...recorded.congress!,
          senate: {
            ...chamber,
            seats: chamber.seats.map((seat, index) =>
              index === leaving
                ? {
                    ...seat,
                    occupant: {
                      kind: "vacancy" as const,
                      since: game.world.currentDate,
                      eventId: "event_vacancy" as typeof chamber.organizationId,
                    },
                  }
                : seat,
            ),
            totals: {
              ...chamber.totals,
              members: chamber.totals.members - 1,
              vacancies: chamber.totals.vacancies + 1,
              byParty: chamber.totals.byParty.map((entry) =>
                entry.partyOrganizationId === party
                  ? { ...entry, members: entry.members - 1 }
                  : entry,
              ),
            },
          },
        },
      });
      expect(withVacancy.vacancies).toBe(senate.vacancies + 1);
      expect(seatsDrawn(withVacancy)).toBe(100);
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
    for (const chamber of kentucky.chambers) {
      expect(chamber.label).toMatch(
        /^Kentucky (House of Representatives|Senate)$/,
      );
      expect(chamber.value).toMatch(/^\d+ [A-Z]/);
    }
    // Party names, never internal keys.
    expect(
      kentucky.chambers.map((chamber) => chamber.value).join(" "),
    ).not.toMatch(/\b(republican|democratic)\b/);
    // Your own members: the office and district, then the member's name.
    expect(kentucky.yours).toHaveLength(2);
    for (const member of kentucky.yours) {
      expect(member.label).toMatch(/Senate|House/);
      expect(member.value).toMatch(/^[A-Z][a-z]+ /);
      expect(`${member.label} ${member.value}`).not.toMatch(/[.!?]$/);
    }

    const nebraska = projectOpeningLegislature(
      NEBRASKA.world,
      NEBRASKA.personId,
    );
    expect(nebraska.chambers).toHaveLength(1);
    expect(nebraska.chambers[0]!.label).toBe("Nebraska Legislature");
    expect(nebraska.chambers[0]!.value).toMatch(/^\d+ /);
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
    // No ready-made local proposal is seeded into a new life
    // (ensureLivingWorldDevelopments); a matter appears only once a real
    // writer records one, and then it is a posted proposal.
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

  const drawn = drawRandomPlace("opening-story-family");
  it(`gives each parent the age their birth record holds (${drawn.displayName}, seed opening-story-family)`, () => {
    // A child's opening in a place drawn from all 56, beside the two above.
    const life = opening(drawn.key, 12);
    for (const [world, personId] of [
      [LEXINGTON.world, LEXINGTON.personId],
      [MINNEAPOLIS.world, MINNEAPOLIS.personId],
      [life.world, life.personId],
    ] as const) {
      const family = projectOpeningFamily(world, personId);
      expect(family.parents.length).toBeGreaterThan(0);
      const own = ageOnDate(
        world.people[personId]!.birthDate,
        world.currentDate,
      );
      for (const member of [...family.parents, ...family.household])
        expect(member.age).toBe(
          ageOnDate(
            world.people[member.personId]!.birthDate,
            world.currentDate,
          ),
        );
      // A parent is older than the child they raised.
      for (const parent of family.parents)
        expect(parent.age).toBeGreaterThan(own);
    }
  });
});
