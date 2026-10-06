import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "./decisions";
import { createMindProvenance, recordGoalState } from "./mind";
import {
  CONNECTION_GOAL_KEY,
  LEARNING_GOAL_KEY,
  LIVELIHOOD_GOAL_DOMAIN,
  LIVELIHOOD_GOAL_KEY,
} from "./people-goal-pursuit-content";
import { ORDINARY_LIFE_GOAL_DOMAIN } from "./people-goal-pursuit";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, MindSourceReference, World } from "./types";
import { recordsByKey, recordsByStringField } from "./history-index";
import {
  householdLocationAt,
  householdMembershipsAt,
  organizationProfileAt,
} from "./life-queries";
import { resourcePositionAt } from "./resource-queries";
import { personName } from "./people";
import { money as moneyAmount } from "./resources";

/** These choices use the existing job, contact and learning pursuit writers. */
export const CREATOR_LIFE_FORKS = [
  {
    key: "work",
    prompt: "Work and money",
    goalKey: LIVELIHOOD_GOAL_KEY,
    domain: LIVELIHOOD_GOAL_DOMAIN,
    objective: "Find paid work",
    options: [
      {
        key: "pursue",
        label: "Look for a new job",
        description: "Pursue openings you qualify for.",
      },
      {
        key: "leave",
        label: "Keep the work I had",
        description: "Let changes in your circumstances lead to your next job.",
      },
    ],
  },
  {
    key: "connection",
    prompt: "Family",
    goalKey: CONNECTION_GOAL_KEY,
    domain: ORDINARY_LIFE_GOAL_DOMAIN,
    objective: "Keep in touch with people",
    options: [
      {
        key: "pursue",
        label: "Make time to reach out",
        description: "Call people you know when you have time.",
      },
      {
        key: "leave",
        label: "Let people come to me",
        description: "Leave room for people to reach out to you.",
      },
    ],
  },
  {
    key: "learning",
    prompt: "Home and town",
    goalKey: LEARNING_GOAL_KEY,
    domain: ORDINARY_LIFE_GOAL_DOMAIN,
    objective: "Learn from people you know",
    options: [
      {
        key: "pursue",
        label: "Ask someone who knew",
        description: "Seek out people who can teach you.",
      },
      {
        key: "leave",
        label: "Learn as life came along",
        description: "Let your work and everyday life bring the lessons.",
      },
    ],
  },
] as const;

export interface CreatorLifeForkChoice {
  readonly forkKey: (typeof CREATOR_LIFE_FORKS)[number]["key"];
  readonly optionKey: "pursue" | "leave";
}

export function creatorLifeForkChoicesValid(
  input: unknown,
): input is readonly CreatorLifeForkChoice[] {
  if (!Array.isArray(input)) return false;
  const seen = new Set<string>();
  return input.every((choice) => {
    if (!choice || typeof choice !== "object" || seen.has(choice.forkKey))
      return false;
    seen.add(choice.forkKey);
    return CREATOR_LIFE_FORKS.some(
      (fork) =>
        fork.key === choice.forkKey &&
        fork.options.some((option) => option.key === choice.optionKey),
    );
  });
}

