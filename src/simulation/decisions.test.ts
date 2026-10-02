import { describe, expect, it } from "vitest";
import { isSelectedDecision } from "./decisions";

describe("decision consequence contract", () => {
  it("authorizes only an explicitly selected option", () => {
    expect(
      isSelectedDecision({
        outcomeKind: "selected",
        selectedOptionKey: "accept",
      }),
    ).toBe(true);
    expect(
      isSelectedDecision({ outcomeKind: "undecided", selectedOptionKey: null }),
    ).toBe(false);
    expect(
      isSelectedDecision({
        outcomeKind: "no-available-option",
        selectedOptionKey: null,
      }),
    ).toBe(false);
    expect(
      isSelectedDecision({ outcomeKind: "selected", selectedOptionKey: null }),
    ).toBe(false);
  });
});

import { beforeAll } from "vitest";
import { createDemoWorld } from "./demo";
import { createLightweightPerson } from "./people";
import { createWorld, createWorldId, materializePerson } from "./world";
import { createStableId } from "./ids";
import { makeIsoDate } from "./dates";
import {
  STATES,
  isTerritoryUsps,
  isFederalDistrictUsps,
} from "./state-reference";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { recordPerception } from "./mind";
import { decisionConsiderationScore } from "./decision-scores";
import { currentHistoricalCutoff } from "./queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrityFully } from "./world";
import { personName } from "./people";
import type { DecisionContext, EntityId, World } from "./types";

// Authored motive assertions are saved with the canonical perception writer.
// No traces, selected keys, IDs, or history cutoffs are cast into existence.
const CHOICE_TYPE = "fixture.apply-or-wait";
const CHOICE_OPTIONS = [
  { key: "apply", label: "Apply", description: "Apply for the opportunity." },
  { key: "wait", label: "Wait", description: "Wait before applying." },
] as const;
let choiceBase: World;
beforeAll(() => {
  choiceBase = createDemoWorld("decision-sourced-exact-ties");
  const actor = choiceBase.personOrder[1]!;
  console.log(
    JSON.stringify({
      kind: "canonical-decision-choice-fixture",
      actorId: actor,
      actorName: personName(choiceBase.people[actor]!),
      place: Object.values(choiceBase.jurisdictions).map((place) => place.name),
      currentDate: choiceBase.currentDate,
      meaning:
        "Controlled saved authored perceptions, not a natural permit application",
    }),
  );
});

function sourcedChoice(actorIndex = 1, base: World = choiceBase) {
  let world = base;
  const actor = world.personOrder[actorIndex];
  if (!actor) throw new Error("Missing actual demo decision actor");
  const perceptions = new Map<string, EntityId>();
  for (const option of CHOICE_OPTIONS) {
    world = recordPerception(world, {
      stableKey: `exact-choice:${actor}:${option.key}`,
      personId: actor,
      perceivedAt: world.currentDate,
      subjectKind: "context:situation",
      subjectKey: "fixture:apply-or-wait",
      subjectEntityId: null,
      assertion:
        option.key === "apply"
          ? "Applying now would pursue the opportunity."
          : "Waiting would leave time to consider the opportunity.",
      confidence: "high",
      sourceCredibility: "unknown",
      source: { kind: "authored", note: "Controlled decision motive fixture." },
      supersedesPerceptionId: null,
    });
    perceptions.set(option.key, world.history.perceptions.at(-1)!.id);
  }
  const context: DecisionContext = {
    stableKey: "exact-choice:tie",
    decisionType: CHOICE_TYPE,
    actorPersonId: actor,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:situation",
      key: "fixture:apply-or-wait",
      entityId: null,
    },
    options: CHOICE_OPTIONS,
    constraints: [],
    considerations: CHOICE_OPTIONS.map((option) => ({
      stableKey: `exact-choice:motive:${option.key}`,
      optionKey: option.key,
      sourceType: "information:perceived-opportunity",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation:
        option.key === "apply"
          ? "A saved reason to apply."
          : "A saved reason to wait.",
      sourceRefs: [
        { kind: "perception", perceptionId: perceptions.get(option.key)! },
      ],
    })),
    perceptionIds: [...perceptions.values()],
    randomness: "none",
    retention: "ephemeral",
  };
  return { world, actor, context, perceptions };
}

