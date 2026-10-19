import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { enactLaw, openLaws } from "./modules/laws";
import { claimDateOf, retirementClaims } from "./modules/retirement-claims";
import { coreAPI, fillInPerson } from "./state";
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
    // The engine's own claim date for them settles the birth date, so the
    // test never second-guesses the lean or the law's ages. The birth year
    // sets the full retirement age, so settle the two together.
    const target = new Date(`${input.startedAt}T00:00:00Z`);
    target.setUTCMonth(target.getUTCMonth() + 2);
    let birthDate = "1959-01-01";
    let core = createLifeCore(input);
    for (let pass = 0; pass < 6; pass++) {
      core = createLifeCore({
        ...input,
        people: input.people.map((row) =>
          row.id === adult.id ? { ...row, birthDate } : row,
        ),
      });
      const date = claimDateOf(coreAPI(core), core.people.get(adult.id)!);
      const off = Math.round(
        (target.getTime() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000,
      );
      if (Math.abs(off) <= 20) break;
      const moved = new Date(`${birthDate}T00:00:00Z`);
      moved.setUTCDate(moved.getUTCDate() + off);
      birthDate = moved.toISOString().slice(0, 10);
    }
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
});
