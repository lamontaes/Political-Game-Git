import {
  EconomicContextPanel,
  LEXINGTON_ECONOMIC_BINDING,
} from "./EconomicContextPanel";
import { playerEconomicContextLines } from "../presentation/economic-context";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { PrivateJournalEditor } from "./PrivateJournalEditor";
import type {
  PrivateJournal,
  ShellSection,
} from "../presentation/shell-navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  CATEGORY_LABELS,
  PERSON_CATEGORIES,
  filterDirectory,
  projectPeopleDirectory,
  type PersonCategory,
} from "../presentation/people-directory";
import {
  calendarEntryFor,
  calendarKindLabel,
  formatMinute,
  projectPlayerCalendar,
  type CalendarEntry,
} from "../presentation/player-calendar";
import { projectLifeRecord } from "../presentation/life-record";
import { projectMeasureBriefing } from "../presentation/legislation-projection";
import { projectPersonalRecord } from "../presentation/personal-record";
import {
  CANONICAL_VERSION,
  PATCH_NOTE_SECTIONS,
} from "../presentation/release-identity";
import type {
  PinSize,
  PeopleView,
  ShellAction,
  ShellRef,
  ShellState,
} from "../presentation/shell-navigation";
import { isPinned } from "../presentation/shell-navigation";
import { projectPersonDossier } from "../presentation/person-dossier";
import { openConversationWith } from "../presentation/person-conversation-entry";
import { PersonCard } from "./PersonCard";
import { PeopleRelationshipWeb } from "./PeopleRelationshipWeb";
import {
  measureById,
  workPendingEntriesFor,
  type EntityId,
  type MoneyAmount,
  type World,
} from "../simulation";

/**
 * The deliberate workspaces.
 *
 * Every one of these is opened on purpose and closes back to exactly where it
 * was opened from, because they all share the shell's single history stack
 * rather than keeping one each. None of them is an always-on dashboard, none
 * of them invents a number, and none of them can move the clock: they are
 * projections of the world plus the controls the existing gameplay writers
 * already expose.
 */

