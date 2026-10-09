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
import { plaqueAnchor } from "../presentation/opening-plaque-anchor";
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
 * The opening the owner approved on October 8, 2026 (revised 11:14 p.m.):
 * cinematic, between black letterbox bars. The President's address carries
 * it as subtitles in the bottom bar, and the picture cuts to each of six
 * stops as the address reaches it: the President, the player's members of
 * Congress in the chamber, the governor, the town, the family at home, and
 * the player. Each cut fills the frame with its place and the people
 * actually there. A six-step progress bar and the Ledger, closed by default
 * and holding every number, sit in the top bar; outlined Back, Next and Skip
 * in the bottom bar. Plaques name only the people who matter to the stop,
 * with their relationship to the player.
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
  subtitleFor,
}: {
  readonly world: World;
  readonly personId: EntityId;
  /** "first" follows a new life; "revisit" is reopened from the menu. */
  readonly mode: "first" | "revisit";
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** The address's words at this cut, from the presidential-address composer. */
  readonly subtitleFor?: (stop: OpeningStopKey) => string | null;
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
  const subtitle = subtitleFor?.(stop.key) ?? null;
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
      aria-labelledby={subtitle ? `pg-opener-subtitle-${stop.key}` : undefined}
      data-testid="world-orientation"
      data-step={stop.key}
      data-address={view.address}
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
            onSelectPerson={(id) => onOpenPerson(id as EntityId)}
          />
          <OpeningPlaques
            people={staged}
            plaqued={plaqued}
            stageRef={stage}
            onOpenPerson={onOpenPerson}
          />
        </div>
      </SceneChapterTransition>

      <header className="pg-opener-bar" data-bar="top">
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
      </header>
      {ledgerOpen ? (
        <OpeningLedger
          rows={view.ledger}
          stateUsps={view.homeStateUsps}
          asOf={world.currentDate}
        />
      ) : null}

      <footer className="pg-opener-bar" data-bar="bottom">
        <p
          id={`pg-opener-subtitle-${stop.key}`}
          className="pg-opener-subtitle"
          data-testid={`orientation-step-${stop.key}`}
        >
          {subtitle}
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
 * above the person's head, or on the furniture they are seen behind
 * (plaqueAnchor), on the same cover-fitted picture the people layer uses.
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
        const at = plaqueAnchor(person, people, {
          widthPercent: (PLAQUE_PX.width / rect.width) * 100,
          heightPercent: (PLAQUE_PX.height / rect.height) * 100,
        });
        return (
          <button
            key={person.personId}
            type="button"
            className="pg-opener-plaque"
            data-testid="opening-plaque"
            data-person-id={person.personId}
            data-anchor={at.anchor}
            style={
              {
                left: `${at.leftPercent}%`,
                top: `${at.topPercent}%`,
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

/** About the size a two-line plaque is drawn at, in pixels. */
const PLAQUE_PX = { width: 192, height: 46 } as const;

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
