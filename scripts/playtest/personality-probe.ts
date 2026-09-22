/**
 * Does a person's temperament change what they do?
 *
 * Holds one world, one person and one decision fixed, moves a single trait
 * from one pole to the other, and reports which option the decision engine
 * ranks first. Location-agnostic: the generated world is not pinned to a
 * state.
 */
import {
  PEOPLE_TRAITS,
  ensurePeopleTraits,
  personTrait,
  personTraits,
  recordTraitChange,
  traitConsiderations,
  type PeopleTrait,
  type TraitValue,
} from "../../src/simulation/people-traits";
import { TRAIT_SHAPES } from "../../src/simulation/people-trait-definitions";
import { evaluateDecision } from "../../src/simulation/decisions";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import type { EntityId, World } from "../../src/simulation/types";

const life = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "personality-probe",
    startAge: 34,
  }),
).game!;
const player = life.playerPersonId;
const npc = life.world.personOrder.find(
  (id) =>
    id !== player &&
    life.world.history.events.some((event) =>
      event.involvedEntityIds.includes(id),
    ),
)!;

function eventFor(world: World, personId: EntityId) {
  return [...world.history.events]
    .reverse()
    .find((event) => event.involvedEntityIds.includes(personId))!;
}

function withTrait(
  world: World,
  personId: EntityId,
  trait: PeopleTrait,
  value: TraitValue,
): World {
  const seeded = ensurePeopleTraits(world, [personId]);
  if (personTrait(seeded, personId, trait).value === value) return seeded;
  return recordTraitChange(seeded, {
    personId,
    trait,
    value,
    eventId: eventFor(seeded, personId).id,
    reason: "Probe: moved to this pole to see what changes.",
  });
}

/** The exact lean table people-promise.ts uses. */
const PROMISE_LEANS = [
  {
    optionKey: "holds-boundary",
    trait: "reliability" as const,
    pole: "high" as const,
    explanation: "They follow through on things and expect the same.",
  },
  {
    optionKey: "accepts-change",
    trait: "conflict" as const,
    pole: "low" as const,
    explanation: "They would rather accommodate it than argue about it.",
  },
  {
    optionKey: "needs-answer",
    trait: "deliberation" as const,
    pole: "high" as const,
    explanation:
      "They want to know where it stands before agreeing to anything.",
  },
  {
    optionKey: "accepts-change",
    trait: "sociability" as const,
    pole: "high" as const,
    explanation: "They would rather keep the person than the arrangement.",
  },
];

const PROMISE_OPTIONS = [
  { key: "accepts-change", label: "Agree to it", description: "Take it." },
  { key: "needs-answer", label: "Wants an answer", description: "Leave open." },
  { key: "holds-boundary", label: "Keeps it", description: "Rely on it." },
];

function rankPromise(world: World, personId: EntityId, tag: string) {
  const considerations = traitConsiderations(
    world,
    personId,
    `probe:${tag}`,
    PROMISE_LEANS,
  );
  const evaluation = evaluateDecision(world, {
    stableKey: `probe:${tag}:${world.currentDate}`,
    decisionType: "people.promise-renegotiation",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "agreement", entityId: null },
    options: PROMISE_OPTIONS,
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  } as never);
  return evaluation;
}

console.log("=== How many personalities are there ===");
console.log(
  `people-mind-v1 traits: ${PEOPLE_TRAITS.length} (${PEOPLE_TRAITS.join(", ")}), each -2..+2`,
);
console.log(`  distinct combinations: ${5 ** PEOPLE_TRAITS.length}`);
for (const trait of PEOPLE_TRAITS) {
  const shape = TRAIT_SHAPES[trait];
  console.log(
    `  ${trait}: low="${shape.low.key}" (${shape.low.label}) / high="${shape.high.key}" (${shape.high.label})`,
  );
}