function saveSelectedWait(
  fixture: ReturnType<typeof sourcedChoice>,
  decisionType = CHOICE_TYPE,
) {
  const selected = evaluateDecision(fixture.world, {
    ...fixture.context,
    stableKey: "exact-choice:earlier-wait",
    decisionType,
    considerations: fixture.context.considerations.filter(
      (row) => row.optionKey === "wait",
    ),
    retention: "durable",
  });
  expect(selected.outcomeKind).toBe("selected");
  expect(selected.selectedOptionKey).toBe("wait");
  return recordDurableDecisionTrace(fixture.world, selected);
}

function expectUndecided(result: ReturnType<typeof evaluateDecision>) {
  expect(result.outcomeKind).toBe("undecided");
  expect(result.selectedOptionKey).toBeNull();
  expect(
    result.optionEvaluations.every(
      (option) => option.randomContribution === "none",
    ),
  ).toBe(true);
}

describe("sourced motives, exact ties, and last recorded choices", () => {
  it.each(["none", "close-choices"] as const)(
    "keeps an empty apply/wait question undecided (%s)",
    (randomness) => {
      const { world, context } = sourcedChoice();
      expectUndecided(
        evaluateDecision(world, {
          ...context,
          randomness,
          considerations: [],
          perceptionIds: [],
        }),
      );
    },
  );

  it.each(["none", "close-choices"] as const)(
    "does not resolve equal sourced motives by order or random contribution (%s)",
    (randomness) => {
      const { world, context } = sourcedChoice();
      for (const options of [CHOICE_OPTIONS, [...CHOICE_OPTIONS].reverse()]) {
        for (const stableKey of [
          "exact-choice:first-key",
          "exact-choice:second-key",
        ]) {
          expectUndecided(
            evaluateDecision(world, {
              ...context,
              options,
              stableKey,
              randomness,
            }),
          );
        }
      }
    },
  );

  it.each(["none", "close-choices"] as const)(
    "retains the uniquely supported wait choice (%s)",
    (randomness) => {
      const { world, context } = sourcedChoice();
      const result = evaluateDecision(world, {
        ...context,
        randomness,
        considerations: context.considerations.filter(
          (row) => row.optionKey === "wait",
        ),
      });
      expect(result.outcomeKind).toBe("selected");
      expect(result.selectedOptionKey).toBe("wait");
      const durable = evaluateDecision(world, {
        ...result.context,
        stableKey: "exact-choice:recorded-unique-wait",
        retention: "durable",
      });
      const recorded = recordDurableDecisionTrace(world, durable);
      assertWorldIntegrityFully(recorded);
      expect(serializeWorld(deserializeWorld(serializeWorld(recorded)))).toBe(
        serializeWorld(recorded),
      );
      expect(
        result.optionEvaluations.every(
          (option) => option.randomContribution === "none",
        ),
      ).toBe(true);
    },
  );

  it("uses the actual last selected wait trace for an exact tie after SaveContinue", () => {
    const fixture = sourcedChoice();
    const selectedWorld = saveSelectedWait(fixture);
    const saved = serializeWorld(selectedWorld);
    const reloaded = deserializeWorld(saved);
    expect(serializeWorld(reloaded)).toBe(saved);
    for (const world of [selectedWorld, reloaded]) {
      const result = evaluateDecision(world, {
        ...fixture.context,
        cutoff: currentHistoricalCutoff(world),
      });
      expect(result.outcomeKind).toBe("selected");
      expect(result.selectedOptionKey).toBe("wait");
      const recorded = recordDurableDecisionTrace(
        world,
        evaluateDecision(world, {
          ...result.context,
          stableKey: "exact-choice:recorded-tied-wait",
          retention: "durable",
        }),
      );
      assertWorldIntegrityFully(recorded);
      expect(serializeWorld(deserializeWorld(serializeWorld(recorded)))).toBe(
        serializeWorld(recorded),
      );
    }
    expect(serializeWorld(selectedWorld)).toBe(saved);
  });

  it("does not see a selected trace beyond the historical sequence cutoff", () => {
    const fixture = sourcedChoice();
    const beforeTrace = currentHistoricalCutoff(fixture.world);
    const world = saveSelectedWait(fixture);
    expectUndecided(
      evaluateDecision(world, { ...fixture.context, cutoff: beforeTrace }),
    );
    expect(
      evaluateDecision(world, {
        ...fixture.context,
        cutoff: currentHistoricalCutoff(world),
      }).selectedOptionKey,
    ).toBe("wait");
  });

  it("does not carry a last selected option through an actual constraint", () => {
    const fixture = sourcedChoice();
    const world = saveSelectedWait(fixture);
    const result = evaluateDecision(world, {
      ...fixture.context,
      cutoff: currentHistoricalCutoff(world),
      constraints: [
        {
          stableKey: "exact-choice:wait-blocked",
          optionKey: "wait",
          kind: "context:unavailable",
          explanation: "The saved fixture perception now rules out waiting.",
          sourceRefs: [
            {
              kind: "perception",
              perceptionId: fixture.perceptions.get("wait")!,
            },
          ],
        },
      ],
    });
    expect(result.outcomeKind).toBe("selected");
    expect(result.selectedOptionKey).toBe("apply");
    expect(
      result.optionEvaluations.find((row) => row.optionKey === "wait")
        ?.available,
    ).toBe(false);
  });

  it("does not borrow a selected trace from a different decision type", () => {
    const fixture = sourcedChoice();
    const world = saveSelectedWait(fixture, "fixture.other-choice");
    expectUndecided(
      evaluateDecision(world, {
        ...fixture.context,
        cutoff: currentHistoricalCutoff(world),
      }),
    );
  });

  it("does not borrow a selected trace from another actual actor", () => {
    const other = sourcedChoice(2);
    const worldWithOtherTrace = saveSelectedWait(other);
    // Add the first actor's actual perceptions to that immutable saved World.
    const own = sourcedChoice(1);
    let world = worldWithOtherTrace;
    for (const perception of own.world.history.perceptions.filter(
      (row) =>
        row.personId === own.actor && row.stableKey.startsWith("exact-choice:"),
    )) {
      world = recordPerception(world, {
        stableKey: perception.stableKey,
        personId: perception.personId,
        perceivedAt: perception.perceivedAt,
        subjectKind: perception.subjectKind,
        subjectKey: perception.subjectKey,
        subjectEntityId: perception.subjectEntityId,
        assertion: perception.assertion,
        confidence: perception.confidence,
        sourceCredibility: perception.sourceCredibility,
        source: perception.source,
        supersedesPerceptionId: null,
      });
    }
    expectUndecided(
      evaluateDecision(world, {
        ...own.context,
        cutoff: currentHistoricalCutoff(world),
      }),
    );
  });

  it("does not skip the latest durable undecided trace for an older selected wait", () => {
    const fixture = sourcedChoice();
    let world = saveSelectedWait(fixture);
    const undecided = evaluateDecision(world, {
      ...fixture.context,
      stableKey: "exact-choice:latest-undecided",
      cutoff: currentHistoricalCutoff(world),
      options: [
        ...CHOICE_OPTIONS,
        {
          key: "reconsider",
          label: "Reconsider",
          description: "Reconsider the opportunity before answering.",
        },
      ],
      constraints: [
        {
          stableKey: "exact-choice:last-wait-unavailable",
          optionKey: "wait",
          kind: "context:unavailable",
          explanation: "The prior answer is unavailable in this saved context.",
          sourceRefs: [
            {
              kind: "perception",
              perceptionId: fixture.perceptions.get("wait")!,
            },
          ],
        },
      ],
      considerations: [],
      perceptionIds: [],
      retention: "durable",
    });
    expectUndecided(undecided);
    world = recordDurableDecisionTrace(world, undecided);
    const reloaded = deserializeWorld(serializeWorld(world));
    expectUndecided(
      evaluateDecision(reloaded, {
        ...fixture.context,
        cutoff: currentHistoricalCutoff(reloaded),
      }),
    );
  });

  it("rejects a selected key in a saved undecided trace", () => {
    const { world, context } = sourcedChoice();
    const saved = recordDurableDecisionTrace(
      world,
      evaluateDecision(world, {
        ...context,
        retention: "durable",
      }),
    );
    const trace = saved.history.decisionTraces.at(-1)!;
    expect(() =>
      assertWorldIntegrityFully({
        ...saved,
        history: {
          ...saved.history,
          decisionTraces: saved.history.decisionTraces.map((row) =>
            row === trace ? { ...row, selectedOptionKey: "apply" } : row,
          ),
        },
      }),
    ).toThrow("Decision trace outcome is inconsistent");
  });

  it("rejects shared ranks for unequal saved reasons", () => {
    const { world, context } = sourcedChoice();
    const saved = recordDurableDecisionTrace(
      world,
      evaluateDecision(world, {
        ...context,
        retention: "durable",
        considerations: context.considerations.filter(
          (row) => row.optionKey === "wait",
        ),
      }),
    );
    const trace = saved.history.decisionTraces.at(-1)!;
    expect(() =>
      assertWorldIntegrityFully({
        ...saved,
        history: {
          ...saved.history,
          decisionTraces: saved.history.decisionTraces.map((row) =>
            row === trace
              ? {
                  ...row,
                  optionEvaluations: row.optionEvaluations.map((option) => ({
                    ...option,
                    finalRank: 1,
                  })),
                }
              : row,
          ),
        },
      }),
    ).toThrow("Decision tie rank is inconsistent");
  });

  it("preserves a saved no-available-option result when every option is blocked", () => {
    const { world, context, perceptions } = sourcedChoice();
    const result = evaluateDecision(world, {
      ...context,
      retention: "durable",
      constraints: CHOICE_OPTIONS.map((option) => ({
        stableKey: `exact-choice:blocked:${option.key}`,
        optionKey: option.key,
        kind: "context:unavailable",
        explanation: "The option is unavailable in this controlled context.",
        sourceRefs: [
          {
            kind: "perception" as const,
            perceptionId: perceptions.get(option.key)!,
          },
        ],
      })),
    });
    expect(result.outcomeKind).toBe("no-available-option");
    expect(result.selectedOptionKey).toBeNull();
    const saved = recordDurableDecisionTrace(world, result);
    assertWorldIntegrityFully(saved);
    expect(serializeWorld(deserializeWorld(serializeWorld(saved)))).toBe(
      serializeWorld(saved),
    );
  });
});

