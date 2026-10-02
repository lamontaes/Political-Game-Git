/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { createProductionPolicyCatalog } from "../simulation/production-catalog";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  requireLifePlace,
} from "../simulation/life-places";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  municipalSeats,
} from "../simulation/municipal-public-work";
import {
  councilActExecutiveDeadlineHandler,
  COUNCIL_ACT_EXECUTIVE_DEADLINE,
  recordCouncilReadingVote,
  municipalOrdinanceStatus,
  actOnCouncilMeasure,
  municipalExecutiveHolder,
  completeCouncilPassage,
} from "../simulation/municipal-ordinance-procedure";
import {
  introduceMeasure,
  placeMeasureOnCalendar,
  requireMeasure,
  measurePosition,
  measureActions,
} from "../simulation/legislation";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../simulation/governing/officeholder-principles";
import {
  evaluateGovernorBill,
  BILL_SIGN,
} from "../simulation/governing/governor-bill-decision";
import * as governorBillDecision from "../simulation/governing/governor-bill-decision";
import { evaluateDecision } from "../simulation/decisions";
import { SeededRng } from "../simulation/rng";
import { questionAuthority } from "../simulation/governing/question-authority";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../simulation/future-transitions";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { addDays, simulationMomentOnLocalDate } from "../simulation/dates";
import {
  createWorld,
  createWorldId,
  recordWorldEvent,
  writeWithWorldIntegrityOnce,
} from "../simulation/world";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../simulation/time-work";
import { createLightweightPerson, personName } from "../simulation/people";
import type { World, IsoDate, EntityId } from "../simulation/types";

import { ensureDistrictOfColumbiaCouncilOpening } from "../simulation/nationwide-world/district-of-columbia-council-opening";

import { ensureStateExecutiveIncumbent } from "../simulation/nationwide-world/state-executives";
import {
  createFormationContext,
  recordPrinciples,
} from "../simulation/politics";

const governmentKey = "us-dc-washington";
const profileCosts = new Map<string, number>();
const profileWorlds: { state: string; seed: string; checksum: string }[] = [];
function profile<T>(label: string, operation: () => T): T {
  if (!process.env.G6_MAYOR_PROFILE_PATH) return operation();
  const started = performance.now();
  try {
    return operation();
  } finally {
    profileCosts.set(
      label,
      (profileCosts.get(label) ?? 0) + performance.now() - started,
    );
  }
}

// Actual saved council seats and supplied unanimous roll calls isolate the
// executive caller. They do not establish ordinary council intake behavior.
function isolateAt(world: World, date: IsoDate, except?: EntityId): World {
  let next = world;
  for (const due of world.history.futureDueItems) {
    if (
      due.id === except ||
      due.dueAt > date ||
      futureDueItemStateAt(next, due.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })?.status !== "scheduled"
    )
      continue;
    next = cancelFutureDueItem(next, {
      stableKey: `G6-mayor:isolate:${due.id}`,
      dueItemId: due.id,
      effectiveAt: next.currentDate,
      reasonKey: "civic:fixture-isolation",
      context:
        "Scoped executive fixture; other due families cancelled, not skipped.",
    });
  }
  return {
    ...next,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
  };
}

