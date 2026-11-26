/**
 * How a person's life tells a change the jobs engine made (a hire, a layoff, a
 * quit, a retirement, a closing): one wording, read by the person's own list
 * (src/core2/person-life.ts) and by the jobs engine's history, so a job change
 * is told the same way however the history is read. Nothing here decides
 * anything; the jobs engine's reasons (data/jobs/jobs.json) say why a job
 * ended.
 */
import jobsData from "./data/jobs/jobs.json" with { type: "json" };

/** How the jobs engine's change kinds end a job, as the life record says it (`ended`), by kind and reason. */
export function jobEnding(kind: string, reasonKey: string): string | undefined {
  const reasons = jobsData.reasons;
  if (kind === "quit") return "quit";
  if (kind === "closure") return "closed";
  if (kind === "left-work") {
    if (reasonKey === reasons.retired) return "retired";
    if (reasonKey === reasons.movedAway) return "moved";
    if (reasonKey === reasons.died) return undefined;
    return "quit";
  }
  return undefined;
}

/**
 * A job change as a life tells it: a hire started a job, a layoff lost one,
 * and every other change that ended one ended it (`ended` says how). A change
 * a life does not tell (a death's) keeps the change's own kind.
 */
export function jobChangeWords(
  kind: string,
  reasonKey: string,
): { what: string; ended?: string } {
  if (kind === "hire") return { what: "job-started" };
  if (kind === "layoff") return { what: "job-lost" };
  const ended = jobEnding(kind, reasonKey);
  return ended ? { what: "job-ended", ended } : { what: kind };
}