describe("A124 exact score comparison across seeds", () => {
  it.each(["a124-first-seed", "a124-second-seed"])(
    "keeps an exact sourced tie undecided and a one-point lead selected (%s)",
    (seed) => {
      const fixture = sourcedChoice();
      const world = { ...fixture.world, seed };
      const tie = evaluateDecision(world, {
        ...fixture.context,
        randomness: "close-choices",
      });
      expectUndecided(tie);
      const extra = {
        ...fixture.context.considerations.find(
          (row) => row.optionKey === "wait",
        )!,
        stableKey: "a124:one-more-recorded-reason",
        importance: "slight" as const,
        confidence: "low" as const,
      };
      const considerations = [...fixture.context.considerations, extra];
      const score = (key: string) =>
        considerations
          .filter((row) => row.optionKey === key)
          .reduce((sum, row) => sum + decisionConsiderationScore(row), 0);
      expect(score("wait") - score("apply")).toBe(1);
      const lead = evaluateDecision(world, {
        ...fixture.context,
        considerations,
        randomness: "close-choices",
      });
      expect(lead.outcomeKind).toBe("selected");
      expect(lead.selectedOptionKey).toBe("wait");
      expect(
        lead.optionEvaluations.map((row) => row.randomContribution),
      ).toEqual(["none", "none"]);
    },
  );
});