function presentedAct(seed: string, openingPlaceKey = "1150000") {
  const place = requireLifePlace("1150000");
  // This is an executive mechanism fixture, not a generated life journey.
  // Use existing canonical world/person primitives and the production policy
  // catalog, not the demo's synthetic questions. The actual mayor,
  // council seats, terms and actions still come from their production writers.
  const context = requireLifePlace(openingPlaceKey).context;
  let world = profile("canonical-small-world-opening", () =>
    createWorld({
      seed,
      currentDate: context.initialMoment.date,
      currentMoment: context.initialMoment,
      jurisdictions: [context.jurisdiction],
      people: Array.from({ length: 4 }, (_, index) =>
        createLightweightPerson({
          worldId: createWorldId(seed),
          worldSeed: seed,
          index,
          currentDate: context.initialMoment.date,
          homeJurisdictionId: context.jurisdiction.id,
        }),
      ),
      policyCatalog: createProductionPolicyCatalog(),
    }),
  );
  // Materialize the same real D.C. government in each starting world through
  // its existing opening writer; this is not 56 different municipal powers.
  // The executive opening registers its jurisdiction and canonical order.
  // Do not inject a jurisdiction dictionary entry ahead of that writer.
  const openingPersonId = world.personOrder[0];
  if (!openingPersonId || !world.people[openingPersonId])
    throw new Error("Actual saved opening subject required.");
  world = profile("actual-mayor-opening", () =>
    ensureStateExecutiveIncumbent(world, openingPersonId, "DC"),
  );
  world = profile("actual-council-opening", () =>
    writeWithWorldIntegrityOnce(world, () =>
      ensureDistrictOfColumbiaCouncilOpening(world),
    ),
  );
  const mayor = municipalExecutiveHolder(world, governmentKey)!;
  expect(mayor).toBeTruthy();
  world = ensureOfficeholderPrinciples(world, [mayor]);
  world = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  const government = municipalGovernmentByKey(governmentKey)!;
  const packed = municipalRulePackFor(government);
  if (!packed.ok) throw new Error(JSON.stringify(packed.missing));
  const pack = packed.pack;
  const seats = pack.chambers[0]!.seats;
  if (seats.kind !== "known")
    throw new Error("Council seat count is unsupported.");
  const count = seats.value;
  expect(
    municipalSeats(world, governmentKey).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    ),
  ).toHaveLength(count);
  const authorized = profile("question-authority", () =>
    world.policyCatalog.propositionOrder.filter(
      (id) =>
        questionAuthority(world, place.context.jurisdiction.id, id).may ===
        "yes",
    ),
  );
  const netBearings = (id: EntityId) => {
    const net = new Map<EntityId, number>();
    for (const bearing of world.policyCatalog.propositions[id]!.principles ??
      [])
      net.set(
        bearing.principleId,
        (net.get(bearing.principleId) ?? 0) +
          (bearing.bearing === "consistent-with" ? 1 : -1) *
            (bearing.weight ?? 1),
      );
    return [...net].filter(([, weight]) => weight !== 0);
  };
  const questionId = [...authorized].sort(
    (a, b) =>
      netBearings(b).reduce((sum, [, w]) => sum + Math.abs(w), 0) -
        netBearings(a).reduce((sum, [, w]) => sum + Math.abs(w), 0) ||
      a.localeCompare(b),
  )[0]!;
  expect(questionId).toBeDefined();
  // Explicit authored held principles form one adversarial input BEFORE both
  // arms. This is decision-mechanism parity, not natural mayor veto frequency.
  world = profile("authored-held-principles", () =>
    recordPrinciples(
      world,
      netBearings(questionId).map(([principleId, weight]) => ({
        stableKey: `G6-mayor:held:${principleId}`,
        personId: mayor,
        principleId,
        formedAt: world.currentDate,
        stance: weight > 0 ? ("endorses" as const) : ("rejects" as const),
        strength: 1,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("reflection:test", {
          note: "Authored adversarial principle input shared by old/new arms; not an empirical preference.",
        }),
        supersedesPrincipleRecordId: null,
      })),
    ),
  );
  const question = {
    id: questionId,
    score: principledLeaning(world, mayor, questionId).score,
  };
  expect(question.score).toBeGreaterThan(0);
  const answer = "no" as const;
  world = introduceMeasure(world, {
    stableKey: `municipal-measure:${governmentKey}:G6-fixture`,
    jurisdictionId: place.context.jurisdiction.id,
    rulePackId: pack.packId,
    designation: "Council act G6 fixture",
    shortTitle: "Non-neutral mayor fixture",
    summary: "Supplied procedure for same-input executive comparison.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = placeMeasureOnCalendar(world, {
    stableKey: "G6-mayor:calendar",
    measureId,
  });
  const dispositions = municipalSeats(world, governmentKey).map(
    (seat, index) => ({
      memberKey: `council:${index + 1}`,
      personId: seat.personId,
      disposition: "yea" as const,
    }),
  );
  for (
    let index = 0;
    index < pack.chambers[0]!.floorStages.length;
    index += 1
  ) {
    const earliest = municipalOrdinanceStatus(
      world,
      governmentKey,
      measureId,
    )!.earliestPassageOn;
    if (earliest && world.currentDate < earliest)
      world = isolateAt(world, earliest);
    const taken = profile("record-council-readings", () =>
      recordCouncilReadingVote(world, {
        governmentKey,
        measureId,
        dispositions,
        provenance: {
          method: "authored-fixture",
          note: "Supplied canonical council votes; executive caller proof only.",
          sourceEntityIds: [world.id],
        },
      }),
    );
    if (!taken.ok) throw new Error(taken.reason);
    world = taken.world;
  }
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === COUNCIL_ACT_EXECUTIVE_DEADLINE &&
      item.entityIds.includes(measureId),
  )!;
  expect(due).toBeDefined();
  world = isolateAt(world, due.dueAt, due.id);
  return {
    world,
    mayor,
    measureId,
    question,
    answer,
    due,
  };
}

