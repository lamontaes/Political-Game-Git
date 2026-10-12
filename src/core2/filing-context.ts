/**
 * What a filing formula reads about one race: the office's annual salary
 * (`data/research/offices/official-salaries-2026.json`, estimates where not
 * read from a source) and the district's electorate from its 2024 vote.
 */
import salaries from "../../data/research/offices/official-salaries-2026.json" with { type: "json" };
import calibration from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { campaignParameter } from "./campaign-views";

type StateSalaries = Record<string, number | null | string | boolean>;
const data = salaries as unknown as {
  federal: Record<string, number | string>;
  states: Record<string, StateSalaries>;
  local: Record<string, number | string | boolean>;
};

/** The office's annual salary in dollars, and whether it's an estimate. */
export function officeSalary(
  stateKey: string,
  kind: string,
): { readonly dollars: number; readonly estimate: boolean } | null {
  const federal: Record<string, string> = {
    president: "president",
    "vice-president": "vicePresident",
    "us-senate": "senator",
    "us-house": "representative",
    "us-house-delegate": "delegate",
  };
  if (federal[kind])
    return { dollars: Number(data.federal[federal[kind]!]), estimate: false };
  const state = data.states[stateKey] ?? {};
  const estimate = state.estimate !== false;
  const statewide: Record<string, string> = {
    governor: "governor",
    "lieutenant-governor": "lieutenantGovernor",
    "attorney-general": "attorneyGeneral",
    "secretary-of-state": "secretaryOfState",
    treasurer: "treasurer",
  };
  const read = (key: string) =>
    typeof state[key] === "number" ? (state[key] as number) : null;
  if (statewide[kind]) {
    const v = read(statewide[kind]!);
    if (v !== null) return { dollars: v, estimate };
  }
  if (kind.startsWith("legislature-")) {
    const v = read("legislatorAnnual");
    return v !== null ? { dollars: v, estimate } : null;
  }
  // Other statewide offices (auditor, commissioners): the treasurer's pay.
  const other = read("treasurer");
  if (
    other !== null &&
    !kind.startsWith("county") &&
    kind !== "mayor" &&
    kind !== "council"
  )
    return { dollars: other, estimate: true };
  const local: Record<string, string> = {
    "county-board": "countyCommissionerMedian",
    mayor: "mayorMedian",
    council: "councilMemberMedian",
  };
  const key =
    local[kind] ??
    (kind.startsWith("county") ? "countyRowOfficerMedian" : null);
  return key ? { dollars: Number(data.local[key]), estimate: true } : null;
}

const stateVotes = new Map(
  (
    calibration as unknown as {
      presidentialByState: { stateUsps: string; totalVotes: number }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.totalVotes]),
);

/** Registered voters behind a count of votes cast (CPS 2024: voters over registered). */
export function registeredFromVotes(votes: number): number {
  return Math.round(votes / campaignParameter("votedShareOfRegistered"));
}

export function stateVotes2024(stateKey: string): number | null {
  return stateVotes.get(stateKey.slice(3)) ?? null;
}
