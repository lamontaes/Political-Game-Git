import { createMindProvenance, recordPersonalityTendency } from "./mind";
import {
  PEOPLE_MIND_VERSION,
  peopleTraitId,
  TRAIT_SHAPES,
  BALANCED_TRAIT,
  PEOPLE_TRAITS,
  type PeopleTrait,
  type TraitValue,
} from "./people-trait-definitions";
import { ensurePeopleTraitCatalog, personTrait } from "./people-traits";
import { latestPersonalityTendency } from "./queries";
import { appendChildhoodEntry } from "./childhood-record";
import type { EntityId, World } from "./types";

/**
 * The played character's own temperament, written from their own choices.
 *
 * The owner: "obviously you as a character need your own. it's how you are
 * portayed to people. ignore it and say so. that shouldnt hold the game back."
 *
 * Both halves are built here. The game never authors who the player is — the
 * seeding path skips the controlled person on purpose, and the mind store
 * refuses any record for them whose provenance is not `player-choice`, which is
 * a guard worth keeping rather than a bug to route around. What was missing was
 * the path the guard was always waiting for: a write that carries the player's
 * own choice. And a player who never uses it is a player who has not said, which
 * this reports plainly and which holds nothing back — everybody who deals with
 * them simply has nothing recorded to go on, exactly as for anybody else the
 * world has not observed.
 */

/** A trait the player has said is theirs, and the choice that said so. */
export interface PlayerTraitChoiceInput {
  readonly personId: EntityId;
  readonly trait: PeopleTrait;
  readonly value: TraitValue;
  /** The player's choice, in their own terms, for the record's note. */
  readonly choice: string;
  /** Distinguishes one choice from another, so a save writes it once. */
  readonly stableKey: string;
}

function encode(trait: PeopleTrait, value: TraitValue) {
  const shape = TRAIT_SHAPES[trait];
  if (value === 0) {
    return { expressionKey: BALANCED_TRAIT.key, strength: "subtle" as const };
  }
  return {
    expressionKey: value < 0 ? shape.low.key : shape.high.key,
    strength:
      Math.abs(value) === 2 ? ("strong" as const) : ("moderate" as const),
  };
}

/**
 * Records one of the played character's traits, from something they chose.
 *
 * Refuses anybody but the controlled person: this is the player saying who
 * they are, and saying it on somebody else's behalf is the thing the guard
 * exists to prevent.
 */
export function recordPlayerTraitChoice(
  world: World,
  input: PlayerTraitChoiceInput,
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  ) {
    throw new Error(
      "Only the controlled person's own choices set their temperament.",
    );
  }
  if (!input.choice.trim()) {
    throw new Error("A player trait choice needs the choice that made it.");
  }
  let next = ensurePeopleTraitCatalog(world);
  const current = personTrait(next, input.personId, input.trait);
  const supersedes =
    latestPersonalityTendency(next, input.personId, peopleTraitId(input.trait))
      ?.id ?? null;
  if (supersedes !== null && current.value === input.value) return next;
  next = recordPersonalityTendency(next, {
    stableKey: `${PEOPLE_MIND_VERSION}:${input.personId}:${input.trait}:chose:${input.stableKey}`,
    personId: input.personId,
    tendencyId: peopleTraitId(input.trait),
    recordedAt: next.currentDate,
    ...encode(input.trait, input.value),
    confidence: "medium",
    scopeTags: [`${PEOPLE_MIND_VERSION}.player-choice`],
    provenance: createMindProvenance("player-choice", {
      note: input.choice,
    }),
    supersedesTendencyId: supersedes,
  });
  return next;
}

/**
 * A formative choice says something about temperament only where its own
 * meaning does. A key includes its situation so a similarly named option in
 * another situation cannot silently inherit the same interpretation. It never
 * depends on the option's position among the choices the player saw.
 */
const FORMATIVE_CHOICE_TRAITS: Readonly<
  Record<string, { readonly trait: PeopleTrait; readonly value: TraitValue }>
