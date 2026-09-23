import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { projectGoverningOfficeDesk } from "../../presentation/governing-office-desk";
import type { World } from "../types";
import { searchLifePlaces } from "../index";
import {
  executiveStaffOffice,
  hireOfficeStaff,
  officeStaffingView,
  openOfficeStaffSearch,
} from "./office-staff-hiring";
import { officeStaffPositions } from "./office-staffing";
import {
  currentGoverningOffices,
  governingOfficeForPerson,
  openTransitionMatters,
} from "./state-governing";

/** Plays as the sitting governor of Oregon: a test fixture's control swap. */
function asGovernor(seed: string): World {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const office = currentGoverningOffices(game.world).find(
    (entry) => entry.stateUsps === "OR",
  )!;
  return {
    ...game.world,
    control: { kind: "person", personId: office.holderPersonId },
  };
}

describe("a governor fills the office's other positions", () => {
  it("hires a Legislative Director and a Caseworker; the chief of staff stays with the transition", () => {
    let world = asGovernor("governor-staff-hiring");
    const holder =
      world.control.kind === "person" ? world.control.personId : null;
    const office = governingOfficeForPerson(world, holder!)!;
    expect(office.controlledByPlayer).toBe(true);
    world = openTransitionMatters(world, office.officeKey);
    const staffable = executiveStaffOffice(office);

    const searched = openOfficeStaffSearch(world, staffable);
    if (searched.kind !== "done") throw new Error(searched.reason);
    world = searched.world;
    const view = officeStaffingView(world, staffable);
    expect(view.openings.map((opening) => opening.title)).toEqual([
      "Legislative Director",
      "Constituent Services Caseworker",
    ]);

    const director = view.openings[0]!;
    const hired = hireOfficeStaff(world, staffable, {
      positionId: director.positionId,
      personId: director.candidates[0]!.personId,
    });
    if (hired.kind !== "done") throw new Error(hired.reason);
    world = hired.world;

    const desk = projectGoverningOfficeDesk(world, holder!)!;
    expect(desk.staff.map((member) => member.personId)).toContain(
      director.candidates[0]!.personId,
    );
    expect(
      desk.staff.find(
        (member) => member.personId === director.candidates[0]!.personId,
      )?.roleTitle,
    ).toBe("Legislative Director");

    // The chief of staff is not offered or hired from this list.
    const chief = officeStaffPositions(world, office).find(
      (position) => position.classKey === "office-chief-of-staff",
    )!;
    expect(
      hireOfficeStaff(world, staffable, {
        positionId: chief.id,
        personId: director.candidates[1]!.personId,
      }).kind,
    ).toBe("refused");
  }, 600_000);
});
