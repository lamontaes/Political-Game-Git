import type { EntityId, IsoDate, World } from "../../../types";
import { recordPlaceOutcomeLawExposure } from "../../../law-exposure";
import {
  LW26_ENVIRONMENT_LANDING_ROWS,
  rankRecordedExposureEvent,
} from "./rows";
import type { PlaceOutcomeRecord } from "../../../outcome-web/place-outcome-store";

export {
  accumulatedExposureByPerson,
  LW26_ENVIRONMENT_LANDING_ROWS,
  rankAsthmaRecipientsByRecordedExposure,
  rankByRecordedExposure,
  rankRecordedExposureEvent,
} from "./rows";

/** Local contract stub matching the approved Session 20 landing shape. */
export interface PlaceOutcomeExposureInput {
  readonly person: EntityId;
  readonly lawKey: string;
  /** Actual saved enactment or in-force identity for `lawKey`. */
  readonly measureId: EntityId;
  readonly cause: EntityId;
  readonly kind: "EXPOSURE" | "FLAG" | "AMOUNT" | "EVENT";
  readonly value: number;
  readonly month: IsoDate;
}

export interface PlaceOutcomeLandingContext {
  readonly world: World;
  readonly month: IsoDate;
  readonly records: readonly PlaceOutcomeRecord[];
  /** People with a proved residence in the record's jurisdiction that month. */
  readonly residentsByJurisdiction: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly residenceJurisdictionByPerson: ReadonlyMap<EntityId, EntityId>;
  /** Only laws active in the place for this month appear in this map. */
  readonly inForceLawMeasures: ReadonlyMap<
    string,
    ReadonlyMap<EntityId, EntityId>
  >;
}

/**
 * STUB until Session 20 publishes the generic landing receiver contract.
 * This receiver deliberately accepts only named residents and saved place
 * records; it creates no aggregate person and no synthetic event.
 */
export function landEnvironmentPlaceOutcomes(
  context: PlaceOutcomeLandingContext,
): World {
  let world = context.world;
  for (const row of LW26_ENVIRONMENT_LANDING_ROWS) {
    for (const record of context.records) {
      if (record.measure !== row.measure || !record.id) continue;
      const measureId = context.inForceLawMeasures
        .get(row.lawKey)
        ?.get(record.jurisdictionId);
      if (!measureId) continue;
      let value = record.value;
      let namedResidents =
        context.residentsByJurisdiction.get(record.jurisdictionId) ?? [];
      if (record.stateKey === undefined) {
        // A state value is the remainder after any cities or counties with
        // their own measure record. Those residents receive the local row.
        value = record.restValue ?? record.value;
        const localJurisdictions = new Set(
          context.records
            .filter(
              (local) =>
                local.measure === record.measure &&
                local.stateKey === record.placeKey,
            )
            .map((local) => local.jurisdictionId),
        );
        namedResidents = namedResidents.filter(
          (person) =>
            !localJurisdictions.has(
              context.residenceJurisdictionByPerson.get(person)!,
            ),
        );
      }
      for (const person of namedResidents) {
        world = recordPlaceOutcomeLawExposure(world, {
          person,
          lawKey: row.lawKey,
          measureId,
          cause: record.id,
          kind: row.kind,
          value,
          month: context.month,
        });
      }
    }
  }
  return world;
}

/** Registry export required by the generated folder-module loader. */
export const lawConsequenceLw26EnvironmentLandingsRegistrations = [] as const;

/** STUB until the shared generated manifest admits generic place landings. */
export const placeOutcomeLandings = [
  {
    key: "lw26-environment-landings",
    run: landEnvironmentPlaceOutcomes,
    rankEventRecipients: rankRecordedExposureEvent,
  },
] as const;
