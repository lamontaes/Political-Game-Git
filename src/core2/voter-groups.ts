import { moduleData, moduleKey, moduleSource } from "./module-data";
import type { CoreState, Source } from "./types";

export interface VoterDimensionV1 {
  /** Count of the represented group, including people with no opinion. */
  populationSize: number;
  opinionSize: number;
  mean: number | null;
  variance: number | null;
  strength: number;
}
export interface VoterGroupViewsV1 {
  schemaVersion: "voter-group-views/v1";
  values: Readonly<Record<string, VoterDimensionV1>>;
  issues: Readonly<Record<string, VoterDimensionV1>>;
}
export interface VoterViewSummaryV1 {
  populationSize: number;
  opinionSize: number;
  missingSize: number;
  mean: number | null;
  variance: number | null;
  strength: number | null;
  opinionShare: number | null;
}
export interface VoterViewSpreadV1 {
  id: string;
  placeId: string;
  ageBand?: string;
  target: "value" | "issue";
  key: string;
  metric: "mean" | "variance" | "strength" | "opinionShare";
  bounds: readonly [number, number];
  source: Source;
}

export interface VoterGroup {
  id: string;
  placeId: string;
  ageBand: string;
  /** A continuous recorded political position in [-1, 1], never a party assignment. */
  lean: number;
  /** Recorded aggregate participation in [0, 1], never an individual probability. */
  turnout: number;
  /** Unnamed eligible voters only; named people remain in the individual route. */
  size: number;
  asOf: string;
  source: Source;
  sourceRecordIds: readonly string[];
  /** Optional versioned distributions. Legacy lean and turnout keep their existing meanings. */
  views?: VoterGroupViewsV1;
}
export interface VoterSpread {
  id: string;
  placeId: string;
  ageBand?: string;
  asOf: string;
  turnout?: readonly [number, number];
  lean?: readonly [number, number];
  size?: readonly [number, number];
  source: Source;
}
export interface VoterGroupSummary {
  groupCount: number;
  size: number;
  participatingSize: number;
  turnout: number | null;
  lean: number | null;
}
export interface VoterSpreadCheck {
  spreadId: string;
  observed: VoterGroupSummary;
  comparisons: readonly {
    metric: "turnout" | "lean" | "size";
    value: number | null;
    minimum: number;
    maximum: number;
    status: "within" | "outside" | "missing";
  }[];
  source: Source;
}
export interface VoterGroups {
  put(row: VoterGroup): void;
  get(id: string): VoterGroup | undefined;
  remove(id: string): boolean;
  atPlace(placeId: string, ageBand?: string): readonly VoterGroup[];
  summarize(placeId: string, ageBand?: string): VoterGroupSummary;
  check(spread: VoterSpread): VoterSpreadCheck;
}
interface Groups {
  rows: Map<string, VoterGroup>;
  byPlace: Map<string, Set<string>>;
  byPlaceAge: Map<string, Set<string>>;
}
const registries = new WeakMap<CoreState, Groups>();
function ageKey(place: string, age: string): string {
  return JSON.stringify([place, age]);
}
function range(value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error("Voter group value is outside its finite range.");
}
function validateViews(views: VoterGroupViewsV1, size: number): void {
  if (views.schemaVersion !== "voter-group-views/v1")
    throw new Error("Unsupported voter-group views version.");
  for (const dimensions of [views.values, views.issues]) {
    if (
      !dimensions ||
      typeof dimensions !== "object" ||
      Array.isArray(dimensions)
    )
      throw new Error("Voter-group dimensions require records.");
    for (const [id, row] of Object.entries(dimensions)) {
      moduleKey(id);
      if (
        row.populationSize !== size ||
        !Number.isSafeInteger(row.opinionSize) ||
        row.opinionSize < 0 ||
        row.opinionSize > size
      )
        throw new Error(
          "Voter-group opinion counts do not match its population.",
        );
      range(row.strength, 0, 1);
      if (!row.opinionSize) {
        if (row.mean !== null || row.variance !== null || row.strength !== 0)
          throw new Error(
            "No opinion is distinct from a neutral measured opinion.",
          );
      } else {
        if (typeof row.mean !== "number" || typeof row.variance !== "number")
          throw new Error("Held group opinions need moments.");
        range(row.mean, -1, 1);
        range(row.variance, 0, 1);
        if (row.variance > 1 - row.mean * row.mean + Number.EPSILON * 4)
          throw new Error(
            "Voter-group variance is incompatible with bounded opinions.",
          );
      }
    }
  }
}

