import { considerationScore, evaluateDecision } from "../decisions";
import { eventById } from "../event-index";
import { growingIndex, type GrowingIndexKind } from "../history-index";
import { eventsOfType } from "../justice/jail-terms";
import { addDays, ageOnDate } from "../dates";
import { personTrait } from "../people-traits";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  HistoricalEvent,
  IsoDate,
  MindConfidence,
  World,
} from "../types";
import type { CrimeOffense } from "./contract";
import { offenderForVictims } from "./offenders";

/**
 * Whether a victim reports an offense to police (A131).
 *
 * Nothing is drawn. Each victim weighs it from their own side through the
 * decision engine: what was done to them (the offense), against the trouble
 * of reporting; whether it has happened to them before (each recorded offense
 * against them argues for calling this time); the victim's own past with
 * police (offenses they reported before argue for it, having been charged
 * themselves argues against it); and their own temperament and age. An
 * offense against a home is reported when anyone living there decides to. A
 * tie in the weighing stays unreported.
 *
 * Knowing the offender is not a weight (CTO Ruling 11). The national survey
 * finds violence by family reported at least as often as violence by
 * strangers: intimate partner 56%, immediate family 56%, other relatives
 * 49%, acquaintances 39%, strangers 49% (BJS, Nonfatal Domestic Violence,
 * 2003-2012, NCJ 244697, table 8); domestic violence 53.8% against stranger
 * violence 36.0% in 2022 and 47.7% against 44.9% in 2023 (BJS, Criminal
 * Victimization, 2023, NCJ 309335, table 4). Those shares check the totals by
 * relationship in the tests and never decide one victim.
 *
 * The played person is never decided for. When the offense happened to them
 * and nobody else it happened to reported it, the choice is theirs, put to
 * them as a life decision (`adult.crime-report`); until they report it, it
 * stays unreported.
 *
 * The weights are PLACEHOLDERS (research: `why-victims-report-to-police`).
 * The real shares reported to police by offense (BJS, Criminal Victimization,
 * 2023, NCJ 309335, table 4) check the totals in the tests.
 */
export const CRIME_REPORTING_VERSION = "crime-reporting-v2" as const;

export const REPORT_OPTIONS = {
  report: "report",
  quiet: "keep-quiet",
} as const;

/** PLACEHOLDER weights, in the decision engine's points. */
export const UNRESEARCHED_REPORTING = {
  provenance: "unresearched-blanket-rule",
  /**
   * How much the offense itself argues for calling the police, set so the
   * town's shares land near the national shares reported (2022 and 2023):
   * robbery 64.0% and 42.4%, assault 40.6% and 44.9% (aggravated 49.9% and
   * 57.1%), burglary 44.9% and 42.2%. Robbery and assault average within ten
   * points of each other and share a weight. A burglary is reported when
   * anyone in the home decides to, so its own weight sits lower. Vandalism is
   * not a survey category; it sits with "other theft" (26.4% and 24.8%).
   */
  harm: {
    robbery: 4,
    assault: 4,
    burglary: 3,
    vandalism: 2,
  } satisfies Record<CrimeOffense, number>,
  /** The time, trouble and doubt that police could do anything. */
  trouble: 4,
  /**
   * Earlier offenses against the same victim, at full strength: what has
   * happened before is part of the harm this time. Repeat victims are a
   * fifth of victims and half of all violent victimizations (BJS, Repeat
   * Violent Victimization, 2005-14, NCJ 250567); the size of the pull is a
   * placeholder.
   */
  repeatVictimization: 3,
  /** Offenses the victim reported before, at full strength. */
  reportedBefore: 3,
  /** The victim's own past charges, at full strength. */
  chargedBefore: 3,
  /** Each step of temperament (reliability plus conflict, -4 to 4). */
  temperamentPerStep: 1.5,
  /** The age where age argues neither way, and its pull per ten years. */
  ageMidpoint: 40,
  agePerDecade: 1.5,
  researchQuestions: ["why-victims-report-to-police"],
} as const;

const R = UNRESEARCHED_REPORTING;

const STEPS: readonly (readonly [
  number,
  DecisionImportance,
  MindConfidence,
])[] = [
  [1, "slight", "low"],
  [2, "slight", "medium"],
  [3, "slight", "high"],
  [4, "strong", "low"],
  [6, "moderate", "high"],
  [8, "strong", "medium"],
  [12, "strong", "high"],
  [18, "decisive", "high"],
];

