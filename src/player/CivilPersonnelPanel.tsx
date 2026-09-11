import { useState } from "react";
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
  produceCommissionerSettlementDecision,
  produceDischargedEmployeeAppealChoice,
  produceReinstatementResponse,
  recordInformalResolutionAttempt,
  reinstatementOpportunities,
  type PersonnelMatterView,
  type PersonnelResult,
  type PersonnelStep,
} from "../simulation/civil-personnel-actions";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";

const GROUND_LABELS: Record<PersonnelJustCauseGround, string> = {
  "consistent-failure-to-perform":
    "Consistent failure to perform assigned duties",
  "substandard-performance": "Substandard performance",
  insubordination: "Insubordination",
  "serious-policy-violation":
    "Serious violation of written policies applied uniformly",
};

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
    <section aria-label="Public employment preparation">
      <h2>Public employment questions</h2>
      <p>
        Prepare questions about recruitment or your employment. Hiring,
        personnel decisions and formal review require the applicable authority
        and procedure.
      </p>
      <label>
        Employer you know
        <select
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
      {matters.length > 0 || vacancies.length > 0 ? (
        <section aria-label="Personnel matters">
          <h3>Personnel matters</h3>
          {matters.map((matter) => (
            <PersonnelMatter
              key={matter.id}
              matter={matter}
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
                      "The written notice was issued and recorded.",
                    );
                  case "commissioner-filing":
                    return apply(
                      fileNoticeWithCommissioner(world, {
                        actionId: matter.id,
                      }),
                      "The notice was filed with the commissioner.",
                    );
                  case "check-appeal":
                    return apply(
                      produceDischargedEmployeeAppealChoice(world, {
                        actionId: matter.id,
                      }),
                      "The employee's decision about an appeal is on record.",
                    );
                  case "check-settlement": {
                    const appealId = world.history.personnelRecords?.find(
                      (r) => r.kind === "appeal" && r.actionId === matter.id,
                    )?.id;
                    if (!appealId) return setNotice("No appeal is on record.");
                    return apply(
                      produceCommissionerSettlementDecision(world, {
                        appealId,
                      }),
                      "The commissioner's settlement decision is on record.",
                    );
                  }
                  case "hear-answer":
                    return apply(
                      produceReinstatementResponse(world, {
                        offerId: matter.id,
                      }),
                      "Their answer is on record.",
                    );
                  default:
                    return setNotice("That step is not available.");
                }
              }}
            />
          ))}
          {vacancies.map((vacancy) => (
            <ReinstatementForm
              key={vacancy.position.id}
              title={vacancy.position.title}
              candidates={vacancy.candidates}
              offer={(personId, probation) =>
                apply(
                  offerMinnesotaReinstatement(world, {
                    positionId: vacancy.position.id,
                    personId,
                    probation,
                  }),
                  "The reinstatement offer was made. It is not an appointment until accepted.",
                )
              }
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
  matter,
  act,
}: {
  readonly matter: PersonnelMatterView;
  readonly act: (step: PersonnelStep, input: StepInput) => void;
}) {
  const grounds = justCauseGrounds();
  const [text, setText] = useState("");
  const [action, setAction] = useState<"reprimand" | "discharge">("reprimand");
  const [ground, setGround] = useState<PersonnelJustCauseGround>(grounds[0]!);
  const needsText = matter.steps.some(
    (s) =>
      s.available &&
      (s.key === "informal-resolution" || s.key === "discipline"),
  );
  const discipline = matter.steps.find(
    (s) => s.key === "discipline" && s.available,
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
              value={ground}
              onChange={(event) =>
                setGround(event.target.value as PersonnelJustCauseGround)
              }
            >
              {grounds.map((g) => (
                <option key={g} value={g}>
                  {GROUND_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {needsText ? (
        <label>
          {discipline ? "Specific reasons" : "Meeting note"}
          <textarea
            value={text}
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
      ) : null}
      {matter.steps.map((step) => (
        <div key={step.key}>
          <button
            type="button"
            disabled={
              !step.available ||
              ((step.key === "informal-resolution" ||
                step.key === "discipline") &&
                !text.trim())
            }
            onClick={() => {
              act(step, { text, action, ground });
              setText("");
            }}
          >
            {step.label}
          </button>
          {step.reason ? <p>{step.reason}</p> : null}
        </div>
      ))}
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
  const [personId, setPersonId] = useState<EntityId>(candidates[0]!.personId);
  const [probation, setProbation] = useState(false);
  const candidate = candidates.find((c) => c.personId === personId);
  return (
    <article aria-label={`Vacant ${title} position`}>
      <h4>Vacant {title} position</h4>
      <p>
        Direct reinstatement is open to former employees of this job class
        within four years of leaving it.
      </p>
      <label>
        Former employee
        <select
          value={personId}
          onChange={(event) => setPersonId(event.target.value as EntityId)}
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
          checked={probation && Boolean(candidate?.probationAllowed)}
          disabled={!candidate?.probationAllowed}
          onChange={(event) => setProbation(event.target.checked)}
        />
        Require probation
      </label>
      {!candidate?.probationAllowed ? (
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
            probation && candidate?.probationAllowed
              ? "required"
              : "not-required",
          )
        }
      >
        Offer reinstatement
      </button>
    </article>
  );
}