/** Write the player's choices once, then let ordinary resident decisions honor them. */
export function recordCreatorLifeForks(
  world: World,
  personId: EntityId,
  choices: readonly CreatorLifeForkChoice[],
): World {
  if (!creatorLifeForkChoicesValid(choices))
    throw new Error("Invalid life choices.");
  if (
    world.preStartLife?.personId !== personId &&
    !(world.control.kind === "person" && world.control.personId === personId)
  )
    throw new Error("Life choices belong to the character being created.");
  if (choices.length === 0) return world;
  const moments = projectCreatorLifeForkMoments(world, personId);
  let next = world;
  for (const fork of CREATOR_LIFE_FORKS) {
    const choice = choices.find((entry) => entry.forkKey === fork.key);
    if (!choice) continue;
    const key = `creator-life:${personId}:${fork.key}`;
    if (next.history.events.some((event) => event.stableKey === key)) {
      const recorded = next.history.decisionTraces.find(
        (trace) => trace.context.stableKey === key,
      );
      if (recorded && recorded.selectedOptionKey !== choice.optionKey)
        throw new Error(
          "A recorded life choice cannot be replaced by a different answer.",
        );
      continue;
    }
    const moment = moments.find((entry) => entry.key === fork.key);
    if (!moment)
      throw new Error("A life choice requires its recorded life moment.");
    const selected = moment.options.find(
      (option) => option.key === choice.optionKey,
    )!;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "life.creator-choice",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: next.people[personId]!.homeJurisdictionId,
      involvedEntityIds: [personId],
      participants: [
        { personId, role: "agency:actor", detail: selected.label },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["life.creator-choice", fork.key],
      summary: selected.label,
      context: {
        location: null,
        socialContext: null,
        pressure: moment.prompt,
        choice: selected.label,
        motivation: selected.description,
        immediateReaction: null,
      },
    });
    const sourceRefs: readonly MindSourceReference[] = [
      ...moment.sourceRefs,
      {
        kind: "historical-event" as const,
        eventId: next.history.events.at(-1)!.id,
      },
    ];
    const evaluation = evaluateDecision(next, {
      stableKey: key,
      decisionType: "people.creator-life-fork",
      actorPersonId: personId,
      cutoff: {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      },
      subject: { kind: "context:life", key: fork.key, entityId: null },
      options: moment.options,
      constraints: [],
      considerations: [
        {
          stableKey: `${key}:choice`,
          optionKey: selected.key,
          sourceType: "context:creator-choice",
          direction: "supports",
          importance: "decisive",
          confidence: "high",
          explanation: selected.description,
          sourceRefs,
        },
      ],
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    if (!isSelectedDecision(evaluation))
      throw new Error("The life choice did not resolve.");
    next = recordDurableDecisionTrace(next, evaluation);
    const prior = next.history.goalStates
      .filter(
        (goal) => goal.personId === personId && goal.goalKey === fork.goalKey,
      )
      .at(-1);
    next = recordGoalState(next, {
      stableKey: `${key}:goal`,
      personId,
      goalKey: fork.goalKey,
      recordedAt: next.currentDate,
      objective: fork.objective,
      domain: fork.domain,
      scope: "personal",
      priority: "high",
      status: evaluation.selectedOptionKey === "pursue" ? "active" : "proposed",
      targetEntityId: null,
      deadline: null,
      outcome: null,
      replacesGoalId: null,
      supersedesGoalStateId: prior?.id ?? null,
      provenance: createMindProvenance("player-choice", {
        note: selected.label,
        sourceRefs,
      }),
    });
  }
  return next;
}

export interface CreatorLifeForkMoment {
  readonly key: CreatorLifeForkChoice["forkKey"];
  readonly occurredAt: IsoDate;
  readonly prompt: string;
  readonly sourceRefs: readonly MindSourceReference[];
  readonly options: readonly {
    readonly key: "pursue" | "leave";
    readonly label: string;
    readonly description: string;
  }[];
}

/** Read the actual life; neither projecting a prompt nor opening Creator writes history. */
export function projectCreatorLifeForkMoments(
  world: World,
  personId: EntityId,
): readonly CreatorLifeForkMoment[] {
  const person = world.people[personId];
  if (!person || person.birthDate > world.currentDate) return [];
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const moments: CreatorLifeForkMoment[] = [];
  const work = recordsByStringField(
    world.history.workRelationships,
    "personId",
    personId,
  )
    .filter(
      (row) =>
        row.startedAt <= cutoff.asOfDate &&
        row.sequence < cutoff.historySequenceExclusive,
    )
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .at(-1);
  const employer =
    work?.organizationId &&
    organizationProfileAt(world, work.organizationId, {
      ...cutoff,
      asOfDate: work.startedAt,
    });
  const money = resourcePositionAt(
    world,
    { kind: "person", personId },
    moneyAmount(0, "USD").currency,
    cutoff,
  );
  if (work && employer) {
    const sourceRefs: MindSourceReference[] = [
      {
        kind: "life-history",
        reference: { family: "work-relationship", recordId: work.id },
      },
    ];
    const balance = money
      ? ` Your recorded balance on ${cutoff.asOfDate} was ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(money.liquidBalance.minorUnits / 100)}.`
      : "";
    if (money)
      sourceRefs.push({
        kind: "life-history",
        reference: { family: "resource-position", recordId: money.positionId },
      });
    moments.push({
      key: "work",
      occurredAt: work.startedAt,
      prompt: `On ${work.startedAt}, you started work at ${employer.name}.${balance}`,
      sourceRefs,
      options: [
        {
          key: "pursue",
          label: "Explore other work",
          description: "Look for an opening you qualify for.",
        },
        {
          key: "leave",
          label: `Stay with ${employer.name}`,
          description: "Keep this work while circumstances permit.",
        },
      ],
    });
  }
  if (!work) {
    const school = recordsByStringField(
      world.history.educationEnrollments,
      "personId",
      personId,
    )
      .filter(
        (row) =>
          row.startedAt <= cutoff.asOfDate &&
          row.sequence < cutoff.historySequenceExclusive,
      )
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .at(-1);
    const schoolProfile =
      school &&
      organizationProfileAt(world, school.organizationId, {
        ...cutoff,
        asOfDate: school.startedAt,
      });
    if (school && schoolProfile)
      moments.push({
        key: "work",
        occurredAt: school.startedAt,
        prompt: `On ${school.startedAt}, you began school at ${schoolProfile.name}.`,
        sourceRefs: [
          {
            kind: "life-history",
            reference: { family: "education-enrollment", recordId: school.id },
          },
        ],
        options: [
          {
            key: "pursue",
            label: "Explore work when eligible",
            description:
              "Explore work alongside school when the law and your circumstances allow.",
          },
          {
            key: "leave",
            label: "Focus on school",
            description: "Keep your attention on your schooling.",
          },
        ],
      });
  }
  const familyMoment = recordsByKey(
    world.history.events,
    "creator-life-events-by-person",
    (event) => event.involvedEntityIds,
    personId,
  )
    .filter(
      (event) =>
        event.type === "life.family-time" &&
        event.occurredAt <= cutoff.asOfDate &&
        event.sequence < cutoff.historySequenceExclusive,
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .at(-1);
  const parent = recordsByKey(
    world.history.kinshipRelationships,
    "creator-life-kinship-by-person",
    (row) => row.personIds,
    personId,
  ).find(
    (row) =>
      row.kind === "lineal:parent-child" &&
      row.establishedAt <= cutoff.asOfDate &&
      row.sequence < cutoff.historySequenceExclusive,
  );
  if (familyMoment) {
    moments.push({
      key: "connection",
      occurredAt: familyMoment.occurredAt,
      prompt: `On ${familyMoment.occurredAt}: ${familyMoment.summary}`,
      sourceRefs: [{ kind: "historical-event", eventId: familyMoment.id }],
      options: [
        {
          key: "pursue",
          label: "Make time for family",
          description: "Reach out to the people in your life.",
        },
        {
          key: "leave",
          label: "Leave room for them to reach out",
          description: "Keep your time open for people who contact you.",
        },
      ],
    });
  } else if (parent) {
    const relativeId = parent.personIds.find((id) => id !== personId);
    const relative = relativeId && world.people[relativeId];
    if (relative)
      moments.push({
        key: "connection",
        occurredAt: parent.establishedAt,
        prompt: `Your family record with ${personName(relative)} began on ${parent.establishedAt}.`,
        sourceRefs: [
          {
            kind: "life-history",
            reference: { family: "kinship", recordId: parent.id },
          },
        ],
        options: [
          {
            key: "pursue",
            label: "Make time for family",
            description: "Reach out to the people in your life.",
          },
          {
            key: "leave",
            label: "Leave room for them to reach out",
            description: "Keep your time open for people who contact you.",
          },
        ],
      });
  }
  const home = householdMembershipsAt(world, personId, cutoff).find(
    (row) => row.state.residenceRole === "primary" && row.location,
  );
  const homeAtJoin =
    home &&
    householdLocationAt(world, home.household.id, {
      ...cutoff,
      asOfDate: home.membership.startedAt,
    });
  if (home && homeAtJoin) {
    moments.push({
      key: "learning",
      occurredAt: home.membership.startedAt,
      prompt: `On ${home.membership.startedAt}, you joined ${home.household.label} in ${homeAtJoin.label}.`,
      sourceRefs: [
        {
          kind: "life-history",
          reference: {
            family: "household-membership",
            recordId: home.membership.id,
          },
        },
      ],
      options: [
        {
          key: "pursue",
          label: "Ask the people around me",
          description: "Learn from people you actually know.",
        },
        {
          key: "leave",
          label: "Watch and listen",
          description: "Let daily life bring its lessons.",
        },
      ],
    });
  }
  return moments;
}
