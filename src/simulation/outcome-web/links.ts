import linksJson from "../../../data/research/outcome-web/links.json" with { type: "json" };
import type {
  OutcomeLink,
  OutcomeLinksFile,
  OutcomeMeasureDefinition,
  OutcomeMeasureKey,
} from "./contract";
import { OUTCOME_MEASURES } from "./registry";

const SHAPES = new Set([
  "linear",
  "threshold",
  "diminishing",
  "exposure-years",
  "acute-decay",
  "moderated",
]);
const STRENGTHS = new Set([
  "strong",
  "moderate",
  "weak",
  "about-zero",
  "contested",
]);
const LANES = new Set(["A", "B", "C", "F", "G", "M", "O"]);

/**
 * Every problem with a links file, or an empty list. The rules are part 5's:
 * each link names defined measures, a known shape and strength; an about-zero
 * link is built as zero on purpose; the web never repeats a lane's direct
 * effect; no measure moves itself in the same month.
 */
export function outcomeLinkProblems(
  file: OutcomeLinksFile,
  measures: readonly OutcomeMeasureDefinition[] = OUTCOME_MEASURES,
): string[] {
  const problems: string[] = [];
  const defined = new Set(measures.map((row) => row.key));
  const ids = new Set<string>();
  const pairs = new Set<string>();
  const direct = new Set(
    file.directEffects.map((row) => `${row.from}->${row.to}`),
  );
  for (const link of file.links) {
    const where = `Link '${link.id}'`;
    if (ids.has(link.id)) problems.push(`${where} is listed twice.`);
    ids.add(link.id);
    if (link.from === link.to) problems.push(`${where} moves its own cause.`);
    for (const key of [link.from, link.to]) {
      if (!defined.has(key))
        problems.push(`${where} names '${key}', which no lane defines.`);
    }
    if (!SHAPES.has(link.shape))
      problems.push(`${where} has shape '${link.shape}'.`);
    if (!STRENGTHS.has(link.strength))
      problems.push(`${where} has strength '${link.strength}'.`);
    if (!LANES.has(link.ownerLane))
      problems.push(`${where} has owner '${link.ownerLane}'.`);
    if (link.effect !== "relative" && link.effect !== "points") {
      problems.push(`${where} has effect '${String(link.effect)}'.`);
    }
    if (link.strength === "about-zero") {
      if (link.size !== 0 || link.direction !== "none") {
        problems.push(
          `${where} is about zero, so its size is 0 and its direction none.`,
        );
      }
    } else if (link.direction === "none") {
      problems.push(`${where} has no direction but is not about zero.`);
    }
    if (link.size === null && link.provenance === "researched") {
      problems.push(`${where} is researched but has no size.`);
    }
    if (link.size !== null && (!Number.isFinite(link.size) || link.size < 0)) {
      problems.push(
        `${where} needs a size of 0 or more; direction carries the sign.`,
      );
    }
    if (!(link.lagMonths >= 0 && link.fullMonths >= link.lagMonths)) {
      problems.push(`${where} needs 0 <= lagMonths <= fullMonths.`);
    }
    if (link.shape === "threshold") {
      const t = link.thresholds ?? [];
      const s = link.slopes ?? [];
      if (t.length === 0 || t.length !== s.length) {
        problems.push(`${where} needs one slope per threshold.`);
      }
      if (t.some((value, index) => index > 0 && value <= t[index - 1]!)) {
        problems.push(`${where} needs rising thresholds.`);
      }
    }
    if (link.shape === "acute-decay" && !((link.decayMonths ?? 0) > 0)) {
      problems.push(`${where} needs decayMonths.`);
    }
    if (link.shape === "exposure-years" && !((link.maxYears ?? 0) > 0)) {
      problems.push(`${where} needs maxYears.`);
    }
    if (link.shape === "moderated") {
      if (!link.moderator) problems.push(`${where} needs a moderator.`);
      else if (!defined.has(link.moderator.measure)) {
        problems.push(
          `${where} is moderated by '${link.moderator.measure}', which no lane defines.`,
        );
      }
    }
    const pair = `${link.from}->${link.to}`;
    if (direct.has(pair)) {
      problems.push(
        `${where} repeats a direct effect (${pair}); the web carries only knock-on effects.`,
      );
    }
    const groupPair = `${pair}|${link.who}`;
    if (pairs.has(groupPair))
      problems.push(`${where} doubles another link for the same group.`);
    pairs.add(groupPair);
  }
  const cycle = sameMonthCycle(file.links);
  if (cycle)
    problems.push(
      `Measures move each other in the same month: ${cycle.join(" -> ")}.`,
    );
  return problems;
}

/** A loop of links with no lag, or null. */
function sameMonthCycle(
  links: readonly OutcomeLink[],
): OutcomeMeasureKey[] | null {
  const edges = new Map<OutcomeMeasureKey, OutcomeMeasureKey[]>();
  for (const link of links) {
    if (link.lagMonths > 0 || link.size === 0 || link.size === null) continue;
    edges.set(link.from, [...(edges.get(link.from) ?? []), link.to]);
  }
  const state = new Map<OutcomeMeasureKey, "open" | "done">();
  const path: OutcomeMeasureKey[] = [];
  const visit = (node: OutcomeMeasureKey): OutcomeMeasureKey[] | null => {
    if (state.get(node) === "open")
      return [...path.slice(path.indexOf(node)), node];
    if (state.get(node) === "done") return null;
    state.set(node, "open");
    path.push(node);
    for (const next of edges.get(node) ?? []) {
      const found = visit(next);
      if (found) return found;
    }
    path.pop();
    state.set(node, "done");
    return null;
  };
  for (const node of edges.keys()) {
    const found = visit(node);
    if (found) return found;
  }
  return null;
}

let loaded: OutcomeLinksFile | null = null;

/** The shared links table, checked once. A bad table is a build error. */
export function outcomeLinks(): OutcomeLinksFile {
  if (loaded) return loaded;
  const file = linksJson as unknown as OutcomeLinksFile;
  const problems = outcomeLinkProblems(file);
  if (problems.length > 0) {
    throw new Error(
      `The outcome links table is invalid:\n${problems.join("\n")}`,
    );
  }
  loaded = file;
  return file;
}

export function linksInto(
  file: OutcomeLinksFile,
  to: OutcomeMeasureKey,
): readonly OutcomeLink[] {
  return file.links.filter((link) => link.to === to);
}
