/**
 * The ladder from anger to unrest, threats and attempts, run on the incident
 * engine (`../incidents.ts`), the one home for conditions that last. Nothing
 * here sets the chance of an outcome. A condition starts when a reading
 * crosses its line, and each quarter its next stage re-checks the world:
 *
 * 1. **Unrest** is a condition in a state. It starts in the quarter the
 *    state's anger is over its line and stays active while it holds. It
 *    becomes lasting after it has held through `lastingAfterQuarters`
 *    re-checks, and it calms in the first quarter anger is back at or under
 *    the line.
 * 2. **A threat** against a prominent political person in the state starts
 *    when unrest there is lasting and anger is still over the line, with no
 *    threat already open there. The anger is at the state's government, so
 *    the one threatened is its most prominent political person
 *    (`prominentPeopleIn`): the governor first. Nothing is drawn. It lapses
 *    when the unrest calms, when its target dies, or after
 *    `threatOpenQuarters` quarters.
 * 3. **An attempt** on an open threat's target, through
 *    `recordViolenceAttempt`, comes when the strain on that threat crosses
 *    its own line. Strain is anger over the line, added up over each quarter
 *    since the threat, and the line is `attemptLine`: how long and how far
 *    anger stays over its line decides whether an attempt comes. An attempt
 *    resolves the threat.
 *
 * Anger itself is recorded as a world metric (`pressure.state-anger`) in each
 * state and quarter the ladder reads it, so the engine's rules evaluate the
 * same canonical value its records cite.
 *
 * `RECORDED_POLITICAL_VIOLENCE_POLICY` is the game's recorded causal policy:
 * one quarter establishes lasting unrest, accumulated excess anger drives an
 * attempt, and an unresolved threat lapses after four quarters. These are
 * HARDWIRED gameplay rules rather than claims about a real-world rate. The ladder installs
 * its metric and two incident definitions the first time a state's anger
 * crosses the line, so a world where nothing does is unchanged.
 */

import { recordViolenceAttempt } from "../crisis/international";
import { currentGovernorOf } from "../crisis/offices";
import { createStableId } from "../ids";
import { stateKeyForJurisdiction } from "../life-places";
import {
  createIncidentCatalog,
  createIncidentDefinition,
} from "../incident-catalog";
import {
  evaluateIncidentCore,
  incidentStateAt,
  occurIncident,
  recordIncidentStage,
} from "../incidents";
import { projectCongress } from "../living-world/congress";
import { homePartyChapters } from "../living-world/party-chapters";
import { personName } from "../people";
import { createExactQuantity } from "../quantity";
import type {
  EntityId,
  HistoricalCutoff,
  IncidentDefinition,
  IncidentRecord,
  IncidentRule,
  MetricScope,
  World,
  WorldMetricDefinition,
  WorldMetricValue,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  recordWorldMetricState,
} from "../world-metrics";
import { homeStateKeyOf } from "./anger";
import type { PressureReading } from "./contract";
import { worldStates } from "./step";

/** The recorded, deterministic pressure-ladder policy; see the file comment. */
export const RECORDED_POLITICAL_VIOLENCE_POLICY = Object.freeze({
  /** Anger at or under this sets nothing off: how bad counts as bad. */
  angerLine: 0.3,
  /** Unrest is lasting once it has held through this many re-checks. */
  lastingAfterQuarters: 1,
  /**
   * A threat's line, in quarters of anger one full point over the line: the
   * strain at which an attempt comes.
   */
  attemptLine: 2,
  /** A threat with no attempt lapses after this many quarters. */
  threatOpenQuarters: 4,
});

export const PRESSURE_ANGER_METRIC_STABLE_KEY = "pressure.state-anger";
export const UNREST_INCIDENT_STABLE_KEY = "incident.pressure-unrest";
export const THREAT_INCIDENT_STABLE_KEY = "incident.pressure-political-threat";

/** Stable keys of every definition the ladder installs, for the boundary. */
export const PRESSURE_LADDER_INCIDENT_STABLE_KEYS: readonly string[] = [
  UNREST_INCIDENT_STABLE_KEY,
  THREAT_INCIDENT_STABLE_KEY,
];

export const UNREST_LASTING_PHASE = "pressure:lasting";
export const UNREST_CALMED_PHASE = "pressure:calmed";
export const THREAT_ATTEMPTED_PHASE = "pressure:attempted";
export const THREAT_LAPSED_PHASE = "pressure:lapsed";

