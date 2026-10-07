import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import * as decisions from "../decisions";
import {
  addJudicialCourt,
  seatJudge,
  seatsForCourt,
} from "../judiciary/courts";
import {
  choosePresidentialNominee,
  supremeCourtNomineePool,
} from "./supreme-court-appointments";

function fixture() {
  const initial = smallWorld({
    place: "OH",
    people: 3,
    seed: "a125-nomination-pending",
  }).world;
  const [presidentId, judgeId] = Object.values(initial.people)
    .map((person) => person.id)
    .filter(
      (id) =>
        initial.control.kind !== "person" || id !== initial.control.personId,
    );
  let world = addJudicialCourt(initial, {
    courtId: "a125:authored-appeals-court",
    jurisdictionId: null,
    name: "Authored nomination fixture court",
    level: "federal-appellate",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    createdAt: initial.currentDate,
    rules: {
      authorizedSeats: {
        state: "known",
        value: 1,
        basis: "game-profile",
        referenceId: "a125:authored-fixture",
      },
      termYears: {
        state: "unknown",
        reason: "Not required by this selection fixture.",
      },
      mandatoryRetirementAge: {
        state: "unknown",
        reason: "Not required by this selection fixture.",
      },
      caseJurisdiction: {
        state: "unknown",
        reason: "Not required by this selection fixture.",
      },
      selectionRecordId: null,
      amendmentRoute: {
        state: "unknown",
        reason: "Not required by this selection fixture.",
      },
    },
  });
  world = seatJudge(world, {
    seatId: seatsForCourt(world, "a125:authored-appeals-court")[0]!.seatId,
    personId: judgeId!,
    startedAt: world.currentDate,
    termEndsAt: null,
    retentionDueAt: null,
    selection: {
      path: "initial-world",
      selectionRecordId: null,
      decisionRecordId: null,
      selectingPersonId: null,
      contestId: null,
      note: "Authored caller-boundary fixture.",
    },
  });
  return {
    world,
    judgeId: judgeId!,
    input: {
      stableKey: "a125:nomination",
      presidentId: presidentId!,
      office: "associate" as const,
    },
  };
}
const evaluate = decisions.evaluateDecision;
afterEach(() => vi.restoreAllMocks());
describe("A125 Supreme Court nomination caller boundary", () => {
  it("keeps a sole recorded judge pending when the decision is undecided, including reload", () => {
    const { world, input } = fixture();
    expect(
      supremeCourtNomineePool(world, "associate", [input.presidentId]),
    ).toHaveLength(1);
    const spy = vi
      .spyOn(decisions, "evaluateDecision")
      .mockImplementation(
        (
          w: Parameters<typeof evaluate>[0],
          packet: Parameters<typeof evaluate>[1],
        ) => ({
          ...evaluate(w, packet),
          outcomeKind: "undecided",
          selectedOptionKey: null,
        }),
      );
    const before = JSON.stringify(world);
    expect(choosePresidentialNominee(world, input)).toBeNull();
    expect(choosePresidentialNominee(JSON.parse(before), input)).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("rejects a stale option key on an undecided packet", () => {
    const { world, input, judgeId } = fixture();
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(
      (
        w: Parameters<typeof evaluate>[0],
        packet: Parameters<typeof evaluate>[1],
      ) => ({
        ...evaluate(w, packet),
        outcomeKind: "undecided",
        selectedOptionKey: judgeId,
      }),
    );
    expect(choosePresidentialNominee(world, input)).toBeNull();
  });
  it("uses the actual selected decision for a sole eligible recorded judge", () => {
    const { world, input, judgeId } = fixture();
    const spy = vi.spyOn(decisions, "evaluateDecision");
    expect(choosePresidentialNominee(world, input)?.personId).toBe(judgeId);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
