import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  municipalGovernmentForLifePlace,
  municipalProcedureReading,
  municipalRulePackFor,
  municipalRuleSourceRef,
} from "../../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
  municipalSeats,
  municipalGovernmentJurisdictionId,
  municipalMeasures,
  municipalMeasureKey,
} from "../../simulation/municipal-public-work";
import * as native from "../../simulation/legislation";
import * as procedure from "../../simulation/municipal-ordinance-procedure";
import * as governing from "../../simulation/governing/state-governing";
import { addDays } from "../../simulation/dates";
import { takeFloorVote } from "./floor-vote-admission";
import { checkCouncilVote, type CouncilVoteFacts } from "./council-vote";
import { actOnCouncilMeasure } from "./executive-desks";
import type { World } from "../../simulation/types";

// These are authored council roll calls through native writers. They prove
// arithmetic/request equivalence, not spontaneous NPC ordinance production.
describe("legislatures: council passage, executive and override caller protocols", () => {
  let readings = 0,
    overrides = 0;
  afterAll(() => {
    expect(readings).toBeGreaterThan(0);
    expect(overrides).toBeGreaterThan(0);
  });
  it.each(Object.keys(STATES))(
    "matches the compiled home council in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-council-protocol:${place}`,
        people: 30,
        offices: ["governor"],
      });
      let world = base.world;
      const government = municipalGovernmentForLifePlace(base.place);
      const compiled = government ? municipalRulePackFor(government) : null;
      if (!government || !compiled?.ok) {
        const result = procedure.actOnCouncilMeasure(
          { ...world, control: { kind: "observer" } },
          {
            governmentKey: government?.key ?? "missing",
            measureId: world.id,
            decision: "return",
          },
        );
        expect(result).toMatchObject({
          ok: false,
          reason: "Person control is required.",
        });
        return;
      }
      const pack = compiled.pack,
        reading = municipalProcedureReading(government);
      world = installMunicipalGovernment(world, {
        governmentKey: government.key,
        jurisdictionId: base.jurisdictionId,
        formedAt: world.currentDate,
      });
      for (let index = 0; index < Math.min(25, reading.bodySize ?? 5); index++)
        world = seatMunicipalMember(world, {
          governmentKey: government.key,
          personId: world.personOrder[index]!,
          startedAt: world.currentDate,
          role: index === 0 ? "presiding-member" : "member",
          seatLabel: `Authored seat ${index + 1}`,
        });
      world = seatMunicipalMember(world, {
        governmentKey: government.key,
        personId: world.personOrder[29]!,
        startedAt: world.currentDate,
        role: "mayor",
        seatLabel: "Authored executive control",
      });
      const seats = municipalSeats(world, government.key).filter(
        (row) => row.role === "member" || row.role === "presiding-member",
      );
      const dispositions = seats.map((seat) => ({
        memberKey: `council:${seat.participationId}`,
        personId: seat.personId,
        disposition: "yea" as const,
      }));
      const jurisdictionId = municipalGovernmentJurisdictionId(
        world,
        government.key,
      )!;
      const designation = "ORD 901";
      world = native.introduceMeasure(world, {
        stableKey: municipalMeasureKey(government.key, designation),
        jurisdictionId,
        rulePackId: pack.packId,
        designation,
        shortTitle: "Authored council protocol",
        summary: "Native writer equivalence edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: seats[0]!.personId,
        originChamberKey: pack.chamberOrder[0]!,
        propositionIds: [],
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      world = native.placeMeasureOnCalendar(world, {
        stableKey: `${measure.stableKey}:agenda`,
        measureId: measure.id,
      });
      const raw = (at: World) => ({
        measure,
        pack,
        actions: at.history.legislativeActions ?? [],
        onDate: at.currentDate,
        hasStartingProcedure: false,
      });
      const provenance = {
        method: "authored-fixture" as const,
        note: "Explicit roll-call edge, not a selected outcome.",
        sourceEntityIds: [measure.id],
      };
      for (const stage of pack.chambers[0]!.floorStages) {
        const position = native.measurePosition(world, measure.id);
        if (position.phase !== "on-floor") break;
        if (
          position.earliestNextFloorDate &&
          position.earliestNextFloorDate > world.currentDate
        )
          world = {
            ...world,
            currentDate: position.earliestNextFloorDate,
            currentMoment: {
              ...world.currentMoment,
              date: position.earliestNextFloorDate,
            },
          };
        const input = {
          stableKey: `${measure.stableKey}:${stage.stageKey}`,
          measureId: measure.id,
          dispositions,
          presentMembers: seats.length,
          electedMembers: seats.length,
          provenance,
        };
        let after;
        try {
          after = native.takeFloorVote(world, input);
        } catch (error) {
          expect(() =>
            takeFloorVote(
              {
                ...raw(world),
                personIds: new Set(world.personOrder),
                recordId: world.id,
                nextSequence: world.history.nextSequence,
              },
              input,
            ),
          ).toThrow((error as Error).message);
          return;
        }
        const vote = after.history.legislativeVotes!.at(-1)!;
        expect(
          takeFloorVote(
            {
              ...raw(world),
              personIds: new Set(world.personOrder),
              recordId: vote.id,
              nextSequence: vote.sequence,
            },
            input,
          ).vote,
        ).toEqual(vote);
        readings++;
        world = after;
      }
      if (
        native.measurePosition(world, measure.id).phase !==
        "awaiting-enrollment"
      )
        return;
      world = procedure.completeCouncilPassage(world, measure, government.key);
      if (
        native.measurePosition(world, measure.id).phase !== "awaiting-executive"
      )
        return;
      const executive = procedure.municipalExecutiveHolder(
        world,
        government.key,
      );
      if (!executive) return;
      world = { ...world, control: { kind: "person", personId: executive } };
      const input = {
        governmentKey: government.key,
        measureId: measure.id,
        decision: "return" as const,
        reasons: "Authored return control.",
      };
      const before = world,
        receipts: Parameters<typeof governing.decideGoverningMatter>[] = [];
      const original = governing.decideGoverningMatter;
      const capture = vi
        .spyOn(governing, "decideGoverningMatter")
        .mockImplementation((...args) => {
          receipts.push(args);
          return original(...args);
        });
      let result;
      try {
        result = procedure.actOnCouncilMeasure(world, input);
      } finally {
        capture.mockRestore();
      }
      const plan = actOnCouncilMeasure(
        {
          ...raw(before),
          playerPersonId: executive,
          executivePersonId: executive,
          councilMeasures: municipalMeasures(before, government.key),
          matterPrepared: false,
          matters: [],
        },
        input,
      );
      expect(plan.commands).toEqual([
        {
          command: "openMunicipalBillMatter",
          input: { measure, governmentKey: government.key },
        },
      ]);
      expect(receipts).toHaveLength(1);
      const prepared = receipts[0]![0];
      expect(
        actOnCouncilMeasure(
          {
            ...raw(prepared),
            playerPersonId: executive,
            executivePersonId: executive,
            councilMeasures: municipalMeasures(prepared, government.key),
            matterPrepared: true,
            matters: governing.governingMatters(prepared),
          },
          input,
        ).commands,
      ).toEqual([
        {
          command: "decideGoverningMatter",
          input: {
            matterId: receipts[0]![1],
            decision: receipts[0]![2],
            reasons: receipts[0]![3],
          },
        },
      ]);
      if (
        !result.ok ||
        native.measurePosition(result.world, measure.id).phase !==
          "awaiting-override"
      )
        return;
      world = result.world;
      const facts: CouncilVoteFacts = {
        reading,
        councilors: seats,
        quorumSource: municipalRuleSourceRef(
          reading,
          reading.procedure.quorumText ?? "Quorum.",
        ),
        appointmentSource: municipalRuleSourceRef(reading, "Appointment."),
        managerElectionThreshold: null,
      };
      for (const rows of [
        dispositions,
        dispositions.slice(0, 1),
        [...dispositions, dispositions[0]!],
        dispositions.map((row, index) =>
          index === 0 ? { ...row, personId: world.personOrder[29]! } : row,
        ),
      ]) {
        let request: Parameters<typeof native.attemptVetoOverride>[1] | null =
          null;
        // The private check is reached through its public owning caller. The next
        // writer is a receipt seam: its own override math has separate goldens.
        const writer = vi
          .spyOn(native, "attemptVetoOverride")
          .mockImplementation((_at, input) => {
            request = input;
            throw new Error("rules2:override-writer-boundary");
          });
        let expected;
        try {
          expected = procedure.recordCouncilOverrideVote(world, {
            governmentKey: government.key,
            measureId: measure.id,
            dispositions: rows,
            provenance,
          });
        } finally {
          writer.mockRestore();
        }
        const checked = checkCouncilVote(facts, government.key, rows);
        if (!checked.ok)
          expect(expected).toMatchObject({ ok: false, reason: checked.reason });
        else {
          expect(expected).toMatchObject({
            ok: false,
            reason: "rules2:override-writer-boundary",
          });
          expect(request).toMatchObject({
            forums: [
              {
                forumKey: "council",
                dispositions: rows,
                presentMembers: checked.present,
                electedMembers: checked.seats,
              },
            ],
          });
          overrides++;
        }
      }
      const deadline = procedure.overrideDeadline(
        world,
        government.key,
        measure.id,
      );
      if (deadline) {
        const date = addDays(deadline, 1),
          at = {
            ...world,
            currentDate: date,
            currentMoment: { ...world.currentMoment, date },
          };
        expect(
          procedure.recordCouncilOverrideVote(at, {
            governmentKey: government.key,
            measureId: measure.id,
            dispositions,
            provenance,
          }),
        ).toMatchObject({
          ok: false,
          reason: `The time to reenact ${measure.designation} ended on ${deadline}.`,
        });
      }
    },
    30000,
  );
});
