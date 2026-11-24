/**
 * A person has one open unemployment claim: a second layoff while a claim is
 * paying files nothing new, so no two claims pay one person on one day and
 * reuse a payment id (Montpelier, Vermont, seed mont1, August 18, 2031; memory
 * and long runs, Nov 8). A drawn place's played world, named in the failure.
 */
import "../bench/world";
import { drawPlace } from "../../tests/golden-path/place";
import { describe, expect, it } from "vitest";
import { fileClaim } from "./jobs-benefits";
import { adultsOf, drawnRaceWorld, RUN_SEED } from "./trait-test-kit";
import type { JobInput } from "./types";

const SEED = `${RUN_SEED}:one-open-claim`;

describe(`one open claim (seed ${SEED})`, () => {
  it("files nothing for a person whose claim is open", () => {
    const { core, api } = drawnRaceWorld((attempt) => {
      const seed = `${SEED}:${attempt}`;
      return { seed, place: drawPlace(seed, "trait-wiring") };
    }, 30);
    const claims = api.moduleState("jobs").table("claims");
    const job = (personId: string, n: number): JobInput => ({
      id: `job:one-open:${personId}:${n}`,
      personId,
      organizationId: "organization:one-open",
      title: "Test job",
      wageDailyMinor: 20_000,
      hoursDaily: 8,
      source: { tag: "ESTIMATED", asOf: core.date, citation: "Test" },
    });
    let checked = 0;
    for (const person of adultsOf(core)) {
      const first = fileClaim(api, claims, job(person.id, 1), "layoff", 52);
      if (!first) continue;
      expect(
        fileClaim(api, claims, job(person.id, 2), "layoff", 52),
        `${person.id} second claim`,
      ).toBeUndefined();
      checked += 1;
    }
    expect(checked, "someone filed").toBeGreaterThan(0);
  }, 600_000);
});
