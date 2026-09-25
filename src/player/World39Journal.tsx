import { proseDate } from "../presentation/prose-dates";
import { useState, type ReactNode } from "react";
import type { EntityId, World } from "../simulation";
import type {
  JournalView,
  PrivateJournal,
} from "../presentation/shell-navigation";
import {
  withChronicleLead,
  type JournalChronicleLine,
} from "../presentation/journal-views";
import { projectLifeRecord } from "../presentation/life-record";
import { projectMyLifeJournalView } from "../presentation/my-life-journal";
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
  const shown = projectMyLifeJournalView(world, personId, view, year);
  const dated = projectWorld39Journal(world, personId);
  const legacy = projectLifeRecord(world, personId);
  const datedSourceIds = new Set(dated.entries.map((entry) => entry.sourceId));
  const datedRecord = [
    ...dated.entries.map((entry) => ({
      key: `world39:${entry.id}`,
      at: entry.at,
      sentence: entry.text,
    })),
    ...legacy.chapters
      .flatMap((chapter) => chapter.entries)
      .filter(
        (entry) =>
          entry.anchors.length === 0 ||
          !entry.anchors.every((anchor) => datedSourceIds.has(anchor.recordId)),
      ),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key));
  return (
    <section
      className="world39-reader"
      aria-label="Life journal"
      data-testid="world39-journal"
    >
      <h3>My life</h3>
      <p>{shown.name}</p>
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
        {shown.sections.map((chapter) => (
          <section
            key={chapter.key}
            className="world39-chapter"
            data-testid="world39-chapter"
            data-year={chapter.span ?? undefined}
          >
            <h4>
              {chapter.heading}
              {chapter.span && !chapter.heading.startsWith(chapter.span) ? (
                <span className="world39-chapter-span"> · {chapter.span}</span>
              ) : null}
            </h4>
            {chronicleParagraphs(chapter.chronicle).map((paragraph) => (
              <p key={paragraph[0]!.entry.id}>
                {paragraph.map((line, index) => (
                  <span
                    key={line.entry.id}
                    id={`world39-journal-${line.entry.id}`}
                    data-entry-kind={line.entry.kind}
                    data-source-id={line.entry.sourceId}
                    data-at={line.entry.at}
                  >
                    {index > 0 ? " " : ""}
                    {line.entry.kind === "account" ? (
                      <>
                        <span className="world39-meta">As you heard it: </span>
                        {line.entry.text}
                      </>
                    ) : (
                      withChronicleLead(line.lead, line.entry.text)
                    )}
                  </span>
                ))}
              </p>
            ))}
            {chapter.repeats.length > 0 ? (
              <p
                className="world39-repeats"
                data-testid="world39-chapter-repeats"
              >
                {chapter.repeats.map((repeat, index) => (
                  <span
                    key={repeat.first.id}
                    id={`world39-journal-${repeat.first.id}`}
                    data-entry-kind={repeat.first.kind}
                    data-source-id={repeat.first.sourceId}
                    data-at={repeat.first.at}
                    data-count={repeat.count}
                  >
                    {index > 0 ? " " : ""}
                    {repeat.first.text} {repeat.count - 1} more like it
                    followed, the last on {proseDate(repeat.lastAt)}.
                  </span>
                ))}
              </p>
            ) : null}
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
            {datedRecord.map((entry) => (
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

/** The chronicle's lines, split where a line starts a paragraph. */
function chronicleParagraphs(
  lines: readonly JournalChronicleLine[],
): readonly (readonly JournalChronicleLine[])[] {
  const paragraphs: JournalChronicleLine[][] = [];
  for (const line of lines) {
    if (line.startsParagraph || paragraphs.length === 0) paragraphs.push([]);
    paragraphs[paragraphs.length - 1]!.push(line);
  }
  return paragraphs;
}
