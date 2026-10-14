import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { DEFAULT_DATA } from "./data";
import { advanceCore, createLifeCore } from "./life";
import { residentPerson, residentsRuntime } from "./modules/residents";
import { retirementClaims } from "./modules/retirement-claims";
import { PARAMETERS } from "./parameters";
import { retirementClaimAgeMonths } from "./retirement-claim";
import { coreAPI, fillInPerson } from "./state";
import { decisionLean } from "./trait-decisions";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

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
    // The birth year sets the full retirement age, so settle the two together.
    let birthDate = "1959-01-01";
    for (let pass = 0; pass < 4; pass++) {
      const months = retirementClaimAgeMonths(
        {
          birthYear: Number(birthDate.slice(0, 4)),
          bufferMonths:
            adult.livingCostDailyMinor > 0
              ? adult.liquidMinor /
                ((adult.livingCostDailyMinor * 365.2425) / 12)
              : weights.fullBufferMonths,
          patience: decisionLean(
            { data: DEFAULT_DATA },
            adult,
            "retirement.claim-age",
            "wait-to-claim",
            "claim-now",
          ),
        },
        weights,
      );
      const birth = new Date(`${input.startedAt}T00:00:00Z`);
      birth.setUTCMonth(birth.getUTCMonth() + 2 - months);
      birthDate = birth.toISOString().slice(0, 10);
    }
    const core = createLifeCore({
      ...input,
      people: input.people.map((row) =>
        row.id === adult.id ? { ...row, birthDate } : row,
      ),
    });
    const api = coreAPI(core);
    const start = total(core);
    // A year from the opening, then two months more (dates follow the game start).
    const monthsOn = (months: number) => {
      const at = new Date(`${input.startedAt}T00:00:00Z`);
      at.setUTCMonth(at.getUTCMonth() + months);
      return at.toISOString().slice(0, 10);
    };
    advanceCore(core, monthsOn(12));
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
    advanceCore(core, monthsOn(14));
    const moved = retirementClaims(core).get(claimant)!;
    expect(moved.counted).toBe(false);
    expect(api.accounts().obligation(moved.obligationId)!.paidMinor).toBe(
      moved.monthlyMinor * 2,
    );
    expect(total(core)).toBe(start);
  }, 600_000);
});
