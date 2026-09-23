import "./world-orientation.css";

import {
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
import type { RegionalSceneKind } from "../authoring/regional-scene-coverage";
import type {
  RegionalOpeningPlate,
  RegionalOpeningResult,
} from "../presentation/regional-opening-plate";
import type { EntityId, World } from "../simulation";
import { GameSelect } from "./controls/GameSelect";
import { isTerritoryUsps } from "../simulation/state-reference";
import { OpeningStatePopulation } from "./OpeningStatePopulation";
import { OpeningStateVoting } from "./OpeningStateVoting";
import { SavedPersonFigure } from "./SavedPersonFigure";
import { SceneChapterTransition } from "./SceneChapterTransition";
import { projectLivingSceneOpening } from "../presentation/living-scene-facts";
import { candidateEstablishingPlate } from "./candidate-establishing-plate";
import {
  PLAYTEST65_WHITE_HOUSE_LAYOUT,
  OPENING_INFORMATION_PLATES,
} from "../presentation/playtest65-visual-layout";
import {
  OPENING_REGIONAL_CANDIDATES,
  openingHomeRegionPreviews,
  type OpeningRegionalPreviewCandidate,
} from "../presentation/opening-regional-candidates";

/**
 * Introduce the White House, then the home state and region, Congress, and
 * the home locality. Regional scenes are illustrations, not new World facts.
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
  world,
  personId,
  renderFigure,
  establishingPlate,
  regionalCandidates = OPENING_REGIONAL_CANDIDATES,
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
  readonly world?: World;
  readonly personId?: EntityId;
  readonly renderFigure?: (personId: EntityId) => ReactNode;
  readonly establishingPlate?: ReactNode;
  /** Explicit preview fixtures can exercise banked, inactive candidates. */
  readonly regionalCandidates?: readonly OpeningRegionalPreviewCandidate[];
}) {
  const plate = candidateEstablishingPlate(
    PLAYTEST65_WHITE_HOUSE_LAYOUT.assetId,
  );
  const snapshot = useMemo(
    () =>
      world && personId ? projectOpeningWorldSnapshot(world, personId) : null,
    [world, personId],
  );
  const living = useMemo(
    () =>
      world && personId ? projectLivingSceneOpening(world, personId) : null,
    [world, personId],
  );
  const steps: readonly (Omit<OrientationStep, "key"> & {
    readonly key: string;
  })[] = useMemo(() => {
    const order = ["executive", "state", "congress", "locality"];
    const ordered = [...view.steps].sort(
      (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
    );
    if (!snapshot) return ordered;
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
      ...ordered
        .filter((step) => !(homeStateUsps === "DC" && step.key === "locality"))
        .map((step) =>
          step.key === "executive"
            ? {
                ...step,
                people:
                  living?.chapters
                    .find((chapter) => chapter.key === step.key)
                    ?.actors.map((actor) => actor.person) ?? officials,
              }
            : step,
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
  }, [snapshot, view.steps, homeStateUsps, living]);
  const [index, setIndex] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const closed = useRef(false);
  const close = () => {
    if (closed.current) return;
    closed.current = true;
    onClose();
  };
  const step = steps[Math.min(index, steps.length - 1)]!;
  const chapter = living?.chapters.find((entry) => entry.key === step.key);
  const last = index >= steps.length - 1;
  const regionalContext =
    snapshot?.beats.find(
      (beat) => beat.key === (homeStateUsps === "DC" ? "district" : "state"),
    )?.sceneContext ?? null;
  const regionalPlates = useMemo(
    () =>
      openingHomeRegionPreviews(
        regionalContext,
        regionalCandidates.flatMap((candidate) => {
          const raster = candidateEstablishingPlate(
            candidate.assetId,
            candidate.previewRaster,
          );
          return raster ? [{ ...candidate, ...raster }] : [];
        }),
      ),
    [regionalContext, regionalCandidates],
  );
  const [chosenRegion, setChosenRegion] = useState<string | null>(null);
  const regionIndex = Math.max(
    0,
    regionalPlates.findIndex((candidate) => candidate.assetId === chosenRegion),
  );
  // The state step's own scene picker, distinct from the locality plate the
  // caller supplies as `regionalPlate`: this one the player can page through.
  const regionScene = regionalPlates[regionIndex] ?? null;
  const backdropFor = (key: string): OrientationBackdrop =>
    orientationBackdrop(key, {
      whiteHouse: plate,
      regionalPlate:
        regionalPlate?.kind === "plate" ? regionalPlate.plate : null,
      regionScene,
    });
  const backdrop = backdropFor(step.key);
  const nextStep = steps[index + 1];
  const nextPlateUrl = nextStep ? backdropUrl(backdropFor(nextStep.key)) : null;
  const cast =
    step.key !== "executive" && step.key !== "your-life" && world
      ? (chapter?.actors ?? [])
      : [];
  const executiveWithoutPlate = step.key === "executive" && !plate;
  const layout =
    backdrop.kind === "neutral" && cast.length === 0 && !executiveWithoutPlate
      ? "centered"
      : "scene";

  return (
    <section
      className="pg-orientation"
      role="dialog"
      aria-modal="false"
      aria-labelledby={`pg-orientation-title-${step.key}`}
      data-testid="world-orientation"
      data-step={step.key}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        close();
      }}
    >
      <SceneChapterTransition
        chapterKey={step.key}
        nextPlateUrl={nextPlateUrl}
        onReady={() => heading.current?.focus()}
      >
        <div
          className="pg-orientation-stage"
          data-backdrop={backdrop.kind}
          data-layout={layout}
          data-testid={
            step.key === "state"
              ? "opening-regional-scene"
              : "orientation-stage"
          }
          data-has-background={
            step.key === "state"
              ? Boolean(backdrop.kind !== "neutral")
              : undefined
          }
        >
          {step.key === "executive" ? (
            <div
              className="pg-white-house-presentation"
              data-has-plate={Boolean(plate)}
              style={
                plate
                  ? ({
                      "--pg-plate-ratio": `${plate.width / plate.height}`,
                      "--pg-figure-x": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.x) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%`,
                      "--pg-figure-y": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.y) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.height}%`,
                      "--pg-figure-width": `${(100 * PLAYTEST65_WHITE_HOUSE_LAYOUT.president.width) / PLAYTEST65_WHITE_HOUSE_LAYOUT.canvas.width}%`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div className="pg-scene-camera">
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
                          <SavedPersonFigure
                            world={world}
                            personId={person.personId}
                            className="pg-opening-figure"
                          />
                        ) : null)}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <SceneBackdrop backdrop={backdrop} />
          )}
          <div className="pg-orientation-scrim" aria-hidden="true" />

          {cast.length > 0 && world ? (
            <div
              className="pg-orientation-cast"
              data-testid={
                step.key === "congress"
                  ? "orientation-congress-cast"
                  : undefined
              }
              aria-label={
                step.key === "congress"
                  ? "Members from your home state"
                  : undefined
              }
            >
              {cast.map((actor) => (
                <article
                  key={actor.slotKey}
                  className="pg-orientation-cast-member"
                  data-labelled={step.key === "congress" ? "button" : "text"}
                >
                  <SavedPersonFigure
                    world={world}
                    personId={actor.person.personId}
                    className="pg-orientation-cast-figure"
                  />
                  {step.key === "congress" ? (
                    <PersonButton
                      person={actor.person}
                      onOpenPerson={onOpenPerson}
                      compact
                    />
                  ) : (
                    <p className="pg-orientation-cast-label">
                      <strong>{actor.person.name}</strong>
                      <span>{actor.person.title}</span>
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : null}

          <div className="pg-orientation-copy">
            <p className="pg-orientation-kicker">
              {index + 1} of {steps.length} · {view.dateLabel}
            </p>
            <h2
              id={`pg-orientation-title-${step.key}`}
              ref={heading}
              tabIndex={-1}
              className="pg-orientation-title"
              data-testid={`orientation-step-${step.key}`}
            >
              {step.title}
            </h2>
            {step.key !== "state" ? (
              <p className="pg-orientation-summary">{step.summary}</p>
            ) : null}

            <div className="pg-orientation-reading">
              {step.key === "executive" && step.people.length > 0 ? (
                <div className="pg-opening-official-labels">
                  {step.people.map((person) => (
                    <PersonButton
                      key={person.personId}
                      person={person}
                      onOpenPerson={onOpenPerson}
                      compact
                    />
                  ))}
                </div>
              ) : null}

              {step.key === "state" ? (
                <div className="pg-regional-state-information">
                  <div className="pg-regional-card-body pg-state-overview">
                    <section>
                      <h3>
                        {homeStateUsps === "DC"
                          ? "Your District government"
                          : isTerritoryUsps(homeStateUsps)
                            ? "Your territory's government"
                            : "Your state government"}
                      </h3>
                      <p>{step.summary}</p>
                      {step.people.length > 0 ? (
                        <ul className="pg-orientation-people">
                          {step.people.map((person) => (
                            <li key={`${person.personId}:${person.title}`}>
                              <PersonButton
                                person={person}
                                onOpenPerson={onOpenPerson}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                    <OpeningStatePopulation
                      stateUsps={homeStateUsps}
                      asOf={world?.currentDate ?? regionalContext?.asOf ?? ""}
                    />
                    <OpeningStateVoting
                      stateUsps={homeStateUsps}
                      asOf={world?.currentDate ?? regionalContext?.asOf ?? ""}
                    />
                  </div>
                  {backdrop.kind === "region-preview" &&
                  regionalPlates.length > 1 ? (
                    <nav
                      className="pg-regional-scene-navigation"
                      aria-label="Regional views"
                    >
                      <button
                        type="button"
                        className="ui-action"
                        onClick={() =>
                          setChosenRegion(
                            regionalPlates[
                              (regionIndex + regionalPlates.length - 1) %
                                regionalPlates.length
                            ]!.assetId,
                          )
                        }
                      >
                        Previous view
                      </button>
                      <span>
                        View {regionIndex + 1} of {regionalPlates.length}
                      </span>
                      <button
                        type="button"
                        className="ui-action"
                        onClick={() =>
                          setChosenRegion(
                            regionalPlates[
                              (regionIndex + 1) % regionalPlates.length
                            ]!.assetId,
                          )
                        }
                      >
                        Next view
                      </button>
                    </nav>
                  ) : null}
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

              {step.people.length > 0 &&
              step.key !== "executive" &&
              step.key !== "state" ? (
                <ul className="pg-orientation-people">
                  {step.people.map((person) => (
                    <li key={`${person.personId}:${person.title}`}>
                      <PersonButton
                        person={person}
                        onOpenPerson={onOpenPerson}
                      />
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
                  <p className="pg-orientation-summary">
                    {snapshot.startingLocation
                      ? `Begin at ${snapshot.startingLocation.label}.`
                      : "Continue into your life."}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </SceneChapterTransition>
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
              ? close()
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
            onClick={close}
          >
            {mode === "first" ? "Skip" : "Close"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

type EstablishingRaster = NonNullable<
  ReturnType<typeof candidateEstablishingPlate>
>;

/**
 * What stands behind one card, full-bleed.
 *
 * Only art an existing loader already hands back is eligible: the owner-approved
 * White House and civic establishing plates come through the reviewed-preview
 * loader (which returns nothing in a production build), the regional plate
 * through the production regional resolver, and the state picker through the
 * existing preview selection. A card with none of them stands on a plain
 * ground; nothing is borrowed from another place's picture.
 */
export type OrientationBackdrop =
  | { readonly kind: "white-house"; readonly raster: EstablishingRaster }
  | {
      readonly kind: "civic";
      readonly raster: EstablishingRaster;
      readonly caption: string;
    }
  | { readonly kind: "region"; readonly plate: RegionalOpeningPlate }
  | {
      readonly kind: "region-preview";
      readonly raster: EstablishingRaster;
    }
  | { readonly kind: "neutral" };

export function orientationBackdrop(
  stepKey: string,
  sources: {
    readonly whiteHouse: EstablishingRaster | null;
    readonly regionalPlate: RegionalOpeningPlate | null;
    readonly regionScene: EstablishingRaster | null;
  },
): OrientationBackdrop {
  if (stepKey === "executive")
    return sources.whiteHouse
      ? { kind: "white-house", raster: sources.whiteHouse }
      : { kind: "neutral" };
  if (stepKey === "state") {
    if (sources.regionalPlate)
      return { kind: "region", plate: sources.regionalPlate };
    if (sources.regionScene)
      return { kind: "region-preview", raster: sources.regionScene };
    return { kind: "neutral" };
  }
  if (stepKey === "locality") {
    const information = OPENING_INFORMATION_PLATES.locality;
    const civic = information
      ? candidateEstablishingPlate(
          information.assetId,
          information.previewRaster,
        )
      : null;
    if (civic && information)
      return { kind: "civic", raster: civic, caption: information.caption };
    if (sources.regionalPlate)
      return { kind: "region", plate: sources.regionalPlate };
    return { kind: "neutral" };
  }
  return { kind: "neutral" };
}

function backdropUrl(backdrop: OrientationBackdrop): string | null {
  switch (backdrop.kind) {
    case "region":
      return backdrop.plate.url;
    case "neutral":
      return null;
    default:
      return backdrop.raster.url;
  }
}

function SceneBackdrop({
  backdrop,
}: {
  readonly backdrop: OrientationBackdrop;
}) {
  switch (backdrop.kind) {
    case "neutral":
    case "white-house":
      return <div className="pg-orientation-backdrop" aria-hidden="true" />;
    case "region":
      return (
        <figure
          className="pg-orientation-backdrop pg-orientation-region"
          data-testid="orientation-region-plate"
          data-region={backdrop.plate.regionKey}
          data-matched-by={backdrop.plate.matchedBy}
        >
          <img
            className="pg-orientation-backdrop-image pg-orientation-region-plate"
            src={backdrop.plate.url}
            width={backdrop.plate.width}
            height={backdrop.plate.height}
            alt={`${SCENE_ALT[backdrop.plate.sceneKind]}: ${backdrop.plate.displayName.toLowerCase()}.`}
          />
          <figcaption className="pg-orientation-backdrop-caption pg-orientation-region-caption">
            {SCENE_CAPTION[backdrop.plate.sceneKind]} Illustration, not this
            address.
          </figcaption>
        </figure>
      );
    case "region-preview":
      return (
        <figure className="pg-orientation-backdrop">
          <img
            className="pg-orientation-backdrop-image pg-regional-opening-backdrop"
            src={backdrop.raster.url}
            width={backdrop.raster.width}
            height={backdrop.raster.height}
            alt="Illustrated setting from your home region"
            data-asset-id={backdrop.raster.assetId}
            data-testid="opening-regional-plate"
          />
          <figcaption className="pg-orientation-backdrop-caption pg-regional-context">
            Your home region · Illustration
          </figcaption>
        </figure>
      );
    case "civic":
      return (
        <figure className="pg-orientation-backdrop pg-opening-information-illustration">
          <img
            className="pg-orientation-backdrop-image pg-establishing-image"
            src={backdrop.raster.url}
            width={backdrop.raster.width}
            height={backdrop.raster.height}
            alt={backdrop.caption}
            data-asset-id={backdrop.raster.assetId}
          />
          <figcaption className="pg-orientation-backdrop-caption">
            {backdrop.caption}
          </figcaption>
        </figure>
      );
  }
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
  compact = false,
}: {
  readonly person: OrientationPerson;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly compact?: boolean;
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
      {!compact && person.facts.length > 0 ? (
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
        <p className="pg-orientation-roster-note">
          {`All ${stateOptions.find(([usps]) => usps === state)?.[1] ?? "the"} members, in seat order.`}
          {chamber.chamberKey === "us-house" && state === homeStateUsps
            ? " The one who represents your home is under Government, in Represented by."
            : null}
        </p>
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
