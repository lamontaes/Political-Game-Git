import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { civilAuthorityFixture } from "../../tests/e2e/support/civil-authority-world";
import * as decisions from "./decisions";
import type { DecisionContext, EntityId, World } from "./types";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import {
  appealDecisionFor,
  fileNoticeWithCommissioner,
  issueMinnesotaDiscipline,
  personnelAppealsFor,
  personnelMatters,
  recordInformalResolutionAttempt,
  settlementDecisionKey,
} from "./civil-personnel-actions";

type ControlledAnswer =
  | "undecided"
  | "no-available-option"
  | "selected-null"
  | "settlement-directed"
  | "settlement-not-directed";
let ready: World;
let incumbencyId: EntityId;
let commissionerId: EntityId;
beforeAll(() => {
  const fixture = civilAuthorityFixture(
    "2026-09-14",
    "US-MN",
    "director",
    "c8-commissioner-pending",
  );
  const meeting = recordInformalResolutionAttempt(fixture.world, {
    incumbencyId: fixture.incumbencyId,
    note: "Discussed three refusals to follow the retention procedure.",
  });
  if (!meeting.ok) throw new Error(meeting.reason);
  ready = meeting.world;
  incumbencyId = fixture.incumbencyId;
  commissionerId = fixture.commissioner;
});
afterEach(() => vi.restoreAllMocks());

function controlAnswer(answer: ControlledAnswer) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation((world: World, context: DecisionContext) => {
      if (context.decisionType === "civil-personnel.discharge-appeal") {
        // Real evaluator and labeled fixture constraint create a canonically replayable appeal.
        return actual(world, {
          ...context,
          randomness: "none",
          constraints: [
            {
              stableKey: "fixture:c8-employee-appeals",
              optionKey: "no-appeal",
              kind: "fixture:controlled-answer",
              explanation:
                "This caller fixture requires an appeal to reach the commissioner.",
              sourceRefs: [],
            },
          ],
        });
      }
      if (context.decisionType !== "civil-personnel.commissioner-settlement")
        return actual(world, context);
      if (answer === "undecided" || answer === "selected-null") {
        const evaluation = actual(world, context);
        return {
          ...evaluation,
          outcomeKind: answer === "undecided" ? "undecided" : "selected",
          selectedOptionKey: null,
        };
      }
      // Caller controls are not new legal conditions or naturally produced motives.
      return actual(world, {
        ...context,
        randomness: "none",
        constraints: context.options
          .filter(
            (option) =>
              answer === "no-available-option" || option.key !== answer,
          )
          .map((option) => ({
            stableKey: `fixture:c8-commissioner:${option.key}`,
            optionKey: option.key,
            kind: "fixture:controlled-answer",
            explanation:
              "This caller fixture controls which answer is available.",
            sourceRefs: [],
          })),
      });
    });
}
function discharge() {
  return issueMinnesotaDiscipline(ready, {
    incumbencyId,
    action: "discharge",
    ground: "insubordination",
    reasons: "Refused three written directives on records retention.",
  });
}

describe("an unresolved commissioner does not produce a settlement ruling", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "%s preserves the actual pending appeal",
    (answer: ControlledAnswer) => {
      const spy = controlAnswer(answer);
      const result = discharge();
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      expect(appealDecisionFor(result.world, result.recordId)).toBe("appealed");
      const appeals = personnelAppealsFor(result.world);
      expect(appeals).toHaveLength(1);
      const appeal = appeals[0]!;
      expect(
        result.world.history.personnelRecords!.filter(
          (record) => record.kind === "settlement-decision",
        ),
      ).toHaveLength(0);
      expect(
        result.world.history.decisionTraces.some(
          (trace) =>
            trace.context.stableKey === settlementDecisionKey(appeal.id),
        ),
      ).toBe(false);
      expect(result.world.currentMoment).toEqual(ready.currentMoment);
      const saved = deserializeWorld(serializeWorld(result.world));
      assertWorldIntegrity(saved);
      expect(personnelAppealsFor(saved)).toHaveLength(1);
      const beforeRead = serializeWorld(saved);
      const facts = personnelMatters(saved).find(
        (matter) => matter.id === result.recordId,
      )!.facts;
      expect(facts).not.toContain(
        "The commissioner did not direct a settlement.",
      );
      expect(serializeWorld(saved)).toBe(beforeRead);
      const filed = fileNoticeWithCommissioner(saved, {
        actionId: result.recordId,
      });
      expect(filed.ok).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      const continued = deserializeWorld(serializeWorld(filed.world));
      assertWorldIntegrity(continued);
      expect(appealDecisionFor(continued, result.recordId)).toBe("appealed");
      expect(
        continued.history.personnelRecords!.filter(
          (record) => record.kind === "settlement-decision",
        ),
      ).toHaveLength(0);
      expect(
        fileNoticeWithCommissioner(continued, { actionId: result.recordId }).ok,
      ).toBe(false);
      expect(
        spy.mock.calls.filter(
          ([, context]: Parameters<typeof decisions.evaluateDecision>) =>
            context.decisionType === "civil-personnel.commissioner-settlement",
        ),
      ).toHaveLength(1);
    },
  );
  it.each(["settlement-directed", "settlement-not-directed"] as const)(
    "preserves selected %s and its durable ruling",
    (answer: ControlledAnswer) => {
      controlAnswer(answer);
      const result = discharge();
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      const saved = deserializeWorld(serializeWorld(result.world));
      assertWorldIntegrity(saved);
      const appeal = personnelAppealsFor(saved)[0]!;
      expect(appealDecisionFor(saved, result.recordId)).toBe("appealed");
      const rulings = saved.history.personnelRecords!.filter(
        (record) => record.kind === "settlement-decision",
      );
      expect(rulings).toHaveLength(1);
      const ruling = rulings[0]!;
      if (ruling.kind !== "settlement-decision")
        throw new Error("Expected settlement ruling.");
      expect(ruling.decision).toBe(answer);
      expect(ruling.actorPersonId).toBe(commissionerId);
      const trace = saved.history.decisionTraces.find(
        (trace) => trace.context.stableKey === settlementDecisionKey(appeal.id),
      )!;
      expect(trace.context.actorPersonId).toBe(commissionerId);
      expect(trace.selectedOptionKey).toBe(answer);
      expect(ruling.decisionTraceId).toBe(trace.id);
      const before = serializeWorld(saved);
      personnelMatters(saved);
      expect(serializeWorld(saved)).toBe(before);
      const filed = fileNoticeWithCommissioner(saved, {
        actionId: result.recordId,
      });
      expect(filed.ok).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      const continued = deserializeWorld(serializeWorld(filed.world));
      assertWorldIntegrity(continued);
      expect(
        continued.history.personnelRecords!.filter(
          (record) => record.kind === "settlement-decision",
        ),
      ).toHaveLength(1);
      expect(
        fileNoticeWithCommissioner(continued, { actionId: result.recordId }).ok,
      ).toBe(false);
    },
  );
});
