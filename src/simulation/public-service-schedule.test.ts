import { beforeAll, describe, expect, it } from "vitest";
import { advanceWorld } from "./world";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addSimulationMinutes } from "./dates";
import { requestPublicService } from "./public-service-requests";
import { householdChildServiceSchedule } from "./public-service-schedule";
import { deserializeWorld, serializeWorld } from "./serialization";
import { recordHouseholdMembershipState } from "./life";
import { householdMembershipsAt } from "./life-queries";
import type { World } from "./types";

const SEED = "family-child-service-schedule-20261001";
const place = drawRandomPlace(SEED);
let fixture: ReturnType<typeof childServiceFixture>;
let requested: World;
describe(`Family child-service schedule in ${place.displayName}, seed ${SEED}`, () => {
  beforeAll(() => {
    fixture = childServiceFixture(
      {
        question: "us-policy-positions:education.universal-preschool",
        name: "pre-K",
        age: 4,
      },
      SEED,
    );
    const result = requestPublicService(fixture.funded, {
      personId: fixture.parentId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start: addSimulationMinutes(fixture.funded.currentMoment, 30),
      end: addSimulationMinutes(fixture.funded.currentMoment, 390),
    });
    if (result.kind !== "scheduled") throw new Error(result.reason);
    requested = result.world;
  });
  it("reads the child's exact session and attendance due item without spending time or writing", () => {
    const before = serializeWorld(requested);
    const rows = householdChildServiceSchedule(requested, fixture.parentId);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    const due = requested.history.futureDueItems.find(
      (item) => item.id === row.attendanceDueItemId,
    )!;
    expect(due.entityIds).toContain(fixture.childId);
    expect(row).toMatchObject({
      childPersonId: fixture.childId,
      activityStatus: "scheduled",
      attendanceStatus: "scheduled",
      attendanceDueAt: due.dueAt,
    });
    expect(row.start).toEqual(
      addSimulationMinutes(requested.currentMoment, 30),
    );
    expect(row.end).toEqual(addSimulationMinutes(requested.currentMoment, 390));
    expect(householdChildServiceSchedule(requested, fixture.parentId)).toEqual(
      rows,
    );
    expect(serializeWorld(requested)).toBe(before);
  });
  it("Save/Continue retains the same due item and ordinary attendance resolves it once", () => {
    const before = householdChildServiceSchedule(requested, fixture.parentId);
    const restored = deserializeWorld(serializeWorld(requested));
    expect(householdChildServiceSchedule(restored, fixture.parentId)).toEqual(
      before,
    );
    const attended = advanceWorld(restored, 1);
    expect(householdChildServiceSchedule(attended, fixture.parentId)).toEqual([
      expect.objectContaining({
        attendanceDueItemId: before[0]!.attendanceDueItemId,
        attendanceStatus: "resolved",
        activityStatus: "completed",
      }),
    ]);
    expect(
      attended.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      ),
    ).toHaveLength(1);
    const continued = advanceWorld(
      deserializeWorld(serializeWorld(attended)),
      1,
    );
    expect(householdChildServiceSchedule(continued, fixture.parentId)).toEqual(
      householdChildServiceSchedule(attended, fixture.parentId),
    );
    expect(
      continued.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      ),
    ).toHaveLength(1);
  });
  it("does not expose another household's child or invent a session before a request", () => {
    expect(
      householdChildServiceSchedule(fixture.funded, fixture.parentId),
    ).toEqual([]);
    expect(
      householdChildServiceSchedule(requested, fixture.governorId),
    ).toEqual([]);
    const { membership, state } = householdMembershipsAt(
      requested,
      fixture.childId,
    )[0]!;
    const separated = recordHouseholdMembershipState(requested, {
      stableKey: "fixture:child-left-household",
      membershipId: membership.id,
      effectiveAt: requested.currentDate,
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      provenance: { kind: "authored", note: "Explicit separation fixture." },
      supersedesStateId: state.id,
    });
    expect(householdChildServiceSchedule(separated, fixture.parentId)).toEqual(
      [],
    );
  });
});
