import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { civilAuthorityFixture } from "../../tests/e2e/support/civil-authority-world";
import * as decisions from "./decisions";
import type { DecisionContext, EntityId, World } from "./types";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import {
  appealDecisionFor,
  appealDecisionKey,
  fileNoticeWithCommissioner,
  issueMinnesotaDiscipline,
  personnelAppealsFor,
  personnelMatters,
  recordInformalResolutionAttempt,
} from "./civil-personnel-actions";

type ControlledAnswer =
  | "undecided"
  | "no-available-option"
  | "selected-null"
  | "appeal"
  | "no-appeal";
let ready: World;
let incumbencyId: EntityId;
let employeeId: EntityId;
beforeAll(() => {
  const fixture = civilAuthorityFixture(
    "2026-09-14",
    "US-MN",
    "director",
    "c8-appeal-pending",
  );
  const meeting = recordInformalResolutionAttempt(fixture.world, {
    incumbencyId: fixture.incumbencyId,
    note: "Discussed three refusals to follow the retention procedure.",
  });
  if (!meeting.ok) throw new Error(meeting.reason);
  ready = meeting.world;
  incumbencyId = fixture.incumbencyId;
  employeeId = fixture.employee;
});
afterEach(() => vi.restoreAllMocks());

function controlAnswer(answer: ControlledAnswer) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation((world: World, context: DecisionContext) => {
      if (context.decisionType !== "civil-personnel.discharge-appeal")
        return actual(world, context);
      if (answer === "undecided" || answer === "selected-null") {
        const evaluation = actual(world, context);
        return {
          ...evaluation,
          outcomeKind: answer === "undecided" ? "undecided" : "selected",
          selectedOptionKey: null,
        };
      }
      // Controlled caller proof, not an authored legal condition or a natural NPC motive.
      // Calling the real evaluator with this context keeps durable trace replay valid.
      return actual(world, {
        ...context,
        randomness: "none",
        constraints: context.options
          .filter(
            (option) =>
              answer === "no-available-option" || option.key !== answer,
          )
          .map((option) => ({
            stableKey: `fixture:c8-answer:${option.key}`,
            optionKey: option.key,
            kind: "fixture:controlled-answer",
            explanation:
              "This caller fixture controls which answer is available.",
            sourceRefs: [],
          })),
      });
    });
}

function discharge(world: World) {
  return issueMinnesotaDiscipline(world, {
    incumbencyId,
    action: "discharge",
    ground: "insubordination",
    reasons: "Refused three written directives on records retention.",
  });
}

describe("an unresolved employee appeal remains pending after the actual notice", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "%s does not become a final refusal",
    (answer: ControlledAnswer) => {
      const spy = controlAnswer(answer);
      const result = discharge(ready);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      expect(appealDecisionFor(result.world, result.recordId)).toBe(
        "undecided",
      );
      expect(personnelAppealsFor(result.world)).toHaveLength(0);
      expect(
        result.world.history.decisionTraces.some(
          (trace) =>
            trace.context.stableKey === appealDecisionKey(result.recordId),
        ),
      ).toBe(false);
      const action = result.world.history.personnelRecords!.find(
        (record) => record.id === result.recordId,
      )!;
      expect(action.kind).toBe("disciplinary-action");
      if (action.kind !== "disciplinary-action")
        throw new Error("Expected the actual discharge.");
      expect(action.appealDeadline).toBe("2026-10-14");
      expect(
        result.world.history.evidenceArtifacts.some(
          (artifact) => artifact.id === action.noticeEvidenceId,
        ),
      ).toBe(true);
      expect(result.world.currentMoment).toEqual(ready.currentMoment);
      const saved = deserializeWorld(serializeWorld(result.world));
      assertWorldIntegrity(saved);
      expect(appealDecisionFor(saved, result.recordId)).toBe("undecided");
      const beforeRead = serializeWorld(saved);
      expect(
        personnelMatters(saved).find((matter) => matter.id === result.recordId)!
          .facts,
      ).not.toContain("The employee decided not to appeal.");
      expect(serializeWorld(saved)).toBe(beforeRead);
      const filed = fileNoticeWithCommissioner(saved, {
        actionId: result.recordId,
      });
      expect(filed.ok).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      const continued = deserializeWorld(serializeWorld(filed.world));
      assertWorldIntegrity(continued);
      expect(appealDecisionFor(continued, result.recordId)).toBe("undecided");
      expect(personnelAppealsFor(continued)).toHaveLength(0);
      expect(
        fileNoticeWithCommissioner(continued, { actionId: result.recordId }).ok,
      ).toBe(false);
      expect(
        spy.mock.calls.filter(
          ([, context]: Parameters<typeof decisions.evaluateDecision>) =>
            context.decisionType === "civil-personnel.discharge-appeal",
        ),
      ).toHaveLength(1);
    },
  );

  it.each(["appeal", "no-appeal"] as const)(
    "preserves a selected %s and its durable answer",
    (answer: ControlledAnswer) => {
      controlAnswer(answer);
      const result = discharge(ready);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      const saved = deserializeWorld(serializeWorld(result.world));
      assertWorldIntegrity(saved);
      expect(appealDecisionFor(saved, result.recordId)).toBe(
        answer === "appeal" ? "appealed" : "declined",
      );
      const trace = saved.history.decisionTraces.find(
        (trace) =>
          trace.context.stableKey === appealDecisionKey(result.recordId),
      )!;
      expect(trace.context.actorPersonId).toBe(employeeId);
      expect(trace.selectedOptionKey).toBe(answer);
      expect(personnelAppealsFor(saved)).toHaveLength(
        answer === "appeal" ? 1 : 0,
      );
      const before = serializeWorld(saved);
      expect(appealDecisionFor(saved, result.recordId)).toBe(
        answer === "appeal" ? "appealed" : "declined",
      );
      expect(serializeWorld(saved)).toBe(before);
    },
  );
});
