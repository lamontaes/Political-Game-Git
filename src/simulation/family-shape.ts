import { ageOnDate } from "./dates";
import { stableHash } from "./ids";
import { spreadOf, type Spread } from "./sample-spread";
import type { EntityId, World } from "./types";

export interface DrawnFamilyShape {
  /** Actual saved pattern retained for downstream caregiver estimates. */
  readonly representative: RecordedFamilySample | null;
  readonly secondParent: boolean;
  readonly parentAgeGapYears: number;
  readonly siblingOffsetsYears: readonly number[];
  readonly grandparentAgesAtBirth: readonly [
    readonly [number | null, number | null],
    readonly [number | null, number | null],
  ];
  readonly estimate: ReturnType<typeof recordedFamilyEstimates>;
}

/** The current game's recorded two-parent share; no external distribution. */
export function worldTwoParentShare(world: World): Spread | null {
  return recordedFamilyEstimates(world).secondParent;
}

/**
 * Reuse a recorded family pattern from the game's observed spread, rather than
 * rolling a percentage or inventing a sibling ordering. Birth-year intervals
 * use the game's recorded averages, rounded only to the caller's whole-year
 * calendar representation. A missing age stays null, never an invented age.
 */
export function drawFamilyShape(
  world: World,
  personKey: string,
  estimate = recordedFamilyEstimates(world),
): DrawnFamilyShape {
  if (!personKey.trim())
    throw new Error("A family estimate needs its receiving person key.");
  // Bind a receiving key to an actual saved pattern. Retaining the observed
  // patterns carries the game's spread, rather than giving everyone its mean.
  const representative = estimate.samples.length
    ? estimate.samples[
        Number.parseInt(stableHash(personKey).slice(-8), 16) %
          estimate.samples.length
      ]
    : undefined;
  const gap = estimate.parentAgeGapYears?.mean;
  const generationAge = estimate.parentAgeAtChildBirth?.mean;
  const grandparentAge =
    generationAge === undefined ? null : Math.round(generationAge);
  return {
    representative: representative ?? null,
    secondParent: representative?.secondParent === 1 && gap !== undefined,
    parentAgeGapYears: gap === undefined ? 0 : Math.round(gap),
    siblingOffsetsYears: representative
      ? [...representative.siblingOffsetsYears].sort((a, b) => b - a)
      : [],
    grandparentAgesAtBirth: [
      [grandparentAge, grandparentAge],
      [grandparentAge, grandparentAge],
    ],
    estimate,
  };
}

/** A recorded family sample; dates belong to these saved people, never new births. */
export interface RecordedFamilySample {
  readonly personId: EntityId;
  readonly birthDate: World["currentDate"];
  readonly parentBirthDates: readonly World["currentDate"][];
  readonly siblingBirthDates: readonly World["currentDate"][];
  readonly parentIds: readonly EntityId[];
  readonly siblingIds: readonly EntityId[];
  readonly kinshipIds: readonly EntityId[];
  readonly secondParent: number;
  readonly siblingCount: number;
  readonly siblingOffsetsYears: readonly number[];
  readonly parentAgesAtChildBirth: readonly number[];
  readonly parentAgeGapYears: number | null;
}

/**
 * Current-game comparable families. Parent/child pairs are unordered in the
 * canonical record: the older saved person supplies the parent side. Samples
 * without any recorded parent are not evidence of a zero-parent family.
 */
