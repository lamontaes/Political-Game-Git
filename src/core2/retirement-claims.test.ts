import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { DEFAULT_DATA } from "./data";
import { advanceCore, createLifeCore } from "./life";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { enactLaw, openLaws } from "./modules/laws";
import {
  claimRetirementNow,
  retirementClaims,
} from "./modules/retirement-claims";
import { PARAMETERS } from "./parameters";
import { retirementClaimAgeMonths } from "./retirement-claim";
import { startingSocialSecurityAges } from "./social-security-law";
import { coreAPI, fillInPerson } from "./state";
import { decisionLean } from "./trait-decisions";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-retirement-claims");

const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`retirement claims during play in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("starts each claimant's monthly award, and every dollar balances", () => {
    // One full adult, born so their own claim date falls two months in. They
    // are moved to an earlier birth date, never a later one, so nothing they
    // already know predates their birth.
    const input = generatedOpening(place, { twoLevel: true });
    const adult = input.people
      .filter(
        (row) =>
          row.id !== input.playerId &&
          !row.jobId &&
          row.birthDate > "1962-12-31",
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const weights = {
      anchorYearsBeforeFull:
        PARAMETERS.openingRetirementClaimAnchorYearsBeforeFull!.value,
      traitPullYears: PARAMETERS.openingRetirementClaimTraitPullYears!.value,
      needPullYears: PARAMETERS.openingRetirementClaimNeedPullYears!.value,
      fullBufferMonths:
        PARAMETERS.openingRetirementClaimFullBufferMonths!.value,
    };
    // The engine reads the person as the core holds them (cash swept into
    // accounts leaves none in hand), not as the opening input lists them.
    const live = createLifeCore(input);
    const held = live.people.get(adult.id)!;
    const dayOne = new Date(`${input.startedAt}T00:00:00Z`);
    const claimMonths = (birth: string) =>
      retirementClaimAgeMonths(
        {
          ages: startingSocialSecurityAges(birth),
          bufferMonths:
            held.livingCostDailyMinor > 0
              ? held.liquidMinor / ((held.livingCostDailyMinor * 365.2425) / 12)
              : weights.fullBufferMonths,
          patience: decisionLean(
            live,
            held,
            "retirement.claim-age",
            "wait-to-claim",
            "claim-now",
          ),
        },
        weights,
      );
    // The birth year sets the full retirement age, which jumps at a year
    // boundary, so the birth month is found by looking at each month in turn
    // for the claim date nearest two months in, never by iterating to a fixed point.
    let birthDate = "1959-01-01";
    let best = Infinity;
    for (let month = 0; month < 6 * 12; month++) {
      const birth = new Date(Date.UTC(1957, month, 1));
      const born = birth.toISOString().slice(0, 10);
      const claim = new Date(birth);
      claim.setUTCMonth(claim.getUTCMonth() + claimMonths(born));
      const away = Math.abs(
        (claim.getTime() - dayOne.getTime()) / 86_400_000 - 60,
      );
      if (away < best) {
        best = away;
        birthDate = born;
      }
    }
    expect(best).toBeLessThan(31);
    const core = createLifeCore({
      ...input,
      people: input.people.map((row) =>
        row.id === adult.id ? { ...row, birthDate } : row,
      ),
    });
    const api = coreAPI(core);
    const start = total(core);
    advanceCore(core, daysAfterStart(365));
    const claims = retirementClaims(core);
    expect(claims.has(adult.id)).toBe(true);
    const flows = residentsRuntime(core)!.flows;
    let counted = 0;
    for (const [personId, row] of claims) {
      expect(row.monthlyMinor).toBeGreaterThan(0);
      if (row.counted) {
        // Counted claimants are paid into the residents' income.
        counted++;
        expect(flows.get(`retirement-claim:${personId}`)?.payeeId).toBe(
          flows.get(`retirement-claim:${personId}`)?.residentsId,
        );
      } else
        expect(
          api.accounts().obligation(row.obligationId)!.paidMinor,
        ).toBeGreaterThan(0);
      // A counted claimant may have died or moved away since (counted drift).
      const person =
        core.people.get(personId) ?? residentPerson(core, personId);
      if (!person) continue;
      const born = person.birthDate;
      const age =
        (Date.parse(`${row.date}T00:00:00Z`) -
          Date.parse(`${born}T00:00:00Z`)) /
        (365.25 * 86_400_000);
      expect(age).toBeGreaterThanOrEqual(61.99);
      expect(age).toBeLessThanOrEqual(70.01);
    }
    // In a year some of the wider population reaches its claim age.
    expect(counted).toBeGreaterThan(0);
    // A counted claimant filled in is paid their own award from then on.
    const [claimant] = [...claims].find(
      ([id, row]) => row.counted && residentPerson(core, id),
    )!;
    fillInPerson(core, claimant);
    advanceCore(core, daysAfterStart(424));
    const moved = retirementClaims(core).get(claimant)!;
    expect(moved.counted).toBe(false);
    expect(api.accounts().obligation(moved.obligationId)!.paidMinor).toBe(
      moved.monthlyMinor * 2,
    );
    expect(total(core)).toBe(start);
  }, 600_000);

  it("claims follow the earliest claim age in the law in force", () => {
    // Congress raises the earliest claim age from 62 to 65 on the first day:
    // nobody who claims in the year claims before 65, and some still do.
    const input = generatedOpening(place, { twoLevel: true });
    const core = createLifeCore(input);
    openLaws(core);
    const api = coreAPI(core);
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: "social-security-earliest-claim-age",
      value: 65,
      unit: "years",
      effectiveDate: core.date,
      measureId: "measure:test-raise-earliest-claim-age",
      citation: "A test measure raising the earliest claim age to 65.",
    });
    advanceCore(core, daysAfterStart(365));
    const claims = retirementClaims(core);
    expect(
      claims.size,
      `${place.name}: some claim in the year`,
    ).toBeGreaterThan(0);
    for (const [personId, row] of claims) {
      const person =
        core.people.get(personId) ?? residentPerson(core, personId);
      if (!person) continue;
      const age =
        (Date.parse(`${row.date}T00:00:00Z`) -
          Date.parse(`${person.birthDate}T00:00:00Z`)) /
        (365.25 * 86_400_000);
      expect(age, `${personId} claimed on ${row.date}`).toBeGreaterThanOrEqual(
        64.99,
      );
    }
  }, 600_000);

  it("reads counted claimants from their group's columns, never as built person records", () => {
    const source = readFileSync(
      "src/core2/modules/retirement-claims.ts",
      "utf8",
    );
    expect(source).not.toMatch(/residentPerson|householdView|\.households\b/);
    const core = createLifeCore(generatedOpening(place, { twoLevel: true }));
    advanceCore(core, daysAfterStart(365));
    const claims = [...retirementClaims(core).values()];
    const counted = claims.filter((row) => row.counted);
    expect(
      counted.length,
      `${place.name}: counted claimants in the year (seed ${seed})`,
    ).toBeGreaterThan(0);
    // Each counted claim is a payment into the place's residents account.
    for (const row of counted) {
      expect(row.monthlyMinor).toBeGreaterThan(0);
      expect(residentsRuntime(core)!.flows.get(row.obligationId)).toBeDefined();
    }
  }, 600_000);

  it("a counted worker who leaves work for good claims at once from their own record, once", () => {
    const core = createLifeCore(generatedOpening(place, { twoLevel: true }));
    const api = coreAPI(core);
    advanceCore(core, daysAfterStart(2));
    const store = residentsRuntime(core)!.store;
    const claimed = new Set(retirementClaims(core).keys());
    let pick: string | undefined;
    for (const h of store.liveHouseholds())
      for (const member of store.countedMembers(h)) {
        const id = store.ids[member]!;
        const born = Number(store.born[member]!.slice(0, 4));
        if (born <= 1950 && !claimed.has(id) && (!pick || id < pick)) pick = id;
      }
    expect(
      pick,
      `${place.name}: a counted person aged 70 or more (seed ${seed})`,
    ).toBeDefined();
    expect(claimRetirementNow(api, pick!)).toBe(true);
    const claim = retirementClaims(core).get(pick!)!;
    expect(claim.counted).toBe(true);
    expect(claim.monthlyMinor).toBeGreaterThan(0);
    expect(residentsRuntime(core)!.flows.get(claim.obligationId)).toBeDefined();
    // Asking again, or the claim date coming round, adds no second award.
    const flows = residentsRuntime(core)!.flows.size;
    expect(claimRetirementNow(api, pick!)).toBe(true);
    expect(residentsRuntime(core)!.flows.size).toBe(flows);
  }, 600_000);
});
