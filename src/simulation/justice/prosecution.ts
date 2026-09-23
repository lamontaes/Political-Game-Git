import { addDays, isoDateFromParts } from "../dates";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";

/**
 * UNRESEARCHED. Everything about a criminal case after a referral: when a
 * regulator refers, whether prosecutors charge, how the case ends and what
 * sentence follows. A placeholder ladder so the step exists and can be seen,
 * not any jurisdiction's criminal law or practice; filed with the research
 * queue as `campaign-money-criminal-referral`. A researched rule set replaces
 * this one under a new version.
 */
export const UNRESEARCHED_PROSECUTION = {
  version: "prosecution-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /**
   * A regulator refers campaign money taken for personal use once this many
   * public findings stand against the person, the new one included: a first
   * finding stays civil, a repeat goes to prosecutors.
   */
  referAtFinding: 2,
  /** Days from a referral to the prosecutors' charge. Every referral is charged. */
  chargeAfterDays: 60,
  /** Days from the charge to its end. Every charge ends in a guilty plea. */
  resolveAfterDays: 120,
  /** Months in jail per public finding standing against the person. */
  jailMonthsPerFinding: 6,
} as const;

export const PROSECUTION_REFERRED_EVENT = "justice.prosecution-referred";
export const PROSECUTION_CHARGED_EVENT = "justice.charged";
export const PROSECUTION_SENTENCED_EVENT = "justice.sentenced";

const OFFENSE_TAG = "justice.offense:";
const JAIL_MONTHS_TAG = "justice.jail-months:";
const REFERRAL_TAG = "justice.referral:";

export interface ProsecutionReferralInput {
  readonly stableKey: string;
  readonly subjectPersonId: EntityId;
  readonly jurisdictionId: EntityId | null;
  /** What the case is about, e.g. `campaign-funds-personal-use`. */
  readonly offenseKey: string;
  readonly referredBy: {
    readonly kind: "regulator" | "police" | "prosecutor-own-motion";
    /** Who referred it, as the player would read it. */
    readonly label: string;
    readonly personId: EntityId | null;
  };
  /** The recorded events the case rests on: a finding, a report, an arrest. */
  readonly basisEventIds: readonly EntityId[];
  /** Standing public findings, which set the placeholder sentence. */
  readonly standingFindings: number;
}

const OFFENSE_LABELS: Readonly<Record<string, string>> = {
  "campaign-funds-personal-use": "taking campaign money for personal use",
};

function offenseLabel(offenseKey: string): string {
  return OFFENSE_LABELS[offenseKey] ?? "a crime";
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  return (
    event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
    null
  );
}

/**
 * Sends a case to prosecutors. The referral itself is private; the charge
 * that follows is public (`advanceProsecutions`). Idempotent on `stableKey`.
 * Any producer may call this: a regulator after a finding, and later the
 * police or a prosecutor on their own. Nothing here decides guilt: it rests
 * on the recorded events in `basisEventIds`.
 */
