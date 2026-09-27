import { CreatorAppearanceStep } from "./CreatorAppearanceStep";
import { type CreatorAppearanceChoice } from "../presentation/creator-appearance-preview";
import { proseDate } from "../presentation/prose-dates";
import { resolveCreatorBirthday } from "../presentation/creator-full-birthday";
import { CreatorBirthdayFields } from "./CreatorBirthdayFields";
import { projectHometownPage } from "../presentation/creator-hometown-page";
import { previewCreatorNames } from "../presentation/creator-name-preview";
import { stateUsps } from "../simulation/school-names";
import {
  creatorBirthDate,
  creatorCharacterHint,
  creatorCharacterMissing,
  statedCreatorGender,
} from "../presentation/creator-character";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_NEW_GAME_SETUP,
  LEGISLATIVE_OFFICE_MINIMUM_AGE,
  MAXIMUM_START_AGE,
  MINIMUM_START_AGE,
  newGameSetupProblems,
  type NewGameSetup,
} from "../presentation/new-game";
import {
  clearCreatorState,
  creatorLocationFromPlaceKey,
  creatorLocationIsReady,
  creatorPlaceListOpen,
  selectCreatorPlace,
  selectCreatorState,
  selectedCreatorPlace,
  withCreatorLocation,
  type CreatorLocationDraft,
} from "../presentation/creator-location";
import {
  placeStartFacts,
  type PlaceStartFact,
} from "../presentation/place-start-summary";
import { placeRegionalFacts } from "../presentation/place-regional-facts";
import { queryHometownPopulationFacts } from "../presentation/place-hometown-population";
import { questionnaireScreenFor } from "../presentation/setup-questionnaire-flow";
import {
  setupForArtPreview,
  type ArtPreviewMode,
} from "../presentation/art-preview";
import { replayDescriptorUrl } from "../presentation/new-game-identity";
import {
  defaultPronounsForGender,
  GENDER_IDENTITY_KEYS,
  GENDER_IDENTITY_LABELS,
  lifePlaceCoverage,
  lifePlaceStateIdentities,
  lifePlaces,
} from "../simulation";
import {
  stateAgencyStartAvailableFor,
  STATE_AGENCY_START_MINIMUM_AGE,
} from "../simulation/civil-personnel-start";

/**
 * The character creator, as one screen that unfolds.
 *
 * WHAT THE SECOND PLAYTEST REJECTED, AND WHAT REPLACED IT.
 *
 * New Game used to leave the title's room and land on a blank page carrying
 * seven headed sections at once, with the four supported places laid out as
 * cards that read as the game's four recommended starts. The human called it a
 * form, and it was.
 *
 * What is here instead is one continuous screen standing in the same drifting
 * room the title stands in, revealing the next thing to decide after the last
 * one is decided. Nothing was removed: every choice the old screen took is
 * still taken, in the same order, writing the same setup. What changed is that
 * a player meets them one at a time and never sees a wall.
 *
 * The place list starts empty on purpose. Four places is what the accepted
 * data honestly reaches today, and showing them unprompted made a limitation
 * look like a recommendation. Searching is the interaction the national
 * corpus will keep, so this is the seam that adapter lands on rather than a
 * screen it will have to replace.
 */

/**
 * The order a life is decided in. Each step opens when the last one closes,
 * and once a step is closed it collapses to a one-line summary the player can
 * reopen — so the active step is the only full-height thing on screen and the
 * creator never grows into a scrolling form.
 *
 * A normal start does not compose a background: who is at home, whether the
 * character already works somewhere, and how much of the early life is played
 * are the generator's to decide after Begin (Task E). Only a custom start
 * carries the extra "background" step where those are set by hand.
 */
const NORMAL_CREATOR_STEPS = [
  "route",
  "character",
  "place",
  "whoAreYou",
  "begin",
] as const;
const CUSTOM_CREATOR_STEPS = [
  "route",
  "character",
  "place",
  "background",
  "whoAreYou",
  "begin",
] as const;

type CreatorStep =
  (typeof NORMAL_CREATOR_STEPS)[number] | (typeof CUSTOM_CREATOR_STEPS)[number];

