import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { nominationPlan } from "../../simulation/nominations/nomination-rules";
import * as field from "../../simulation/nominations/field-entry";
import { returningCandidate as legacyReturning } from "../../simulation/nominations/candidate-pool";
import { seatIsUp as legacySeat } from "../../simulation/living-world/local-elections";
import { legislativeSenateElectionDay as legacySenate } from "../../simulation/governing/senate-selection";
import {
  nextLegislativeElection as legacyElection,
  LEGISLATIVE_GAME_PROFILE,
} from "../../simulation/legislative-election-rules";
import { congressionalElectionDay as legacyCongress } from "../../simulation/living-world/congress-turnover";
import { modalValue as legacyModal } from "../../simulation/municipal-ballot-rules";
import * as numbering from "../../simulation/measure-numbering";
import { returningCandidate, seatIsUp } from "./seat-and-candidate";
import {
  fieldIntakeDay,
  legislativeSenateElectionDay,
  nextLegislativeElection,
  congressionalElectionDay,
} from "./intake-and-calendars";
import { drawsSelfStarter } from "./self-starter";
import { modalValue } from "./modal-value";
import {
  councilOpeningNumber,
  congressNumberForYear,
  councilPeriodForYear,
} from "./measure-periods";

describe("remaining standalone election KEEP rules", () => {
  it.each(Object.keys(STATES))(
    "matches unchanged legacy rules for %s",
    (place) => {
      const { world } = smallWorld({
        place: `US-${place}`,
        seed: `rules2-election-remainder:${place}`,
        date: makeIsoDate("2026-02-01"),
      });
      const plan = nominationPlan(world, {
        stateUsps: place,
        family: "us-house",
        year: 2026,
        onDate: makeIsoDate("2025-07-01"),
        generalDay: makeIsoDate("2026-11-03"),
      });
      for (const day of [
        "2025-01-01",
        "2025-07-01",
        "2026-02-01",
        "2026-11-03",
        "2028-11-08",
      ]) {
        const date = makeIsoDate(day);
        expect(fieldIntakeDay(date, plan, 2026)).toBe(
          field.fieldIntakeDay(date, plan, 2026),
        );
        expect(legislativeSenateElectionDay(date)).toBe(legacySenate(date));
        const rule = { ...LEGISLATIVE_GAME_PROFILE } as Parameters<
          typeof legacyElection
        >[0];
        expect(nextLegislativeElection(rule, date)).toBe(
          legacyElection(rule, date),
        );
        expect(councilOpeningNumber(date)).toBe(
          numbering.councilOpeningNumber(date),
        );
        for (const partyShare of [null, 0, 0.5499, 0.55, 0.5501, 1])
          for (const incumbentSeeking of [false, true]) {
            const input = {
              plan,
              intakeDate: date,
              party: "A",
              incumbentParty: "A",
              incumbentSeeking,
              partyShare,
            };
            expect(drawsSelfStarter(input)).toBe(field.drawsSelfStarter(input));
          }
      }
      for (const year of [1789, 1975, 2025, 2026, 2027, 2032]) {
        expect(congressionalElectionDay(year)).toBe(legacyCongress(year));
        expect(congressNumberForYear(year)).toBe(
          numbering.congressNumberForYear(year),
        );
        expect(councilPeriodForYear(year, 1975, 2)).toBe(
          numbering.dcCouncilPeriodForYear(year),
        );
        for (const cadence of [1, 2, 4])
          for (const term of [1, 2, 4])
            for (let n = 0; n < 8; n += 1)
              expect(seatIsUp(n, year, cadence, term)).toBe(
                legacySeat(n, year, cadence, term),
              );
      }
      const a = createStableId("person", `${place}:a`),
        b = createStableId("person", `${place}:b`);
      const pool = [
        { personId: b, year: 2024, party: "A", kind: "prospect" as const },
        { personId: a, year: 2022, party: "A", kind: "self-starter" as const },
        { personId: a, year: 2020, party: "A", kind: "prospect" as const },
        { personId: b, year: 2026, party: "B", kind: "prospect" as const },
      ];
      for (const rows of [pool, [], undefined])
        for (const prefer of ["prospect", "self-starter"] as const)
          for (const blocked of [null, a, b]) {
            const input = {
              year: 2026,
              party: "A",
              prefer,
              canStand: (id: string) => id !== blocked,
            };
            expect(returningCandidate(rows, input)).toBe(
              legacyReturning(rows, input),
            );
          }
      for (const weights of [[], [1], [1, 1], [0, 3, 2], [-1, -2]]) {
        const items = weights.map((weight) => ({ weight }));
        const values = weights.map((_, i) => `${place}:${i}`);
        expect(modalValue(items, values)).toBe(legacyModal(items, values));
      }
    },
  );
});
