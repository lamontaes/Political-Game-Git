import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BrowserSaveStore,
  type BrowserWorldSummary,
  type QuarantinedSave,
} from "../presentation/browser-world-repository";
import { guardUnsavedWork } from "../presentation/unsaved-work-guard";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
  type StoryMoment,
} from "../presentation/life-story";
import { projectLifeRecord } from "../presentation/life-record";
import {
  DEFAULT_NEW_GAME_SETUP,
  LEGISLATIVE_OFFICE_MINIMUM_AGE,
  MAXIMUM_START_AGE,
  MINIMUM_START_AGE,
  createNewGameWorld,
  newGameSetupProblems,
  type NewGameSetup,
} from "../presentation/new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
  projectOrdinaryDay,
} from "../presentation/ordinary-life";
import {
  answerQuestionnaire,
  endQuestionnaireEarly,
  questionnaireContentNote,
  questionnaireScreenFor,
} from "../presentation/setup-questionnaire-flow";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import {
  buildLifeIntroduction,
  type IntroducedPerson,
} from "../presentation/life-introduction";
import { resolveLifeScene } from "../presentation/life-scene";
import { planLifeScenePeople } from "../presentation/life-scene-people";
import { SceneBackdrop } from "./SceneBackdrop";
import { AmbientTableau, TitleScreen } from "./TitleScreen";
import {
  readReplaySeed,
  resolveSessionSeed,
} from "../presentation/session-seed";
import {
  readReplaySetup,
  replayDescriptorUrl,
} from "../presentation/new-game-identity";
import {
  defaultPronounsForGender,
  GENDER_IDENTITY_KEYS,
  GENDER_IDENTITY_LABELS,
  lifePlaceByKey,
  lifePlaceCoverage,
  lifePlaceSearch,
} from "../simulation";
import type {
  EntityId,
  LifePlace,
  QuestionnairePhase,
  World,
} from "../simulation";
import {
  openLegislativeWork,
  type LegislativeAssignment,
} from "../presentation/legislation-world";
import { LegislationWorkspace } from "./LegislationWorkspace";
import { PlayerConversations } from "./PlayerConversation";
import { PersonPortrait } from "./PersonPortrait";

/**
 * The game.
 *
 * One world, loaded or newly made, owned here and passed down. Nothing below
 * builds a second one. Which surfaces appear is decided by what the world says
 * the character's life is, not by which screen happens to exist.
 */

type Screen =
  | { readonly kind: "title" }
  | { readonly kind: "setup" }
  /**
   * The calibration, between choosing a life and starting one.
   *
   * It carries the setup rather than reading it back from the setup screen,
   * because the answers are part of the setup by the time the world is built —
   * and because a player who goes back and changes their age has not answered
   * a different questionnaire.
   */
  | { readonly kind: "questionnaire"; readonly setup: NewGameSetup }
  | { readonly kind: "saves" }
  | { readonly kind: "options" }
  | { readonly kind: "playing" };

interface Session {
  readonly world: World;
  readonly personId: EntityId;
  /** Only set for a world that has never been saved. */
  readonly unsavedSeed: string | null;
  /** The slot this life is kept in. A world can be kept in more than one. */
  readonly saveId: EntityId | null;
}

