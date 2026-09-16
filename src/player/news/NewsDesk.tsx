import type { ReactNode } from "react";

import type { EntityId, World } from "../../simulation";
import type { NewsMode } from "../../presentation/shell-navigation";
import {
  projectNewsFrontPage,
  type NewsStory,
} from "../../presentation/news-front-page";
import { world39Date } from "../World39News";
import "./news.css";

const SECTIONS: readonly { key: string; label: string }[] = [
  { key: "read", label: "Front page" },
  { key: "around", label: "Around you" },
  { key: "directory", label: "Outlets and follows" },
  { key: "press", label: "Press office" },
];

/**
 * The News desk (OCD-UI-005). Reading comes first, as a front page; the
 * orientation reader, the outlet directory and the player's own press work
 * follow as their own labelled sections, each one jump away.
 */
export function NewsDesk({
  world,
  mode,
  outletKey,
  onModeChange,
  onOutletChange,
  onOpenPerson,
  around,
  directory,
  press,
}: {
  readonly world: World;
  readonly mode: NewsMode;
  readonly outletKey: string | null;
  readonly onModeChange: (mode: NewsMode) => void;
  readonly onOutletChange: (outletKey: string) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly around: ReactNode;
  readonly directory: ReactNode;
  readonly press: ReactNode;
}) {
  const page = projectNewsFrontPage(world, mode, outletKey);
  return (
    <div className="pg-news-desk" data-testid="news-desk">
      <nav aria-label="News sections" className="pg-news-sections">
        {SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            data-testid={`news-section-${item.key}`}
            onClick={() => {
              const target = document.getElementById(`news-desk-${item.key}`);
              target?.scrollIntoView({ block: "start" });
              target?.focus({ preventScroll: true });
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section
        id="news-desk-read"
        tabIndex={-1}
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
              <select
                data-testid="news-paper-select"
                value={page.outlet?.outletKey ?? ""}
                onChange={(event) => onOutletChange(event.target.value)}
              >
                {page.mastheads.map((masthead) => (
                  <option key={masthead.outletKey} value={masthead.outletKey}>
                    {masthead.outletName}
                  </option>
                ))}
              </select>
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

        {page.empty ? (
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
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
      <DeskSection id="around" title="Around you">
        {around}
      </DeskSection>
      <DeskSection id="directory" title="Outlets and follows">
        {directory}
      </DeskSection>
      <DeskSection id="press" title="Press office">
        {press}
      </DeskSection>
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
      id={`news-desk-${id}`}
      tabIndex={-1}
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
}: {
  readonly story: NewsStory;
  readonly lead?: boolean;
  readonly showOutlet: boolean;
  readonly style: number;
  readonly onOpenPerson: (personId: EntityId) => void;
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
      <h3>{story.headline}</h3>
      <p className="pg-news-dateline">
        {story.place ? `${story.place} · ` : ""}
        <time dateTime={story.publishedAt}>
          {world39Date(story.publishedAt)}
        </time>
      </p>
      {story.body !== story.headline ? (
        <p className="pg-news-body">{story.body}</p>
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
    </article>
  );
}
