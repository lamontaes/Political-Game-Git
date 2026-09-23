/**
 * Society-wide waves: a large movement that begins from recorded causes,
 * covers a place for a while, and presses on who moves there and, later, on
 * what people believe and which parties they follow.
 *
 * A wave is DATA: a definition with causes and effects. Its life in a save is
 * two public events, `migration.wave-began` and `migration.wave-ended`, so a
 * wave is read back from history rather than held as mutable state, and the
 * press can print both. Which causes are evaluated and which effects act is
 * spelled out per kind below; every unbuilt kind is kept on the definition,
 * reads as not met or not applied, and says so.
 */

import { addDays } from "../dates";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import { WAVE_BEGAN_EVENT, WAVE_ENDED_EVENT } from "./contract";

/**
 * What can start a wave.
 *
 * Built: `scenario` (only ever started by `startWave`, never evaluated) and
 * `unemployment-at-least`, which reads the macro record for the wave's place,
 * falling back to the national record.
 *
 * `unbuilt` is every real cause nobody has modeled yet: a court order, a
 * highway, federal mortgage rules, a plant closing, a revival preacher, a war.
 * It is kept so the definition says what the historical cause was, and it is
 * never met.
 */
export type WaveCause =
  | { readonly kind: "scenario" }
  | { readonly kind: "unemployment-at-least"; readonly pct: number }
  | {
      readonly kind: "unbuilt";
      readonly causeKey: string;
      readonly description: string;
    };

/**
 * What a wave does while it lasts.
 *
 * Built: the two migration pressures, which multiply the flat departure or
 * arrival chance for the place the wave covers.
 * Not built: belief and party effects, recorded and applied to nobody.
 */
export type WaveEffect =
  | { readonly kind: "departure-pressure"; readonly multiplier: number }
  | { readonly kind: "arrival-pressure"; readonly multiplier: number }
  | { readonly kind: "belief-shift"; readonly description: string }
  | { readonly kind: "party-pressure"; readonly description: string };

export interface WaveDefinition {
  readonly key: string;
  /** Player-facing name, in the words a newspaper would use. */
  readonly label: string;
  /** What the wave is, for a reader of the catalogue. Not player text. */
  readonly description: string;
  /** Any one met cause begins the wave. */
  readonly causes: readonly WaveCause[];
  readonly effects: readonly WaveEffect[];
  /** BLANKET: how long a wave lasts once begun. Not researched. */
  readonly durationDays: number;
  /** BLANKET: after ending, how long before the same wave may begin again in the same place. */
  readonly quietDays: number;
}

/**
 * The starting catalogue. Three shapes, one of each kind of wave the owner
 * named or implied. Every duration and multiplier here is BLANKET, pending
 * `society-wide-waves-causes-pace-scale`.
 */
export const WAVE_CATALOGUE: readonly WaveDefinition[] = [
  {
    key: "flight-from-the-city",
    label: "the exodus from the city",
    description:
      "Households leave a city for its suburbs and for other states. American white flight after 1950 had this shape, and its causes were specific: school desegregation orders, highways cut through neighborhoods, federal mortgage rules and blockbusting. Who moved was decided by race and income; here nobody is selected by group until that is researched.",
    causes: [
      {
        kind: "unbuilt",
        causeKey: "school-desegregation-order",
        description: "A court orders a district's schools desegregated.",
      },
      {
        kind: "unbuilt",
        causeKey: "highway-through-neighborhood",
        description: "A highway is built through a residential neighborhood.",
      },
      {
        kind: "unbuilt",
        causeKey: "mortgage-and-lending-rules",
        description:
          "Federal or bank lending rules favor new suburban homes over city homes.",
      },
      { kind: "scenario" },
    ],
    effects: [
      { kind: "departure-pressure", multiplier: 3 },
      { kind: "arrival-pressure", multiplier: 0.5 },
      {
        kind: "belief-shift",
        description:
          "Those who leave and those who stay come to see local government, schools and taxes differently.",
      },
      {
        kind: "party-pressure",
        description:
          "Suburban and city voters sort toward different parties over a generation.",
      },
    ],
    durationDays: 365 * 5,
    quietDays: 365 * 10,
  },
  {
    key: "jobs-gone-exodus",
    label: "the exodus after the jobs left",
    description:
      "People leave a place where work has dried up. The industrial Midwest in the late 1970s and 1980s is the shape. This is the one wave whose cause is built: it begins when the recorded unemployment for the town reaches the threshold.",
    causes: [
      { kind: "unemployment-at-least", pct: 9 },
      {
        kind: "unbuilt",
        causeKey: "major-employer-closes",
        description: "A large local employer closes or leaves.",
      },
      { kind: "scenario" },
    ],
    effects: [
      { kind: "departure-pressure", multiplier: 2 },
      { kind: "arrival-pressure", multiplier: 0.5 },
      {
        kind: "party-pressure",
        description:
          "Voters in a declining place turn against whoever they hold responsible.",
      },
    ],
    durationDays: 365 * 2,
    quietDays: 365 * 3,
  },
  {
    key: "religious-revival",
    label: "the revival",
    description:
      "A religious awakening spreads through a region: camp meetings, new congregations, and moral causes taken into politics, as the Great Awakenings did with temperance and abolition. It moves beliefs more than people.",
    causes: [
      {
        kind: "unbuilt",
        causeKey: "revival-leaders",
        description: "Preachers or movement leaders draw crowds and followers.",
      },
      {
        kind: "unbuilt",
        causeKey: "social-dislocation",
        description:
          "Rapid change, migration or hardship leaves people looking for meaning and community.",
      },
      { kind: "scenario" },
    ],
    effects: [
      {
        kind: "belief-shift",
        description:
          "More people hold religious convictions strongly, and moral questions weigh more in their politics.",
      },
      {
        kind: "party-pressure",
        description:
          "Converts carry new causes into existing parties, or found movements of their own.",
      },
    ],
    durationDays: 365 * 8,
    quietDays: 365 * 20,
  },
];