export function PlayerGame() {
  const store = useMemo(() => {
    try {
      return new BrowserSaveStore();
    } catch {
      return null;
    }
  }, []);
  // A replay seed is honoured for the whole session; otherwise every trip to
  // the setup screen draws a new one, so starting a second life does not
  // quietly rebuild the first.
  const replaySeed = useMemo(() => readReplaySeed(window.location.search), []);
  const [sessionSeed, setSessionSeed] = useState(() =>
    resolveSessionSeed(window.location.search, window.crypto),
  );

  // A replay address rebuilds the exact world it came from, rather than
  // dropping the player on the title screen with a seed and a guess.
  const replaySetup = useMemo(
    () => readReplaySetup(window.location.search),
    [],
  );
  const [screen, setScreen] = useState<Screen>({ kind: "title" });
  const [session, setSession] = useState<Session | null>(null);
  const [saves, setSaves] = useState<readonly BrowserWorldSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [damaged, setDamaged] = useState<readonly QuarantinedSave[]>([]);
  const [savesUnavailable, setSavesUnavailable] = useState(store === null);

  const refreshSaves = useCallback(async () => {
    if (!store) return;
    try {
      const listing = await store.list();
      setSaves(listing.saves);
      setDamaged(listing.damaged);
      setSavesUnavailable(false);
    } catch {
      setSavesUnavailable(true);
    }
  }, [store]);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const replayStarted = useRef(false);
  useEffect(() => {
    if (replaySetup === null || replayStarted.current) return;
    replayStarted.current = true;
    try {
      const game = createNewGameWorld(replaySetup);
      startPlaying(game.world, game.playerPersonId, replaySetup.seed, null);
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "That replay address could not be rebuilt.",
      );
    }
    // Runs once: startPlaying only sets state, and the guard above stops a
    // re-render from starting the same replay twice.
  }, [replaySetup]);

  // Autosave follows the world, never the other way round: a world is written
  // only after it has already changed here.
  //
  // Durability is the store's job, not this effect's. What used to be here was
  // a boolean ref: while one write was in flight the next world was skipped,
  // and because a ref does not re-render, nothing came back for it — a player
  // could act, be told it was saved, leave, and lose it. Handing the store the
  // newest world and letting it coalesce and retry removes the whole class,
  // rather than making the gate cleverer.
  useEffect(() => {
    if (!session || !store || session.saveId === null) return;
    const saveId = session.saveId;
    let watching = true;
    void store.autosave(session.world, saveId).then((result) => {
      if (!watching) return;
      if (result.status === "saved") setProblem(null);
      else if (result.status === "failed") setProblem(result.reason);
      else {
        // The slot is not this tab's any more: another tab deleted it, or
        // another tab holds it and writing would destroy their world. Neither
        // is retried and neither is hidden. The life stays on screen with no
        // slot, which is what brings "Keep this life" back, and the store is
        // told this shell has let the slot go so leaving is not refused over
        // something nothing could ever write.
        store.releaseSlot(saveId);
        setProblem(
          `${result.reason} This life is still here — keep it again to store it.`,
        );
        setSession((current) =>
          current === null || current.saveId !== saveId
            ? current
            : { ...current, saveId: null },
        );
      }
      return refreshSaves();
    });
    return () => {
      watching = false;
    };
  }, [session, store, refreshSaves]);

  // Closing the tab is a way of leaving, and it was the one nothing watched.
  useEffect(() => {
    if (!store) return;
    return guardUnsavedWork(store, window);
  }, [store]);

  function startPlaying(
    world: World,
    personId: EntityId,
    seed: string | null,
    saveId: EntityId | null,
  ) {
    setSession({
      world: openOrdinaryLife(world, personId),
      personId,
      unsavedSeed: seed,
      saveId,
    });
    setScreen({ kind: "playing" });
    setProblem(null);
  }

  async function keepThisWorld() {
    if (!session || !store) return;
    // A slot of its own, so keeping this life never lands on top of another
    // save of the same world.
    const saveId = session.saveId ?? store.newSaveId(session.world);
    try {
      const outcome = await store.save(session.world, saveId);
      if (outcome.status !== "saved") {
        // A refused slot is not a broken browser, and saying so would send the
        // player looking for the wrong problem.
        setProblem(outcome.reason);
        return;
      }
      setSession({ ...session, unsavedSeed: null, saveId });
      setNotice("Saved.");
      await refreshSaves();
    } catch {
      setProblem("This game could not be saved just now.");
    }
  }

  async function continueMostRecent() {
    if (!store) return;
    try {
      const recent = await store.mostRecent();
      if (!recent) {
        setProblem("There is nothing to continue yet.");
        return;
      }
      await loadSave(recent.saveId);
    } catch {
      setProblem("Saved games could not be read.");
    }
  }

  async function loadSave(saveId: EntityId) {
    if (!store) return;
    try {
      const world = await store.load(saveId);
      if (!world || world.control.kind !== "person") {
        setProblem("That saved game could not be opened.");
        return;
      }
      startPlaying(world, world.control.personId, null, saveId);
      setNotice(null);
    } catch {
      setProblem("That saved game could not be opened.");
    }
  }

  async function deleteSave(saveId: EntityId) {
    if (!store) return;
    try {
      await store.remove(saveId);
    } catch {
      // The save is still there. Saying so is the point: the store has put its
      // own fence back, so the slot still works, and the player is not left
      // believing something was removed when it was not.
      setProblem("That saved game could not be removed just now.");
      await refreshSaves();
      return;
    }
    if (session?.saveId === saveId) {
      // The life on screen no longer has a slot. Nothing further is written to
      // it, rather than quietly bringing the deleted save back — and the store
      // is told, so nothing stays owed to a slot that is gone.
      store.releaseSlot(saveId);
      setSession({
        ...session,
        saveId: null,
        unsavedSeed: session.unsavedSeed,
      });
    }
    await refreshSaves();
    setNotice("Deleted.");
  }

  /**
   * Leaving waits for whatever is still owed, and refuses to let go of a life
   * that did not reach disk.
   *
   * The old flush waited only for writes already enqueued and swallowed their
   * rejections, so leaving on top of an unwritten world looked exactly like
   * leaving on top of a saved one. Now the store drains what it owes and says
   * what it could not write; if something could not be written, the session
   * stays on screen so the player still has it.
   */
  async function leaveGame() {
    if (store) {
      const flushed = await store.flush();
      if (flushed.status === "unsaved") {
        setProblem(
          `${flushed.reason} This life is still here — leaving now would lose what is not saved.`,
        );
        await refreshSaves();
        return;
      }
    }
    setSession(null);
    setScreen({ kind: "title" });
    setNotice(null);
    await refreshSaves();
  }

  if (screen.kind === "title") {
    return (
      <TitleScreen
        saves={saves}
        savesUnavailable={savesUnavailable}
        problem={problem}
        onNewGame={() => {
          setProblem(null);
          if (replaySeed === null) {
            setSessionSeed(resolveSessionSeed("", window.crypto));
          }
          setScreen({ kind: "setup" });
        }}
        onContinue={() => void continueMostRecent()}
        onOpenSaves={() => setScreen({ kind: "saves" })}
        onOpenOptions={() => setScreen({ kind: "options" })}
      />
    );
  }

  if (screen.kind === "options") {
    return <OptionsScreen onBack={() => setScreen({ kind: "title" })} />;
  }

  function beginLife(setup: NewGameSetup) {
    try {
      const game = createNewGameWorld(setup);
      startPlaying(game.world, game.playerPersonId, setup.seed, null);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "That start did not work.",
      );
    }
  }

  if (screen.kind === "setup") {
    return (
      <SetupScreen
        seed={sessionSeed.seed}
        seedOrigin={sessionSeed.origin}
        onBack={() => setScreen({ kind: "title" })}
        onBegin={(setup) => {
          setProblem(null);
          // The calibration runs before the world is built, because its answers
          // are part of the setup the world is built from — not because the
          // world reads them. It never does: they go into the world's
          // non-diegetic corner and nowhere near a generator.
          if (questionnaireScreenFor(setup)) {
            setScreen({ kind: "questionnaire", setup });
            return;
          }
          beginLife(endQuestionnaireEarly(setup));
        }}
        problem={problem}
      />
    );
  }

  if (screen.kind === "questionnaire") {
    return (
      <QuestionnaireScreenView
        setup={screen.setup}
        onAnswer={(choiceId) => {
          const next = answerQuestionnaire(screen.setup, choiceId);
          if (questionnaireScreenFor(next)) {
            setScreen({ kind: "questionnaire", setup: next });
            return;
          }
          beginLife(next);
        }}
        onFinishEarly={() => beginLife(endQuestionnaireEarly(screen.setup))}
        onBack={() => setScreen({ kind: "setup" })}
      />
    );
  }

  if (screen.kind === "saves") {
    return (
      <SavesScreen
        saves={saves}
        damaged={damaged}
        savesUnavailable={savesUnavailable}
        notice={notice}
        onBack={() => setScreen({ kind: "title" })}
        onOpen={(saveId) => void loadSave(saveId)}
        onDelete={(saveId) => void deleteSave(saveId)}
      />
    );
  }

  if (!session) {
    setScreen({ kind: "title" });
    return null;
  }

  return (
    <PlayingScreen
      session={session}
      notice={notice}
      problem={problem}
      onWorldChange={(world) =>
        setSession((current) =>
          current
            ? // Opening is idempotent and gated on the character, so this is
              // how an ordinary week begins the moment it becomes theirs —
              // when a formative playthrough reaches eighteen — rather than
              // only at boot, which would leave a grown character with an
              // empty week until they reloaded.
              { ...current, world: openOrdinaryLife(world, current.personId) }
            : current,
        )
      }
      onKeep={() => void keepThisWorld()}
      onLeave={() => void leaveGame()}
      savesUnavailable={savesUnavailable}
    />
  );
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

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