const ANGER_UNIT = "index:pressure";
const ANGER_DENOMINATOR = 10_000;

function angerValue(anger: number): WorldMetricValue {
  return {
    kind: "quantity",
    quantity: createExactQuantity(
      Math.round(anger * ANGER_DENOMINATOR),
      ANGER_DENOMINATOR,
      ANGER_UNIT,
    ),
  };
}

export function pressureAngerMetricDefinition(): WorldMetricDefinition {
  return createWorldMetricDefinition({
    stableKey: PRESSURE_ANGER_METRIC_STABLE_KEY,
    name: "State anger",
    description:
      "The pressure layer's anger in one state at the end of one quarter, as the quarterly step read it. Recorded only where the ladder reads it.",
    domainKey: "pressure.anger",
    valueKind: "quantity",
    quantityUnit: ANGER_UNIT,
    measureNature: "index",
    referencePeriodKind: "point",
    denominatorMetricId: null,
    aggregationKind: "not-aggregatable",
    aggregationNote:
      "Anger is a level in one state and cannot be summed across states.",
    stateSemantics: "primitive",
    tags: ["pressure.anger"],
  });
}

function angerOverLine(metricId: EntityId): IncidentRule {
  return {
    kind: "metric-comparison",
    stableKey: "pressure:anger-over-line",
    metricId,
    reference: { kind: "at-evaluation" },
    comparison: "at-least",
    threshold: angerValue(
      RECORDED_POLITICAL_VIOLENCE_POLICY.angerLine + 0.0001,
    ),
    reasonKey: "pressure:anger-over-line",
  };
}

const definitionIdOf = (stableKey: string) =>
  createStableId("incident-definition", `definition:${stableKey}`);

export function unrestIncidentDefinition(): IncidentDefinition {
  const metricId = pressureAngerMetricDefinition().id;
  const id = definitionIdOf(UNREST_INCIDENT_STABLE_KEY);
  return createIncidentDefinition({
    stableKey: UNREST_INCIDENT_STABLE_KEY,
    label: "Unrest",
    description:
      "Public unrest in a state while its anger is over the line. It lasts while anger holds and calms when it falls back.",
    incidentKind: "pressure:unrest",
    occurrenceMode: "condition",
    baseLikelihood: { numerator: 1, denominator: 1, unit: "rate:share" },
    prerequisites: [angerOverLine(metricId)],
    blockers: [
      {
        kind: "incident-state",
        stableKey: "pressure:unrest-already-active",
        definitionId: id,
        status: "active",
        phaseKey: null,
        reasonKey: "pressure:unrest-already-active",
      },
    ],
    likelihoodModifiers: [],
    tags: ["pressure.ladder", "pressure.unrest"],
  });
}

export function threatIncidentDefinition(): IncidentDefinition {
  const metricId = pressureAngerMetricDefinition().id;
  const unrestId = definitionIdOf(UNREST_INCIDENT_STABLE_KEY);
  const id = definitionIdOf(THREAT_INCIDENT_STABLE_KEY);
  return createIncidentDefinition({
    stableKey: THREAT_INCIDENT_STABLE_KEY,
    label: "Political threat",
    description:
      "A threat against a prominent political person in a state where unrest has lasted and anger is still over the line.",
    incidentKind: "pressure:political-threat",
    occurrenceMode: "condition",
    baseLikelihood: { numerator: 1, denominator: 1, unit: "rate:share" },
    prerequisites: [
      {
        kind: "incident-state",
        stableKey: "pressure:unrest-lasting",
        definitionId: unrestId,
        status: "active",
        phaseKey: UNREST_LASTING_PHASE,
        reasonKey: "pressure:unrest-lasting",
      },
      angerOverLine(metricId),
    ],
    blockers: [
      {
        kind: "incident-state",
        stableKey: "pressure:threat-already-open",
        definitionId: id,
        status: "active",
        phaseKey: null,
        reasonKey: "pressure:threat-already-open",
      },
    ],
    likelihoodModifiers: [],
    tags: ["pressure.ladder", "pressure.political-threat"],
  });
}

