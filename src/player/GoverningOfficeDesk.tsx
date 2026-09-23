import { useState } from "react";

import { spendPublicFundsOutsidePurpose } from "../simulation/press";
import {
  recordOfficeWorkflowPreference,
  type EntityId,
  type OfficeCaseworkWorkflowMode,
  type OfficeVotingWorkflowMode,
  type World,
} from "../simulation";
import {
  CASEWORK_CHOICES,
  projectGoverningOfficeDesk,
  type OfficeProgram,
  type OfficeProgramAppropriation,
} from "../presentation/governing-office-desk";
import { GameSelect } from "./controls/GameSelect";

/**
 * The rest of the officeholder's desk, under Work > "Your office" beside the
 * staff briefing: the programs the office is answerable for, the people who
 * work there, the player's own bills and how the office handles casework.
 *
 * Each program reads objective, then what has been put to the office, then
 * what the office has actually committed — never a parameter form. A draft or
 * comparison is labeled as one; a commitment names who made it and under
 * what authority. A refused command says why in a status note and leaves the
 * World alone.
 */
export function GoverningOfficeDesk({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const desk = projectGoverningOfficeDesk(world, personId);
  if (!desk) return null;
  const casework = desk.casework;

  const setCasework = (
    officeRelationshipId: EntityId,
    votingMode: OfficeVotingWorkflowMode,
    caseworkMode: OfficeCaseworkWorkflowMode,
  ) => {
    const result = recordOfficeWorkflowPreference(world, {
      personId,
      officeRelationshipId,
      // One record holds both halves, so changing casework carries the
      // office's recorded voting workflow through untouched.
      votingMode,
      caseworkMode,
    });
    if (result.kind === "recorded") {
      setRefusal(null);
      onWorldChange(result.world);
    } else setRefusal(result.reason);
  };

  return (
    <section className="governing-office-desk" data-testid="office-desk">
      <h4>What this office is answerable for</h4>
      {desk.programsNote ? (
        <p className="game-note" data-testid="office-programs-none">
          {desk.programsNote}
        </p>
      ) : (
        <ul className="office-desk-list" data-testid="office-programs">
          {desk.programs.map((program) => (
            <ProgramCard
              key={program.programKey}
              program={program}
              world={world}
              personId={personId}
              onWorldChange={onWorldChange}
            />
          ))}
        </ul>
      )}

      <h4>Who works here</h4>
      {desk.staffNote ? (
        <p className="game-note" data-testid="office-staff-none">
          {desk.staffNote}
        </p>
      ) : (
        <ul className="office-desk-list" data-testid="office-staff">
          {desk.staff.map((member) => (
            <li key={member.personId} data-testid="office-staff-member">
              <strong>{member.name}</strong>
              <span>{member.roleTitle}</span>
              {member.assignment ? (
                <span className="game-note">{`Assigned to ${member.assignment}.`}</span>
              ) : (
                <span className="game-note">
                  No assignment is recorded for this post.
                </span>
              )}
              <span className="game-note">{member.sinceLine}</span>
            </li>
          ))}
        </ul>
      )}

      <h4>Your measures</h4>
      {desk.measuresNote ? (
        <p className="game-note" data-testid="office-measures-none">
          {desk.measuresNote}
        </p>
      ) : (
        <ul className="office-desk-list" data-testid="office-measures">
          {desk.measures.map((measure) => (
            <li key={measure.measureId} data-testid="office-measure">
              <strong>{`${measure.designation}, ${measure.shortTitle}`}</strong>
              <span className="game-note">{measure.introducedLine}</span>
              <span className="game-note">{measure.stageLine}</span>
            </li>
          ))}
        </ul>
      )}

      <h4>Casework</h4>
      {casework && casework.votingMode ? (
        <div className="office-desk-casework">
          {/*
            The trigger is a combobox button, which `for` cannot label, so the
            name is carried by aria-labelledby rather than the association
            alone.
          */}
          <label id="office-casework-label" htmlFor="office-casework-mode">
            How this office handles constituent requests
          </label>
          <GameSelect
            id="office-casework-mode"
            aria-labelledby="office-casework-label"
            data-testid="office-casework-mode"
            value={casework.mode ?? ""}
            onChange={(event) => {
              const chosen = CASEWORK_CHOICES.find(
                (choice) => choice.mode === event.target.value,
              );
              if (chosen && casework.votingMode)
                setCasework(
                  casework.officeRelationshipId,
                  casework.votingMode,
                  chosen.mode,
                );
            }}
          >
            {CASEWORK_CHOICES.map((choice) => (
              <option key={choice.mode} value={choice.mode}>
                {choice.label}
              </option>
            ))}
          </GameSelect>
          <p className="game-note">
            {CASEWORK_CHOICES.find((choice) => choice.mode === casework.mode)
              ?.detail ??
              "Nothing is recorded about how this office handles casework."}
          </p>
          {casework.recordedLine ? (
            <p className="game-note">{casework.recordedLine}</p>
          ) : null}
        </div>
      ) : (
        <p className="game-note" data-testid="office-casework-none">
          {desk.caseworkNote}
        </p>
      )}

      {/*
        Mounted whether or not there is a refusal: a live region added to the
        page at the same moment as its text is not reliably announced.
      */}
      <p role="status" className="game-note" data-testid="office-desk-refusal">
        {refusal}
      </p>
    </section>
  );
}

function ProgramCard({
  program,
  world,
  personId,
  onWorldChange,
}: {
  readonly program: OfficeProgram;
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  return (
    <li className="office-program" data-testid="office-program">
      {/*
        A service is named by its capacity record. Without one there is no
        name in the World, and the program's record key is not a name, so the
        heading says as much rather than titling the panel with an identifier.
      */}
      <h5>{program.serviceLabel ?? "A program with no recorded name"}</h5>
      {program.serviceLabel ? null : (
        <p className="game-note" data-testid="office-program-unnamed">
          {`Nothing on record names this service. It is filed only as ${program.programKey}.`}
        </p>
      )}
      <ul className="office-program-objective">
        {program.objectiveLines.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>

      {program.appropriations.length === 0 ? (
        <p className="game-note">
          No appropriation for this program has reached this office.
        </p>
      ) : (
        program.appropriations.map((appropriation) => (
          <Appropriation
            key={appropriation.id}
            appropriation={appropriation}
            world={world}
            personId={personId}
            onWorldChange={onWorldChange}
          />
        ))
      )}

      <h6>Committed</h6>
      {program.commitments.length === 0 ? (
        <p className="game-note" data-testid="office-program-uncommitted">
          This office has committed nothing here. Nothing above is a decision.
        </p>
      ) : (
        <ul data-testid="office-program-commitments">
          {program.commitments.map((commitment) => (
            <li key={commitment.id} data-testid="office-program-commitment">
              <strong>{commitment.alternativeTitle}</strong>
              <span className="game-note">{commitment.totalLine}</span>
              <span className="game-note">
                {`${commitment.decidedOnLine} Decided by ${commitment.decidedByName}. ${commitment.authority}`}
              </span>
              <details>
                <summary>Payments and what became of them</summary>
                <ul>
                  {commitment.installmentLines.map((line, index) => (
                    <li key={`${index}-${line}`}>{line}</li>
                  ))}
                </ul>
                {commitment.failureReasons.map((reason, index) => (
                  <p key={`${index}-${reason}`} className="game-note">
                    {reason}
                  </p>
                ))}
              </details>
            </li>
          ))}
        </ul>
      )}

      {program.outturnLines.length > 0 ? (
        <>
          <h6>What the work came to</h6>
          <ul data-testid="office-program-outturn">
            {program.outturnLines.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

function Appropriation({
  appropriation,
  world,
  personId,
  onWorldChange,
}: {
  readonly appropriation: OfficeProgramAppropriation;
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  return (
    <div
      className="office-program-appropriation"
      data-testid="office-program-appropriation"
      data-authority={appropriation.authority.status}
    >
      <h6>Put to this office</h6>
      <p>{appropriation.amountLine}</p>
      <p className="game-note">{appropriation.windowLine}</p>
      <p className="game-note">{appropriation.uncommittedLine}</p>
      {appropriation.authority.status === "available" ? (
        <>
          <p className="game-note" data-testid="office-program-authority">
            {appropriation.authority.basis}
          </p>
          {appropriation.alternativesNote ? (
            <p className="game-note" data-testid="office-program-no-options">
              {appropriation.alternativesNote}
            </p>
          ) : null}
        </>
      ) : (
        <p className="game-note" data-testid="office-program-no-authority">
          {appropriation.authority.reason}
        </p>
      )}
      {appropriation.outsidePurposeLines.length > 0 ? (
        <ul data-testid="office-program-outside-purpose">
          {appropriation.outsidePurposeLines.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
      {appropriation.outsidePurpose ? (
        <OutsidePurposeForm
          appropriationId={appropriation.id}
          label={appropriation.outsidePurpose.label}
          balanceMinorUnits={appropriation.outsidePurpose.balanceMinorUnits}
          world={world}
          personId={personId}
          onWorldChange={onWorldChange}
        />
      ) : null}
      <details>
        <summary>Where this figure comes from</summary>
        <p>{appropriation.basisNote}</p>
      </details>
    </div>
  );
}

/**
 * Paying yourself from the appropriation for something it does not cover.
 * Tucked behind its own disclosure and worded as what it is; the amount is
 * not clamped, so an amount over the account's cash is refused with the
 * writer's own reason rather than quietly becoming a different amount.
 */
function OutsidePurposeForm({
  appropriationId,
  label,
  balanceMinorUnits,
  world,
  personId,
  onWorldChange,
}: {
  readonly appropriationId: EntityId;
  readonly label: string;
  readonly balanceMinorUnits: number;
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const parsed = Number(amount);
  const amountMinorUnits = Number.isFinite(parsed)
    ? Math.round(parsed * 100)
    : 0;
  const ready = amountMinorUnits > 0 && purpose.trim() !== "";
  const pay = () => {
    if (!ready) return;
    try {
      const result = spendPublicFundsOutsidePurpose(world, {
        stableKey: `press46:outside-purpose:${personId}:${world.actionSequence}`,
        personId,
        appropriationId,
        amountMinorUnits,
        purpose: purpose.trim(),
      });
      setAmount("");
      setPurpose("");
      setProblem(null);
      onWorldChange(result.world);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <details data-testid="office-program-outside-purpose-form">
      <summary>Use this money for something else</summary>
      <p className="game-note">{label}</p>
      <p className="game-note">
        {`The public account holds ${formatDollars(balanceMinorUnits)}.`}
      </p>
      <div className="game-fields">
        <label>
          Amount in dollars
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          What the money pays for
          <input
            type="text"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </label>
      </div>
      <button type="button" disabled={!ready} onClick={pay}>
        Pay yourself from this appropriation
      </button>
      {problem ? (
        <p className="game-problem" role="status">
          {problem}
        </p>
      ) : null}
    </details>
  );
}

function formatDollars(minorUnits: number): string {
  return (minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
