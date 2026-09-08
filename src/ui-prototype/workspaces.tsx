import {
  PROTOTYPE_CHAPTERS,
  PROTOTYPE_FUNDS,
  PROTOTYPE_MEASURES,
  PROTOTYPE_MEETINGS,
  PROTOTYPE_OPEN_THREADS,
  PROTOTYPE_PEOPLE,
  PROTOTYPE_PLAYER,
  PROTOTYPE_PROPERTY,
  dayLabelFor,
  findChapter,
  findMeasure,
  findMeeting,
  findOffice,
  findOrganization,
  findPerson,
  formatMinute,
  kindLabel,
  labelForRef,
  type EntityRef,
  type PersonCategory,
  type PrototypePerson,
} from "./data";
import { FactList, RefLink, Row, Section, Workspace } from "./parts";
import { isPinned, type PrototypeAction, type PrototypeState } from "./state";
import { CANONICAL_VERSION, PATCH_NOTE_SECTIONS } from "./version";

/**
 * The prototype's information destinations.
 *
 * DEVELOPMENT-ONLY. Every screen here is a deliberately opened workspace, never
 * an always-on dashboard, and every one of them routes through the same
 * `openEntity` / `back` primitives rather than keeping a navigation stack of its
 * own. That shared contract is the point: it is why Back behaves identically
 * after a pin, a scene person, a directory row, a journal reference and a
 * calendar entry.
 */

export interface WorkspaceContext {
  readonly state: PrototypeState;
  readonly dispatch: (action: PrototypeAction) => void;
  readonly openEntity: (ref: EntityRef) => void;
  readonly back: () => void;
  readonly close: () => void;
  readonly canGoBack: boolean;
}

function PinToggle({
  context,
  refValue,
}: {
  readonly context: WorkspaceContext;
  readonly refValue: EntityRef;
}) {
  const pinned = isPinned(context.state, refValue);
  return (
    <button
      type="button"
      className="p-button"
      data-variant="accent"
      data-testid="workspace-pin"
      aria-pressed={pinned}
      onClick={() => context.dispatch({ type: "toggle-pin", ref: refValue })}
    >
      {pinned ? "Unpin" : "Pin"}
    </button>
  );
}

/* ---------------------------------------------------------------- People */

const CATEGORIES: readonly (PersonCategory | "all")[] = [
  "all",
  "family",
  "friends",
  "work",
  "politics",
  "organizations",
];

const CATEGORY_LABELS: Record<PersonCategory | "all", string> = {
  all: "All",
  family: "Family",
  friends: "Friends",
  work: "Work",
  politics: "Politics",
  organizations: "Organizations",
};

function matchesQuery(person: PrototypePerson, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    person.name.toLowerCase().includes(needle) ||
    person.role.toLowerCase().includes(needle)
  );
}

/**
 * People — a directory, not a list of available conversations.
 *
 * The Relationship Web is DEFERRED from this first owner review by explicit
 * instruction. The view preference below therefore offers the two views this
 * build actually has, and the Options screen says plainly that the web is not
 * in this review rather than showing a preference that leads nowhere.
 *
 * No row carries a numeric relationship score. What the player knows about
 * someone is the qualitative sentence, and that is all.
 */
