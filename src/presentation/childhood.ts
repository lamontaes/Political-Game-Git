import { ageOnDate, personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  availableLifeSituations,
  formativeIntervalAt,
} from "../simulation/character-history";
import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../simulation/decisions";
import { activeChildAuthoritiesAt } from "../simulation/life-queries";
import { stableHash } from "../simulation/ids";
import {
  ensurePeopleTraits,
  traitConsiderations,
} from "../simulation/people-traits";
import type { PeopleTrait } from "../simulation/people-trait-definitions";
import { recordFormativePlayerTraitChoice } from "../simulation/people-player-traits";
import type { DecisionConsideration } from "../simulation/types";
import { chooseFormativeOption, projectFormativeYears } from "./formative-play";
import { goalConsiderations } from "../simulation/people-goal-pursuit";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  PRIVACY_GOAL_KEY,
} from "../simulation/people-goal-pursuit-content";
import type { FormativeScene, FormativeYears } from "./formative-play";

/**
 * Being a child, and slowly being allowed to decide things (CRUNCH47 B1, P14).
 *
 * The formative bank already knows that the early years are caregiver-led, the
 * middle years shared and adolescence substantially the young person's own.
 * Until now every band was played the same way, with the player picking for a
 * five-year-old as freely as for a seventeen-year-old. This layer makes the
 * difference real:
 *
 * - Early childhood happens to the child. The adult responsible decides, from
 *   their own temperament and what the situation is, and the child is left with
 *   the memory of it. The player watches and reads.
 * - The middle years are shared. The player chooses, and what the adult would
 *   have said is shown alongside, because a child that age is being steered.
 * - Adolescence is theirs. The player chooses, with nobody's thumb on it.
 *
 * Nothing is skipped and nothing is invented: the same authored situations,
 * the same resolution, the same memories. What changes is who the choice
 * belongs to.
 */

export type ChildhoodAgency =
  "caregiver-led" | "shared" | "substantially-player-directed";

export interface ChildhoodMoment {
  readonly personName: string;
  readonly age: number;
  readonly agency: ChildhoodAgency;
  /** Who decides, when it is not the child. */
  readonly caregiverPersonId: EntityId | null;
  readonly caregiverName: string | null;
  readonly scene: FormativeScene | null;
  /** What the player is invited to do with this moment. */
  readonly action: "watch" | "choose";
  readonly actionLabel: string;
  /** Said plainly, so nobody wonders why there are no choices. */
  readonly note: string | null;
  readonly years: FormativeYears;
}

/** The adult with recorded authority for this child, if there is one. */
export function caregiverFor(
  world: World,
  personId: EntityId,
): EntityId | null {
  for (const authority of activeChildAuthoritiesAt(world, personId)) {
    const holder = authority.authority.holder;
    if (holder.kind !== "person" || holder.personId === personId) continue;
    const person = world.people[holder.personId];
    if (!person) continue;
    if (ageOnDate(person.birthDate, world.currentDate) < 18) continue;
    return holder.personId;
  }
  return null;
}

export function projectChildhoodMoment(
  world: World,
  personId: EntityId,
): ChildhoodMoment | null {
  const interval = formativeIntervalAt(world, personId);
  if (!interval) return null;
  const years = projectFormativeYears(world, personId);
  const caregiverId = caregiverFor(world, personId);
  const caregiver = caregiverId ? world.people[caregiverId] : undefined;
  const caregiverName = caregiver ? personName(caregiver) : null;
  // Without a recorded adult there is nobody to decide for them, so the years
  // are their own by default rather than frozen.
  const agency: ChildhoodAgency =
    interval.agency === "caregiver-led" && !caregiverId
      ? "shared"
      : interval.agency;
  const playerIsCaregiver =
    world.control.kind === "person" && caregiverId === world.control.personId;
  const watching = agency === "caregiver-led" && !playerIsCaregiver;
  const steering = agency === "shared" && playerIsCaregiver;
  return {
    personName: years.personName,
    age: years.age,
    agency,
    caregiverPersonId: caregiverId,
    caregiverName,
    scene: years.scene,
    action: watching ? "watch" : "choose",
    actionLabel: watching ? "See what happened" : steering ? "Guide" : "Choose",
    note: watching
      ? `${years.personName} is ${years.age}. ${caregiverName ?? "The adult at home"} decides these things; what stays is what ${years.personName} remembers of them.`
      : agency === "caregiver-led" && playerIsCaregiver
        ? `You are raising ${years.personName}. Choose how you respond to this moment.`
        : steering
          ? `${years.personName} is old enough to make the choice. Tell them what you think; they will decide.`
          : agency === "shared"
            ? `${years.personName} is ${years.age}, old enough to be asked and young enough to be steered.`
            : null,
    years,
  };
}

