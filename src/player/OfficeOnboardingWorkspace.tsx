import { useEffect, useMemo, useState } from "react";

import type {
  EntityId,
  OfficeCaseworkWorkflowMode,
  OfficeVotingWorkflowMode,
  World,
} from "../simulation";
import {
  recordOfficeBriefingInspection,
  recordOfficeVoteInstruction,
  recordOfficeWorkflowPreference,
} from "../simulation";
import {
  OFFICE_CASEWORK_CHOICES,
  OFFICE_INSTRUCTION_CHOICES,
  OFFICE_VOTING_CHOICES,
  projectOfficeOnboarding,
} from "../presentation/office-onboarding";
import "./office-onboarding.css";

export interface OfficeOnboardingWorkspaceProps {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly selectedMeasureId?: EntityId | null;
  readonly onWorldChange: (world: World) => void;
}

export function OfficeOnboardingWorkspace({
  world,
  playerPersonId,
  selectedMeasureId = null,
  onWorldChange,
}: OfficeOnboardingWorkspaceProps) {
  const projection = useMemo(
    () => projectOfficeOnboarding(world, playerPersonId, selectedMeasureId),
    [world, playerPersonId, selectedMeasureId],
  );
  const [error, setError] = useState<string | null>(null);
  const [openItemId, setOpenItemId] = useState<EntityId | null>(null);
  const [stagedVoting, setStagedVoting] =
    useState<OfficeVotingWorkflowMode | null>(
      projection.preference?.votingMode ?? null,
    );
  const [stagedCasework, setStagedCasework] =
    useState<OfficeCaseworkWorkflowMode | null>(
      projection.preference?.caseworkMode ?? null,
    );

  useEffect(() => {
    setStagedVoting(projection.preference?.votingMode ?? null);
    setStagedCasework(projection.preference?.caseworkMode ?? null);
  }, [projection.preference?.id]);

  if (projection.membership.kind === "unseated") {
    return (
      <section
        className="office-onboarding"
        data-testid="office-onboarding"
        aria-label="Office onboarding"
      >
        <p data-testid="office-onboarding-unseated">
          {projection.membership.reason}
        </p>
      </section>
    );
  }

  const seat = projection.membership.seat;

  function savePreferences() {
    if (!stagedVoting || !stagedCasework) {
      setError(
        "Choose a voting workflow and a casework workflow, then record them.",
      );
      return;
    }
    const result = recordOfficeWorkflowPreference(world, {
      personId: playerPersonId,
      officeRelationshipId: seat.relationshipId,
      votingMode: stagedVoting,
      caseworkMode: stagedCasework,
    });
    if (result.kind === "refused") {
      setError(result.reason);
      return;
    }
    setError(null);
    onWorldChange(result.world);
  }

  function saveInstruction(
    disposition: (typeof OFFICE_INSTRUCTION_CHOICES)[number]["disposition"],
  ) {
    if (!projection.preference) {
      setError(
        "Record how this office handles votes and casework before leaving a standing instruction.",
      );
      return;
    }
    if (!projection.selectedMeasureId) {
      setError(
        "Open a bill through the ordinary office route before leaving an instruction.",
      );
      return;
    }
    const result = recordOfficeVoteInstruction(world, {
      personId: playerPersonId,
      officeRelationshipId: seat.relationshipId,
      chamberKey: seat.chamberKey,
      measureId: projection.selectedMeasureId,
      disposition,
    });
    if (result.kind === "refused") {
      setError(result.reason);
      return;
    }
    setError(null);
    onWorldChange(result.world);
  }

  function inspectItem(itemId: EntityId, kind: "amendment" | "filed-section") {
    if (!projection.selectedMeasureId) return;
    setOpenItemId(itemId);
    const result = recordOfficeBriefingInspection(world, {
      personId: playerPersonId,
      officeRelationshipId: seat.relationshipId,
      measureId: projection.selectedMeasureId,
      itemKind: kind,
      itemId,
    });
    if (result.kind === "recorded" && result.world !== world) {
      onWorldChange(result.world);
    }
  }

  return (
    <section
      className="office-onboarding"
      data-testid="office-onboarding"
      data-briefing-role={projection.briefing.role}
      data-recommendation-status={projection.briefing.recommendationStatus}
      data-executed-delegation={String(projection.briefing.executedDelegation)}
      aria-label="Office onboarding"
    >
      <h3 className="office-onboarding-heading">How this office works</h3>
      <p className="office-onboarding-lede">
        {projection.membership.officeLabel}. Preferences stay with this office
        term. Opening this page does not vote, amend, or finish casework.
      </p>
      <fieldset className="office-onboarding-fieldset">
        <legend>Voting workflow</legend>
        {OFFICE_VOTING_CHOICES.map((choice) => (
          <label key={choice.mode} className="office-onboarding-choice">
            <input
              type="radio"
              name="office-voting-mode"
              value={choice.mode}
              data-testid={`office-voting-${choice.mode}`}
              checked={stagedVoting === choice.mode}
              onChange={() => {
                setStagedVoting(choice.mode);
                setError(null);
              }}
            />
            <span>
              <strong>
                {choice.label}
                {choice.proposedDefault ? " (suggested)" : ""}
              </strong>
              <span>{choice.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="office-onboarding-fieldset">
        <legend>Constituent casework</legend>
        {OFFICE_CASEWORK_CHOICES.map((choice) => (
          <label key={choice.mode} className="office-onboarding-choice">
            <input
              type="radio"
              name="office-casework-mode"
              value={choice.mode}
              data-testid={`office-casework-${choice.mode}`}
              checked={stagedCasework === choice.mode}
              onChange={() => {
                setStagedCasework(choice.mode);
                setError(null);
              }}
            />
            <span>
              <strong>{choice.label}</strong>
              <span>{choice.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        className="ui-action"
        data-testid="office-record-workflow"
        onClick={savePreferences}
      >
        Record this office workflow
      </button>
      {projection.preference ? (
        <p data-testid="office-preference-recorded">
          Recorded for this office:{" "}
          {projection.preference.votingMode.replaceAll("-", " ")};{" "}
          {projection.preference.caseworkMode.replaceAll("-", " ")}. Recording
          this does not cast a vote or finish constituent work.
        </p>
      ) : (
        <p data-testid="office-preference-absent">
          No workflow is recorded yet. Choosing an option here does not save it
          until you record it.
        </p>
      )}
      {projection.selectedMeasureId ? (
        <fieldset className="office-onboarding-fieldset">
          <legend>
            Standing instruction for {projection.measureDesignation}
          </legend>
          <p>
            Bound to this bill as it now reads. A later amendment or step voids
            it. This instruction is not a recorded vote.
          </p>
          {OFFICE_INSTRUCTION_CHOICES.map((choice) => (
            <button
              key={choice.disposition}
              type="button"
              className="ui-action"
              data-testid={`office-instruction-${choice.disposition}`}
              onClick={() => saveInstruction(choice.disposition)}
            >
              {choice.label}
            </button>
          ))}
          {projection.instructionStatus?.kind === "armed" ? (
            <p data-testid="office-instruction-armed">
              Instruction on file for this text:{" "}
              {projection.instructionStatus.instruction.disposition}. It is not
              a recorded vote.
            </p>
          ) : projection.instructionStatus?.kind === "refused" ? (
            <p
              data-testid="office-instruction-refused"
              data-refusal-code={projection.instructionStatus.code}
            >
              {projection.instructionStatus.reason}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <p data-testid="office-no-measure">
          Take up a bill through the ordinary office docket to leave a standing
          instruction.
        </p>
      )}
      <section data-testid="office-staff-briefing">
        <h4 className="office-onboarding-subheading">Staff briefing</h4>
        <p data-testid="office-staff-summary">
          {projection.briefing.packageSummary}
        </p>
        <p data-testid="office-briefing-not-adoption">
          {projection.briefing.openingIsNotAdoption}
        </p>
        <p data-testid="office-briefing-not-recommendation">
          No recommended package is offered until a supported assessment exists.
        </p>
        {projection.briefing.kind === "no-staff" ? (
          <p data-testid="office-no-staff">
            {projection.briefing.packageLabel}
          </p>
        ) : (
          <ul className="office-onboarding-staff">
            {projection.briefing.staff.map((member) => (
              <li key={member.personId}>
                {member.name}, {member.title}
              </li>
            ))}
          </ul>
        )}
        {projection.briefing.items.length > 0 ? (
          <ul className="office-onboarding-items">
            {projection.briefing.items.map((item) => (
              <li key={item.itemId}>
                <button
                  type="button"
                  className="ui-action"
                  data-testid={`office-briefing-item-${item.itemId}`}
                  data-access-status={item.access.status}
                  aria-expanded={openItemId === item.itemId}
                  onClick={() => inspectItem(item.itemId, item.kind)}
                >
                  Inspect {item.heading}
                </button>
                {openItemId === item.itemId ? (
                  <p data-testid={`office-briefing-detail-${item.itemId}`}>
                    {item.known
                      ? item.summary
                      : (item.unknownReason ?? item.summary)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {error ? (
        <p role="status" data-testid="office-onboarding-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