/** The engine's points, rounded to its nearest importance and confidence. */
function step(points: number) {
  const size = Math.abs(points);
  if (size < 0.5) return null;
  let best = STEPS[0]!;
  for (const candidate of STEPS)
    if (
      Math.abs(Math.log(candidate[0] / size)) <
      Math.abs(Math.log(best[0] / size))
    )
      best = candidate;
  return best;
}

/**
 * The crimes a person suffered: every offense the crime producer recorded
 * with them as its victim (`impact:crime-victim`), reported or not.
 *
 * This is the one reader of that fact. The principles a life forms
 * (`principles-from-life.ts`) and the victim's own decision to report
 * (`priorVictimizations`, below) both read it.
 */

// Follows the event list as it grows, so a new event is read once rather than
// every event again after each write.
const VICTIM_EVENTS: GrowingIndexKind<Map<EntityId, EntityId[]>> = {
  create: () => new Map(),
  add: (index, entry) => {
    const event = entry as HistoricalEvent;
    for (const participant of event.participants)
      if (participant.role === "impact:crime-victim" && participant.personId) {
        const list = index.get(participant.personId) ?? [];
        list.push(event.id);
        index.set(participant.personId, list);
      }
  },
};

/** The ids of the crimes against `personId` on or before `through`. */
export function crimesSufferedBy(
  world: World,
  personId: EntityId,
  through = world.currentDate,
): readonly EntityId[] {
  const index = growingIndex(VICTIM_EVENTS, world.history.events);
  return (index.get(personId) ?? []).filter(
    (id) => (eventById(world, id)?.occurredAt ?? "") <= through,
  );
}

/** Offenses recorded against `personId` before `onDate`, reported or not. */
export function priorVictimizations(
  world: World,
  personId: EntityId,
  onDate: IsoDate,
): number {
  return crimesSufferedBy(world, personId, addDays(onDate, -1)).length;
}

/** The victim's past with police before `onDate`: reports made, charges. */
function policeContact(
  world: World,
  personId: EntityId,
  onDate: IsoDate,
): { reported: number; charged: number } {
  let reported = 0;
  for (const event of eventsOfType(world, "crime.offense-reported"))
    if (
      event.occurredAt < onDate &&
      event.participants.some((row) => row.personId === personId)
    )
      reported += 1;
  let charged = 0;
  for (const event of eventsOfType(world, "justice.prosecution-referred"))
    if (
      event.occurredAt < onDate &&
      event.participants.some(
        (row) => row.personId === personId && row.role === "focus:subject",
      )
    )
      charged += 1;
  return { reported, charged };
}

export interface ReportDecision {
  readonly reported: boolean;
  /** The resident the offense points to, when the world names one. */
  readonly offenderPersonId: EntityId | null;
  /** The reporting victim, or null when nobody reported it. */
  readonly reportedBy: EntityId | null;
  /**
   * The played person, when it happened to them and nobody else reported
   * it: whether to report is then their own choice in play.
   */
  readonly playerChooses: EntityId | null;
}