/**
 * Plays the moment the way this age is played: the caregiver's decision for a
 * small child, the young person's own for anybody older.
 */
export function playChildhoodMoment(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly optionKey?: string;
  },
): World {
  const moment = projectChildhoodMoment(world, input.personId);
  if (!moment?.scene) {
    throw new Error("There is nothing to play in these years right now.");
  }
  const scene = moment.scene;
  if (world.preStartLife?.personId === input.personId && !input.optionKey) {
    const decided = childhoodChoice(
      world,
      input.personId,
      moment.agency === "caregiver-led"
        ? moment
        : { ...moment, caregiverPersonId: input.personId },
      scene,
      true,
    );
    if (!decided.optionKey) return decided.world;
    return chooseFormativeOption(decided.world, {
      personId: input.personId,
      situationKey: scene.situationKey,
      optionKey: decided.optionKey,
      withPersonId: scene.withPersonId,
    });
  }
  if (moment.action === "choose") {
    if (!input.optionKey) {
      throw new Error("This age chooses for themselves; name the choice.");
    }
    if (
      world.control.kind === "person" &&
      moment.agency === "shared" &&
      moment.caregiverPersonId === world.control.personId
    ) {
      return playSharedCaregiverMoment(
        world,
        input.personId,
        moment,
        scene,
        input.optionKey,
      );
    }
    const chosen = chooseFormativeOption(world, {
      personId: input.personId,
      ...(world.control.kind === "person" &&
      moment.agency === "caregiver-led" &&
      moment.caregiverPersonId === world.control.personId
        ? {
            choiceMakerPersonId: moment.caregiverPersonId,
            mode: "parent-played" as const,
          }
        : {}),
      ...(world.control.kind === "person" &&
      moment.agency === "caregiver-led" &&
      moment.caregiverPersonId === world.control.personId
        ? {
            caregiverChoice: {
              caregiverPersonId: moment.caregiverPersonId,
              decisionMaker: "caregiver" as const,
            },
          }
        : {}),
      situationKey: scene.situationKey,
      optionKey: input.optionKey,
      withPersonId: scene.withPersonId,
    });
    if (
      world.control.kind === "person" &&
      moment.agency === "caregiver-led" &&
      moment.caregiverPersonId === world.control.personId
    ) {
      return chosen;
    }
    return recordFormativePlayerTraitChoice(world, chosen, {
      personId: input.personId,
      situationKey: scene.situationKey,
      optionKey: input.optionKey,
      choiceLabel:
        scene.options.find((option) => option.key === input.optionKey)?.label ??
        input.optionKey,
    });
  }
  if (input.optionKey) {
    throw new Error(
      "At this age the adult responsible decides; the player watches.",
    );
  }
  const choice = childhoodChoice(world, input.personId, moment, scene, true);
  if (choice.optionKey === null) return choice.world;
  const resolved = chooseFormativeOption(choice.world, {
    personId: input.personId,
    choiceMakerPersonId: moment.caregiverPersonId!,
    mode: "quick-generated",
    caregiverChoice: {
      caregiverPersonId: moment.caregiverPersonId!,
      decisionMaker: "caregiver",
    },
    situationKey: scene.situationKey,
    optionKey: choice.optionKey,
    withPersonId: scene.withPersonId,
  });
  return resolved;
}

