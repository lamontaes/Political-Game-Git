import type { ReactNode } from "react";
import type { EntityId, World } from "../simulation";
import type { PrivateJournal } from "../presentation/shell-navigation";
import { projectLifeRecord } from "../presentation/life-record";
import { projectWorld39Journal } from "../presentation/world39-journal";
import { PrivateJournalEditor } from "./PrivateJournalEditor";
import { world39Date } from "./World39News";
import "./world39-readers.css";

/** The root may supply a custom Record UI; the default preserves its exact prose. */
export function World39Journal({
  world,
  personId,
  journal,
  onJournalChange,
  onOpenPerson,
  record,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly journal: PrivateJournal;
  readonly onJournalChange: (journal: PrivateJournal) => void;
  readonly onOpenPerson: (id: EntityId) => void;
  readonly record?: ReactNode;
}) {
  const biography = projectWorld39Journal(world, personId);
  const legacy = projectLifeRecord(world, personId);
  const birthDate = world.people[personId]?.birthDate ?? world.currentDate;
  return (
    <section
      className="world39-reader"
      aria-label="Life journal"
      data-testid="world39-journal"
    >
      <h3>Your life so far</h3>
      <p>{biography.name}</p>
      {!biography.entries.some((entry) => entry.at > birthDate) ? (
        <p data-testid="world39-journal-sparse">
          Nothing more has happened yet.
        </p>
      ) : null}
      <div className="world39-biography" data-testid="world39-biography">
        {biography.chapters.map((chapter) => (
          <section
            key={chapter.key}
            className="world39-chapter"
            data-testid="world39-chapter"
            data-year={chapter.year}
          >
            <h4>{chapter.heading}</h4>
            <p>
              {chapter.entries.map((entry, index) => (
                <span
                  key={entry.id}
                  id={`world39-journal-${entry.id}`}
                  data-entry-kind={entry.kind}
                  data-source-id={entry.sourceId}
                  data-at={entry.at}
                >
                  {index > 0 ? " " : ""}
                  {entry.kind === "account" ? (
                    <>
                      <span className="world39-meta">As you heard it: </span>
                      {entry.text}
                    </>
                  ) : (
                    entry.text
                  )}
                </span>
              ))}
            </p>
          </section>
        ))}
      </div>
      <details className="world39-notes">
        <summary>Private notes and intentions</summary>
        <PrivateJournalEditor
          journal={journal}
          onChange={onJournalChange}
          people={legacy.people}
          events={legacy.chapters.flatMap((chapter) => chapter.entries)}
          onOpenPerson={onOpenPerson}
        />
      </details>
      <details className="world39-record">
        <summary>Record</summary>
        {record ?? (
          <ol>
            {legacy.chapters
              .flatMap((chapter) => chapter.entries)
              .map((entry) => (
                <li
                  key={entry.key}
                  id={`journal-entry-${encodeURIComponent(entry.key)}`}
                >
                  <time dateTime={entry.at}>{world39Date(entry.at)}</time>
                  <p>{entry.sentence}</p>
                </li>
              ))}
          </ol>
        )}
      </details>
    </section>
  );
}
