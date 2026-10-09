import { readFileSync } from "node:fs";
import type { LifeFile } from "./contract";
import { REPLAY_API_VERSION, ZERO, parameterTable } from "./parameters";

export function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().startsWith(value)
  );
}

/** Fail closed at the data boundary; no unverifiable field becomes a world input. */
export function lifeProblems(life: LifeFile): string[] {
  const problems: string[] = [];
  if (life.version !== REPLAY_API_VERSION)
    problems.push(`Unsupported life schema: ${life.version}`);
  if (!life.id || !life.identity.value.name)
    problems.push("Missing life identity");
  const sourceIds = new Set<string>();
  for (const source of life.sources) {
    if (sourceIds.has(source.id))
      problems.push(`Duplicate source: ${source.id}`);
    sourceIds.add(source.id);
    if (
      ![
        source.id,
        source.title,
        source.publisher,
        source.location,
        source.kind,
      ].every(Boolean) ||
      !/^https:\/\//.test(source.url) ||
      !validDate(source.accessed)
    )
      problems.push(`Invalid public citation: ${source.id}`);
  }
  const refs = (key: string, values: string[]): void => {
    if (values.length === ZERO) problems.push(`${key}: missing citation`);
    for (const ref of values)
      if (!sourceIds.has(ref)) problems.push(`${key}: unknown source ${ref}`);
  };
  refs("identity", life.identity.sourceRefs);
  refs("birth", life.birth.sourceRefs);
  if (!validDate(life.birth.value.date)) problems.push("Invalid birth date");
  if (
    ![
      life.birth.value.place.key,
      life.birth.value.place.name,
      life.birth.value.place.stateCode,
      life.birth.value.place.country,
    ].every(Boolean)
  )
    problems.push("Missing birthplace");
  for (const row of life.family) refs("family", row.sourceRefs);
  refs("household", life.household.sourceRefs);
  for (const checkpoint of life.checkpoints) {
    refs(checkpoint.id, checkpoint.sourceRefs);
    if (!validDate(checkpoint.date) || checkpoint.date < life.birth.value.date)
      problems.push(`${checkpoint.id}: invalid checkpoint`);
  }
  const seen = new Set<string>();
  let previous = life.birth.value.date;
  for (const step of life.timeline) {
    if (seen.has(step.id)) problems.push(`Duplicate step: ${step.id}`);
    refs(step.id, step.sourceRefs);
    refs(`${step.id}:date`, step.date.sourceRefs);
    if (
      !["event", "decision", "outcome"].includes(step.kind) ||
      !step.mechanism
    )
      problems.push(`${step.id}: invalid mechanism or kind`);
    if (
      !validDate(step.date.earliest) ||
      !validDate(step.date.latest) ||
      step.date.earliest > step.date.latest ||
      step.date.earliest < previous
    )
      problems.push(`${step.id}: invalid chronological window`);
    if (
      !["day", "month", "year", "interval", "age-interval"].includes(
        step.date.precision,
      )
    )
      problems.push(`${step.id}: invalid date precision`);
    if (
      step.date.precision === "day" &&
      step.date.earliest !== step.date.latest
    )
      problems.push(`${step.id}: exact date has a window`);
    for (const dependency of step.requires)
      if (!seen.has(dependency))
        problems.push(`${step.id}: dependency must precede it: ${dependency}`);
    for (const range of step.ranges) {
      const minimum =
        range.minimumParameter && parameterTable[range.minimumParameter];
      const maximum =
        range.maximumParameter && parameterTable[range.maximumParameter];
      if (!minimum && !maximum)
        problems.push(`${step.id}: missing range bound`);
      if (
        (range.minimumParameter && !minimum) ||
        (range.maximumParameter && !maximum)
      )
        problems.push(`${step.id}: unknown range parameter`);
      if (minimum && maximum && minimum.value > maximum.value)
        problems.push(`${step.id}: inverted real range`);
    }
    seen.add(step.id);
    previous = step.date.earliest;
  }
  for (const input of life.conditions) {
    refs(input.id, input.sourceRefs);
    if (
      !validDate(input.fromDate) ||
      !validDate(input.throughDate) ||
      input.fromDate > input.throughDate
    )
      problems.push(`${input.id}: invalid condition dates`);
  }
  for (const unknown of life.unknowns)
    refs(unknown.field, unknown.checkedSources);
  const walk = (value: unknown, key: string): void => {
    if (typeof value === "number")
      problems.push(`${key}: numeric fact must reference the parameter table`);
    if (value && typeof value === "object")
      for (const [child, entry] of Object.entries(value)) {
        if (
          (child === "parameter" || child.endsWith("Parameter")) &&
          typeof entry === "string" &&
          !parameterTable[entry]
        )
          problems.push(`${key}.${child}: unknown parameter ${entry}`);
        walk(entry, `${key}.${child}`);
      }
  };
  walk(life, life.id);
  return problems;
}

export function readLife(path: string): LifeFile {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!value || typeof value !== "object")
    throw new Error("Life data must be an object");
  const life = value as LifeFile;
  let problems: string[];
  try {
    problems = lifeProblems(life);
  } catch {
    throw new Error(`Malformed life file: ${path}`);
  }
  if (problems.length !== ZERO) throw new Error(problems.join("\n"));
  return life;
}
