import content from "./data/content.json" with { type: "json" };
import { P } from "./parameters";
import { stopgap } from "./stopgaps";
import type {
  Affect,
  CoreEventInput,
  IsoDate,
  PersonState,
  Source,
} from "./types";

export interface AppraisalTraitContribution {
  traitId: string;
  recordedValue: number;
  normalizedValue: number;
  multiplierDelta: number;
  source: Source;
}

export interface AppraisalTraitDefinition {
  traitId: string;
  weightParameter: string;
  oneSided: boolean;
  stopgapId?: string;
}

export interface EventAppraisal {
  actorId: string;
  sourceEventId: string;
  source: Source;
  modelStopgapId: string;
  relationshipStrength: number;
  traitContributions: readonly AppraisalTraitContribution[];
  moodImpulse: number;
  stressImpulse: number;
  affect: Affect;
}

type AppraisalActor = Pick<
  PersonState,
  "id" | "traits" | "traitSources" | "source" | "affect"
>;

function numeric(
  params: Readonly<Record<string, number>>,
  key: string,
): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Missing or non-finite numeric affect parameter: ${key}`);
  }
  return value;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Non-finite ${label} cannot enter the affect model.`);
  }
  return value;
}

function dateTime(
  date: IsoDate,
  params: Readonly<Record<string, number>>,
): number {
  const time = Date.parse(date);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().split("T")[numeric(params, "zero")] !== date
  ) {
    throw new Error(`Affect requires a valid UTC date-only value: ${date}`);
  }
  return time;
}

function decay(
  current: number,
  baseline: number,
  elapsedDays: number,
  halfLifeDays: number,
  params: Readonly<Record<string, number>>,
): number {
  finite(current, "affect signal");
  finite(baseline, "ongoing affect baseline");
  if (
    !Number.isFinite(halfLifeDays) ||
    halfLifeDays <= numeric(params, "zero")
  ) {
    throw new Error("An affect half-life must be finite and positive.");
  }
  return finite(
    baseline +
      (current - baseline) *
        Math.exp(
          (-Math.log(numeric(params, "two")) * elapsedDays) / halfLifeDays,
        ),
    "projected affect signal",
  );
}

/**
 * Exact solution on an interval whose ongoing causes have not changed.
 * Signals remain affine: clamping each read would erase impulse size and make
 * the result depend on how often the actor was observed. A caller changing an
 * ongoing cause must first close the prior interval at that cause's date.
 */
export function affectAt(
  affect: Affect,
  date: IsoDate,
  params: Readonly<Record<string, number>> = P,
): Affect {
  stopgap("SG-P8-emotion-model");
  const elapsedMillis = dateTime(date, params) - dateTime(affect.at, params);
  if (elapsedMillis < numeric(params, "zero")) {
    throw new Error("Affect cannot be projected before its recorded anchor.");
  }
  const millisPerDay =
    numeric(params, "hoursPerDay") *
    numeric(params, "minutesPerHour") *
    numeric(params, "secondsPerMinute") *
    numeric(params, "millisecondsPerSecond");
  const elapsedDays = elapsedMillis / millisPerDay;
  return {
    ...affect,
    at: date,
    mood: decay(
      affect.mood,
      affect.moodBaseline,
      elapsedDays,
      numeric(params, "moodHalfLifeDays"),
      params,
    ),
    stress: decay(
      affect.stress,
      affect.stressBaseline,
      elapsedDays,
      numeric(params, "stressHalfLifeDays"),
      params,
    ),
  };
}

function traitContribution(
  actor: AppraisalActor,
  traitId: string,
  weightParameter: string,
  oneSided: boolean,
  params: Readonly<Record<string, number>>,
): AppraisalTraitContribution | undefined {
  const recordedValue = actor.traits[traitId];
  if (recordedValue === undefined) return undefined;
  finite(recordedValue, `recorded trait ${traitId}`);
  const scale = numeric(params, "traitScale");
  if (!Number.isFinite(scale) || scale <= numeric(params, "zero")) {
    throw new Error("A recorded trait scale must be finite and positive.");
  }
  const normalizedValue = Math.min(
    numeric(params, "one"),
    Math.max(
      oneSided ? numeric(params, "zero") : numeric(params, "negativeOne"),
      recordedValue / scale,
    ),
  );
  return {
    traitId,
    recordedValue,
    normalizedValue,
    multiplierDelta: normalizedValue * numeric(params, weightParameter),
    source: actor.traitSources?.[traitId] ?? actor.source,
  };
}

/**
 * Caller admits an event only when the actor experienced or learned it.
 * Explicit event impulses describe an authored/estimated appraisal input;
 * absence produces no invented impact. Default trait magnitudes are declared
 * prototype estimates, not causal sizes reported by psychological research.
 * Registered rows admit additional appraisal traits without changing the loop.
 * Per-trait provenance is preferred over the input packet's fallback source.
 */
export function appraiseEvent(
  actor: AppraisalActor,
  event: CoreEventInput,
  relationshipStrength: number,
  params: Readonly<Record<string, number>> = P,
  rows: readonly AppraisalTraitDefinition[] = content.appraisalTraits,
): EventAppraisal {
  const model = stopgap("SG-P8-emotion-model");
  const previous = affectAt(actor.affect, event.date, params);
  const rawMood = finite(
    event.moodImpulse ?? numeric(params, "zero"),
    "event mood impulse",
  );
  const rawStress = finite(
    event.stressImpulse ?? numeric(params, "zero"),
    "event stress impulse",
  );
  const closeness = Math.min(
    numeric(params, "one"),
    Math.max(
      numeric(params, "zero"),
      finite(relationshipStrength, "relationship strength"),
    ),
  );
  const traits: AppraisalTraitContribution[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.traitId)) {
      throw new Error(`Duplicate appraisal trait: ${row.traitId}`);
    }
    seen.add(row.traitId);
    if (row.stopgapId) stopgap(row.stopgapId);
    const contribution = traitContribution(
      actor,
      row.traitId,
      row.weightParameter,
      row.oneSided,
      params,
    );
    if (contribution) traits.push(contribution);
  }
  const relationGain =
    numeric(params, "one") +
    closeness * numeric(params, "appraisalRelationshipWeight");
  const distressGain = traits.reduce(
    (gain, row) => gain * (numeric(params, "one") + row.multiplierDelta),
    numeric(params, "one"),
  );
  const extraAdverseGain = distressGain - numeric(params, "one");
  const moodImpulse = finite(
    relationGain *
      (rawMood + Math.min(rawMood, numeric(params, "zero")) * extraAdverseGain),
    "appraised mood impulse",
  );
  const stressImpulse = finite(
    relationGain *
      (rawStress +
        Math.max(rawStress, numeric(params, "zero")) * extraAdverseGain),
    "appraised stress impulse",
  );

  return {
    actorId: actor.id,
    sourceEventId: event.id,
    source: event.source,
    modelStopgapId: model.id,
    relationshipStrength: closeness,
    traitContributions: traits,
    moodImpulse,
    stressImpulse,
    affect: {
      ...previous,
      mood: finite(previous.mood + moodImpulse, "resulting mood signal"),
      stress: finite(
        previous.stress + stressImpulse,
        "resulting stress signal",
      ),
    },
  };
}