function playSharedCaregiverMoment(
  world: World,
  childPersonId: EntityId,
  moment: ChildhoodMoment,
  scene: FormativeScene,
  steerOptionKey: string,
): World {
  const caregiverPersonId = moment.caregiverPersonId!;
  const steer = scene.options.find((option) => option.key === steerOptionKey);
  if (!steer) throw new Error("Choose one of the ways to guide them.");
  const withTraits = ensurePeopleTraits(world, [childPersonId]);
  const options = scene.options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
  }));
  const stableKey = `childhood:shared:${childPersonId}:${scene.situationKey}:${world.currentDate}`;
  const considerations: DecisionConsideration[] = [
    ...traitConsiderations(
      withTraits,
      childPersonId,
      stableKey,
      options.flatMap((option) =>
        (OPTION_LEANS[option.key] ?? []).map((lean) => ({
          optionKey: option.key,
          trait: lean.trait,
          pole: lean.pole,
          explanation: lean.explanation,
        })),
      ),
    ),
    {
      stableKey: `${stableKey}:parent-steer`,
      optionKey: steerOptionKey,
      sourceType: "context:life",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: `Their parent encouraged them to ${steer.label.toLowerCase()}.`,
      sourceRefs: [],
    },
  ];
  let evaluation = evaluateDecision(withTraits, {
    stableKey,
    decisionType: "people.shared-caregiver-choice",
    actorPersonId: childPersonId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: scene.situationKey, entityId: null },
    options,
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  if (!isSelectedDecision(evaluation)) {
    const fallback = deterministicChoice(world, childPersonId, scene, options);
    evaluation = evaluateDecision(withTraits, {
      stableKey,
      decisionType: "people.shared-caregiver-choice",
      actorPersonId: childPersonId,
      cutoff: {
        asOfDate: withTraits.currentDate,
        historySequenceExclusive: withTraits.history.nextSequence,
      },
      subject: {
        kind: "context:life",
        key: scene.situationKey,
        entityId: null,
      },
      options,
      constraints: [],
      considerations: [
        ...considerations,
        fallbackConsideration(stableKey, fallback),
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
  }
  const withTrace = recordDurableDecisionTrace(withTraits, evaluation);
  if (!isSelectedDecision(evaluation)) return withTrace;
  const selectedOptionKey = evaluation.selectedOptionKey;
  const resolved = chooseFormativeOption(withTrace, {
    personId: childPersonId,
    mode: "quick-generated",
    caregiverChoice: {
      caregiverPersonId,
      decisionMaker: "child",
      steerOptionKey,
    },
    situationKey: scene.situationKey,
    optionKey: selectedOptionKey,
    withPersonId: scene.withPersonId,
  });
  return resolved;
}

/**
 * What each choice actually is, so a temperament can bear on its meaning.
 *
 * The first defect this replaces was reading the option list by position, as
 * if the first choice were always the forthright one and the last always the
 * cautious one (Q47-004). Nothing guarantees that, so a caregiver's
 * temperament was being applied to whichever option happened to be written
 * first. Now an option only attracts a leaning when the bank's own key says
 * what it is, and a key nobody has classified simply attracts none — which
 * leaves the decision to the rest of the situation rather than to the order.
 */
const OPTION_LEANS: Readonly<
  Record<
    string,
    readonly {
      readonly trait: PeopleTrait;
      readonly pole: "low" | "high";
      readonly explanation: string;
    }[]
  >
> = {
  // Meeting it directly.
  "say-what-happened": [
    {
      trait: "conflict",
      pole: "high",
      explanation: "They would rather have it said out loud.",
    },
    {
      trait: "reliability",
      pole: "high",
      explanation: "They see things through.",
    },
  ],
  "join-in": [
    {
      trait: "sociability",
      pole: "high",
      explanation: "They push a child towards other children.",
    },
  ],
  "make-yourself-useful": [
    {
      trait: "reliability",
      pole: "high",
      explanation: "They believe in pulling your weight.",
    },
  ],
  share: [
    {
      trait: "sociability",
      pole: "high",
      explanation: "They would rather it were shared.",
    },
  ],
  "settle-in": [
    {
      trait: "sociability",
      pole: "high",
      explanation: "They want the child settled among people.",
    },
  ],
  // Holding back.
  "stay-quiet": [
    {
      trait: "conflict",
      pole: "low",
      explanation: "They would rather let it settle by itself.",
    },
  ],
  "hang-back": [
    {
      trait: "sociability",
      pole: "low",
      explanation: "They see no need to push a child forward.",
    },
  ],
  "keep-your-corner": [
    {
      trait: "sociability",
      pole: "low",
      explanation: "They think a child should be left their own space.",
    },
  ],
  "put-it-away": [
    {
      trait: "risk",
      pole: "low",
      explanation: "They would rather it were kept than spent.",
    },
  ],
  spend: [
    {
      trait: "risk",
      pole: "high",
      explanation: "They see no harm in spending it now.",
    },
  ],
};

/**
 * What the adult responsible decides, from who they are.
 *
 * The same decision machinery every other NPC uses. A caregiver who avoids a
 * scene and one who meets it head-on do not make the same call, and the child
 * grows up with the memory of whichever it was.
 */
export function caregiverChoice(
  world: World,
  personId: EntityId,
  moment: ChildhoodMoment,
  scene: FormativeScene,
): string | null {
  return childhoodChoice(world, personId, moment, scene, false).optionKey;
}

function childhoodChoice(
  world: World,
  personId: EntityId,
  moment: ChildhoodMoment,
  scene: FormativeScene,
  durable: boolean,
): { readonly world: World; readonly optionKey: string | null } {
  const caregiverId = moment.caregiverPersonId;
  const options = scene.options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
  }));
  if (options.length === 0) throw new Error("That situation offers nothing.");
  if (!caregiverId || options.length === 1)
    return { world, optionKey: options[0]!.key };
  const withTraits = ensurePeopleTraits(world, [caregiverId]);
  const stableKey = `childhood:${personId}:${scene.situationKey}:${withTraits.currentDate}`;
  const considerations: readonly DecisionConsideration[] = [
    ...traitConsiderations(
      withTraits,
      caregiverId,
      `childhood:${personId}:${scene.situationKey}`,
      options.flatMap((option) =>
        (OPTION_LEANS[option.key] ?? []).map((lean) => ({
          optionKey: option.key,
          trait: lean.trait,
          pole: lean.pole,
          explanation: lean.explanation,
        })),
      ),
    ),
    ...goalConsiderations(
      withTraits,
      caregiverId,
      `childhood:${personId}:${scene.situationKey}`,
      options.flatMap((option) =>
        (OPTION_LEANS[option.key] ?? []).flatMap((lean) => {
          const goalKey =
            lean.trait === "sociability"
              ? lean.pole === "high"
                ? CONNECTION_GOAL_KEY
                : PRIVACY_GOAL_KEY
              : lean.trait === "reliability" && lean.pole === "high"
                ? LEARNING_GOAL_KEY
                : null;
          return goalKey
            ? [
                {
                  optionKey: option.key,
                  goalKey,
                  direction: "supports" as const,
                  explanation: lean.explanation,
                },
              ]
            : [];
        }),
      ),
    ),
    ...goalConsiderations(
      withTraits,
      caregiverId,
      `childhood:${personId}:${scene.situationKey}:school`,
      scene.situationKey === "formative.school-entry"
        ? options
            .filter((option) => option.key === "join-in")
            .map((option) => ({
              optionKey: option.key,
              goalKey: LEARNING_GOAL_KEY,
              direction: "supports" as const,
              explanation:
                "Taking part in school serves their recorded aim to learn.",
            }))
        : [],
    ),
  ];
  const evaluate = (reasons: readonly DecisionConsideration[]) =>
    evaluateDecision(withTraits, {
      stableKey,
      decisionType: "people.caregiver-choice",
      actorPersonId: caregiverId,
      cutoff: {
        asOfDate: withTraits.currentDate,
        historySequenceExclusive: withTraits.history.nextSequence,
      },
      subject: {
        kind: "context:life",
        key: scene.situationKey,
        entityId: null,
      },
      options,
      constraints: [],
      considerations: reasons,
      perceptionIds: [],
      randomness: "none",
      retention: durable ? "durable" : "ephemeral",
    });
  let evaluation = evaluate(considerations);
  if (!isSelectedDecision(evaluation)) {
    const fallback = deterministicChoice(world, personId, scene, options);
    evaluation = evaluate([
      ...considerations,
      fallbackConsideration(stableKey, fallback),
    ]);
  }
  return {
    world: durable
      ? recordDurableDecisionTrace(withTraits, evaluation)
      : withTraits,
    optionKey: isSelectedDecision(evaluation)
      ? evaluation.selectedOptionKey
      : null,
  };
}

