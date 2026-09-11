import { useState } from "react";
import type { EntityId, World } from "../simulation/types";
import {
  personnelEmploymentContexts,
  personnelKnownEmployers,
  personnelWorkItems,
  preparePersonnelWork,
} from "../simulation/civil-personnel";

/** UI owns mounting and the one World. No legal class or authority is selected in this view. */
export function CivilPersonnelPanel({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
}) {
  const [employerId, setEmployerId] = useState<EntityId | "">("");
  const [employmentId, setEmploymentId] = useState<EntityId | "">("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const employers = personnelKnownEmployers(world);
  const employments = personnelEmploymentContexts(world);
  const work = personnelWorkItems(world);
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
    </section>
  );
}