/** A short, plain place context, built only from what the sources actually hold. */
function placeContextLines(place: LifePlace): readonly string[] {
  const lines: string[] = [];
  if (place.withinName) lines.push(place.withinName);
  if (place.formalName && place.formalName !== place.displayName) {
    lines.push(place.formalName);
  }
  // Capability-gated, never fabricated: the only civic fact the accepted data
  // carries is whether the game models a legislature you could later enter.
  lines.push(
    place.capabilities.legislativeScenarioKey
      ? "The game models this state's legislature, so political office is reachable here later."
      : "The game does not model a legislature here yet, so this is an everyday life for now.",
  );
  return lines;
}

function SetupScreen({
  seed,
  seedOrigin,
  onBack,
  onBegin,
  problem,
}: {
  readonly seed: string;
  readonly seedOrigin: "fresh" | "replay";
  readonly onBack: () => void;
  readonly onBegin: (setup: NewGameSetup) => void;
  readonly problem: string | null;
}) {
  const coverage = lifePlaceCoverage();
  const [placeQuery, setPlaceQuery] = useState("");
  /**
   * Nothing until somebody asks for something, and then the national corpus.
   *
   * With an empty query the list is empty, so nothing reads as a recommended
   * default. Once the player types, the search runs over the accepted national
   * place identity (PR #77) and returns a bounded page of matches — anywhere in
   * the country, found rather than offered.
   */
  const matchingPlaces = useMemo(
    () => lifePlaceSearch(placeQuery, 12),
    [placeQuery],
  );
  const [setup, setSetup] = useState<NewGameSetup>({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
  });
  const custom = setup.startKind === "custom";
  const steps: readonly CreatorStep[] = custom
    ? CUSTOM_CREATOR_STEPS
    : NORMAL_CREATOR_STEPS;

  /**
   * The step the player is on. It only moves forward on its own; the summaries
   * of finished steps move it back when one is reopened to change an answer.
   */
  const [current, setCurrent] = useState<CreatorStep>("route");
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
  const reopen = (step: CreatorStep) => setCurrent(step);

  const problems = newGameSetupProblems(setup);
  const place = lifePlaceByKey(setup.placeKey);
  const officeAvailable =
    place?.capabilities.legislativeScenarioKey !== null &&
    setup.startAge >= LEGISLATIVE_OFFICE_MINIMUM_AGE;
  const genderStated = setup.gender && setup.gender !== "unstated";
  // The compact summaries the finished steps collapse to.
  const summaryText: Partial<Record<CreatorStep, string>> = {
    route: custom ? "Custom start" : "Start a life",
    character: [
      [setup.givenName, setup.familyName].filter(Boolean).join(" ") ||
        "A name you'll be given",
      `age ${setup.startAge}`,
      genderStated ? GENDER_IDENTITY_LABELS[setup.gender!] : null,
    ]
      .filter(Boolean)
      .join(" · "),
    place: place ? place.displayName : "",
    background: custom
      ? [
          setup.household === "shares-a-home" ? "Shares a home" : "Lives alone",
          setup.startingLife === "legislative-office"
            ? "Legislative staff"
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
    <AmbientTableau>
      {() => (
        <main className="game-setup game-creator" data-testid="setup-screen">
          <h1>Your new life</h1>

          {/*
            Finished steps, collapsed. Each is a one-line summary the player can
            reopen; this is what keeps the whole active step inside the viewport
            instead of stacking every section into a scrolling column.
          */}
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
                <span className="creator-summary-value">
                  {summaryText[step]}
                </span>
                <span className="creator-summary-edit" aria-hidden="true">
                  Change
                </span>
              </button>
            ))}

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
                    setCurrent("character");
                  }}
                >
                  Start a life
                  <small>
                    You say who you are and where you're from. Everything else —
                    your family, your home, the years behind you — the game
                    builds when you begin.
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
                    Set the background yourself — who's at home, whether you
                    already work somewhere, how much of the early years to play.
                  </small>
                </button>
              </div>
            </section>
          ) : null}

          {isCurrent("character") ? (
            <section data-testid="creator-stage-character">
              <h2>Your character</h2>
              <div className="game-fields">
                <label>
                  First name
                  <input
                    type="text"
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
                <label>
                  Starting age
                  <input
                    type="number"
                    data-testid="start-age"
                    min={MINIMUM_START_AGE}
                    max={MAXIMUM_START_AGE}
                    value={setup.startAge}
                    onChange={(event) =>
                      setSetup((now) => ({
                        ...now,
                        startAge: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              <p
                className="game-hint"
                id="creator-name-hint"
                data-testid="creator-name-hint"
              >
                Leave a name blank and the game gives you one.
              </p>

              {/*
                Gender, asked rather than decided. Guessing it from the first
                name would be wrong: the name corpus carries no demographic
                attribute for anything to be guessed from. Normal Start exposes
                gender only (owner override) — pronouns derive silently from it
                and are never a player-facing control here.
              */}
              <fieldset className="game-fieldset" data-testid="gender-choices">
                <legend>Gender</legend>
                <div className="game-choices game-choices-inline">
                  {GENDER_IDENTITY_KEYS.filter((key) => key !== "unstated").map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        data-testid={`gender-${key}`}
                        aria-pressed={setup.gender === key}
                        className={
                          setup.gender === key ? "is-chosen" : undefined
                        }
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

              <button
                type="button"
                className="game-creator-next"
                data-testid="creator-continue-character"
                onClick={() => advanceTo("place")}
              >
                Next
              </button>
            </section>
          ) : null}

          {isCurrent("place") ? (
            <section data-testid="creator-stage-place">
              <h2>Where you're from</h2>
              <label className="game-search">
                Search places
                <input
                  type="search"
                  data-testid="place-search"
                  value={placeQuery}
                  placeholder="Type a state or a city"
                  onChange={(event) => setPlaceQuery(event.target.value)}
                />
              </label>
              {matchingPlaces.length > 0 ? (
                <div className="game-choices" data-testid="place-choices">
                  {matchingPlaces.map((candidate) => (
                    <button
                      key={candidate.key}
                      type="button"
                      className={
                        candidate.key === setup.placeKey
                          ? "is-chosen"
                          : undefined
                      }
                      onClick={() =>
                        setSetup((now) => ({
                          ...now,
                          placeKey: candidate.key,
                          startingLife:
                            candidate.capabilities.legislativeScenarioKey ===
                            null
                              ? "ordinary-life"
                              : now.startingLife,
                        }))
                      }
                    >
                      {candidate.displayName}
                      <small>{candidate.withinName ?? ""}</small>
                    </button>
                  ))}
                </div>
              ) : placeQuery.trim().length === 0 ? (
                <p className="game-note" data-testid="place-prompt">
                  Type where you're from. {coverage.playerNote}
                </p>
              ) : (
                <p className="game-note" data-testid="place-no-match">
                  Nothing here matches that yet. {coverage.playerNote}
                </p>
              )}
              {place ? (
                <div
                  className="creator-place-context"
                  data-testid="place-context"
                >
                  <p className="creator-place-name">{place.displayName}</p>
                  {placeContextLines(place).map((line) => (
                    <p key={line} className="game-hint">
                      {line}
                    </p>
                  ))}
                  <button
                    type="button"
                    className="game-creator-next"
                    data-testid="creator-continue-place"
                    onClick={() =>
                      advanceTo(custom ? "background" : "whoAreYou")
                    }
                  >
                    Next
                  </button>
                </div>
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
                    setup.depth === "play-formative-years"
                      ? "is-chosen"
                      : undefined
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
                    setup.startingLife === "ordinary-life"
                      ? "is-chosen"
                      : undefined
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
                      ? `${place.displayName} has no legislature you can work in yet.`
                      : setup.startAge < LEGISLATIVE_OFFICE_MINIMUM_AGE
                        ? `Available for characters ${LEGISLATIVE_OFFICE_MINIMUM_AGE} and older.`
                        : "Working for a state legislature."}
                  </small>
                </button>
              </div>

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
                    setup.household === "shares-a-home"
                      ? "is-chosen"
                      : undefined
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
                This is optional. A few questions help the game understand what
                matters to you, so the situations it puts in front of you land
                closer to home. The world remembers what you choose — some
                things fade, some echo back years later — but nothing here locks
                a path or decides who you become. You can skip it and let the
                game learn from how you actually play.
              </p>
              <div className="game-choices" data-testid="whoareyou-choices">
                <button
                  type="button"
                  data-testid="whoareyou-answer"
                  className={
                    setup.questionnaire !== "skipped" ? "is-chosen" : undefined
                  }
                  onClick={() => {
                    setSetup((now) => ({
                      ...now,
                      questionnaire: "short",
                      priors: [],
                    }));
                    advanceTo("begin");
                  }}
                >
                  Answer a Few Questions
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
                  Discover Who I Am Through Play
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
            <button
              type="button"
              data-testid="begin"
              disabled={problems.length > 0 || !onReady}
              onClick={() => onBegin(setup)}
            >
              Begin
            </button>
          </div>

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
              The address below carries the place, the age and any names you
              typed as well, so it rebuilds the same world.
            </p>
            <p>
              <code data-testid="setup-replay-link">
                {replayDescriptorUrl("", "/", setup)}
              </code>
            </p>
          </details>
        </main>
      )}
    </AmbientTableau>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The calibration.
 *
 * A situation and some ways of handling it. What is deliberately absent is
 * everything a quiz would have: no score, no summary at the end, and above all
 * no label. The game never tells a player what it has concluded about them,
 * because a game that does has stopped being able to be surprised by them.
 *
 * Two things left with this wave. The "1 of 26" progress line is gone, because
 * the deep path has no fixed length any more — it stops when it stops learning
 * — and a denominator promised one. What remains is a phase, which says that
 * this ends without saying when.
 *
 * And so has "I would rather not say". Declining twenty times in a row is a
 * worse experience than leaving, and the authority replaced it with the one
 * control that was always the honest exit: start the life now, keeping
 * whatever has been answered so far.
 */
const PHASE_LINE: Readonly<Record<QuestionnairePhase, string>> = {
  opening: "Somewhere to start",
  widening: "A little wider",
  closing: "Nearly there",
};

function QuestionnaireScreenView({
  setup,
  onAnswer,
  onFinishEarly,
  onBack,
}: {
  readonly setup: NewGameSetup;
  readonly onAnswer: (choiceId: string | null) => void;
  readonly onFinishEarly: () => void;
  readonly onBack: () => void;
}) {
  const screen = questionnaireScreenFor(setup);
  if (!screen) return null;
  const note = questionnaireContentNote();
  return (
    <AmbientTableau>
      {() => (
        <main
          className="game-setup game-creator"
          data-testid="questionnaire-screen"
        >
          <h1>Who are you?</h1>
          {/*
            What these questions actually are, said once and plainly: they are
            about the player, they orient what the game offers, and they decide
            nothing about who the character becomes.
          */}
          <p className="game-note" data-testid="questionnaire-framing">
            These are about you, not your character. They help the game
            understand how you decide, so it can put the right kind of thing in
            front of you. Nothing here locks a path, and you can begin whenever
            you like.
          </p>
          <p className="game-band" data-testid="questionnaire-progress">
            {PHASE_LINE[screen.phase]}
          </p>
          <p className="game-scene" data-testid="questionnaire-prompt">
            {screen.prompt}
          </p>
          <div className="game-choices" data-testid="questionnaire-options">
            {screen.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => onAnswer(option.key)}
              >
                {option.text}
              </button>
            ))}
          </div>
          <div className="game-setup-actions">
            <button type="button" onClick={onBack}>
              Back
            </button>
            <button
              type="button"
              data-testid="questionnaire-finish"
              onClick={onFinishEarly}
            >
              Begin life
            </button>
          </div>
          {note ? <p className="game-note">{note}</p> : null}
        </main>
      )}
    </AmbientTableau>
  );
}

/* -------------------------------------------------------------------------- */

function SavesScreen({
  saves,
  damaged,
  savesUnavailable,
  notice,
  onBack,
  onOpen,
  onDelete,
}: {
  readonly saves: readonly BrowserWorldSummary[];
  readonly damaged: readonly QuarantinedSave[];
  readonly savesUnavailable: boolean;
  readonly notice: string | null;
  readonly onBack: () => void;
  readonly onOpen: (saveId: EntityId) => void;
  readonly onDelete: (saveId: EntityId) => void;
}) {
  const [confirming, setConfirming] = useState<EntityId | null>(null);
  return (
    <main className="game-saves" data-testid="saves-screen">
      <h1>Saved games</h1>
      {savesUnavailable ? (
        <p className="game-note">
          This browser will not let the game store anything.
        </p>
      ) : null}
      {notice ? <p className="game-note">{notice}</p> : null}
      <ul>
        {saves.map((save) => (
          <li key={save.saveId} data-testid="save-entry">
            <div>
              <strong>{save.playerName}</strong>
              <span>
                {save.playerAge}
                {save.residence ? ` · ${save.residence.name}` : ""} ·{" "}
                {save.currentMoment.date}
              </span>
            </div>
            <div className="game-saves-actions">
              <button type="button" onClick={() => onOpen(save.saveId)}>
                Open
              </button>
              {confirming === save.saveId ? (
                <>
                  <button
                    type="button"
                    data-testid="confirm-delete"
                    onClick={() => {
                      onDelete(save.saveId);
                      setConfirming(null);
                    }}
                  >
                    Delete for good
                  </button>
                  <button type="button" onClick={() => setConfirming(null)}>
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="delete-save"
                  onClick={() => setConfirming(save.saveId)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {damaged.length > 0 ? (
        <section className="game-saves-damaged" data-testid="damaged-saves">
          <h2>Set aside</h2>
          <p className="game-note">
            These could not be opened. They are still here — nothing was thrown
            away — and the rest of your games are unaffected.
          </p>
          <ul>
            {damaged.map((entry, index) => (
              <li
                key={entry.saveId ?? `damaged-${index}`}
                data-testid="damaged-entry"
              >
                <span>{entry.reason}</span>
                {entry.mightBeReadableLater ? (
                  <span className="game-note">
                    A later version of the game may be able to open it, so it is
                    worth keeping for now.
                  </span>
                ) : null}
                {entry.saveId ? (
                  // The same two steps a healthy save gets. These are the ones
                  // the screen has just said may open in a later version and
                  // are worth keeping, so a single click was the weakest guard
                  // on the most fragile thing in the list.
                  confirming === entry.saveId ? (
                    <>
                      <button
                        type="button"
                        data-testid="confirm-delete-damaged"
                        onClick={() => {
                          onDelete(entry.saveId as EntityId);
                          setConfirming(null);
                        }}
                      >
                        Remove for good
                      </button>
                      <button type="button" onClick={() => setConfirming(null)}>
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid="delete-damaged"
                      onClick={() => setConfirming(entry.saveId as EntityId)}
                    >
                      Remove it
                    </button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function PlayingScreen({
  session,
  notice,
  problem,
  onWorldChange,
  onKeep,
  onLeave,
  savesUnavailable,
}: {
  readonly session: Session;
  readonly notice: string | null;
  readonly problem: string | null;
  readonly onWorldChange: (world: World) => void;
  readonly onKeep: () => void;
  readonly onLeave: () => void;
  readonly savesUnavailable: boolean;
}) {
  const capabilities = useMemo(
    () => resolvePlayerCapabilities(session.world),
    [session.world],
  );
  const [assignment, setAssignment] = useState<LegislativeAssignment | null>(
    null,
  );

  /**
   * Which secondary surface is open, and none to begin with.
   *
   * The default matters more than the mechanism: a life opens on its current
   * moment and nothing else, and everything the playtest saw stacked beside it
   * is one press away rather than already on the page.
   */
  const [open, setOpen] = useState<"day" | "people" | "work" | null>(null);

  /**
   * The generated family, explained before the first beat.
   *
   * A normal start writes the parents and the household rather than letting
   * the player author them, so the game owes an answer to "who are these
   * people" before it puts them in a scene — which is exactly what the first
   * playtest asked about Maya Pittman and never got.
   *
   * It shows on a life that has not been saved yet, which is a life that was
   * just created. A loaded save has been introduced already.
   */
  const introduction = useMemo(
    () => buildLifeIntroduction(session.world, session.personId),
    [session.world, session.personId],
  );
  const [introduced, setIntroduced] = useState(session.saveId !== null);

  const sceneId = useMemo(
    () => resolveLifeScene(session.world, session.personId).sceneId,
    [session.world, session.personId],
  );

  // The current moment, resolved here as well as inside the moment panel, so
  // the people it says are present can be stood in the room and listed on the
  // rail. It is a pure, memoized projection, so computing it twice costs
  // nothing and keeps the panel self-contained.
  const moment = useMemo(
    () => projectStoryMoment(session.world, session.personId),
    [session.world, session.personId],
  );

  const scenePeople = useMemo(
    () =>
      planLifeScenePeople(session.world, moment.scene.presentPeople, sceneId),
    [session.world, moment.scene.presentPeople, sceneId],
  );

  const elsewhere = useMemo(() => {
    const entries: { key: "day" | "people" | "work"; label: string }[] = [];
    if (!capabilities.formativeYears) {
      entries.push({ key: "day", label: "The day" });
    }
    entries.push({ key: "people", label: "People" });
    if (capabilities.legislation && capabilities.legislativeScenarioKey) {
      entries.push({ key: "work", label: "Work" });
    }
    return entries;
  }, [
    capabilities.formativeYears,
    capabilities.legislation,
    capabilities.legislativeScenarioKey,
  ]);

  /**
   * Opening the bill puts it in this world, and the world comes back changed.
   * Doing it here rather than inside the workspace is the point: there is one
   * world, this screen owns it, and the surface below is handed it.
   */
  function openTheBill() {
    if (assignment) {
      setAssignment(null);
      return;
    }
    const scenarioKey = capabilities.legislativeScenarioKey;
    const jurisdictionId = capabilities.legislativeJurisdictionId;
    if (!scenarioKey || !jurisdictionId) return;
    const opened = openLegislativeWork(session.world, {
      scenarioKey,
      playerPersonId: session.personId,
      jurisdictionId,
    });
    setAssignment(opened.assignment);
    if (opened.world !== session.world) onWorldChange(opened.world);
  }

  return (
    <main
      className="life-shell"
      data-testid="play-screen"
      data-scene-id={sceneId ?? ""}
    >
      {/*
        THE ROOM IS THE SURFACE.

        The fourth playtest reported being handed a large white card over
        wallpaper, with no family in the room and People reduced to a button.
        The repair is structural: the scene — with the generated household
        standing on its own anchors — is the whole surface, the current moment
        is a compact panel over it, the household is a persistent rail on the
        right, and everything else is a small HUD in the corner.
      */}
      <SceneBackdrop sceneId={sceneId} people={scenePeople}>
        {!introduced && introduction ? (
          <section className="life-exposition" data-testid="life-introduction">
            <p className="life-exposition-kicker">Where this starts</p>
            {introduction.sentences.map((sentence) => (
              <p key={sentence} className="life-exposition-line">
                {sentence}
              </p>
            ))}
            <button
              type="button"
              className="ui-action ui-action--primary"
              data-testid="introduction-continue"
              onClick={() => setIntroduced(true)}
            >
              Step inside
            </button>
          </section>
        ) : (
          <StoryView session={session} onWorldChange={onWorldChange} />
        )}
      </SceneBackdrop>

      <LifePeopleRail
        moment={moment}
        household={introduction?.household ?? []}
        onOpenPerson={() => setOpen("people")}
      />

      <LifeHud
        world={session.world}
        personId={session.personId}
        age={moment.age}
        dateLabel={moment.dateLabel}
        placeName={moment.placeName}
        elsewhere={elsewhere}
        open={open}
        onToggle={(key) => setOpen((current) => (current === key ? null : key))}
        canSave={session.saveId === null && !savesUnavailable}
        onKeep={onKeep}
        onLeave={onLeave}
        unsaved={session.unsavedSeed !== null}
        notice={notice}
        problem={problem}
      />

      {open === "day" ? (
        <LifeOverlay
          title="The day"
          testid="day-overlay"
          onClose={() => setOpen(null)}
        >
          <OrdinaryDayView session={session} onWorldChange={onWorldChange} />
        </LifeOverlay>
      ) : null}

      {open === "people" ? (
        <LifeOverlay
          title="People"
          testid="people-overlay"
          onClose={() => setOpen(null)}
        >
          <PlayerConversations
            world={session.world}
            personId={session.personId}
            onWorldChange={onWorldChange}
          />
        </LifeOverlay>
      ) : null}

      {open === "work" &&
      capabilities.legislation &&
      capabilities.legislativeScenarioKey ? (
        <LifeOverlay
          title="The office"
          testid="office-section"
          onClose={() => setOpen(null)}
        >
          <p>
            {capabilities.person.givenName} works for the{" "}
            {capabilities.workPlace?.displayName} legislature, so what is in
            front of the chamber is in front of them too.
          </p>
          <button
            type="button"
            className="ui-action"
            data-testid="open-legislation"
            onClick={openTheBill}
          >
            {assignment ? "Close the bill" : "Look at what is moving"}
          </button>
          {assignment ? (
            <LegislationWorkspace
              world={session.world}
              assignment={assignment}
              onWorldChange={onWorldChange}
            />
          ) : null}
        </LifeOverlay>
      ) : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The persistent People rail.
 *
 * Who is in this moment and who has been through the life recently, kept on the
 * right of the room rather than hidden behind a button. Present people are
 * pinned by default and cannot be removed while they are in the room; recurring
 * people can be pinned to keep them, or left to fall off as the life moves on.
 * Selecting anybody opens the conversation surface, which is where a
 * relationship is actually acted on.
 */
function LifePeopleRail({
  moment,
  household,
  onOpenPerson,
}: {
  readonly moment: StoryMoment;
  readonly household: readonly IntroducedPerson[];
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState<readonly EntityId[]>([]);

  type RailPerson = {
    readonly personId: EntityId;
    readonly name: string;
    readonly relationship: string | null;
    readonly present: boolean;
  };
  const people: RailPerson[] = [];
  const seen = new Set<EntityId>();
  // Who is literally in the room this moment comes first and is pinned.
  for (const person of moment.scene.presentPeople) {
    seen.add(person.personId);
    people.push({
      personId: person.personId,
      name: person.name,
      relationship: person.relationship,
      present: true,
    });
  }
  // The generated household is the life's standing cast, so it is always here
  // even when nobody is in the current scene — the family the fourth play said
  // it never saw.
  for (const member of household) {
    if (seen.has(member.personId)) continue;
    seen.add(member.personId);
    people.push({
      personId: member.personId,
      name: member.introduction.split(", ")[0] ?? member.introduction,
      relationship: member.relationship,
      present: false,
    });
  }
  // Then anyone else this life keeps coming back to.
  for (const person of moment.people) {
    if (seen.has(person.personId)) continue;
    seen.add(person.personId);
    people.push({
      personId: person.personId,
      name: person.name,
      relationship: null,
      present: false,
    });
  }

  if (people.length === 0) return null;

  return (
    <aside
      className={`life-rail${collapsed ? " life-rail--collapsed" : ""}`}
      data-testid="people-rail"
      aria-label="People in this life"
    >
      <button
        type="button"
        className="life-rail-toggle"
        data-testid="people-rail-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span className="life-rail-title">People</span>
        <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed ? (
        <ul className="life-rail-list">
          {people.map((person) => {
            const isPinned = person.present || pinned.includes(person.personId);
            return (
              <li key={person.personId} className="life-rail-item">
                <button
                  type="button"
                  className="life-pin"
                  data-testid={`rail-person-${person.personId}`}
                  data-present={person.present ? "true" : "false"}
                  onClick={() => onOpenPerson(person.personId)}
                >
                  <span className="life-pin-mark" aria-hidden="true">
                    {railInitials(person.name)}
                  </span>
                  <span className="life-pin-copy">
                    <strong>{person.name}</strong>
                    {person.relationship ? (
                      <small>{person.relationship}</small>
                    ) : person.present ? (
                      <small>here now</small>
                    ) : null}
                  </span>
                </button>
                {!person.present ? (
                  <button
                    type="button"
                    className="life-pin-hold"
                    data-testid={`rail-pin-${person.personId}`}
                    aria-pressed={isPinned}
                    aria-label={isPinned ? "Unpin" : "Pin"}
                    onClick={() =>
                      setPinned((current) =>
                        current.includes(person.personId)
                          ? current.filter((id) => id !== person.personId)
                          : [...current, person.personId],
                      )
                    }
                  >
                    {isPinned ? "★" : "☆"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}

function railInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/* -------------------------------------------------------------------------- */

/**
 * The compact HUD: where and when the life is, and the way to everything else.
 *
 * A small translucent plaque in the corner rather than a header across the top,
 * so the room keeps the frame. It carries the date and place, the player's own
 * name, and the row of secondary surfaces — the day, the people, the office —
 * plus saving and leaving, none of them competing with the moment.
 */
function LifeHud({
  world,
  personId,
  age,
  dateLabel,
  placeName,
  elsewhere,
  open,
  onToggle,
  canSave,
  onKeep,
  onLeave,
  unsaved,
  notice,
  problem,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly age: number;
  readonly dateLabel: string;
  readonly placeName: string | null;
  readonly elsewhere: readonly {
    key: "day" | "people" | "work";
    label: string;
  }[];
  readonly open: "day" | "people" | "work" | null;
  readonly onToggle: (key: "day" | "people" | "work") => void;
  readonly canSave: boolean;
  readonly onKeep: () => void;
  readonly onLeave: () => void;
  readonly unsaved: boolean;
  readonly notice: string | null;
  readonly problem: string | null;
}) {
  return (
    <div className="life-hud" data-testid="life-hud">
      {notice ? (
        <p className="life-hud-note" role="status">
          {notice}
        </p>
      ) : null}
      {problem ? (
        <p className="life-hud-note life-hud-note--problem" role="status">
          {problem}
        </p>
      ) : null}
      <div className="life-hud-plaque civic-glass">
        <PersonPortrait
          world={world}
          personId={personId}
          size="small"
          note={`${age}${placeName ? ` · ${placeName}` : ""}`}
        />
        <div className="life-hud-clock">
          <strong>{dateLabel}</strong>
        </div>
      </div>
      <nav className="life-hud-nav" aria-label="Elsewhere in this life">
        {elsewhere.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="ui-action ui-action--rail"
            data-testid={`elsewhere-${entry.key}`}
            aria-pressed={open === entry.key}
            onClick={() => onToggle(entry.key)}
          >
            {entry.label}
          </button>
        ))}
        {canSave ? (
          <button
            type="button"
            className="ui-action ui-action--rail"
            data-testid="keep-world"
            onClick={onKeep}
          >
            Save this life
          </button>
        ) : null}
        <button
          type="button"
          className="ui-action ui-action--subtle"
          data-testid="leave-game"
          onClick={onLeave}
        >
          Main menu
        </button>
      </nav>
      {unsaved ? (
        <p className="life-hud-note" data-testid="unsaved-note">
          This life has not been saved yet.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A secondary surface opened over the room — the day, the people, the office.
 *
 * The fourth and fifth plays reported these as white takeovers with no obvious
 * way out. This frames them as a game panel over a dimmed room, with a titled
 * header and a clear close: an X, the Escape key, and a click on the room
 * behind. Closing returns to exactly the moment underneath; nothing is rebuilt.
 */
function LifeOverlay({
  title,
  testid,
  onClose,
  children,
}: {
  readonly title: string;
  readonly testid: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="life-overlay-scrim"
      data-testid={`${testid}-scrim`}
      onClick={onClose}
    >
      <section
        className="life-overlay"
        data-testid={testid}
        role="dialog"
        aria-label={title}
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="life-overlay-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="ui-icon-button"
            data-testid={`${testid}-close`}
            aria-label="Close"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </header>
        <div className="life-overlay-body">{children}</div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One life, on one surface.
 *
 * This replaced two views that each drew their own card — the growing-up years
 * and the adult bank — and drew them side by side with nothing between. What a
 * player got was a prompt, a click, a jump in the date, and an unrelated
 * prompt. The connective narration above the scene is the repair: it says how
 * the life got from the last moment to this one, and it is composed from the
 * record rather than written for the occasion.
 *
 * The scene below it may be a composed episode beat, a formative situation or
 * an adult one. Which is not signalled: they are the same kind of thing to a
 * player, and labelling them would tell somebody which moments the game thinks
 * are important.
 *
 * What this life is carrying is shown as sentences about people and problems,
 * never as a list of threads. There is no count, no standing, no family name
 * and no machinery on this screen.
 */
function StoryView({
  session,
  onWorldChange,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
}) {
  const [journalOpen, setJournalOpen] = useState(false);
  const moment = useMemo(
    () => projectStoryMoment(session.world, session.personId),
    [session.world, session.personId],
  );

  return (
    <section className="game-story life-moment" data-testid="story-section">
      {/*
        Where and when, before anything happens in it.
        The play surface used to open straight into narration, so the page had
        no anchor: a reader met a paragraph about somebody, then a paragraph
        about somebody else, with nothing saying whose life this was or what
        year it had got to. This is semantic and textual only — the scene art
        that will sit around it belongs to #86, and nothing here assumes a
        layout it has not shipped.
      */}
      <header
        className="game-scene-header life-moment-head"
        data-testid="story-where"
      >
        <h2 className="life-identity" data-testid="story-who">
          <span className="life-identity-name">{moment.personName}</span>
          <span className="life-identity-age">{moment.age}</span>
        </h2>
        <p className="game-band" data-testid="story-when">
          {moment.dateLabel}
          {moment.placeName ? ` · ${moment.placeName}` : ""}
        </p>
      </header>

      {moment.connective.sentences.length > 0 ? (
        <p className="game-passage" data-testid="story-passage">
          {moment.connective.sentences.join(" ")}
        </p>
      ) : null}

      {moment.scene.prose.length > 0 ? (
        <p className="game-scene" data-testid="story-prose">
          {moment.scene.prose}
        </p>
      ) : null}

      {/*
        Who is here, and who they are to you.
        This said "Maya Pittman is there." to a ten-year-old whose guardian
        Maya was, leaving the player to guess a relationship off a shared
        surname. The relation is read from canonical records — the authority
        record, the kinship record, the school register — and when no record
        establishes one, only the name is shown.
      */}
      {moment.scene.presentPeople.length > 0 ? (
        <p className="game-note" data-testid="story-people">
          {moment.scene.presentPeople
            .map((person) => person.introduction)
            .join(" and ")}{" "}
          {moment.scene.presentPeople.length === 1 ? "is" : "are"} here.
        </p>
      ) : null}

      <h3 className="game-choices-heading" data-testid="story-choices-heading">
        What do you do?
      </h3>
      <div className="game-choices life-choices" data-testid="story-options">
        {moment.scene.options.map((option) => (
          <button
            key={option.key}
            type="button"
            className="ui-action ui-action--choice"
            onClick={() =>
              onWorldChange(
                chooseStoryOption(session.world, {
                  personId: session.personId,
                  scene: moment.scene,
                  optionKey: option.key,
                }),
              )
            }
          >
            {option.label}
            <small>{option.description}</small>
          </button>
        ))}
        {moment.scene.kind === "ordinary-stretch" ? null : (
          <button
            type="button"
            className="ui-action ui-action--choice ui-action--quiet"
            data-testid="story-let-time-pass"
            onClick={() =>
              onWorldChange(letStoryTimePass(session.world, session.personId))
            }
          >
            {moment.formativeYears ? "Let the year run on" : "Let time pass"}
            <small>Come back to it when something needs you.</small>
          </button>
        )}
      </div>

      {moment.openThreads.length > 0 ? (
        <ul className="game-pending" data-testid="story-open">
          {moment.openThreads.map((thread) => (
            <li key={thread.threadKey}>{thread.sentence}</li>
          ))}
        </ul>
      ) : null}

      {/*
        The record, behind a control rather than poured down the screen.
        It used to be an always-visible "WHAT YOU REMEMBER" list that grew with
        every beat until it was most of the page, which is a debug log with a
        friendly heading. Nothing underneath changed; what changed is that a
        player now opens it when they want it.
      */}
      <button
        type="button"
        className="game-journal-toggle"
        data-testid="open-journal"
        aria-expanded={journalOpen}
        onClick={() => setJournalOpen((open) => !open)}
      >
        {journalOpen
          ? "Close the journal"
          : "Open the journal — everything that has happened"}
      </button>
      {journalOpen ? (
        <JournalView session={session} onClose={() => setJournalOpen(false)} />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The journal.
 *
 * A deliberate screen rather than a wall of logs, in three parts: what has
 * happened, who is in this life, and what is still open. All three are read
 * from the same canonical records the play surface reads; nothing is stored
 * twice.
 */
function JournalView({
  session,
  onClose,
}: {
  readonly session: Session;
  readonly onClose: () => void;
}) {
  const chapters = useMemo(
    () => projectLifeRecord(session.world, session.personId),
    [session.world, session.personId],
  );
  return (
    <div className="game-journal" data-testid="journal">
      <h2>{chapters.personName}</h2>
      <p className="game-note">{chapters.summary}</p>

      <h3>What has happened</h3>
      {chapters.chapters.length === 0 ? (
        <p className="game-note" data-testid="journal-empty">
          Nothing has been written down yet. It will fill up as the life goes
          on.
        </p>
      ) : (
        <ol data-testid="journal-entries">
          {chapters.chapters.map((chapter) => (
            <li key={chapter.key}>
              <strong>{chapter.heading}</strong>
              <ul>
                {chapter.entries.map((entry) => (
                  <li key={entry.key}>{entry.sentence}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {chapters.people.length > 0 ? (
        <>
          <h3>People</h3>
          <ul data-testid="journal-people">
            {chapters.people.map((person) => (
              <li key={person.personId}>{person.sentence}</li>
            ))}
          </ul>
        </>
      ) : null}

      {chapters.open.length > 0 ? (
        <>
          <h3>Still open</h3>
          <ul data-testid="journal-open">
            {chapters.open.map((entry) => (
              <li key={entry.key}>{entry.sentence}</li>
            ))}
          </ul>
        </>
      ) : null}

      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Options.
 *
 * Present because the main menu names it and a menu entry that goes nowhere is
 * worse than one that says what it has. What it has today is the accessibility
 * setting the title art actually honours and an honest note about the rest.
 */
function OptionsScreen({ onBack }: { readonly onBack: () => void }) {
  return (
    <main className="game-setup" data-testid="options-screen">
      <h1>Options</h1>
      <p className="game-note">
        Motion in the game follows your system&rsquo;s reduced-motion setting,
        so nothing here has to be switched on to make it stop.
      </p>
      <p className="game-note">
        There is not much else to set yet. As the game grows the settings it
        actually needs will appear here rather than being invented in advance.
      </p>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

function OrdinaryDayView({
  session,
  onWorldChange,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
}) {
  const day = useMemo(
    () => projectOrdinaryDay(session.world, session.personId),
    [session.world, session.personId],
  );

  return (
    <section className="game-day" data-testid="ordinary-section">
      <p className="game-band" data-testid="day-date">
        {day.dateLabel} · {day.timeLabel}
      </p>
      <p className="game-scene" data-testid="day-opening">
        {day.opening}
      </p>
      {day.pending.length > 0 ? (
        <ul className="game-pending" data-testid="day-pending">
          {day.pending.map((thing) => (
            <li key={thing.key}>{thing.sentence}</li>
          ))}
        </ul>
      ) : null}
      <div className="game-choices">
        <button
          type="button"
          data-testid="pass-day"
          onClick={() => onWorldChange(passOrdinaryDays(session.world))}
        >
          Get on with the day
          <small>Move to tomorrow.</small>
        </button>
      </div>
    </section>
  );
}