/** A wave as recorded in a save. */
export interface RecordedWave {
  readonly key: string;
  /** The place it covers; null for the whole nation. */
  readonly jurisdictionId: EntityId | null;
  readonly beganOn: IsoDate;
  readonly endsOn: IsoDate;
  readonly endedOn: IsoDate | null;
  readonly beganEventId: EntityId;
}

export function waveDefinition(key: string): WaveDefinition | undefined {
  return WAVE_CATALOGUE.find((definition) => definition.key === key);
}

/** Every wave the save records, oldest first. */
export function recordedWaves(world: World): readonly RecordedWave[] {
  const waves: RecordedWave[] = [];
  for (const event of world.history.events) {
    if (event.type === WAVE_BEGAN_EVENT) {
      waves.push({
        key: tag(event, "wave:")!,
        jurisdictionId: scopeOf(event),
        beganOn: event.occurredAt,
        endsOn: tag(event, "until:") as IsoDate,
        endedOn: null,
        beganEventId: event.id,
      });
    } else if (event.type === WAVE_ENDED_EVENT) {
      const began = tag(event, "began-event:");
      const index = waves.findIndex((wave) => wave.beganEventId === began);
      if (index >= 0)
        waves[index] = { ...waves[index]!, endedOn: event.occurredAt };
    }
  }
  return waves;
}

/** Waves under way on a date that cover a place (a national wave covers everywhere). */
export function activeWavesCovering(
  world: World,
  jurisdictionId: EntityId,
  waves: readonly RecordedWave[] = recordedWaves(world),
): readonly RecordedWave[] {
  return waves.filter(
    (wave) =>
      wave.endedOn === null &&
      (wave.jurisdictionId === null || wave.jurisdictionId === jurisdictionId),
  );
}

/** The combined multiplier a place's active waves put on a migration chance. */
export function wavePressure(
  active: readonly RecordedWave[],
  kind: "departure-pressure" | "arrival-pressure",
): { readonly multiplier: number; readonly waveKey: string | null } {
  let multiplier = 1;
  let strongest: { key: string; value: number } | null = null;
  for (const wave of active) {
    for (const effect of waveDefinition(wave.key)?.effects ?? []) {
      if (effect.kind !== kind) continue;
      multiplier *= effect.multiplier;
      if (
        effect.multiplier > 1 &&
        (!strongest || effect.multiplier > strongest.value)
      )
        strongest = { key: wave.key, value: effect.multiplier };
    }
  }
  return { multiplier, waveKey: strongest?.key ?? null };
}

export type CauseReading =
  | { readonly met: true; readonly because: string }
  | { readonly met: false; readonly because: string };