export function PeopleWorkspace({
  context,
}: {
  readonly context: WorkspaceContext;
}) {
  const { state, dispatch } = context;
  const people = PROTOTYPE_PEOPLE.filter(
    (person) =>
      (state.peopleCategory === "all" ||
        person.categories.includes(state.peopleCategory)) &&
      matchesQuery(person, state.peopleQuery),
  );

  return (
    <Workspace
      kicker="Directory"
      title="People"
      testId="people-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
    >
      <div className="p-filters">
        <label className="p-sr-only" htmlFor="people-search">
          Filter people by name or role
        </label>
        <input
          id="people-search"
          className="p-search"
          type="search"
          placeholder="Filter by name or role"
          data-testid="people-filter"
          value={state.peopleQuery}
          onChange={(event) =>
            dispatch({ type: "set-people-query", query: event.target.value })
          }
        />
        <button
          type="button"
          className="p-button"
          data-testid="people-view-toggle"
          onClick={() =>
            dispatch({
              type: "set-people-view",
              view: state.peopleView === "categories" ? "list" : "categories",
            })
          }
        >
          View: {state.peopleView === "categories" ? "Categories" : "List"}
        </button>
      </div>

      {state.peopleView === "categories" ? (
        <>
          <div className="p-filters" role="group" aria-label="Categories">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className="p-button"
                data-testid={`people-category-${category}`}
                aria-current={state.peopleCategory === category}
                onClick={() =>
                  dispatch({ type: "set-people-category", category })
                }
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
          <div data-testid="people-categories">
            {CATEGORIES.filter(
              (category) =>
                category !== "all" &&
                (state.peopleCategory === "all" ||
                  state.peopleCategory === category),
            ).map((category) => {
              const inCategory = people.filter(
                (person) =>
                  category !== "all" && person.categories.includes(category),
              );
              if (inCategory.length === 0) return null;
              return (
                <Section
                  key={category}
                  title={CATEGORY_LABELS[category as PersonCategory]}
                >
                  {inCategory.map((person) => (
                    <Row
                      key={person.id}
                      /* A person legitimately appears under more than one
                         category, so the row id is scoped to its category. */
                      testId={`people-row-${category}-${person.id}`}
                      title={person.name}
                      detail={person.role}
                      aside={person.roomId ? "In the room" : undefined}
                      onOpen={() =>
                        context.openEntity({ kind: "person", id: person.id })
                      }
                    />
                  ))}
                </Section>
              );
            })}
          </div>
        </>
      ) : (
        <div data-testid="people-list">
          {people.map((person) => (
            <Row
              key={person.id}
              testId={`people-row-${person.id}`}
              title={person.name}
              detail={person.role}
              aside={person.categories
                .map((c) => CATEGORY_LABELS[c])
                .join(" · ")}
              onOpen={() =>
                context.openEntity({ kind: "person", id: person.id })
              }
            />
          ))}
        </div>
      )}

      {people.length === 0 ? (
        <p className="p-faint">Nobody here matches that filter.</p>
      ) : null}

      <p className="p-faint">
        Relationship Web is deferred from this first review and is not built
        here.
      </p>
    </Workspace>
  );
}

/* -------------------------------------------------------------- Calendar */

/**
 * Calendar — an agenda you read.
 *
 * Reading it does not advance prototype time and could not: `PROTOTYPE_NOW` is
 * a constant and no action in the reducer touches it. Nothing here schedules,
 * reschedules or attends anything; the real scheduling engine is not this
 * prototype's to build or change.
 */
export function CalendarWorkspace({
  context,
}: {
  readonly context: WorkspaceContext;
}) {
  const days = [...new Set(PROTOTYPE_MEETINGS.map((m) => m.dayOffset))].sort(
    (a, b) => a - b,
  );

  return (
    <Workspace
      kicker="Time"
      title="Calendar"
      surface="paper"
      testId="calendar-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
    >
      <p className="p-muted">
        Tuesday 14 October, {formatMinute(11 * 60 + 20)}. Reading the calendar
        does not move the clock.
      </p>
      {days.map((dayOffset) => (
        <div className="p-calendar-day" key={dayOffset}>
          <h3>{dayLabelFor(dayOffset)}</h3>
          {PROTOTYPE_MEETINGS.filter(
            (meeting) => meeting.dayOffset === dayOffset,
          ).map((meeting) => (
            <div
              key={meeting.id}
              className="p-commitment"
              data-confidence={meeting.confidence}
            >
              <Row
                testId={`calendar-row-${meeting.id}`}
                title={meeting.title}
                detail={`${formatMinute(meeting.startMinute)} – ${formatMinute(
                  meeting.endMinute,
                )} · ${meeting.locationLabel}`}
                aside={
                  meeting.confidence === "travel"
                    ? "Travel"
                    : meeting.confidence.charAt(0).toUpperCase() +
                      meeting.confidence.slice(1)
                }
                onOpen={() =>
                  context.openEntity({ kind: "meeting", id: meeting.id })
                }
              />
            </div>
          ))}
        </div>
      ))}
    </Workspace>
  );
}

