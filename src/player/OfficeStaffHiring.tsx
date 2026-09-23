import { useState } from "react";

import {
  hireOfficeStaff,
  officeStaffingView,
  openOfficeStaffSearch,
  personName,
  type EntityId,
  type StaffableOffice,
  type World,
} from "../simulation";

/**
 * Hiring for any office the player holds: who already works in its
 * positions, a search that brings applicants for the open ones, and a Hire
 * button per applicant. A legislator's office and a governor's office use the
 * same records, so they use this same section.
 */
export function OfficeStaffHiring({
  world,
  office,
  onWorldChange,
}: {
  readonly world: World;
  readonly office: StaffableOffice;
  readonly onWorldChange: (world: World) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const staffing = officeStaffingView(world, office);
  const needsSearch =
    !staffing.authorized ||
    staffing.openings.some((opening) => opening.candidates.length === 0);

  function lookForStaff() {
    const result = openOfficeStaffSearch(world, office);
    if (result.kind === "refused") {
      setNote(result.reason);
      return;
    }
    setNote(result.note);
    onWorldChange(result.world);
  }

  function hire(positionId: EntityId, personId: EntityId) {
    const result = hireOfficeStaff(world, office, { positionId, personId });
    if (result.kind === "refused") {
      setNote(result.reason);
      return;
    }
    setNote(result.note);
    onWorldChange(result.world);
  }

  return (
    <section data-testid="office-staff-hiring">
      <h4 className="office-onboarding-subheading">Your office staff</h4>
      {staffing.filled.length > 0 ? (
        <ul className="office-onboarding-staff">
          {staffing.filled.map((holder) => {
            const person = world.people[holder.personId];
            return (
              <li
                key={holder.positionId}
                data-testid="office-staff-filled"
                data-position-id={holder.positionId}
              >
                {person ? personName(person) : "A former hire"}, {holder.title}
              </li>
            );
          })}
        </ul>
      ) : (
        <p data-testid="office-staff-none-hired">
          Nobody has been hired into this office's positions yet.
        </p>
      )}
      {staffing.authorized && staffing.openings.length === 0 ? (
        <p data-testid="office-staff-all-filled">Every position is filled.</p>
      ) : null}
      {needsSearch ? (
        <button
          type="button"
          className="ui-action"
          data-testid="office-staff-look"
          onClick={lookForStaff}
        >
          Look for staff
        </button>
      ) : null}
      {staffing.openings
        .filter((opening) => opening.candidates.length > 0)
        .map((opening) => (
          <fieldset
            key={opening.positionId}
            className="office-onboarding-fieldset"
            data-testid={`office-staff-opening-${opening.classKey}`}
          >
            <legend>{opening.title}</legend>
            <p>{opening.duty}</p>
            <ul className="office-onboarding-items">
              {opening.candidates.map((candidate) => {
                const person = world.people[candidate.personId];
                const name = person ? personName(person) : "An applicant";
                return (
                  <li key={candidate.personId}>
                    <p>
                      <strong>{name}</strong>: {candidate.assessment.background}
                      ; {candidate.assessment.strength}, but{" "}
                      {candidate.assessment.caution}.
                    </p>
                    <button
                      type="button"
                      className="ui-action"
                      data-testid="office-staff-hire"
                      data-person-id={candidate.personId}
                      onClick={() =>
                        hire(opening.positionId, candidate.personId)
                      }
                    >
                      Hire {name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      {note ? (
        <p role="status" data-testid="office-staff-note">
          {note}
        </p>
      ) : null}
    </section>
  );
}