/** Whether one cause holds for a place today. Reads only; writes nothing. */
export function evaluateCause(
  world: World,
  cause: WaveCause,
  jurisdictionId: EntityId,
): CauseReading {
  switch (cause.kind) {
    case "scenario":
      return { met: false, because: "Begins only when a scenario starts it." };
    case "unemployment-at-least": {
      const record =
        macroConditionsAt(
          world,
          macroScopeForJurisdiction(jurisdictionId),
          world.currentDate,
        ) ?? macroConditionsAt(world, "national", world.currentDate);
      if (!record)
        return {
          met: false,
          because: "No unemployment figure is recorded yet.",
        };
      return record.unemploymentPct >= cause.pct
        ? {
            met: true,
            because: `Unemployment reached ${record.unemploymentPct}% against a threshold of ${cause.pct}%.`,
          }
        : {
            met: false,
            because: `Unemployment is ${record.unemploymentPct}%, below ${cause.pct}%.`,
          };
    }
    case "unbuilt":
      return {
        met: false,
        because: `The cause '${cause.causeKey}' is not modeled yet.`,
      };
  }
}

/**
 * One quarterly step of the waves covering a place: end the ones whose time is
 * up, begin any whose cause is met and that are not in their quiet period.
 * No integrity check (the runner owns it).
 */
export function stepWaves(world: World, jurisdictionId: EntityId): World {
  let next = world;
  const waves = recordedWaves(world);
  for (const wave of waves) {
    if (wave.endedOn === null && wave.endsOn <= next.currentDate)
      next = endWave(next, wave);
  }
  for (const definition of WAVE_CATALOGUE) {
    const here = waves.filter(
      (wave) =>
        wave.key === definition.key && wave.jurisdictionId === jurisdictionId,
    );
    const last = here.at(-1);
    if (last && last.endedOn === null && last.endsOn > next.currentDate)
      continue;
    const lastEnd = last ? (last.endedOn ?? last.endsOn) : null;
    if (lastEnd && addDays(lastEnd, definition.quietDays) > next.currentDate)
      continue;
    const reading = definition.causes
      .map((cause) => evaluateCause(next, cause, jurisdictionId))
      .find((entry) => entry.met);
    if (reading)
      next = beginWave(next, definition, jurisdictionId, reading.because);
  }
  return next;
}

/**
 * Begins a wave by hand: a scenario, a test, a future mod hook. Integrity is
 * asserted once. `jurisdictionId` null means the whole nation.
 */
export function startWave(
  world: World,
  key: string,
  jurisdictionId: EntityId | null,
  because: string,
): World {
  const definition = waveDefinition(key);
  if (!definition) throw new Error(`No wave is defined as '${key}'.`);
  if (jurisdictionId !== null && !world.jurisdictions[jurisdictionId])
    throw new Error("A wave must cover a place this world knows.");
  const next = beginWave(world, definition, jurisdictionId, because);
  assertWorldIntegrity(next);
  return next;
}

function beginWave(
  world: World,
  definition: WaveDefinition,
  jurisdictionId: EntityId | null,
  because: string,
): World {
  const date = world.currentDate;
  const endsOn = addDays(date, definition.durationDays);
  const place = jurisdictionId
    ? world.jurisdictions[jurisdictionId]!.name
    : "the country";
  return recordWorldEvent(world, {
    stableKey: `migration:wave:${definition.key}:${jurisdictionId ?? "national"}:${date}`,
    type: WAVE_BEGAN_EVENT,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId,
    involvedEntityIds: [jurisdictionId ?? world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `wave:${definition.key}`,
      `scope:${jurisdictionId ?? "national"}`,
      `until:${endsOn}`,
    ],
    summary: `The beginning of ${definition.label} in ${place}. ${because}`,
    context: {
      location: jurisdictionId
        ? { jurisdictionId, label: place, setting: null }
        : null,
      socialContext: null,
      pressure: because,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function endWave(world: World, wave: RecordedWave): World {
  const definition = waveDefinition(wave.key);
  const place = wave.jurisdictionId
    ? (world.jurisdictions[wave.jurisdictionId]?.name ?? "the place")
    : "the country";
  return recordWorldEvent(world, {
    stableKey: `migration:wave-ended:${wave.beganEventId}`,
    type: WAVE_ENDED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: wave.jurisdictionId,
    involvedEntityIds: [wave.jurisdictionId ?? world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `wave:${wave.key}`,
      `scope:${wave.jurisdictionId ?? "national"}`,
      `began-event:${wave.beganEventId}`,
    ],
    summary: `${capitalize(definition?.label ?? wave.key)} in ${place} has run its course.`,
    context: {
      location: wave.jurisdictionId
        ? { jurisdictionId: wave.jurisdictionId, label: place, setting: null }
        : null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function tag(event: HistoricalEvent, prefix: string): string | null {
  return (
    event.tags
      .find((entry) => entry.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  );
}

function scopeOf(event: HistoricalEvent): EntityId | null {
  return event.jurisdictionId;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
