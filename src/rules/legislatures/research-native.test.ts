import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import sessions from "../../../data/research/laws/state-session-calendars-2026.json";
import matrix from "../../../data/research/money/local-tax-authority-matrix.json";
import incomeScope from "../../../data/research/money/local-income-tax-scope.json";
import limits from "../../../data/research/legislature/member-bill-limits-2026.json";
import county from "../../../data/research/local-government/county-governing-bodies.json";
import budget from "../../../data/research/money/public-budget-bases.json";
import * as oldDate from "../../simulation/governing/statute-effective-date";
import * as oldTax from "../../simulation/local-tax-authority";
import { resolveLegislativeEffectiveDate as oldEffective } from "../../simulation/legislative-effective-date";
import { taxPolicyEffectiveDate as oldTaxDate } from "../../simulation/tax-policy";
import {
  memberFilingCap as oldCap,
  type MemberBillLimitsTable,
  type MemberFilingCapInput,
  type MemberFilingCapMeasure,
} from "../../simulation/governing/member-filing-caps";
import { countyGoverningBodyRules as oldCounty } from "../../simulation/nationwide-world/county-governing-body-rules";
import { governmentUnitsForState } from "../../simulation/government-units";
import { legislatureForState } from "../../simulation/legislature-game-profile";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { enactingGovernmentForPack } from "../../simulation/legislation-drafting";
import {
  municipalGovernmentByKey,
  municipalGovernments,
  municipalRulePackFor,
  municipalProcedureReading,
  type MunicipalGovernment,
} from "../../simulation/municipal-government";
import { municipalProcedurePlaceholder } from "../../simulation/municipal-procedure-placeholders";
import { makeIsoDate } from "../../simulation/dates";
import * as date from "./statute-date-dependency";
import {
  resolveLegislativeEffectiveDate,
  taxPolicyEffectiveDate,
} from "./enactment-date";
import {
  localTaxAuthority,
  localTaxPowerEvidenceFor,
} from "./local-tax-authority";
import { memberFilingCap } from "./member-filing-caps";
import { stateSeats, municipioRules } from "./county-body-size";
import { buildFloorStages } from "./municipal-stages";
import type { EntityId } from "../../simulation/types";
import type { TaxTerms } from "../../simulation/tax-types";
const facts: date.StatuteFacts = {
  rules: startingLaw.effectiveDates.rules as date.StatuteFacts["rules"],
  sessionEnds: sessions.sessionEnds as date.StatuteFacts["sessionEnds"],
};
const populations = budget.countyPopulation2024 as Readonly<
  Record<string, number>
