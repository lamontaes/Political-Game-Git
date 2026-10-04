import { useState, type ReactNode } from "react";

import {
  addSimulationMinutes,
  type EntityId,
  type World,
} from "../../simulation";
import type { NewsMode } from "../../presentation/shell-navigation";
import {
  projectNewsFrontPage,
  projectNewsArticle,
  type NewsStory,
} from "../../presentation/news-front-page";
import { world39Date } from "../World39News";
import {
  readTransitDecisionReport,
  TRANSIT_REPORT_READ_MINUTES,
  unreadTransitDecisionReportIds,
} from "../../presentation/transit-report-reading";
import {
  describeTimeTarget,
  PROTECTED_STOP_NOTE,
} from "../../presentation/time-target-label";
import "./news.css";
import { GameSelect } from "../controls/GameSelect";
import { useSharedTimeCommand } from "../time-command-runner";

export type NewsContext = "read" | "around" | "directory" | "press";

const CONTEXTS: readonly { key: NewsContext; label: string }[] = [
  { key: "read", label: "Front page" },
  { key: "around", label: "Around you" },
  { key: "directory", label: "Outlets and follows" },
  { key: "press", label: "Press office" },
];

/**
 * The News desk (OCD-UI-005). News opens on the front page and nothing else;
 * the orientation reader, the outlet directory with follows, and the player's
 * own press office are separate contexts one tab away, never stacked under
 * the paper.
 */
