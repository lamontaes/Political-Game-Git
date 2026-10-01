import { considerationScore, evaluateDecision } from "../decisions";
import { eventsOfType } from "../justice/jail-terms";
import { ageOnDate } from "../dates";
import { personTrait } from "../people-traits";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
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
 * decision engine: how much the offense harmed them, against the trouble of
 * reporting; how close they are to the person who did it (the resident the
 * offense points to, `./offenders`), since a victim who knows the offender
 * well may fear reprisal, want to spare them or call it a private matter; the
 * victim's own past with police (offenses they reported before argue for it,
 * having been charged themselves argues against it); and their own
 * temperament. An offense against a home is reported when anyone living there
 * decides to. A tie in the weighing stays unreported.
 *
 * The weights are PLACEHOLDERS (research: `why-victims-report-to-police`).
 * The real shares reported to police (BJS, Criminal Victimization, 2022,
 * NCJ 307089, table 4) check the totals in the tests and never decide one
 * victim.
 */
export const CRIME_REPORTING_VERSION = "crime-reporting-v1" as const;

export const REPORT_OPTIONS = {
  report: "report",
  quiet: "keep-quiet",
} as const;

/** PLACEHOLDER weights, in the decision engine's points. */
export const UNRESEARCHED_REPORTING = {
  provenance: "unresearched-blanket-rule",
  /** How much the offense itself argues for calling the police. */
  harm: {
    robbery: 6,
    assault: 4,
    burglary: 3,
    vandalism: 2,
  } satisfies Record<CrimeOffense, number>,
  /** The time, trouble and doubt that police could do anything. */
  trouble: 4,
  /** A family tie to the offender, at full strength; acquaintance slides. */
  closeTie: 6,
  /** How many shared moments make an acquaintance feel close. */
  interactionsForCloseness: 3,
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

/** How close `a` is to `b`: 1 for family, sliding with shared moments. */
export function closeness(world: World, a: EntityId, b: EntityId): number {
  if (
    world.history.kinshipRelationships.some(
      (row) => row.personIds.includes(a) && row.personIds.includes(b),
    )
  )
    return 1;
  let shared = 0;
  for (const row of world.history.relationshipInteractions)
    if (row.personIds.includes(a) && row.personIds.includes(b)) shared += 1;
  return 1 - Math.exp(-shared / R.interactionsForCloseness);
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
}

/** Each victim's considerations: a sliding amount for each circumstance. */
export function reportConsiderations(
  world: World,
  victimId: EntityId,
  offense: CrimeOffense,
  offenderPersonId: EntityId | null,
  occurredAt: IsoDate,
  prefix: string,
): DecisionConsideration[] {
  const rows: [string, string, number, string][] = [
    ["harm", REPORT_OPTIONS.report, R.harm[offense], "What was done to them."],
    [
      "trouble",
      REPORT_OPTIONS.quiet,
      R.trouble,
      "The trouble of it, and doubt that police could do anything.",
    ],
  ];
  if (offenderPersonId) {
    const close = closeness(world, victimId, offenderPersonId);
    rows.push([
      "tie",
      REPORT_OPTIONS.quiet,
      R.closeTie * close,
      "They know the person who did it.",
    ]);
  }
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
  for (const victimId of [...input.victimPersonIds].sort())
    if (
      victimReports(world, {
        victimId,
        offense: input.offense,
        offenderPersonId,
        occurredAt: input.occurredAt,
        targetId: input.targetId,
      })
    )
      return { reported: true, offenderPersonId, reportedBy: victimId };
  return { reported: false, offenderPersonId, reportedBy: null };
}

/** One victim's own decision, through the decision engine. Pure. */
export function victimReports(
  world: World,
  input: {
    readonly victimId: EntityId;
    readonly offense: CrimeOffense;
    readonly offenderPersonId: EntityId | null;
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
      input.offenderPersonId,
      input.occurredAt,
      prefix,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return evaluation.selectedOptionKey === REPORT_OPTIONS.report;
}
