import { describe, expect, it } from "vitest";
import type {
  CoreDecision,
  CoreObservation,
  CorePastFact,
  CoreSetup,
  LifeFile,
  ReplayCore,
  WorldInput,
} from "./contract";
import { evaluateLife } from "./evaluator";
import { lifeProblems, readLife } from "./life-file";
import { REPLAY_API_VERSION } from "./parameters";
import { daysBetween, matchingChoices, runLife } from "./runner";
import { renderGapReport } from "./report";

/** Synthetic contract fixture, never evidence that either real core lives a life. */
function contractFixture() {
  let date = "2021-01-01";
  let setup: CoreSetup;
  const observations: CoreObservation[] = [];
  const events: CorePastFact[] = [];
  const inputs: WorldInput[] = [];
  const forces: string[] = [];
  let decision: CoreDecision | undefined;
  const modules = new Map<string, (input: CorePastFact) => void>();
  const empty = () => ({ gaps: [], observations: [], recordIds: [] });
  const core: ReplayCore = {
    metadata: {
      apiVersion: REPLAY_API_VERSION,
      id: "contract-fixture",
      revision: "test-only",
      execution: "continuous",
    },
    initialize(input) {
      setup = input;
      date = input.startDate;
      return empty();
    },
    input(input) {
      inputs.push(input);
      return empty();
    },
    advance(target, remaining) {
      const days = Math.min(daysBetween(date, target), remaining);
      date = new Date(Date.parse(date + "T00:00:00Z") + days * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        ...empty(),
        throughDate: date,
        simulatedDays: days,
        complete: date === target,
      };
    },
    decisions() {
      return decision ? [decision] : [];
    },
    resolve(id, key) {
      if (key === null) return empty();
      if (
        decision?.id !== id ||
        !decision.choices.some((choice) => choice.key === key && choice.enabled)
      )
        throw new Error("unavailable");
      forces.push(key);
      return empty();
    },
    observe() {
      return [...observations];
    },
    event(input) {
      events.push(input);
      modules.get(input.mechanism)?.(input);
      return empty();
    },
    capability() {
      return { representation: "full", gaps: [] };
    },
  };
  return {
    core,
    observations,
    events,
    inputs,
    forces,
    modules,
    get setup() {
      return setup;
    },
    setDecision(value: CoreDecision) {
      decision = value;
    },
  };
}

const publicLife = () => readLife("data/life-replay/lives/wes-moore.json");
function shortLife(): LifeFile {
  const life = publicLife();
  life.timeline = [
    structuredClone(
      life.timeline.find((step) => step.id === "governor-campaign")!,
    ),
  ];
  life.timeline[0].requires = [];
  life.conditions = [];
  return life;
}

