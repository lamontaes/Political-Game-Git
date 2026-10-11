import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../simulation/life-places";
import { SeededRng, pickDistinct } from "../../simulation/rng";
import { makeIsoDate } from "./dates";
import * as oldCalendar from "../../simulation/nationwide-world/state-executive-term-rules";
import * as calendar from "./term-calendar";
import * as oldLimits from "../../simulation/nationwide-world/executive-term-limits";
import { datedTermsInOffice } from "../../simulation/nationwide-world/prior-terms";
import * as limits from "./term-limits";
import * as oldPersonnel from "../../simulation/civil-personnel-rules";
import * as personnel from "./personnel-rules";
import { personnelProcedures } from "../../simulation/civil-personnel-actions";
import { decideExecutiveActionAuthority as oldAuthority } from "../../simulation/executive-action-authority";
import { decideExecutiveActionAuthority } from "./action-authority";
import { daysToFiscalYear as oldDays } from "../../simulation/governing/budget-stakes";
import { daysToFiscalYear } from "./budget-stakes";
import { committeeRosters as oldRosters } from "../../simulation/governing/committee-assignment";
import { committeeRosters } from "./committee-rosters";
import { installmentRefusal } from "./installment";
import type { World, IsoDate } from "../../simulation/types";
import type { ExecutiveAuthorityRulePack } from "../../simulation/executive-authority-rules";
import type { LawInForce } from "../../simulation/governing/law-in-force";
import type { SeatedBody } from "../../simulation/legislation-scenarios";
const places = lifePlaceStateIdentities();
const seed = "rules3-governing-golden-2026-10-11";
const watched = pickDistinct(new SeededRng(seed), places, 1)[0]!;
console.info(`RULES-3 golden place=${watched.jurisdictionKey} seed=${seed}`);
describe("governing legacy equivalence in all 56 places", () => {
  it("has exactly all 56 place identities", () =>
    expect(places).toHaveLength(56));
  for (const place of places)
    it(place.jurisdictionKey, () => {
      const rule = oldCalendar.stateExecutiveTermRule(place.usps)!;
      expect(rule).not.toBeNull();
      for (const date of [
        "2024-01-01",
        "2026-11-03",
        "2027-01-04",
        "2032-02-29",
      ]) {
        const d = makeIsoDate(date);
        expect(calendar.nextRegularElection(rule, d)).toEqual(
          oldCalendar.nextRegularElection(rule, d),
        );
        expect(calendar.termDatesAfterElection(rule, d)).toEqual(
          oldCalendar.termDatesAfterElection(rule, d),
        );
        expect(calendar.regularTermWindowOn(rule, d)).toEqual(
          oldCalendar.regularTermWindowOn(rule, d),
        );
        for (const md of ["01-01", "07-01", "10-01"])
          expect(daysToFiscalYear(d, md)).toBe(oldDays(d, md));
      }
      const today = makeIsoDate("2027-01-04");
      const world = {
        currentDate: today,
        history: {
          events: [],
          workRelationships: [],
          ruleChangeProvisions: [],
        },
      } as unknown as World;
      const limit = oldLimits.executiveTermLimitInWorld(
        world,
        place.usps,
        today,
      );
      const all = limit
        ? datedTermsInOffice(world, "candidate", limit.officeKey)
        : [];
      expect(
        limits.checkExecutiveTermLimit(limit, all, { termStartsAt: today }),
      ).toEqual(
        oldLimits.checkExecutiveTermLimit(world, {
          stateUsps: place.usps,
          personId: "candidate",
          termStartsAt: today,
        }),
      );
      for (const procedure of personnelProcedures())
        for (const date of ["1900-01-01", "2026-10-11", "2030-01-01"])
          expect(
            personnel.personnelProcedureApplies(
              procedure,
              place.jurisdictionKey,
              date,
            ),
          ).toBe(
            oldPersonnel.personnelProcedureApplies(
              procedure,
              place.jurisdictionKey,
              date,
            ),
          );
      for (const level of [
        "local-ordinance",
        "state-statute",
        "federal-statute",
      ] as const) {
        const pack = {
          executiveDirective: {
            hasDirectiveAuthority: { kind: "known", value: true },
          },
          administrative: {
            supervisoryAuthority: { kind: "known", value: "recorded" },
          },
        } as unknown as ExecutiveAuthorityRulePack;
        const law = {
          level,
          measureId: `${place.jurisdictionKey}:${level}`,
        } as LawInForce;
        for (const value of [-1, 0, 50, 100, 101]) {
          const clause = {
            kind: "delegated-term" as const,
            propositionId: "p",
            statuteMeasureId: law.measureId,
            delegation: {
              key: "k",
              sourceIds: ["source"],
              minimum: 0,
              maximum: 100,
              unit: "units",
            },
            value,
          };
          expect(decideExecutiveActionAuthority(pack, clause, law)).toEqual(
            oldAuthority(pack, clause, law),
          );
          expect(decideExecutiveActionAuthority(pack, clause, null)).toEqual(
            oldAuthority(pack, clause, null),
          );
        }
        const body = { members: [] } as unknown as SeatedBody;
        expect(
          committeeRosters(
            body,
            [{ committeeKey: law.measureId, appointedMembers: 4 }],
            seed,
          ),
        ).toEqual(
          oldRosters(
            body,
            [{ committeeKey: law.measureId, appointedMembers: 4 }],
            seed,
          ),
        );
      }
    });
  it("preserves term-count edge cases without mutating records", () => {
    for (const code of [
      "2_CONSECUTIVE",
      "2_CONSECUTIVE_TERMS",
      "2_TERMS_LIFETIME",
      "bad",
    ])
      expect(limits.parseTermLimitCode(code)).toEqual(
        oldLimits.parseTermLimitCode(code),
      );
    const limit = {
      stateUsps: "data",
      officeKey: "office",
      limit: {
        maxConsecutiveTerms: 2,
        maxLifetimeTerms: null,
        lookbackYears: null,
      },
      basis: "sourced" as const,
      provenance: "fixture",
      enactment: null,
    };
    const terms = [
      { startsAt: "2019-01-01" as IsoDate, endsAt: "2023-01-01" as IsoDate },
      { startsAt: "2023-01-01" as IsoDate, endsAt: null },
    ];
    expect(
      limits.checkExecutiveTermLimit(limit, terms, {
        termStartsAt: makeIsoDate("2027-01-01"),
      })?.consecutiveTerms,
    ).toBe(2);
    expect(terms[0]!.startsAt).toBe("2019-01-01");
  });
  it("retains installment lapse/cash precedence and exact-money edges", () => {
    const amount = { minorUnits: 100, currency: "USD" as const };
    expect(
      installmentRefusal(
        "2027-01-02",
        "2027-01-01",
        amount,
        null,
        "upstream refusal",
      ),
    ).toBe("The appropriation lapsed before this payment fell due.");
    expect(
      installmentRefusal(
        "2027-01-01",
        "2027-01-01",
        amount,
        { liquidBalance: amount },
        null,
      ),
    ).toBeNull();
    expect(
      installmentRefusal(
        "2027-01-01",
        "2027-01-01",
        amount,
        null,
        "upstream refusal",
      ),
    ).toBe("upstream refusal");
    expect(
      installmentRefusal("2027-01-01", "2027-01-01", amount, null, null),
    ).toContain("An appropriation is not cash.");
  });
});
