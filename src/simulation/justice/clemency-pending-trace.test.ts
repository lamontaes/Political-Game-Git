import { describe, expect, it, vi } from "vitest";
import research from "../../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import { smallWorld } from "../../../tests/fixtures/small-world";
import { recordedVandalismClemencyCase } from "../../../tests/fixtures/clemency-court-case";
import { evaluateDecision } from "../decisions";
import { lifePlaceStateIdentities } from "../life-places";
import { pickDistinct, SeededRng } from "../rng";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import {
  GOVERNING_NPC_DECISION,
  governingMatters,
  governingNpcDecisionHandler,
} from "../governing/state-governing";
import { serializeWorld, deserializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  fileClemencyPetition,
} from "./clemency";
import { clemencyAuthorityFor, EXECUTIVE_BODY } from "./clemency-rules";
import * as clemencyReasoning from "./clemency-reasoning";
import {
  referForProsecution,
  enterPlea,
  PROSECUTION_CHARGED_EVENT,
} from "./prosecution";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import { REFERRAL_TAG, sentencesOf } from "./jail-terms";

const places = lifePlaceStateIdentities();
// This caller needs an actual executive-only route and a supported finite term.
// Inspect all56 before the seeded sample; never replace a failing sampled place.
const eligible = places.filter((place) => {
  const authority = clemencyAuthorityFor(place.jurisdictionKey);
  const rows = research.places as Record<
    string,
    {
      basis: string;
      classes: Record<
        string,
        { minMonths?: number; maxMonths?: number | null }
      >;
      offenses: Record<
        string,
        { class?: string; minMonths?: number; maxMonths?: number | null }
      >;
    }
  >;
  const source = rows[place.jurisdictionKey];
  const row = source?.offenses["crime:vandalism"];
  const term = row?.class ? source?.classes[row.class] : row;
  return (
    source?.basis === "SOURCED" &&
    Number.isInteger(term?.minMonths) &&
    Number.isInteger(term?.maxMonths) &&
    (term?.maxMonths ?? 0) > 0 &&
    authority?.gates.every(
      (gate) =>
        gate.offenses.kind === "all" &&
        gate.mustAgree.length === 1 &&
        gate.mustAgree[0] === EXECUTIVE_BODY &&
        gate.advisory === null,
    )
  );
});
const sample = pickDistinct(
  new SeededRng("team9-a10-pending-clemency-replay"),
  eligible,
  5,
);

function actualExecutiveMatter(place: (typeof places)[number]) {
  const small = smallWorld({
    place: place.jurisdictionKey,
    seed: `team9-a10-pending:${place.jurisdictionKey}`,
    offices: ["governor"],
  });
  const facts = recordedVandalismClemencyCase(
    small.world,
    small.personId,
    place.jurisdictionKey,
  );
  const referred = referForProsecution(facts.world, {
    stableKey: "fixture:pending-clemency-case",
    subjectPersonId: small.personId,
    jurisdictionId: facts.world.people[small.personId]!.homeJurisdictionId,
    offenseKey: "crime:vandalism",
    referredBy: {
      kind: "police",
      label: "police (authored vandalism fixture)",
      personId: null,
    },
    basisEventIds: facts.basisEventIds,
    sentencingAllegations: facts.sentencingAllegations,
    evidence: "documentary",
    standingFindings: 6,
  });
  const chargeDue = referred.world.history.futureDueItems.find(
    (item) =>
      item.stableKey === `justice:prosecution-stage:${referred.referralId}`,
  )!;
  expect(chargeDue).toBeDefined();
  let isolated = referred.world;
  for (const item of isolated.history.futureDueItems) {
    if (
      item.id === chargeDue.id ||
      futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
        ?.status !== "scheduled"
    )
      continue;
    isolated = cancelFutureDueItem(isolated, {
      stableKey: `fixture:pending-isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: isolated.currentDate,
      reasonKey: "fixture:isolated-court",
      context:
        "Retain unrelated commitments while proving this actual court request.",
    });
  }
  const charged = resolveFutureDueItemsThrough(
    isolated,
    chargeDue.dueAt,
    createProsecutionTransitionRegistry(),
  );
  const plea = enterPlea(charged, {
    personId: small.personId,
    referralId: referred.referralId,
    plea: "guilty",
  });
  expect(plea.ok).toBe(true);
  const chargedEvent = charged.history.events.find(
    (event) =>
      event.type === PROSECUTION_CHARGED_EVENT &&
      event.tags.includes(`${REFERRAL_TAG}${referred.referralId}`),
  )!;
  const trialDue = plea.world.history.futureDueItems.find(
    (item) => item.stableKey === `justice:prosecution-stage:${chargedEvent.id}`,
  )!;
  expect(trialDue).toBeDefined();
  const sentenced = resolveFutureDueItemsThrough(
    plea.world,
    trialDue.dueAt,
    createProsecutionTransitionRegistry(),
  );
  const sentence = sentencesOf(sentenced, small.personId)[0]!;
  expect(sentence).toBeDefined();
  expect(sentence.months).toBeGreaterThan(0);
  const filed = fileClemencyPetition(sentenced, {
    personId: small.personId,
    sentencedEventId: sentence.sentencedEventId,
  });
  expect(filed.ok, filed.ok ? undefined : filed.reason).toBe(true);
  if (!filed.ok) throw new Error(filed.reason);
  const ready = advanceClemencyPetition(filed.world, filed.petitionId);
  const matter = governingMatters(ready).find(
    (row) =>
      row.family === "clemency" &&
      row.openedEvent.tags.includes(`source-event:${filed.petitionId}`),
  )!;
  expect(matter).toBeDefined();
  expect(ready.people[matter.holderPersonId]).toBeDefined();
  const due = ready.history.futureDueItems.find(
    (item) =>
      item.transitionKey === GOVERNING_NPC_DECISION &&
      item.entityIds.includes(matter.id),
  )!;
  expect(due).toBeDefined();
  let pendingReady = ready;
  for (const item of pendingReady.history.futureDueItems) {
    if (
      item.id === due.id ||
      futureDueItemStateAt(
        pendingReady,
        item.id,
        currentLifeCutoff(pendingReady),
      )?.status !== "scheduled"
    )
      continue;
    pendingReady = cancelFutureDueItem(pendingReady, {
      stableKey: `fixture:pending-executive-isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: pendingReady.currentDate,
      reasonKey: "fixture:isolated-executive",
      context: "Isolate delivery of this actual saved executive due item.",
    });
  }
  return { ready: pendingReady, matter, due, petitionId: filed.petitionId };
}