export function WorkspaceFrame({
  title,
  kicker,
  testid,
  canGoBack,
  onBack,
  onClose,
  children,
}: {
  readonly title: string;
  readonly kicker?: string;
  readonly testid: string;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  return (
    <section
      className="pg-workspace civic-glass"
      data-testid={testid}
      aria-label={title}
    >
      <header className="pg-workspace-head">
        <div>
          {kicker ? <p className="pg-kicker">{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        <div className="pg-workspace-controls">
          {canGoBack ? (
            <button
              type="button"
              className="ui-action ui-action--subtle"
              data-testid={`${testid}-back`}
              onClick={onBack}
            >
              ← Back
            </button>
          ) : null}
          <button
            type="button"
            className="ui-icon-button"
            aria-label="Close"
            data-testid={`${testid}-close`}
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </header>
      <div className="pg-workspace-body">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ people */

export function PeopleWorkspace({
  world,
  personId,
  state,
  dispatch,
  onTalk,
  onOpenRef,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly onTalk: (id: EntityId) => void;
  readonly onOpenRef: (ref: ShellRef) => void;
}) {
  const directory = useMemo(
    () => projectPeopleDirectory(world, personId),
    [world, personId],
  );
  const category = state.peopleCategory as PersonCategory | "all";
  const shown = useMemo(
    () => filterDirectory(directory, category, state.peopleQuery),
    [directory, category, state.peopleQuery],
  );
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [webExpanded, setWebExpanded] = useState(false);
  const peopleView = state.preferences.peopleView;
  const showWeb = peopleView === "web";
  const focusId = selectedId ?? personId;
  const selectedDossier =
    selectedId === null
      ? null
      : projectPersonDossier(world, personId, selectedId);
  const talkEntry = selectedDossier
    ? openConversationWith(world, personId, selectedDossier.personId)
    : null;

  function selectPerson(id: EntityId) {
    setSelectedId(id);
  }

  return (
    <>
      <div className="pg-people-controls">
        <label className="pg-field">
          <span>Find somebody</span>
          <input
            type="search"
            value={state.peopleQuery}
            data-testid="people-search"
            onChange={(event) =>
              dispatch({ type: "set-people-query", query: event.target.value })
            }
          />
        </label>
        <div
          className="pg-people-web-toolbar"
          role="group"
          aria-label="People view"
        >
          {(
            [
              ["web", "Web"],
              ["list", "List"],
              ["categories", "Categories"],
            ] as const
          ).map(([view, label]: readonly [PeopleView, string]) => (
            <button
              key={view}
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={peopleView === view}
              data-testid={`people-view-${view}`}
              onClick={() => dispatch({ type: "set-people-view", view })}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="pg-people-categories"
          role="group"
          aria-label="Categories"
        >
          {(["all", ...PERSON_CATEGORIES] as const).map((key) => (
            <button
              key={key}
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={category === key}
              data-testid={`people-category-${key}`}
              onClick={() =>
                dispatch({ type: "set-people-category", category: key })
              }
            >
              {key === "all" ? "Everyone" : CATEGORY_LABELS[key]}
              <small>{directory.counts[key]}</small>
            </button>
          ))}
        </div>
      </div>

      {showWeb ? (
        <>
          <PeopleRelationshipWeb
            world={world}
            playerId={personId}
            focusId={focusId}
            category={category}
            query={state.peopleQuery}
            expanded={webExpanded}
            onSelect={selectPerson}
          />
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="people-web-expand"
            onClick={() => setWebExpanded((value) => !value)}
          >
            {webExpanded
              ? "Show the nearby connections"
              : "Show everyone you know"}
          </button>
        </>
      ) : null}

      {shown.length === 0 ? (
        <p className="game-note" data-testid="people-empty">
          Nobody here matches that. This life may simply not have met them yet.
        </p>
      ) : (
        <ul
          className="pg-people-list"
          data-view={peopleView}
          data-testid="people-list"
        >
          {shown.map((person) => {
            const ref: ShellRef = { kind: "person", id: person.personId };
            const pinned = isPinned(state, ref);
            return (
              <li key={person.personId}>
                <button
                  type="button"
                  className="pg-person-row"
                  data-testid={`people-person-${person.personId}`}
                  onClick={() => selectPerson(person.personId)}
                >
                  <strong>{person.name}</strong>
                  {person.relationship ? (
                    <small>{person.relationship}</small>
                  ) : person.context ? (
                    <small>{person.context}</small>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="ui-action ui-action--rail"
                  data-testid={`people-pin-${person.personId}`}
                  aria-pressed={pinned}
                  aria-label={
                    pinned ? `Unpin ${person.name}` : `Pin ${person.name}`
                  }
                  onClick={() => dispatch({ type: "toggle-pin", ref })}
                >
                  {pinned ? "★" : "☆"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedDossier ? (
        <PersonCard
          world={world}
          playerId={personId}
          dossier={selectedDossier}
          pinned={isPinned(state, {
            kind: "person",
            id: selectedDossier.personId,
          })}
          expanded
          mode="inline"
          onTogglePin={() =>
            dispatch({
              type: "toggle-pin",
              ref: { kind: "person", id: selectedDossier.personId },
            })
          }
          onOpenPerson={selectPerson}
          onTalk={() => onTalk(selectedDossier.personId)}
          talkUnavailable={
            talkEntry?.kind === "unavailable" ? talkEntry.reason : null
          }
          onOpenLink={(ref) => {
            if (ref.kind === "person") selectPerson(ref.id);
            else onOpenRef(ref);
          }}
        />
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- calendar */

function CalendarEntryRow({
  entry,
  pinned,
  onOpen,
  onTogglePin,
}: {
  readonly entry: CalendarEntry;
  readonly pinned: boolean;
  readonly onOpen: () => void;
  readonly onTogglePin: () => void;
}) {
  return (
    <li className="pg-calendar-entry" data-group={entry.group}>
      <button
        type="button"
        className="pg-calendar-open"
        data-testid={`calendar-entry-${entry.activityId}`}
        onClick={onOpen}
      >
        <span className="pg-calendar-time">
          {formatMinute(entry.start.minuteOfDay)}
        </span>
        <span className="pg-calendar-copy">
          <strong>{entry.title}</strong>
          <small>
            {calendarKindLabel(entry.kind)} · {entry.ownershipNote}
          </small>
        </span>
      </button>
      <button
        type="button"
        className="ui-action ui-action--rail"
        aria-pressed={pinned}
        data-testid={`calendar-pin-${entry.activityId}`}
        onClick={onTogglePin}
      >
        {pinned ? "Unpin" : "Pin"}
      </button>
    </li>
  );
}

export function CalendarWorkspaceSurface({
  world,
  personId,
  isPinnedRef,
  onOpen,
  onTogglePin,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly isPinnedRef: (ref: ShellRef) => boolean;
  readonly onOpen: (ref: ShellRef) => void;
  readonly onTogglePin: (ref: ShellRef) => void;
}) {
  const calendar = useMemo(
    () => projectPlayerCalendar(world, personId),
    [world, personId],
  );

  return (
    <>
      <p className="game-band" data-testid="calendar-today">
        {calendar.today.date} · {formatMinute(calendar.today.minuteOfDay)}
      </p>
      {/*
        Reading the calendar is a pure read. Nothing on this screen advances the
        clock, and the line above shows the same canonical moment before and
        after — which is the property the proof checks.
      */}
      {calendar.note ? (
        <p className="game-note" data-testid="calendar-note">
          {calendar.note}
        </p>
      ) : null}
      {calendar.days.map((day) => (
        <section key={day.date} className="pg-calendar-day">
          <h3>{day.date}</h3>
          <ul>
            {day.entries.map((entry) => {
              const ref: ShellRef = {
                kind: "commitment",
                id: entry.activityId,
              };
              return (
                <CalendarEntryRow
                  key={entry.activityId}
                  entry={entry}
                  pinned={isPinnedRef(ref)}
                  onOpen={() => onOpen(ref)}
                  onTogglePin={() => onTogglePin(ref)}
                />
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

export function CommitmentSurface({
  world,
  personId,
  activityId,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly activityId: EntityId;
}) {
  const entry = useMemo(
    () => calendarEntryFor(world, personId, activityId),
    [world, personId, activityId],
  );
  if (!entry) {
    return (
      <p className="game-note" data-testid="commitment-missing">
        This world does not hold that commitment, or it is not yours to see.
      </p>
    );
  }
  return (
    <div data-testid="commitment-detail" data-activity-id={entry.activityId}>
      <p className="game-band">
        {entry.start.date} · {formatMinute(entry.start.minuteOfDay)} –{" "}
        {formatMinute(entry.end.minuteOfDay)}
      </p>
      <p className="pg-kicker" data-testid="commitment-kind">
        {entry.kindLabel}
      </p>
      <p data-testid="commitment-ownership">{entry.ownershipNote}</p>
      <p>{entry.summary}</p>
      <p className="game-note">Where: {entry.locationLabel}</p>
      {entry.participantNames.length > 0 ? (
        <p className="game-note" data-testid="commitment-participants">
          With {entry.participantNames.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- measure */

/**
 * A bill, described as the record describes it.
 *
 * The recorded defect was a screen headed YOUR BILL that then named somebody
 * else as the sponsor. So sponsorship is stated as a fact — who filed it — and
 * the player's own relationship to the measure is stated separately and only
 * when the record supports it. A fixture label stays a fixture label; nothing
 * here invents player authorship to make a heading read better.
 */
export function MeasureSurface({
  world,
  personId,
  measureId,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly measureId: EntityId;
}) {
  const briefing = useMemo(() => {
    try {
      return projectMeasureBriefing(world, measureId);
    } catch {
      return null;
    }
  }, [world, measureId]);
  const measure = measureById(world, measureId);

  if (!briefing || !measure) {
    return (
      <p className="game-note" data-testid="measure-missing">
        This world does not hold that measure.
      </p>
    );
  }

  const yours = measure.sponsorPersonId === personId;
  return (
    <div data-testid="measure-detail" data-measure-id={measureId}>
      <p className="pg-kicker" data-testid="measure-designation">
        {briefing.designation}
      </p>
      <h3>{briefing.shortTitle}</h3>
      <p className="game-band" data-testid="measure-chamber">
        {briefing.legislatureName}
      </p>
      <p data-testid="measure-sponsor">
        {briefing.sponsorName
          ? `Filed by ${briefing.sponsorName}.`
          : "No sponsor is on the record."}
      </p>
      <p data-testid="measure-your-role">
        {yours
          ? "You filed it."
          : "You did not file it. Your part in it is whatever the chamber gives you."}
      </p>
      <p>{briefing.summary}</p>
      <p data-testid="measure-standing">{briefing.whereItStands}</p>
      {briefing.votes.length > 0 ? (
        <section className="pg-personal-section">
          <h3>Votes</h3>
          <ul data-testid="measure-votes">
            {briefing.votes.map((vote) => (
              <li key={`${vote.question}-${vote.when}`}>
                {vote.when} · {vote.question} · {vote.result} ({vote.yea}–
                {vote.nay})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- personal */

function formatMoney(amount: MoneyAmount): string {
  const whole = (amount.minorUnits / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${whole} ${amount.currency}`;
}

export function PersonalWorkspace({
  world,
  personId,
  section,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  /** Which half of this record the player asked for, when they said. */
  readonly section?: ShellSection;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const record = useMemo(
    () => projectPersonalRecord(world, personId),
    [world, personId],
  );
  if (!record) {
    return <p className="game-note">This world has no record of you.</p>;
  }

  const homeId = world.people[personId]?.homeJurisdictionId;
  const economicPlace = homeId ? lifePlaceByJurisdictionId(homeId) : null;
  const economicLines = economicPlace
    ? playerEconomicContextLines(economicPlace.key, world.currentDate)
    : [];

  /*
   * "Money and property" asked for the money, so put the money in front of
   * them. The section is focusable and moved into view when that is the
   * destination they chose, and left alone when it is not — so the identity
   * route still opens at the top, on the person, where it should.
   */
  const finances = useRef<HTMLElement>(null);
  useEffect(() => {
    if (section !== "finances") return;
    const node = finances.current;
    if (!node) return;
    node.scrollIntoView({ block: "start", behavior: "auto" });
    node.focus({ preventScroll: true });
  }, [section]);

  /*
   * Who you are, then what you have, then the wider place.
   *
   * This record used to open on regional economic observations and a chart,
   * with the player's own name and age below them. The owner asked "Who am I?"
   * and got labour statistics, which is the wrong answer to that question no
   * matter how good the statistics are. The context is kept — it is real,
   * sourced and worth reading — but it belongs after the person, framed as
   * being about the place rather than about them.
   */
  return (
    <>
      <header className="pg-personal-identity">
        <h3 data-testid="personal-name">{record.identity.name}</h3>
        <p className="game-band" data-testid="personal-age">
          {record.identity.age}
          {record.identity.placeName ? ` · ${record.identity.placeName}` : ""}
        </p>
      </header>

      {record.household.length > 0 ? (
        <section className="pg-personal-section">
          <h3>Household</h3>
          <ul data-testid="personal-household">
            {record.household.map((member) => (
              <li key={member.personId}>
                <button
                  type="button"
                  className="pg-inline-link"
                  data-testid={`personal-household-${member.personId}`}
                  onClick={() => onOpenPerson(member.personId)}
                >
                  {member.name}
                </button>
                {member.relationship ? `, ${member.relationship}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.education.length > 0 ? (
        <section className="pg-personal-section">
          <h3>Education</h3>
          <ul data-testid="personal-education">
            {record.education.map((line) => (
              <li key={line.key}>{line.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.work.length > 0 ? (
        <section className="pg-personal-section">
          <h3>Work</h3>
          <ul data-testid="personal-work">
            {record.work.map((line) => (
              <li key={line.key}>{line.text}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/*
        Three kinds of money, kept apart because the world keeps them apart.
        A committee's treasury is the committee's; presenting it beside a
        personal balance as one figure would be a false statement about who owns
        what, and in the campaign case a legally false one.
      */}
      <section
        className="pg-personal-section"
        ref={finances}
        tabIndex={-1}
        aria-label="Money and property"
        data-testid="personal-finances"
        data-landed={section === "finances" ? "true" : undefined}
      >
        <h3>Money and property</h3>
        <ul className="pg-purses" data-testid="personal-purses">
          {record.purses.map((purse) => (
            <li key={purse.kind} data-purse={purse.kind}>
              <strong>{purse.label}</strong>
              <small>{purse.ownerNote}</small>
              {purse.balance ? (
                <span data-testid={`purse-balance-${purse.kind}`}>
                  {formatMoney(purse.balance)}
                </span>
              ) : (
                <span
                  className="game-note"
                  data-testid={`purse-absent-${purse.kind}`}
                >
                  {purse.absence}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/*
        The place, not the person. Same data, same source, stated as what it
        is: observations about where this life is lived.
      */}
      <section
        className="pg-personal-section"
        aria-label="Economic context"
        data-testid="personal-economic-context"
      >
        <h3>The place you live</h3>
        <p className="game-note">
          {economicPlace?.displayName ?? "Home place not recorded"} ·{" "}
          {world.currentDate}
        </p>
        {economicLines.length ? (
          economicLines.map((line) => <p key={line.key}>{line.text}</p>)
        ) : (
          <p className="game-note">
            No supported economic observations are available for this place and
            date.
          </p>
        )}
        {economicPlace?.key === LEXINGTON_ECONOMIC_BINDING.placeKey ? (
          <EconomicContextPanel
            binding={LEXINGTON_ECONOMIC_BINDING}
            simulationDate={world.currentDate}
          />
        ) : null}
      </section>
    </>
  );
}

/* -------------------------------------------------------------------- work */

export function WorkWorkspace({
  world,
  personId,
  children,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly children: ReactNode;
}) {
  const pending = useMemo(
    () => workPendingEntriesFor(world, personId),
    [world, personId],
  );
  const needsYou = pending.filter((entry) => entry.group === "needs-you");

  return (
    <>
      {pending.length === 0 ? (
        <p className="game-note" data-testid="work-empty">
          Nothing is waiting on you at the moment.
        </p>
      ) : (
        <section className="pg-personal-section">
          <h3>Waiting on you</h3>
          {needsYou.length === 0 ? (
            <p className="game-note">
              Nothing needs a decision from you right now.
            </p>
          ) : (
            <ul data-testid="work-pending">
              {needsYou.map((entry) => (
                <li key={entry.item.id}>{entry.item.title}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {children}
    </>
  );
}

/* ----------------------------------------------------------------- journal */

export function JournalWorkspace({
  journal,
  onJournalChange,
  world,
  personId,
  onOpenPerson,
}: {
  readonly journal: PrivateJournal;
  readonly onJournalChange: (journal: PrivateJournal) => void;
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const record = useMemo(
    () => projectLifeRecord(world, personId),
    [world, personId],
  );

  return (
    <>
      <PrivateJournalEditor
        journal={journal}
        onChange={onJournalChange}
        people={record.people}
        events={record.chapters.flatMap((chapter) => chapter.entries)}
        onOpenPerson={onOpenPerson}
      />
      <p className="game-note">{record.summary}</p>

      <h3>What has happened</h3>
      {record.chapters.length === 0 ? (
        <p className="game-note" data-testid="journal-empty">
          Nothing has been written down yet. It will fill up as the life goes
          on.
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

      {/*
        People are linked by the id the record already carries. No name is
        parsed out of a sentence to find a link: a reference exists because the
        record established it, or it does not exist at all.
      */}
      {record.people.length > 0 ? (
        <>
          <h3>People</h3>
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
      ) : null}

      {record.open.length > 0 ? (
        <>
          <h3>Still open</h3>
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
    </>
  );
}

/* ------------------------------------------------------------ patch notes */

/**
 * The releases this game has actually had, newest first.
 *
 * A player opening patch notes was being shown seven UNRELEASED engineering
 * sections and a reserved 0.3.0 candidate above the release they were playing.
 * Normal notes now list accepted releases only, cumulatively — nothing is
 * deleted, `PATCH_NOTES.md` is untouched, and the pending sections are still
 * in the file and still exported for development surfaces to read.
 *
 * Dates come from the `_Released …._` line the release writer emits. The two
 * hand-written historical sections predate that and carry no release date, so
 * the screen says so instead of inventing one — and instead of quietly reusing
 * 0.2.0's revision date, which is a different fact.
 */
export function PatchNotesWorkspace() {
  const released = PATCH_NOTE_SECTIONS.filter((section) => section.released);
  const withheld = PATCH_NOTE_SECTIONS.length - released.length;
  return (
    <>
      <p className="game-band" data-testid="patch-notes-version">
        Version {CANONICAL_VERSION}
      </p>
      {released.map((section) => (
        <section
          key={section.id}
          className="pg-personal-section"
          data-testid="patch-note-released"
        >
          <h3>{section.heading}</h3>
          <p
            className="game-note"
            data-testid={`patch-note-when-${section.id}`}
          >
            {section.version
              ? `Version ${section.version}`
              : "Version not stated"}
            {" · "}
            {section.releasedOn ?? "Release date not recorded"}
          </p>
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.id}-${index}`}>{paragraph}</p>
          ))}
        </section>
      ))}
      {withheld > 0 ? (
        <p className="game-note" data-testid="patch-notes-withheld">
          {withheld} section
          {withheld === 1 ? " is" : "s are"} still in development and not listed
          here.
        </p>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- options */

/**
 * Only settings something on this route actually reads.
 *
 * A slider that changes nothing is a lie about what the game supports, so there
 * are none here. Motion still follows the system preference and is stated
 * rather than duplicated as a switch that would let the two disagree.
 */
export function OptionsWorkspace({
  state,
  dispatch,
}: {
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
}) {
  return (
    <>
      <section className="pg-personal-section">
        <h3>People</h3>
        <p className="game-note">How the People screen opens.</p>
        <div role="group" aria-label="People default view">
          {(
            [
              ["web", "Relationship web"],
              ["categories", "By category"],
              ["list", "One list"],
            ] as const
          ).map(([view, label]: readonly [PeopleView, string]) => (
            <button
              key={view}
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={state.preferences.peopleView === view}
              data-testid={`option-people-view-${view}`}
              onClick={() => dispatch({ type: "set-people-view", view })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="pg-personal-section">
        <h3>Pins</h3>
        <p className="game-note">The size a new pin is created at.</p>
        <div role="group" aria-label="Default pin size">
          {(
            [
              ["tiny", "Compact"],
              ["normal", "Standard"],
              ["expanded", "Expanded"],
            ] as const
          ).map(([size, label]: readonly [PinSize, string]) => (
            <button
              key={size}
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={state.preferences.defaultPinSize === size}
              data-testid={`option-pin-size-${size}`}
              onClick={() => dispatch({ type: "set-default-pin-size", size })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="pg-personal-section">
        <h3>Motion</h3>
        <p className="game-note">
          Motion follows your system&rsquo;s reduced-motion setting, so nothing
          here has to be switched on to make it stop.
        </p>
      </section>
    </>
  );
}
