import { useState, type ReactNode } from "react";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  PersonnelJustCauseGround,
  World,
} from "../simulation/types";
import {
  personnelEmploymentContexts,
  personnelKnownEmployers,
  personnelWorkItems,
  preparePersonnelWork,
} from "../simulation/civil-personnel";
import {
  fileNoticeWithCommissioner,
  issueMinnesotaDiscipline,
  justCauseGrounds,
  offerMinnesotaReinstatement,
  personnelMatters,
  recordInformalResolutionAttempt,
  reinstatementOpportunities,
  type PersonnelMatterView,
  type PersonnelResult,
  type PersonnelStep,
} from "../simulation/civil-personnel-actions";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  generatedDisciplineNoticePreview,
  generatedDisciplineReasons,
  generatedInformalResolutionNote,
  personnelEvidenceOptions,
  PERSONNEL_GROUND_LABELS,
  type PersonnelEvidenceOption,
} from "../presentation/civil-personnel-evidence";

/** Feature-local containment only; the UI owner supplies visual style. */
const FIT = { maxWidth: "100%", boxSizing: "border-box" } as const;

/** UI owns mounting and the one World. No legal class or authority is selected in this view. */
export function CivilPersonnelPanel({
  world,
  onWorldChange,
  transitionHandlers,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [employerId, setEmployerId] = useState<EntityId | "">("");
  const [employmentId, setEmploymentId] = useState<EntityId | "">("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const employers = personnelKnownEmployers(world);
  const employments = personnelEmploymentContexts(world);
  const work = personnelWorkItems(world);
  const matters = personnelMatters(world);
  const vacancies = reinstatementOpportunities(world).filter(
    (v) => v.candidates.length > 0,
  );
  if (world.control.kind !== "person")
    return <p>Choose a person to prepare employment questions.</p>;
  function prepare(review: boolean) {
    const relationship = employments.find(
      (e) => e.workRelationshipId === employmentId,
    );
    const selectedEmployer = review ? relationship?.organizationId : employerId;
    if (!selectedEmployer) {
      setNotice("Select an established employer or employment relationship.");
      return;
    }
    const result = preparePersonnelWork(world, {
      action: review ? "prepare-personnel-review" : "prepare-recruitment",
      organizationId: selectedEmployer,
      workRelationshipId: review ? (employmentId as EntityId) : null,
      note,
    });
    if (result.ok) {
      onWorldChange(result.world);
      setNotice(
        "Your private preparation is in Work. No application, complaint or personnel decision has been filed.",
      );
    } else setNotice(result.reason);
  }
  function apply(result: PersonnelResult, done: string) {
    if (result.ok) {
      onWorldChange(result.world);
      setNotice(done);
    } else setNotice(result.reason);
  }
  const handlers =
    transitionHandlers ?? createCampaignElectionTransitionRegistry();
  return (
    <section
      aria-label="Public employment preparation"
      style={{ maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      <h2>Public employment questions</h2>
      <p>
        Prepare questions about recruitment or your employment. Hiring,
        personnel decisions and formal review require the applicable authority
        and procedure.
      </p>
      <label>
        Employer you know
        <select
          style={FIT}
          value={employerId}
          onChange={(event) => setEmployerId(event.target.value as EntityId)}
        >
          <option value="">Choose an employer</option>
          {employers.map((employer) => (
            <option key={employer.id} value={employer.id}>
              {employer.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Your employment
        <select
          style={FIT}
          value={employmentId}
          onChange={(event) => setEmploymentId(event.target.value as EntityId)}
        >
          <option value="">Choose employment to review</option>
          {employments.map((employment) => (
            <option
              key={employment.workRelationshipId}
              value={employment.workRelationshipId}
            >
              {employment.title} — {employment.organizationName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Questions to prepare
        <textarea
          style={FIT}
          value={note}
          maxLength={4000}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!employerId || !note.trim()}
        onClick={() => prepare(false)}
      >
        Prepare recruitment questions
      </button>
      <button
        type="button"
        disabled={!employmentId || !note.trim()}
        onClick={() => prepare(true)}
      >
        Prepare personnel review questions
      </button>
      <p role="status">{notice}</p>
      <ul>
        {work.map(({ item, state }) => (
          <li key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <p>
              {state?.status === "completed"
                ? "Preparation completed"
                : "Private preparation pending"}
            </p>
          </li>
        ))}
      </ul>
      {matters.length > 0 ? (
        <section aria-label="Personnel matters">
          <h3>Personnel matters</h3>
          {matters.map((matter) => (
            <PersonnelMatter
              key={matter.id}
              world={world}
              matter={matter}
              reinstatement={
                vacancies.find((v) => v.position.id === matter.id)
                  ? (() => {
                      const vacancy = vacancies.find(
                        (v) => v.position.id === matter.id,
                      )!;
                      return (
                        <ReinstatementForm
                          title={vacancy.position.title}
                          candidates={vacancy.candidates}
                          offer={(personId, probation) =>
                            apply(
                              offerMinnesotaReinstatement(world, {
                                positionId: vacancy.position.id,
                                personId,
                                probation,
                              }),
                              "The offer was made and answered on receipt. Only an acceptance is an appointment.",
                            )
                          }
                        />
                      );
                    })()
                  : null
              }
              act={(step, input) => {
                switch (step.key) {
                  case "informal-resolution":
                    return apply(
                      recordInformalResolutionAttempt(world, {
                        incumbencyId: matter.id,
                        note: input.text,
                        transitionHandlers: handlers,
                      }),
                      "The informal resolution meeting took place and is on record.",
                    );
                  case "discipline":
                    return apply(
                      issueMinnesotaDiscipline(world, {
                        incumbencyId: matter.id,
                        action: input.action,
                        ground: input.ground,
                        reasons: input.text,
                      }),
                      input.action === "discharge"
                        ? "The written notice was issued. The employee's own answer to it is on record."
                        : "The written notice was issued and recorded.",
                    );
                  case "commissioner-filing":
                    return apply(
                      fileNoticeWithCommissioner(world, {
                        actionId: matter.id,
                      }),
                      "The notice was filed with the commissioner.",
                    );
                  default:
                    return setNotice("That step is not available.");
                }
              }}
            />
          ))}
        </section>
      ) : null}
    </section>
  );
}

interface StepInput {
  readonly text: string;
  readonly action: "reprimand" | "discharge";
  readonly ground: PersonnelJustCauseGround;
}

function PersonnelMatter({
  world,
  matter,
  act,
  reinstatement,
}: {
  readonly world: World;
  readonly matter: PersonnelMatterView;
  readonly act: (step: PersonnelStep, input: StepInput) => void;
  /** The supported appointment route, shown only where it is available. */
  readonly reinstatement: ReactNode;
}) {
  const grounds = justCauseGrounds();
  const [action, setAction] = useState<"reprimand" | "discharge">("reprimand");
  const [ground, setGround] = useState<PersonnelJustCauseGround>(grounds[0]!);
  const [informalEvidenceId, setInformalEvidenceId] = useState<EntityId | "">(
    "",
  );
  const [disciplineEvidenceId, setDisciplineEvidenceId] = useState<
    EntityId | ""
  >("");
  const informalEvidence = personnelEvidenceOptions(world, matter.id, {
    kind: "informal-resolution",
  });
  const disciplineEvidence = personnelEvidenceOptions(world, matter.id, {
    kind: "discipline",
    ground,
  });
  const selectedInformalEvidence = informalEvidence.find(
    (entry) => entry.eventId === informalEvidenceId,
  );
  const selectedDisciplineEvidence = disciplineEvidence.find(
    (entry) => entry.eventId === disciplineEvidenceId,
  );
  const discipline = matter.steps.find(
    (s) => s.key === "discipline" && s.available,
  );
  const informal = matter.steps.find(
    (s) => s.key === "informal-resolution" && s.available,
  );
  return (
    <article aria-label={matter.heading}>
      <h4>{matter.heading}</h4>
      <ul>
        {matter.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {discipline ? (
        <>
          <label>
            Action
            <select
              style={FIT}
              value={action}
              onChange={(event) =>
                setAction(event.target.value as "reprimand" | "discharge")
              }
            >
              <option value="reprimand">Reprimand</option>
              <option value="discharge">Discharge</option>
            </select>
          </label>
          <label>
            Just cause
            <select
              style={FIT}
              value={ground}
              onChange={(event) =>
                setGround(event.target.value as PersonnelJustCauseGround)
              }
            >
              {grounds.map((g) => (
                <option key={g} value={g}>
                  {PERSONNEL_GROUND_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {informal ? (
        <label>
          Episode to discuss
          <select
            style={FIT}
            value={informalEvidenceId}
            onChange={(event) =>
              setInformalEvidenceId(event.target.value as EntityId)
            }
          >
            <option value="">Choose a known recorded episode</option>
            {informalEvidence.map((entry) => (
              <option key={entry.eventId} value={entry.eventId}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {informal && informalEvidence.length === 0 ? (
        <p>
          No known recorded episode supports an informal-resolution meeting.
        </p>
      ) : null}
      {discipline ? (
        <>
          <label>
            Supporting record
            <select
              style={FIT}
              value={disciplineEvidenceId}
              onChange={(event) =>
                setDisciplineEvidenceId(event.target.value as EntityId)
              }
            >
              <option value="">Choose evidence for this cause</option>
              {disciplineEvidence.map((entry) => (
                <option key={entry.eventId} value={entry.eventId}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          {selectedDisciplineEvidence ? (
            <section aria-label="Generated notice preview">
              <h5>Notice preview</h5>
              <p>
                {generatedDisciplineNoticePreview(
                  matter.heading,
                  action,
                  ground,
                  selectedDisciplineEvidence,
                )}
              </p>
            </section>
          ) : (
            <p>
              No selected record supports this cause. The notice cannot be
              issued.
            </p>
          )}
        </>
      ) : null}
      {matter.steps.map((step) =>
        step.key === "reinstatement" && step.available ? (
          <div key={step.key}>{reinstatement}</div>
        ) : (
          <div key={step.key}>
            <button
              type="button"
              disabled={
                !step.available ||
                (step.key === "informal-resolution" &&
                  !selectedInformalEvidence) ||
                (step.key === "discipline" && !selectedDisciplineEvidence)
              }
              onClick={() => {
                let evidence: PersonnelEvidenceOption | undefined;
                if (step.key === "informal-resolution") {
                  evidence = selectedInformalEvidence;
                  if (!evidence) return;
                } else if (step.key === "discipline") {
                  evidence = selectedDisciplineEvidence;
                  if (!evidence) return;
                }
                act(step, {
                  text:
                    step.key === "informal-resolution"
                      ? generatedInformalResolutionNote(evidence!)
                      : step.key === "discipline"
                        ? generatedDisciplineReasons(ground, evidence!)
                        : "",
                  action,
                  ground,
                });
              }}
            >
              {step.label}
            </button>
            {step.reason ? <p>{step.reason}</p> : null}
          </div>
        ),
      )}
    </article>
  );
}

function ReinstatementForm({
  title,
  candidates,
  offer,
}: {
  readonly title: string;
  readonly candidates: readonly {
    readonly personId: EntityId;
    readonly name: string;
    readonly probationAllowed: boolean;
  }[];
  readonly offer: (
    personId: EntityId,
    probation: "required" | "not-required",
  ) => void;
}) {
  const [chosen, setPersonId] = useState<EntityId>(candidates[0]!.personId);
  const [probation, setProbation] = useState(false);
  // The list can change after an offer; never submit someone no longer shown.
  const candidate =
    candidates.find((c) => c.personId === chosen) ?? candidates[0]!;
  const personId = candidate.personId;
  return (
    <div role="group" aria-label={`Direct reinstatement to ${title}`}>
      <p>
        Direct reinstatement is open to former employees of this job class
        within four years of leaving it.
      </p>
      <label>
        Former employee
        <select
          style={FIT}
          value={personId}
          onChange={(event) => {
            setPersonId(event.target.value as EntityId);
            setProbation(false);
          }}
        >
          {candidates.map((c) => (
            <option key={c.personId} value={c.personId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={probation && candidate.probationAllowed}
          disabled={!candidate.probationAllowed}
          onChange={(event) => setProbation(event.target.checked)}
        />
        Require probation
      </label>
      {!candidate.probationAllowed ? (
        <p>
          Probation on reinstatement is established only for former employees of
          a different appointing authority.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() =>
          offer(
            personId,
            probation && candidate.probationAllowed
              ? "required"
              : "not-required",
          )
        }
      >
        Offer reinstatement
      </button>
    </div>
  );
}