export function referForProsecution(
  world: World,
  input: ProsecutionReferralInput,
): { readonly world: World; readonly referralId: EntityId } {
  const stableKey = `${UNRESEARCHED_PROSECUTION.version}:referral:${input.stableKey}`;
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing) return { world, referralId: existing.id };
  const subject = world.people[input.subjectPersonId];
  if (!subject) throw new Error("A referral names somebody not in the world.");
  const name = personName(subject);
  const months =
    UNRESEARCHED_PROSECUTION.jailMonthsPerFinding *
    Math.max(1, input.standingFindings);
  const next = recordWorldEvent(world, {
    stableKey,
    type: PROSECUTION_REFERRED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.subjectPersonId],
    participants: [
      {
        personId: input.subjectPersonId,
        role: "focus:subject",
        detail: "Referred to prosecutors",
      },
      ...(input.referredBy.personId
        ? [
            {
              personId: input.referredBy.personId,
              role: "other:referred-by" as const,
              detail: input.referredBy.label,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      UNRESEARCHED_PROSECUTION.version,
      `${OFFENSE_TAG}${input.offenseKey}`,
      `${JAIL_MONTHS_TAG}${months}`,
      `justice.referred-by:${input.referredBy.kind}`,
      // Events are not entities, so what the case rests on rides as tags.
      ...input.basisEventIds.map((id) => `justice.basis-event:${id}`),
    ],
    summary: `The ${input.referredBy.label} referred ${name} to prosecutors for ${offenseLabel(input.offenseKey)}.`,
    context: {
      location: null,
      socialContext: input.referredBy.label,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, referralId: next.history.events.at(-1)!.id };
}

function followUp(
  world: World,
  after: HistoricalEvent,
  referral: HistoricalEvent,
  type: typeof PROSECUTION_CHARGED_EVENT | typeof PROSECUTION_SENTENCED_EVENT,
  summary: string,
  extraTags: readonly string[],
): World {
  const subjectId = referral.participants.find(
    (entry) => entry.role === "focus:subject",
  )!.personId;
  return recordWorldEvent(world, {
    stableKey: `${referral.stableKey}:${type}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: referral.jurisdictionId,
    involvedEntityIds: [subjectId],
    participants: [
      { personId: subjectId, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      UNRESEARCHED_PROSECUTION.version,
      `${REFERRAL_TAG}${referral.id}`,
      `justice.follows-event:${after.id}`,
      ...referral.tags.filter((tag) => tag.startsWith(OFFENSE_TAG)),
      ...extraTags,
    ],
    summary,
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * Moves every open case one step when its placeholder time has passed: a
 * referral is charged, and a charge ends in a plea and a jail sentence. Runs
 * on the weekly sweep.
 */
export function advanceProsecutions(world: World): World {
  const rule = UNRESEARCHED_PROSECUTION;
  let next = world;
  const byReferral = (
    type: typeof PROSECUTION_CHARGED_EVENT | typeof PROSECUTION_SENTENCED_EVENT,
    referral: HistoricalEvent,
  ) =>
    next.history.events.find(
      (event) =>
        event.type === type &&
        event.tags.includes(`${REFERRAL_TAG}${referral.id}`),
    );
  for (const referral of world.history.events) {
    if (referral.type !== PROSECUTION_REFERRED_EVENT) continue;
    const subjectId = referral.participants.find(
      (entry) => entry.role === "focus:subject",
    )?.personId;
    const subject = subjectId ? next.people[subjectId] : undefined;
    if (!subject) continue;
    const name = personName(subject);
    const offense = offenseLabel(tagValue(referral, OFFENSE_TAG) ?? "");
    let charged = byReferral(PROSECUTION_CHARGED_EVENT, referral);
    if (!charged) {
      if (addDays(referral.occurredAt, rule.chargeAfterDays) > next.currentDate)
        continue;
      next = followUp(
        next,
        referral,
        referral,
        PROSECUTION_CHARGED_EVENT,
        `Prosecutors charged ${name} with ${offense}.`,
        [],
      );
      charged = next.history.events.at(-1)!;
    }
    if (byReferral(PROSECUTION_SENTENCED_EVENT, referral)) continue;
    if (addDays(charged.occurredAt, rule.resolveAfterDays) > next.currentDate)
      continue;
    const months = Number(tagValue(referral, JAIL_MONTHS_TAG) ?? "0");
    next = followUp(
      next,
      charged,
      referral,
      PROSECUTION_SENTENCED_EVENT,
      `${name} pleaded guilty to ${offense} and was sentenced to ${months} months in jail.`,
      [`${JAIL_MONTHS_TAG}${months}`],
    );
  }
  return next;
}

/** The same day `months` later, or that month's last day when it is shorter. */
function addCalendarMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const index = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return isoDateFromParts(targetYear, targetMonth, Math.min(day, lastDay));
}

export interface JailTerm {
  readonly sentencedEventId: EntityId;
  readonly from: IsoDate;
  readonly until: IsoDate;
  readonly months: number;
}

/**
 * Jail terms a person has been sentenced to, oldest first. Read-only. The
 * term starts on the day of sentence.
 *
 * NOT BUILT: what serving it does. A person in jail still campaigns, holds
 * office and goes about their day; removal from office, disqualification from
 * the ballot and a life spent inside wait on the research above and on the
 * crime lane's custody work.
 */
export function jailTermsOf(
  world: World,
  personId: EntityId,
): readonly JailTerm[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === PROSECUTION_SENTENCED_EVENT &&
        event.participants.some((entry) => entry.personId === personId),
    )
    .map((event) => {
      const months = Number(tagValue(event, JAIL_MONTHS_TAG) ?? "0");
      return {
        sentencedEventId: event.id,
        from: event.occurredAt,
        until: addCalendarMonths(event.occurredAt, months),
        months,
      };
    });
}
