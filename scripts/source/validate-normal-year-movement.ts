/** Internal consistency check for the bounded Research 2 evidence packet.
 * Source truth is established by the cited primary publications, not this script.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type RecordValue = Record<string, unknown>;

const metricIds = [
  "unemployment",
  "prices",
  "gasoline",
  "president_approval",
  "governor_approval",
  "state_budget_balance",
];

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function near(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.000001;
}

export function validateNormalYearMovement(packet: unknown): string[] {
  const errors: string[] = [];
  if (!record(packet)) return ["packet must be an object"];
  if (packet.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!record(packet.sources)) errors.push("sources must be an object");
  if (!Array.isArray(packet.metrics)) errors.push("metrics must be an array");
  if (!record(packet.unknownContract)) {
    errors.push("unknownContract must be an object");
  } else if (
    packet.unknownContract.status !== "UNKNOWN" ||
    packet.unknownContract.value !== null
  ) {
    errors.push("unknownContract must preserve UNKNOWN with a null value");
  }
  if (errors.length) return errors;

  const sources = packet.sources as RecordValue;
  for (const [id, source] of Object.entries(sources)) {
    if (
      !record(source) ||
      typeof source.publisher !== "string" ||
      typeof source.title !== "string" ||
      typeof source.locator !== "string" ||
      typeof source.url !== "string" ||
      !source.url.startsWith("https://")
    ) {
      errors.push(`source ${id} lacks publisher, title, HTTPS URL, or locator`);
    }
  }

  const seenIds = new Set<string>();
  for (const metric of packet.metrics as unknown[]) {
    if (!record(metric) || typeof metric.id !== "string") {
      errors.push("each metric needs an id");
      continue;
    }
    const id = metric.id;
    if (seenIds.has(id)) errors.push(`duplicate metric ${id}`);
    seenIds.add(id);
    if (!metricIds.includes(id)) errors.push(`unexpected metric ${id}`);
    for (const field of [
      "place",
      "measure",
      "unit",
      "denominator",
      "cadence",
      "limits",
    ]) {
      if (typeof metric[field] !== "string" || !metric[field]) {
        errors.push(`${id} needs ${field}`);
      }
    }
    if (
      metric.movementMode !== "level_difference" &&
      metric.movementMode !== "reported_growth_rate"
    ) {
      errors.push(`${id} has invalid movementMode`);
    }
    if (id === "prices" && metric.movementMode !== "reported_growth_rate") {
      errors.push("prices must use reported_growth_rate");
    }
    if (id !== "prices" && metric.movementMode !== "level_difference") {
      errors.push(`${id} must use level_difference`);
    }
    if (!Array.isArray(metric.observations) || metric.observations.length < 2) {
      errors.push(`${id} needs at least two observations`);
      continue;
    }
    const observations = new Map<string, number>();
    for (const observation of metric.observations) {
      if (
        !record(observation) ||
        typeof observation.period !== "string" ||
        !finite(observation.value) ||
        typeof observation.sourceId !== "string" ||
        !sources[observation.sourceId]
      ) {
        errors.push(`${id} has an invalid observation or source reference`);
        continue;
      }
      if (observations.has(observation.period)) {
        errors.push(`${id} repeats observation ${observation.period}`);
      }
      observations.set(observation.period, observation.value);
      if (
        metric.unit === "percentage_points" &&
        (observation.value < 0 || observation.value > 100)
      ) {
        errors.push(`${id} approval or unemployment level must be 0-100`);
      }
    }
    if (!Array.isArray(metric.movements) || metric.movements.length === 0) {
      errors.push(`${id} needs measured movements`);
      continue;
    }
    const changes: number[] = [];
    for (const movement of metric.movements) {
      if (
        !record(movement) ||
        typeof movement.fromPeriod !== "string" ||
        typeof movement.toPeriod !== "string" ||
        !finite(movement.change)
      ) {
        errors.push(`${id} has an invalid movement`);
        continue;
      }
      const to = observations.get(movement.toPeriod);
      const from = observations.get(movement.fromPeriod);
      if (
        to === undefined ||
        (metric.movementMode === "level_difference" && from === undefined)
      ) {
        errors.push(`${id} movement has a missing observation`);
        continue;
      }
      const expected =
        metric.movementMode === "reported_growth_rate" ? to : to - from!;
      if (!near(movement.change, expected)) {
        errors.push(
          `${id} movement ${movement.fromPeriod} to ${movement.toPeriod} has wrong change`,
        );
      }
      changes.push(movement.change);
    }
    if (
      !record(metric.observedRange) ||
      !finite(metric.observedRange.min) ||
      !finite(metric.observedRange.max) ||
      !near(metric.observedRange.min, Math.min(...changes)) ||
      !near(metric.observedRange.max, Math.max(...changes))
    ) {
      errors.push(`${id} observedRange does not match measured movements`);
    }
  }
  for (const id of metricIds) {
    if (!seenIds.has(id)) errors.push(`missing metric ${id}`);
  }
  return errors;
}

if (process.argv[1]?.endsWith("validate-normal-year-movement.ts")) {
  const path = resolve(
    "data/research/normal-year-movement/movement-evidence.json",
  );
  const errors = validateNormalYearMovement(
    JSON.parse(readFileSync(path, "utf8")),
  );
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(
      "Research 2 movement packet: six metrics and internal calculations valid.",
    );
  }
}
