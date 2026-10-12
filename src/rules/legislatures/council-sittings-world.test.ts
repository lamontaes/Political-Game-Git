import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { homeLocalGovernmentUnits } from "../../simulation/nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  localGovernmentSeated,
} from "../../simulation/living-world/local-government-seats";
import {
  councilRules,
  lawJurisdiction,
} from "../../simulation/living-world/local-council-binding";
import { playerTown } from "../../simulation/living-world/town-residents";
import * as meetings from "../../simulation/living-world/local-council-meetings";
import * as nativeClock from "../../simulation/governing/legislative-clock";
import * as ownClock from "./institution-driver";
import * as agenda from "../../simulation/governing/member-agenda";
import * as native from "../../simulation/legislation";
import { legislativeRulePackForWorld } from "../../simulation/legislative-procedure-world";
import {
  seatedCouncil,
  moveOrdinances,
  moveActs,
  type CouncilSittingFacts,
} from "./council-sittings";
import { dcCouncilSittingHandler } from "../../simulation/dc-council-sittings";
import {
  dcCouncilSeated,
  ensureDistrictOfColumbiaCouncilOpening,
  DC_GOVERNMENT_KEY,
} from "../../simulation/nationwide-world/district-of-columbia-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../../simulation/municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
  municipalSeats,
} from "../../simulation/municipal-public-work";
import type { World } from "../../simulation/types";
// Native producer/writer preparation; one authored measure. Filing new NPC
// bills is outside this parent protocol and is an explicitly intercepted seam.
describe("legislatures: private council sitting owners", () => {
  let localSteps = 0,
    recordedSteps = 0;
  afterAll(() => {
    expect(localSteps).toBeGreaterThan(0);
    expect(recordedSteps).toBeGreaterThan(0);
  });
  it.each(Object.keys(STATES))(
    "matches the admitted home body in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-council-sitting:${place}`,
        household: true,
        people: 8,
      });
      let world = base.world;
      const person = world.personOrder[0]!,
        town = playerTown(world, person),
        units = homeLocalGovernmentUnits(world, person);
      if (town)
        for (const unit of [
          ...units.municipal,
          ...units.townships,
          ...units.counties,
        ])
          world = ensureLocalGovernmentSeatsForUnit(world, unit, town, [
            person,
          ]);
      const selected = seatedCouncil(
        {
          town,
          units,
          seatedUnitIds: new Set(
            [...units.municipal, ...units.townships, ...units.counties]
              .filter((unit) => localGovernmentSeated(world, unit.id))
              .map((unit) => unit.id),
          ),
          rulesByUnit: new Map(
            [...units.municipal, ...units.townships, ...units.counties].map(
              (unit) => [unit.id, councilRules(unit)],
            ),
          ),
        },
        person,
      );
      const scheduled = meetings.ensureLocalCouncilMeetings(world, person),
        due = scheduled.history.futureDueItems.find(
          (row) => row.transitionKey === meetings.LOCAL_COUNCIL_MEETING,
        );
      if (!selected) {
        expect(scheduled).toEqual(world);
      } else {
        expect(due).toBeDefined();
        expect(due!.stableKey).toContain(`:${selected.unit.id}:`);
        world = scheduled;
        const law = lawJurisdiction(world, selected.unit, selected.town);
        world = law.world;
        const pack = legislativeRulePackForWorld(world, selected.rules.packId);
        world = native.introduceMeasure(world, {
          stableKey: `rules2:${place}:sitting-item`,
          jurisdictionId: law.jurisdictionId,
          rulePackId: pack.packId,
          designation: "ORD 904",
          shortTitle: "Authored sitting item",
          summary: "Native parent request edge.",
          origin: "member-introduction",
          subjectClass: "general-policy",
          sponsorPersonId: world.personOrder[1]!,
          originChamberKey: pack.chamberOrder[0]!,
          propositionIds: [],
        });
        const measure = world.history.legislativeMeasures!.at(-1)!;
        const receipts: {
          before: World;
          id: string;
          input: Parameters<typeof nativeClock.applyInstitutionStep>[3];
          result: ReturnType<typeof nativeClock.applyInstitutionStep>;
        }[] = [];
        const original = nativeClock.applyInstitutionStep;
        const capture = vi
          .spyOn(nativeClock, "applyInstitutionStep")
          .mockImplementation((at, id, desk, input) => {
            const result = original(at, id, desk, input);
            receipts.push({ before: at, id, input, result });
            return result;
          });
        const noNewBills = vi
          .spyOn(agenda, "fileMemberAgendaBills")
          .mockImplementation((at) => at);
        try {
          meetings.localCouncilMeetingHandler(world, {
            ...due!,
            stableKey: due!.stableKey.replace(":meeting:", ":posted-meeting:"),
          });
        } finally {
          capture.mockRestore();
          noNewBills.mockRestore();
        }
        expect(receipts).toHaveLength(1);
        const receipt = receipts[0]!;
        const replay = vi
          .spyOn(ownClock, "applyInstitutionStep")
          .mockImplementation((_facts, id, input) => {
            expect(id).toBe(receipt.id);
            expect(input).toEqual(receipt.input);
            return {
              kind: receipt.result.kind,
              ...("step" in receipt.result
                ? { step: receipt.result.step }
                : {}),
              commands: [],
            } as ReturnType<typeof ownClock.applyInstitutionStep>;
          });
        const facts = {
          measure,
          pack,
          actions: receipt.before.history.legislativeActions ?? [],
          onDate: receipt.before.currentDate,
          hasStartingProcedure: false,
          lawJurisdictionId: law.jurisdictionId,
          resultingPhase: null,
          resultingKind: null,
        } as unknown as CouncilSittingFacts;
        try {
          expect(
            moveOrdinances(
              facts,
              selected.unit,
              selected.town,
              selected.rules,
              person,
            ).kind,
          ).toBe(receipt.result.kind);
          localSteps++;
        } finally {
          replay.mockRestore();
        }
        expect(
          moveOrdinances(
            facts,
            selected.unit,
            selected.town,
            selected.rules,
            measure.sponsorPersonId!,
          ).kind,
        ).toBe("idle");
      }
      // The recorded council has its own native admission guard. Only Worlds in
      // which that producer admits it exercise the positive private moveActs path.
      world = ensureDistrictOfColumbiaCouncilOpening(base.world);
      if (!dcCouncilSeated(world)) {
        expect(dcCouncilSittingHandler(world).world).toEqual(world);
        return;
      }
      const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
        compiled = municipalRulePackFor(government);
      if (!compiled.ok)
        throw Error("Native recorded body needs a compiled pack.");
      const pack = compiled.pack,
        jurisdictionId = municipalGovernmentJurisdictionId(
          world,
          government.key,
        )!,
        seats = municipalSeats(world, government.key);
      world = native.introduceMeasure(world, {
        stableKey: municipalMeasureKey(government.key, "ACT 904"),
        jurisdictionId,
        rulePackId: pack.packId,
        designation: "ACT 904",
        shortTitle: "Authored recorded sitting",
        summary: "Native initial agenda edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: seats[0]!.personId,
        originChamberKey: pack.chamberOrder[0]!,
        propositionIds: [],
      });
      world = { ...world, control: { kind: "observer" } };
      const measure = world.history.legislativeMeasures!.at(-1)!,
        requests: Parameters<typeof native.placeMeasureOnCalendar>[1][] = [];
      const original = native.placeMeasureOnCalendar,
        capture = vi
          .spyOn(native, "placeMeasureOnCalendar")
          .mockImplementation((at, input) => {
            requests.push(input);
            return original(at, input);
          }),
        noNewBills = vi
          .spyOn(agenda, "fileMemberAgendaBills")
          .mockImplementation((at) => at);
      try {
        dcCouncilSittingHandler(world);
      } finally {
        capture.mockRestore();
        noNewBills.mockRestore();
      }
      const plan = moveActs({
        measure,
        pack,
        actions: world.history.legislativeActions ?? [],
        onDate: world.currentDate,
        hasStartingProcedure: false,
        councilMeasureIds: [measure.id],
        playerPersonId: null,
        starting: null,
        adjournments: [],
        estimates: new Map(),
        sessionEnds: new Map(),
      } as unknown as CouncilSittingFacts);
      expect(plan.commands).toEqual(
        requests.map((input) => ({ command: "placeMeasureOnCalendar", input })),
      );
      recordedSteps++;
    },
    30000,
  );
});
