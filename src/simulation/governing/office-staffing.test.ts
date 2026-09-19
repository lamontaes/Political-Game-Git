import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import type { World } from "../types";
import {
  currentGoverningOffices,
  openTransitionMatters,
} from "./state-governing";
import {
  OFFICE_STAFFING_PROFILE,
  OFFICE_STAFF_POSITIONS,
  establishOfficeStaffPositions,
  officeStaffClass,
  officeStaffPositions,
  openOfficePositions,
} from "./office-staffing";

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

const CLASS_KEYS = OFFICE_STAFF_POSITIONS.map((position) => position.classKey);

describe("GOVERNING D1: an office has authorized positions, filled or not", () => {
  it("authorizes the profile's positions once and says what is authored", () => {
    const world = openingWorld("office-staffing");
    const office = currentGoverningOffices(world)[0]!;

    const first = establishOfficeStaffPositions(world, office);
    expect(first.established).toEqual(CLASS_KEYS);
    expect(officeStaffPositions(first.world, office)).toHaveLength(
      CLASS_KEYS.length,
    );

    for (const record of officeStaffPositions(first.world, office)) {
      // Every position says the staffing table is authored, not law.
      expect(record.profile).toBe(OFFICE_STAFFING_PROFILE);
      expect(record.civilClassBasis).toContain(OFFICE_STAFFING_PROFILE);
      expect(record.civilClassBasis.trim()).not.toBe("");
      // And says what the work is, so it reads as work and not as a slot.
      expect(record.duty.trim()).not.toBe("");
      expect(record.officeKey).toBe(office.officeKey);
    }

    // A second seating of the same office writes nothing at all.
    const second = establishOfficeStaffPositions(first.world, office);
    expect(second.established).toEqual([]);
    expect(second.alreadyAuthorized).toEqual(CLASS_KEYS);
    expect(serializeWorld(second.world)).toBe(serializeWorld(first.world));
  }, 600_000);

  it("takes the civil class from the compiled boundary and refuses to guess elsewhere", () => {
    const onDate = openingWorld("office-staffing-class").currentDate;

    // Minnesota HAS a compiled boundary, and at an ordinary start date the
    // class is still unknown — because the statute was observed in current
    // text on a date LATER than the world's, and observing a law today does
    // not establish it on an earlier day. The refusal is the source
    // discipline working, not a missing state.
    const atStart = officeStaffClass("MN", onDate);
    expect(atStart.civilClass).toBe("unknown");
    expect(atStart.basis).toMatch(/does not establish it on/);

    // On or after the observation, the compiled class is the state's own.
    const observed = "2026-09-06";
    const minnesota = officeStaffClass("MN", observed);
    expect(minnesota.civilClass).toBe("unclassified");
    expect(minnesota.basis).toMatch(/\d/); // carries the citation
    const alaska = officeStaffClass("AK", observed);
    expect(alaska.civilClass).toBe("exempt");

    // Kentucky has no compiled boundary at all, on any date.
    const kentucky = officeStaffClass("KY", observed);
    expect(kentucky.civilClass).toBe("unknown");
    expect(kentucky.basis).toMatch(/not compiled|no civil-service boundary/i);
    expect(kentucky.basis).toMatch(/unknown rather than guessed/);

    // None of them claims the staffing table itself is sourced.
    for (const reading of [atStart, minnesota, alaska, kentucky])
      expect(reading.basis).toContain(OFFICE_STAFFING_PROFILE);
  }, 600_000);

  it("seating opens the positions, and a hire fills only the one it is for", () => {
    const world = openingWorld("office-staffing-hire");
    const office = currentGoverningOffices(world)[0]!;

    const seated = openTransitionMatters(world, office.officeKey);
    expect(
      openOfficePositions(seated, office.officeKey)
        .map((row) => row.classKey)
        .sort(),
    ).toEqual([...CLASS_KEYS].sort());
    // Each opening says what the work is, so it is findable as work.
    for (const opening of openOfficePositions(seated, office.officeKey))
      expect(opening.duty.trim()).not.toBe("");

    // The officeholder decides the transition matter within its own window.
    const decided = advanceWorld(
      seated,
      25,
      createCampaignElectionTransitionRegistry(),
    );
    const stillOpen = openOfficePositions(decided, office.officeKey);
    const hired = decided.history.workRelationships.some(
      (relationship) =>
        relationship.organizationId === office.organizationId &&
        relationship.kind === "employment:executive-staff",
    );
    // A hire fills the chief of staff position; a lapse leaves it open.
    expect(
      stillOpen.some((row) => row.classKey === "office-chief-of-staff"),
    ).toBe(!hired);
    // Either way the other two are untouched and still open.
    expect(
      stillOpen
        .map((row) => row.classKey)
        .filter((key) => key !== "office-chief-of-staff")
        .sort(),
    ).toEqual(["office-constituent-services", "office-legislative-director"]);
  }, 600_000);
});
