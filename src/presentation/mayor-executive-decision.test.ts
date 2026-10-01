/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { adultLifeAt } from "../../tests/fixtures/state-executive-entry";
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
import { questionAuthority } from "../simulation/governing/question-authority";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { addDays, simulationMomentOnLocalDate } from "../simulation/dates";
import { recordWorldEvent } from "../simulation/world";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../simulation/time-work";
import { personName } from "../simulation/people";
import type { World, IsoDate, EntityId } from "../simulation/types";

import { ensureDistrictOfColumbiaCouncilOpening } from "../simulation/nationwide-world/district-of-columbia-council-opening";

import { ensureStateExecutiveIncumbent } from "../simulation/nationwide-world/state-executives";
import {
  createFormationContext,
  recordPrinciples,
} from "../simulation/politics";

const governmentKey = "us-dc-washington";

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
  let world = adultLifeAt(openingPlaceKey, seed).world;
  // Materialize the same real D.C. government in each starting world through
  // its existing opening writer; this is not 56 different municipal powers.
  if (!world.jurisdictions[place.context.jurisdiction.id])
    world = {
      ...world,
      jurisdictions: {
        ...world.jurisdictions,
        [place.context.jurisdiction.id]: place.context.jurisdiction,
      },
    };
  if (world.control.kind !== "person")
    throw new Error("Actual opening subject required.");
  world = ensureStateExecutiveIncumbent(world, world.control.personId, "DC");
  world = ensureDistrictOfColumbiaCouncilOpening(world);
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
  const authorized = world.policyCatalog.propositionOrder.filter(
    (id) =>
      questionAuthority(world, place.context.jurisdiction.id, id).may === "yes",
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
  world = recordPrinciples(
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
    const taken = recordCouncilReadingVote(world, {
      governmentKey,
      measureId,
      dispositions,
      provenance: {
        method: "authored-fixture",
        note: "Supplied canonical council votes; executive caller proof only.",
        sourceEntityIds: [world.id],
      },
    });
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
      const expected = evaluateGovernorBill(world, {
        stableKey: `${measure.stableKey}:executive-desk`,
        governorId: mayor,
        executiveTitle: "Mayor",
        measure,
        staff: null,
      });
      expect(expected.outcomeKind).toBe("selected");
      const action =
        expected.selectedOptionKey === BILL_SIGN ? "signed" : "vetoed";
      const next = councilActExecutiveDeadlineHandler(world, due).world;
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
      const continued: World = deserializeWorld(serializeWorld(next));
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