function deterministicChoice(
  world: World,
  actorPersonId: EntityId,
  scene: FormativeScene,
  options: readonly { readonly key: string }[],
): string {
  return options.slice().sort((left, right) => {
    const leftHash = stableHash(
      `${world.seed}\nchildhood-choice:${actorPersonId}:${scene.situationKey}:${left.key}`,
    );
    const rightHash = stableHash(
      `${world.seed}\nchildhood-choice:${actorPersonId}:${scene.situationKey}:${right.key}`,
    );
    return (
      leftHash.localeCompare(rightHash) || left.key.localeCompare(right.key)
    );
  })[0]!.key;
}

function fallbackConsideration(
  stableKey: string,
  optionKey: string,
): DecisionConsideration {
  return {
    stableKey: `${stableKey}:deterministic-tie-break`,
    optionKey,
    sourceType: "context:life",
    direction: "supports",
    importance: "slight",
    confidence: "low",
    explanation:
      "When their reasons did not settle it, they chose this way forward.",
    sourceRefs: [],
  };
}

/** Whether this person is young enough that the years are still forming. */
export function inChildhood(world: World, personId: EntityId): boolean {
  return formativeIntervalAt(world, personId) !== null;
}

/** Situations this child could be offered at all, for a developer surface. */
export function childhoodSituationKeys(
  world: World,
  personId: EntityId,
): readonly string[] {
  return availableLifeSituations(world, {
    personId,
    asOfDate: world.currentDate,
    otherPersonId: personId,
  }).map((situation) => situation.key);
}
