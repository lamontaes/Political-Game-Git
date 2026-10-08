import { describe, expect, it } from "vitest";
import {
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../../../life-queries";
import { lifePlaceStateIdentities } from "../../../life-places";
import { readEligibilityLawsInForce } from "../../../enacted-eligibility";
import { lawExposuresOf } from "../../../law-exposure";
import { snapParticipationRecords } from "../../../crisis/snap-participation";
import type { EntityId } from "../../../types";
import type { ResolvedLawConsequence } from "../../../law-consequence-types";
import { smallWorld } from "../../../../../tests/fixtures/small-world";
import {
  applySnapParticipation,
  SNAP_PARTICIPATION_ROW,
  SNAP_WORK_REQUIREMENT_QUESTION,
} from ".";

describe("SNAP work-requirement participation reaches household members", () => {
  it("records the law and participation chain for people in all 56 places", () => {
    for (const place of lifePlaceStateIdentities()) {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        household: true,
        laws: [SNAP_WORK_REQUIREMENT_QUESTION],
        seed: `lw15-snap-landing:${place.jurisdictionKey}`,
      });
      const { world: initial, personId, stateJurisdictionId } = fixture;
      const household = householdMembershipsAt(initial, personId)[0]?.household;
      expect(household, place.jurisdictionKey).toBeDefined();
      const law = readEligibilityLawsInForce(
        initial,
        stateJurisdictionId,
        [SNAP_WORK_REQUIREMENT_QUESTION],
        initial.currentDate,
      ).get(SNAP_WORK_REQUIREMENT_QUESTION);
      expect(law, place.jurisdictionKey).toBeDefined();

      const resolved: ResolvedLawConsequence = {
        row: SNAP_PARTICIPATION_ROW,
        law: law!,
        questionKey: SNAP_WORK_REQUIREMENT_QUESTION,
        jurisdictionId: stateJurisdictionId,
        subject: { kind: "household", id: household!.id },
        activityId:
          `lw15-snap-landing:${place.jurisdictionKey}:review` as EntityId,
        effectiveAt: initial.currentDate,
        sourceRecordIds: [],
        value: { type: "boolean", value: true },
      };
      const world = applySnapParticipation(initial, resolved);
      const participation = snapParticipationRecords(world).find(
        (record) =>
          record.kind === "snap-participation" &&
          record.householdId === household!.id,
      );
      expect(participation, place.jurisdictionKey).toBeDefined();

      for (const memberId of peopleInHouseholdAt(world, household!.id)) {
        expect(
          lawExposuresOf(world, memberId).some(
            (exposure) =>
              exposure.sourceRecordId === participation!.id &&
              exposure.measureId === law!.measureId &&
              exposure.sectionKey === SNAP_WORK_REQUIREMENT_QUESTION &&
              exposure.channel === "benefit" &&
              exposure.direction === "gain" &&
              exposure.relation === "own",
          ),
          `${place.jurisdictionKey}:${memberId}`,
        ).toBe(true);
      }
    }
  });
});
