import { proseDate } from "../presentation/prose-dates";
import {
  journalChronicleInFirstPerson,
  journalInFirstPerson,
} from "../presentation/journal-first-person";
import { useState } from "react";
import type { EntityId, World } from "../simulation";
import type { JournalView } from "../presentation/shell-navigation";
import {
  projectJournalView,
  withChronicleLead,
  type JournalChronicleLine,
} from "../presentation/journal-views";
import { projectWorld39Journal } from "../presentation/world39-journal";
import "./world39-readers.css";
import { GameSelect } from "./controls/GameSelect";

/** Dated life chapters and years, read from the canonical history. */
export function World39Journal({
  world,
  personId,
  view: savedView,
  year: savedYear,
  onViewChange,
  onYearChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
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
        {shown.sections.map((chapter) => {
          // The Journal is the character's own: "I", and past tense.
          const told = new Map(
            journalChronicleInFirstPerson(
              chapter.chronicle.map((line) => ({
                id: line.entry.id,
                text: line.entry.text,
              })),
            ).map((line) => [line.id, line]),
          );
          return (
            <section
              key={chapter.key}
              className="world39-chapter"
              data-testid="world39-chapter"
              data-year={chapter.span ?? undefined}
            >
              <h4>
                {chapter.heading}
                {chapter.span && !chapter.heading.startsWith(chapter.span) ? (
                  <span className="world39-chapter-span">
                    {" "}
                    · {chapter.span}
                  </span>
                ) : null}
              </h4>
              {chronicleParagraphs(chapter.chronicle).map((paragraph) => (
                <p key={paragraph[0]!.entry.id}>
                  {paragraph
                    .filter((line) => !told.get(line.entry.id)?.absorbed)
                    .map((line, index) => (
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
                            <span className="world39-meta">
                              As I heard it:{" "}
                            </span>
                            {told.get(line.entry.id)?.firstPerson ??
                              line.entry.text}
                          </>
                        ) : (
                          withChronicleLead(
                            line.lead,
                            told.get(line.entry.id)?.firstPerson ??
                              line.entry.text,
                          )
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
                      {journalInFirstPerson(repeat.first.text)}{" "}
                      {repeat.count - 1} more like it followed, the last on{" "}
                      {proseDate(repeat.lastAt)}.
                    </span>
                  ))}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
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
