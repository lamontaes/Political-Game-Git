import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import { planStateChambers } from "../../simulation/nationwide-world/state-legislature-opening";
import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../../tests/fixtures/enact-through-desk";
import { STATES } from "../../simulation/state-reference";
import { legislativePackForJurisdiction } from "../../simulation/legislative-institutions";
import { introduceMeasure } from "../../simulation/legislation";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "../../simulation/legislation-scenarios";
import {
  candidacyEligibility,
  electiveOfficesForJurisdiction,
} from "../../simulation/candidacy";
import {
  fileRuleChangeProvision,
  enactedRuleChangeAt,
} from "../../simulation/enacted-rule-changes";
import { ageOnDate } from "../../simulation/dates";
import { stateResidenceSince } from "../../simulation/nationwide-world/residence-duration";
import { recordedDistrictResidenceSince } from "../../simulation/district-residence";
import { gazetteerChamberForOfficeChamberKey } from "../../districts/query";
import { enactedQualificationAssessments } from "./enacted-qualification";

it.each(Object.keys(STATES))(
  "enacted qualification helper through public candidacy in generated %s",
  (place) => {
    const base = smallWorld({
      place,
      offices: ["governor"],
      seed: "rules2-sendback-enacted:" + place,
    });
    let world = base.world;
    const pack = legislativePackForJurisdiction(base.stateJurisdictionId);
    const option = electiveOfficesForJurisdiction(base.jurisdictionId).find(
      (row) => row.officeKey.startsWith(pack?.packId ?? ""),
    );
    if (!pack || !option) {
      expect(
        enactedQualificationAssessments([], {
          age: ageOnDate(
            world.people[base.personId]!.birthDate,
            world.currentDate,
          ),
          stateResidenceSince: null,
          districtResidenceSince: null,
          districtIsUnknown: false,
          onDate: world.currentDate,
        }),
      ).toEqual([]);
      return;
    }
    world = introduceMeasure(world, {
      stableKey: "rules2:qualification-bill",
      jurisdictionId: base.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "Qualification control",
      shortTitle: "Qualification control",
      summary: "Public writer qualification control.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: null,
      originChamberKey: pack.chamberOrder[0]!,
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    const age = ageOnDate(
      world.people[base.personId]!.birthDate,
      world.currentDate,
    );
    const fields = [
      [
        "qualification.minimumAge",
        "MINIMUM_AGE",
        Math.min(100, Math.max(18, age + 1)),
      ],
      ["qualification.stateResidenceYears", "STATE_RESIDENCE", 0],
      ["qualification.districtResidenceYears", "DISTRICT_RESIDENCE", 1],
    ] as const;
    for (const [field, , value] of fields)
      world = fileRuleChangeProvision(world, {
        stableKey: "rules2:qualification:" + field,
        measureId,
        officeKey: option.officeKey,
        field,
        value,
      });
    const bodies = pack.chambers.map((chamber) =>
      seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        chamber.seats.kind === "known"
          ? chamber.seats.value
          : (planStateChambers(
              stateCandidacyPack("US-" + place)!,
            ).chambers.find((row) => row.chamberKey === chamber.chamberKey)
              ?.size ?? authoredScenarioSeatCount(pack, chamber.chamberKey)),
        [],
        true,
      ),
    );
    const votePlan: Record<string, { yea: number }> = {};
    for (const chamber of pack.chambers) {
      for (const committee of chamber.committees)
        votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
          yea: committee.appointedMembers ?? 7,
        };
      for (const stage of chamber.floorStages)
        votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
          yea: bodies.find((body) => body.chamberKey === chamber.chamberKey)!
            .members.length,
        };
    }
    world = enactThroughDesk(world, measureId, {
      effectiveAt: world.currentDate,
      context: {
        pack,
        measureId,
        bodies,
        votePlan,
        committeeMemberCount:
          pack.chambers[0]!.committees[0]?.appointedMembers ?? 7,
        governorAction: "signed",
        governorRationale: "Authored institutional control.",
      },
    });
    const changes = fields.flatMap(([field, assessmentField]) => {
      const change = enactedRuleChangeAt(world, {
        stateUsps: place,
        officeKey: option.officeKey,
        field,
        onDate: world.currentDate,
      });
      return change
        ? [{ field, assessmentField, value: change.value as number }]
        : [];
    });
    expect(changes).toHaveLength(3);
    const chamber = gazetteerChamberForOfficeChamberKey(
      option.officeKey.split(":").at(-1)!,
    );
    const actual = enactedQualificationAssessments(changes, {
      age: ageOnDate(world.people[base.personId]!.birthDate, world.currentDate),
      onDate: world.currentDate,
      stateResidenceSince: stateResidenceSince(
        world,
        base.personId,
        "US-" + place,
        world.currentDate,
      ),
      districtResidenceSince: chamber
        ? recordedDistrictResidenceSince(
            world,
            base.personId,
            chamber,
            world.currentDate,
          )
        : null,
      districtIsUnknown: false,
    });
    const legacy = candidacyEligibility(world, {
      personId: base.personId,
      jurisdictionId: base.jurisdictionId,
      officeKey: option.officeKey,
      alreadyACandidate: false,
    }).qualificationAssessments;
    expect(actual).toEqual(
      legacy
        .filter((row) =>
          changes.some((change) => change.assessmentField === row.field),
        )
        .map((row) => ({
          field: row.field,
          verdict: row.verdict,
          source: row.source,
        })),
    );
  },
);
