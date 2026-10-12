import { stateLegislatureWakePlan } from "./state-wake";
import { stateLegislativeSeats } from "../../simulation/nationwide-world/state-legislature-opening";
import { nominationPlan } from "../../simulation/nominations/nomination-rules";
import { filingWindowOpens } from "../../simulation/nominations/field-entry";
import { stateLegislativeElectionRule } from "../../simulation/nationwide-world/state-legislative-election-calendar";
import { generalElectionDay } from "../../simulation/nationwide-world/state-executive-term-rules";
import { STATE_LEGISLATURE_CANDIDATE_PROFILE } from "../../simulation/nationwide-world/state-legislature-candidates";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { addDays, simulationMomentAtLocalTime } from "../../simulation/dates";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import * as native from "../../simulation/nationwide-world/state-legislature-turnover";
import {
  nextStateLegislativeElection,
  REVIEWED_REGULAR_SEAT_CYCLES,
} from "../../simulation/nationwide-world/state-legislative-election-calendar";
import {
  SUPPORTED_LEGISLATIVE_TERM_RULES,
  REVIEWED_LEGISLATIVE_TERM_PROFILES,
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
} from "../../simulation/legislative-term-rules";
import { GOVERNOR_TURNOVER_PROFILE } from "../../simulation/nationwide-world/state-executive-turnover-calendar";
import {
  stateCrossesAny,
  stateCyclePhases,
  stateNominationYears,
  stateTurnoverYears,
} from "./turnover-phases";
import { nextStateSeatFilling } from "./state-filling";
describe("elections: native state election and pending seat-filling callers", () => {
  it.each(Object.keys(STATES))(
    "matches actual election records and pending winners in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-state-turnover:${place}`,
        offices: ["congress", "state-legislature"],
      });
      const pack = stateCandidacyPack(`US-${place}`);
      if (!pack) {
        expect(
          native.applyStateLegislatureTurnover(
            base.world.currentDate,
            base.world,
          ),
        ).toBe(base.world);
        return;
      }
      const election = nextStateLegislativeElection(
        place,
        addDays(base.world.currentDate, 1),
      )!;
      const day = election.electionDate;
      const before = addDays(day, -1);
      const clocked = {
        ...base.world,
        currentDate: day,
        currentMoment: simulationMomentAtLocalTime({
          date: day,
          minuteOfDay: 0,
          timeZone: base.world.currentMoment.timeZone,
        }),
      };
      const year = Number(day.slice(0, 4));
      expect(stateCrossesAny(before, day, 45, () => false)).toBe(true);
      expect(stateNominationYears(before, day)).toContain(year);
      expect(stateTurnoverYears(before, day)).toContain(year);
      const world = native.applyStateLegislatureTurnover(before, clocked);
      const results = world.history.events.find(
        (event) =>
          event.type === native.STATE_LEGISLATIVE_RESULTS_EVENT &&
          event.stableKey.includes(pack.packId) &&
          event.occurredAt === day,
      )!;
      expect(results).toBeDefined();
      const phases = stateCyclePhases(
        before,
        day,
        day,
        45,
        false,
        results.tags,
      );
      expect(phases.election).toBe(true);
      expect(phases.ballots).toBe(false);
      expect(phases.termStarts).toEqual([]);
      expect(
        stateLegislatureWakePlan(
          {
            pack,
            seated: true,
            currentDate: day,
            calendar: {
              reviewedCycles: REVIEWED_REGULAR_SEAT_CYCLES,
              fieldClosesDaysBefore:
                GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore,
            },
            seats: stateLegislativeSeats(world, pack.packId),
            events: world.history.events,
            planFor: (cycle) =>
              nominationPlan(world, {
                stateUsps: place,
                family: "state-legislature",
                year: cycle,
                onDate: filingWindowOpens(cycle),
                generalDay: generalElectionDay(
                  stateLegislativeElectionRule(place),
                  cycle,
                ),
              }),
            ballotSetDays: 45,
            intakeProfile: STATE_LEGISLATURE_CANDIDATE_PROFILE,
          },
          pack.packId,
          year + 2,
          true,
        ),
      ).toEqual(
        native.stateLegislatureWakePlan(world, pack.packId, year + 2, true),
      );
      for (const office of pack.offices) {
        const term = {
          supported: SUPPORTED_LEGISLATIVE_TERM_RULES,
          reviewed: REVIEWED_LEGISLATIVE_TERM_PROFILES,
          officeExists: true,
          knownTermYears:
            office.qualification.termYears.kind === "known"
              ? office.qualification.termYears.value
              : null,
          blanketVersion: BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
        };
        for (const ordinal of [1, 2, 3])
          expect(
            nextStateSeatFilling(
              {
                pack,
                currentDate: day,
                calendar: {
                  reviewedCycles: REVIEWED_REGULAR_SEAT_CYCLES,
                  fieldClosesDaysBefore:
                    GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore,
                },
                term,
                results: new Map([[day, results]]),
                contestResults: new Map(
                  (world.history.electionContestResults ?? []).map((row) => [
                    row.contestId,
                    row,
                  ]),
                ),
                deaths: new Set(
                  world.history.personDeaths.map((death) => death.personId),
                ),
              },
              pack.packId,
              office.officeKey,
              ordinal,
            ),
          ).toEqual(
            native.nextStateSeatFilling(
              world,
              pack.packId,
              office.officeKey,
              ordinal,
            ),
          );
      }
    },
  );
});
