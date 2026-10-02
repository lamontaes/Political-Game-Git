import { projectJournalStory } from "../presentation/journal-story";
import { useState, type ReactNode } from "react";
import type { EntityId, World } from "../simulation";
import type {
  JournalView,
  PrivateJournal,
} from "../presentation/shell-navigation";
import { projectJournalView } from "../presentation/journal-views";
import { projectLifeRecord } from "../presentation/life-record";
import { projectWorld39Journal } from "../presentation/world39-journal";
import { PrivateJournalEditor } from "./PrivateJournalEditor";
import { world39Date } from "./World39News";
import "./world39-readers.css";
import { GameSelect } from "./controls/GameSelect";

/** The root may supply a custom Record UI; the default preserves its exact prose. */
export function World39Journal({
  world,
  personId,
  journal,
  onJournalChange,
  onOpenPerson,
  record,
  view: savedView,
  year: savedYear,
  onViewChange,
  onYearChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly journal: PrivateJournal;
  readonly onJournalChange: (journal: PrivateJournal) => void;
  readonly onOpenPerson: (id: EntityId) => void;
  readonly record?: ReactNode;
  /** Chapters or Years; kept by the caller when it saves preferences. */
  readonly view?: JournalView;
  readonly year?: string | null;
  readonly onViewChange?: (view: JournalView) => void;
  readonly onYearChange?: (year: string | null) => void;
}) {
  const [localView, setLocalView] = useState<JournalView>("chapters");
  const [localYear, setLocalYear] = useState<string | null>(null);
  const view = savedView ?? localView;
  const year = savedYear === undefined ? localYear : savedYear;
  const chooseView = onViewChange ?? setLocalView;
  const chooseYear = onYearChange ?? setLocalYear;
  const biography = projectWorld39Journal(world, personId);
  const shown = projectJournalView(world, personId, view, year);
  const story = projectJournalStory(world, personId, shown.year);
  const legacy = projectLifeRecord(world, personId);
  const birthDate = world.people[personId]?.birthDate ?? world.currentDate;
  return (
    <section
      className="world39-reader"
      aria-label="Life journal"
      data-testid="world39-journal"
    >
      <h3>My life so far</h3>
      <p>{biography.name}</p>
      {!biography.entries.some((entry) => entry.at > birthDate) ? (
        <p data-testid="world39-journal-sparse">
          Nothing more has happened yet.
        </p>
      ) : null}
      <div className="world39-journal-controls" data-testid="journal-controls">
        <div role="group" aria-label="Journal view">
          {(
            [
              ["chapters", "Chapters"],
              ["years", "Years"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              data-testid={`journal-view-${key}`}
              onClick={() => chooseView(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Year
          <GameSelect
            data-testid="journal-year"
            value={shown.year ?? ""}
            onChange={(event) => chooseYear(event.target.value || null)}
          >
            <option value="">All years</option>
            {shown.years.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </GameSelect>
        </label>
      </div>
      <div
        className="world39-biography"
        data-testid="world39-biography"
        data-view={shown.view}
      >
        {story.map((chapter) => (
          <section
            key={chapter.key}
            className="world39-chapter"
            data-testid="world39-chapter"
          >
            <h4>{chapter.heading}</h4>
            {chapter.paragraphs.map((paragraph) => (
              <p
                key={paragraph.entries[0]!.id}
                data-source-ids={paragraph.sourceRecordIds.join(" ")}
              >
                {paragraph.text}
              </p>
            ))}
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
