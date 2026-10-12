import { advanceWorld } from "../../simulation/world";
import { localSeatCommand } from "./continuity";
import { municipalWorkspaceGovernmentForUnit } from "../../simulation/nationwide-world/local-governments";
import { municipalProcedureReading } from "../../simulation/municipal-government";
import { municipalSeats } from "../../simulation/municipal-public-work";
import { afterAll, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { governmentUnitsForState } from "../../simulation/government-units";
import { localGovernmentJurisdiction } from "../../simulation/nationwide-world/local-governments";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "../../simulation/living-world/local-government-seats";
import { townRoster } from "../../simulation/living-world/town-residents";
import * as legacy from "../../simulation/living-world/town-wards";
import { redrawTownWards } from "./ward-plans";

let drawnPlaces = 0;
afterAll(() => {
  expect(drawnPlaces).toBeGreaterThan(0);
});
it.each(Object.keys(STATES))(
  "redraw decisions through a generated and seated town in %s",
  (place) => {
    const available = governmentUnitsForState(place).filter(
      (unit) => unit.unitType === "municipality" && unit.placeGeoid,
    );
    const unit =
      available.find((unit) => {
        const jurisdiction = localGovernmentJurisdiction(unit);
        return (
          jurisdiction &&
          lifePlaceByJurisdictionId(jurisdiction.id) &&
          (legacy.councilWardPlan(unit)?.wardSeats ?? 0) >= 2
        );
      }) ??
      available.find((unit) => {
        const jurisdiction = localGovernmentJurisdiction(unit);
        return jurisdiction && lifePlaceByJurisdictionId(jurisdiction.id);
      });
    if (!unit) {
      const base = smallWorld({
        place,
        seed: "rules2-sendback-wards:" + place,
      });
      expect(
        redrawTownWards({
          unit: { id: base.jurisdictionId },
          plan: null,
          households: townRoster(base.jurisdictionId).households,
          homes: [],
          drawnBy: "council",
          onDate: base.world.currentDate,
          governingAnswer: null,
          alreadyRecorded: false,
        }),
      ).toBeNull();
      return;
    }
    const jurisdiction = localGovernmentJurisdiction(unit)!;
    const location = lifePlaceByJurisdictionId(jurisdiction.id)!;
    const base = smallWorld({
      place: location.key,
      seed: "rules2-sendback-wards:" + place,
    });
    const seatedWorld = ensureLocalGovernmentSeatsForUnit(
      base.world,
      unit,
      base.jurisdictionId,
    );
    const world = advanceWorld(seatedWorld, 1);
    const compiled = municipalWorkspaceGovernmentForUnit(unit);
    const bodySize = compiled
      ? municipalProcedureReading(compiled).bodySize
      : null;
    const before = compiled
      ? municipalSeats(base.world, compiled.key).filter(
          (row) => row.role === "member" || row.role === "presiding-member",
        ).length
      : 0;
    let precedingMembers = before;
    for (const row of sittingLocalOfficers(world, unit)) {
      const command = localSeatCommand(
        {
          compiled: !!compiled,
          mayor: row.mayor,
          bodySize,
          seatedMembers: precedingMembers,
          hasOrganization: true,
        },
        { personId: row.personId, seatLabel: row.seatLabel },
      );
      expect(command.member?.personId).toBe(row.personId);
      expect(command.action).toBe(
        compiled ? "install-and-seat" : "participate",
      );
      if (!row.mayor) precedingMembers++;
    }
    const plan = legacy.councilWardPlan(unit);
    const members = sittingLocalOfficers(world, unit).flatMap((row) => {
      const seat = /seat (\d+)$/.exec(row.seatLabel)?.[1];
      return !row.mayor && seat
        ? [{ seat: Number(seat), personId: row.personId }]
        : [];
    });
    for (const drawnBy of ["council", "commission"] as const) {
      const actual = redrawTownWards({
        unit,
        plan,
        households: townRoster(base.jurisdictionId).households,
        homes: members.map((row) => ({
          ...row,
          home: legacy.homePosition(world, base.jurisdictionId, row.personId),
        })),
        drawnBy,
        onDate: world.currentDate,
        alreadyRecorded: false,
        governingAnswer: legacy.wardCommissionLaw(
          world,
          base.jurisdictionId,
          world.currentDate,
        ),
      });
      const drawn = legacy.redrawTownWards(world, {
        unit,
        town: base.jurisdictionId,
        drawnBy,
        members,
        reason: "Generated world equivalence check.",
      });
      if (!actual) expect(drawn).toBe(world);
      else {
        drawnPlaces++;
        expect(actual.map).toEqual(legacy.townWardMap(drawn, unit));
        const event = drawn.history.events.at(-1)!;
        expect(!!event.lawEffectStamps?.length).toBe(
          actual.attributionEligible,
        );
      }
    }
  },
);
