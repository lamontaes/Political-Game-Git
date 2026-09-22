import { crisisEnvelopesBetween, type CrisisEnvelope } from "../crisis/notices";
import { addDays, makeIsoDate } from "../dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import {
  UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS,
  type MacroShockKind,
} from "./policy";
import { monthKeyOf } from "./store";
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
    crisisEnvelopes(world, throughDate).flatMap(
      (envelope): readonly MacroShockOrigin[] => {
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
              causalParents: [
                envelope.originEventId,
                ...envelope.causalParents,
              ],
            },
          ];
        }
        return [];
      },
    ),
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

/** Money a government actually paid out under a law or an appropriation. */
const PUBLIC_SPENDING_BASES: ReadonlySet<string> = new Set([
  "custom:public-program-commitment",
  "custom:authorized-public-payment",
  "custom:outside-mandate-payment",
]);
/** Tax a government actually collected under an enacted levy. */
const TAX_COLLECTION_BASES: ReadonlySet<string> = new Set([
  "custom:tax-collection",
]);

/**
 * Realized public money (ChatGPT C02): an enacted law reaches the economy
 * only through what it actually moves. A levy moves nothing until tax is
 * collected, and an appropriation moves nothing until a payment is made, so
 * this reads completed transfers, never enactment. Each jurisdiction's
 * payments and collections in one month become at most one shock per
 * channel, on that jurisdiction's own layer; a state's budget is not a share
 * of the national economy. Intensity is the month's total against an
 * UNRESEARCHED full-intensity amount; below one millionth of it, nothing.
 */
export const PUBLIC_MONEY_ORIGIN_READER: MacroOriginReader = {
  key: "realized-public-money",
  origins: (world, throughDate) => {
    const flows = new Map(
      world.history.resourceFlows.map((flow) => [flow.id, flow]),
    );
    const groups = new Map<
      string,
      {
        readonly kind: MacroShockKind;
        readonly jurisdictionId: EntityId;
        minorUnits: number;
        beginsAt: IsoDate;
        originEventId: EntityId;
        readonly eventIds: Set<EntityId>;
      }
    >();
    for (const outcome of world.history.resourceTransferOutcomes) {
      if (outcome.status !== "completed" || outcome.occurredAt > throughDate)
        continue;
      const flow = flows.get(outcome.resourceFlowId);
      if (!flow?.jurisdictionId) continue;
      const kind: MacroShockKind | null = PUBLIC_SPENDING_BASES.has(
        flow.basisKind,
      )
        ? "public-spending-paid"
        : TAX_COLLECTION_BASES.has(flow.basisKind)
          ? "tax-collections-paid"
          : null;
      if (!kind || outcome.transferredAmount.currency !== "USD") continue;
      const eventId =
        outcome.provenance.kind === "simulated-event"
          ? outcome.provenance.eventId
          : flow.provenance.kind === "simulated-event"
            ? flow.provenance.eventId
            : null;
      if (!eventId) continue;
      const key = `${kind}:${flow.jurisdictionId}:${monthKeyOf(outcome.occurredAt)}`;
      const group = groups.get(key);
      if (!group) {
        groups.set(key, {
          kind,
          jurisdictionId: flow.jurisdictionId,
          minorUnits: outcome.transferredAmount.minorUnits,
          beginsAt: outcome.occurredAt,
          originEventId: eventId,
          eventIds: new Set([eventId]),
        });
        continue;
      }
      group.minorUnits += outcome.transferredAmount.minorUnits;
      group.eventIds.add(eventId);
      if (outcome.occurredAt < group.beginsAt) {
        group.beginsAt = outcome.occurredAt;
        group.originEventId = eventId;
      }
    }
    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, group]): readonly MacroShockOrigin[] => {
        const intensity = Math.min(
          1,
          group.minorUnits / UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS,
        );
        if (intensity < 1e-6) return [];
        return [
          {
            dedupeKey: `${MACRO_ECONOMY_CONTRACT_VERSION}:public-money:${key}`,
            kind: group.kind,
            originEventId: group.originEventId,
            geographyIds: [group.jurisdictionId],
            scope: `jurisdiction:${group.jurisdictionId}` as const,
            intensity,
            beginsAt: group.beginsAt,
            persistence: "geometric" as const,
            observedState: "public" as const,
            causalParents: [...group.eventIds].sort(),
          },
        ];
      });
  },
  // A payment or a collection is complete when it happens; its effect then
  // fades geometrically rather than waiting for an end.
  ends: () => [],
};

export const MACRO_ORIGIN_READERS: readonly MacroOriginReader[] = [
  W3_INTERNATIONAL_ORIGIN_READER,
  CRISIS_ORIGIN_READER,
  PUBLIC_MONEY_ORIGIN_READER,
];
