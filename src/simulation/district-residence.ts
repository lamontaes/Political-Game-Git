/**
 * District residence intervals and seat bindings.
 *
 * Gazetteer identities are looked up; membership is recorded only from an
 * explicit establishment, move, or player selection. World stepping does not
 * resample these records. Old saves without intervals stay UNKNOWN.
 */

import { districtIdentityCatalog } from "../districts/catalog";
import {
  gazetteerChamberForOfficeChamberKey,
  resolveDistrictBinding,
} from "../districts/query";
import type { ElectiveOfficeOption } from "./candidacy-packs";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import type {
  DistrictResidenceInterval,
  DistrictResidenceProvenance,
  DistrictSeatBinding,
  EntityId,
  IsoDate,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

export interface EstablishDistrictResidenceInput {
  readonly personId: EntityId;
  readonly binding: DistrictSeatBinding;
  readonly startedOn: string;
  readonly provenance: DistrictResidenceProvenance;
}

export type DistrictResidenceWriteResult =
  | {
      readonly kind: "recorded";
      readonly world: World;
      readonly interval: DistrictResidenceInterval;
    }
  | {
      readonly kind: "refused";
      readonly reason: string;
      readonly world: World;
    };

export function districtResidenceIntervals(
  world: World,
): readonly DistrictResidenceInterval[] {
  return world.history.districtResidenceIntervals ?? [];
}

export function bindOfficeToDistrict(
  option: ElectiveOfficeOption,
  binding: DistrictSeatBinding,
  expectedStateUsps: string | null,
):
  | { readonly kind: "bound"; readonly option: ElectiveOfficeOption }
  | { readonly kind: "refused"; readonly reason: string } {
  const chamberKey = option.officeKey.split(":").at(-1) ?? "";
  const expectedChamber = gazetteerChamberForOfficeChamberKey(chamberKey);
  if (expectedChamber === null) {
    return {
      kind: "refused",
      reason:
        "This office has no Gazetteer chamber mapping, so the game will not attach a district identity to it.",
    };
  }
  const resolved = resolveDistrictBinding(districtIdentityCatalog(), binding, {
    chamber: expectedChamber,
    ...(expectedStateUsps ? { stateUsps: expectedStateUsps } : {}),
  });
  if (resolved.kind === "refused") {
    return { kind: "refused", reason: resolved.reason };
  }
  return {
    kind: "bound",
    option: {
      ...option,
      office: {
        ...option.office,
        districtBinding: resolved.binding,
      },
    },
  };
}

export function districtResidenceSince(
  world: World,
  personId: EntityId,
  binding: DistrictSeatBinding,
  onDate: IsoDate,
): IsoDate | null {
  const resolved = resolveDistrictBinding(districtIdentityCatalog(), binding);
  if (resolved.kind === "refused") return null;
  const covering = districtResidenceIntervals(world)
    .filter(
      (interval) =>
        interval.personId === personId &&
        interval.binding.recordId === resolved.binding.recordId &&
        interval.binding.vintage === resolved.binding.vintage &&
        interval.binding.compilerVersion === resolved.binding.compilerVersion &&
        interval.startedOn <= onDate &&
        (interval.endedOn === null || interval.endedOn > onDate),
    )
    .sort((left, right) => left.startedOn.localeCompare(right.startedOn));
  return covering[0]?.startedOn ?? null;
}

/**
 * Record an explicit district-residence interval. The start date must be
 * supplied by the establishment/move/selection event. Birthplace, state
 * residence and interior points are not inputs.
 */
export function establishDistrictResidence(
  world: World,
  input: EstablishDistrictResidenceInput,
): DistrictResidenceWriteResult {
  const person = world.people[input.personId];
  if (!person) {
    return {
      kind: "refused",
      reason:
        "District residence cannot be recorded for somebody who is not in the world.",
      world,
    };
  }
  const startedOn = makeIsoDate(input.startedOn);
  if (startedOn > world.currentDate) {
    return {
      kind: "refused",
      reason: "District residence cannot start after the current world date.",
      world,
    };
  }
  const resolved = resolveDistrictBinding(
    districtIdentityCatalog(),
    input.binding,
  );
  if (resolved.kind === "refused") {
    return { kind: "refused", reason: resolved.reason, world };
  }
  const binding = resolved.binding;
  const openSameChamber = districtResidenceIntervals(world).filter(
    (interval) =>
      interval.personId === input.personId &&
      interval.binding.chamber === binding.chamber &&
      interval.endedOn === null,
  );
  let nextIntervals = [...districtResidenceIntervals(world)];
  for (const open of openSameChamber) {
    if (
      open.binding.recordId === binding.recordId &&
      open.binding.vintage === binding.vintage
    ) {
      return {
        kind: "refused",
        reason:
          "This character already has an open residence interval in that district.",
        world,
      };
    }
    if (startedOn < open.startedOn) {
      return {
        kind: "refused",
        reason:
          "A later district residence cannot start before the still-open interval it would replace.",
        world,
      };
    }
    nextIntervals = nextIntervals.map((interval) =>
      interval.id === open.id ? { ...interval, endedOn: startedOn } : interval,
    );
  }

  const interval: DistrictResidenceInterval = {
    id: createStableId(
      "district-residence",
      `${world.id}:district-residence:${input.personId}:${binding.recordId}:${startedOn}`,
    ),
    stableKey: `district-residence:${input.personId}:${binding.recordId}:${startedOn}`,
    sequence: world.history.nextSequence,
    personId: input.personId,
    binding,
    startedOn,
    endedOn: null,
    provenance: {
      method: input.provenance.method,
      sourceEventId: input.provenance.sourceEventId,
      note: input.provenance.note,
    },
  };
  if (
    nextIntervals.some((existing) => existing.stableKey === interval.stableKey)
  ) {
    return {
      kind: "refused",
      reason: "That district-residence interval is already recorded.",
      world,
    };
  }
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      districtResidenceIntervals: [...nextIntervals, interval],
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next, interval };
}

export function bindElectiveOfficeOption(
  option: ElectiveOfficeOption,
  binding: DistrictSeatBinding,
  expectedStateUsps: string | null,
): ReturnType<typeof bindOfficeToDistrict> {
  return bindOfficeToDistrict(option, binding, expectedStateUsps);
}
