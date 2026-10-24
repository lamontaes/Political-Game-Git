/**
 * Whether a serving incumbent stands again: the base reason, less what their
 * age takes from it, and their calibrated trait lean toward standing over
 * retiring (voting.stand-again). Candidacy asks it of a contest's incumbent;
 * the voting engine's stand-in filing asks it where candidacy is not
 * installed.
 */
import { campaignParameter } from "./campaign-views";
import { leanedYes } from "./trait-decisions";
import type { CoreAPI, PersonState } from "./types";

const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

export function standsAgain(
  api: CoreAPI,
  incumbent: Readonly<PersonState>,
): boolean {
  return leanedYes(
    api.state,
    incumbent,
    "voting.stand-again",
    "stand",
    "retire",
    standAgainReason(api, incumbent),
  );
}

/** The reasons to stand again before personality: the base, less the weight of age past the pivot. */
export function standAgainReason(
  api: CoreAPI,
  incumbent: Readonly<PersonState>,
): number {
  return (
    campaignParameter("votingStandAgainBase") -
    campaignParameter("votingStandAgainAgeWeight") *
      Math.min(
        1,
        Math.max(
          0,
          (ageOn(incumbent, api.state.date) -
            campaignParameter("votingStandAgainAgePivot")) /
            campaignParameter("votingStandAgainAgeSpan"),
        ),
      )
  );
}
