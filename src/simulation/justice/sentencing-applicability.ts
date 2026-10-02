import { eventById } from "../event-index";
import type { EntityId, HistoricalEvent, World } from "../types";
import { eventsOfType, PROSECUTION_ENDED_EVENT } from "./jail-terms";

/** An allegation is a saved fact in this case, not a research-row default. */
export interface SentencingAllegation<T> {
  readonly value: T;
  readonly sourceEventIds: readonly EntityId[];
}

export interface SentencingAllegations {
  readonly weapon?: SentencingAllegation<boolean>;
  readonly injury?: SentencingAllegation<"bodily" | "serious">;
  readonly dwelling?: SentencingAllegation<boolean>;
  readonly damageMinorUnits?: SentencingAllegation<number>;
  /** Exact recorded charge grade; never inferred from a generic offense key. */
  readonly grade?: SentencingAllegation<string>;
}

export interface SentencingApplicability {
  readonly allegations: SentencingAllegations;
  readonly priorConvictionEventIds: readonly EntityId[];
}

const PREFIX = "justice.sentencing-applicability:";
const FIELDS = [
  "weapon",
  "injury",
  "dwelling",
  "damageMinorUnits",
  "grade",
] as const;

/** Existing event tags preserve one versioned referral snapshot in old saves. */
export function sentencingApplicabilityTags(
  world: World,
  personId: EntityId,
  basisEventIds: readonly EntityId[],
  allegations: SentencingAllegations = {},
): readonly string[] {
  const tags = [`${PREFIX}version:1`];
  for (const field of FIELDS) {
    const fact = allegations[field];
    if (!fact) continue;
    if (
      fact.sourceEventIds.length === 0 ||
      fact.sourceEventIds.some(
        (id) => !basisEventIds.includes(id) || !eventById(world, id),
      )
    )
      throw new Error(`Sentencing ${field} requires actual case-basis events.`);
    if (
      field === "damageMinorUnits" &&
      (!Number.isSafeInteger(fact.value) || Number(fact.value) < 0)
    )
      throw new Error(
        "Sentencing damage must be a nonnegative recorded minor-unit amount.",
      );
    tags.push(
      `${PREFIX}${field}:value:${encodeURIComponent(String(fact.value))}`,
    );
    for (const id of fact.sourceEventIds)
      tags.push(`${PREFIX}${field}:source:${id}`);
  }
  for (const event of eventsOfType(world, PROSECUTION_ENDED_EVENT)) {
    if (
      event.occurredAt <= world.currentDate &&
      event.participants.some(
        (p) => p.role === "focus:defendant" && p.personId === personId,
      ) &&
      (event.tags.includes("justice.outcome:convicted") ||
        event.tags.includes("justice.outcome:plea"))
    )
      tags.push(`${PREFIX}prior:${event.id}`);
  }
  return tags;
}

export function sentencingApplicabilityOf(
  world: World,
  referral: HistoricalEvent,
): SentencingApplicability {
  const allegations: Record<string, SentencingAllegation<unknown>> = {};
  for (const field of FIELDS) {
    const valueTag = referral.tags.find((tag) =>
      tag.startsWith(`${PREFIX}${field}:value:`),
    );
    if (!valueTag) continue;
    const raw = decodeURIComponent(
      valueTag.slice(`${PREFIX}${field}:value:`.length),
    );
    const sourceEventIds = referral.tags
      .filter((tag) => tag.startsWith(`${PREFIX}${field}:source:`))
      .map((tag) => tag.slice(`${PREFIX}${field}:source:`.length) as EntityId);
    if (
      !sourceEventIds.length ||
      sourceEventIds.some((id) => !eventById(world, id))
    )
      throw new Error(`Saved sentencing ${field} has no actual source.`);
    const value =
      field === "weapon" || field === "dwelling"
        ? raw === "true"
          ? true
          : raw === "false"
            ? false
            : undefined
        : field === "damageMinorUnits"
          ? Number(raw)
          : raw;
    if (
      value === undefined ||
      (field === "damageMinorUnits" &&
        (!Number.isSafeInteger(value) || Number(value) < 0))
    )
      throw new Error(`Invalid saved sentencing ${field}.`);
    allegations[field] = { value, sourceEventIds };
  }
  return {
    allegations: allegations as SentencingAllegations,
    priorConvictionEventIds: referral.tags
      .filter((tag) => tag.startsWith(`${PREFIX}prior:`))
      .map((tag) => tag.slice(`${PREFIX}prior:`.length) as EntityId)
      .filter((id) => {
        const prior = eventById(world, id);
        return (
          prior?.type === PROSECUTION_ENDED_EVENT &&
          prior.occurredAt <= referral.occurredAt &&
          prior.participants.some(
            (p) =>
              p.role === "focus:defendant" &&
              referral.participants.some(
                (s) => s.role === "focus:subject" && s.personId === p.personId,
              ),
          ) &&
          (prior.tags.includes("justice.outcome:convicted") ||
            prior.tags.includes("justice.outcome:plea"))
        );
      }),
  };
}
