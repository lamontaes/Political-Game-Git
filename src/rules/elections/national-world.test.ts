import { contingentChoice } from "./national-count";
import { buildNationalElectionRules } from "./national-rules";
import { ELECTORAL_ALLOCATION } from "../../simulation/national-election-rules";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import type { World, EntityId } from "../../simulation/types";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import * as legacy from "../../simulation/national-elections";
import * as oldTurnover from "../../simulation/nationwide-world/presidential-turnover";
import {
  nationalElectionRules,
  CONTINGENT_STATES,
} from "../../simulation/national-election-rules";
import { scheduleFutureDueItem } from "../../simulation/future-transitions";
import { calibrationRows } from "../../simulation/world-setup/political-start";
import { CRUNCH46_POLICY } from "../../simulation/world-setup/policy";
import { nationalMoodDemocraticShift } from "../../simulation/national-mood";
import {
  projectCongress,
  publicPartyAffiliation,
} from "../../simulation/living-world/congress";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "../../simulation/living-world/opening";
import {
  presidentialElectionResults,
  contingentElectionVotes,
} from "./presidential-count";
import {
  nationalAllocation,
  nationalCountProposal,
  constitutionalChoiceList,
} from "./national-count";
import {
  nextPresidentialCycle,
  presidentialTermBar,
  presidentialTermsCounted,
} from "./presidential-terms";
const provenance = {
  method: "authored" as const,
  sourceEntityIds: [],
  note: "Generated-world institutional equivalence control.",
};
function at(world: World, date: string): World {
  return {
    ...world,
    currentDate: makeIsoDate(date),
    currentMoment: simulationMomentAtLocalTime({
      date,
      minuteOfDay: 0,
      timeZone: world.currentMoment.timeZone,
    }),
  };
}
function due(
  world: World,
  phase: string,
  date: string,
  transitionKey: `${string}:${string}`,
) {
  const next = scheduleFutureDueItem(world, {
    stableKey: `presidential-turnover/v1:2028:${phase}`,
    dueAt: date,
    transitionKey,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: { kind: "authored", note: "Native transition control." },
  });
  return { world: next, due: next.history.futureDueItems.at(-1)! };
}
function countFacts(world: World, electionId: EntityId) {
  const election = world.history.nationalElections!.find(
    (row) => row.id === electionId,
  )!;
  return {
    election,
    records: legacy.nationalRecords(world, electionId),
    units: nationalElectionRules(election.cycle).units,
  };
}
describe("elections: presidential writers and their private helpers in all 56 generated places", () => {
  it.each(Object.keys(STATES))(
    "preserves count, term and contingent decisions observed from %s",
    (place) => {
      let world = ensureNationalElectionJurisdiction(
        at(
          smallWorld({
            place: `US-${place}`,
            seed: `rules2-sendback-national:${place}`,
            offices: ["congress"],
          }).world,
          "2028-10-01",
        ),
      );
      const [a, av, b, bv] = world.personOrder;
      if (!a || !av || !b || !bv) throw Error("Need four generated people.");
      world = legacy.registerNationalElection(world, {
        stableKey: "rules2:presidential-2028",
        cycle: 2028,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        tickets: [
          {
            presidentPersonId: a,
            vicePresidentPersonId: av,
            presidentState: "CA",
            vicePresidentState: "NY",
          },
          {
            presidentPersonId: b,
            vicePresidentPersonId: bv,
            presidentState: "TX",
            vicePresidentState: "FL",
          },
        ],
        provenance,
      });
      const election = world.history.nationalElections!.at(-1)!;
      for (const cycle of [2024, 2028, 2032, 2040])
        expect(
          buildNationalElectionRules(
            {
              allocation: ELECTORAL_ALLOCATION,
              districtStates: new Set(
                Object.keys(STATES).filter(
                  (key) =>
                    STATES[key]?.electorAllocation === "congressional-district",
                ),
              ),
              momentAtLocalTime: (date, minuteOfDay, timeZone) =>
                simulationMomentAtLocalTime({ date, minuteOfDay, timeZone }),
            },
            cycle,
          ),
        ).toEqual(nationalElectionRules(cycle));

      for (const date of [
        "2026-01-01",
        "2028-11-07",
        "2028-11-08",
        "2032-11-03",
      ]) {
        const dated = at(world, date);
        expect(nextPresidentialCycle(dated.currentDate)).toBe(
          oldTurnover.nextPresidentialCycle(dated),
        );
      }
      const d = due(
        world,
        "election-day",
        "2028-11-07",
        oldTurnover.PRESIDENTIAL_ELECTION_DAY,
      );
      world = at(d.world, "2028-11-07");
      const predicted = presidentialElectionResults({
        election,
        records: legacy.nationalRecords(world, election.id),
        units: nationalElectionRules(2028).units,
        calibration: calibrationRows("us-president"),
        mood: nationalMoodDemocraticShift(world, world.currentDate),
        policy: CRUNCH46_POLICY.political,
      })!;
      world = oldTurnover.presidentialElectionDayHandler(world, d.due).world;
      expect(
        legacy
          .nationalRecords(world, election.id)
          .filter((row) => row.kind === "unit-result")
          .map((row) => ({
            unitKey: row.unitKey,
            tallies: row.tallies,
            allocationWinnerPersonId: row.allocationWinnerPersonId,
          })),
      ).toEqual(predicted.writes);
      expect(
        presidentialElectionResults({
          election,
          records: legacy.nationalRecords(world, election.id),
          units: nationalElectionRules(2028).units,
          calibration: calibrationRows("us-president"),
          mood: 0,
          policy: CRUNCH46_POLICY.political,
        })!.writes,
      ).toEqual([]);
      expect(
        nationalCountProposal(countFacts(world, election.id), election.id),
      ).toEqual(legacy.nationalCountProposal(world, election.id));
      world = at(world, "2028-12-19");
      for (const result of legacy
        .nationalRecords(world, election.id)
        .filter((row) => row.kind === "unit-result")) {
        world = legacy.appendNationalRecord(world, {
          kind: "certification",
          stableKey: `rules2:certified:${result.id}`,
          electionId: election.id,
          resultId: result.id,
          disposition: "certified",
          authorityNote: "Supplied native certification.",
          allocationWinnerPersonId: result.allocationWinnerPersonId,
          provenance,
        });
      }
      const allocation = legacy.nationalAllocation(world, election.id);
      expect(
        nationalAllocation(countFacts(world, election.id), election.id),
      ).toEqual(allocation);
      for (const [index, elector] of allocation.electors.entries())
        world = legacy.appendNationalRecord(world, {
          kind: "ballot",
          stableKey: `rules2:ballot:${elector.key}`,
          electionId: election.id,
          electorKey: elector.key,
          presidentPersonId: index < 269 ? a : b,
          vicePresidentPersonId: index < 269 ? av : bv,
          disposition: "accepted",
          provenance,
        });
      const facts = countFacts(world, election.id);
      expect(nationalCountProposal(facts, election.id)).toEqual(
        legacy.nationalCountProposal(world, election.id),
      );
      for (const office of ["president", "vice-president"] as const)
        expect(constitutionalChoiceList(facts, election.id, office)).toEqual(
          legacy.constitutionalChoiceList(world, election.id, office),
        );
      world = at(world, "2029-01-06");
      world = legacy.recordNationalCount(world, {
        stableKey: "rules2:count",
        electionId: election.id,
        provenance,
        presidentialChoicePersonIds: legacy.constitutionalChoiceList(
          world,
          election.id,
          "president",
        ),
        vicePresidentialChoicePersonIds: legacy.constitutionalChoiceList(
          world,
          election.id,
          "vice-president",
        ),
      });
      const count = legacy
        .nationalRecords(world, election.id)
        .find((row) => row.kind === "count")!;
      const congress = projectCongress(world);
      const house = (congress?.house.seats ?? []).flatMap((seat) =>
        seat.occupant.kind === "member"
          ? [
              {
                stateUsps: seat.stateUsps,
                personId: seat.occupant.member.personId,
              },
            ]
          : [],
      );
      const senators = (congress?.senate.seats ?? []).flatMap((seat) =>
        seat.occupant.kind === "member" ? [seat.occupant.member.personId] : [],
      );
      const votes = contingentElectionVotes({
        count,
        held: new Set(),
        states: CONTINGENT_STATES,
        house,
        senators,
        partyIds: new Map(
          [...house.map((row) => row.personId), ...senators].map((id) => [
            id,
            publicPartyAffiliation(world, id),
          ]),
        ),
        majorPartyIds: ["democratic", "republican"].map((p) =>
          livingWorldOrganizationId(world, LIVING_WORLD_KEYS.nationalParty(p)),
        ),
        election,
      });
      const termDue = due(
        world,
        "term-plan",
        "2029-01-07",
        oldTurnover.PRESIDENTIAL_TERM_PLAN,
      );
      world = oldTurnover.presidentialTermPlanHandler(
        at(termDue.world, "2029-01-07"),
        termDue.due,
      ).world;
      expect(
        legacy
          .nationalRecords(world, election.id)
          .filter((row) => row.kind === "contingent-choice")
          .map((row) => ({
            office: row.office,
            votes: row.votes,
            wholeNumber: row.wholeNumber,
            senatorPersonIds: row.senatorPersonIds,
          })),
      ).toEqual(votes);
      for (const record of legacy
        .nationalRecords(world, election.id)
        .filter((row) => row.kind === "contingent-choice")) {
        const candidates =
          record.office === "president"
            ? count.presidentialChoicePersonIds
            : count.vicePresidentialChoicePersonIds;
        expect(
          contingentChoice(record.wholeNumber, candidates, record.votes),
        ).toBe(record.chosenPersonId);
      }
      const termFacts = {
        events: world.history.events,
        records: legacy.nationalRecords(world),
      };
      for (const personId of [a, av, b, bv])
        for (const since of [
          null,
          makeIsoDate("2028-01-01"),
          makeIsoDate("2030-01-01"),
        ])
          expect(presidentialTermsCounted(termFacts, personId, since)).toBe(
            oldTurnover.presidentialTermsCounted(world, personId, since),
          );
      for (const personId of [a, b]) {
        const start = makeIsoDate("2033-01-20");
        const limit = oldTurnover.presidentialTermLimitAt(world, start);
        expect(
          presidentialTermBar(
            termFacts,
            personId,
            limit.limit,
            limit.countsFrom,
          ) !== null,
        ).toBe(
          oldTurnover.presidentialTermBar(world, personId, start) !== null,
        );
      }
    },
  );
});
