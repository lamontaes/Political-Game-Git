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
import { PlacePeopleLayer } from "./PlacePeopleLayer";
import { placeBackdropPeople } from "../presentation/backdrop-people";
import { SceneChapterTransition } from "./SceneChapterTransition";
import { projectLivingSceneOpening } from "../presentation/living-scene-facts";
import {
  projectOpeningFamily,
  projectOpeningLegislature,
  projectOpeningTown,
  projectOpeningYear,
  type OpeningFamilyMember,
} from "../presentation/opening-story";
import { candidateEstablishingPlate } from "./candidate-establishing-plate";
import {
  capitolPlaceFor,
  middayBackdropUrl,
} from "../presentation/place-backdrops";
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
    /** Plain sentences read from the World, shown under the summary. */
    readonly lines?: readonly string[];
    /** Real headlines of the day, for the year's screen. */
    readonly headlines?: readonly string[];
    /** The heading over them, when it is not the day's news. */
    readonly headlinesTitle?: string;
    /** Parents and guardians, for the family screen. */
    readonly family?: readonly OpeningFamilyMember[];
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
    // The opening walks from the country to the character (Lamontae, Sept.
    // 28): the year first, then the White House, your state and its
    // legislature, Congress (the Register keeps it after the state), your
    // county and town, and your own story last. Every added line is read
    // from the World (opening-story.ts); a screen with nothing recorded to
    // say is left out rather than shown empty.
    const year =
      world && personId ? projectOpeningYear(world, personId, view) : null;
    const legislature =
      world && personId && homeStateUsps !== "DC"
        ? projectOpeningLegislature(world, personId)
        : null;
    const town = world && personId ? projectOpeningTown(world, personId) : null;
    const family =
      world && personId ? projectOpeningFamily(world, personId) : null;
    const withLocal = (step: (typeof ordered)[number]) =>
      step.key === "locality" && town
        ? {
            ...step,
            lines: town.officials.map((line) => `${line}.`),
            headlinesTitle: "What people here are weighing",
            headlines: town.matters,
          }
        : step;
    const national = ordered
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
          : withLocal(step),
      );
    const stateIndex = national.findIndex((step) => step.key === "state");
    const legislatureStep =
      legislature &&
      (legislature.chambers.length > 0 || legislature.yours.length > 0)
        ? [
            {
              key: "legislature",
              title: legislature.bodyName ?? "Your legislature",
              summary:
                legislature.chambers.length > 0
                  ? "Your state's lawmakers, by party."
                  : "Your state's lawmakers.",
              lines: [...legislature.chambers, ...legislature.yours],
              people: [],
              chambers: [],
            },
          ]
        : [];
    const withLegislature =
      stateIndex >= 0
        ? [
            ...national.slice(0, stateIndex + 1),
            ...legislatureStep,
            ...national.slice(stateIndex + 1),
          ]
        : [...national, ...legislatureStep];
    return [
      ...(year && year.lines.length > 0
        ? [
            {
              key: "year",
              title: `In the year ${year.year}`,
              summary: "The country, as your life begins.",
              lines: year.lines,
              headlines: year.headlines,
              people: [],
              chambers: [],
            },
          ]
        : []),
      ...withLegislature,
      ...(family && family.parents.length > 0
        ? [
            {
              key: "parents",
              title: "Your family",
              summary:
                family.parents.length === 1
                  ? "Who raised you."
                  : "The people who raised you.",
              family: family.parents,
              people: [],
              chambers: [],
            },
          ]
        : []),
      {
        key: "your-life",
        title: "Your life so far",
        // Parents are on the family screen, so they are not named twice; and
        // an empty household is left unsaid rather than reported as a record.
        summary: (
          snapshot.beats.find((beat) => beat.key === "your-life")?.facts ?? []
        )
          .filter(
            (fact) =>
              !/^No one else is recorded/.test(fact) &&
              !(family?.parents ?? []).some((parent) =>
                fact.startsWith(parent.introduction.split(",")[0]!),
              ),
          )
          .join(" "),
        people: [],
        chambers: [],
      },
    ];
  }, [snapshot, view, homeStateUsps, living, world, personId]);
  const householdDetail = useMemo(() => {
    const family =
      world && personId ? projectOpeningFamily(world, personId) : null;
    return new Map(
      [...(family?.parents ?? []), ...(family?.household ?? [])].map(
        (member) => [member.personId, member],
      ),
    );
  }, [world, personId]);
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
      homeStateUsps,
    });
  const backdrop = backdropFor(step.key);
  const nextStep = steps[index + 1];
  const nextPlateUrl = nextStep ? backdropUrl(backdropFor(nextStep.key)) : null;
  const cast =
    step.key !== "executive" && step.key !== "your-life" && world
      ? (chapter?.actors ?? [])
      : [];
  const executiveWithoutPlate = step.key === "executive" && !plate;
  // In the painted Oval Office the President and Vice President stand in
  // front of the desk on the room's measured spots, facing each other, at
  // the room's own scale and in a natural stance, like people in any other
  // painted place.
  const officeStage = useRef<HTMLDivElement>(null);
  const officePlace =
    executiveWithoutPlate &&
    !establishingPlate &&
    backdrop.kind === "place" &&
    world &&
    personId
      ? backdrop.place
      : null;
  const officePeople = useMemo(
    () =>
      officePlace && world && personId
        ? placeBackdropPeople(
            world,
            personId,
            officePlace,
            world.currentMoment,
            step.people,
            { standing: true },
          )
        : [],
    [officePlace, world, personId, step.people],
  );
  const officeStaged = officePlace !== null && officePeople.length > 0;
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
          {officeStaged ? (
            <div
              ref={officeStage}
              className="pg-orientation-backdrop pg-orientation-staged"
              data-testid="opening-office-staged"
            >
              <SceneBackdrop backdrop={backdrop} />
              <PlacePeopleLayer people={officePeople} stageRef={officeStage} />
            </div>
          ) : step.key === "executive" && !plate && !establishingPlate ? (
            <SceneBackdrop backdrop={backdrop} />
          ) : null}
          {officeStaged ? null : step.key === "executive" ? (
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
                            wear="formal"
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
                    wear="formal"
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
                    {isTerritoryUsps(homeStateUsps) ? null : (
                      <OpeningStateVoting
                        stateUsps={homeStateUsps}
                        asOf={world?.currentDate ?? regionalContext?.asOf ?? ""}
                      />
                    )}
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

              {step.lines && step.lines.length > 0 ? (
                <ul
                  className="pg-orientation-lines"
                  data-testid={`orientation-lines-${step.key}`}
                >
                  {step.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              {step.headlines && step.headlines.length > 0 ? (
                <section
                  className="pg-orientation-headlines"
                  data-testid="orientation-headlines"
                >
                  <h3>{step.headlinesTitle ?? "In the news"}</h3>
                  <ul>
                    {step.headlines.map((headline) => (
                      <li key={headline}>{headline}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {step.family && step.family.length > 0 ? (
                <ul
                  className="pg-opening-household"
                  data-testid="orientation-family"
                >
                  {step.family.map((member) => (
                    <li key={member.personId}>
                      <button
                        type="button"
                        className="ui-action"
                        onClick={() => onOpenPerson(member.personId)}
                      >
                        {member.introduction}
                      </button>
                      <span className="pg-opening-family-detail">
                        {familyDetail(member)}
                      </span>
                    </li>
                  ))}
                </ul>
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
                    {snapshot.life.household.household.map((person) => {
                      const known = householdDetail.get(person.personId);
                      return (
                        <li key={person.personId}>
                          <button
                            type="button"
                            className="ui-action"
                            onClick={() => onOpenPerson(person.personId)}
                          >
                            {person.introduction}
                          </button>
                          {known?.work ? (
                            <span className="pg-opening-family-detail">
                              {`Works as ${known.work}.`}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
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

/** One plain sentence about a parent or guardian, from their records. */
function familyDetail(member: OpeningFamilyMember): string {
  if (member.died) return "They have died.";
  const work = member.work ? `Works as ${member.work}.` : "";
  const home = member.livesWithYou ? "Lives with you." : "";
  return [work, home].filter(Boolean).join(" ");
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
  /** One of the owner's place backdrops (art/backdrops). */
  | { readonly kind: "place"; readonly place: string; readonly url: string }
  | { readonly kind: "neutral" };

export function orientationBackdrop(
  stepKey: string,
  sources: {
    readonly whiteHouse: EstablishingRaster | null;
    readonly regionalPlate: RegionalOpeningPlate | null;
    readonly regionScene: EstablishingRaster | null;
    /** The home state's postal code, for the right capitol. */
    readonly homeStateUsps?: string | null;
  },
): OrientationBackdrop {
  const place = (name: string | null | undefined): OrientationBackdrop => {
    const url = name ? middayBackdropUrl(name) : null;
    return name && url
      ? { kind: "place", place: name, url }
      : { kind: "neutral" };
  };
  // Without the exterior plate (a build that does not show reviewed art),
  // the White House card stands in the Oval Office: the same building, and
  // the Resolute Desk alternate the Sept. 20 ratification names. Never
  // another place's picture.
  if (stepKey === "executive")
    return sources.whiteHouse
      ? { kind: "white-house", raster: sources.whiteHouse }
      : place("oval-office");
  if (stepKey === "year") return place("us-capitol-exterior");
  if (stepKey === "congress") return place("us-capitol-exterior");
  if (stepKey === "legislature")
    return place(
      sources.homeStateUsps === "NE"
        ? "state-legislative-chamber-unicameral"
        : "state-legislative-chamber-bicameral",
    );
  if (stepKey === "parents") return place("main-street");
  // The street of your town, not a home: the play screen's own room decides
  // what your home looks like, and the two must never disagree.
  if (stepKey === "your-life") return place("main-street");
  if (stepKey === "state") {
    if (sources.regionalPlate)
      return { kind: "region", plate: sources.regionalPlate };
    if (sources.regionScene)
      return { kind: "region-preview", raster: sources.regionScene };
    return place(capitolPlaceFor(sources.homeStateUsps ?? null));
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
    return place("city-hall-exterior");
  }
  return { kind: "neutral" };
}

function backdropUrl(backdrop: OrientationBackdrop): string | null {
  switch (backdrop.kind) {
    case "region":
      return backdrop.plate.url;
    case "place":
      return backdrop.url;
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
    case "place":
      return (
        <figure
          className="pg-orientation-backdrop"
          data-testid="orientation-place-backdrop"
          data-place={backdrop.place}
          aria-hidden="true"
        >
          <img
            className="pg-orientation-backdrop-image"
            src={backdrop.url}
            alt=""
          />
        </figure>
      );
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