/** Each victim's considerations: a sliding amount for each circumstance. */
export function reportConsiderations(
  world: World,
  victimId: EntityId,
  offense: CrimeOffense,
  occurredAt: IsoDate,
  prefix: string,
): DecisionConsideration[] {
  const before = priorVictimizations(world, victimId, occurredAt);
  const rows: [string, string, number, string][] = [
    ["harm", REPORT_OPTIONS.report, R.harm[offense], "What was done to them."],
    [
      "trouble",
      REPORT_OPTIONS.quiet,
      R.trouble,
      "The trouble of it, and doubt that police could do anything.",
    ],
    [
      "repeat",
      REPORT_OPTIONS.report,
      R.repeatVictimization * (1 - Math.exp(-before)),
      "It has happened to them before.",
    ],
  ];
  const contact = policeContact(world, victimId, occurredAt);
  rows.push(
    [
      "reported-before",
      REPORT_OPTIONS.report,
      R.reportedBefore * (1 - Math.exp(-contact.reported)),
      "They have gone to the police before.",
    ],
    [
      "charged-before",
      REPORT_OPTIONS.quiet,
      R.chargedBefore * (1 - Math.exp(-contact.charged)),
      "They have been on the wrong side of the police themselves.",
    ],
  );
  // Their own temperament, from their upbringing: somebody who follows
  // things through or presses a wrong leans to calling; a conciliatory one
  // to letting it pass.
  // The player's temperament never decides anything for them.
  const temperament =
    world.control.kind === "person" && world.control.personId === victimId
      ? 0
      : personTrait(world, victimId, "reliability").value +
        personTrait(world, victimId, "conflict").value;
  rows.push([
    "temperament",
    temperament >= 0 ? REPORT_OPTIONS.report : REPORT_OPTIONS.quiet,
    R.temperamentPerStep * Math.abs(temperament),
    temperament >= 0
      ? "They do not let a wrong pass."
      : "They would rather let it go than make trouble.",
  ]);
  // Age: younger victims call less, older ones more, sliding by the year.
  const age = ageOnDate(world.people[victimId]!.birthDate, occurredAt);
  const years = age - R.ageMidpoint;
  rows.push([
    "age",
    years >= 0 ? REPORT_OPTIONS.report : REPORT_OPTIONS.quiet,
    (R.agePerDecade * Math.abs(years)) / 10,
    years >= 0
      ? "They are of an age to call the police."
      : "Young people call the police less.",
  ]);
  const list: DecisionConsideration[] = [];
  for (const [key, option, points, why] of rows) {
    const size = step(points);
    if (!size) continue;
    list.push({
      stableKey: `${prefix}:${key}`,
      optionKey: option,
      sourceType: "context:circumstance",
      direction: "supports",
      importance: size[1],
      confidence: size[2],
      explanation: why,
      sourceRefs: [],
    });
  }
  return list;
}

/** The weighing's lean toward reporting, in points. */
export function reportLean(list: readonly DecisionConsideration[]): number {
  let total = 0;
  for (const row of list)
    total +=
      (row.optionKey === REPORT_OPTIONS.report ? 1 : -1) *
      considerationScore(row);
  return total;
}

/**
 * Whether anybody the offense happened to reports it. Pure: reads the
 * world, writes nothing.
 */
export function decideReport(
  world: World,
  input: {
    readonly offense: CrimeOffense;
    readonly jurisdictionId: EntityId;
    readonly occurredAt: IsoDate;
    readonly targetId: EntityId;
    readonly victimPersonIds: readonly EntityId[];
  },
): ReportDecision {
  const offender = offenderForVictims(
    world,
    {
      jurisdictionId: input.jurisdictionId,
      occurredAt: input.occurredAt,
      victimPersonIds: input.victimPersonIds,
    },
    input.offense,
  );
  const offenderPersonId = offender?.personId ?? null;
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  for (const victimId of [...input.victimPersonIds].sort()) {
    // The played person decides in play, never through the engine.
    if (victimId === player) continue;
    if (
      victimReports(world, {
        victimId,
        offense: input.offense,
        occurredAt: input.occurredAt,
        targetId: input.targetId,
      })
    )
      return {
        reported: true,
        offenderPersonId,
        reportedBy: victimId,
        playerChooses: null,
      };
  }
  return {
    reported: false,
    offenderPersonId,
    reportedBy: null,
    playerChooses:
      player !== null && input.victimPersonIds.includes(player) ? player : null,
  };
}

/** One victim's own decision, through the decision engine. Pure. */
export function victimReports(
  world: World,
  input: {
    readonly victimId: EntityId;
    readonly offense: CrimeOffense;
    readonly occurredAt: IsoDate;
    readonly targetId: EntityId;
  },
): boolean {
  const prefix = `${CRIME_REPORTING_VERSION}:${input.offense}:${input.targetId}:${input.occurredAt}:${input.victimId}`;
  const evaluation = evaluateDecision(world, {
    stableKey: prefix,
    decisionType: "crime.report-to-police",
    actorPersonId: input.victimId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:crime", key: input.offense, entityId: null },
    options: [
      {
        key: REPORT_OPTIONS.report,
        label: "Call the police",
        description: "Tell the police what happened.",
      },
      {
        key: REPORT_OPTIONS.quiet,
        label: "Keep it quiet",
        description: "Let it go without telling the police.",
      },
    ],
    constraints: [],
    considerations: reportConsiderations(
      world,
      input.victimId,
      input.offense,
      input.occurredAt,
      prefix,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey === REPORT_OPTIONS.report;
}
