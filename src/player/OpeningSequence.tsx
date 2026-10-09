import "./opening-sequence.css";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import type { EntityId, World } from "../simulation";
import type { BackdropPerson } from "../presentation/backdrop-people";
import {
  projectOpeningStops,
  type OpeningStopKey,
  type OpeningStopPerson,
} from "../presentation/opening-stops";
import {
  openingStopBackdropUrl,
  stageOpeningStop,
} from "../presentation/opening-stop-staging";
import { isTerritoryUsps } from "../simulation/state-reference";
import { OpeningStatePopulation } from "./OpeningStatePopulation";
import { OpeningStateVoting } from "./OpeningStateVoting";
import { PlacePeopleLayer, useCoverRect } from "./PlacePeopleLayer";
import { SceneChapterTransition } from "./SceneChapterTransition";

/**
 * The opening the owner approved on October 8, 2026: six stops, a camera
 * move from the country down to the player. Each stop fills the screen with
 * its place and the people actually there. A lower-third strip carries the
 * stop's one line, under a solid gold top border with the corner pieces on
 * it, and outlined Back, Next and Skip. A six-step progress bar sits top
 * left; the Ledger, top right and closed by default, holds every number.
 * Plaques name only the people who matter to the stop, with their
 * relationship to the player.
 *
 * Choosing a person opens their ordinary card and grants nothing. Back,
 * Next, Skip and Close are navigation only, and nothing here writes a record.
 */
