import "./world-orientation.css";

import { useEffect, useMemo, useRef, useState } from "react";

import type {
  OrientationChamber,
  OrientationPerson,
  OrientationView,
} from "../presentation/world-orientation";
import type { RegionalSceneKind } from "../authoring/regional-scene-coverage";
import type { RegionalOpeningResult } from "../presentation/regional-opening-plate";
import type { EntityId } from "../simulation";
import { GameSelect } from "./controls/GameSelect";

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
  regionalPlate,
  mode,
  onClose,
  onOpenPerson,
}: {
  readonly view: OrientationView;
  readonly homeStateUsps: string | null;
  /**
   * The regional plate for this life's place. A miss renders no picture at
   * all: a player shown the wrong landscape has been told the game does not
   * know where they live, which is worse than a panel with no picture on it.
   */
  readonly regionalPlate?: RegionalOpeningResult;
  /** "first" follows a new life; "revisit" is reopened from the menu. */
  readonly mode: "first" | "revisit";
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = view.steps[index]!;
  const last = index === view.steps.length - 1;

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
        {index + 1} of {view.steps.length} · {view.dateLabel}
      </p>

      {step.key === "locality" &&
      regionalPlate &&
      regionalPlate.kind === "plate" ? (
        <figure
          className="pg-orientation-region"
          data-testid="orientation-region-plate"
          data-region={regionalPlate.plate.regionKey}
          data-matched-by={regionalPlate.plate.matchedBy}
        >
          <img
            className="pg-orientation-region-plate"
            src={regionalPlate.plate.url}
            width={regionalPlate.plate.width}
            height={regionalPlate.plate.height}
            alt={`${SCENE_ALT[regionalPlate.plate.sceneKind]}: ${regionalPlate.plate.displayName.toLowerCase()}.`}
          />
          <figcaption className="pg-orientation-region-caption">
            {SCENE_CAPTION[regionalPlate.plate.sceneKind]} Illustration, not
            this address.
          </figcaption>
        </figure>
      ) : null}

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

      {step.chambers.map((chamber) => (
        <ChamberBlock
          key={chamber.chamberKey}
          chamber={chamber}
          homeStateUsps={homeStateUsps}
          onOpenPerson={onOpenPerson}
        />
      ))}

      {step.people.length > 0 ? (
        <ul className="pg-orientation-people">
          {step.people.map((person) => (
            <li key={`${person.personId}:${person.title}`}>
              <PersonButton person={person} onOpenPerson={onOpenPerson} />
            </li>
          ))}
        </ul>
      ) : null}

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
              : setIndex((current) =>
                  Math.min(view.steps.length - 1, current + 1),
                )
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

/**
 * The caption follows what the picture is of.
 *
 * "Typical countryside near here" over a main street is a small lie the player
 * can see, and a caption that overclaims costs more than the picture gains.
 * Every one of them says the same last thing: this is an illustration of the
 * area, not a photograph of where the character lives.
 */
const SCENE_CAPTION: Readonly<Record<RegionalSceneKind, string>> = {
  "open-landscape": "Typical countryside near here.",
  street: "A street of the kind common near here.",
  shoreline: "Shoreline of the kind found near here.",
};

const SCENE_ALT: Readonly<Record<RegionalSceneKind, string>> = {
  "open-landscape": "Illustrated landscape typical of this area",
  street: "Illustrated street of a kind common in this area",
  shoreline: "Illustrated shoreline typical of this area",
};

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
