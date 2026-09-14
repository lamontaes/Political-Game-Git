import { useMemo } from "react";
import type { EntityId, World } from "../simulation";
import { projectLifeBiography } from "../presentation/life-biography";
import { projectLifeRecord } from "../presentation/life-record";
import type { PrivateJournal } from "../presentation/shell-navigation";
import { PrivateJournalEditor } from "./PrivateJournalEditor";
import "./journal-reader.css";

export const JOURNAL_ACCOUNT_HEADING = "Your life so far";
export const JOURNAL_RECORD_HEADING = "Exact record";
export const JOURNAL_RECORD_EMPTY =
  "Nothing has been written down yet. It will fill up as the life goes on.";
export const JOURNAL_OPEN_HEADING = "Still open";
export const JOURNAL_PEOPLE_HEADING = "People";

export function JournalReader({
  journal,
  onJournalChange,
  world,
  personId,
  onOpenPerson,
  showNotes,
}: {
  readonly journal?: PrivateJournal;
  readonly onJournalChange?: (journal: PrivateJournal) => void;
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson?: (id: EntityId) => void;
  readonly showNotes: boolean;
}) {
  const biography = useMemo(
    () => projectLifeBiography(world, personId),
    [world, personId],
  );
  const record = useMemo(
    () => projectLifeRecord(world, personId),
    [world, personId],
  );

  return (
    <div className="journal-reader" data-testid="journal-reader">
      <section
        className="journal-account"
        aria-labelledby="journal-account-title"
        data-testid="journal-account"
      >
        <h3 id="journal-account-title">{JOURNAL_ACCOUNT_HEADING}</h3>
        <p className="game-note">{biography.summary}</p>
        {biography.emptyReason ? (
          <p className="game-note" data-testid="journal-account-empty">
            {biography.emptyReason}
          </p>
        ) : (
          <div data-testid="journal-account-passages">
            {biography.chapters.map((chapter) => (
              <section
                key={chapter.key}
                className="journal-account-chapter"
                data-testid="journal-account-chapter"
                data-year={chapter.year}
              >
                <h4>{chapter.heading}</h4>
                <p>
                  {chapter.passages.map((passage, index) => (
                    <span
                      key={passage.key}
                      data-testid="journal-account-sentence"
                      data-biography-aspect={passage.aspect}
                      data-record-id={passage.recordId}
                      data-at={passage.at}
                    >
                      {index > 0 ? " " : ""}
                      {passage.sentence}
                    </span>
                  ))}
                </p>
              </section>
            ))}
          </div>
        )}
      </section>

      {showNotes && journal && onJournalChange && onOpenPerson ? (
        <PrivateJournalEditor
          journal={journal}
          onChange={onJournalChange}
          people={record.people}
          events={record.chapters.flatMap((chapter) => chapter.entries)}
          onOpenPerson={onOpenPerson}
        />
      ) : null}

      <section
        className="journal-exact-record"
        aria-labelledby="journal-record-title"
      >
        <h3 id="journal-record-title">{JOURNAL_RECORD_HEADING}</h3>
        <p className="game-note">{record.summary}</p>
        {record.chapters.length === 0 ? (
          <p className="game-note" data-testid="journal-empty">
            {JOURNAL_RECORD_EMPTY}
          </p>
        ) : (
          <ol data-testid="journal-entries">
            {record.chapters.map((chapter) => (
              <li key={chapter.key}>
                <strong>{chapter.heading}</strong>
                <ul>
                  {chapter.entries.map((entry) => (
                    <li
                      key={entry.key}
                      id={`journal-entry-${encodeURIComponent(entry.key)}`}
                    >
                      {entry.sentence}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}

        {record.people.length > 0 && onOpenPerson ? (
          <>
            <h3>{JOURNAL_PEOPLE_HEADING}</h3>
            <ul data-testid="journal-people">
              {record.people.map((person) => (
                <li key={person.personId}>
                  <button
                    type="button"
                    className="pg-inline-link"
                    data-testid={`journal-person-${person.personId}`}
                    onClick={() => onOpenPerson(person.personId)}
                  >
                    {person.name}
                  </button>
                  <span> {person.sentence.slice(person.name.length)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : record.people.length > 0 ? (
          <>
            <h3>{JOURNAL_PEOPLE_HEADING}</h3>
            <ul data-testid="journal-people">
              {record.people.map((person) => (
                <li key={person.personId}>{person.sentence}</li>
              ))}
            </ul>
          </>
        ) : null}

        {record.open.length > 0 ? (
          <>
            <h3>{JOURNAL_OPEN_HEADING}</h3>
            <ul data-testid="journal-open">
              {record.open.map((entry) => (
                <li
                  key={entry.key}
                  id={`journal-entry-${encodeURIComponent(entry.key)}`}
                >
                  {entry.sentence}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
