import { useMemo, useState } from "react";

import type { EntityId, World } from "../simulation";
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
  const votingMode =
    projection.preference?.votingMode ?? "prior-instructions-with-exceptions";
  const caseworkMode =
    projection.preference?.caseworkMode ?? "staff-routine-player-exceptions";

  function savePreferences(
    nextVoting = votingMode,
    nextCasework = caseworkMode,
  ) {
    const result = recordOfficeWorkflowPreference(world, {
      personId: playerPersonId,
      officeRelationshipId: seat.relationshipId,
      votingMode: nextVoting,
      caseworkMode: nextCasework,
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
    if (!projection.selectedMeasureId) {
      setError(
        "Open a bill through the ordinary office route before leaving an instruction.",
      );
      return;
    }
    const ensured =
      projection.preference === null
        ? recordOfficeWorkflowPreference(world, {
            personId: playerPersonId,
            officeRelationshipId: seat.relationshipId,
            votingMode,
            caseworkMode,
          })
        : { kind: "recorded" as const, world };
    if (ensured.kind === "refused") {
      setError(ensured.reason);
      return;
    }
    const result = recordOfficeVoteInstruction(ensured.world, {
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
      aria-label="Office onboarding"
    >
      <h3 className="office-onboarding-heading">How this office works</h3>
      <p className="office-onboarding-lede">
        {projection.membership.officeLabel}. Preferences stay with this office
        term. Opening this page does not vote, amend, or hire anyone.
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
              checked={votingMode === choice.mode}
              onChange={() => savePreferences(choice.mode, caseworkMode)}
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
              checked={caseworkMode === choice.mode}
              onChange={() => savePreferences(votingMode, choice.mode)}
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
        onClick={() => savePreferences(votingMode, caseworkMode)}
      >
        Record this office workflow
      </button>
      {projection.preference ? (
        <p data-testid="office-preference-recorded">
          Recorded for this office:{" "}
          {projection.preference.votingMode.replaceAll("-", " ")};{" "}
          {projection.preference.caseworkMode.replaceAll("-", " ")}.
        </p>
      ) : (
        <p data-testid="office-preference-absent">
          No workflow is recorded yet. Nothing will vote on opening, and nothing
          will vote because a suggestion is highlighted.
        </p>
      )}
      {projection.selectedMeasureId ? (
        <fieldset className="office-onboarding-fieldset">
          <legend>
            Standing instruction for {projection.measureDesignation}
          </legend>
          <p>
            Bound to this bill as it now reads. A later amendment or step voids
            it. S still owns whether a vote can actually be taken.
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
