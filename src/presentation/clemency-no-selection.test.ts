import { expect, it, vi } from "vitest";
import {
  adultLifeAt,
  firstLocality,
} from "../../tests/fixtures/state-executive-entry";
import {
  currentGoverningOffices,
  openClemencyMatter,
  governingMatters,
  governingMatterById,
  governingNpcDecisionHandler,
} from "../simulation/governing/state-governing";
import * as clemency from "../simulation/justice/clemency-reasoning";
import { evaluateDecision } from "../simulation/decisions";
import { currentHistoricalCutoff } from "../simulation/queries";
import { recordWorldEvent } from "../simulation/world";

it("keeps a clemency matter open when the evaluator selects neither action", () => {
  const opened = adultLifeAt(
    firstLocality("OR").key,
    "G8-clemency-no-selection",
  );
  const office = currentGoverningOffices(opened.world).find(
    (o) => o.stateUsps === "OR",
  )!;
  // Controlled caller contract only: this marker is not a real sentence or a watched petition.
  const marked = recordWorldEvent(opened.world, {
    stableKey: "test:clemency-guard:marker",
    type: "test.clemency-guard-input",
    occurredAt: opened.world.currentDate,
    recordedAt: opened.world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [opened.personId, office.holderPersonId],
    participants: [
      {
        personId: office.holderPersonId,
        role: "agency:officeholder",
        detail: "Actual governor in the controlled decision guard.",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [],
    summary:
      "Controlled input for the no-selection guard; no sentence is fabricated.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const marker = marked.history.events.at(-1)!;
  const world = openClemencyMatter(marked, office.officeKey, {
    instance: "test:no-selection",
    petitionEventId: marker.id,
    petitionerId: opened.personId,
    kind: "pardon",
  });
  const matter = governingMatters(world, office.officeKey).find(
    (m) => m.family === "clemency",
  )!;
  const due = world.history.futureDueItems.find((d) =>
    d.entityIds.includes(matter.id),
  )!;
  const question = vi.spyOn(clemency, "clemencyQuestionFor").mockReturnValue({
    petition: marker,
    petitionerId: opened.personId,
    sentenced: marker,
    earlierAnswer: null,
  });
  const evaluator = vi
    .spyOn(clemency, "evaluateClemency")
    .mockImplementation((atDate, actor) =>
      evaluateDecision(atDate, {
        stableKey: "test:clemency-guard:decision",
        decisionType: "justice.clemency",
        actorPersonId: actor,
        cutoff: currentHistoricalCutoff(atDate),
        subject: {
          kind: "context:clemency-petition",
          key: marker.stableKey,
          entityId: marker.id,
        },
        options: [
          {
            key: clemency.CLEMENCY_GRANT,
            label: "Grant",
            description: "Grant",
          },
          { key: clemency.CLEMENCY_DENY, label: "Deny", description: "Deny" },
        ],
        constraints: [clemency.CLEMENCY_GRANT, clemency.CLEMENCY_DENY].map(
          (optionKey) => ({
            stableKey: `test:blocked:${optionKey}`,
            optionKey,
            kind: "test:unavailable-option",
            explanation: "No action is available in this guard fixture.",
            sourceRefs: [{ kind: "historical-event", eventId: marker.id }],
          }),
        ),
        considerations: [],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      }),
    );
  try {
    const next = governingNpcDecisionHandler(world, due).world;
    expect(governingMatterById(next, matter.id)?.status).toBe("open");
    expect(
      next.history.events.filter((e) => e.type === "governing.matter-decided"),
    ).toEqual(
      world.history.events.filter((e) => e.type === "governing.matter-decided"),
    );
    expect(next.history.decisionTraces!.at(-1)!.selectedOptionKey).toBeNull();
    expect(next.history.decisionTraces!.at(-1)!.outcomeKind).toBe(
      "no-available-option",
    );
  } finally {
    evaluator.mockRestore();
    question.mockRestore();
  }
});
