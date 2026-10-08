import { useState } from "react";

import {
  executiveStaffOffice,
  governingOfficeForPerson,
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
import { proseDate } from "../presentation/prose-dates";
import { GameSelect } from "./controls/GameSelect";
import { OfficeStaffHiring } from "./OfficeStaffHiring";
import { ExecutiveBillResults } from "./ExecutiveBillResults";

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
  const office = governingOfficeForPerson(world, personId);
  if (!desk || !office) return null;
  const casework = desk.casework;

  const setCasework = (
    officeRelationshipId: EntityId,
    votingMode: OfficeVotingWorkflowMode | null,
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
      {desk.programsReason ? (
        <p
          className="game-note"
          data-testid="office-programs-none"
          data-problem={desk.programsReason}
        />
      ) : (
        <ul
          id="governing-money"
          className="office-desk-list"
          data-testid="office-programs"
        >
          {desk.programs.map((program) => (
            <ProgramCard key={program.programKey} program={program} />
          ))}
        </ul>
      )}

      {desk.staffReason ? (
        <p
          className="game-note"
          data-testid="office-staff-none"
          data-problem={desk.staffReason}
        />
      ) : (
        <ul
          id="governing-people"
          className="office-desk-list"
          data-testid="office-staff"
        >
          {desk.staff.map((member) => (
            <li key={member.personId} data-testid="office-staff-member">
              <strong>{member.name}</strong>
              <span>{member.roleTitle}</span>
              {member.assignment ? (
                <span
                  className="game-note"
                  data-testid="office-staff-assignment"
                >
                  {member.assignment}
                </span>
              ) : null}
              <time className="game-note" dateTime={member.startedAt}>
                {proseDate(member.startedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}

      {office.controlledByPlayer && office.organizationId ? (
        <OfficeStaffHiring
          world={world}
          office={executiveStaffOffice(office)}
          onWorldChange={onWorldChange}
        />
      ) : null}

      {desk.measuresReason ? (
        <p
          className="game-note"
          data-testid="office-measures-none"
          data-problem={desk.measuresReason}
        />
      ) : (
        <ul className="office-desk-list" data-testid="office-measures">
          {desk.measures.map((measure) => (
            <li key={measure.measureId} data-testid="office-measure">
              <strong>{`${measure.designation}, ${measure.shortTitle}`}</strong>
              <time className="game-note" dateTime={measure.introducedAt}>
                {proseDate(measure.introducedAt)}
              </time>
              {measure.lastAction ? (
                <span className="game-note" data-testid="office-measure-stage">
                  {measure.lastAction.replaceAll("-", " ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ExecutiveBillResults world={world} personId={personId} />

      {casework ? (
        <div className="office-desk-casework">
          {/*
            The trigger is a combobox button, which `for` cannot label, so the
            name is carried by aria-labelledby rather than the association
            alone.
          */}
          <GameSelect
            id="office-casework-mode"
            aria-label="People"
            data-testid="office-casework-mode"
            value={casework.mode ?? ""}
            onChange={(event) => {
              const chosen = CASEWORK_CHOICES.find(
                (choice) => choice.mode === event.target.value,
              );
              if (chosen)
                setCasework(
                  casework.officeRelationshipId,
                  casework.votingMode,
                  chosen.mode,
                );
            }}
          >
            {CASEWORK_CHOICES.map((choice) => (
              <option key={choice.mode} value={choice.mode}>
                {choice.mode}
              </option>
            ))}
          </GameSelect>
          <p
            className="game-note"
            data-testid="office-casework-detail"
            data-mode={casework.mode ?? undefined}
            data-problem={casework.mode ? undefined : "no-casework-mode"}
          />
          {casework.recordedAt ? (
            <time className="game-note" dateTime={casework.recordedAt}>
              {proseDate(casework.recordedAt)}
            </time>
          ) : null}
        </div>
      ) : (
        <p
          className="game-note"
          data-testid="office-casework-none"
          data-problem={desk.caseworkReason ?? undefined}
        />
      )}

      {/*
        Mounted whether or not there is a refusal: a live region added to the
        page at the same moment as its text is not reliably announced.
      */}
      <p
        role="status"
        className="game-note"
        data-testid="office-desk-refusal"
        data-reason={refusal ?? undefined}
      />
    </section>
  );
}

function ProgramCard({ program }: { readonly program: OfficeProgram }) {
  return (
    <li className="office-program" data-testid="office-program">
      {/*
        A service is named by its capacity record. Without one there is no
        name in the World, and the program's record key is not a name, so the
        heading says as much rather than titling the panel with an identifier.
      */}
      {program.serviceLabel ? <h5>{program.serviceLabel}</h5> : null}
      {program.serviceLabel ? null : (
        <p
          className="game-note"
          data-testid="office-program-unnamed"
          data-problem="unnamed-service"
        />
      )}
      {program.capacity ? (
        <dl
          className="office-program-objective"
          data-testid="office-program-capacity"
          data-basis={program.capacity.basisNote}
        >
          <dt>{program.capacity.unitLabel}</dt>
          <dd>{`${program.capacity.inService} / ${program.capacity.total}`}</dd>
          <dd>{program.capacity.monthlyNeed}</dd>
          {program.capacity.restorationCost !== null ? (
            <dd>{program.capacity.restorationCost}</dd>
          ) : null}
          {program.monthsCovered ? (
            <>
              <dd>{program.monthsCovered}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p
          className="game-note"
          data-testid="office-program-no-capacity"
          data-problem="no-capacity-record"
        />
      )}

      {program.appropriations.length === 0 ? (
        <p
          className="game-note"
          data-testid="office-program-no-appropriation"
          data-problem="no-appropriation"
        />
      ) : (
        program.appropriations.map((appropriation) => (
          <Appropriation key={appropriation.id} appropriation={appropriation} />
        ))
      )}

      {program.commitments.length === 0 ? (
        <p
          className="game-note"
          data-testid="office-program-uncommitted"
          data-problem="nothing-committed"
        />
      ) : (
        <ul data-testid="office-program-commitments">
          {program.commitments.map((commitment) => (
            <li key={commitment.id} data-testid="office-program-commitment">
              <strong>{commitment.alternativeTitle}</strong>
              {commitment.total !== null ? (
                <span className="game-note">{commitment.total}</span>
              ) : null}
              <span className="game-note" data-authority={commitment.authority}>
                <time dateTime={commitment.recordedAt}>
                  {proseDate(commitment.recordedAt)}
                </time>{" "}
                <span>{commitment.decidedByName}</span>
              </span>
              <details>
                <summary>Money</summary>
                <ul>
                  {commitment.payments.map((payment, index) => (
                    <li
                      key={`${index}-${payment.purpose}`}
                      data-status={payment.status}
                    >
                      {payment.amount} · {payment.purpose} ·{" "}
                      <time dateTime={payment.dueAt}>
                        {proseDate(payment.dueAt)}
                      </time>
                    </li>
                  ))}
                </ul>
                {commitment.failureReasons.map((reason, index) => (
                  <p
                    key={`${index}-${reason}`}
                    className="game-note"
                    data-reason={reason}
                  />
                ))}
              </details>
            </li>
          ))}
        </ul>
      )}

      {program.outturnLines.length > 0 ? (
        <ul data-testid="office-program-outturn">
          {program.outturnLines.map((line, index) => (
            <li key={`${index}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Appropriation({
  appropriation,
}: {
  readonly appropriation: OfficeProgramAppropriation;
}) {
  return (
    <div
      className="office-program-appropriation"
      data-testid="office-program-appropriation"
      data-authority={appropriation.authority.status}
    >
      <p>{appropriation.amount}</p>
      <p className="game-note">
        <time dateTime={appropriation.availableFrom}>
          {proseDate(appropriation.availableFrom)}
        </time>
        –
        <time dateTime={appropriation.availableThrough}>
          {proseDate(appropriation.availableThrough)}
        </time>
      </p>
      <p className="game-note" data-testid="office-program-uncommitted-amount">
        {appropriation.uncommitted}
      </p>
      {appropriation.authority.status === "available" ? (
        <>
          <p
            className="game-note"
            data-testid="office-program-authority"
            data-basis={appropriation.authority.basis}
          />
          {appropriation.alternativesNote ? (
            <p
              className="game-note"
              data-testid="office-program-no-options"
              data-problem="no-alternatives"
            />
          ) : null}
        </>
      ) : (
        <p
          className="game-note"
          data-testid="office-program-no-authority"
          data-reason={appropriation.authority.reason}
        />
      )}
    </div>
  );
}