>;
function outcome(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("legislatures: researched closures through native public owners", () => {
  it.each(Object.keys(STATES))(
    "matches dated rules, fiscal power, filing caps and municipal stages in %s",
    (place) => {
      const key = `US-${place}`;
      expect(date.statuteEffectiveRule(facts, key)).toEqual(
        oldDate.statuteEffectiveRule(key),
      );
      for (const year of [2025, 2026, 2027, 2028]) {
        expect(date.stateSessionEnds(facts, key, year)).toEqual(
          oldDate.stateSessionEnds(key, year),
        );
        expect(date.stateSessionEndEstimate(facts, key, year)).toEqual(
          oldDate.stateSessionEndEstimate(key, year),
        );
        for (const raw of [
          `${year}-01-01`,
          `${year}-03-31`,
          `${year}-07-01`,
          `${year}-12-31`,
        ])
          for (const context of [
            {},
            { finalPassageAt: () => makeIsoDate(`${year}-02-15`) },
            { sessionEnds: () => [makeIsoDate(`${year}-04-12`)] },
          ]) {
            const on = makeIsoDate(raw);
            expect(
              date.stateStatuteOperativeAt(facts, key, on, context),
            ).toEqual(oldDate.stateStatuteOperativeAt(key, on, context));
            expect(
              date.statuteEffectiveDateEstimated(facts, key, on, context),
            ).toEqual(oldDate.statuteEffectiveDateEstimated(key, on, context));
          }
      }
      for (const level of ["COUNTY", "MUNICIPALITY"] as const)
        for (const instrument of [
          "property",
          "sales",
          "payroll",
          "corporate-income",
          "wage-income",
        ] as const) {
          const input = { stateUsps: place, level, instrument };
          expect(localTaxAuthority({ matrix, incomeScope }, input)).toEqual(
            oldTax.localTaxAuthority(input),
          );
          const evidence = {
            ...input,
            governmentKey: `fixture:${place}:${level}`,
            asOf: makeIsoDate("2026-09-01"),
          };
          expect(
            localTaxPowerEvidenceFor({ matrix, incomeScope }, evidence),
          ).toEqual(oldTax.localTaxPowerEvidenceFor(evidence));
        }
      const state = legislatureForState(key);
      for (const pack of [...(state ? [state] : []), US_CONGRESS_RULE_PACK])
        for (const on of [makeIsoDate("2026-01-01"), makeIsoDate("2026-12-31")])
          for (const context of [undefined, {}])
            expect(
              resolveLegislativeEffectiveDate(
                {
                  ...facts,
                  government:
                    enactingGovernmentForPack(pack)?.government ?? null,
                },
                pack,
                on,
                context,
              ),
            ).toEqual(oldEffective(pack, on, context));
      for (const delay of [undefined, 0, 30, 90])
        for (const assumption of [
          "authored-state-game-profile",
          "carry-forward-acquired-baseline-in-game",
        ]) {
          const terms = {
            effectiveDelayDays: delay,
            legalBaselineAssumption: assumption,
          } as TaxTerms;
          for (const effectiveAt of [
            null,
            makeIsoDate("2026-01-01"),
            makeIsoDate("2027-01-01"),
          ]) {
            const enacted = {
              resolvedAt: makeIsoDate("2026-02-01"),
              effectiveAt,
            };
            expect(taxPolicyEffectiveDate(enacted, terms)).toEqual(
              oldTaxDate(enacted, terms),
            );
          }
        }
      const capInput: MemberFilingCapInput = {
        place,
        jurisdictionId: `fixture:${place}` as EntityId,
        chamberKey: "house",
        sponsorPersonId: `fixture:${place}:member` as EntityId,
        subjectClass: "general-policy",
        origin: "member-introduction",
        introducedAt: makeIsoDate("2026-02-01"),
        numberingSession: {
          key: "2026",
          label: "Fixture session",
          fullDesignation: "HB 1",
        },
        bienniumWindow: {
          start: makeIsoDate("2025-01-01"),
          end: makeIsoDate("2026-12-31"),
        },
      };
      for (const count of [0, 1, 6, 50]) {
        const measures = Array.from({ length: count }, (_, i) => ({
          ...capInput,
          id: `fixture:${place}:bill:${i}` as EntityId,
          originChamberKey: capInput.chamberKey,
          numberingSession: capInput.numberingSession,
        })) as unknown as MemberFilingCapMeasure[];
        expect(
          memberFilingCap(measures, capInput, limits as MemberBillLimitsTable),
        ).toEqual(oldCap(measures, capInput, limits as MemberBillLimitsTable));
      }
      for (const unit of governmentUnitsForState(place)
        .filter((unit) => unit.unitType === "county")
        .slice(0, 3)) {
        const old = oldCounty(unit);
        const code = (
          county.municipalCodes as Record<
            string,
            Parameters<typeof municipioRules>[1]
          >
        )[place];
        if (code)
          expect(municipioRules(populations, code, unit.countyGeoid)).toEqual(
            old,
          );
        else {
          const reading = (
            county.states as Record<string, Parameters<typeof stateSeats>[1]>
          )[place];
          if (reading)
            expect(
              stateSeats(populations, reading, unit.countyGeoid) ??
                county.nationalAverage.seats,
            ).toEqual(old?.seats);
        }
      }
      // Authored edge: complete an enacted-text reading to reach the native private
      // stage compiler; the playable game-profile branch intentionally bypasses it.
      const unit = governmentUnitsForState(place).find(
        (unit) =>
          unit.functionalActive &&
          (unit.unitType === "municipality" || unit.unitType === "county"),
      );
      const base =
        (unit ? municipalGovernmentByKey(unit.id) : null) ??
        municipalGovernments()[0]!;
      const reading = municipalProcedureReading(base);
      for (const readings of [1, 2, 3]) {
        const control: MunicipalGovernment = {
          ...base,
          readings: [
            {
              ...reading,
              evidence: "enacted-text",
              bodyName: reading.bodyName ?? "Fixture council",
              bodySize: reading.bodySize ?? 7,
              procedure: {
                ...reading.procedure,
                mayoralActionState: "NOT_APPLICABLE",
                introductionSponsorship: "Members introduce ordinances.",
                readings,
                publicHearing: null,
              },
              powers: [
                ...reading.powers.filter(
                  (row) => row.power !== "ORDINANCE_ADOPTION",
                ),
                {
                  power: "ORDINANCE_ADOPTION",
                  heldByRole: "COUNCIL",
                  held: true,
                  heldState: "KNOWN",
                  target: null,
                  conditions: [],
                  exceptions: [],
                  threshold: {
                    denominatorBasis: "MEMBERS_PRESENT",
                    numerator: 1,
                    denominator: 2,
                    fixedVotesRequired: null,
                  },
                },
              ],
            },
          ],
        };
        const result = municipalRulePackFor(control);
        expect(result.ok).toBe(true);
        if (result.ok) {
          const compiled = municipalProcedureReading(control),
            stage = result.pack.chambers[0]!.floorStages.at(-1)!;
          if (stage.vote.kind === "known")
            expect(
              outcome(() =>
                buildFloorStages(
                  compiled,
                  stage.vote.kind === "known" ? stage.vote.value : neverValue(),
                  stage.source,
                  municipalProcedurePlaceholder(control.key)
                    ?.everyReadingVoted === true,
                ),
              ),
            ).toEqual({ value: result.pack.chambers[0]!.floorStages });
        }
      }
    },
  );
});
function neverValue(): never {
  throw new Error("unreachable");
}
