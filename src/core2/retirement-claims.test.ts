import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { retirementClaims } from "./modules/retirement-claims";
import { PARAMETERS } from "./parameters";
import { retirementClaimAgeMonths } from "./retirement-claim";
import { coreAPI } from "./state";
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
    // One full adult, born so their own claim date falls two months in.
    const input = generatedOpening(place, { twoLevel: true });
    const adult = input.people
      .filter((row) => row.id !== input.playerId && !row.jobId)
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
          deliberation: adult.traits["people-mind-v1:deliberation"],
          reliability: adult.traits["people-mind-v1:reliability"],
          risk: adult.traits["people-mind-v1:risk"],
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
    advanceCore(core, "2022-01-01");
    const claims = retirementClaims(core);
    expect(claims.has(adult.id)).toBe(true);
    for (const [personId, row] of claims) {
      expect(row.monthlyMinor).toBeGreaterThan(0);
      const obligation = api
        .accounts()
        .obligation(`retirement-claim:${personId}`)!;
      expect(obligation.paidMinor).toBeGreaterThan(0);
      const age =
        (Date.parse(`${row.date}T00:00:00Z`) -
          Date.parse(`${core.people.get(personId)!.birthDate}T00:00:00Z`)) /
        (365.25 * 86_400_000);
      expect(age).toBeGreaterThanOrEqual(61.99);
      expect(age).toBeLessThanOrEqual(70.01);
    }
    expect(total(core)).toBe(start);
  }, 600_000);
});