console.log("\n=== Does changing one trait change what they do? ===");
for (const trait of PEOPLE_TRAITS) {
  const low = withTrait(life.world, npc, trait, -2);
  const high = withTrait(life.world, npc, trait, 2);
  const lowRank = rankPromise(low, npc, `${trait}-low`);
  const highRank = rankPromise(high, npc, `${trait}-high`);
  const first = (e: {
    chosenOptionKey?: string;
    optionEvaluations?: readonly {
      optionKey: string;
      finalRank: number | null;
    }[];
  }) =>
    e.chosenOptionKey ??
    e.optionEvaluations?.find((o) => o.finalRank === 1)?.optionKey ??
    "(none)";
  console.log(
    `  ${trait}: at ${TRAIT_SHAPES[trait].low.label} -> ${first(lowRank as never)} | at ${TRAIT_SHAPES[trait].high.label} -> ${first(highRank as never)}`,
  );
}

console.log("\n=== The deliberation polarity ===");
for (const value of [-2, 2] as const) {
  const world = withTrait(life.world, npc, "deliberation", value);
  const shown = personTrait(world, npc, "deliberation");
  const evaluation = rankPromise(world, npc, `delib-${value}`) as never as {
    optionEvaluations: readonly {
      optionKey: string;
      finalRank: number | null;
      considerationKeys: readonly string[];
    }[];
  };
  const needsAnswer = evaluation.optionEvaluations.find(
    (o) => o.optionKey === "needs-answer",
  )!;
  console.log(
    `  value ${value}: player-facing label "${shown.label}" -> "wants an answer first" rank ${needsAnswer.finalRank}, considerations ${needsAnswer.considerationKeys.length}`,
  );
}

console.log("\n=== Spread of temperaments across 30 neighbours ===");
const others = life.world.personOrder
  .filter((id) => id !== player)
  .slice(0, 30);
const written = ensurePeopleTraits(life.world, others);
const shapes = new Set(
  others.map((id) =>
    personTraits(written, id)
      .map((t) => t.value)
      .join(","),
  ),
);
console.log(
  `  ${shapes.size} distinct temperaments among ${others.length} people`,
);

console.log("\n=== The study-plan compromise branch ===");
// The exact lean table decideStudyPlanOutcome uses when the answer is
// "compromise", scored through the real engine. Only the proposal lookup that
// precedes it is skipped, so this measures the decision, not the plumbing.
const COMPROMISE_LEANS = [
  {
    optionKey: "agrees",
    trait: "deliberation" as const,
    pole: "low" as const,
    explanation: "A worked-out revision is the kind of thing they take.",
  },
  {
    optionKey: "counterproposes",
    trait: "conflict" as const,
    pole: "high" as const,
    explanation: "They would rather say what still bothers them.",
  },
  {
    optionKey: "agrees",
    trait: "reliability" as const,
    pole: "high" as const,
    explanation: "They would rather have something settled to keep to.",
  },
  {
    optionKey: "unresolved",
    trait: "deliberation" as const,
    pole: "low" as const,
    explanation: "They have not thought about it enough to say yes.",
  },
];
const COMPROMISE_OPTIONS = [
  { key: "agrees", label: "Take it", description: "Accept it." },
  { key: "counterproposes", label: "Part of it", description: "Part." },
  { key: "unresolved", label: "Not yet", description: "Leave it open." },
];

function rankCompromise(world: World, personId: EntityId, tag: string) {
  return evaluateDecision(world, {
    stableKey: `probe-study:${tag}:${world.currentDate}`,
    decisionType: "people.study-plan-answer",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:life", key: "study-plan", entityId: null },
    options: COMPROMISE_OPTIONS,
    constraints: [],
    considerations: traitConsiderations(
      world,
      personId,
      `probe-study:${tag}`,
      COMPROMISE_LEANS,
    ),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  } as never) as never as {
    selectedOptionKey: string | null;
    optionEvaluations: readonly {
      optionKey: string;
      finalRank: number | null;
      considerationKeys: readonly string[];
    }[];
  };
}

for (const value of [-2, 2] as const) {
  const world = withTrait(life.world, npc, "deliberation", value);
  const shown = personTrait(world, npc, "deliberation");
  const evaluation = rankCompromise(world, npc, `delib-${value}`);
  console.log(
    `  value ${value}: label "${shown.label}" -> answers "${evaluation.selectedOptionKey}"`,
  );
  for (const option of evaluation.optionEvaluations) {
    console.log(
      `      ${option.optionKey}: rank ${option.finalRank}, considerations ${option.considerationKeys.length}`,
    );
  }
}
