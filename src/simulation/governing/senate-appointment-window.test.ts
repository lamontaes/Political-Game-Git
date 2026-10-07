import { beforeAll, describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import { projectCongress } from "../living-world/congress";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import {
  senateAppointmentTiming,
  senateVacancyLaw,
} from "../nationwide-world/senate-vacancy-law";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { FutureDueItem, World } from "../types";
import { recordPersonDeath } from "../vitality";
import {
  applyOfficeContinuityNotices,
  type OfficeContinuityNoticeInput,
} from "./office-continuity";

let opening: World;
beforeAll(() => {
  const seed = "session132-a120-appointment-window";
  const rng = new SeededRng(seed);
  const state = rng.pick(lifePlaceStateIdentities());
  const place = rng.pick(
    searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state.jurisdictionKey,
    }),
  );
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startKind: "custom",
    placeKey: place.key,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
  });
  opening = ensureLivingWorldOpening(game.world, game.playerPersonId);
}, 60_000);

function vacancy(kind: "recorded" | "estimated" | "none", late = false) {
  const seat = projectCongress(opening)!.senate.seats.find((candidate) => {
    const law = senateVacancyLaw(candidate.stateUsps)!;
    return (
      candidate.occupant.kind === "member" &&
      (kind === "none"
        ? law.appointment === "none"
        : kind === "recorded"
          ? law.appointmentDeadlineDays !== null &&
            law.appointmentDeadlineDays > 10
          : law.appointment !== "none" && law.appointmentDeadlineDays === null)
    );
  })!;
  expect(seat).toBeDefined();
  if (seat.occupant.kind !== "member")
    throw new Error("Expected a generated senator.");
  const member = seat.occupant.member;
  const dead = recordPersonDeath(opening, {
    stableKey: `a120:${kind}:death`,
    personId: member.personId,
    diedAt: opening.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [opening.id],
    summary: "Controlled Senate vacancy timing proof.",
    provenance: { kind: "authored", note: "A120 scheduling fixture." },
  });
  const death = dead.history.personDeaths.at(-1)!;
  const notice: OfficeContinuityNoticeInput = {
    noticeKey: `a120:${kind}:notice`,
    sequence: death.sequence,
    originEventId: death.eventId,
    personId: member.personId,
    kind: "death",
    effectiveDate: death.diedAt,
    recordedDate: dead.currentDate,
    visibility: "public",
    offices: [
      {
        officeKey: seat.seatKey,
        title: member.title,
        organizationId: null,
        termEvidenceId: member.termId,
      },
    ],
    sourceRecordId: death.id,
  };
  const world = late
    ? {
        ...dead,
        currentDate: addDays(dead.currentDate, 60),
        currentMoment: simulationMomentOnLocalDate(
          dead.currentMoment,
          addDays(dead.currentDate, 60),
        ),
      }
    : dead;
  const next = applyOfficeContinuityNotices(world, [notice]);
  expect(applyOfficeContinuityNotices(next, [notice])).toBe(next);
  const due = next.history.futureDueItems.find((item) =>
    item.stableKey.includes(`:appointment:${seat.seatKey}:`),
  );
  return { world, next, seat, due, death };
}

/** The appointment producer records an authored model, not simulated inputs. */
function appointmentModelNote(due: FutureDueItem | undefined): string {
  expect(due).toBeDefined();
  expect(due?.provenance.kind).toBe("authored");
  if (due?.provenance.kind !== "authored") {
    throw new Error("Expected an authored Senate appointment model note.");
  }
  return due.provenance.note;
}

describe("Senate vacancy scheduling uses legal windows", () => {
  it("uses the recorded bound instead of ten days and preserves its model provenance on reload", () => {
    const { next, seat, due, death } = vacancy("recorded");
    const law = senateVacancyLaw(seat.stateUsps)!;
    expect(due?.dueAt).toBe(
      addDays(death.diedAt, law.appointmentDeadlineDays!),
    );
    expect(appointmentModelNote(due)).toContain(
      "not an observed appointment date",
    );
    expect(
      deserializeWorld(serializeWorld(next)).history.futureDueItems.find(
        (item) => item.stableKey === due!.stableKey,
      ),
    ).toEqual(due);
  });
  it("marks estimated timing and its comparator count", () => {
    const { seat, due, death } = vacancy("estimated");
    const timing = senateAppointmentTiming(senateVacancyLaw(seat.stateUsps))!;
    expect(due?.dueAt).toBe(addDays(death.diedAt, timing.days));
    expect(appointmentModelNote(due)).toContain("ESTIMATED FROM LEGAL WINDOWS");
    expect(appointmentModelNote(due)).toContain(
      `${timing.comparatorCount} recorded deadlines`,
    );
  });
  it("does not restart the bound when a vacancy notice arrives late", () => {
    const { world, due } = vacancy("recorded", true);
    expect(due?.dueAt).toBe(addDays(world.currentDate, 1));
    expect(appointmentModelNote(due)).toContain(
      "without restarting the window",
    );
  });
  it("does not schedule an appointment where the law forbids it", () => {
    expect(vacancy("none").due).toBeUndefined();
  });
});