/** Aggregate supplied causal records without assigning an individual opinion or drawing a group. */
export function summarizeVoterGroupViewsV1(
  rows: readonly VoterGroup[],
  target: "value" | "issue",
  key: string,
): Readonly<VoterViewSummaryV1> {
  moduleKey(key);
  if (target !== "value" && target !== "issue")
    throw new Error("Unknown voter view target.");
  let populationSize = 0,
    opinionSize = 0,
    missingSize = 0,
    total = 0,
    squares = 0,
    strength = 0;
  for (const group of rows) {
    populationSize += group.size;
    const row = (
      target === "value" ? group.views?.values : group.views?.issues
    )?.[key];
    if (!row) {
      missingSize += group.size;
      continue;
    }
    opinionSize += row.opinionSize;
    if (row.opinionSize) {
      total += row.opinionSize * row.mean!;
      squares += row.opinionSize * (row.variance! + row.mean! * row.mean!);
      strength += row.opinionSize * row.strength;
    }
  }
  if (
    ![populationSize, opinionSize, missingSize].every(Number.isSafeInteger) ||
    ![total, squares, strength].every(Number.isFinite)
  )
    throw new Error("Voter view aggregate exceeds numeric precision.");
  const mean = opinionSize ? total / opinionSize : null;
  return Object.freeze({
    populationSize,
    opinionSize,
    missingSize,
    mean,
    variance:
      mean === null ? null : Math.max(0, squares / opinionSize - mean * mean),
    strength: opinionSize ? strength / opinionSize : null,
    opinionShare: populationSize ? opinionSize / populationSize : null,
  });
}

