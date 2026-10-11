import type { IsoDate } from "./calendar";
import type { NominationPlan } from "../../simulation/nominations/nomination-rules";
import { ELECTION_PARAMETERS } from "./parameters";
const NOMINATION_FIELD_PROFILE = {
  favoredShare: ELECTION_PARAMETERS.selfStarterFavoredShare.value,
};
export function drawsSelfStarter(input: {
  readonly plan: NominationPlan;
  readonly intakeDate: IsoDate;
  readonly party: string;
  readonly incumbentParty: string | null;
  readonly incumbentSeeking: boolean;
  readonly partyShare: number | null;
}): boolean {
  return (
    input.plan.known &&
    input.plan.primaryDate > input.intakeDate &&
    !(input.incumbentSeeking && input.incumbentParty === input.party) &&
    (input.partyShare ?? 0) >= NOMINATION_FIELD_PROFILE.favoredShare
  );
}
