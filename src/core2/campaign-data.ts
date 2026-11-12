/**
 * The campaign engine's small shared pieces, in a file with no other module
 * imports so any module can read them while it loads: the stated-position
 * shape, the question a platform leads with, the campaign parameter table and
 * the list of policy questions. The lean and stance formulas that use them
 * stay in `campaign-views.ts`.
 */
import axes from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import federalAxes from "../../data/research/campaigns/federal-issue-axes-2026.json" with { type: "json" };
import parameters from "./data/campaigns/parameters.json" with { type: "json" };

/** One stated position: support (+1) or oppose (-1) a policy question. */
export interface Stance {
  readonly question: string;
  readonly position: number;
}

/**
 * The question a campaign leads with: the first of its platform it takes a
 * side on. A platform the engine chose (`candidatePlatform`) is kept in the
 * order of the platform rule's scores, so its first is the top score (the
 * question the most of the town shares at the conviction it is held with); a
 * player's is the order they stated it in. Every act that carries one
 * question (a donor meeting, an event, an ad, a mailer, an evening of doors)
 * and the mandate a result carries read it here.
 */
export function platformLead(platform: readonly Stance[]): Stance | undefined {
  // stopgapId: SG-GOV-platform-emphasis-lead-only (every act a campaign takes carries its lead alone, so all it chooses to say goes to one question, not shared over the platform by score as the research's emphasis share has it)
  return platform.find((s) => s.position !== 0);
}

export function campaignParameter(key: string): number {
  const row = (parameters as { parameters: Record<string, { value: number }> })
    .parameters[key];
  if (!row) throw new Error(`Unknown campaign parameter: ${key}`);
  return row.value;
}

/** A question's measured direction and how widely its "yes" is already backed. */
export interface QuestionAxis {
  readonly axis: number;
  readonly yesShare: number;
}

type AxisFile = { axes: Record<string, QuestionAxis> };

/**
 * Every policy question's left-right direction, as one map: the questions
 * states answer (measured across states, `issue-axes-2026.json`) and the ones
 * only federal law answers (measured from roll calls by party,
 * `federal-issue-axes-2026.json`). A question in both files is a data error.
 */
export const axisOf: Readonly<Record<string, QuestionAxis>> = (() => {
  const state = (axes as unknown as AxisFile).axes;
  const federal = (federalAxes as unknown as AxisFile).axes;
  const both = Object.keys(federal).filter((question) =>
    Object.hasOwn(state, question),
  );
  if (both.length > 0)
    throw new Error(`Question in both axis files: ${both.join(", ")}`);
  return { ...state, ...federal };
})();
export const PLATFORM_QUESTIONS: readonly string[] = Object.keys(axisOf).sort();