> = {
  "formative.school-entry:join-in": { trait: "sociability", value: 1 },
  "formative.school-entry:hang-back": { trait: "sociability", value: -1 },
  "formative.small-money:spend": { trait: "deliberation", value: 1 },
  "formative.small-money:put-it-away": { trait: "deliberation", value: -1 },
  "formative.lunch-table:make-room": { trait: "sociability", value: 1 },
  "formative.lunch-table:look-away": { trait: "sociability", value: -1 },
  "formative.lunch-table:go-with-them": { trait: "sociability", value: 1 },
  "formative.friend-conflict:repair": { trait: "conflict", value: -1 },
  "formative.friend-conflict:ask-someone": { trait: "deliberation", value: -1 },
  "formative.school-rule-input:speak-up": { trait: "conflict", value: 1 },
  "formative.school-rule-input:write-it-down": {
    trait: "deliberation",
    value: -1,
  },
  "formative.care-conflict:keep-the-commitment": {
    trait: "reliability",
    value: 1,
  },
  "formative.care-conflict:do-both-badly": {
    trait: "reliability",
    value: -1,
  },
  "formative.money-shortfall:ask-what-happened": {
    trait: "deliberation",
    value: -1,
  },
  "formative.civic-volunteering:observe": {
    trait: "deliberation",
    value: -1,
  },
  "formative.student-organizing:help-organize": {
    trait: "conflict",
    value: 1,
  },
  "formative.belief-challenge:say-you-disagree": {
    trait: "conflict",
    value: 1,
  },
  "formative.belief-challenge:let-it-pass": {
    trait: "conflict",
    value: -1,
  },
  // Read the same way as the choice evidence in life-choice-evidence.ts:
  // preparing leans toward security, keeping options open toward risk.
  "formative.future-preparation:prepare": { trait: "risk", value: -1 },
  "formative.future-preparation:keep-options-open": { trait: "risk", value: 1 },
  "formative.future-preparation:ask-someone-who-knows": {
    trait: "deliberation",
    value: -1,
  },
  "formative.caring-for-someone:take-it-on": {
    trait: "reliability",
    value: 1,
  },
  "formative.caring-for-someone:hold-the-line": {
    trait: "deliberation",
    value: -1,
  },
  "formative.workplace-rule:say-nobody-does": {
    trait: "conflict",
    value: 1,
  },
  "formative.workplace-rule:say-it-after": {
    trait: "deliberation",
    value: -1,
  },
};

/** Records a played formative choice only after its canonical event exists. */
export function recordFormativePlayerTraitChoice(
  before: World,
  after: World,
  input: {
    readonly personId: EntityId;
    readonly situationKey: string;
    readonly optionKey: string;
    readonly choiceLabel: string;
    /** Undefined means this formative choice did not concern faith. */
    readonly faithChoice?: EntityId | null;
  },
): World {
  const trait =
    FORMATIVE_CHOICE_TRAITS[`${input.situationKey}:${input.optionKey}`];
  if (
    after.control.kind !== "person" ||
    after.control.personId !== input.personId
  )
    return after;
  const choiceEvent = after.history.events
    .slice(before.history.events.length)
    .find(
      (event) =>
        event.participants.some(
          (participant) =>
            participant.personId === input.personId &&
            participant.role === "agency:actor",
        ) &&
        event.tags.includes(input.situationKey) &&
        event.tags.includes(`choice.${input.optionKey}`),
    );
  if (!choiceEvent) return after;
  let next = after;
  if (trait)
    next = recordPlayerTraitChoice(next, {
      personId: input.personId,
      ...trait,
      choice: input.choiceLabel,
      stableKey: choiceEvent.id,
    });
  if (input.faithChoice !== undefined)
    next = appendChildhoodEntry(next, {
      kind: "faith-choice",
      stableKey: `faith-choice:${choiceEvent.id}`,
      personId: input.personId,
      effectiveAt: choiceEvent.occurredAt,
      sourceRecordId: choiceEvent.id,
      congregationId: input.faithChoice,
      situationKey: input.situationKey,
      optionKey: input.optionKey,
    });
  return next;
}

/**
 * What the played character has said about themselves, and what they have not.
 *
 * `said` is the traits they have chosen; `unsaid` is the rest. The second is
 * the answer to "ignore it and say so": a screen showing a player their own
 * temperament says which parts they have never decided, rather than showing a
 * seeded value they never picked or an implied middle they never chose.
 */
export interface PlayerTemperament {
  readonly said: readonly {
    readonly trait: PeopleTrait;
    readonly value: TraitValue;
    readonly label: string | null;
  }[];
  readonly unsaid: readonly PeopleTrait[];
}

export function playerTemperament(
  world: World,
  personId: EntityId,
): PlayerTemperament {
  const said: {
    trait: PeopleTrait;
    value: TraitValue;
    label: string | null;
  }[] = [];
  const unsaid: PeopleTrait[] = [];
  for (const trait of PEOPLE_TRAITS) {
    const current = personTrait(world, personId, trait);
    if (current.recordId === null) {
      unsaid.push(trait);
      continue;
    }
    said.push({ trait, value: current.value, label: current.label });
  }
  return { said, unsaid };
}
