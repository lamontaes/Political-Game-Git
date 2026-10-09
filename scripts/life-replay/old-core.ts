import { createStableId } from "../../src/simulation/ids";
import { ageOnDate, makeIsoDate } from "../../src/simulation/dates";
import {
  createWorld,
  advanceWorld,
  recordWorldEvent,
} from "../../src/simulation/world";
import {
  availableLifeSituations,
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
  resolveLifeSituation,
} from "../../src/simulation/character-history";
import type { ResolveLifeSituationInput } from "../../src/simulation/character-history";
import type {
  EntityId,
  EventType,
  Jurisdiction,
  World,
} from "../../src/simulation/types";
import type {
  AdvanceReceipt,
  CoreDecision,
  CoreObservation,
  CorePastFact,
  CoreReceipt,
  CoreSetup,
  Gap,
  ReplayCore,
  WorldInput,
} from "./contract";
import { daysBetween } from "./runner";
import { ONE, REPLAY_API_VERSION, ZERO } from "./parameters";

function gap(code: string, detail: string, evidence: string[]): Gap {
  return { code, detail, evidence };
}

/** A source-only diagnostic world; never a generated-world population proof.
 * Canonical old-core writers and the ordinary clock run unchanged. Missing
 * public inputs or action bindings stay gaps rather than fabricated states.
 */
