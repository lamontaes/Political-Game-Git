import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import * as delegates from "../../simulation/living-world/house-delegates";
import { SENATE_CLASSES_BY_STATE } from "../../simulation/living-world/congress-seats";
import { LIVING_WORLD_WRITER_VERSION } from "../../simulation/living-world/opening";
import {
  statehoodSeats as oldStatehoodSeats,
  statehoodPlace,
} from "../../simulation/living-world/statehood-seats";
import statehood from "../../../data/research/congress/statehood-seats.json";
import {
  statehoodSeats,
  delegateTermStarts,
  delegateTermDecision,
  latestTerritorialTenure,
} from "./territorial-turnover";
import * as oldGovernor from "../../simulation/nationwide-world/state-executive-turnover-calendar";
import { stateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";
import { stateExecutiveIdentity } from "../../simulation/nationwide-world/state-executive-candidacy-packs";
import { enactedRuleChanges } from "../../simulation/enacted-rule-changes";
import { nextFieldClose } from "./governor-turnover";
import { addDays } from "./calendar";
import type { HistoricalEvent } from "../../simulation/types";
const latest = (events: readonly HistoricalEvent[], seatKey: string) =>
  latestTerritorialTenure(
    events,
    delegates.HOUSE_DELEGATE_TENURE_EVENT,
    seatKey,
  );
describe("elections: native territorial renewal and governor schedule writers", () => {
  it.each(Object.keys(STATES))(
    "matches real future due items and delegate tenures in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-territory:${place}`,
        offices: ["congress", "governor"],
      }).world;
      expect(
        statehoodSeats(SENATE_CLASSES_BY_STATE, {
          place: statehoodPlace(),
          senateSeats: statehood.senateSeats,
          houseSeats: statehood.houseSeats,
          houseDistrictCode: statehood.houseDistrictCode,
        }),
      ).toEqual(oldStatehoodSeats());
      world = delegates.seatHouseDelegates(world);
      const before = makeIsoDate("2026-12-31"),
        after = makeIsoDate("2027-01-03");
      world = {
        ...world,
        currentDate: after,
        currentMoment: simulationMomentAtLocalTime({
          date: after,
          minuteOfDay: 0,
          timeZone: world.currentMoment.timeZone,
        }),
      };
      const prior = world;
      const renewed = delegates.applyHouseDelegateTurnover(before, world);
      for (const seat of delegates.HOUSE_DELEGATE_SEATS) {
        const record = latest(prior.history.events, seat.seatKey);
        const opening = prior.history.events.some(
          (event) =>
            event.stableKey === `${LIVING_WORLD_WRITER_VERSION}:opening`,
        );
        const dates = delegateTermStarts(
          before,
          after,
          seat,
          2025,
          opening,
          false,
          !!record,
        );
        const alive = new Set(
          prior.personOrder.filter(
            (id) =>
              !!prior.people[id] &&
              !prior.history.personDeaths.some(
                (death) => death.personId === id && death.diedAt <= after,
              ),
          ),
        );
        const decision = dates.flatMap((date) => {
          const term = delegateTermDecision(
            seat,
            date,
            record,
            prior.history.events.some(
              (event) =>
                event.stableKey ===
                `${LIVING_WORLD_WRITER_VERSION}:seat:${seat.seatKey}:term:${date}`,
            ),
            alive,
          );
          return term ? [term] : [];
        });
        const written = renewed.history.events.filter(
          (event) =>
            event.type === delegates.HOUSE_DELEGATE_TENURE_EVENT &&
            event.tags.includes(`seat:${seat.seatKey}`) &&
            event.occurredAt > before,
        );
        expect(written).toHaveLength(decision.length);
        for (const term of decision) {
          const saved = written.find(
            (event) => event.occurredAt === term.startsAt,
          )!;
          expect(saved.tags).toContain(`term-end:${term.endExclusive}`);
          expect(saved.tags).toContain(`caucus:${term.caucus}`);
          expect(saved.tags).toContain(`service-since:${term.serviceSince}`);
          if (term.returningPersonId)
            expect(
              saved.participants.find((p) => p.role === "focus:subject")
                ?.personId,
            ).toBe(term.returningPersonId);
        }
      }
      for (const date of [world.currentDate, makeIsoDate("2028-10-01")]) {
        const clocked = {
          ...world,
          currentDate: date,
          currentMoment: simulationMomentAtLocalTime({
            date,
            minuteOfDay: 0,
            timeZone: world.currentMoment.timeZone,
          }),
        };
        const facts = {
          compiled: stateExecutiveTermRule(place),
          office: stateExecutiveIdentity(place),
          changes: enactedRuleChanges(clocked),
        };
        const plan = nextFieldClose(
          facts,
          place,
          date,
          oldGovernor.GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore,
        );
        const scheduled = oldGovernor.scheduleNextFieldClose(
          clocked,
          place,
          date,
        );
        const added = scheduled.history.futureDueItems.filter(
          (item) =>
            !clocked.history.futureDueItems.some((old) => old.id === item.id),
        );
        if (plan && facts.office) {
          const existing = clocked.history.futureDueItems.some((item) =>
            item.stableKey.includes(
              `${facts.office!.officeKey}:${plan.year}:field-close`,
            ),
          );
          if (!existing)
            expect(
              added.some(
                (item) =>
                  item.dueAt ===
                  addDays(
                    plan.electionDay,
                    -oldGovernor.GOVERNOR_TURNOVER_PROFILE
                      .fieldClosesDaysBefore,
                  ),
              ),
            ).toBe(true);
        } else expect(added).toEqual([]);
      }
    },
  );
});