/** Installs the ladder's metric and incident definitions, once. */
export function ensurePressureLadder(world: World): World {
  let next = world;
  const metric = pressureAngerMetricDefinition();
  if (!next.metricCatalog.definitions[metric.id]) {
    next = {
      ...next,
      metricCatalog: createWorldMetricCatalog({
        definitions: [
          ...next.metricCatalog.definitionOrder.map(
            (id) => next.metricCatalog.definitions[id]!,
          ),
          metric,
        ],
      }),
    };
  }
  const missing = [
    unrestIncidentDefinition(),
    threatIncidentDefinition(),
  ].filter((definition) => !next.incidentCatalog.definitions[definition.id]);
  if (missing.length > 0) {
    next = {
      ...next,
      incidentCatalog: createIncidentCatalog({
        definitions: [
          ...next.incidentCatalog.definitionOrder.map(
            (id) => next.incidentCatalog.definitions[id]!,
          ),
          ...missing,
        ],
      }),
    };
  }
  return next;
}

function cutoffOf(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function alive(world: World, personId: EntityId): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

function activeOf(
  world: World,
  definitionId: EntityId,
): readonly IncidentRecord[] {
  const cutoff = cutoffOf(world);
  return world.history.incidents.filter(
    (incident) =>
      incident.definitionId === definitionId &&
      incidentStateAt(world, incident.id, cutoff)?.status === "active",
  );
}

function scopeOf(reading: PressureReading): MetricScope {
  return { jurisdictionId: reading.jurisdictionId, segmentKey: null };
}

/**
 * A threat's line: the strain at which an attempt comes. Nothing is drawn;
 * how long and how far anger stays over its line decides it.
 */
export function threatAttemptLine(): number {
  return RECORDED_POLITICAL_VIOLENCE_POLICY.attemptLine;
}

/**
 * The strain on a threat: anger over the line in its state, added up over
 * each quarter read after the quarter it was made.
 */
export function threatStrain(
  readings: readonly PressureReading[],
  threat: IncidentRecord,
): number {
  return readings
    .filter(
      (reading) =>
        reading.jurisdictionId === threat.scope.jurisdictionId &&
        reading.periodEnd > threat.onsetAt,
    )
    .reduce(
      (sum, reading) =>
        sum +
        Math.max(
          0,
          reading.levels.anger - RECORDED_POLITICAL_VIOLENCE_POLICY.angerLine,
        ),
      0,
    );
}

function quartersSince(
  readingsByOrdinal: ReadonlyMap<number, string>,
  onsetAt: string,
): number {
  let count = 0;
  for (const periodEnd of readingsByOrdinal.values())
    if (periodEnd > onsetAt) count += 1;
  return count;
}

/**
 * Steps the ladder for the latest quarter's readings: first each open
 * condition's next stage, then any new unrest and threat.
 */
export function stepPressureLadder(
  world: World,
  latest: readonly PressureReading[],
): World {
  const policy = RECORDED_POLITICAL_VIOLENCE_POLICY;
  const store = world.pressure;
  if (!store) return world;
  const unrestId = unrestIncidentDefinition().id;
  const threatId = threatIncidentDefinition().id;
  const over = latest.filter(
    (reading) => reading.levels.anger > policy.angerLine,
  );
  const installed = Boolean(world.incidentCatalog.definitions[unrestId]);
  if (!installed && over.length === 0) return world;
  let next = installed ? world : ensurePressureLadder(world);

  // The anger read in a place's state this quarter, or null when none was
  // read: missing anger is not calm (A133). The layer stores no reading for
  // a state it stepped this quarter with nothing left to carry, so such a
  // state's anger was read, and read as 0 (see `PressureStore`). A state the
  // layer has not stepped this quarter has no anger on record at all.
  const readingByState = new Map(
    latest.map((reading) => [reading.stateKey, reading]),
  );
  const steppedToday = store.lastPeriodEnd === world.currentDate;
  const steppedStates = new Set(
    steppedToday ? worldStates(world).map((state) => state.stateKey) : [],
  );
  const angerIn = (jurisdictionId: EntityId): number | null => {
    const jurisdiction = next.jurisdictions[jurisdictionId];
    const stateKey = jurisdiction
      ? stateKeyForJurisdiction(jurisdiction)
      : null;
    if (!stateKey) return null;
    const reading = readingByState.get(stateKey);
    if (reading) return reading.levels.anger;
    return steppedStates.has(stateKey) ? 0 : null;
  };
  // Every quarter the pressure layer has stepped, by its end date.
  const stepEnds = new Map<number, string>();
  for (const reading of store.readings)
    stepEnds.set(reading.ordinal, reading.periodEnd);
  const nameOf = (jurisdictionId: EntityId) =>
    next.jurisdictions[jurisdictionId]?.name ?? "the state";

  // 1. Each open threat: an attempt when its strain crosses its line, or it
  // lapses. Threats first, so an attempt rests on the unrest that was there.
  for (const threat of activeOf(next, threatId)) {
    const targetId = next.history.events
      .find((event) => event.id === threat.onsetEventId)
      ?.participants.find((row) => row.role === "impact:threatened")?.personId;
    const name = nameOf(threat.scope.jurisdictionId);
    const unrest = activeOf(next, unrestId).find(
      (incident) =>
        incident.scope.jurisdictionId === threat.scope.jurisdictionId,
    );
    const anger = angerIn(threat.scope.jurisdictionId);
    const stillOver = anger !== null && anger > policy.angerLine;
    const calmed = anger !== null && anger <= policy.angerLine;
    const lapse = (
      reasonKey: `${string}:${string}`,
      context: string,
      summary: string,
    ) =>
      recordIncidentStage(next, {
        stableKey: `${threat.stableKey}:${reasonKey}`,
        incidentId: threat.id,
        status: "resolved",
        phaseKey: THREAT_LAPSED_PHASE,
        reasonKey,
        context,
        summary,
      });
    if (!targetId || !alive(next, targetId)) {
      next = lapse(
        "pressure:target-gone",
        "The person threatened is no longer living.",
        `The threat made during unrest in ${name} ended with the death of the person threatened.`,
      );
      continue;
    }
    const strain = threatStrain(store.readings, threat);
    const line = threatAttemptLine();
    if (stillOver && unrest && strain >= line) {
      const target = next.people[targetId]!;
      next = recordViolenceAttempt(next, {
        stableKey: `pressure:${threat.stableKey}:attempt`,
        targetPersonId: targetId,
        threatEvidenceIds: [threat.onsetEventId, unrest.onsetEventId],
        basis: `Lasting unrest in ${name} and an earlier threat against the target: anger over its line added up to ${strain.toFixed(2)} since the threat, past this threat's own line of ${line.toFixed(2)}.`,
      });
      next = recordIncidentStage(next, {
        stableKey: `${threat.stableKey}:attempted`,
        incidentId: threat.id,
        status: "resolved",
        phaseKey: THREAT_ATTEMPTED_PHASE,
        reasonKey: "pressure:attempted",
        context: `Strain ${strain.toFixed(4)} reached the threat's line ${line.toFixed(4)}.`,
        summary: `The threat against ${personName(target)} during unrest in ${name} ended in an attempt.`,
      });
      continue;
    }
    // With no anger read this quarter the threat stays open as it was.
    if (!unrest || calmed) {
      next = lapse(
        "pressure:unrest-calmed",
        "The unrest the threat came out of has calmed.",
        `The threat made during unrest in ${name} lapsed as the unrest calmed.`,
      );
      continue;
    }
    if (quartersSince(stepEnds, threat.onsetAt) >= policy.threatOpenQuarters) {
      next = lapse(
        "pressure:threat-lapsed",
        `No attempt came within ${policy.threatOpenQuarters} quarters.`,
        `The threat made during unrest in ${name} lapsed.`,
      );
    }
  }

  // 2. Each open unrest: it calms when anger is back at or under the line,
  // and becomes lasting once it has held through enough re-checks.
  for (const unrest of activeOf(next, unrestId)) {
    const name = nameOf(unrest.scope.jurisdictionId);
    const anger = angerIn(unrest.scope.jurisdictionId);
    // No anger read this quarter: the unrest stays open, and no stage is
    // written on a reading nobody took.
    if (anger === null) continue;
    if (anger <= policy.angerLine) {
      next = recordIncidentStage(next, {
        stableKey: `${unrest.stableKey}:calmed`,
        incidentId: unrest.id,
        status: "resolved",
        phaseKey: UNREST_CALMED_PHASE,
        reasonKey: "pressure:anger-at-or-under-line",
        context: `Anger read ${anger.toFixed(4)}, at or under the line of ${policy.angerLine}.`,
        summary: `Unrest in ${name} calmed as public anger fell back.`,
      });
      continue;
    }
    const state = incidentStateAt(next, unrest.id, cutoffOf(next));
    if (
      state?.phaseKey !== UNREST_LASTING_PHASE &&
      quartersSince(stepEnds, unrest.onsetAt) >= policy.lastingAfterQuarters
    )
      next = recordIncidentStage(next, {
        stableKey: `${unrest.stableKey}:lasting`,
        incidentId: unrest.id,
        status: "active",
        phaseKey: UNREST_LASTING_PHASE,
        reasonKey: "pressure:anger-held",
        context: `Anger read ${anger.toFixed(4)}, still over the line of ${policy.angerLine}.`,
        summary: `Unrest in ${name} continued into another quarter.`,
      });
  }

  // 3. New unrest and threats where anger is over the line.
  for (const reading of [...over].sort((a, b) =>
    a.stateKey.localeCompare(b.stateKey),
  )) {
    const scope = scopeOf(reading);
    const name = nameOf(reading.jurisdictionId);
    next = recordWorldMetricState(next, {
      stableKey: `pressure:anger:${reading.ordinal}:${reading.stateKey}`,
      metricId: pressureAngerMetricDefinition().id,
      scope,
      referencePeriod: { kind: "point", at: next.currentDate },
      value: angerValue(reading.levels.anger),
      recordedAt: next.currentDate,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [reading.jurisdictionId],
      },
      supersedesStateId: null,
    });

    const unrest = evaluateIncidentCore(next, {
      definitionId: unrestId,
      evaluationKey: `unrest:${reading.ordinal}`,
      scope,
      evaluatedAt: next.currentDate,
      cutoff: cutoffOf(next),
      exposure: { numerator: 1, denominator: 1, unit: "rate:share" },
      vulnerability: { numerator: 1, denominator: 1, unit: "rate:share" },
      resilience: { numerator: 0, denominator: 1, unit: "rate:share" },
      consequences: [],
    });
    if (unrest.occurred)
      next = occurIncident(next, {
        stableKey: `pressure:unrest:${reading.stateKey}:${reading.ordinal}`,
        evaluation: unrest,
        summary: `Unrest broke out in ${name} as public anger ran high.`,
        visibility: "public",
      });

    const threat = evaluateIncidentCore(next, {
      definitionId: threatId,
      evaluationKey: `threat:${reading.ordinal}`,
      scope,
      evaluatedAt: next.currentDate,
      cutoff: cutoffOf(next),
      exposure: { numerator: 1, denominator: 1, unit: "rate:share" },
      vulnerability: { numerator: 1, denominator: 1, unit: "rate:share" },
      resilience: { numerator: 0, denominator: 1, unit: "rate:share" },
      consequences: [],
    });
    if (!threat.occurred) continue;
    // The anger is at the state's government, so its most prominent
    // political person is the one threatened: the governor first.
    const targetId = prominentPeopleIn(next, reading.stateKey)[0];
    if (!targetId) continue;
    next = occurIncident(next, {
      stableKey: `pressure:threat:${reading.stateKey}:${reading.ordinal}`,
      evaluation: threat,
      subjects: [
        { personId: targetId, role: "impact:threatened", detail: null },
      ],
      summary: `${personName(next.people[targetId]!)} was threatened as unrest continued in ${name}.`,
      visibility: "limited",
    });
  }
  return next;
}