describe("saved nonselected clemency trace replay", () => {
  it("samples five admitted actual executive routes from the56-place catalog", () => {
    expect(places).toHaveLength(56);
    expect(sample).toHaveLength(5);
  });
  for (const place of sample)
    it(`retains the named executive's pending request after repeat and reload in ${place.jurisdictionKey}`, () => {
      const { ready, matter, due, petitionId } = actualExecutiveMatter(place);
      const original = clemencyReasoning.evaluateClemency;
      // Controlled domain input: both options are unavailable in this test.
      // The shared evaluator and durable trace writer remain real. This proves
      // replay of an actual saved nonselected trace, not natural first-evaluation
      // indecision on the pinned main evaluator or a new legal eligibility rule.
      const evaluator = vi
        .spyOn(clemencyReasoning, "evaluateClemency")
        .mockImplementation((world, actor, question, term) => {
          const context = original(world, actor, question, term).context;
          return evaluateDecision(world, {
            ...context,
            constraints: context.options.map((option) => ({
              stableKey: `fixture:pending:${option.key}`,
              optionKey: option.key,
              kind: "fixture:controlled-pending",
              explanation:
                "Explicit controlled unavailable option for saved-trace replay proof.",
              sourceRefs: [],
            })),
          });
        });
      try {
        const first = resolveFutureDueItemsThrough(
          ready,
          due.dueAt,
          createFutureTransitionHandlerRegistry([
            [GOVERNING_NPC_DECISION, governingNpcDecisionHandler],
          ]),
        );
        expect(first.currentDate).toBe(due.dueAt);
        expect(
          futureDueItemStateAt(first, due.id, currentLifeCutoff(first))?.status,
        ).toBe("resolved");
        const savedTrace = first.history.decisionTraces.find(
          (trace) =>
            trace.context.decisionType === "justice.clemency-decision" &&
            trace.context.actorPersonId === matter.holderPersonId,
        )!;
        expect(savedTrace).toBeDefined();
        expect(savedTrace.outcomeKind).toBe("no-available-option");
        expect(savedTrace.selectedOptionKey).toBeNull();
        expect(first.history.decisionTraces.length).toBe(
          ready.history.decisionTraces.length + 1,
        );
        expect(clemencyPetitionStatus(first, petitionId)).toBe("open");
        expect(
          governingMatters(first).find((row) => row.id === matter.id)!.decision,
        ).toBeNull();
        const replay = governingNpcDecisionHandler(first, due);
        expect(replay.world).toBe(first);
        expect(serializeWorld(replay.world)).toBe(serializeWorld(first));
        const restored = deserializeWorld(serializeWorld(first));
        assertWorldIntegrity(restored);
        const continued = governingNpcDecisionHandler(restored, due);
        expect(continued.world).toBe(restored);
        expect(serializeWorld(continued.world)).toBe(serializeWorld(restored));
        expect(
          continued.world.history.decisionTraces.find(
            (trace) => trace.id === savedTrace.id,
          ),
        ).toEqual(savedTrace);
        expect(
          governingMatters(continued.world).find((row) => row.id === matter.id)!
            .decision,
        ).toBeNull();
      } finally {
        evaluator.mockRestore();
      }
    }, 30_000);
});
