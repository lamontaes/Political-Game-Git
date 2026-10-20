/**
 * Personality in unemployment claims (civic family): a worker laid off
 * through no choice of their own files for the state's benefit when the base
 * reason and their traits' lean toward filing together favor it. A drawn
 * place's played world (a place drawn from all 56 from a fresh seed, played over the window around its own next election), every
 * resident a full person; each adult is laid off from the same job in turn.
 */
import { drawPlace } from "../../tests/golden-path/place";
import { beforeAll, describe, expect, it } from "vitest";
import { fileClaim, unemploymentTerms } from "./jobs-benefits";
import { decisionLean } from "./trait-decisions";
import { adultsOf, drawnRaceWorld, RUN_SEED, weightOf } from "./trait-test-kit";
import type { CoreAPI, CoreState, JobInput, PersonState } from "./types";

const SEED = `${RUN_SEED}:jobs-benefits`;

let core: CoreState;
let api: CoreAPI;
let adults: PersonState[];

// Building and playing a drawn town 30 days takes about 15 seconds.
beforeAll(() => {
  ({ core, api } = drawnRaceWorld(SEED, drawPlace(SEED, "trait-wiring"), 30));
  adults = adultsOf(core);
  // Reason for the hook's time: the drawn place is built twice (its election calendar, then every resident as a full person) and played for the window, 1 to 5 minutes on a shared machine.
}, 600_000);

describe("jobs-benefits.file-claim reads the worker's calibrated lean toward filing", () => {
  it("laid-off workers who did not file lean away from filing more than those who did, and each claim cites the worker", () => {
    expect(
      unemploymentTerms(api).hasProgram,
      "the place's state has a program",
    ).toBe(true);
    const claims = api.moduleState("jobs").table("claims");
    const filed: number[] = [];
    const skipped: number[] = [];
    for (const person of adults) {
      const job: JobInput = {
        id: `job:trait-test:${person.id}`,
        personId: person.id,
        organizationId: "organization:trait-test",
        title: "Trait test job",
        wageDailyMinor: 20_000,
        hoursDaily: 8,
        source: { tag: "ESTIMATED", asOf: core.date, citation: "Trait test" },
      };
      const claim = fileClaim(api, claims, job, "layoff", 52);
      const lean = decisionLean(
        core,
        person,
        "jobs-benefits.file-claim",
        "file",
        "skip",
      );
      if (claim) {
        expect(claim.personId).toBe(person.id);
        filed.push(lean);
      } else skipped.push(lean);
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(
      `claims: ${filed.length} filed (mean lean ${mean(filed).toFixed(3)}), ${skipped.length} did not (${skipped.length ? mean(skipped).toFixed(3) : "-"}), weight ${weightOf(core, "jobs-benefits.file-claim")}`,
    );
    expect(skipped.length).toBeGreaterThan(0);
    expect(mean(filed)).toBeGreaterThan(mean(skipped));
  });
});