/**
 * Prominent political people in a state, in office or not, most prominent
 * first: its governor, its U.S. Senators, its U.S. Representatives, then party
 * chapter organizers who live there. Living people only; id order within each
 * group.
 */
export function prominentPeopleIn(
  world: World,
  stateKey: string,
): readonly EntityId[] {
  const usps = stateKey.slice(3);
  const living = (ids: Iterable<EntityId>) =>
    [...ids].filter((id) => world.people[id] && alive(world, id)).sort();
  const governor = currentGovernorOf(world, usps);
  const congress = projectCongress(world);
  const members = (chamber: "house" | "senate") =>
    living(
      (congress?.[chamber].seats ?? []).flatMap((seat) =>
        seat.stateUsps === usps && seat.occupant.kind === "member"
          ? [seat.occupant.member.personId]
          : [],
      ),
    );
  const organizers = living(
    homePartyChapters(world).flatMap((chapter) =>
      chapter.organizerPersonId &&
      homeStateKeyOf(world, chapter.organizerPersonId) === stateKey
        ? [chapter.organizerPersonId]
        : [],
    ),
  );
  return [
    ...new Set([
      ...living(governor ? [governor.personId] : []),
      ...members("senate"),
      ...members("house"),
      ...organizers,
    ]),
  ];
}