function smallDecisionWorld(usps: string): World {
  const place = STATES[usps];
  if (!place) throw new Error("Missing canonical jurisdiction reference");
  const seed = `a124-all56:${usps}:recorded-reasons`;
  const currentDate = makeIsoDate("2026-01-05");
  const jurisdictionId = createStableId("jurisdiction", `a124-fixture:${usps}`);
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: jurisdictionId,
  });
  const world = createWorld({
    seed,
    currentDate,
    jurisdictions: [
      {
        id: jurisdictionId,
        slug: `a124-fixture-${usps.toLowerCase()}`,
        name: place.name,
        kind: isTerritoryUsps(usps)
          ? "territory"
          : isFederalDistrictUsps(usps)
            ? "federal-district"
            : "state",
        parentName: "United States",
        provenance: {
          asOf: currentDate,
          source: "Canonical postal reference; controlled decision fixture",
          jurisdiction: jurisdictionId,
          status: "candidate",
        },
      },
    ],
    people: [person],
  });
  return materializePerson(world, person.id);
}

describe("A124 A126 recorded choices in all 56 seeded small worlds", () => {
  it("covers the 50 states, DC and five inhabited territories", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
  });

  it.each(Object.keys(STATES))(
    "selects a sole constrained option, keeps two empty or tied alternatives pending and honors a saved eligible choice after reload in %s",
    (usps) => {
      const fixture = sourcedChoice(0, smallDecisionWorld(usps));
      const untouched = serializeWorld(fixture.world);
      for (const randomness of ["none", "close-choices"] as const) {
        expectUndecided(
          evaluateDecision(fixture.world, {
            ...fixture.context,
            randomness,
            considerations: [],
            perceptionIds: [],
          }),
        );
        expectUndecided(
          evaluateDecision(fixture.world, { ...fixture.context, randomness }),
        );
      }
      for (const option of CHOICE_OPTIONS) {
        const forced = evaluateDecision(fixture.world, {
          ...fixture.context,
          stableKey: `a124:one-available:${option.key}`,
          considerations: [],
          perceptionIds: [],
          constraints: CHOICE_OPTIONS.filter(
            (other) => other.key !== option.key,
          ).map((other) => ({
            stableKey: `a124:blocked:${other.key}`,
            optionKey: other.key,
            kind: "context:unavailable",
            explanation: "The saved constraint rules out this alternative.",
            sourceRefs: [
              {
                kind: "perception" as const,
                perceptionId: fixture.perceptions.get(other.key)!,
              },
            ],
          })),
          retention: "durable",
        });
        expect(forced.outcomeKind).toBe("selected");
        expect(forced.selectedOptionKey).toBe(option.key);
        expect(
          forced.optionEvaluations.filter((row) => row.available),
        ).toHaveLength(1);
        expect(
          forced.optionEvaluations.find((row) => row.optionKey === option.key)
            ?.finalRank,
        ).toBe(1);
        expect(
          forced.optionEvaluations.map((row) => row.randomContribution),
        ).toEqual(["none", "none"]);
        const recordedForced = recordDurableDecisionTrace(
          fixture.world,
          forced,
        );
        assertWorldIntegrityFully(recordedForced);
        const forcedTrace = recordedForced.history.decisionTraces.at(-1)!;
        const forgedUndecided = {
          ...recordedForced,
          history: {
            ...recordedForced.history,
            decisionTraces: recordedForced.history.decisionTraces.map(
              (trace) =>
                trace.id === forcedTrace.id
                  ? {
                      ...trace,
                      outcomeKind: "undecided" as const,
                      selectedOptionKey: null,
                    }
                  : trace,
            ),
          },
        };
        expect(() => assertWorldIntegrityFully(forgedUndecided)).toThrow(
          "Decision trace outcome is inconsistent",
        );
        const reloadedForced = deserializeWorld(serializeWorld(recordedForced));
        expect(reloadedForced.history.decisionTraces.at(-1)?.outcomeKind).toBe(
          "selected",
        );
        expect(
          reloadedForced.history.decisionTraces.at(-1)?.selectedOptionKey,
        ).toBe(option.key);
      }
      const prior = saveSelectedWait(fixture);
      const recorded = recordDurableDecisionTrace(
        prior,
        evaluateDecision(prior, {
          ...fixture.context,
          stableKey: "a124:all56-recorded-tie",
          cutoff: currentHistoricalCutoff(prior),
          randomness: "close-choices",
          retention: "durable",
        }),
      );
      assertWorldIntegrityFully(recorded);
      const saved = serializeWorld(recorded);
      const reloaded = deserializeWorld(saved);
      expect(serializeWorld(reloaded)).toBe(saved);
      const result = evaluateDecision(reloaded, {
        ...fixture.context,
        cutoff: currentHistoricalCutoff(reloaded),
        randomness: "close-choices",
      });
      expect(result.outcomeKind).toBe("selected");
      expect(result.selectedOptionKey).toBe("wait");
      expect(
        result.optionEvaluations.map((row) => row.randomContribution),
      ).toEqual(["none", "none"]);
      expect(serializeWorld(fixture.world)).toBe(untouched);
      if (usps === Object.keys(STATES)[0])
        console.log(
          JSON.stringify({
            kind: "all56-small-decision-example",
            name: personName(fixture.world.people[fixture.actor]!),
            personId: fixture.actor,
            place: STATES[usps]!.name,
            currentDate: fixture.world.currentDate,
            meaning:
              "Controlled saved perceptions in one generated-person fixture, not a production opening",
          }),
        );
    },
  );
});