export function recordedFamilyEstimates(world: World): {
  readonly asOf: World["currentDate"];
  readonly note: string;
  readonly samples: readonly RecordedFamilySample[];
  readonly secondParent: Spread | null;
  readonly siblingCount: Spread | null;
  readonly parentAgeGapYears: Spread | null;
  readonly parentAgeAtChildBirth: Spread | null;
  readonly siblingSpacingYears: Spread | null;
} {
  const parents = new Map<EntityId, Set<EntityId>>();
  const siblings = new Map<EntityId, Set<EntityId>>();
  const children = new Map<EntityId, Set<EntityId>>();
  const evidence = new Map<EntityId, Set<EntityId>>();
  const add = (
    map: Map<EntityId, Set<EntityId>>,
    key: EntityId,
    id: EntityId,
  ) => {
    const values = map.get(key) ?? new Set<EntityId>();
    values.add(id);
    map.set(key, values);
  };
  for (const row of world.history.kinshipRelationships) {
    if (row.establishedAt > world.currentDate) continue;
    const [a, b] = row.personIds.map((id) => world.people[id]);
    if (
      !a ||
      !b ||
      a.birthDate > world.currentDate ||
      b.birthDate > world.currentDate
    )
      continue;
    if (row.kind === "lineal:parent-child" && a.birthDate !== b.birthDate) {
      const [parent, child] = a.birthDate < b.birthDate ? [a, b] : [b, a];
      add(parents, child.id, parent.id);
      add(children, parent.id, child.id);
      add(evidence, child.id, row.id);
    } else if (row.kind === "collateral:sibling") {
      add(siblings, a.id, b.id);
      add(siblings, b.id, a.id);
      add(evidence, a.id, row.id);
      add(evidence, b.id, row.id);
    }
  }
  // Children sharing a recorded parent are siblings even when the canonical
  // writer only saved parent-child edges. Their dates and evidence stay saved.
  for (const ids of children.values()) {
    for (const childId of ids) {
      for (const siblingId of ids) {
        if (childId === siblingId) continue;
        add(siblings, childId, siblingId);
        for (const edgeId of evidence.get(siblingId) ?? [])
          add(evidence, childId, edgeId);
      }
    }
  }
  const samples = [...parents.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([personId, ids]) => {
      const parentIds = [...ids].sort();
      const siblingIds = [...(siblings.get(personId) ?? [])].sort();
      const ages = parentIds.map((id) =>
        ageOnDate(world.people[id]!.birthDate, world.currentDate),
      );
      return {
        personId,
        birthDate: world.people[personId]!.birthDate,
        parentBirthDates: parentIds.map((id) => world.people[id]!.birthDate),
        siblingBirthDates: siblingIds.map((id) => world.people[id]!.birthDate),
        parentIds,
        siblingIds,
        kinshipIds: [...(evidence.get(personId) ?? [])].sort(),
        secondParent: parentIds.length > 1 ? 1 : 0,
        siblingCount: siblingIds.length,
        siblingOffsetsYears: siblingIds.map((id) => {
          const birth = world.people[id]!.birthDate;
          const ownBirth = world.people[personId]!.birthDate;
          return birth <= ownBirth
            ? ageOnDate(birth, ownBirth)
            : -ageOnDate(ownBirth, birth);
        }),
        parentAgesAtChildBirth: parentIds.map((id) =>
          ageOnDate(
            world.people[id]!.birthDate,
            world.people[personId]!.birthDate,
          ),
        ),
        parentAgeGapYears:
          ages.length > 1 ? Math.max(...ages) - Math.min(...ages) : null,
      };
    });
  const gaps = samples.flatMap((row) =>
    row.parentAgeGapYears === null ? [] : [row.parentAgeGapYears],
  );
  const parentAges = samples.flatMap((row) => row.parentAgesAtChildBirth);
  const spacing = samples.flatMap((row) =>
    row.siblingOffsetsYears.map(Math.abs),
  );
  return {
    asOf: world.currentDate,
    note: "ESTIMATED: averaged from this game's recorded families, with their current game spread. Unrecorded relatives are not inferred absent; no birth dates are created.",
    samples,
    secondParent: samples.length
      ? spreadOf(samples.map((row) => row.secondParent))
      : null,
    siblingCount: samples.length
      ? spreadOf(samples.map((row) => row.siblingCount))
      : null,
    parentAgeGapYears: gaps.length ? spreadOf(gaps) : null,
    parentAgeAtChildBirth: parentAges.length ? spreadOf(parentAges) : null,
    siblingSpacingYears: spacing.length ? spreadOf(spacing) : null,
  };
}