export function createReplayCore(revision = "unreported"): ReplayCore {
  let world: World;
  let actorId: EntityId;
  let birthplaceId: EntityId;
  let generation = ZERO;
  const observations: CoreObservation[] = [];

  function requireWorld(): World {
    if (!world) throw new Error("Initialize the old-core adapter first");
    return world;
  }

  /** Record-only probes are discarded forks, never inserted live outcomes. */
  function record(
    source: World,
    key: string,
    mechanism: string,
    occurredAt: string,
    involved: EntityId[],
  ): World {
    return recordWorldEvent(source, {
      stableKey: key,
      type: `replay.${mechanism}` as EventType,
      occurredAt: makeIsoDate(occurredAt),
      recordedAt: source.currentDate,
      jurisdictionId: birthplaceId,
      involvedEntityIds: involved,
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: [mechanism],
      summary: mechanism,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }

  function contextReceipt(
    code: string,
    detail: string,
    ids: string[],
  ): CoreReceipt {
    return {
      observations: [],
      recordIds: ids,
      gaps: [
        gap(code, detail, [
          "src/simulation/world.ts:1005",
          "scripts/life-replay/old-core.ts",
        ]),
      ],
    };
  }

  const core: ReplayCore = {
    metadata: {
      apiVersion: REPLAY_API_VERSION,
      id: "old-core/source-only-v1",
      revision,
      execution: "continuous",
    },
    initialize(setup: CoreSetup): CoreReceipt {
      generation = ZERO;
      observations.length = ZERO;
      const place = setup.subject.birthPlace;
      birthplaceId = createStableId(
        "jurisdiction",
        `replay-source:${place.key}`,
      );
      const jurisdiction: Jurisdiction = {
        id: birthplaceId,
        slug: place.key,
        name: place.name,
        kind: "source-locality",
        parentName: place.stateCode,
        provenance: {
          asOf: makeIsoDate(setup.subject.birthDate),
          source: setup.birthSources.map((source) => source.url).join(" "),
          jurisdiction: birthplaceId,
          status: "candidate",
        },
      };
      world = createWorld({
        seed: setup.seed,
        currentDate: makeIsoDate(setup.startDate),
        lineage: "production",
        jurisdictions: [jurisdiction],
        people: [],
      });
      const names = setup.subject.name.trim().split(/\s+/);
      const familyName = names.pop();
      if (!familyName || names.length === ZERO)
        throw new Error("Subject needs a given and family name");
      world = createCharacterHistoryContextPerson(world, {
        stableKey: "replay-subject",
        givenName: names.join(" "),
        familyName,
        birthDate: makeIsoDate(setup.subject.birthDate),
        homeJurisdictionId: birthplaceId,
        birthplaceJurisdictionId: birthplaceId,
      });
      actorId = characterHistoryContextPersonId(world, "replay-subject");
      observations.push({
        metric: "birth.date",
        value: setup.subject.birthDate,
        date: setup.startDate,
        origin: "initialized",
        recordIds: [actorId],
      });
      const pastIds: string[] = [];
      for (const fact of setup.past) {
        generation += ONE;
        world = record(
          world,
          `past:${generation}`,
          fact.mechanism,
          fact.date.latest,
          [actorId],
        );
        pastIds.push(world.history.events.at(-ONE)!.id);
      }
      return {
        observations: [...observations],
        recordIds: [actorId, birthplaceId, ...pastIds],
        gaps: [
          gap(
            "source-only-world",
            "The old-core diagnostic initializes one sourced subject and birthplace. Family, employers, offices, and an electorate were not fabricated. This run cannot establish nationwide political behavior.",
            ["scripts/life-replay/old-core.ts", "src/simulation/world.ts:448"],
          ),
          gap(
            "public-background-incomplete",
            "The checked life sources do not supply all family birth dates, dated pay, wealth, and traits needed for a fully specified old-core household. Public work and faith descriptions remain reference data.",
            [
              "src/simulation/character-history.ts:175",
              "scripts/life-replay/old-core.ts",
            ],
          ),
          gap(
            "native-clock-not-interruptible",
            "God mode can select available native life-situation choices. This adapter cannot pause the old clock before an internal scheduled decision; undocumented activity follows the unchanged clock.",
            ["scripts/life-replay/old-core.ts", "src/simulation/world.ts"],
          ),
          ...(setup.past.length > ZERO
            ? [
                gap(
                  "checkpoint-context-only",
                  "Past events were stored as sourced context rows. Jobs, education, residence changes, and offices in the checkpoint were not initialized as active state.",
                  [
                    "src/simulation/world.ts:1005",
                    "scripts/life-replay/old-core.ts",
                  ],
                ),
              ]
            : []),
        ],
      };
    },
    input(input: WorldInput): CoreReceipt {
      requireWorld();
      generation += ONE;
      world = record(
        world,
        `input:${generation}`,
        input.kind,
        world.currentDate,
        [world.id],
      );
      return contextReceipt(
        "era-context-only",
        `The ${input.kind} input was recorded. This adapter has no old-core binding that changes law, economic state, or opportunities from it.`,
        [world.history.events.at(-ONE)!.id],
      );
    },
    advance(throughDate: string, remainingDays: number): AdvanceReceipt {
      requireWorld();
      const needed = daysBetween(world.currentDate, throughDate);
      const days = Math.min(needed, remainingDays);
      if (days > ZERO) world = advanceWorld(world, days);
      return {
        throughDate: world.currentDate,
        simulatedDays: days,
        complete: world.currentDate === throughDate,
        observations: core.observe(),
        recordIds: [],
        gaps:
          days < needed
            ? [
                gap(
                  "day-budget-exhausted",
                  "The explicit day budget ended this continuous run early.",
                  ["scripts/life-replay/old-core.ts"],
                ),
              ]
            : [],
      };
    },
    decisions(): CoreDecision[] {
      requireWorld();
      return world.personOrder.flatMap((personId) =>
        availableLifeSituations(world, {
          personId,
          asOfDate: world.currentDate,
        })
          .filter((situation) => !situation.needsCompanion)
          .map((situation) => ({
            id: `${personId}:${situation.key}`,
            actorId: personId,
            actorKey: personId === actorId ? "subject" : personId,
            mechanism: "life-situation",
            choices: situation.options.map((option) => {
              let blockers: string[] = [];
              try {
                const probe = resolveLifeSituation(
                  { ...world, control: { kind: "person", personId } },
                  {
                    stableKey: `eligibility:${personId}:${situation.key}:${option.key}:${world.currentDate}`,
                    mode: "played",
                    personId,
                    situationKey: situation.key,
                    optionKey: option.key,
                    occurredAt: world.currentDate,
                    jurisdictionId: birthplaceId,
                  },
                );
                if (probe.status === "blocked")
                  blockers = [
                    "The canonical eligibility check blocked this action.",
                  ];
              } catch (error) {
                blockers = [
                  error instanceof Error ? error.message : String(error),
                ];
              }
              return {
                key: option.key,
                intent: { situationKey: situation.key, optionKey: option.key },
                enabled: blockers.length === ZERO,
                blockers,
              };
            }),
          })),
      );
    },
    resolve(decisionId: string, choiceKey: string | null): CoreReceipt {
      requireWorld();
      if (choiceKey === null)
        return contextReceipt(
          "native-autonomy-not-exposed",
          "The old life-situation API exposes available actions, not a pending NPC scorer. Its ordinary clock continues independently.",
          [],
        );
      const decision = core
        .decisions()
        .find((entry) => entry.id === decisionId);
      const choice = decision?.choices.find(
        (entry) => entry.key === choiceKey && entry.enabled,
      );
      if (!decision || !choice)
        throw new Error("Cannot force an unavailable old-core decision");
      generation += ONE;
      const priorControl = world.control;
      const resolved = resolveLifeSituation(
        {
          ...world,
          control: { kind: "person", personId: decision.actorId as EntityId },
        },
        {
          stableKey: `god:${generation}`,
          mode: "played",
          personId: decision.actorId as EntityId,
          situationKey: String(
            choice.intent.situationKey,
          ) as ResolveLifeSituationInput["situationKey"],
          optionKey: choiceKey,
          occurredAt: world.currentDate,
          jurisdictionId: birthplaceId,
        },
      );
      if (resolved.status === "blocked")
        return contextReceipt(
          "native-choice-blocked",
          "The ordinary old-core eligibility check blocked this choice.",
          [],
        );
      world = { ...resolved.world, control: priorControl };
      const observation: CoreObservation = {
        metric: "native.life-choice",
        value: choice.intent,
        date: world.currentDate,
        origin: "forced",
        recordIds: [resolved.eventId],
      };
      observations.push(observation);
      return {
        observations: [observation],
        recordIds: [resolved.eventId],
        gaps: [],
      };
    },
    observe(): CoreObservation[] {
      requireWorld();
      return [
        ...observations,
        {
          metric: "person.ageYears",
          value: ageOnDate(world.people[actorId]!.birthDate, world.currentDate),
          date: world.currentDate,
          origin: "engine",
          recordIds: [actorId],
        },
        ...world.history.decisionTraces
          .filter((trace) => trace.selectedOptionKey !== null)
          .map((trace): CoreObservation => ({
            metric: `decision.${trace.context.decisionType}`,
            value: trace.selectedOptionKey!,
            date: trace.context.cutoff.asOfDate,
            origin: "engine",
            recordIds: [trace.id],
          })),
      ];
    },
    event(input: CorePastFact): CoreReceipt {
      requireWorld();
      if (input.kind !== "event")
        throw new Error(
          "Documented outcomes cannot be inserted as external events",
        );
      generation += ONE;
      world = record(
        world,
        `event:${generation}`,
        input.mechanism,
        input.date.latest,
        [actorId],
      );
      return contextReceipt(
        "event-context-only",
        `The ${input.mechanism} event was stored as context. No matching state-changing handler ran through this adapter.`,
        [world.history.events.at(-ONE)!.id],
      );
    },
    capability(mechanism: string) {
      requireWorld();
      const probe = record(
        world,
        `probe:${mechanism}:${world.history.nextSequence}`,
        mechanism,
        world.currentDate,
        [actorId],
      );
      return {
        representation: "records-only",
        recordIds: [probe.history.events.at(-ONE)!.id],
        gaps: [
          gap(
            "record-without-life-behavior",
            `The canonical old-core event writer accepts ${mechanism} as a context record. This does not establish its decision, prerequisites, or consequences. Native elections and laws have not been exercised in this source-only world.`,
            ["src/simulation/world.ts:1005", "scripts/life-replay/old-core.ts"],
          ),
        ],
      };
    },
  };
  return core;
}
