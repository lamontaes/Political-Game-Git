import { describe, expect, it, vi } from "vitest";
import { adultLifeAt } from "../../tests/fixtures/state-executive-entry";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { currentPresidentOf } from "../simulation/crisis/offices";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../simulation/congress-rule-pack";
import { presidentDesk } from "../simulation/governing/congress-lawmaking";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import * as executive from "../simulation/governing/governor-bill-decision";
import { evaluateDecision } from "../simulation/decisions";
import {
  introduceMeasure,
  referMeasure,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  requireMeasure,
  measurePosition,
} from "../simulation/legislation";
import {
  committeeMembers,
  dispositionsFromCounts,
} from "../simulation/legislation-scenarios";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../simulation/national-election-geography";
import {
  governingMatters,
  governingMatterById,
  governingOfficeForPerson,
  decideGoverningMatter,
  governingDeadlineHandler,
  governingNpcDecisionHandler,
  GOVERNING_DEADLINE,
} from "../simulation/governing/state-governing";
import { projectGoverningOfficeDesk } from "./governing-office-desk";
import { projectGoverningBriefing } from "./governing-briefing";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { personName } from "../simulation/people";
import { daysBetween, simulationMomentOnLocalDate } from "../simulation/dates";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../simulation/time-work";
import { recordWorldEvent } from "../simulation/world";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import * as procedures from "../simulation/legislative-procedure-world";
import { SeededRng } from "../simulation/rng";
import type {
  EntityId,
  LegislativeMeasureRecord,
  World,
} from "../simulation/types";

/** Explicit supplied votes test the desk, not ordinary bill production. */
function presentedBill(
  world: World,
  propositionAnswers?: LegislativeMeasureRecord["propositionAnswers"],
): { world: World; measureId: EntityId } {
  let next = introduceMeasure(ensureNationalElectionJurisdiction(world), {
    stableKey: "executive-parity:neutral",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. executive fixture",
    shortTitle: "Neutral executive fixture",
    summary: "Supplied procedure for executive parity.",
    propositionAnswers,
    propositionIds: propositionAnswers?.map((row) => row.propositionId),
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const provenance = {
    method: "authored-fixture" as const,
    note: "Explicit supplied roll calls; not ordinary sponsor proof.",
    sourceEntityIds: [world.id],
  };
  for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
    const body = seatedCongressChamber(next, chamber.chamberKey)!.body;
    const committee = chamber.committees[0]!;
    const key = `executive-parity:${chamber.chamberKey}`;
    next = referMeasure(next, {
      stableKey: `${key}:referral`,
      measureId,
      committeeKey: committee.committeeKey,
    });
    next = recordCommitteeDisposition(next, {
      stableKey: `${key}:committee`,
      measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers },
      ),
      rationale: "Supplied committee approval.",
      provenance,
    });
    next = placeMeasureOnCalendar(next, {
      stableKey: `${key}:calendar`,
      measureId,
    });
    for (const stage of chamber.floorStages)
      next = takeFloorVote(next, {
        stableKey: `${key}:${stage.stageKey}`,
        measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: body.members.length,
        }),
        presentMembers: body.members.length,
        electedMembers: body.members.length,
        provenance,
      });
    if (chamber.chamberKey === "house")
      next = transmitMeasure(next, { stableKey: `${key}:transmit`, measureId });
  }
  next = enrollMeasure(next, {
    stableKey: "executive-parity:enroll",
    measureId,
  });
  next = presentMeasureToExecutive(next, {
    stableKey: "executive-parity:present",
    measureId,
  });
  return { world: next, measureId };
}
const allPlaces = lifePlaceStateIdentities().map((state) => ({
  state: state.jurisdictionKey,
  place: searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
  })[0]!,
}));
const pool = [...allPlaces];
const fixtureRng = new SeededRng("G6-player-desk-five-places");
const places = Array.from(
  { length: 5 },
  () => pool.splice(fixtureRng.integer(0, pool.length), 1)[0]!,
);

