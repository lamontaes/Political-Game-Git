import { useId, useMemo, useState, type ReactNode } from "react";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  describePersonContext,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  factsForPerson,
  kinshipRelationshipsAt,
  latestPersonalityTendenciesForPerson,
  organizationProfileAt,
  personName,
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
  type EntityId,
  type World,
} from "../simulation";
import { projectPersonalRecord } from "../presentation/personal-record";
import { projectLivesRecord } from "../presentation/lives-record";
import { projectLifeRecord } from "../presentation/life-record";
import { proseDate } from "../presentation/prose-dates";
import { SavedPersonFigure } from "./SavedPersonFigure";
import "./controls/controls.css";

/** Replaces the identity-first PersonalWorkspace with the approved split record.
 * Reading or changing pages writes no world records and spends no game time. */
export function PersonalWorkspace({
  world,
  personId,
  onOpenPerson,
  children,
}: {
  readonly children?: ReactNode;
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const [page, setPage] = useState<"profile" | "history">("profile");
  const id = useId();
  const record = useMemo(
    () => projectPersonalRecord(world, personId),
    [world, personId],
  );
  const life = useMemo(
    () => projectLifeRecord(world, personId),
    [world, personId],
  );
  const lives = useMemo(
    () => projectLivesRecord(world, personId),
    [world, personId],
  );
  if (!record) return null;
  const work = activeWorkRelationshipsAt(world, personId);
  const education = activeEducationEnrollmentsAt(world, personId);
  const familyIds = new Set(
    kinshipRelationshipsAt(world, personId)
      .flatMap((row) => row.personIds)
      .filter((other) => other !== personId),
  );
  const birthplace = factsForPerson(world.people[personId]!).find(
    (fact) => fact.kind === "birthplace",
  )?.jurisdictionId;
  const origin = birthplace ? world.jurisdictions[birthplace]?.name : undefined;
  const traits = latestPersonalityTendenciesForPerson(world, personId);
  const selectPage = (next: "profile" | "history") => setPage(next);
  return (
    <section className="pg-split-record" data-testid="personal-split-record">
      <nav className="pg-split-record-pages" aria-label="Personal record pages">
        <button
          type="button"
          className="pg-inline-link"
          aria-current={page === "profile" ? "page" : undefined}
          onClick={() => selectPage("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          className="pg-inline-link"
          data-testid="personal-full-history"
          aria-current={page === "history" ? "page" : undefined}
          onClick={() => selectPage("history")}
        >
          Full history
        </button>
      </nav>
      {page === "profile" ? (
        <>
          <div className="pg-split-record-grid">
            <div className="pg-split-record-figure">
              <SavedPersonFigure world={world} personId={personId} />
              <button
                type="button"
                className="pg-inline-link"
                data-testid="personal-appearance"
                onClick={() => onOpenPerson(personId)}
              >
                Appearance and wardrobe
              </button>
            </div>
            <div className="pg-split-record-facts">
              <h2 data-testid="personal-name">{record.identity.name}</h2>
              <p data-testid="personal-age">{record.identity.age} years old</p>
              <section
                className="pg-split-record-current"
                aria-labelledby={`${id}-current`}
              >
                <h3 id={`${id}-current`}>Current work</h3>
                <div data-testid="personal-current-work">
                  {work.length ? (
                    work.map(({ relationship, role }) => (
                      <div
                        key={relationship.id}
                        data-record-id={relationship.id}
                      >
                        <strong>{role.title}</strong>
                        <p>
                          {relationship.organizationId
                            ? organizationProfileAt(
                                world,
                                relationship.organizationId,
                              )?.name
                            : null}
                        </p>
                        <p>Since {proseDate(relationship.startedAt)}</p>
                      </div>
                    ))
                  ) : (
                    <p>Not currently working</p>
                  )}
                </div>
                <h3>Education</h3>
                <div data-testid="personal-current-education">
                  {education.length ? (
                    education.map(({ enrollment }) => (
                      <p key={enrollment.id} data-record-id={enrollment.id}>
                        {
                          organizationProfileAt(
                            world,
                            enrollment.organizationId,
                          )?.name
                        }{" "}
                        · Since {proseDate(enrollment.startedAt)}
                      </p>
                    ))
                  ) : (
                    <p>Not currently enrolled</p>
                  )}
                </div>
              </section>
              <dl className="pg-split-record-identity">
                <dt>Born</dt>
                <dd>{proseDate(record.identity.birthDate)}</dd>
                {origin ? (
                  <>
                    <dt>From</dt>
                    <dd>{origin}</dd>
                  </>
                ) : null}
                {record.identity.placeName ? (
                  <>
                    <dt>Lives in</dt>
                    <dd>{record.identity.placeName}</dd>
                  </>
                ) : null}
              </dl>
              {familyIds.size ? (
                <section aria-label="Family">
                  <h3>Family</h3>
                  <ul
                    className="pg-split-record-family"
                    data-testid="personal-family"
                  >
                    {[...familyIds].map((other) =>
                      world.people[other] ? (
                        <li key={other}>
                          <button
                            type="button"
                            className="pg-inline-link"
                            onClick={() => onOpenPerson(other)}
                          >
                            {personName(world.people[other]!)}
                          </button>
                          <small>
                            {
                              describePersonContext(world, personId, other)
                                ?.relationship
                            }
                          </small>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              ) : null}
              {traits.length || lives.leanings.length ? (
                <section
                  aria-label="Personality"
                  data-testid="personal-personality"
                >
                  <h3>Personality</h3>
                  {lives.leanings.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {traits.map((trait) => {
                    const definition =
                      world.mindCatalog.tendencies[trait.tendencyId];
                    const expression = definition?.expressions.find(
                      (entry) => entry.key === trait.expressionKey,
                    );
                    return expression ? (
                      <p key={trait.id} data-record-id={trait.id}>
                        {definition!.name}: {expression.label}
                        {trait.strength === "subtle"
                          ? " (a slight preference)"
                          : ""}
                      </p>
                    ) : null;
                  })}
                </section>
              ) : null}
            </div>
          </div>
          <footer className="pg-split-record-footer">
            <button
              type="button"
              className="pg-inline-link"
              onClick={() => selectPage("history")}
            >
              Open full history
            </button>
          </footer>
          {children}
        </>
      ) : (
        <section
          className="pg-split-record-history"
          data-testid="personal-history-page"
          aria-label="Full history"
        >
          <button
            type="button"
            className="pg-inline-link"
            onClick={() => selectPage("profile")}
          >
            Back to profile
          </button>
          <h2>{record.identity.name}</h2>
          {lives.upbringing.length ? (
            <section aria-label="Growing up">
              <h3>Growing up</h3>
              {lives.upbringing.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </section>
          ) : null}
          <h3>Work</h3>
          <ul data-testid="personal-work">
            {workRelationshipHistoryForPerson(world, personId).map(
              (relationship) => {
                const status = workStatusAt(world, relationship.id);
                const employer = relationship.organizationId
                  ? organizationProfileAt(world, relationship.organizationId)
                      ?.name
                  : null;
                return (
                  <li key={relationship.id} data-record-id={relationship.id}>
                    {workRoleAt(world, relationship.id)?.title}
                    {employer ? ` · ${employer}` : ""}
                    <p>
                      {proseDate(relationship.startedAt)}
                      {status?.status === "ended"
                        ? ` to ${proseDate(status.effectiveAt)}`
                        : status?.status === "active"
                          ? " to present"
                          : ""}
                    </p>
                  </li>
                );
              },
            )}
          </ul>
          <h3>Education</h3>
          <ul data-testid="personal-education">
            {educationEnrollmentHistoryForPerson(world, personId).map(
              (enrollment) => {
                const state = educationEnrollmentStateAt(world, enrollment.id);
                return (
                  <li key={enrollment.id} data-record-id={enrollment.id}>
                    {
                      organizationProfileAt(world, enrollment.organizationId)
                        ?.name
                    }
                    <p>
                      {proseDate(enrollment.startedAt)}
                      {state &&
                      state.status !== "active" &&
                      state.status !== "expected"
                        ? ` to ${proseDate(state.effectiveAt)}`
                        : state?.status === "active"
                          ? " to present"
                          : ""}
                      {state ? ` · ${state.status}` : ""}
                    </p>
                  </li>
                );
              },
            )}
          </ul>
          {life.offices.length > 0 ? (
            <section aria-label="Offices held">
              <h3>Offices held</h3>
              {life.offices.map((office) => {
                const start = office.startsAt.slice(0, 4);
                const endYear = office.endsAt
                  ? Number(office.endsAt.slice(0, 4)) -
                    (office.endsAt.slice(5) === "01-01" ? 1 : 0)
                  : null;
                return (
                  <p key={`${office.officeKey}:${office.startsAt}`}>
                    {office.title},{" "}
                    {endYear && endYear >= Number(start)
                      ? `${start}–${endYear}`
                      : start}
                  </p>
                );
              })}
            </section>
          ) : null}
          {lives.around.length ? (
            <section aria-label="Around you">
              <h3>Around you</h3>
              {lives.around.map((line) => (
                <p key={line.key}>{line.sentence}</p>
              ))}
            </section>
          ) : null}
          {life.chapters.map((chapter) => (
            <section key={chapter.key}>
              <h3>{chapter.heading}</h3>
              {chapter.entries.map((entry) => (
                <p key={entry.key}>
                  <time dateTime={entry.at}>{proseDate(entry.at)}</time> ·{" "}
                  {entry.sentence}
                </p>
              ))}
            </section>
          ))}
        </section>
      )}
    </section>
  );
}
