import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import {
  bindingFromIdentity,
  listDistrictIdentities,
} from "../districts/query";
import {
  assertWorldIntegrity,
  createWorkRelationships,
  deserializeWorld,
  districtResidenceIntervals,
  legislativeTermForRelationship,
  migrateLegacyLegislativeSeats,
  serializeWorld,
  workRoleAt,
  workStatusAt,
  type World,
} from "../simulation";
import {
  campaignSeatHolders,
  ensureStateLegislatureOpening,
  STATE_LEGISLATURE_KEYS,
  stateLegislators,
  stateSeatsInDistrict,
} from "../simulation/nationwide-world/state-legislature-opening";
import {
  appendWorldConditions,
  drawStartingRegime,
} from "../simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../simulation/world-setup/political-start";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import {
  moveToTermDate,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";

describe("a persisted winner from an older unbound district contest", () => {
  it("uses only one supported election-date home district, ends the predecessor, and refuses unknown or ambiguous seats", () => {
    const fixture = recordedTermFixture();
    const personId = fixture.personId;
    // The compact recorded-term fixture omits the political opening. Add the
    // same saved condition and opening writers used in production, while
    // keeping its short supplied election and small future-due calendar.
    const conditioned = appendWorldConditions(fixture.world, [
      generatePoliticalStartingConditions(
        fixture.world,
        drawStartingRegime(fixture.world),
      ),
    ]);
    const prepared = ensureStateLegislatureOpening(conditioned, personId, "KY");
    const work = prepared.history.workRelationships.find((relationship) =>
      legislativeTermForRelationship(prepared, relationship.id),
    )!;
    const original = legislativeTermForRelationship(prepared, work.id)!;
    const binding = original.contest.office.districtBinding!;
    expect(binding).toBeDefined();
    expect(
      districtResidenceIntervals(prepared).filter(
        (interval) =>
          interval.personId === personId &&
          interval.binding.recordId === binding.recordId &&
          interval.startedOn <= original.contest.electionDate &&
          (interval.endedOn === null ||
            interval.endedOn > original.contest.electionDate),
      ),
    ).toHaveLength(1);
    const [seat] = stateSeatsInDistrict(
      original.pack.packId,
      original.contest.office.officeKey,
      binding.recordId,
    );
    expect(seat).toBeDefined();

    // Simulate a saved contest filed before seat naming was required. The
    // election, result, term, and residence records retain their exact IDs.
    const oldSave: World = {
      ...prepared,
      history: {
        ...prepared.history,
        electionContests: prepared.history.electionContests!.map((contest) =>
          contest.id === original.contest.id
            ? {
                ...contest,
                office: {
                  ...contest.office,
                  seatKey: null,
                  districtBinding: null,
                },
              }
            : contest,
        ),
      },
    };
    const persisted = deserializeWorld(serializeWorld(oldSave));
    assertWorldIntegrity(persisted);
    const recovered = legislativeTermForRelationship(persisted, work.id)!;
    expect(recovered.seatKey).toBe(binding.recordId);
    expect(
      campaignSeatHolders(persisted, recovered.pack.packId).find(
        (holder) => holder.workRelationshipId === work.id,
      )?.ordinal,
    ).toBe(seat!.ordinal);
    const predecessor = stateLegislators(persisted, recovered.pack.packId).find(
      (member) =>
        member.officeKey === recovered.contest.office.officeKey &&
        member.ordinal === seat!.ordinal,
    )!;
    expect(predecessor.personId).not.toBe(personId);

    const entered = deserializeWorld(
      serializeWorld(moveToTermDate(persisted, recovered.startsAt)),
    );
    expect(
      entered.history.futureDueItemStates.find(
        (state) =>
          state.dueItemId === recovered.entry.id && state.status === "resolved",
      ),
    ).toBeDefined();
    expect(workStatusAt(entered, work.id)?.status).toBe("active");
    expect(workStatusAt(entered, predecessor.workRelationshipId)?.status).toBe(
      "ended",
    );
    expect(
      stateLegislators(entered, recovered.pack.packId).find(
        (member) =>
          member.officeKey === recovered.contest.office.officeKey &&
          member.ordinal === seat!.ordinal,
      )?.personId,
    ).toBe(personId);
    expect(resolveActiveMemberSeat(entered, personId).kind).toBe("seated");

    // A save made after entry by the old code could still carry an active
    // generated tenure in that seat. Recreate that valid stale work record,
    // then use the same catchup invoked by ordinary play and portable import.
    const formerWork = entered.history.workRelationships.find(
      (relationship) => relationship.id === predecessor.workRelationshipId,
    )!;
    const formerRole = workRoleAt(entered, formerWork.id)!;
    const staleKey = `${STATE_LEGISLATURE_KEYS.seat(recovered.contest.office.officeKey, seat!.ordinal)}:tenure:${entered.currentDate}`;
    const stale = deserializeWorld(
      serializeWorld(
        createWorkRelationships(entered, [
          {
            stableKey: staleKey,
            personId: formerWork.personId,
            organizationId: formerWork.organizationId,
            startedAt: entered.currentDate,
            kind: formerWork.kind,
            compensation: formerWork.compensation,
            authority: formerWork.authority,
            dependency: formerWork.dependency,
            economicRisk: formerWork.economicRisk,
            provenance: {
              kind: "authored",
              note: "Synthetic stale opening tenure for old-save reconciliation.",
            },
            initialRole: {
              title: formerRole.title,
              occupationClassification: formerRole.occupationClassification,
              locationJurisdictionId: formerRole.locationJurisdictionId,
              timeDemand: formerRole.timeDemand,
            },
          },
        ]),
      ),
    );
    const staleWork = stale.history.workRelationships.find(
      (relationship) => relationship.stableKey === staleKey,
    )!;
    expect(workStatusAt(stale, staleWork.id)?.status).toBe("active");
    const repaired = deserializeWorld(
      serializeWorld(migrateLegacyLegislativeSeats(stale)),
    );
    expect(workStatusAt(repaired, staleWork.id)?.status).toBe("ended");
    expect(migrateLegacyLegislativeSeats(repaired)).toBe(repaired);
    expect(resolveActiveMemberSeat(repaired, personId).kind).toBe("seated");
    expect(
      stateLegislators(repaired, recovered.pack.packId).find(
        (member) =>
          member.officeKey === recovered.contest.office.officeKey &&
          member.ordinal === seat!.ordinal,
      )?.personId,
    ).toBe(personId);

    const unknown: World = {
      ...persisted,
      history: { ...persisted.history, districtResidenceIntervals: [] },
    };
    expect(legislativeTermForRelationship(unknown, work.id)?.seatKey).toBe(
      recovered.contest.id,
    );
    expect(
      campaignSeatHolders(unknown, recovered.pack.packId).some(
        (holder) => holder.workRelationshipId === work.id,
      ),
    ).toBe(false);

    const another = listDistrictIdentities(districtIdentityCatalog(), {
      stateUsps: "KY",
      chamber: "state-lower",
    }).find(
      (district) =>
        district.recordId !== binding.recordId &&
        stateSeatsInDistrict(
          recovered.pack.packId,
          recovered.contest.office.officeKey,
          district.recordId,
        ).length === 1,
    )!;
    expect(another).toBeDefined();
    const interval = districtResidenceIntervals(persisted).find(
      (candidate) =>
        candidate.personId === personId &&
        candidate.binding.recordId === binding.recordId,
    )!;
    const ambiguous: World = {
      ...persisted,
      history: {
        ...persisted.history,
        districtResidenceIntervals: [
          ...districtResidenceIntervals(persisted),
          {
            ...interval,
            id: `${interval.id}:ambiguous`,
            stableKey: `${interval.stableKey}:ambiguous`,
            binding: bindingFromIdentity(another),
          },
        ],
      },
    };
    expect(legislativeTermForRelationship(ambiguous, work.id)?.seatKey).toBe(
      recovered.contest.id,
    );
  }, 120_000);
});