describe("player President shares the executive desk and legal window", () => {
  it("has actual place data in all56 and declares only the sourced Congress day basis", () => {
    expect(new Set(allPlaces.map((p) => p.state)).size).toBe(56);
    expect(allPlaces.every((p) => p.place)).toBe(true);
    expect(
      US_CONGRESS_RULE_PACK.executive.actionWindowDayBasisInSession,
    ).toMatchObject({ kind: "known", value: "SUNDAYS_EXCEPTED" });
    expect(
      US_CONGRESS_RULE_PACK.executive.actionWindowDayBasisAfterAdjournment
        ?.kind,
    ).toBe("unknown");
  });
  it.each(places)(
    "actual desk, choice, lapse and saved continuation in $state",
    ({ state, place }) => {
      const opened = adultLifeAt(place.key, `G6-player-desk:${state}`).world;
      const president = currentPresidentOf(opened)!;
      const previous =
        opened.control.kind === "person" ? opened.control.personId : null;
      const handoff = recordWorldEvent(opened, {
        stableKey: "test:president-desk:control-handoff",
        type: "test.control-moved",
        occurredAt: opened.currentDate,
        recordedAt: opened.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [
          ...(previous
            ? [previous, ...playerRequiredWorkIds(opened, previous)]
            : []),
          president.personId,
        ],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary:
          "Play moved to the actual seated President for this controlled fixture.",
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
            stableKeyPrefix: "test:president-desk:released",
            outcomeEventId: handoff.history.events.at(-1)!.id,
          })
        : handoff;
      const controlled: World = {
        ...released,
        control: { kind: "person", personId: president.personId },
      };
      const fixture = presentedBill(controlled);
      const measure = requireMeasure(fixture.world, fixture.measureId);
      const next = presidentDesk(fixture.world, measure);
      const matter = governingMatters(next, "us-president").find(
        (m) => m.measureId === measure.id,
      )!;
      expect(matter).toBeDefined();
      expect(matter.holderPersonId).toBe(president.personId);
      expect(matter.workItemId).not.toBeNull();
      expect(next.history.executiveDispositions ?? []).toHaveLength(0);
      expect(
        governingOfficeForPerson(next, president.personId)?.organizationId,
      ).toBeNull();
      expect(
        projectGoverningOfficeDesk(next, president.personId)?.staff,
      ).toEqual([]);
      expect(
        projectGoverningBriefing(next, president.personId)?.calendarNote,
      ).toBeNull();
      expect(presidentDesk(next, measure)).toBe(next);
      const window = executive.executiveBillActionWindow(next, measure)!;
      expect(
        daysBetween(next.currentDate, window.lastActionDate),
      ).toBeGreaterThan(10);
      expect(matter.deadline).toBe(window.lastActionDate);
      const due = next.history.futureDueItems.find(
        (d) =>
          d.transitionKey === GOVERNING_DEADLINE &&
          d.entityIds.includes(matter.id),
      )!;
      expect(due.dueAt).toBe(window.inactionAt);
      const restored = deserializeWorld(serializeWorld(next));
      expect(presidentDesk(restored, measure)).toBe(restored);
      // Each explicit action uses the same controlled person/bill, not an autonomous recommendation.
      for (const [choice, action] of [
        [executive.BILL_SIGN, "signed"],
        [executive.BILL_RETURN, "vetoed"],
      ] as const) {
        const result = decideGoverningMatter(restored, matter.id, choice);
        expect(result.ok).toBe(true);
        const disposition = result.world.history.executiveDispositions!.at(-1)!;
        expect(disposition.action).toBe(action);
        const trace = result.world.history.decisionTraces!.at(-1)!;
        expect(trace.context.actorPersonId).toBe(president.personId);
        expect(trace.selectedOptionKey).toBe(choice);
        expect(trace.context.randomness).toBe("none");
        expect(trace.context.constraints[0]?.sourceRefs).toContainEqual({
          kind: "historical-event",
          eventId: matter.openedEvent.id,
        });
        expect(disposition.actorLabel).toContain("President");
        const record = result.world.history.events.find(
          (e) =>
            e.type ===
              (action === "signed"
                ? "legislation.measure-signed"
                : "legislation.measure-vetoed") &&
            e.involvedEntityIds.includes(measure.id),
        )!;
        expect(record.summary).toContain(
          personName(result.world.people[president.personId]!),
        );
        const continued = deserializeWorld(serializeWorld(result.world));
        expect(decideGoverningMatter(continued, matter.id, choice).ok).toBe(
          false,
        );
      }
      // Scoped due-handler proof: supplied later date, not a full-year clock run.
      let isolated = restored;
      for (const item of restored.history.futureDueItems) {
        if (
          item.id === due.id ||
          item.dueAt >= due.dueAt ||
          futureDueItemStateAt(isolated, item.id, {
            asOfDate: isolated.currentDate,
            historySequenceExclusive: isolated.history.nextSequence,
          })?.status !== "scheduled"
        )
          continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `test:president-desk:isolate:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "civic:fixture-isolation",
          context:
            "Scoped executive due-handler fixture; other due families are cancelled, not skipped.",
        });
      }
      const late: World = {
        ...isolated,
        currentDate: due.dueAt,
        currentMoment: simulationMomentOnLocalDate(
          isolated.currentMoment,
          due.dueAt,
        ),
      };
      expect(
        decideGoverningMatter(late, matter.id, executive.BILL_SIGN).ok,
      ).toBe(false);
      const lapsed = governingDeadlineHandler(late, due).world;
      expect(lapsed.history.executiveDispositions!.at(-1)!.action).toBe(
        "became-law-without-signature",
      );
      expect(governingMatterById(lapsed, matter.id)?.status).toBe("lapsed");
      expect(measurePosition(lapsed, measure.id).phase).toBe(
        "awaiting-enactment",
      );
      expect(governingDeadlineHandler(lapsed, due).world).toBe(lapsed);
      expect(
        deserializeWorld(serializeWorld(lapsed)).history.executiveDispositions,
      ).toEqual(lapsed.history.executiveDispositions);
      const basis = vi
        .spyOn(procedures, "legislativeRulePackForWorld")
        .mockReturnValue({
          ...US_CONGRESS_RULE_PACK,
          executive: {
            ...US_CONGRESS_RULE_PACK.executive,
            actionWindowDayBasisInSession: {
              kind: "unknown",
              note: "Test of an unsupported day basis.",
            },
          },
        });
      try {
        expect(
          executive.executiveBillActionWindow(restored, measure),
        ).toBeNull();
      } finally {
        basis.mockRestore();
      }
      const before = executive.evaluateGovernorBill;
      const spy = vi
        .spyOn(executive, "evaluateGovernorBill")
        .mockImplementation((world, input) => {
          const actual = before(world, input);
          return evaluateDecision(world, {
            ...actual.context,
            stableKey: `${input.stableKey}:no-options`,
            constraints: actual.context.options.map((option) => ({
              stableKey: `test:unavailable:${option.key}`,
              optionKey: option.key,
              kind: "test:unavailable-option",
              explanation:
                "Both choices are blocked in this no-selection guard fixture.",
              sourceRefs: [],
            })),
          });
        });
      try {
        const pending = governingNpcDecisionHandler(restored, due).world;
        expect(pending.history.executiveDispositions ?? []).toHaveLength(0);
        expect(governingMatterById(pending, matter.id)?.status).toBe("open");
      } finally {
        spy.mockRestore();
      }
    },
  );
});