export function checkVoterGroupViewsV1(
  core: CoreState,
  input: VoterViewSpreadV1,
) {
  const spread = moduleData(input);
  moduleKey(spread.id);
  moduleSource(spread.source, core.date);
  if (spread.source.tag !== "SOURCED")
    throw new Error("Voter view checks require sourced reference spreads.");
  if (
    !["mean", "variance", "strength", "opinionShare"].includes(spread.metric) ||
    !Array.isArray(spread.bounds) ||
    spread.bounds.length !== 2 ||
    spread.bounds[0] > spread.bounds[1]
  )
    throw new Error("Invalid voter view bounds.");
  spread.bounds.forEach((value) =>
    range(value, spread.metric === "mean" ? -1 : 0, 1),
  );
  const observed = summarizeVoterGroupViewsV1(
    voterGroups(core).atPlace(spread.placeId, spread.ageBand),
    spread.target,
    spread.key,
  );
  const value = observed[spread.metric];
  const status =
    observed.missingSize || value === null
      ? "missing"
      : value >= spread.bounds[0] && value <= spread.bounds[1]
        ? "within"
        : "outside";
  return Object.freeze({
    spreadId: spread.id,
    observed,
    metric: spread.metric,
    value,
    status,
    source: spread.source,
  });
}
function index(map: Map<string, Set<string>>, key: string, id: string): void {
  let ids = map.get(key);
  if (!ids) map.set(key, (ids = new Set()));
  ids.add(id);
}
function unindex(map: Map<string, Set<string>>, key: string, id: string): void {
  const ids = map.get(key)!;
  ids.delete(id);
  if (!ids.size) map.delete(key);
}
export function voterGroups(core: CoreState): VoterGroups {
  const rows = (place: string, age?: string): readonly VoterGroup[] => {
    moduleKey(place);
    if (age !== undefined) moduleKey(age);
    const g = registries.get(core),
      ids =
        age === undefined
          ? g?.byPlace.get(place)
          : g?.byPlaceAge.get(ageKey(place, age));
    return Object.freeze([...(ids ?? [])].map((id) => g!.rows.get(id)!));
  };
  const summary = (place: string, age?: string): VoterGroupSummary => {
    const selected = rows(place, age);
    let size = 0,
      participatingSize = 0,
      leanTotal = 0;
    for (const row of selected) {
      size += row.size;
      participatingSize += row.size * row.turnout;
      leanTotal += row.size * row.lean;
    }
    if (
      !Number.isSafeInteger(size) ||
      !Number.isFinite(participatingSize) ||
      !Number.isFinite(leanTotal)
    )
      throw new Error("Voter group aggregate exceeds numeric precision.");
    return Object.freeze({
      groupCount: selected.length,
      size,
      participatingSize,
      turnout: size ? participatingSize / size : null,
      lean: size ? leanTotal / size : null,
    });
  };
  return Object.freeze({
    put(input: VoterGroup) {
      const row = moduleData(input);
      [row.id, row.placeId, row.ageBand].forEach(moduleKey);
      range(row.lean, -1, 1);
      range(row.turnout, 0, 1);
      if (
        !Number.isSafeInteger(row.size) ||
        row.size < 0 ||
        row.asOf > core.date
      )
        throw new Error("Invalid dated voter-group size.");
      moduleSource(row.source, core.date);
      // Source date and group date are distinct: actual group state may evolve after the prior.
      moduleSource({ ...row.source, asOf: row.asOf }, core.date);
      if (!Array.isArray(row.sourceRecordIds) || !row.sourceRecordIds.length)
        throw new Error("Voter group requires causal source record keys.");
      row.sourceRecordIds.forEach(moduleKey);
      if (row.views !== undefined) validateViews(row.views, row.size);
      let g = registries.get(core);
      if (!g)
        registries.set(
          core,
          (g = { rows: new Map(), byPlace: new Map(), byPlaceAge: new Map() }),
        );
      const old = g.rows.get(row.id);
      if (old) {
        unindex(g.byPlace, old.placeId, old.id);
        unindex(g.byPlaceAge, ageKey(old.placeId, old.ageBand), old.id);
      }
      g.rows.set(row.id, row);
      index(g.byPlace, row.placeId, row.id);
      index(g.byPlaceAge, ageKey(row.placeId, row.ageBand), row.id);
    },
    get(id: string) {
      return registries.get(core)?.rows.get(moduleKey(id));
    },
    remove(id: string) {
      const g = registries.get(core),
        row = g?.rows.get(moduleKey(id));
      if (!g || !row) return false;
      unindex(g.byPlace, row.placeId, id);
      unindex(g.byPlaceAge, ageKey(row.placeId, row.ageBand), id);
      g.rows.delete(id);
      return true;
    },
    atPlace: rows,
    summarize: summary,
    check(input: VoterSpread): VoterSpreadCheck {
      const spread = moduleData(input);
      moduleKey(spread.id);
      moduleSource(spread.source, core.date);
      if (spread.source.tag !== "SOURCED")
        throw new Error("Voter checks require sourced reference spreads.");
      moduleSource({ ...spread.source, asOf: spread.asOf }, core.date);
      const observed = summary(spread.placeId, spread.ageBand);
      const comparisons: VoterSpreadCheck["comparisons"][number][] = [];
      for (const metric of ["turnout", "lean", "size"] as const) {
        const bounds = spread[metric];
        if (!bounds) continue;
        if (
          !Array.isArray(bounds) ||
          bounds.length !== 2 ||
          bounds[0] > bounds[1]
        )
          throw new Error("Invalid voter spread bounds.");
        const minimum = metric === "lean" ? -1 : 0,
          maximum = metric === "size" ? Number.MAX_SAFE_INTEGER : 1;
        bounds.forEach((value) => range(value, minimum, maximum));
        const value = observed.groupCount ? observed[metric] : null;
        comparisons.push(
          Object.freeze({
            metric,
            value,
            minimum: bounds[0],
            maximum: bounds[1],
            status:
              value === null
                ? "missing"
                : value >= bounds[0] && value <= bounds[1]
                  ? "within"
                  : "outside",
          }),
        );
      }
      if (!comparisons.length)
        throw new Error("Voter spread has no measured bounds.");
      return Object.freeze({
        spreadId: spread.id,
        observed,
        comparisons: Object.freeze(comparisons),
        source: spread.source,
      });
    },
  });
}