export function OpeningSequence({
  world,
  personId,
  mode,
  onClose,
  onOpenPerson,
  lineFor,
}: {
  readonly world: World;
  readonly personId: EntityId;
  /** "first" follows a new life; "revisit" is reopened from the menu. */
  readonly mode: "first" | "revisit";
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** The stop's one engine-written line, from the opening-line composer. */
  readonly lineFor?: (stop: OpeningStopKey) => string | null;
}) {
  const view = useMemo(
    () => projectOpeningStops(world, personId),
    [world, personId],
  );
  const stops = view.stops;
  const [index, setIndex] = useState(0);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  };
  const stop = stops[Math.min(index, stops.length - 1)]!;
  const last = index >= stops.length - 1;
  const staged = useMemo(
    () => stageOpeningStop(world, personId, stop),
    [world, personId, stop],
  );
  const stage = useRef<HTMLDivElement>(null);
  const url = openingStopBackdropUrl(stop);
  const next = stops[index + 1];
  const line = lineFor?.(stop.key) ?? null;
  const plaqued = new Map(
    stop.people
      .filter((person) => person.plaque)
      .map((person) => [person.personId, person]),
  );

  return (
    <section
      className="pg-opener"
      role="dialog"
      aria-modal="false"
      aria-labelledby={line ? `pg-opener-line-${stop.key}` : undefined}
      data-testid="world-orientation"
      data-step={stop.key}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        close();
      }}
    >
      <SceneChapterTransition
        chapterKey={stop.key}
        nextPlateUrl={next ? openingStopBackdropUrl(next) : null}
      >
        <div
          ref={stage}
          className="pg-opener-stage"
          data-testid="orientation-stage"
          data-place={stop.place ?? undefined}
        >
          {url ? (
            <img
              className="pg-opener-backdrop"
              data-testid="orientation-place-backdrop"
              src={url}
              alt=""
            />
          ) : null}
          <PlacePeopleLayer
            people={staged}
            stageRef={stage}
            onSelectPerson={(id) => onOpenPerson(id)}
          />
          <OpeningPlaques
            people={staged}
            plaqued={plaqued}
            stageRef={stage}
            onOpenPerson={onOpenPerson}
          />
        </div>
      </SceneChapterTransition>

      <progress
        className="pg-opener-progress"
        data-testid="orientation-progress"
        max={stops.length}
        value={index + 1}
      />
      <button
        type="button"
        className="ui-action pg-opener-ledger-toggle"
        data-testid="opening-ledger-toggle"
        aria-expanded={ledgerOpen}
        aria-controls="pg-opener-ledger"
        onClick={() => setLedgerOpen((open) => !open)}
      >
        Ledger
      </button>
      {ledgerOpen ? (
        <OpeningLedger
          rows={view.ledger}
          stateUsps={view.homeStateUsps}
          asOf={world.currentDate}
        />
      ) : null}

      <footer className="pg-opener-strip">
        <span className="pg-opener-corners" aria-hidden="true">
          <span data-corner="top-left" />
          <span data-corner="top-right" />
        </span>
        <p
          id={`pg-opener-line-${stop.key}`}
          className="pg-opener-line"
          data-testid={`orientation-step-${stop.key}`}
        >
          {line}
        </p>
        <div className="pg-opener-actions">
          <button
            type="button"
            className="ui-action"
            data-testid="orientation-back"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="ui-action"
            data-testid="orientation-next"
            onClick={() =>
              last
                ? close()
                : setIndex((current) => Math.min(stops.length - 1, current + 1))
            }
          >
            {last ? "Done" : "Next"}
          </button>
          {!last ? (
            <button
              type="button"
              className="ui-action"
              data-testid="orientation-skip"
              onClick={close}
            >
              {mode === "first" ? "Skip" : "Close"}
            </button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

/**
 * A plaque for each person who matters to the stop: their name, and under
 * it their relationship to the player as the records give it. It sits just
 * above a standing figure, or under a seated one, on the same cover-fitted
 * picture the people layer uses.
 */
function OpeningPlaques({
  people,
  plaqued,
  stageRef,
  onOpenPerson,
}: {
  readonly people: readonly BackdropPerson[];
  readonly plaqued: ReadonlyMap<EntityId, OpeningStopPerson>;
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const rect = useCoverRect(stageRef);
  if (!rect) return null;
  const shown = people.filter((person) => plaqued.has(person.personId));
  if (shown.length === 0) return null;
  return (
    <div
      className="pg-opener-plaques"
      style={
        {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        } satisfies CSSProperties
      }
    >
      {shown.map((person) => {
        const recorded = plaqued.get(person.personId)!;
        return (
          <button
            key={person.personId}
            type="button"
            className="pg-opener-plaque"
            data-testid="opening-plaque"
            data-person-id={person.personId}
            data-anchor={plaqueBelow(person) ? "below" : "head"}
            style={
              {
                left: `${person.leftPercent + person.widthPercent / 2}%`,
                top: `${plaqueTop(person)}%`,
              } satisfies CSSProperties
            }
            onClick={() => onOpenPerson(person.personId)}
          >
            <strong>{recorded.name}</strong>
            <span>{recorded.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A seated figure is drawn in a standing figure's box, so the top of its box
 * is not its head. Its plaque goes under what is seen of it instead: the
 * front edge of the furniture it sits behind, or else its feet.
 */
function plaqueBelow(person: BackdropPerson): boolean {
  return (
    person.clipBelowPercent !== null || person.resolvedPose.startsWith("seated")
  );
}

function plaqueTop(person: BackdropPerson): number {
  if (person.clipBelowPercent !== null) return person.clipBelowPercent;
  return plaqueBelow(person)
    ? person.topPercent + person.heightPercent
    : person.topPercent;
}

/** Every number the opening knows, under the label its record carries. */
function OpeningLedger({
  rows,
  stateUsps,
  asOf,
}: {
  readonly rows: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: string;
  }[];
  readonly stateUsps: string | null;
  readonly asOf: string;
}) {
  return (
    <aside
      id="pg-opener-ledger"
      className="pg-opener-ledger pg-glass-panel"
      data-testid="opening-ledger"
    >
      <dl>
        {rows.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <OpeningStatePopulation stateUsps={stateUsps} asOf={asOf} />
      {isTerritoryUsps(stateUsps) ? null : (
        <OpeningStateVoting stateUsps={stateUsps} asOf={asOf} />
      )}
    </aside>
  );
}