export function SetupScreen({
  seed,
  seedOrigin,
  previewMode,
  initialSetup,
  questionnaireComplete = false,
  onBack,
  onBegin,
  problem,
}: {
  readonly seed: string;
  readonly seedOrigin: "fresh" | "replay";
  readonly previewMode: ArtPreviewMode;
  readonly initialSetup?: NewGameSetup;
  readonly questionnaireComplete?: boolean;
  readonly onBack: () => void;
  readonly onBegin: (
    setup: NewGameSetup,
    appearance: CreatorAppearanceChoice | null,
    questionsFinished?: boolean,
  ) => void;
  readonly problem: string | null;
}) {
  const [finishedQuestions, setFinishedQuestions] = useState(
    questionnaireComplete,
  );
  const coverage = lifePlaceCoverage();
  const [stateQuery, setStateQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [replacingPlace, setReplacingPlace] = useState(false);
  const [populationFacts, setPopulationFacts] = useState<
    readonly PlaceStartFact[]
  >([]);
  /*
   * An edit of an already-chosen setup reopens with that setup's place; a
   * fresh start opens with none (PT3-CREATOR B).
   */
  const [location, setLocation] = useState<CreatorLocationDraft>(() =>
    creatorLocationFromPlaceKey(initialSetup?.placeKey),
  );
  const matchingStates = useMemo(() => {
    const needle = stateQuery.trim().toLowerCase();
    const identities = lifePlaceStateIdentities();
    if (needle.length === 0) return identities;
    return identities.filter(
      (state) =>
        state.name.toLowerCase().includes(needle) ||
        state.usps.toLowerCase() === needle,
    );
  }, [stateQuery]);
  // One searchable, alphabetized scroll surface; no manual next-page action.
  const placePage = useMemo(() => {
    if (!location.stateJurisdictionKey) return null;
    return projectHometownPage(
      placeQuery,
      0,
      {
        stateJurisdictionKey: location.stateJurisdictionKey,
        scope: "locality",
      },
      Number.MAX_SAFE_INTEGER,
    );
  }, [location.stateJurisdictionKey, placeQuery]);
  const matchingPlaces = placePage?.places ?? [];
  const [nameDraws, setNameDraws] = useState(0);
  const statewidePlace =
    lifePlaces().find(
      (candidate) =>
        candidate.scope === "state" &&
        candidate.stateJurisdictionKey === location.stateJurisdictionKey,
    ) ?? null;
  const [setup, setSetup] = useState<NewGameSetup>(
    () =>
      // Only a newly allocated creator draft enters the candidate generation.
      // Existing drafts, replay descriptors and loaded Worlds retain their pins.
      initialSetup ??
      setupForArtPreview(
        { ...DEFAULT_NEW_GAME_SETUP, seed, placeKey: "" },
        previewMode,
      ),
  );
  /**
   * What the age field currently shows, which is not always a number.
   *
   * `Number(event.target.value)` reads an empty field as 0 and wrote it
   * straight into the setup, so clearing the box to retype an age snapped it to
   * 0 and every following keystroke appended to that: the owner's "0-2-5". A
   * number input has intermediate states that are not numbers — empty while
   * retyping, "-" before a digit — and the setup only ever wants a real age.
   *
   * So the field owns its own text and the setup keeps the last age that
   * actually parsed. Nothing downstream sees a partial edit; the childhood,
   * office-eligibility and range checks keep reading a real number throughout.
   * A fresh creator starts unanswered. Blur only puts the committed age back
   * after the player has entered something; an untouched field stays empty.
   */
  const [ageChosen, setAgeChosen] = useState(initialSetup !== undefined);
  const custom = setup.startKind === "custom";
  const committed = withCreatorLocation(setup, location);
  const steps: readonly CreatorStep[] = custom
    ? CUSTOM_CREATOR_STEPS
    : NORMAL_CREATOR_STEPS;

  /**
   * The step the player is on. It only moves forward on its own; the summaries
   * of finished steps move it back when one is reopened to change an answer.
   */
  const [current, setCurrent] = useState<CreatorStep>(
    initialSetup ? "begin" : "route",
  );
  const currentIndex = Math.max(steps.indexOf(current), 0);
  const isCurrent = (step: CreatorStep) => step === current;
  const isDone = (step: CreatorStep) => {
    const at = steps.indexOf(step);
    return at !== -1 && at < currentIndex;
  };
  const advanceTo = (step: CreatorStep) =>
    setCurrent((now) =>
      steps.indexOf(step) > steps.indexOf(now) ? step : now,
    );
  const reopen = (step: CreatorStep) => {
    if (step === "whoAreYou") setFinishedQuestions(false);
    setCurrent(step);
  };

  const problems = newGameSetupProblems(committed);
  /*
   * Not answering is different from entering an invalid age: both keep Next
   * disabled, but only an entered invalid value needs an error message.
   */
  const ageUsable =
    ageChosen &&
    Number.isSafeInteger(setup.startAge) &&
    setup.startAge >= MINIMUM_START_AGE &&
    setup.startAge <= MAXIMUM_START_AGE;
  const place = selectedCreatorPlace(location);
  const placeListOpen = creatorPlaceListOpen(location.placeKey, replacingPlace);

  useEffect(() => {
    const chosen = selectedCreatorPlace(location);
    setPopulationFacts([]);
    if (!chosen) return;
    let cancelled = false;
    void queryHometownPopulationFacts(chosen).then((facts) => {
      if (!cancelled) setPopulationFacts(facts);
    });
    return () => {
      cancelled = true;
    };
  }, [location.placeKey]);
  const officeAvailable =
    place?.capabilities.legislativeScenarioKey !== null &&
    setup.startAge >= LEGISLATIVE_OFFICE_MINIMUM_AGE;
  const stateAgencyAvailable =
    setup.startAge >= STATE_AGENCY_START_MINIMUM_AGE &&
    stateAgencyStartAvailableFor(place?.stateJurisdictionKey ?? null);
  const chosenGender = statedCreatorGender(setup.gender);
  const characterMissing = creatorCharacterMissing(committed, ageChosen).filter(
    (field) => field !== "birthday",
  );
  const [birthdayCompletionProblem, setBirthdayCompletionProblem] = useState<
    string | null
  >(null);
  const characterHint = creatorCharacterHint(characterMissing);
  const birthDate = ageChosen ? creatorBirthDate(setup) : null;
  // The compact summaries the finished steps collapse to.
  const summaryText: Partial<Record<CreatorStep, string>> = {
    route: custom ? "Custom start" : "Start a life",
    character: [
      [setup.givenName, setup.familyName].filter(Boolean).join(" ") ||
        "A name you'll be given",
      `age ${setup.startAge}`,
      birthDate ? `born ${proseDate(birthDate)}` : null,
      chosenGender ? GENDER_IDENTITY_LABELS[chosenGender] : null,
    ]
      .filter(Boolean)
      .join(" · "),
    place: place ? place.displayName : "",
    background: custom
      ? [
          setup.household === "shares-a-home" ? "Shares a home" : "Lives alone",
          setup.startingLife === "legislative-office"
            ? "Legislative staff"
            : setup.startingLife === "judicial-office-practice"
              ? "Judicial office practice"
              : setup.startingLife === "state-agency-director"
                ? "State agency director"
                : "Everyday life",
        ].join(" · ")
      : "",
    whoAreYou:
      setup.questionnaire === "skipped"
        ? "Discover through play"
        : "Answering a few questions",
  };
  const onReady = currentIndex >= steps.indexOf("begin");

  return (
    <main
      className={`game-title game-setup game-creator${onReady && (finishedQuestions || !questionnaireScreenFor(committed)) ? " game-creator--appearance" : ""}`}
      data-testid="setup-screen"
    >
      {/*
            Finished steps, collapsed. Each is a one-line summary the player can
            reopen; this is what keeps the whole active step inside the viewport
            instead of stacking every section into a scrolling column.
          */}
      <div className="creator-summaries">
        {steps
          .filter(
            (step) =>
              step !== "begin" && isDone(step) && Boolean(summaryText[step]),
          )
          .map((step) => (
            <button
              key={step}
              type="button"
              className="creator-summary"
              data-testid={`creator-summary-${step}`}
              onClick={() => reopen(step)}
            >
              <span className="creator-summary-value">{summaryText[step]}</span>
              <span className="creator-summary-edit" aria-hidden="true">
                Change
              </span>
            </button>
          ))}
      </div>

      {isCurrent("route") ? (
        <section data-testid="creator-stage-route">
          <h2>How do you want to start?</h2>
          <div className="game-choices" data-testid="start-kind-choices">
            <button
              type="button"
              data-testid="start-normal"
              aria-pressed={!custom}
              className={!custom ? "is-chosen" : undefined}
              onClick={() => {
                setSetup((now) => ({ ...now, startKind: "normal" }));
                setLocation((now) => {
                  const selected = selectedCreatorPlace(now);
                  return selected && selected.scope === "state"
                    ? { ...now, placeKey: null }
                    : now;
                });
                setCurrent("character");
              }}
            >
              Start a life
              <small>
                You say who you are and where you're from. Everything else —
                your family, your home, the years behind you — the game builds
                when you begin.
              </small>
            </button>
            <button
              type="button"
              data-testid="start-custom"
              aria-pressed={custom}
              className={custom ? "is-chosen" : undefined}
              onClick={() => {
                setSetup((now) => ({ ...now, startKind: "custom" }));
                setCurrent("character");
              }}
            >
              Custom start
              <small>
                Set the background yourself — who's at home, whether you already
                work somewhere, how much of the early years to play.
              </small>
            </button>
          </div>
        </section>
      ) : null}

      {isCurrent("character") ? (
        <section data-testid="creator-stage-character">
          <h2>Your character</h2>
          {/*
                Gender, asked rather than decided. Guessing it from the first
                name would be wrong: the name corpus carries no demographic
                attribute for anything to be guessed from. Normal Start exposes
                gender only (owner override) — pronouns derive silently from it
                and are never a player-facing control here.
              */}
          <fieldset
            className="game-fieldset"
            data-testid="gender-choices"
            aria-required="true"
          >
            <legend>Gender (required)</legend>
            <div className="game-choices game-choices-inline">
              {GENDER_IDENTITY_KEYS.filter((key) => key !== "unstated").map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    data-testid={`gender-${key}`}
                    aria-pressed={setup.gender === key}
                    className={setup.gender === key ? "is-chosen" : undefined}
                    onClick={() => {
                      setSetup((now) => ({
                        ...now,
                        gender: key,
                        pronouns: defaultPronounsForGender(key),
                      }));
                    }}
                  >
                    {GENDER_IDENTITY_LABELS[key]}
                  </button>
                ),
              )}
            </div>
          </fieldset>

          <div className="creator-group creator-group-name">
            <span className="creator-group-label">Name</span>
            <div className="game-fields">
              <label>
                First name
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={setup.givenName ?? ""}
                  aria-describedby="creator-name-hint"
                  onChange={(event) =>
                    setSetup((now) => ({
                      ...now,
                      givenName: event.target.value || null,
                    }))
                  }
                />
              </label>
              <label>
                Last name
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={setup.familyName ?? ""}
                  aria-describedby="creator-name-hint"
                  onChange={(event) =>
                    setSetup((now) => ({
                      ...now,
                      familyName: event.target.value || null,
                    }))
                  }
                />
              </label>
            </div>
            <div className="creator-name-actions">
              <button
                type="button"
                data-testid="creator-randomize-name"
                disabled={chosenGender === null}
                onClick={() => {
                  if (chosenGender === null) return;
                  const salt = nameDraws + 1;
                  const draw = previewCreatorNames(
                    setup.seed,
                    chosenGender,
                    salt,
                    stateUsps(location.stateJurisdictionKey),
                  );
                  setNameDraws(salt);
                  setSetup((now) => ({
                    ...now,
                    givenName: draw.givenName,
                    familyName: draw.familyName,
                  }));
                }}
              >
                Randomize name
              </button>
              <p
                className="game-hint"
                id="creator-name-hint"
                data-testid="creator-name-hint"
              >
                {chosenGender === null
                  ? "Choose a gender first; Randomize name then draws a name for it."
                  : "Type a first and last name, or use Randomize name."}
              </p>
            </div>
          </div>

          <div className="creator-group">
            <CreatorBirthdayFields
              setup={setup}
              yearChosen={ageChosen}
              onChange={(next, yearChosen) => {
                setSetup(next);
                if (yearChosen) setAgeChosen(true);
              }}
            />
          </div>

          <button
            type="button"
            className="game-creator-next"
            data-testid="creator-continue-character"
            aria-describedby={
              characterHint ? "creator-character-missing" : undefined
            }
            disabled={characterMissing.length > 0 || (ageChosen && !ageUsable)}
            onClick={() => {
              const completed = resolveCreatorBirthday(setup, ageChosen);
              if (!completed) {
                setBirthdayCompletionProblem(
                  "These date fields do not form a supported birthday. Check the day, month and year.",
                );
                return;
              }
              setBirthdayCompletionProblem(null);
              setSetup(completed);
              setAgeChosen(true);
              advanceTo("place");
            }}
          >
            Next
          </button>
          {characterHint ? (
            <p
              className="game-hint"
              id="creator-character-missing"
              data-testid="creator-character-missing"
            >
              {characterHint}
            </p>
          ) : null}
          {birthdayCompletionProblem ? (
            <p role="alert">{birthdayCompletionProblem}</p>
          ) : null}
        </section>
      ) : null}

      {isCurrent("place") ? (
        <section data-testid="creator-stage-place">
          <h2>Where are you from?</h2>
          {location.stateJurisdictionKey ? (
            <button
              type="button"
              className="creator-summary"
              data-testid="creator-change-state"
              onClick={() => {
                setLocation(clearCreatorState());
                setPlaceQuery("");
                setReplacingPlace(false);
                setSetup((now) => ({ ...now, placeKey: "" }));
              }}
            >
              <span className="creator-summary-value">
                {lifePlaceStateIdentities().find(
                  (state) =>
                    state.jurisdictionKey === location.stateJurisdictionKey,
                )?.name ?? location.stateJurisdictionKey}
              </span>
              <span className="creator-summary-edit">Change</span>
            </button>
          ) : (
            <>
              <label className="game-search">
                Choose a state
                <input
                  type="search"
                  data-testid="state-search"
                  value={stateQuery}
                  placeholder="Type a state"
                  onChange={(event) => setStateQuery(event.target.value)}
                />
              </label>
              {matchingStates.length > 0 ? (
                <div className="game-choices" data-testid="state-choices">
                  {matchingStates.map((state) => (
                    <button
                      key={state.jurisdictionKey}
                      type="button"
                      data-testid={`state-${state.usps}`}
                      onClick={() => {
                        setLocation((now) =>
                          selectCreatorState(now, state.jurisdictionKey),
                        );
                        setPlaceQuery("");
                        setReplacingPlace(false);
                        setSetup((now) => ({ ...now, placeKey: "" }));
                      }}
                    >
                      {state.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="game-note" data-testid="state-no-match">
                  Nothing here matches that yet.
                </p>
              )}
            </>
          )}
          {location.stateJurisdictionKey ? (
            <>
              <label className="game-search">
                Search places in this state
                <input
                  type="search"
                  data-testid="place-search"
                  value={placeQuery}
                  placeholder="Type a city or town"
                  onChange={(event) => {
                    setPlaceQuery(event.target.value);
                    if (location.placeKey) setReplacingPlace(true);
                  }}
                />
              </label>
              {custom && statewidePlace ? (
                <div className="game-choices" data-testid="place-statewide">
                  <button
                    type="button"
                    data-testid="place-statewide-choice"
                    className={
                      location.placeKey === statewidePlace.key
                        ? "is-chosen"
                        : undefined
                    }
                    onClick={() => {
                      setLocation((now) =>
                        selectCreatorPlace(now, statewidePlace),
                      );
                      setReplacingPlace(false);
                      setSetup((now) => ({
                        ...now,
                        placeKey: statewidePlace.key,
                      }));
                    }}
                  >
                    {statewidePlace.displayName}
                    <small data-place-scope="state">
                      Statewide — not a hometown
                    </small>
                  </button>
                </div>
              ) : null}
              {placeListOpen && matchingPlaces.length > 0 ? (
                <div
                  className="game-choices creator-place-scroll"
                  data-testid="place-choices"
                  key={`${location.stateJurisdictionKey}:${placeQuery}`}
                  tabIndex={0}
                  aria-label="Hometowns"
                >
                  {matchingPlaces.map((candidate) => (
                    <button
                      key={candidate.key}
                      type="button"
                      className={
                        candidate.key === location.placeKey
                          ? "is-chosen"
                          : undefined
                      }
                      onClick={() => {
                        setLocation((now) =>
                          selectCreatorPlace(now, candidate),
                        );
                        setReplacingPlace(false);
                        setSetup((now) => ({
                          ...now,
                          placeKey: candidate.key,
                          startingLife:
                            (now.startingLife === "legislative-office" &&
                              candidate.capabilities.legislativeScenarioKey ===
                                null) ||
                            (now.startingLife === "state-agency-director" &&
                              !stateAgencyStartAvailableFor(
                                candidate.stateJurisdictionKey,
                              ))
                              ? "ordinary-life"
                              : now.startingLife,
                        }));
                      }}
                    >
                      {candidate.displayName}
                      <small data-place-scope={candidate.scope}>
                        {candidate.withinName ?? ""}
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
              {placeListOpen && placePage && placePage.total > 0 ? (
                <div className="creator-place-pager" data-testid="place-pager">
                  <p
                    className="game-hint"
                    role="status"
                    data-testid="place-page-status"
                  >
                    {placePage.status}
                  </p>
                </div>
              ) : placeListOpen && placeQuery.trim().length === 0 ? (
                <p className="game-note" data-testid="place-prompt">
                  Choose a town in this state. {coverage.playerNote}
                </p>
              ) : placeListOpen ? (
                <p className="game-note" data-testid="place-no-match">
                  Nothing here matches that yet. {coverage.playerNote}
                </p>
              ) : null}
            </>
          ) : (
            <p className="game-note" data-testid="place-prompt">
              Choose a state first. A fresh start has no home selected.
            </p>
          )}
          {place &&
          creatorLocationIsReady(location, custom ? "custom" : "normal") ? (
            <div className="creator-place-context" data-testid="place-context">
              <button
                type="button"
                className="creator-summary"
                data-testid="creator-change-place"
                onClick={() => setReplacingPlace((open) => !open)}
              >
                <span
                  className="creator-place-name"
                  data-testid="place-canonical"
                >
                  {place.displayName}
                </span>
                <span className="creator-summary-edit">
                  {replacingPlace ? "Keep" : "Change"}
                </span>
              </button>
              {place.scope !== "locality" ? (
                <p className="game-hint" data-testid="place-scope">
                  {place.scope === "state"
                    ? "Statewide start."
                    : "County-wide start; a specific town is not selected."}
                </p>
              ) : null}
              {placeStartFacts(place)
                .filter((fact) => fact.kind !== "name")
                .map((fact) => (
                  <p
                    key={`${fact.kind}:${fact.text}`}
                    className="game-hint"
                    data-testid={`place-${fact.kind}`}
                  >
                    {fact.text}
                  </p>
                ))}
              {placeRegionalFacts(place).map((fact) => (
                <p
                  key={fact.key}
                  className="game-hint"
                  data-testid={`place-regional-${fact.key}`}
                >
                  {fact.text}
                </p>
              ))}
              {populationFacts.map((fact) => (
                <p
                  key={`${fact.kind}:${fact.text}:${fact.asOf}`}
                  className="game-hint"
                  data-testid="place-population"
                >
                  {fact.geography
                    ? `${fact.text} · ${fact.geography}`
                    : fact.text}
                </p>
              ))}
              {replacingPlace ? null : (
                <button
                  type="button"
                  className="game-creator-next"
                  data-testid="creator-continue-place"
                  onClick={() => advanceTo(custom ? "background" : "whoAreYou")}
                >
                  Next
                </button>
              )}
            </div>
          ) : location.stateJurisdictionKey ? (
            <p className="game-note" data-testid="place-need-locality">
              Next waits until you choose a place in this state.
            </p>
          ) : null}
        </section>
      ) : null}

      {custom && isCurrent("background") ? (
        <section data-testid="creator-stage-background">
          <h2>Your background</h2>
          <h3>How much of the early years to play</h3>
          <div className="game-choices">
            <button
              type="button"
              data-testid="depth-childhood"
              className={
                setup.depth === "play-formative-years" ? "is-chosen" : undefined
              }
              onClick={() =>
                setSetup((now) => ({
                  ...now,
                  depth: "play-formative-years",
                }))
              }
            >
              Start in childhood
              <small>
                {setup.startAge < 18
                  ? "Play the early years one at a time."
                  : "Only for a character under eighteen."}
              </small>
            </button>
            <button
              type="button"
              data-testid="depth-later"
              className={
                setup.depth === "summarize-earlier-life"
                  ? "is-chosen"
                  : undefined
              }
              onClick={() =>
                setSetup((now) => ({
                  ...now,
                  depth: "summarize-earlier-life",
                }))
              }
            >
              Begin later
              <small>The early years are already behind you.</small>
            </button>
          </div>

          <h3>Work</h3>
          <div className="game-choices">
            <button
              type="button"
              className={
                setup.startingLife === "ordinary-life" ? "is-chosen" : undefined
              }
              onClick={() =>
                setSetup((now) => ({
                  ...now,
                  startingLife: "ordinary-life",
                }))
              }
            >
              Everyday life
              <small>No office. No formal political role.</small>
            </button>
            <button
              type="button"
              data-testid="office-start"
              className={
                setup.startingLife === "legislative-office"
                  ? "is-chosen"
                  : undefined
              }
              disabled={!officeAvailable}
              onClick={() =>
                setSetup((now) => ({
                  ...now,
                  startingLife: "legislative-office",
                }))
              }
            >
              Legislative staff
              <small>
                {place?.capabilities.legislativeScenarioKey === null
                  ? "A legislative staff start is not available for this selected place yet."
                  : setup.startAge < LEGISLATIVE_OFFICE_MINIMUM_AGE
                    ? `Available for characters ${LEGISLATIVE_OFFICE_MINIMUM_AGE} and older.`
                    : "Working for a state legislature."}
              </small>
            </button>
          </div>

          <button
            type="button"
            data-testid="judicial-office-start"
            disabled={setup.startAge < 25}
            className={
              setup.startingLife === "judicial-office-practice"
                ? "is-chosen"
                : undefined
            }
            onClick={() =>
              setSetup((now) => ({
                ...now,
                startingLife: "judicial-office-practice",
                depth: "summarize-earlier-life",
              }))
            }
          >
            Judicial office practice
            <small>
              Fictional workplace and working relationships, for ages 25 and
              older. This start grants no election, appointment, legal term or
              authority to decide cases.
            </small>
          </button>
          <button
            type="button"
            data-testid="state-agency-start"
            disabled={!stateAgencyAvailable}
            className={
              setup.startingLife === "state-agency-director"
                ? "is-chosen"
                : undefined
            }
            onClick={() =>
              setSetup((now) => ({
                ...now,
                startingLife: "state-agency-director",
                depth: "summarize-earlier-life",
              }))
            }
          >
            State agency director
            <small>
              {stateAgencyStartAvailableFor(place?.stateJurisdictionKey ?? null)
                ? setup.startAge < STATE_AGENCY_START_MINIMUM_AGE
                  ? `Available for characters ${STATE_AGENCY_START_MINIMUM_AGE} and older.`
                  : "A fictional state agency with existing staff. Its charter makes you the appointing authority; personnel procedures apply only where acquired law supports them."
                : "Available only in a state whose personnel procedures the game has compiled."}
            </small>
          </button>
          <h3>At home</h3>
          <div className="game-choices" data-testid="household-choices">
            <button
              type="button"
              data-testid="lives-alone"
              className={
                setup.household === "lives-alone" ? "is-chosen" : undefined
              }
              onClick={() =>
                setSetup((now) => ({ ...now, household: "lives-alone" }))
              }
            >
              Nobody else
              <small>
                {setup.startAge < 18
                  ? "One adult raising you, and no other children."
                  : "You live on your own."}
              </small>
            </button>
            <button
              type="button"
              data-testid="shares-a-home"
              className={
                setup.household === "shares-a-home" ? "is-chosen" : undefined
              }
              onClick={() =>
                setSetup((now) => ({ ...now, household: "shares-a-home" }))
              }
            >
              Somebody else
              <small>
                {setup.startAge < 18
                  ? "A brother or a sister in the house too."
                  : "One other adult shares the household."}
              </small>
            </button>
          </div>
          <button
            type="button"
            className="game-creator-next"
            data-testid="creator-continue-background"
            onClick={() => advanceTo("whoAreYou")}
          >
            Next
          </button>
        </section>
      ) : null}

      {isCurrent("whoAreYou") ? (
        <section data-testid="creator-stage-whoareyou">
          <h2>Who are you?</h2>
          <p className="game-note" data-testid="whoareyou-note">
            A few imagined situations. Choose what you would do, or skip. These
            answers do not write your character’s biography.
          </p>
          <div className="game-choices" data-testid="whoareyou-choices">
            <button
              type="button"
              data-testid="whoareyou-answer"
              className={
                setup.questionnaire === "short" ? "is-chosen" : undefined
              }
              onClick={() => {
                setSetup((now) => ({
                  ...now,
                  questionnaire: "short",
                  priors: now.questionnaire === "short" ? now.priors : [],
                }));
                advanceTo("begin");
              }}
            >
              Answer a few questions
            </button>
            <button
              type="button"
              data-testid="whoareyou-deep"
              className={
                setup.questionnaire === "deep" ? "is-chosen" : undefined
              }
              onClick={() => {
                setSetup((now) => ({
                  ...now,
                  questionnaire: "deep",
                  priors: now.questionnaire === "deep" ? now.priors : [],
                }));
                advanceTo("begin");
              }}
            >
              Answer more questions
              <small>You can begin your life whenever you are ready.</small>
            </button>
            <button
              type="button"
              data-testid="whoareyou-play"
              className={
                setup.questionnaire === "skipped" ? "is-chosen" : undefined
              }
              onClick={() => {
                setSetup((now) => ({
                  ...now,
                  questionnaire: "skipped",
                  priors: [],
                }));
                advanceTo("begin");
              }}
            >
              Discover through play
            </button>
          </div>
        </section>
      ) : null}

      {problems.length > 0 && onReady ? (
        <p className="game-problem" data-testid="setup-problem">
          {problems[0]!.message}
        </p>
      ) : null}
      {problem ? <p className="game-problem">{problem}</p> : null}

      <div className="game-setup-actions">
        <button type="button" onClick={onBack}>
          Back
        </button>
        {onReady && !finishedQuestions && questionnaireScreenFor(committed) ? (
          <button
            type="button"
            data-testid="begin"
            disabled={problems.length > 0}
            onClick={() => onBegin(committed, null)}
          >
            Continue to questions
          </button>
        ) : null}
      </div>

      {onReady &&
      problems.length === 0 &&
      (finishedQuestions || !questionnaireScreenFor(committed)) ? (
        <CreatorAppearanceStep
          key={JSON.stringify(committed)}
          setup={committed}
          mode={previewMode}
          onBegin={(appearance) => onBegin(committed, appearance, true)}
        />
      ) : null}

      {/*
            Reproducibility, moved off the setup surface proper. A raw seed and
            a replay address are development tools; they stay reachable behind a
            collapsed Advanced disclosure rather than on the creator itself.
          */}
      <details className="game-dev" data-testid="setup-advanced">
        <summary>Advanced &mdash; reproducing this world</summary>
        <p>
          This world is generated from{" "}
          <code data-testid="setup-seed">{seed}</code>
          {seedOrigin === "replay"
            ? ", which was supplied to reproduce an earlier one."
            : ", drawn fresh for this session."}{" "}
          The address below carries the place, the age and any names you typed
          as well, so it rebuilds the same world.
        </p>
        <p>
          <code data-testid="setup-replay-link">
            {replayDescriptorUrl("", "/", committed)}
          </code>
        </p>
      </details>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
