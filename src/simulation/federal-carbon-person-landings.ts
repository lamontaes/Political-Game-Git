// PLACEHOLDER(research: federal-person-law-estimates): Area PM2.5 is an estimated resident exposure, with median recorded area where measurements are absent.
import estimate from "../../data/research/housing/federal-person-air-estimate.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { hasStableKey } from "./history-index";
import { currentLifeCutoff } from "./life-queries";
import { recordLawExposure } from "./law-exposure";
import { outcomeFactor } from "./outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  placeOutcomeRecordId,
} from "./outcome-web/place-outcome-store";
import { isPersonAliveAt } from "./vitality-integrity";
import { recordWorldEvent } from "./world";
import type { EntityId, IsoDate, World } from "./types";

export const POWER_PLANT_CARBON_QUESTION =
  "us-federal-positions:energy-environment.limit-power-plant-carbon";
const PARTICULATES = "env.particulates";
const LINK = "power-plant-carbon-to-particulates";
export const PERSONAL_AIR_ESTIMATE = estimate.estimatedFrom;

/** Record the law's change in a resident's ambient exposure, never an invented illness or death. */
export function recordCarbonLawPersonalExposure(
  world: World,
  onDate: IsoDate,
): World {
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === POWER_PLANT_CARBON_QUESTION,
  );
  if (!proposition || onDate > world.currentDate) return world;
  const operative = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
  );
  // The opening baseline is already in each area's measured concentration.
  // Only a subsequently enacted carbon law adds a new personal law landing.
  if (
    operative?.answer !== "yes" ||
    !world.history.legislativeMeasures?.some(
      (row) => row.id === operative.measureId,
    )
  )
    return world;
  const readings = new Map<
    EntityId,
    {
      value: number;
      withoutLaw: number;
      sourceId: EntityId | null;
      measureId: EntityId;
    } | null
  >();
  const values = Object.values(PLACE_OUTCOME_BASES[PARTICULATES]!.places).sort(
    (a, b) => a - b,
  );
  const median =
    (values[Math.floor((values.length - 1) / 2)]! +
      values[Math.floor(values.length / 2)]!) /
    2;
  let next = world;
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || !isPersonAliveAt(world, personId, currentLifeCutoff(world)))
      continue;
    const place = person.homeJurisdictionId;
    if (!readings.has(place)) {
      const law = lawInForce(world, place, proposition.id, onDate);
      const saved = placeOutcomeAt(world, PARTICULATES, place, onDate);
      const fallback = saved
        ? null
        : outcomeFactor(world, place, PARTICULATES, onDate);
      const model = saved ?? {
        value: median * fallback!.multiplier,
        causes: fallback!.causes,
      };
      const factor = model.causes.find((cause) => cause.key === LINK)?.factor;
      readings.set(
        place,
        law?.answer === "yes" &&
          factor !== undefined &&
          factor > 0 &&
          factor < 1 &&
          Number.isFinite(model.value)
          ? {
              value: model.value,
              withoutLaw: model.value / factor,
              sourceId: saved ? placeOutcomeRecordId(saved) : null,
              measureId: law.measureId,
            }
          : null,
      );
    }
    const reading = readings.get(place);
    if (!reading) continue;
    const stableKey = `carbon-person:${reading.measureId}:${personId}:${onDate.slice(0, 7)}`;
    if (hasStableKey(next.history.events, stableKey)) continue;
    next = recordWorldEvent(next, {
      stableKey,
      type: "environment.personal-air-exposure",
      occurredAt: onDate,
      recordedAt: world.currentDate,
      jurisdictionId: place,
      involvedEntityIds: [personId, reading.measureId],
      participants: [
        {
          personId,
          role: "focus:subject",
          detail: POWER_PLANT_CARBON_QUESTION,
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      summary: proposition.name,
      tags: [
        POWER_PLANT_CARBON_QUESTION,
        `pm25:${reading.value}`,
        `without-law-pm25:${reading.withoutLaw}`,
        `estimatedFrom:${PERSONAL_AIR_ESTIMATE}`,
        ...(reading.sourceId ? [`source:${reading.sourceId}`] : []),
      ],
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    next = recordLawExposure(next, {
      stableKey: `${stableKey}:exposure`,
      personId,
      measureId: reading.measureId,
      sectionKey: POWER_PLANT_CARBON_QUESTION,
      channel: "benefit",
      direction: "gain",
      amount: null,
      cadence: null,
      sourceRecordId: next.history.events.at(-1)!.id,
      includeFamily: false,
    });
  }
  return next;
}
