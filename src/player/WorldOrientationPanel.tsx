import "./world-orientation.css";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { projectOpeningWorldSnapshot } from "../presentation/opening-world-snapshot";

import type {
  OrientationChamber,
  OrientationPerson,
  OrientationView,
  OrientationStep,
} from "../presentation/world-orientation";
import type { EntityId, World } from "../simulation";
import { GameSelect } from "./controls/GameSelect";
import { SavedPersonFigure } from "./SavedPersonFigure";
import { PersonPortrait } from "./PersonPortrait";
import { candidateEstablishingPlate } from "./candidate-establishing-plate";
import { PLAYTEST65_WHITE_HOUSE_LAYOUT } from "../presentation/playtest65-visual-layout";

/**
 * Four short panels introducing the public world: White House, Congress, the
 * home state, the place itself.
 *
 * Every word and number comes from the orientation view, which reads the saved
 * World. Choosing a name opens that person's ordinary card — the same card the
 * People web opens — and grants nothing: no acquaintance, no knowledge, no
 * travel. Back, Next, Skip and Close are navigation only.
 */
export function WorldOrientationPanel({
  view,
  homeStateUsps,
  mode,
  onClose,
  onOpenPerson,
  world,
  personId,
  renderFigure,
  establishingPlate,
}: {
  readonly view: OrientationView;
  readonly homeStateUsps: string | null;
  /** "first" follows a new life; "revisit" is reopened from the menu. */
  readonly mode: "first" | "revisit";
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly world?: World;
  readonly personId?: EntityId;
  readonly renderFigure?: (personId: EntityId) => ReactNode;
  readonly establishingPlate?: ReactNode;
}) {
  const plate = candidateEstablishingPlate(
    PLAYTEST65_WHITE_HOUSE_LAYOUT.assetId,
  );
  const snapshot = useMemo(
    () =>
      world && personId ? projectOpeningWorldSnapshot(world, personId) : null,
    [world, personId],
  );
  const steps: readonly (Omit<OrientationStep, "key"> & {
    readonly key: string;
  })[] = useMemo(() => {
    if (!snapshot) return view.steps;
    const officials = [snapshot.president, snapshot.vicePresident].flatMap(
      (holder) => {
        if (!holder) return [];
        const known = view.steps[0]?.people.find(
          (person) => person.personId === holder.personId,
        );
        return [
          known ?? {
            personId: holder.personId,
            name: holder.personName,
            title: holder.title,
            party: null,
            facts: [],
          },
        ];
      },
    );
    return [
      ...view.steps
        .filter((step) => !(homeStateUsps === "DC" && step.key === "locality"))
        .map((step) =>
          step.key === "executive" ? { ...step, people: officials } : step,
        ),
      {
        key: "your-life",
        title: "Your life so far",
        summary:
          snapshot.beats
            .find((beat) => beat.key === "your-life")
            ?.facts.join(" ") ?? "",
        people: [],
        chambers: [],
      },
    ];
  }, [snapshot, view.steps, homeStateUsps]);
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = steps[Math.min(index, steps.length - 1)]!;
  const last = index >= steps.length - 1;

  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  return (
    <section
      className="pg-orientation"
      role="dialog"
      aria-modal="false"
      aria-labelledby="pg-orientation-title"
      data-testid="world-orientation"
      data-step={step.key}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
    >
      <p className="pg-orientation-kicker">
        {index + 1} of {steps.length} · {view.dateLabel}
      </p>
      <h2
        id="pg-orientation-title"
        ref={heading}
        tabIndex={-1}
        className="pg-orientation-title"
        data-testid={`orientation-step-${step.key}`}
      >
        {step.title}
      </h2>
      <p className="pg-orientation-summary">{step.summary}</p>

      <div className="pg-orientation-reading">
        {step.key === "executive" ? (
          <div
            className="pg-white-house-presentation"
            data-has-plate={Boolean(plate)}
            style={
              plate
                ? ({
                    aspectRatio: `${plate.width} / ${plate.height}`,
                    "--pg-figure-x": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.x) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%`,
                    "--pg-figure-y": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.y) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.height}%`,
                    "--pg-figure-width": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.width) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%`,
                  } as CSSProperties)
                : undefined
            }
          >
            {establishingPlate ??
              (plate ? (
                <img
                  className="pg-establishing-image"
                  src={plate.url}
                  width={plate.width}
                  height={plate.height}
                  alt="Illustrated White House exterior"
                  data-asset-id={plate.assetId}
                  data-testid="opening-establishing-plate"
                />
              ) : null)}
            <div className="pg-opening-officials">
              {step.people.map((person, position) => (
                <article
                  key={person.personId}
                  className={
                    position === 0
                      ? "pg-opening-president"
                      : "pg-opening-vice-president"
                  }
                >
                  {renderFigure?.(person.personId) ??
                    (world ? (
                      position === 0 ? (
                        <SavedPersonFigure
                          world={world}
                          personId={person.personId}
                          className="pg-opening-figure"
                        />
                      ) : (
                        <PersonPortrait
                          world={world}
                          personId={person.personId}
                          size="large"
                        />
                      )
                    ) : null)}
                  <PersonButton person={person} onOpenPerson={onOpenPerson} />
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {step.chambers.map((chamber) => (
          <ChamberBlock
            key={chamber.chamberKey}
            chamber={chamber}
            homeStateUsps={homeStateUsps}
            onOpenPerson={onOpenPerson}
          />
        ))}

        {step.people.length > 0 && step.key !== "executive" ? (
          <ul className="pg-orientation-people">
            {step.people.map((person) => (
              <li key={`${person.personId}:${person.title}`}>
                <PersonButton person={person} onOpenPerson={onOpenPerson} />
              </li>
            ))}
          </ul>
        ) : null}

        {step.key === "your-life" && snapshot ? (
          <>
            <ul className="pg-opening-household">
              {snapshot.life.household.household.map((person) => (
                <li key={person.personId}>
                  <button
                    type="button"
                    className="ui-action"
                    onClick={() => onOpenPerson(person.personId)}
                  >
                    {person.introduction}
                  </button>
                </li>
              ))}
            </ul>
            <p>
              {snapshot.startingLocation
                ? `Begin at ${snapshot.startingLocation.label}.`
                : "Continue into your life."}
            </p>
          </>
        ) : null}
      </div>
      <div className="pg-orientation-actions">
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
          className="ui-action ui-action--primary"
          data-testid="orientation-next"
          onClick={() =>
            last
              ? onClose()
              : setIndex((current) => Math.min(steps.length - 1, current + 1))
          }
        >
          {last ? "Done" : "Next"}
        </button>
        {!last ? (
          <button
            type="button"
            className="ui-action"
            data-testid="orientation-skip"
            onClick={onClose}
          >
            {mode === "first" ? "Skip" : "Close"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function PersonButton({
  person,
  onOpenPerson,
}: {
  readonly person: OrientationPerson;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <button
      type="button"
      className="pg-orientation-person"
      data-testid={`orientation-person-${person.personId}`}
      onClick={() => onOpenPerson(person.personId)}
    >
      <strong>{person.name}</strong>
      <span>
        {person.title}
        {person.party ? ` · ${person.party}` : ""}
      </span>
      {person.facts.length > 0 ? (
        <small>{person.facts.join(" · ")}</small>
      ) : null}
    </button>
  );
}

function ChamberBlock({
  chamber,
  homeStateUsps,
  onOpenPerson,
}: {
  readonly chamber: OrientationChamber;
  readonly homeStateUsps: string | null;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const stateOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of chamber.roster) {
      const usps = seatState(row.seatKey);
      if (!seen.has(usps)) seen.set(usps, row.seatLabel.split(",")[0]!);
    }
    return [...seen].sort((left, right) => left[1].localeCompare(right[1]));
  }, [chamber.roster]);
  const [state, setState] = useState<string>(
    homeStateUsps && stateOptions.some(([usps]) => usps === homeStateUsps)
      ? homeStateUsps
      : (stateOptions[0]?.[0] ?? ""),
  );
  const rows = chamber.roster.filter((row) => seatState(row.seatKey) === state);
  const counted = chamber.parties.filter((entry) => entry.members > 0);

  return (
    <div
      className="pg-orientation-chamber"
      data-testid={`orientation-chamber-${chamber.chamberKey}`}
    >
      <h3>{chamber.title}</h3>
      <div
        className="pg-orientation-bar"
        role="img"
        aria-label={`${chamber.name}: ${chamber.seats} seats`}
      >
        {counted.map((entry) => (
          <span
            key={entry.partyOrganizationId ?? "none"}
            data-series={entry.noParty ? "none" : entry.slot}
            data-no-party={entry.noParty ? "true" : undefined}
            style={{ flexGrow: entry.members }}
          />
        ))}
        {chamber.vacancies + chamber.unrecorded > 0 ? (
          <span
            data-series="open"
            style={{ flexGrow: chamber.vacancies + chamber.unrecorded }}
          />
        ) : null}
      </div>
      <ul className="pg-orientation-legend">
        {counted.map((entry) => (
          <li
            key={entry.partyOrganizationId ?? "none"}
            data-series={entry.noParty ? "none" : entry.slot}
            data-no-party={entry.noParty ? "true" : undefined}
          >
            {entry.label} <strong>{entry.members}</strong>
          </li>
        ))}
        {chamber.vacancies > 0 ? (
          <li data-series="open">
            Vacant <strong>{chamber.vacancies}</strong>
          </li>
        ) : null}
        {chamber.unrecorded > 0 ? (
          <li data-series="open">
            No recorded holder <strong>{chamber.unrecorded}</strong>
          </li>
        ) : null}
      </ul>
      <details className="pg-orientation-roster">
        <summary>Members by state</summary>
        <label className="pg-orientation-state">
          State
          <GameSelect
            value={state}
            data-testid={`orientation-state-${chamber.chamberKey}`}
            onChange={(event) => setState(event.target.value)}
          >
            {stateOptions.map(([usps, name]) => (
              <option key={usps} value={usps}>
                {name}
              </option>
            ))}
          </GameSelect>
        </label>
        <ul>
          {rows.map((row) => (
            <li key={row.seatKey}>
              <span className="pg-orientation-seat">{row.seatLabel}</span>
              {row.person ? (
                <PersonButton person={row.person} onOpenPerson={onOpenPerson} />
              ) : (
                <span className="pg-orientation-open">
                  {row.status === "vacancy" ? "Vacant" : "No recorded holder"}
                </span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** "us-house:KY-06" and "us-senate:KY:class-2" both carry the state second. */
function seatState(seatKey: string): string {
  return seatKey.split(":")[1]?.split("-")[0] ?? "";
}
