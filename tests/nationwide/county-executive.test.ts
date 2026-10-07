import { describe, expect, it } from "vitest";
import {
  electiveOfficesForJurisdiction,
  localGoverningBodiesForJurisdiction,
  localGoverningBodyIdentityForOfficeKey,
  searchLifePlaces,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import {
  allGovernmentUnits,
  type GovernmentUnitIdentity,
} from "../../src/simulation/government-units";
import { countyGoverningBodyRules } from "../../src/simulation/nationwide-world/county-governing-body-rules";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { sittingLocalOfficers } from "../../src/simulation/living-world/local-government-seats";
import { homeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";
import { organizationParticipationStateAt } from "../../src/simulation/life-queries";
import { SeededRng } from "../../src/simulation/rng";
import { addDays } from "../../src/simulation/dates";
import { fileForOffice } from "../../src/presentation/campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { suppliedWin } from "../fixtures/state-executive-entry";
import { resolveThroughOwnElection } from "../fixtures/due-item-clock";

/**
 * CO-3: a county reads its form of government and whether it has an elected
 * executive from the record (`county-governing-bodies.json`, `structure`), and
 * where it has one the executive is seated and a resident can run for it.
 * Counties and places are drawn by seed, never named here.
 */

const counties = allGovernmentUnits().filter(
  (unit) => unit.unitType === "county" && unit.functionalActive,
);

function randomCounty(
  seed: string,
  kind: "elected" | "none" | "unread",
): GovernmentUnitIdentity {
  const pool = counties.filter(
    (unit) => countyGoverningBodyRules(unit)?.executive.kind === kind,
  );
  expect(pool.length).toBeGreaterThan(0);
  return new SeededRng(`co3:${kind}:${seed}`).pick(pool);
}

describe("every county reads its structure and executive from the record", () => {
  it("gives each county a body, size, seat word, structure and executive, marked estimated where estimated", () => {
    let withStructure = 0;
    for (const unit of counties) {
      const rules = countyGoverningBodyRules(unit);
      if (!rules) continue;
      expect(rules.bodyName.length).toBeGreaterThan(0);
      expect(rules.memberTitle.length).toBeGreaterThan(0);
      expect(rules.seats).toBeGreaterThan(0);
      expect(["SOURCED", "ESTIMATED FROM AVERAGE"]).toContain(
        rules.executive.status,
      );
      if (rules.executive.kind === "elected")
        expect(rules.executive.title).not.toBeNull();
      expect(rules.chiefTitle).toBe(
        rules.executive.kind === "elected" ? rules.executive.title : null,
      );
      if (rules.structure) withStructure += 1;
    }
    expect(withStructure).toBeGreaterThan(0);
  });

  it.each(["a", "b", "c"])(
    "reads an elected executive, none, and an unread state in random counties (seed %s)",
    (seed) => {
      const elected = randomCounty(seed, "elected");
      const none = randomCounty(seed, "none");
      const unread = randomCounty(seed, "unread");
      const e = countyGoverningBodyRules(elected)!;
      expect(e.chiefTitle).toBe(e.executive.title);
      expect(countyGoverningBodyRules(none)!.chiefTitle).toBeNull();
      // A state where only some counties elect one asserts none for a county
      // the record does not name, rather than a guess.
      const u = countyGoverningBodyRules(unread)!;
      expect(u.chiefTitle).toBeNull();
      expect(u.executive.status).toBeDefined();
      console.log(
        JSON.stringify({
          seed,
          elected: `${elected.name} ${elected.stateUsps}: ${e.executive.title} (${e.executive.basis}, ${e.executive.status})`,
          none: `${none.name} ${none.stateUsps}`,
          unread: `${unread.name} ${unread.stateUsps}`,
        }),
      );
    },
  );
});

function openedAt(seed: string) {
  // A random state whose counties elect an executive, then a random town in it.
  const rng = new SeededRng(`co3-place:${seed}`);
  const states = lifePlaceStateIdentities().filter((state) =>
    counties.some(
      (unit) =>
        unit.stateUsps === state.usps &&
        countyGoverningBodyRules(unit)?.executive.kind === "elected",
    ),
  );
  const state = rng.pick(states);
  const towns = searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  const place = rng.pick(towns);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `co3-${seed}`,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    place,
    world: openOrdinaryLife(game.world, game.playerPersonId) as World,
    personId: game.playerPersonId as EntityId,
  };
}

describe.each(["x", "y"])(
  "a county with an elected executive in a random place (seed %s)",
  (seed) => {
    it(
      "seats the executive, offers it to the player, and a win replaces the holder",
      { timeout: 900_000 },
      () => {
        const { place, world, personId } = openedAt(seed);
        const home = world.people[personId]!.homeJurisdictionId;
        const units = homeLocalGovernmentUnits(world, personId).counties;
        const unit = units.find(
          (candidate) =>
            countyGoverningBodyRules(candidate)?.executive.kind === "elected",
        );
        if (!unit) return; // This town's county has no elected executive.
        const rules = countyGoverningBodyRules(unit)!;
        console.log(
          JSON.stringify({
            seed,
            place: `${place.displayName} (${place.key})`,
            county: unit.name,
            executive: rules.executive,
          }),
        );
        const seated = sittingLocalOfficers(world, unit).filter(
          (officer) => officer.mayor,
        );
        expect(seated).toHaveLength(1);
        expect(seated[0]!.seatLabel).toBe(rules.chiefTitle);

        const office = localGoverningBodiesForJurisdiction(home).find(
          (row) => row.unit.id === unit.id && row.seat === "chief-executive",
        )!;
        expect(office).toBeDefined();
        expect(office.officeTitle).toBe(rules.chiefTitle);
        expect(
          localGoverningBodyIdentityForOfficeKey(office.officeKey),
        ).toEqual(office);
        expect(
          electiveOfficesForJurisdiction(home).some(
            (option) => option.officeKey === office.officeKey,
          ),
        ).toBe(true);

        const filed = fileForOffice(
          world,
          personId,
          null,
          office.officeKey,
          addDays(world.currentDate, 3),
        );
        const decided = resolveThroughOwnElection(
          filed,
          personId,
          suppliedWin(personId),
        );
        const after = sittingLocalOfficers(decided, unit).filter(
          (officer) => officer.mayor,
        );
        expect(after.map((officer) => officer.personId)).toEqual([personId]);
        expect(
          organizationParticipationStateAt(decided, seated[0]!.participationId!)
            ?.status,
        ).toBe("ended");
      },
    );
  },
);