export function NewsDesk({
  world,
  context,
  onContextChange,
  mode,
  outletKey,
  onModeChange,
  onOutletChange,
  onOpenPerson,
  onOpenMeasure,
  onReadPublication,
  around,
  directory,
  press,
}: {
  readonly world: World;
  readonly context: NewsContext;
  readonly onContextChange: (context: NewsContext) => void;
  readonly mode: NewsMode;
  readonly outletKey: string | null;
  readonly onModeChange: (mode: NewsMode) => void;
  readonly onOutletChange: (outletKey: string) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** Opens a law's own page from a story about it. */
  readonly onOpenMeasure?: (measureId: EntityId) => void;
  /** Explicit headline read; absent in observer and informational previews. */
  readonly onReadPublication?: (publicationId: EntityId) => void;
  readonly around: ReactNode;
  readonly directory: ReactNode;
  readonly press: ReactNode;
}) {
  const page = projectNewsFrontPage(world, mode, outletKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readNotice, setReadNotice] = useState<string | null>(null);
  const runner = useSharedTimeCommand();
  const unreadReports = unreadTransitDecisionReportIds(world);
  const reportReadTarget = describeTimeTarget(
    addSimulationMinutes(world.currentMoment, TRANSIT_REPORT_READ_MINUTES),
  );
  const selected = selectedId
    ? projectNewsArticle(world, selectedId as EntityId)
    : null;
  const openArticle = (story: NewsStory) => {
    setReadNotice(null);
    // The headline click is the explicit read; front-page projection is free.
    if (!unreadReports.has(story.id)) {
      onReadPublication?.(story.id);
      setSelectedId(story.id);
      return;
    }
    if (!runner) {
      setSelectedId(story.id);
      return;
    }
    let completed = false;
    runner.perform(
      (current, handlers) => {
        const result = readTransitDecisionReport(current, story.id, handlers);
        completed = result.completed;
        return { world: result.world, outcome: result.outcome };
      },
      (report) => {
        setReadNotice(report.outcome);
        if (report.status === "accepted" && completed) setSelectedId(story.id);
      },
    );
  };
  const reportReadingLabel = (story: NewsStory) =>
    runner && unreadReports.has(story.id)
      ? `Reading this report takes ${TRANSIT_REPORT_READ_MINUTES} minutes, to ${reportReadTarget}. ${PROTECTED_STOP_NOTE}`
      : null;
  return (
    <div className="pg-news-desk" data-testid="news-desk">
      <nav aria-label="News" className="pg-news-sections">
        {CONTEXTS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={item.key === context ? "page" : undefined}
            data-testid={`news-section-${item.key}`}
            onClick={() => {
              if (item.key !== context) onContextChange(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {context === "read" ? (
        <section
          aria-label="Front page"
          className="pg-news-read"
          data-testid="news-front-page"
        >
          <div className="pg-news-switch">
            <div role="group" aria-label="Front page">
              <button
                type="button"
                aria-pressed={mode === "front"}
                data-testid="news-mode-front"
                onClick={() => onModeChange("front")}
              >
                All papers
              </button>
              <button
                type="button"
                aria-pressed={mode === "publication"}
                data-testid="news-mode-publication"
                disabled={page.mastheads.length === 0}
                onClick={() => onModeChange("publication")}
              >
                One paper
              </button>
            </div>
            {mode === "publication" && page.mastheads.length > 0 ? (
              <label>
                Paper
                <GameSelect
                  data-testid="news-paper-select"
                  value={page.outlet?.outletKey ?? ""}
                  onChange={(event) => onOutletChange(event.target.value)}
                >
                  {page.mastheads.map((masthead) => (
                    <option key={masthead.outletKey} value={masthead.outletKey}>
                      {masthead.outletName}
                    </option>
                  ))}
                </GameSelect>
              </label>
            ) : null}
          </div>

          {page.outlet ? (
            <header
              className={`pg-news-masthead pg-news-masthead--${page.outlet.style}`}
              data-testid="news-masthead"
            >
              <h2>{page.outlet.outletName}</h2>
              <p>{world39Date(world.currentDate)}</p>
            </header>
          ) : (
            <header
              className="pg-news-masthead pg-news-masthead--front"
              data-testid="news-masthead"
            >
              <h2>The front pages</h2>
              <p>
                {world39Date(world.currentDate)}
                {page.mastheads.length > 0
                  ? ` · ${page.mastheads.map((item) => item.outletName).join(" · ")}`
                  : ""}
              </p>
            </header>
          )}

          {readNotice ? <p role="status">{readNotice}</p> : null}

          {selected ? (
            <section className="pg-news-article" data-testid="news-article">
              <button
                type="button"
                className="ui-action"
                onClick={() => setSelectedId(null)}
              >
                ← Front page
              </button>
              <Story
                story={selected}
                lead
                expanded
                showOutlet
                style={0}
                onOpenPerson={onOpenPerson}
                {...(onOpenMeasure ? { onOpenMeasure } : {})}
                onRead={() => {}}
              />
            </section>
          ) : page.empty ? (
            <p className="pg-news-empty" data-testid="news-empty">
              {page.empty}
            </p>
          ) : (
            <>
              {page.lead ? (
                <Story
                  story={page.lead}
                  lead
                  showOutlet={mode === "front"}
                  style={
                    page.mastheads.find(
                      (item) => item.outletKey === page.lead!.outletKey,
                    )?.style ?? 0
                  }
                  onOpenPerson={onOpenPerson}
                  {...(onOpenMeasure ? { onOpenMeasure } : {})}
                  onRead={() => openArticle(page.lead!)}
                  readingLabel={reportReadingLabel(page.lead)}
                  readPending={
                    runner?.pending && unreadReports.has(page.lead.id)
                  }
                />
              ) : null}
              {page.stories.length > 0 ? (
                <div className="pg-news-columns">
                  {page.stories.map((story) => (
                    <Story
                      key={story.id}
                      story={story}
                      showOutlet={mode === "front"}
                      style={
                        page.mastheads.find(
                          (item) => item.outletKey === story.outletKey,
                        )?.style ?? 0
                      }
                      onOpenPerson={onOpenPerson}
                      {...(onOpenMeasure ? { onOpenMeasure } : {})}
                      onRead={() => openArticle(story)}
                      readingLabel={reportReadingLabel(story)}
                      readPending={
                        runner?.pending && unreadReports.has(story.id)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <DeskSection
          id={context}
          title={CONTEXTS.find((item) => item.key === context)!.label}
        >
          {context === "around"
            ? around
            : context === "directory"
              ? directory
              : press}
        </DeskSection>
      )}
    </div>
  );
}

function DeskSection({
  id,
  title,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      className="pg-news-section"
      aria-labelledby={`news-desk-${id}-title`}
      data-testid={`news-${id}`}
    >
      <h2 id={`news-desk-${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

function Story({
  story,
  lead = false,
  showOutlet,
  style,
  onOpenPerson,
  onOpenMeasure,
  onRead,
  readingLabel = null,
  readPending = false,
  expanded = false,
}: {
  readonly story: NewsStory;
  readonly onRead: () => void;
  readonly readingLabel?: string | null;
  readonly readPending?: boolean;
  readonly expanded?: boolean;
  readonly lead?: boolean;
  readonly showOutlet: boolean;
  readonly style: number;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** Opens a law's own page from a story about it. */
  readonly onOpenMeasure?: (measureId: EntityId) => void;
}) {
  return (
    <article
      className={`pg-news-story${lead ? " pg-news-story--lead" : ""}`}
      data-testid={lead ? "news-lead" : "news-story"}
      data-story-id={story.id}
    >
      {showOutlet ? (
        <p className={`pg-news-kicker pg-news-masthead--${style}`}>
          {story.outletName}
        </p>
      ) : null}
      <h3>
        {expanded ? (
          story.readerHeadline
        ) : (
          <button
            className="pg-news-headline"
            type="button"
            onClick={onRead}
            disabled={readPending}
          >
            {story.readerHeadline}
          </button>
        )}
      </h3>
      {readingLabel ? <p>{readingLabel}</p> : null}
      <p className="pg-news-dateline">
        {story.place ? `${story.place} · ` : ""}
        <time dateTime={story.publishedAt}>
          {world39Date(story.publishedAt)}
        </time>
      </p>
      {story.body !== story.readerHeadline ? (
        <p className="pg-news-body">
          {expanded || story.body.length < 280
            ? story.body
            : `${story.body.slice(0, 277)}…`}
        </p>
      ) : null}
      {story.people.length > 0 ? (
        <p className="pg-news-people">
          {story.people.map((person) => (
            <button
              key={person.personId}
              type="button"
              onClick={() => onOpenPerson(person.personId)}
            >
              {person.label}
            </button>
          ))}
        </p>
      ) : null}
      {onOpenMeasure && story.laws.length > 0 ? (
        <p className="pg-news-laws" data-testid="news-story-laws">
          {story.laws.map((law) => (
            <button
              key={law.measureId}
              type="button"
              data-testid={`news-story-law-${law.measureId}`}
              onClick={() => onOpenMeasure(law.measureId)}
            >
              {law.label}
            </button>
          ))}
        </p>
      ) : null}
    </article>
  );
}
