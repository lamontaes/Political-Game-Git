import type { IsoDate } from "../../simulation/types";
import type { StateCandidateSeatPlan } from "../../simulation/nationwide-world/state-legislature-candidates";
import type {
  officeQualifications,
  QualificationOfficeFamily,
} from "../../simulation/office-qualification-rules";
import type { CandidateQualificationRuleSet } from "../../simulation/candidate-qualification";
import type { StandInQualification } from "../../simulation/office-qualification-profile";
import { assessCandidateQualification } from "../offices/candidate-qualification";
import { ageOnDate } from "../offices/calendar";
import { drawsSelfStarter } from "./self-starter";
export interface CandidateStandingFacts {
  readonly person: { readonly birthDate: IsoDate };
  readonly stateSince: IsoDate | null;
  readonly districtSince: IsoDate | null;
  readonly rules: CandidateQualificationRuleSet | null;
  readonly family: QualificationOfficeFamily | null;
  readonly supportedRows: ReturnType<typeof officeQualifications>;
  readonly drawn: StandInQualification | null;
}
export function selfStarterParties(
  plan: StateCandidateSeatPlan,
): readonly string[] {
  if (!plan.nomination || plan.democraticShare === null) return [];
  const share = plan.democraticShare;
  return (["democratic", "republican"] as const).filter((party) =>
    drawsSelfStarter({
      plan: plan.nomination!,
      intakeDate: plan.intakeDate,
      party,
      incumbentParty: plan.incumbentParty,
      incumbentSeeking: plan.incumbentSeeking,
      partyShare: party === "democratic" ? share : 1 - share,
    }),
  );
}

export function satisfiesKnownQualifications(
  facts: CandidateStandingFacts,
  plan: StateCandidateSeatPlan,
): boolean {
  const person = facts.person;
  const stateSince = facts.stateSince;
  const districtSince = facts.districtSince;
  const rules = facts.rules;
  const assessment = rules
    ? assessCandidateQualification(rules, {
        birthDate: person.birthDate,
        onDate: plan.intakeDate,
        stateResidenceSince: stateSince,
        districtResidenceSince: districtSince,
      })
    : null;
  if (
    assessment &&
    assessment.refusals.some((refusal) => refusal.kind !== "unresolved-rule")
  )
    return false;
  const family = facts.family;
  if (!family) return true;
  const supported = facts.supportedRows.filter(
    (row) =>
      row.temporalApplicability.state === "SUPPORTED" &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "number",
  );
  for (const row of supported) {
    const years = row.value as number;
    if (
      row.field === "MINIMUM_AGE" &&
      ageOnDate(person.birthDate, plan.intakeDate) < years
    )
      return false;
    if (
      row.field === "STATE_RESIDENCE" &&
      (stateSince === null || ageOnDate(stateSince, plan.intakeDate) < years)
    )
      return false;
    if (
      row.field === "DISTRICT_RESIDENCE" &&
      (districtSince === null ||
        ageOnDate(districtSince, plan.intakeDate) < years)
    )
      return false;
  }
  if (plan.usesGeneratedResidencyRule) {
    const drawn = facts.drawn;
    if (
      drawn &&
      (stateSince === null ||
        ageOnDate(stateSince, plan.intakeDate) < drawn.value)
    )
      return false;
  }
  return true;
}
