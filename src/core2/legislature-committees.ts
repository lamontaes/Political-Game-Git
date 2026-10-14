/**
 * The subject committees a legislative body refers bills to (data,
 * `committees.json`): a bill goes to the committee for what its first
 * section touches, by its catalog topic, its law series or a budget line.
 */
import data from "./data/legislature/committees.json" with { type: "json" };

interface CommitteeDef {
  readonly id: string;
  readonly topics: readonly string[];
  readonly series?: readonly string[];
  readonly budgetLines?: boolean;
}
const DEFS = (data as unknown as { committees: readonly CommitteeDef[] })
  .committees;
const FALLBACK = (data as unknown as { fallback: string }).fallback;

// stopgapId: SG-GOV-committee-names-national (one list of subject committees for every chamber)
/** Every subject committee, in the data's order. */
export const COMMITTEES: readonly string[] = DEFS.map((c) => c.id);

/** A catalog question's topic: "us-policy-positions:education.x" is "education". */
export function topicOf(question: string): string {
  return question.split(":")[1]?.split(".")[0] ?? "";
}

/** The committee for one section of a bill. */
export function committeeForSection(p: {
  readonly kind: string;
  readonly question?: string;
  readonly series?: string;
}): string {
  if (p.kind === "budget-line")
    return DEFS.find((c) => c.budgetLines)?.id ?? FALLBACK;
  if (p.series) {
    const bySeries = DEFS.find((c) => c.series?.includes(p.series!));
    if (bySeries) return bySeries.id;
  }
  const topic = topicOf(p.question ?? p.series ?? "");
  return DEFS.find((c) => c.topics.includes(topic))?.id ?? FALLBACK;
}

/** The catalog topics a committee hears. */
export function committeeTopics(committee: string): readonly string[] {
  return DEFS.find((c) => c.id === committee)?.topics ?? [];
}
