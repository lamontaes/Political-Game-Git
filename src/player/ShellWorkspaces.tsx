import { UX39CalendarGrid, useCalendarDateOrder } from "./UX39CalendarGrid";
import {
  clampWorkspace,
  defaultWorkspace,
  type WorkspaceLayout,
} from "../presentation/workspace-layout";
import type { PointerEvent as ReactPointerEvent } from "react";
import { PinToggle } from "./controls/PinToggle";
import { calendarDisplayDate } from "./ux39-calendar-dates";
import {
  EconomicContextPanel,
  LEXINGTON_ECONOMIC_BINDING,
} from "./EconomicContextPanel";
import { DIAGNOSTICS } from "./diagnostics-profile";
import { playerEconomicContextLines } from "../presentation/economic-context";
import { buildIdentity } from "../release/build-identity";
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
  calendarEntryHorizon,
  calendarKindLabel,
  formatMinute,
  projectPlayerCalendar,
  type CalendarEntry,
  type CalendarHorizon,
} from "../presentation/player-calendar";
import { projectLifeRecord } from "../presentation/life-record";
import { projectMeasureBriefing } from "../presentation/legislation-projection";
import { projectOpeningLife } from "../presentation/opening-life";
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
import {
  DEFAULT_INTERRUPTIONS,
  isPinned,
  type InterruptionPreferences,
} from "../presentation/shell-navigation";
import {
  INTERRUPTION_CATEGORIES,
  interruptionHandlers,
} from "../presentation/interruption-policy";
import { PeopleRelationshipWeb } from "./PeopleRelationshipWeb";
import { PersonPortrait } from "./PersonPortrait";
import {
  authorizeCalendarSimulation,
  declineCalendarActivity,
  simulateAuthorizedCalendarActivity,
} from "../presentation/calendar-time-control";
import {
  attendCalendarCampaignLifeActivity,
  calendarCampaignLifeEntry,
} from "../presentation/calendar-campaign-life";
import { previewTimeCommand } from "../presentation/time-command";
import { venueActivities } from "../presentation/venue-activity";
import { proseWeekdayDate } from "../presentation/prose-dates";
import {
  PROTECTED_STOP_NOTE,
  describeInterval,
  skipToLabel,
  stoppedEarlyLabel,
} from "../presentation/time-target-label";
import {
  useTimeCommand,
  type TimeCommandReport,
  type TimeCommandRunner,
} from "./time-command-runner";
import {
  measureById,
  simulationMinutesBetween,
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
 * already expose. Calendar day/week/event buttons call those writers; reading
 * still spends no time.
 */

export function WorkspaceFrame({
  title,
  kicker,
  testid,
  canGoBack,
  onBack,
  onClose,
  children,
  layout,
  onLayoutChange,
}: {
  readonly title: string;
  readonly kicker?: string;
  readonly testid: string;
  readonly canGoBack: boolean;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly layout?: WorkspaceLayout;
  readonly onLayoutChange?: (layout: WorkspaceLayout | null) => void;
}) {
  const frame = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [liveLayout, setLiveLayout] = useState<WorkspaceLayout | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 860 : window.innerHeight,
  }));
  const drag = useRef<{
    mode: "move" | "resize";
    x: number;
    y: number;
    layout: WorkspaceLayout;
  } | null>(null);
  useEffect(() => {
    const invoker =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButton.current?.focus();
    return () => {
      if (invoker?.isConnected) invoker.focus();
    };
  }, [testid]);
  useEffect(() => {
    const resize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const shown =
    liveLayout ??
    (layout
      ? clampWorkspace(layout, viewport.width, viewport.height)
      : defaultWorkspace(viewport.width, viewport.height));
  function start(
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "resize",
  ) {
    if (!onLayoutChange || event.button !== 0) return;
    if (mode === "move" && (event.target as HTMLElement).closest("button"))
      return;
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      layout: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  }
  function move(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x,
      dy = event.clientY - current.y;
    setLiveLayout(
      clampWorkspace(
        {
          ...current.layout,
          ...(current.mode === "move"
            ? { x: current.layout.x + dx, y: current.layout.y + dy }
            : {
                width: current.layout.width + dx,
                height: current.layout.height + dy,
              }),
        },
        viewport.width,
        viewport.height,
      ),
    );
  }
  function end() {
    if (drag.current && liveLayout) onLayoutChange?.(liveLayout);
    drag.current = null;
    setLiveLayout(null);
  }
  return (
    <section
      ref={frame}
      className="pg-workspace civic-glass"
      style={
        shown
          ? {
              left: shown.x,
              top: shown.y,
              width: shown.width,
              height: shown.height,
              maxHeight: viewport.height - 24,
              transform: "none",
            }
          : undefined
      }
      data-testid={testid}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header
        className="pg-workspace-head"
        data-movable={Boolean(onLayoutChange)}
        onPointerDown={(event) => start(event, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div>
          {kicker ? <p className="pg-kicker">{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        <div className="pg-workspace-controls">
          {onLayoutChange ? (
            <>
              <button
                type="button"
                className="ui-action ui-action--subtle"
                onClick={() =>
                  onLayoutChange(
                    clampWorkspace(
                      {
                        x: 12,
                        y: 12,
                        width: viewport.width - 24,
                        height: viewport.height - 110,
                      },
                      viewport.width,
                      viewport.height,
                    ),
                  )
                }
              >
                Maximize
              </button>
              <button
                type="button"
                className="ui-action ui-action--subtle"
                onClick={() => onLayoutChange(null)}
              >
                Reset layout
              </button>
            </>
          ) : null}
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
            ref={closeButton}
            data-testid={`${testid}-close`}
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      </header>
      <div className="pg-workspace-body">{children}</div>
      {onLayoutChange ? (
        <button
          type="button"
          className="pg-window-resize"
          aria-label={`Resize ${title}; use arrow keys`}
          onPointerDown={(event) => start(event, "resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={(event) => {
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                event.key,
              )
            )
              return;
            event.preventDefault();
            const rect = frame.current?.getBoundingClientRect();
            if (rect)
              onLayoutChange(
                clampWorkspace(
                  {
                    x: rect.x,
                    y: rect.y,
                    width:
                      rect.width +
                      (event.key === "ArrowRight"
                        ? 20
                        : event.key === "ArrowLeft"
                          ? -20
                          : 0),
                    height:
                      rect.height +
                      (event.key === "ArrowDown"
                        ? 20
                        : event.key === "ArrowUp"
                          ? -20
                          : 0),
                  },
                  viewport.width,
                  viewport.height,
                ),
              );
          }}
        >
          ◢
        </button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ people */

export function PeopleWorkspace({
  world,
  personId,
  state,
  dispatch,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
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
  const [webExpanded, setWebExpanded] = useState(false);
  const peopleView = state.preferences.peopleView;
  const showWeb = peopleView === "web";
  /*
   * Choosing somebody here opens the one person card the whole game uses,
   * beside this workspace, rather than a second card drawn inline. The web
   * keeps the chosen person at its centre so the card and the drawing agree.
   */
  const focusId = state.quickDossierPersonId ?? personId;
  function selectPerson(id: EntityId) {
    dispatch({ type: "open-quick-dossier", personId: id });
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
                  <PersonPortrait
                    world={world}
                    personId={person.personId}
                    size="small"
                  />
                  <strong>{person.name}</strong>
                  {person.relationship ? (
                    <small>{person.relationship}</small>
                  ) : person.context ? (
                    <small>{person.context}</small>
                  ) : null}
                </button>
                <PinToggle
                  className="ui-action ui-action--rail"
                  pinned={pinned}
                  name={person.name}
                  testid={`people-pin-${person.personId}`}
                  onToggle={() => dispatch({ type: "toggle-pin", ref })}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- calendar */

function CalendarEntryRow({
  entry,
  pinned,
  selected,
  onSelect,
  onTogglePin,
  children,
}: {
  readonly entry: CalendarEntry;
  readonly pinned: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly onTogglePin: () => void;
  readonly children?: ReactNode;
}) {
  return (
    <li className="pg-calendar-entry" data-group={entry.group}>
      <button
        type="button"
        className="pg-calendar-open"
        data-testid={`calendar-entry-${entry.activityId}`}
        aria-pressed={selected}
        onClick={() => {
          onSelect();
        }}
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
      {children}
    </li>
  );
}

export type CalendarTab = "today" | "history" | "interruptions";

export function CalendarWorkspaceSurface({
  world,
  personId,
  isPinnedRef,
  onOpen,
  onTogglePin,
  onWorldChange,
  interruptions = DEFAULT_INTERRUPTIONS,
  onInterruptionChange,
  today,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly isPinnedRef: (ref: ShellRef) => boolean;
  readonly onOpen: (ref: ShellRef) => void;
  readonly onTogglePin: (ref: ShellRef) => void;
  readonly onWorldChange: (world: World) => void;
  /** The persisted checklist; read by every advance made from here. */
  readonly interruptions?: InterruptionPreferences;
  readonly onInterruptionChange?: (
    key: keyof InterruptionPreferences,
    value: boolean,
  ) => void;
  /** What is happening now, drawn above the upcoming entries. */
  readonly today?: ReactNode;
}) {
  const calendar = useMemo(
    () => projectPlayerCalendar(world, personId),
    [world, personId],
  );
  const [dateOrder, setDateOrder] = useCalendarDateOrder();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [tab, setTab] = useState<CalendarTab>("today");
  const runner = useTimeCommand({
    world,
    personId,
    interruptions,
    onWorldChange,
  });
  const report = (result: TimeCommandReport) =>
    setOutcome(
      result.stoppedEarly && result.target
        ? `${stoppedEarlyLabel(result.target)} ${result.outcome}`
        : result.outcome,
    );
  const dayTarget = previewTimeCommand(world, personId, {
    kind: "days",
    days: 1,
  });
  const weekTarget = previewTimeCommand(world, personId, {
    kind: "days",
    days: 7,
  });

  /* Releasing a hold spends no time, so it does not wait on the runner. */
  function applyNow(result: {
    readonly world: World;
    readonly outcome: string;
  }) {
    setOutcome(result.outcome);
    if (result.world !== world) onWorldChange(result.world);
  }

  const liveDays = calendar.days
    .map((day) => ({
      ...day,
      entries: day.entries.filter(
        (entry) => calendarEntryHorizon(entry, calendar.today) !== "history",
      ),
    }))
    .filter((day) => day.entries.length > 0);
  const historyDays = calendar.days
    .map((day) => ({
      ...day,
      entries: day.entries.filter(
        (entry) => calendarEntryHorizon(entry, calendar.today) === "history",
      ),
    }))
    .filter((day) => day.entries.length > 0);

  function renderDays(
    days: typeof liveDays,
    horizon: Exclude<CalendarHorizon, "history"> | "history",
  ) {
    return days.map((day) => (
      <section
        key={`${horizon}-${day.date}`}
        className="pg-calendar-day"
        data-horizon={horizon}
      >
        <h3>{calendarDisplayDate(day.date, dateOrder)}</h3>
        <ul>
          {day.entries.map((entry) => {
            const ref: ShellRef = {
              kind: "commitment",
              id: entry.activityId,
            };
            const selectedHere = selectedId === entry.activityId;
            return (
              <CalendarEntryRow
                key={entry.activityId}
                entry={entry}
                pinned={isPinnedRef(ref)}
                selected={selectedHere}
                onSelect={() =>
                  setSelectedId(selectedHere ? null : entry.activityId)
                }
                onTogglePin={() => onTogglePin(ref)}
              >
                {selectedHere ? (
                  <div
                    className="pg-calendar-selection"
                    data-testid="calendar-selection"
                  >
                    <CalendarEntryDetail
                      entry={entry}
                      world={world}
                      personId={personId}
                    />
                    {horizon !== "history" ? (
                      <CalendarEventActions
                        selected={entry}
                        onOpen={onOpen}
                        runner={runner}
                        onReport={report}
                        onApplyNow={applyNow}
                        world={world}
                        personId={personId}
                        interruptions={interruptions}
                        onOpenBlockingActivity={(id) => {
                          setSelectedDate(null);
                          setSelectedId(id);
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </CalendarEntryRow>
            );
          })}
        </ul>
      </section>
    ));
  }

  const tabs: readonly { key: CalendarTab; label: string; testid: string }[] = [
    { key: "today", label: "Today and upcoming", testid: "calendar-tab-today" },
    { key: "history", label: "History", testid: "calendar-history-toggle" },
    {
      key: "interruptions",
      label: "Interruptions",
      testid: "calendar-tab-interruptions",
    },
  ];

  return (
    <>
      <p className="game-band" data-testid="calendar-today">
        {calendarDisplayDate(calendar.today.date, dateOrder)} ·{" "}
        {formatMinute(calendar.today.minuteOfDay)}
      </p>
      <fieldset className="ux39-calendar-date-order">
        <legend>Date format</legend>
        <label>
          <input
            type="radio"
            name="calendar-date-order"
            checked={dateOrder === "month-day"}
            onChange={() => setDateOrder("month-day")}
          />
          Month / day / year
        </label>
        <label>
          <input
            type="radio"
            name="calendar-date-order"
            checked={dateOrder === "day-month"}
            onChange={() => setDateOrder("day-month")}
          />
          Day / month / year
        </label>
      </fieldset>
      <div
        className="pg-tabs"
        role="tablist"
        aria-label="Calendar views"
        data-testid="calendar-tabs"
      >
        {tabs.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            className="pg-tab"
            aria-selected={tab === entry.key}
            aria-expanded={
              entry.key === "history" ? tab === "history" : undefined
            }
            data-testid={entry.testid}
            onClick={() => setTab(entry.key)}
          >
            {entry.label}
            {entry.key === "history" && historyDays.length > 0 ? (
              <small>
                {historyDays.reduce((n, day) => n + day.entries.length, 0)}
              </small>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "today" ? (
        <div className="pg-calendar-board">
          <UX39CalendarGrid
            today={calendar.today.date}
            days={liveDays}
            dateOrder={dateOrder}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedId(null);
            }}
          />
          {today}
          <div
            className="game-choices"
            data-testid="calendar-time-controls"
            aria-busy={runner.pending}
          >
            <button
              type="button"
              className="ui-action"
              data-testid="calendar-simulate-day"
              aria-disabled={runner.pending || undefined}
              onClick={() => runner.submit({ kind: "days", days: 1 }, report)}
            >
              Skip 1 day
              <small>
                {dayTarget ? `${skipToLabel(dayTarget.target)}. ` : ""}
                Your routine runs. {PROTECTED_STOP_NOTE}
              </small>
            </button>
            <button
              type="button"
              className="ui-action"
              data-testid="calendar-simulate-week"
              aria-disabled={runner.pending || undefined}
              onClick={() => runner.submit({ kind: "days", days: 7 }, report)}
            >
              Skip 7 days
              <small>
                {weekTarget ? `${skipToLabel(weekTarget.target)}. ` : ""}
                Same rules. {PROTECTED_STOP_NOTE}
              </small>
            </button>
          </div>
          {runner.pending ? (
            <p
              className="game-note"
              role="status"
              data-testid="calendar-time-pending"
            >
              Time is passing…
            </p>
          ) : null}
          {outcome ? (
            <p
              className="game-note pg-calendar-outcome"
              role="status"
              data-testid="calendar-time-outcome"
            >
              {outcome}
            </p>
          ) : null}
          {calendar.note ? (
            <p className="game-note" data-testid="calendar-note">
              {calendar.note}
            </p>
          ) : null}
          <div data-testid="calendar-upcoming">
            <h3 className="pg-calendar-heading">
              {selectedDate
                ? calendarDisplayDate(selectedDate, dateOrder)
                : "Upcoming and ongoing"}
            </h3>
            {selectedDate ? (
              <button
                type="button"
                className="pg-tab"
                onClick={() => setSelectedDate(null)}
              >
                Show all upcoming
              </button>
            ) : null}
            {liveDays.filter(
              (day) => !selectedDate || day.date === selectedDate,
            ).length === 0 ? (
              <p className="game-note">Nothing upcoming or ongoing.</p>
            ) : (
              renderDays(
                liveDays.filter(
                  (day) => !selectedDate || day.date === selectedDate,
                ),
                "upcoming",
              )
            )}
          </div>
        </div>
      ) : null}

      {tab === "history" ? (
        <div data-testid="calendar-history">
          {historyDays.length === 0 ? (
            <p className="game-note">
              Nothing has happened on this calendar yet.
            </p>
          ) : (
            renderDays(historyDays, "history")
          )}
        </div>
      ) : null}

      {tab === "interruptions" ? (
        <div className="pg-interruptions" data-testid="calendar-interruptions">
          <p className="game-note">
            What a day or week skip stops for. Reading or changing this moves no
            time. A preference here never spends money, casts a vote or commits
            you to anything; it only decides where a skip pauses.
          </p>
          <ul className="pg-interruption-list">
            {INTERRUPTION_CATEGORIES.map((category) =>
              category.key === "always" ? (
                <li key={category.key} data-testid="interruption-always">
                  <label className="pg-check pg-check--fixed">
                    <input type="checkbox" checked disabled readOnly />
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.detail}</small>
                    </span>
                  </label>
                </li>
              ) : (
                <li key={category.key}>
                  <label className="pg-check">
                    <input
                      type="checkbox"
                      data-testid={`interruption-${category.key}`}
                      checked={interruptions[category.key]}
                      disabled={!onInterruptionChange}
                      onChange={(event) =>
                        onInterruptionChange?.(
                          category.key as keyof InterruptionPreferences,
                          event.target.checked,
                        )
                      }
                    />
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.detail}</small>
                    </span>
                  </label>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/** What a selected entry is, read-only, before anything can be done to it. */
function CalendarEntryDetail({
  entry,
  world,
  personId,
}: {
  readonly entry: CalendarEntry;
  readonly world: World;
  readonly personId: EntityId;
}) {
  const sameDay = entry.start.date === entry.end.date;
  /*
   * What a party or campaign activity came to, once it has been worked. This
   * only projects — reading a result never records one. An activity whose hold
   * has passed with nothing recorded shows no outcome here, because there is
   * none yet; Attend is what records it.
   */
  const campaignLife = calendarCampaignLifeEntry(
    world,
    personId,
    entry.activityId,
  );
  return (
    <dl
      className="pg-calendar-detail"
      data-testid="calendar-event-detail"
      data-activity-id={entry.activityId}
    >
      <dt>What</dt>
      <dd>
        {entry.title} · {entry.kindLabel}
        {entry.summary ? <span> {entry.summary}</span> : null}
      </dd>
      <dt>On the record</dt>
      <dd data-testid="calendar-event-arrangement">
        {entry.arrangementNote ??
          "The record does not say who arranged it or how it reached you."}{" "}
        {entry.ownershipNote}
      </dd>
      <dt>Who is going</dt>
      <dd data-testid="calendar-event-attendees">
        {entry.attendeeNames.length > 0
          ? entry.attendeeNames.join(", ")
          : "No attendees are on record."}
      </dd>
      <dt>Where</dt>
      <dd>{entry.locationLabel}</dd>
      <dt>When</dt>
      <dd data-testid="calendar-event-when">
        {proseWeekdayDate(entry.start.date)},{" "}
        {formatMinute(entry.start.minuteOfDay)} to{" "}
        {sameDay ? "" : `${proseWeekdayDate(entry.end.date)}, `}
        {formatMinute(entry.end.minuteOfDay)}
      </dd>
      {campaignLife && campaignLife.outcomeLines.length > 0 ? (
        <>
          <dt>How it went</dt>
          <dd data-testid="calendar-event-outcome">
            {campaignLife.outcomeLines.join(" ")}
          </dd>
        </>
      ) : null}
    </dl>
  );
}

function CalendarEventActions({
  selected,
  onOpen,
  runner,
  onReport,
  onApplyNow,
  world,
  personId,
  interruptions,
  onOpenBlockingActivity,
}: {
  readonly selected: CalendarEntry;
  readonly onOpen: (ref: ShellRef) => void;
  readonly runner: TimeCommandRunner;
  readonly onReport: (report: TimeCommandReport) => void;
  readonly onApplyNow: (result: {
    readonly world: World;
    readonly outcome: string;
  }) => void;
  readonly world: World;
  readonly personId: EntityId;
  readonly interruptions: InterruptionPreferences;
  readonly onOpenBlockingActivity: (id: EntityId) => void;
}) {
  const simulation = authorizeCalendarSimulation(
    world,
    personId,
    selected.activityId,
    interruptions,
  );
  const skip = previewTimeCommand(world, personId, {
    kind: "until-activity",
    activityId: selected.activityId,
  });
  const venue = venueActivities(world, personId).find(
    (candidate) => candidate.activity.id === selected.activityId,
  );
  /*
   * A party or campaign activity with no scene venue — the phone shift worked
   * from home — is invisible to the venue route, so Attend used to be able to
   * say only that it could not be played. One Attend button still, routed to
   * CAMPAIGN's own writer where the venue route cannot reach. Read-only: this
   * projects, and records nothing.
   */
  const campaignLife = calendarCampaignLifeEntry(
    world,
    personId,
    selected.activityId,
    interruptionHandlers(interruptions),
  );
  const laneRoute = campaignLife?.needsLaneRoute ? campaignLife : null;
  const attendNote = laneRoute
    ? (laneRoute.blockedReason ?? laneRoute.stateLabel)
    : venue?.refusal
      ? venue.refusal
      : venue?.journey
        ? venue.journey.alreadyCompleted
          ? `The journey to ${selected.locationLabel} is complete. Attend begins here.`
          : `Includes the ${describeInterval(venue.journey.journeyMinutes)} journey to ${selected.locationLabel}. ${venue.journey.costDisclosure}`
        : null;
  const busy = runner.pending || undefined;
  const attendance = previewTimeCommand(world, personId, {
    kind: "attend-activity",
    activityId: selected.activityId,
  });
  return (
    <div
      className="game-choices pg-calendar-actions"
      role="group"
      aria-label={`What to do about ${selected.title}`}
      aria-busy={runner.pending}
      data-testid="calendar-event-actions"
    >
      <button
        type="button"
        className="ui-action"
        data-testid="calendar-open-event"
        onClick={() => onOpen({ kind: "commitment", id: selected.activityId })}
      >
        Open event record
      </button>
      {skip ? (
        <button
          type="button"
          className="ui-action"
          data-testid="calendar-advance-event"
          aria-disabled={busy}
          onClick={() =>
            runner.submit(
              { kind: "until-activity", activityId: selected.activityId },
              onReport,
            )
          }
        >
          {skipToLabel(skip.target)}
          <small>
            {describeInterval(
              simulationMinutesBetween(world.currentMoment, skip.target),
            )}{" "}
            from now, to when it starts. {PROTECTED_STOP_NOTE}
          </small>
        </button>
      ) : null}
      <button
        type="button"
        className="ui-action"
        data-testid="calendar-play-event"
        data-route={laneRoute ? "campaign-life" : "venue"}
        aria-disabled={busy}
        onClick={() =>
          laneRoute
            ? runner.perform(
                (current, handlers) =>
                  attendCalendarCampaignLifeActivity(
                    current,
                    personId,
                    selected.activityId,
                    "attended",
                    handlers,
                  ),
                onReport,
              )
            : runner.submit(
                { kind: "attend-activity", activityId: selected.activityId },
                onReport,
              )
        }
      >
        Attend
        {attendance
          ? ` · Until ${attendance.target.date === world.currentDate ? "" : `${proseWeekdayDate(attendance.target.date)}, `}${formatMinute(attendance.target.minuteOfDay)}`
          : ""}
        {attendNote ? <small>{attendNote}</small> : null}
      </button>
      {laneRoute?.blockingActivityId ? (
        <button
          type="button"
          className="ui-action"
          data-testid="calendar-show-blocker"
          onClick={() => onOpenBlockingActivity(laneRoute.blockingActivityId!)}
        >
          Show earlier event
        </button>
      ) : null}
      <button
        type="button"
        className="ui-action"
        data-testid="calendar-simulate-event"
        disabled={!simulation.authorized}
        aria-disabled={busy}
        aria-describedby={`calendar-simulate-reason-${selected.activityId}`}
        onClick={() =>
          runner.perform(
            (current) =>
              simulateAuthorizedCalendarActivity(
                current,
                personId,
                selected.activityId,
                interruptions,
              ),
            onReport,
          )
        }
      >
        Simulate authorized attendance
        <small>{simulation.reason}</small>
      </button>
      <p
        className="sr-only"
        id={`calendar-simulate-reason-${selected.activityId}`}
      >
        {simulation.reason}
      </p>
      <button
        type="button"
        className="ui-action"
        data-testid="calendar-decline-event"
        aria-disabled={busy}
        onClick={() => {
          if (runner.pending) return;
          onApplyNow(
            declineCalendarActivity(world, personId, selected.activityId),
          );
        }}
      >
        Decline
      </button>
    </div>
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
        {proseWeekdayDate(entry.start.date)} ·{" "}
        {formatMinute(entry.start.minuteOfDay)} –{" "}
        {formatMinute(entry.end.minuteOfDay)}
      </p>
      {entry.arrangementNote ? (
        <p data-testid="commitment-arrangement">{entry.arrangementNote}</p>
      ) : null}
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
  const intro = useMemo(
    () => projectOpeningLife(world, personId),
    [world, personId],
  );
  const history = useMemo(
    () => projectLifeRecord(world, personId),
    [world, personId],
  );
  const goals = world.history.goalStates.filter(
    (goal) =>
      goal.personId === personId &&
      !world.history.goalStates.some(
        (newer) => newer.supersedesGoalStateId === goal.id,
      ),
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

      <details className="pg-personal-section" data-testid="life-introduction">
        <summary>Household and world notes</summary>
        <p>{intro.context}</p>
        {intro.household.sentences.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {intro.household.grounding.length > 0 ? (
          <div data-testid="life-grounding">
            {intro.household.grounding.map((fact) => (
              <p key={fact.basis} data-grounding={fact.kind}>
                {fact.text}
              </p>
            ))}
          </div>
        ) : null}
      </details>

      <section className="pg-personal-section">
        <h3>Appearance</h3>
        <button
          type="button"
          className="ui-action"
          data-testid="personal-appearance"
          onClick={() => onOpenPerson(personId)}
        >
          Appearance and wardrobe
        </button>
        <p className="game-note">Change only your own saved appearance.</p>
      </section>

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

      <section className="pg-personal-section" aria-label="Your history">
        <h3>History</h3>
        <div className="pg-personal-chronology">
          {history.chapters.length ? (
            history.chapters.map((chapter) => (
              <section key={chapter.key}>
                <h4>{chapter.heading}</h4>
                {chapter.entries.map((entry) => (
                  <p key={entry.key}>
                    <time>{entry.at}</time> · {entry.sentence}
                  </p>
                ))}
              </section>
            ))
          ) : (
            <p>No remembered milestones are recorded yet.</p>
          )}
        </div>
      </section>
      <section className="pg-personal-section" aria-label="Your goals">
        <h3>Goals</h3>
        {goals.length ? (
          goals.map((goal) => <p key={goal.id}>{goal.objective}</p>)
        ) : (
          <p>No personal goals are recorded yet.</p>
        )}
      </section>

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
            diagnostics={DIAGNOSTICS}
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
  const identity = buildIdentity();
  const released = PATCH_NOTE_SECTIONS.filter((section) => section.released);
  const withheld = PATCH_NOTE_SECTIONS.length - released.length;
  return (
    <>
      <p className="game-band" data-testid="patch-notes-version">
        Version {CANONICAL_VERSION}
      </p>
      <p className="game-note" data-testid="patch-notes-build">
        Running source {identity.revision}
        {identity.dirty ? " · uncommitted changes" : " · clean source"}. This
        identifies this game bundle, not the installed controller or a different
        saved life.
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
  onOpenPatchNotes,
}: {
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly onOpenPatchNotes?: () => void;
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

      {onOpenPatchNotes ? (
        <section className="pg-personal-section">
          <h3>This build</h3>
          <p className="game-note">
            Version {CANONICAL_VERSION}. What changed is read from the build
            itself.
          </p>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="nav-patch-notes"
            onClick={onOpenPatchNotes}
          >
            Patch notes
          </button>
        </section>
      ) : null}
    </>
  );
}