const places = lifePlaceStateIdentities().map((state) => ({
  state: state.jurisdictionKey,
  place: searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
  })[0]!,
}));
const comparisons: unknown[] = [];
afterAll(() => {
  if (process.env.G6_MAYOR_PROFILE_PATH)
    writeFileSync(
      process.env.G6_MAYOR_PROFILE_PATH,
      JSON.stringify(
        {
          source: process.env.G6_MAYOR_PROFILE_SOURCE,
          phases: [...profileCosts]
            .map(([label, durationMs]) => ({ label, durationMs }))
            .sort((a, b) => b.durationMs - a.durationMs),
          worlds: profileWorlds,
        },
        null,
        2,
      ),
    );
  if (process.env.G6_MAYOR_REPORT_PATH)
    writeFileSync(
      process.env.G6_MAYOR_REPORT_PATH,
      JSON.stringify(comparisons, null, 2),
    );
});
describe("municipal executives use the shared bill evaluator", () => {
  it("covers all 56 real starting jurisdictions", () =>
    expect(new Set(places.map((p) => p.state)).size).toBe(56));
  it("respects both actual mayor player choices and records late inaction without a fabricated signature", () => {
    const { world, mayor, measureId, due } = presentedAct("G6-mayor-player:DC");
    const previous =
      world.control.kind === "person" ? world.control.personId : null;
    const handoff = recordWorldEvent(world, {
      stableKey: "G6-mayor:control-handoff",
      type: "test.control-moved",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [
        mayor,
        ...(previous
          ? [previous, ...playerRequiredWorkIds(world, previous)]
          : []),
      ],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "Controlled fixture moves play to the actual D.C. Mayor.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const released = previous
      ? releasePlayerRequiredWork(handoff, {
          personId: previous,
          stableKeyPrefix: "G6-mayor:released",
          outcomeEventId: handoff.history.events.at(-1)!.id,
        })
      : handoff;
    const controlled: World = {
      ...released,
      control: { kind: "person", personId: mayor },
    };
    for (const decision of ["sign", "return"] as const) {
      const acted = actOnCouncilMeasure(controlled, {
        governmentKey,
        measureId,
        decision,
        reasons: "Actual player written disapproval.",
      });
      if (!acted.ok) throw new Error(acted.reason);
      const presented = measureActions(controlled, measureId).find(
        (action) => action.kind === "presented-to-executive",
      )!;
      expect(
        acted.world.history.knowledge.filter(
          (knowledge) =>
            knowledge.personId === mayor &&
            knowledge.eventId === presented.eventId,
        ),
      ).toHaveLength(1);
      expect(acted.world.history.executiveDispositions!.at(-1)!.action).toBe(
        decision === "sign" ? "signed" : "vetoed",
      );
      expect(
        acted.world.history.decisionTraces!.at(-1)!.context.actorPersonId,
      ).toBe(mayor);
      expect(councilActExecutiveDeadlineHandler(acted.world, due).world).toBe(
        acted.world,
      );
      expect(
        deserializeWorld(
          serializeWorld(acted.world),
        ).history.executiveDispositions!.at(-1),
      ).toEqual(acted.world.history.executiveDispositions!.at(-1));
    }
    const late = isolateAt(controlled, addDays(due.dueAt, 1), due.id);
    expect(
      actOnCouncilMeasure(late, {
        governmentKey,
        measureId,
        decision: "return",
      }).ok,
    ).toBe(false);
    const lapsed = councilActExecutiveDeadlineHandler(late, due).world;
    expect(measurePosition(lapsed, measureId).phase).toBe("enacted");
    expect(
      measureActions(lapsed, measureId).filter(
        (a) => a.kind === "became-law-without-signature",
      ),
    ).toHaveLength(1);
    expect(
      measureActions(lapsed, measureId).filter(
        (a) => a.kind === "signed" || a.kind === "vetoed",
      ),
    ).toHaveLength(0);
    expect(councilActExecutiveDeadlineHandler(lapsed, due).world).toBe(lapsed);
  });
  it.each(places)(
    "non-neutral old/new mayor comparison from $state",
    ({ state, place }) => {
      const { world, mayor, measureId, question, answer, due } = presentedAct(
        `G6-mayor-parity:${state}`,
        place.key,
      );
      const measure = requireMeasure(world, measureId);
      expect(
        measureActions(world, measureId).filter(
          (action) => action.kind === "presented-to-executive",
        ),
      ).toHaveLength(1);
      expect(
        world.history.events.some(
          (event) =>
            event.stableKey === `${measure.stableKey}:executive-not-presented`,
        ),
      ).toBe(false);
      expect(completeCouncilPassage(world, measure, governmentKey)).toBe(world);
      const expected = profile("expected-executive-evaluation", () =>
        evaluateGovernorBill(world, {
          stableKey: `${measure.stableKey}:executive-desk`,
          governorId: mayor,
          executiveTitle: "Mayor",
          measure,
          staff: null,
        }),
      );
      expect(expected.outcomeKind).toBe("selected");
      const action =
        expected.selectedOptionKey === BILL_SIGN ? "signed" : "vetoed";
      const next = profile("executive-deadline-handler", () =>
        councilActExecutiveDeadlineHandler(world, due),
      ).world;
      expect(next.history.executiveDispositions!.at(-1)!.action).toBe(action);
      expect(next.history.decisionTraces!.at(-1)!.selectedOptionKey).toBe(
        expected.selectedOptionKey,
      );
      expect(next.history.decisionTraces!.at(-1)!.context.randomness).toBe(
        "none",
      );
      expect(next.history.decisionTraces!.at(-1)!.context.actorPersonId).toBe(
        mayor,
      );
      const event = next.history.events.find(
        (e) =>
          e.involvedEntityIds.includes(measureId) &&
          e.type ===
            (action === "signed"
              ? "legislation.measure-signed"
              : "legislation.measure-vetoed"),
      )!;
      expect(event.participants[0]?.personId).toBe(mayor);
      expect(event.summary).toContain(personName(next.people[mayor]!));
      expect(
        measureActions(next, measureId).filter(
          (a) => a.kind === "signed" || a.kind === "vetoed",
        ),
      ).toHaveLength(1);
      expect(measurePosition(next, measureId).phase).toBe(
        action === "signed" ? "enacted" : "awaiting-override",
      );
      expect(councilActExecutiveDeadlineHandler(next, due).world).toBe(next);
      const saved = profile("serialize-world", () => serializeWorld(next));
      const continued: World = profile("deserialize-world", () =>
        deserializeWorld(saved),
      );
      if (process.env.G6_MAYOR_PROFILE_PATH)
        profileWorlds.push({
          state,
          seed: world.seed,
          checksum: createHash("sha256").update(saved).digest("hex"),
        });
      expect(councilActExecutiveDeadlineHandler(continued, due).world).toBe(
        continued,
      );
      comparisons.push({
        startingJurisdiction: state,
        startingPlace: place.key,
        seed: world.seed,
        mayor: personName(next.people[mayor]!),
        question: world.policyCatalog.propositions[question.id]!.stableKey,
        answer,
        old: "signed",
        next: action,
        reasons: expected.context.considerations.map((r) => r.explanation),
      });
    },
  );
});

const noActionSeed = "A80 test-controlled no available municipal executive action";
const noActionRng = new SeededRng(noActionSeed);
const noActionPool = [...places];
const noActionPlaces = Array.from(
  { length: 5 },
  () => noActionPool.splice(noActionRng.integer(0, noActionPool.length), 1)[0]!,
);

describe("test-controlled unavailable municipal executive actions", () => {
  it.each(noActionPlaces)(
    "preserves silence follow-up from starting $state",
    ({ state, place }) => {
      // Unfiltered all-56 draws; the same actual D.C. government in every world.
      const { world, mayor, measureId, due } = presentedAct(
        `${noActionSeed}:${state}`,
        place.key,
      );
      const realEvaluate = governorBillDecision.evaluateGovernorBill;
      const evaluator = vi
        .spyOn(governorBillDecision, "evaluateGovernorBill")
        .mockImplementation((subject, input) => {
          const actual = realEvaluate(subject, input);
          // Explicit test constraints, not natural mayor indecision.
          // Real evaluation and durable trace replay remain unmocked.
          return evaluateDecision(subject, {
            ...actual.context,
            constraints: actual.context.options.map((option) => ({
              stableKey: `fixture:blocked:${option.key}`,
              optionKey: option.key,
              kind: "context:fixture-no-executive-action",
              explanation:
                "Explicit boundary control blocks this action to exercise the existing silence lifecycle.",
              sourceRefs: [],
            })),
          });
        });
      try {
        const handlers = createFutureTransitionHandlerRegistry([
          [COUNCIL_ACT_EXECUTIVE_DEADLINE, councilActExecutiveDeadlineHandler],
        ]);
        const next = resolveFutureDueItemsThrough(world, due.dueAt, handlers);
        expect(evaluator).toHaveBeenCalledTimes(1);
        const trace = next.history.decisionTraces!.at(-1)!;
        expect(trace.outcomeKind).toBe("no-available-option");
        expect(trace.selectedOptionKey).toBeNull();
        expect(trace.context.actorPersonId).toBe(mayor);
        expect(trace.context.randomness).toBe("none");
        expect(trace.context.considerations.length).toBeGreaterThan(0);
        expect(trace.context.constraints).toHaveLength(
          trace.context.options.length,
        );
        expect(measurePosition(next, measureId).phase).toBe(
          "awaiting-executive",
        );
        expect(
          measureActions(next, measureId).filter(
            (action) =>
              action.kind === "signed" ||
              action.kind === "vetoed" ||
              action.kind === "became-law-without-signature",
          ),
        ).toHaveLength(0);
        expect(
          futureDueItemStateAt(next, due.id, {
            asOfDate: next.currentDate,
            historySequenceExclusive: next.history.nextSequence,
          })?.status,
        ).toBe("resolved");
        const silence = next.history.futureDueItems.filter(
          (item) =>
            item.transitionKey === COUNCIL_ACT_EXECUTIVE_DEADLINE &&
            item.entityIds.includes(measureId) &&
            item.id !== due.id,
        );
        expect(silence).toHaveLength(1);
        expect(silence[0]!.dueAt).toBe(addDays(due.dueAt, 1));
        const continued = deserializeWorld(serializeWorld(next));
        expect(continued.history.decisionTraces!.at(-1)).toEqual(trace);
        expect(
          continued.history.futureDueItems.find(
            (item) => item.id === silence[0]!.id,
          ),
        ).toEqual(silence[0]);
        const isolated = isolateAt(
          continued,
          silence[0]!.dueAt,
          silence[0]!.id,
        );
        const enacted = resolveFutureDueItemsThrough(
          isolated,
          silence[0]!.dueAt,
          handlers,
        );
        expect(evaluator).toHaveBeenCalledTimes(1);
        expect(measurePosition(enacted, measureId).phase).toBe("enacted");
        expect(
          measureActions(enacted, measureId).filter(
            (action) => action.kind === "became-law-without-signature",
          ),
        ).toHaveLength(1);
        expect(
          measureActions(enacted, measureId).filter(
            (action) => action.kind === "signed" || action.kind === "vetoed",
          ),
        ).toHaveLength(0);
        const repeated = resolveFutureDueItemsThrough(
          enacted,
          addDays(silence[0]!.dueAt, 1),
          handlers,
        );
        expect(measureActions(repeated, measureId)).toEqual(
          measureActions(enacted, measureId),
        );
        expect(
          councilActExecutiveDeadlineHandler(enacted, silence[0]!).world,
        ).toBe(enacted);
        comparisons.push({
          fixture:
            "Test constraints block both actions; same actual D.C. government",
          startingJurisdiction: state,
          startingPlace: place.key,
          seed: world.seed,
          finalDay: due.dueAt,
          silenceDay: silence[0]!.dueAt,
          mayor: personName(world.people[mayor]!),
          traceId: trace.id,
          outcome: "became-law-without-signature",
        });
      } finally {
        evaluator.mockRestore();
      }
    },
  );
});
