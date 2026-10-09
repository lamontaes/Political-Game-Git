import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import type { CoreSetup, RunReceipt } from "./contract";
import { evaluateLife } from "./evaluator";
import { readLife } from "./life-file";
import { createReplayCore } from "./old-core";
import { runLife } from "./runner";

function syntheticSetup(stateCode: string, name: string): CoreSetup {
  return {
    seed: "p9-boundary-fixture",
    controller: "god",
    startDate: "2021-01-01",
    subject: {
      name: "Boundary Fixture",
      birthDate: "2007-01-01",
      birthPlace: {
        key: `boundary/${stateCode}`,
        name,
        stateCode,
        country: "US",
      },
    },
    birthSources: [
      {
        id: "boundary-fixture",
        url: "https://www.census.gov/geographies/reference-files/2020/demo/popest/2020-fips.html",
        title: "Synthetic boundary fixture; jurisdiction names from Census",
        publisher: "P9 test fixture",
        location: "All jurisdiction rows",
        kind: "synthetic-test-fixture",
        accessed: "2026-10-09",
      },
    ],
    family: [],
    household: { value: {}, sourceRefs: [] },
    past: [],
    knownState: {},
    stopgapSink: () => undefined,
  };
}

describe("unchanged old-core diagnostic adapter", () => {
  it("uses the same path for all 56 state and territory identities", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const core = createReplayCore("fixture");
      const initialized = core.initialize(
        syntheticSetup(place.usps, place.name),
      );
      expect(initialized.recordIds).toHaveLength(2);
      expect(
        initialized.gaps.some((gap) => gap.code === "source-only-world"),
      ).toBe(true);
      const advanced = core.advance("2021-01-02", 1);
      expect(advanced.complete).toBe(true);
      expect(advanced.simulatedDays).toBe(1);
      expect(core.capability("extension.data-key").representation).toBe(
        "records-only",
      );
    }
  });
  it("forces an actual available native choice through the existing consequence writer", () => {
    const core = createReplayCore("fixture");
    core.initialize(syntheticSetup("NY", "New York"));
    const decisions = core.decisions();
    expect(decisions.length).toBeGreaterThan(0);
    let records: string[] = [];
    for (const decision of decisions) {
      for (const choice of decision.choices) {
        try {
          records = core.resolve(decision.id, choice.key).recordIds;
        } catch {
          continue;
        }
        if (records.length > 0) break;
      }
      if (records.length > 0) break;
    }
    expect(records.length).toBeGreaterThan(0);
    expect(
      core
        .observe()
        .some(
          (observation) =>
            observation.origin === "forced" &&
            observation.recordIds.some((id) => records.includes(id)),
        ),
    ).toBe(true);
    expect(() => core.resolve("absent", "absent")).toThrow("unavailable");
  });
  it("keeps world-event recordability separate from reproduced outcomes", () => {
    const life = readLife("data/life-replay/lives/lyndon-b-johnson.json");
    const receipt = runLife(life, createReplayCore("fixture"), {
      mode: "free",
      seed: "old-core-proof",
    });
    const evaluation = evaluateLife(life, receipt);
    expect(receipt.complete).toBe(true);
    expect(evaluation.summary.recordsOnly).toBe(life.timeline.length);
    expect(evaluation.summary.reproduced).toBe(0);
    expect(evaluation.summary.unmeasuredRanges).toBe(1);
    expect(receipt.steps.every((step) => step.probeRecordIds!.length > 0)).toBe(
      true,
    );
    expect(
      receipt.inputs.some((input) =>
        [
          "civil-rights-law",
          "voting-rights-law",
          "vietnam-authorization",
        ].includes(input.inputId),
      ),
    ).toBe(false);
  });
  it("repeats the same state and records for the same seed and external inputs", () => {
    const life = readLife(
      "data/life-replay/lives/alexandria-ocasio-cortez.json",
    );
    const stable = (receipt: RunReceipt) => ({
      ...receipt,
      elapsedMilliseconds: 0,
      peakRssBytes: 0,
    });
    const first = runLife(life, createReplayCore("fixture"), {
      mode: "free",
      seed: "repeat",
    });
    const second = runLife(life, createReplayCore("fixture"), {
      mode: "free",
      seed: "repeat",
    });
    expect(stable(first)).toEqual(stable(second));
  });
});
