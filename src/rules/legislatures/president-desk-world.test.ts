import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import * as legislation from "../../simulation/legislation";
import { presidentDesk as nativeDesk } from "../../simulation/governing/congress-lawmaking";
import { presidentDesk, type PresidentDeskFacts } from "./executive-desks";
import * as principles from "../../simulation/governing/officeholder-principles";
import * as governor from "../../simulation/governing/governor-bill-decision";
import * as trace from "../../simulation/decisions";
import * as clock from "../../simulation/governing/legislative-clock";
import * as matters from "../../simulation/governing/state-governing";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import type { InstitutionCommand } from "./institution-context";
import type { World } from "../../simulation/types";
// Native full roll-call writers provide an authored Congress-desk edge. This
// is not a claim that the ordinary NPC bill producer made this measure.
describe("legislatures: President desk writer protocol", () => {
  it.each(Object.keys(STATES))(
    "matches native requests in %s",
    (place) => {
      let world = ensureNationalElectionJurisdiction(
        smallWorld({
          place: `US-${place}`,
          seed: `rules2-president-desk:${place}`,
          offices: ["congress"],
        }).world,
      );
      world = { ...world, control: { kind: "observer" } };
      const pack = US_CONGRESS_RULE_PACK,
        sponsor = seatedCongressChamber(world, "house")!.body.members.find(
          (row) => row.personId,
        )!.personId!;
      world = legislation.introduceMeasure(world, {
        stableKey: `rules2:${place}:desk-bill`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: pack.packId,
        designation: "H.R. 903",
        shortTitle: "Authored desk control",
        summary: "Native writer edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsor,
        originChamberKey: "house",
        propositionIds: [],
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      for (const chamber of pack.chambers) {
        if (
          legislation.measurePosition(world, measure.id).phase ===
          "awaiting-transmittal"
        )
          world = legislation.transmitMeasure(world, {
            stableKey: `${measure.stableKey}:transmit`,
            measureId: measure.id,
          });
        const body = seatedCongressChamber(world, chamber.chamberKey)!.body;
        const committee = chamber.committees[0]!;
        world = legislation.referMeasure(world, {
          stableKey: `${measure.stableKey}:${chamber.chamberKey}:ref`,
          measureId: measure.id,
          committeeKey: committee.committeeKey,
        });
        const dispositions = body.members.map((row) => ({
          memberKey: row.memberKey,
          personId: row.personId,
          disposition: "yea" as const,
        }));
        world = legislation.recordCommitteeDisposition(world, {
          stableKey: `${measure.stableKey}:${chamber.chamberKey}:committee`,
          measureId: measure.id,
          recommendation: "favorable",
          dispositions: dispositions.slice(0, committee.appointedMembers),
          rationale: "Authored full-roll-call control.",
          provenance: {
            method: "authored-fixture",
            note: "Explicit passage edge.",
            sourceEntityIds: [measure.id],
          },
        });
        world = legislation.placeMeasureOnCalendar(world, {
          stableKey: `${measure.stableKey}:${chamber.chamberKey}:agenda`,
          measureId: measure.id,
        });
        for (const stage of chamber.floorStages) {
          const pos = legislation.measurePosition(world, measure.id);
          if (
            pos.earliestNextFloorDate &&
            pos.earliestNextFloorDate > world.currentDate
          )
            world = {
              ...world,
              currentDate: pos.earliestNextFloorDate,
              currentMoment: {
                ...world.currentMoment,
                date: pos.earliestNextFloorDate,
              },
            };
          world = legislation.takeFloorVote(world, {
            stableKey: `${measure.stableKey}:${chamber.chamberKey}:${stage.stageKey}`,
            measureId: measure.id,
            dispositions,
            presentMembers: body.members.length,
            electedMembers: body.members.length,
            provenance: {
              method: "authored-fixture",
              note: "Explicit full roll call.",
              sourceEntityIds: [measure.id],
            },
          });
        }
      }
      world = legislation.enrollMeasure(world, {
        stableKey: `${measure.stableKey}:enroll`,
        measureId: measure.id,
      });
      world = legislation.presentMeasureToExecutive(world, {
        stableKey: `${measure.stableKey}:present`,
        measureId: measure.id,
      });
      const raw = (at: World): PresidentDeskFacts => ({
        onDate: at.currentDate,
        measure,
        pack,
        actions: at.history.legislativeActions ?? [],
        hasStartingProcedure: false,
        presidentPersonId: currentPresidentOf(at)?.personId ?? null,
        playerPersonId:
          at.control.kind === "person" ? at.control.personId : null,
        window: governor.executiveBillActionWindow(at, measure),
        principlesPrepared: false,
        evaluation: null,
      });
      const calls: InstitutionCommand[] = [];
      const ensureOriginal = principles.ensureOfficeholderPrinciples,
        evaluateOriginal = governor.evaluateGovernorBill,
        traceOriginal = trace.recordDurableDecisionTrace,
        decisionOriginal = clock.recordGovernorDecisionOnMeasure,
        scheduleOriginal = clock.scheduleInstitutionStep;
      let prepared = world,
        evaluation: ReturnType<typeof governor.evaluateGovernorBill> | null =
          null;
      const spies = [
        vi
          .spyOn(principles, "ensureOfficeholderPrinciples")
          .mockImplementation((at, ids) => {
            calls.push({
              command: "ensureOfficeholderPrinciples",
              input: { personIds: ids },
            });
            prepared = ensureOriginal(at, ids);
            return prepared;
          }),
        vi
          .spyOn(governor, "evaluateGovernorBill")
          .mockImplementation((at, input) => {
            calls.push({ command: "evaluateGovernorBill", input });
            evaluation = evaluateOriginal(at, input);
            return evaluation;
          }),
        vi
          .spyOn(trace, "recordDurableDecisionTrace")
          .mockImplementation((at, ev) => {
            calls.push({
              command: "recordDurableDecisionTrace",
              input: { evaluation: ev },
            });
            return traceOriginal(at, ev);
          }),
        vi
          .spyOn(clock, "recordGovernorDecisionOnMeasure")
          .mockImplementation((at, id, action, rationale, person) => {
            calls.push({
              command: "recordGovernorDecisionOnMeasure",
              input: {
                measureId: id,
                action,
                rationale,
                actorPersonId: person,
              },
            });
            return decisionOriginal(at, id, action, rationale, person);
          }),
        vi
          .spyOn(clock, "scheduleInstitutionStep")
          .mockImplementation((at, id) => {
            calls.push({
              command: "scheduleInstitutionStep",
              input: { measureId: id },
            });
            return scheduleOriginal(at, id);
          }),
      ];
      try {
        nativeDesk(world, measure);
      } finally {
        spies.forEach((s) => s.mockRestore());
      }
      expect([
        ...presidentDesk(raw(world), measure),
        ...presidentDesk(
          { ...raw(prepared), principlesPrepared: true },
          measure,
        ),
        ...presidentDesk(
          { ...raw(prepared), principlesPrepared: true, evaluation },
          measure,
        ),
      ]).toEqual(calls);
      const president = currentPresidentOf(world)!.personId,
        controlled = {
          ...world,
          control: { kind: "person" as const, personId: president },
        };
      const matterCalls: InstitutionCommand[] = [];
      const original = matters.openPresidentBillMatter;
      const capture = vi
        .spyOn(matters, "openPresidentBillMatter")
        .mockImplementation((at, bill) => {
          matterCalls.push({
            command: "openPresidentBillMatter",
            input: { measureId: bill.id },
          });
          return original(at, bill);
        });
      try {
        nativeDesk(controlled, measure);
      } finally {
        capture.mockRestore();
      }
      expect(presidentDesk(raw(controlled), measure)).toEqual(matterCalls);
    },
    30000,
  );
});
