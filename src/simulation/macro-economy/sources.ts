import { crisisEnvelopesBetween, type CrisisEnvelope } from "../crisis/notices";
import { addDays, makeIsoDate } from "../dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import type { MacroShockKind } from "./policy";
import type { MacroScopeKey } from "./types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "./types";

/**
 * Canonical origins that may become macro shocks. Every origin is an
 * existing recorded event; nothing here reads a headline or a template.
 */
export interface MacroShockOrigin {
  readonly dedupeKey: string;
  readonly kind: MacroShockKind;
  readonly originEventId: EntityId;
  readonly geographyIds: readonly EntityId[];
  readonly scope: MacroScopeKey;
  readonly intensity: number;
  readonly beginsAt: IsoDate;
  readonly persistence: "geometric" | "until-origin-ends";
  readonly observedState: "public" | "not-public";
  readonly causalParents: readonly EntityId[];
}

export interface MacroShockEndSignal {
  readonly dedupeKey: string;
  readonly endEventId: EntityId;
  readonly endedAt: IsoDate;
}

export interface MacroOriginReader {
  readonly key: string;
  readonly origins: (
    world: World,
    throughDate: IsoDate,
  ) => readonly MacroShockOrigin[];
  readonly ends: (
    world: World,
    throughDate: IsoDate,
  ) => readonly MacroShockEndSignal[];
}

/** Authored ordinal → intensity mapping for importance-tagged origins. */
const IMPORTANCE_INTENSITY: Readonly<Record<string, number>> = {
  minor: 0.25,
  notable: 0.5,
  major: 1,
};

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/**
 * W3 international developments. Only subjects that actually describe an
 * economic disruption bind to a shock; the rest (fishing-rights talks) are
 * diplomatic and move nothing. Keyed by the W3 subject index as written by
 * living-world/developments.ts.
 */
const W3_INTERNATIONAL_SUBJECT_SHOCKS: Readonly<
  Record<string, MacroShockKind>
> = {
  // "Shipping delays were reported along a busy international trade route."
  "0": "trade-disruption",
};

export const W3_INTERNATIONAL_ORIGIN_READER: MacroOriginReader = {
  key: "living-world-w3-international",
  origins: (world, throughDate) =>
    world.history.events.flatMap((event) => {
      if (
        event.type !== "international.development-reported" ||
        event.occurredAt > throughDate
      )
        return [];
      const kind =
        W3_INTERNATIONAL_SUBJECT_SHOCKS[tagValue(event, "subject:") ?? ""];
      const matter = tagValue(event, "matter:");
      if (!kind || !matter) return [];
      return [
        {
          dedupeKey: `${MACRO_ECONOMY_CONTRACT_VERSION}:w3:${matter}`,
          kind,
          originEventId: event.id,
          geographyIds: [],
          scope: "national" as const,
          intensity:
            IMPORTANCE_INTENSITY[tagValue(event, "importance:") ?? ""] ?? 0.5,
          beginsAt: event.occurredAt,
          persistence: "until-origin-ends" as const,
          observedState:
            event.visibility === "public"
              ? ("public" as const)
              : ("not-public" as const),
          causalParents: [event.id],
        },
      ];
    }),
  ends: (world, throughDate) =>
    world.history.events.flatMap((event) => {
      if (
        event.type !== "international.development-eased" ||
        event.occurredAt > throughDate
      )
        return [];
      const matter = tagValue(event, "matter:");
      if (!matter) return [];
      return [
        {
          dedupeKey: `${MACRO_ECONOMY_CONTRACT_VERSION}:w3:${matter}`,
          endEventId: event.id,
          endedAt: event.occurredAt,
        },
      ];
    }),
};

const CRISIS_FROM = makeIsoDate("1900-01-01");

function crisisEnvelopes(world: World, through: IsoDate) {
  // CRISIS reads [from, to); CHANGE's through date is inclusive.
  return crisisEnvelopesBetween(world, CRISIS_FROM, addDays(through, 1));
}

function payloadNumber(envelope: CrisisEnvelope, key: string): number | null {
  const value = envelope.payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function observed(envelope: CrisisEnvelope): "public" | "not-public" {
  return envelope.visibility === "public" ? "public" : "not-public";
}

const disasterKey = (episodeId: EntityId, jurisdictionId: EntityId) =>
  `${MACRO_ECONOMY_CONTRACT_VERSION}:crisis:disaster:${episodeId}:${jurisdictionId}`;

/**
 * CRISIS typed envelopes (crisis-envelope-v1). Only physical disaster damage
 * and escalated international crises move the economy; aid decisions carry
 * no amount and repair progress only ends the disruption. A disaster acts on
 * each affected jurisdiction's own layer, never on the national record.
 */
export const CRISIS_ORIGIN_READER: MacroOriginReader = {
  key: "crisis-envelopes",
  origins: (world, throughDate) =>
    crisisEnvelopes(world, throughDate).flatMap((envelope) => {
      const intensity = payloadNumber(envelope, "intensity");
      if (intensity === null) return [];
      if (envelope.kind === "disaster-damage") {
        const episodeId = envelope.subjectIds[0];
        if (!episodeId) return [];
        return envelope.geographyIds.map((jurisdictionId) => ({
          dedupeKey: disasterKey(episodeId, jurisdictionId),
          kind: "disaster-reconstruction" as const,
          originEventId: envelope.originEventId,
          geographyIds: [jurisdictionId],
          scope: `jurisdiction:${jurisdictionId}` as const,
          intensity,
          beginsAt: envelope.effectiveMoment,
          persistence: "until-origin-ends" as const,
          observedState: observed(envelope),
          causalParents: [envelope.originEventId, ...envelope.causalParents],
        }));
      }
      if (envelope.kind === "international-conflict-spillover") {
        return [
          {
            dedupeKey: `${MACRO_ECONOMY_CONTRACT_VERSION}:crisis:conflict:${envelope.recordId}`,
            kind: "international-conflict-spillover" as const,
            originEventId: envelope.originEventId,
            geographyIds: [],
            scope: "national" as const,
            intensity,
            beginsAt: envelope.effectiveMoment,
            persistence: "geometric" as const,
            observedState: observed(envelope),
            causalParents: [envelope.originEventId, ...envelope.causalParents],
          },
        ];
      }
      return [];
    }),
  ends: (world, throughDate) =>
    crisisEnvelopes(world, throughDate).flatMap((envelope) => {
      const episodeId = envelope.subjectIds[0];
      if (
        envelope.kind !== "repair-progress" ||
        envelope.payload.status !== "ended" ||
        !episodeId
      )
        return [];
      return envelope.geographyIds.map((jurisdictionId) => ({
        dedupeKey: disasterKey(episodeId, jurisdictionId),
        endEventId: envelope.originEventId,
        endedAt: envelope.effectiveMoment,
      }));
    }),
};

export const MACRO_ORIGIN_READERS: readonly MacroOriginReader[] = [
  W3_INTERNATIONAL_ORIGIN_READER,
  CRISIS_ORIGIN_READER,
];