/* ------------------------------------------------------ Personal/Finances */

export function PersonalWorkspace({
  context,
}: {
  readonly context: WorkspaceContext;
}) {
  return (
    <Workspace
      kicker="Personal"
      title={PROTOTYPE_PLAYER.name}
      testId="personal-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
    >
      {/*
        U03-06. The owner could not find who they were playing. The name and
        the age are now stated once, plainly, at the top of the screen instead
        of being a sentence fragment inside a paragraph. The broader Personal
        layout is deliberately left alone: the owner reserved that.
      */}
      <Section title="Who you are">
        <p className="p-identity" data-testid="personal-identity">
          <strong data-testid="personal-name">{PROTOTYPE_PLAYER.name}</strong>
          <span data-testid="personal-age">
            {PROTOTYPE_PLAYER.age} years old
          </span>
        </p>
        <p className="p-muted">{PROTOTYPE_PLAYER.biography}</p>
        <p className="p-faint">
          A fixed prototype character. Nothing here was generated from a save,
          and in the real game the age would come from the person and the date
          the World already holds.
        </p>
      </Section>

      <Section title="Household">
        {PROTOTYPE_PLAYER.householdIds.map((id) => {
          const person = findPerson(id);
          if (!person) return null;
          return (
            <Row
              key={id}
              testId={`personal-household-${id}`}
              title={person.name}
              detail={person.role}
              onOpen={() => context.openEntity({ kind: "person", id })}
            />
          );
        })}
      </Section>

      <Section title="Money and property">
        <div className="p-grid">
          {PROTOTYPE_FUNDS.map((fund) => (
            <div
              key={fund.id}
              className="p-panel"
              data-scope={fund.scope}
              data-testid={`fund-${fund.scope}`}
            >
              <p className="p-fund-scope">
                {fund.scope === "personal"
                  ? "Personal money"
                  : fund.scope === "campaign"
                    ? "Campaign money"
                    : "Public money"}
              </p>
              <h3>
                {fund.label} · {fund.amount}
              </h3>
              <p className="p-muted">{fund.authority}</p>
              <dl className="p-defs">
                {fund.lines.map((line) => (
                  <div className="p-def" key={line.label}>
                    <dt>{line.label}</dt>
                    <dd style={{ margin: 0 }}>{line.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="p-faint">
          Three separate funds with three different authorities. They are never
          added together.
        </p>
        <div className="p-grid" style={{ marginTop: "0.7rem" }}>
          {PROTOTYPE_PROPERTY.map((item) => (
            <div className="p-panel" key={item.id}>
              <h3>{item.label}</h3>
              <p className="p-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Education and work">
        <ul className="p-defs" style={{ paddingLeft: "1rem" }}>
          {[...PROTOTYPE_PLAYER.education, ...PROTOTYPE_PLAYER.work].map(
            (line) => (
              <li key={line}>{line}</li>
            ),
          )}
        </ul>
      </Section>

      <Section title="Where this connects">
        <Row
          testId="personal-to-office"
          title="Offices and civic work"
          detail="Your seat, and what currently needs you."
          onOpen={() =>
            context.dispatch({ type: "go-to-surface", surface: "offices" })
          }
        />
        <Row
          testId="personal-to-calendar"
          title="Commitments"
          detail="What you have agreed to be at."
          onOpen={() =>
            context.dispatch({ type: "go-to-surface", surface: "calendar" })
          }
        />
        <Row
          testId="personal-to-journal"
          title="Life history"
          detail="Chapters, and what is still open."
          onOpen={() =>
            context.dispatch({ type: "go-to-surface", surface: "journal" })
          }
        />
      </Section>
    </Workspace>
  );
}

/* --------------------------------------------------------------- Offices */

/**
 * Offices / Work / Civic context.
 *
 * A contextual destination that exists because this character holds a seat. It
 * shows the role and what currently needs attention, and every pending item
 * routes to the record it is about. It builds no legislation semantics and
 * duplicates no governing adapter: the pending list is prototype content
 * pointing at prototype records.
 */
export function OfficesWorkspace({
  context,
}: {
  readonly context: WorkspaceContext;
}) {
  const office = findOffice(PROTOTYPE_PLAYER.officeId);
  if (!office) {
    return (
      <Workspace
        kicker="Civic"
        title="Offices"
        testId="offices-workspace"
        canGoBack={context.canGoBack}
        onBack={context.back}
        onClose={context.close}
      >
        <p className="p-faint">No office record is available.</p>
      </Workspace>
    );
  }

  return (
    <Workspace
      kicker="Civic context"
      title={office.title}
      testId="offices-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
      headExtra={
        <PinToggle
          context={context}
          refValue={{ kind: "office", id: office.id }}
        />
      }
    >
      <p className="p-muted">
        {office.body} · {office.termNote}
      </p>
      <p className="p-muted">{office.summary}</p>

      <Section title="Waiting on you">
        {office.pending.map((item) => (
          <Row
            key={item.id}
            testId={`office-pending-${item.id}`}
            title={item.label}
            detail={item.detail}
            aside={kindLabel(item.ref.kind)}
            onOpen={() => context.openEntity(item.ref)}
          />
        ))}
      </Section>

      <Section title="Measures">
        {PROTOTYPE_MEASURES.map((measure) => (
          <Row
            key={measure.id}
            testId={`office-measure-${measure.id}`}
            title={`${measure.designation} — ${measure.title}`}
            detail={measure.summary}
            aside={measure.stage}
            onOpen={() =>
              context.openEntity({ kind: "measure", id: measure.id })
            }
          />
        ))}
      </Section>

      <Section title="Back to the day">
        <Row
          testId="offices-to-scene"
          title="Return to the current scene"
          detail="Where your character actually is."
          onOpen={context.close}
        />
      </Section>
    </Workspace>
  );
}

/* --------------------------------------------------------------- Journal */

export function JournalWorkspace({
  context,
}: {
  readonly context: WorkspaceContext;
}) {
  return (
    <Workspace
      kicker="Life history"
      title="Journal"
      surface="paper"
      testId="journal-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
    >
      <Section title="Chapters">
        {PROTOTYPE_CHAPTERS.map((chapter) => (
          <Row
            key={chapter.id}
            testId={`journal-chapter-${chapter.id}`}
            title={chapter.title}
            detail={chapter.summary}
            aside={chapter.span}
            onOpen={() =>
              context.openEntity({ kind: "chapter", id: chapter.id })
            }
          />
        ))}
      </Section>

      <Section title="Still open">
        {PROTOTYPE_OPEN_THREADS.map((thread) => (
          <Row
            key={thread.id}
            testId={`journal-thread-${thread.id}`}
            title={thread.label}
            detail={`Opens ${labelForRef(thread.ref) ?? "an unavailable record"}`}
            aside={kindLabel(thread.ref.kind)}
            onOpen={() => context.openEntity(thread.ref)}
          />
        ))}
      </Section>
    </Workspace>
  );
}

/* --------------------------------------------------------------- Options */

/**
 * Options — only settings with a real consumer in this click-through.
 *
 * There are no audio, display or gameplay sliders here, because none of them
 * would do anything. A setting that does nothing teaches the player the menu
 * lies.
 */
export function OptionsWorkspace({
  context,
  onClose,
}: {
  readonly context: WorkspaceContext;
  readonly onClose: () => void;
}) {
  const { state, dispatch } = context;
  return (
    <Workspace
      kicker="Settings"
      title="Options"
      testId="options-workspace"
      canGoBack={false}
      onBack={onClose}
      onClose={onClose}
    >
      <div className="p-option">
        <strong>People — default view</strong>
        <p className="p-faint">
          Which view People opens in. The Relationship Web is deferred from this
          review and is deliberately not offered as a choice that would lead
          nowhere.
        </p>
        <div className="p-option-choices">
          <button
            type="button"
            className="p-button"
            data-testid="option-people-categories"
            aria-current={state.peopleView === "categories"}
            onClick={() =>
              dispatch({ type: "set-people-view", view: "categories" })
            }
          >
            Categories
          </button>
          <button
            type="button"
            className="p-button"
            data-testid="option-people-list"
            aria-current={state.peopleView === "list"}
            onClick={() => dispatch({ type: "set-people-view", view: "list" })}
          >
            List
          </button>
        </div>
      </div>

      <div className="p-option">
        <strong>Pins — default size</strong>
        <p className="p-faint">
          The size a newly pinned reference starts at. Existing pins keep the
          size you gave them.
        </p>
        <div className="p-option-choices">
          {(["tiny", "normal", "expanded"] as const).map((size) => (
            <button
              key={size}
              type="button"
              className="p-button"
              data-testid={`option-pin-${size}`}
              aria-current={state.defaultPinSize === size}
              onClick={() => dispatch({ type: "set-default-pin-size", size })}
            >
              {size === "tiny"
                ? "Compact"
                : size === "normal"
                  ? "Standard"
                  : "Expanded"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-option">
        <strong>Motion</strong>
        <p className="p-faint">
          Your operating system's reduced-motion setting is always respected.
          This override can only reduce motion further, never restore it.
        </p>
        <div className="p-option-choices">
          <button
            type="button"
            className="p-button"
            data-testid="option-motion-system"
            aria-current={state.motion === "system"}
            onClick={() => dispatch({ type: "set-motion", motion: "system" })}
          >
            Follow system
          </button>
          <button
            type="button"
            className="p-button"
            data-testid="option-motion-reduce"
            aria-current={state.motion === "reduce"}
            onClick={() => dispatch({ type: "set-motion", motion: "reduce" })}
          >
            Always reduce
          </button>
        </div>
      </div>

      <p className="p-faint">
        Settings are session-local. Nothing here writes a save or a browser
        store.
      </p>
    </Workspace>
  );
}

/* ---------------------------------------------------------- Patch notes */

/**
 * Patch notes, read straight out of the checked-out `PATCH_NOTES.md`.
 *
 * DEVELOPMENT-ONLY, and READ-ONLY in the strongest sense: this screen has no
 * copy of the notes and no copy of the version. It renders what the file says,
 * in the file's order, with the file's own headings. A section the file marks
 * UNRELEASED is labelled unreleased here, because deciding otherwise would be
 * this prototype claiming a release it did not make.
 *
 * Release automation, the version bump and the notes themselves belong to
 * VERSION-AUTO1. R1 owns the wiring that displays them and nothing else.
 */
export function PatchNotesWorkspace({
  context,
  onClose,
}: {
  readonly context: WorkspaceContext;
  readonly onClose?: () => void;
}) {
  const close = onClose ?? context.close;
  return (
    <Workspace
      kicker={`Version ${CANONICAL_VERSION}`}
      title="Patch notes"
      surface="paper"
      testId="patch-notes-workspace"
      canGoBack={onClose ? false : context.canGoBack}
      onBack={onClose ?? context.back}
      onClose={close}
    >
      <p className="p-muted" data-testid="patch-notes-version">
        This build is version {CANONICAL_VERSION}, read from the checked-out
        package. Newest first.
      </p>

      {PATCH_NOTE_SECTIONS.map((section) => (
        <article
          key={section.id}
          className="p-patch-note"
          data-released={section.released ? "true" : "false"}
          data-testid={`patch-note-${section.id}`}
        >
          <h2>{section.heading}</h2>
          <p className="p-tag" data-testid={`patch-status-${section.id}`}>
            {section.released ? "Released" : "Not released"}
          </p>
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-p${index}`}>{paragraph}</p>
          ))}
        </article>
      ))}

      <p className="p-faint">
        Shown exactly as PATCH_NOTES.md has it in this checkout. Nothing on this
        screen edits the notes, bumps the version, or accepts a candidate
        section.
      </p>
    </Workspace>
  );
}

/* ----------------------------------------------------------- Saved games */

export function SavedGamesWorkspace({
  onClose,
}: {
  readonly onClose: () => void;
}) {
  return (
    <div className="p-workspace-scrim">
      <section
        className="p-workspace"
        data-testid="saved-games-workspace"
        aria-label="Saved games"
      >
        <header className="p-workspace-head">
          <div>
            <p className="p-kicker">Title</p>
            <h1>Saved games</h1>
          </div>
          <div className="p-workspace-head-actions">
            <button
              type="button"
              className="p-close"
              aria-label="Close saved games"
              data-testid="saved-games-close"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </header>
        <div className="p-workspace-body">
          <p className="p-muted">
            This prototype has no save format and writes nothing. The list below
            shows the shape of the screen, not real saves.
          </p>
          <div className="p-panel">
            <h3>No saved games</h3>
            <p className="p-muted">
              A development prototype does not read or write the production save
              store, so there is genuinely nothing here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------ entity workspaces */

/**
 * The full record for any entity.
 *
 * One component for every kind, because the whole point of the routing contract
 * is that a person, a measure, a meeting, an office, an organization and a life
 * chapter all open the same way and all go Back the same way.
 */
export function EntityWorkspace({
  context,
  entityRef,
}: {
  readonly context: WorkspaceContext;
  readonly entityRef: EntityRef;
}) {
  const open = context.openEntity;
  const frame = (
    kicker: string,
    title: string,
    surface: "dark" | "paper",
    body: React.ReactNode,
  ) => (
    <Workspace
      kicker={kicker}
      title={title}
      surface={surface}
      testId="entity-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
      headExtra={<PinToggle context={context} refValue={entityRef} />}
    >
      {body}
    </Workspace>
  );

  switch (entityRef.kind) {
    case "person": {
      const person = findPerson(entityRef.id);
      if (!person) break;
      return frame(
        "Full record",
        person.name,
        "dark",
        <>
          <p className="p-role">{person.role}</p>
          {/*
            U03-05. What someone is doing this minute is not what they are.
            "Reading a printout" sat inside the same block as a lasting read of
            the relationship, so it looked like a permanent trait with no
            explanation. It is now a separate, quieter line next to the
            identity, marked as the passing thing it is.
          */}
          <p className="p-right-now" data-testid="person-right-now">
            <span className="p-right-now-label">Right now</span>
            {person.read}
          </p>
          <div className="p-impression">
            <strong>{person.relationship}</strong>
          </div>
          <Section title="Details">
            <FactList facts={person.facts} testId="full-facts" />
          </Section>
          <Section title="Last interaction">
            <p className="p-muted">{person.lastInteraction}</p>
            {person.unresolved ? (
              <p className="p-muted">{person.unresolved}</p>
            ) : null}
          </Section>
          {person.links.length > 0 ? (
            <Section title="Connected records">
              {person.links.map((link) => (
                <Row
                  key={`${link.kind}:${link.id}`}
                  testId={`entity-link-${link.kind}-${link.id}`}
                  title={labelForRef(link) ?? "Unavailable record"}
                  aside={kindLabel(link.kind)}
                  onOpen={() => open(link)}
                />
              ))}
            </Section>
          ) : null}
          <p className="p-faint">
            Described as your character reads it. No score, and nothing the
            simulation would keep private.
          </p>
        </>,
      );
    }

    case "meeting": {
      const meeting = findMeeting(entityRef.id);
      if (!meeting) break;
      return frame(
        "Commitment",
        meeting.title,
        "paper",
        <>
          <p className="p-muted">
            {dayLabelFor(meeting.dayOffset)} ·{" "}
            {formatMinute(meeting.startMinute)} –{" "}
            {formatMinute(meeting.endMinute)} · {meeting.locationLabel}
          </p>
          <p className="p-tag">
            {meeting.confidence === "travel"
              ? "Travel"
              : `${meeting.confidence.charAt(0).toUpperCase()}${meeting.confidence.slice(1)}`}
          </p>
          <p>{meeting.note}</p>
          {meeting.participantIds.length > 0 ? (
            <Section title="Who is expected">
              {meeting.participantIds.map((id) => {
                const person = findPerson(id);
                if (!person) return null;
                return (
                  <Row
                    key={id}
                    testId={`entity-link-person-${id}`}
                    title={person.name}
                    detail={person.role}
                    onOpen={() => open({ kind: "person", id })}
                  />
                );
              })}
            </Section>
          ) : null}
          {meeting.links.length > 0 ? (
            <Section title="Connected records">
              {meeting.links.map((link) => (
                <Row
                  key={`${link.kind}:${link.id}`}
                  testId={`entity-link-${link.kind}-${link.id}`}
                  title={labelForRef(link) ?? "Unavailable record"}
                  aside={kindLabel(link.kind)}
                  onOpen={() => open(link)}
                />
              ))}
            </Section>
          ) : null}
          <p className="p-faint">
            Opening this did not schedule, move, or attend anything.
          </p>
        </>,
      );
    }

    case "measure": {
      const measure = findMeasure(entityRef.id);
      if (!measure) break;
      return frame(
        measure.designation,
        measure.title,
        "paper",
        <>
          <p className="p-tag">{measure.stage}</p>
          <p>{measure.summary}</p>
          <p className="p-muted">{measure.status}</p>
          {measure.links.length > 0 ? (
            <Section title="Connected records">
              {measure.links.map((link) => (
                <Row
                  key={`${link.kind}:${link.id}`}
                  testId={`entity-link-${link.kind}-${link.id}`}
                  title={labelForRef(link) ?? "Unavailable record"}
                  aside={kindLabel(link.kind)}
                  onOpen={() => open(link)}
                />
              ))}
            </Section>
          ) : null}
          <p className="p-faint">
            A prototype record. No legislative procedure is simulated here.
          </p>
        </>,
      );
    }

    case "office": {
      const office = findOffice(entityRef.id);
      if (!office) break;
      return frame(
        "Office",
        office.title,
        "dark",
        <>
          <p className="p-muted">
            {office.body} · {office.termNote}
          </p>
          <p>{office.summary}</p>
          <Section title="Waiting on you">
            {office.pending.map((item) => (
              <Row
                key={item.id}
                testId={`office-pending-${item.id}`}
                title={item.label}
                detail={item.detail}
                onOpen={() => open(item.ref)}
              />
            ))}
          </Section>
        </>,
      );
    }

    case "organization": {
      const organization = findOrganization(entityRef.id);
      if (!organization) break;
      return frame(
        organization.kind,
        organization.name,
        "dark",
        <>
          <p>{organization.summary}</p>
          {organization.links.length > 0 ? (
            <Section title="Connected records">
              {organization.links.map((link) => (
                <Row
                  key={`${link.kind}:${link.id}`}
                  testId={`entity-link-${link.kind}-${link.id}`}
                  title={labelForRef(link) ?? "Unavailable record"}
                  aside={kindLabel(link.kind)}
                  onOpen={() => open(link)}
                />
              ))}
            </Section>
          ) : null}
        </>,
      );
    }

    case "chapter": {
      const chapter = findChapter(entityRef.id);
      if (!chapter) break;
      return frame(
        chapter.span,
        chapter.title,
        "paper",
        <>
          <p className="p-muted">{chapter.summary}</p>
          <ol className="p-timeline">
            {chapter.entries.map((entry) => (
              <li className="p-timeline-entry" key={entry.id}>
                <span className="p-tag">{entry.when}</span>
                <p>
                  {entry.segments.map((segment, index) =>
                    segment.ref ? (
                      <RefLink key={index} refValue={segment.ref} onOpen={open}>
                        {segment.text}
                      </RefLink>
                    ) : (
                      <span key={index}>{segment.text}</span>
                    ),
                  )}
                </p>
              </li>
            ))}
          </ol>
          <p className="p-faint">
            Underlined names are authored references with real ids. Nothing here
            matches a name in the text to guess who is meant.
          </p>
        </>,
      );
    }
  }

  return (
    <Workspace
      kicker="Unavailable"
      title="This record is not available"
      testId="entity-workspace"
      canGoBack={context.canGoBack}
      onBack={context.back}
      onClose={context.close}
    >
      <p className="p-faint">
        The reference resolved to nothing, so nothing is shown. It does not fall
        through to another record.
      </p>
    </Workspace>
  );
}