describe("replay control and evaluator evidence", () => {
  it("forces a documented decision when the core pauses inside an imprecise source window", () => {
    const life = shortLife();
    const step = life.timeline[0];
    step.date = {
      ...step.date,
      earliest: "2021-01-01",
      latest: "2021-12-31",
      precision: "year",
    };
    const fixture = contractFixture();
    const decision: CoreDecision = {
      id: "pending",
      actorId: "subject-id",
      actorKey: "subject",
      mechanism: step.mechanism,
      choices: [
        { key: "run", intent: step.payload, enabled: true, blockers: [] },
      ],
    };
    let done = false;
    let current = "2021-01-01";
    fixture.core.advance = (target, remaining) => {
      const throughDate = done ? target : "2021-06-07";
      const days = daysBetween(current, throughDate);
      expect(days).toBeLessThanOrEqual(remaining);
      current = throughDate;
      return {
        throughDate,
        simulatedDays: days,
        complete: done,
        pending: done ? [] : [decision],
        gaps: [],
        observations: [],
        recordIds: [],
      };
    };
    fixture.core.resolve = (id, key) => {
      expect([id, key]).toEqual(["pending", "run"]);
      done = true;
      return {
        gaps: [],
        recordIds: ["decision"],
        observations: [
          {
            metric: "candidacy.office",
            value: "governor",
            date: current,
            origin: "engine",
            recordIds: ["decision"],
          },
        ],
      };
    };
    fixture.core.decisions = () => [];
    const receipt = runLife(life, fixture.core, {
      mode: "god",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(receipt.complete).toBe(true);
    expect(receipt.steps[0].forcedDecision).toEqual({
      decisionId: "pending",
      choiceKey: "run",
    });
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(1);
  });
  it("delegates undocumented pending decisions to the ordinary scorer", () => {
    const life = shortLife();
    const fixture = contractFixture();
    const decision: CoreDecision = {
      id: "reaction",
      actorId: "neighbor",
      actorKey: "neighbor",
      mechanism: "unrelated-act",
      choices: [],
    };
    let done = false;
    let current = "2021-01-01";
    const delegated: unknown[] = [];
    fixture.core.advance = (target) => {
      const throughDate = done ? target : "2021-02-01";
      const days = daysBetween(current, throughDate);
      current = throughDate;
      return {
        throughDate,
        simulatedDays: days,
        complete: done,
        pending: done ? [] : [decision],
        gaps: [],
        observations: [],
        recordIds: [],
      };
    };
    fixture.core.resolve = (id, key) => {
      delegated.push([id, key]);
      done = true;
      return { gaps: [], observations: [], recordIds: ["ordinary-choice"] };
    };
    const receipt = runLife(life, fixture.core, {
      mode: "god",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(receipt.complete).toBe(true);
    expect(delegated).toEqual([["reaction", null]]);
    expect(receipt.steps[0].forcedDecision).toBeNull();
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(0);
  });
  it("finishes every pending decision at the horizon before declaring completion", () => {
    const life = shortLife();
    const fixture = contractFixture();
    const pending = ["neighbor-a", "neighbor-b"].map((id): CoreDecision => ({
      id,
      actorId: id,
      actorKey: id,
      mechanism: "ordinary",
      choices: [],
    }));
    let current = "2021-01-01";
    const resolved: unknown[] = [];
    fixture.core.advance = (target) => {
      const days = daysBetween(current, target);
      current = target;
      return {
        throughDate: target,
        simulatedDays: days,
        complete: pending.length === 0,
        pending: [...pending],
        gaps: [],
        observations: [],
        recordIds: [],
      };
    };
    fixture.core.resolve = (id, key) => {
      resolved.push([id, key]);
      pending.splice(
        pending.findIndex((item) => item.id === id),
        1,
      );
      return { gaps: [], observations: [], recordIds: [id] };
    };
    const receipt = runLife(life, fixture.core, {
      mode: "god",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(receipt.complete).toBe(true);
    expect(resolved).toEqual([
      ["neighbor-a", null],
      ["neighbor-b", null],
    ]);
    expect(pending).toEqual([]);
  });
  it("validates all three public files and rejects uncited or untagged facts", () => {
    for (const name of [
      "alexandria-ocasio-cortez",
      "wes-moore",
      "lyndon-b-johnson",
    ])
      expect(
        lifeProblems(readLife(`data/life-replay/lives/${name}.json`)),
      ).toEqual([]);
    const life = shortLife();
    life.timeline[0].sourceRefs = [];
    life.timeline[0].payload.pay = 100;
    expect(lifeProblems(life)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("missing citation"),
        expect.stringContaining("numeric fact"),
      ]),
    );
  });
  it("free mode gets past facts, external events, and conditions but no future choices or checks", () => {
    const fixture = contractFixture();
    const life = publicLife();
    runLife(life, fixture.core, {
      mode: "free",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(fixture.forces).toEqual([]);
    expect(
      fixture.setup.past.every(
        (fact) =>
          !("checks" in fact) &&
          !("ranges" in fact) &&
          fact.date.latest < fixture.setup.startDate,
      ),
    ).toBe(true);
    expect(JSON.stringify(fixture.setup)).not.toContain("primary-win");
    expect(fixture.events.every((event) => event.kind === "event")).toBe(true);
    expect(fixture.inputs).toHaveLength(
      life.conditions.filter(
        (input) =>
          input.role !== "reference" && input.throughDate >= "2021-01-01",
      ).length,
    );
  });
  it("god mode selects an actual enabled choice and cannot insert the documented outcome", () => {
    const life = shortLife();
    const fixture = contractFixture();
    fixture.setDecision({
      id: "d",
      actorId: "p",
      actorKey: "subject",
      mechanism: "candidacy",
      choices: [
        {
          key: "run",
          intent: { ...life.timeline[0].payload },
          enabled: true,
          blockers: [],
        },
      ],
    });
    const receipt = runLife(life, fixture.core, {
      mode: "god",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(fixture.forces).toEqual(["run"]);
    expect(receipt.steps[0].forcedDecision).toEqual({
      decisionId: "d",
      choiceKey: "run",
    });
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(0);
    expect(fixture.events).toEqual([]);
  });
  it("can force another actor explicitly and refuses blocked or ambiguous matches", () => {
    const life = shortLife();
    const step = life.timeline[0];
    step.actorKey = "parent";
    const decision: CoreDecision = {
      id: "d",
      actorId: "parent-id",
      actorKey: "parent",
      mechanism: step.mechanism,
      choices: [
        { key: "run", intent: step.payload, enabled: true, blockers: [] },
      ],
    };
    expect(matchingChoices(step, [decision])).toHaveLength(1);
    expect(
      matchingChoices({ ...step, actorKey: "subject" }, [decision]),
    ).toEqual([]);
    expect(
      matchingChoices(step, [
        {
          ...decision,
          choices: [{ ...decision.choices[0], blockers: ["not-qualified"] }],
        },
      ]),
    ).toEqual([]);
    const fixture = contractFixture();
    fixture.setDecision({
      ...decision,
      choices: [decision.choices[0], { ...decision.choices[0], key: "other" }],
    });
    const receipt = runLife(life, fixture.core, {
      mode: "god",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(fixture.forces).toEqual([]);
    expect(
      receipt.steps[0].gaps.some(
        (gap) => gap.code === "ambiguous-forceable-choice",
      ),
    ).toBe(true);
  });
  it("counts dated engine consequences while rejecting initialized or forced observations", () => {
    const life = shortLife();
    const step = life.timeline[0];
    const fixture = contractFixture();
    fixture.observations.push({
      metric: step.checks[0].metric,
      value: step.checks[0].equals,
      date: step.date.latest,
      origin: "forced",
      recordIds: ["forced-choice"],
    });
    const receipt = runLife(life, fixture.core, {
      mode: "free",
      seed: "test",
      checkpoint: "modern-start",
    });
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(0);
    receipt.steps[0].observations.push({
      ...fixture.observations[0],
      origin: "engine",
      recordIds: ["consequence"],
    });
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(1);
    receipt.steps[0].observations.at(-1)!.date = "2020-12-31";
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(0);
  });
  it("reports an out-of-range number and leaves absent measurements unmeasured", () => {
    const life = readLife("data/life-replay/lives/lyndon-b-johnson.json");
    const fixture = contractFixture();
    const step = life.timeline.find((row) => row.id === "college")!;
    fixture.observations.push({
      metric: "finance.educationLoanDollars",
      value: 1000,
      date: step.date.latest,
      origin: "engine",
      recordIds: ["loan"],
    });
    const evaluation = evaluateLife(
      life,
      runLife(life, fixture.core, { mode: "free", seed: "test" }),
    );
    expect(evaluation.summary.outOfRange).toBe(1);
    expect(
      evaluation.steps.find((row) => row.stepId === "presidential-succession")!
        .ranges[0].status,
    ).toBe("unmeasured");
    expect(
      evaluation.steps.find((row) => row.stepId === "college-degree")!
        .chainBrokenBy,
    ).toContain("college");
  });
  it("does not treat a supplied checkpoint history as an established causal link", () => {
    const life = publicLife();
    const fixture = contractFixture();
    const evaluation = evaluateLife(
      life,
      runLife(life, fixture.core, {
        mode: "free",
        seed: "test",
        checkpoint: "modern-start",
      }),
    );
    expect(
      evaluation.steps
        .filter((step) => step.checkpointPast)
        .every((step) => !step.initialized && !step.reproduced),
    ).toBe(true);
    expect(evaluation.firstBreak?.stepId).toBe("governor-campaign");
  });
  it("compares sourced numeric targets against actual numeric consequences and reports absent results honestly", () => {
    const life = shortLife();
    life.timeline[0].checks = [
      { metric: "measurement", equals: { parameter: "lbj-college-loan" } },
    ];
    const fixture = contractFixture();
    const receipt = runLife(life, fixture.core, {
      mode: "free",
      seed: "test",
      checkpoint: "modern-start",
    });
    const report = renderGapReport(life, [{ receipt, path: "receipt.json" }]);
    expect(report).toContain("no documented path reproduced");
    expect(report).toContain("Behavior exposed; no matching result");
    expect(report).toContain("P8 owns world initialization");
    receipt.steps[0].observations.push({
      metric: "measurement",
      value: 75,
      date: life.timeline[0].date.latest,
      origin: "engine",
      recordIds: ["measurement"],
    });
    expect(evaluateLife(life, receipt).summary.reproduced).toBe(1);
  });
  it("reports an unreached horizon and rejects incompatible core versions", () => {
    const life = shortLife();
    const fixture = contractFixture();
    const receipt = runLife(life, fixture.core, {
      mode: "free",
      seed: "test",
      checkpoint: "modern-start",
      maxSimulatedDays: 1,
    });
    expect(receipt.complete).toBe(false);
    expect(
      receipt.steps[0].gaps.some((gap) => gap.code === "unreached-step"),
    ).toBe(true);
    fixture.core.metadata.apiVersion = "life-replay/v2";
    expect(() =>
      runLife(life, fixture.core, { mode: "free", seed: "test" }),
    ).toThrow("migration");
  });
  it("accepts a new event and need through data plus one module without runner edits", () => {
    const life = shortLife();
    const fixture = contractFixture();
    const step = life.timeline[0];
    step.kind = "event";
    step.mechanism = "research.extension";
    step.payload = { need: "need:recover" };
    step.checks = [{ metric: "need.active", equals: "need:recover" }];
    // This is the single extension module. The harness has no branch for either key.
    fixture.modules.set(step.mechanism, (input) =>
      fixture.observations.push({
        metric: "need.active",
        value: input.payload.need,
        date: input.date.latest,
        origin: "engine",
        recordIds: ["module-effect"],
      }),
    );
    expect(
      evaluateLife(
        life,
        runLife(life, fixture.core, {
          mode: "free",
          seed: "test",
          checkpoint: "modern-start",
        }),
      ).summary.reproduced,
    ).toBe(1);
  });
});
