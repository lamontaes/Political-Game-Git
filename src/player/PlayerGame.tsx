import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  questionnairePathNote,
  questionnaireScreenFor,
} from "../presentation/setup-questionnaire-flow";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import {
  readReplaySeed,
  resolveSessionSeed,
} from "../presentation/session-seed";
import {
  readReplaySetup,
  replayDescriptorUrl,
} from "../presentation/new-game-identity";
import { lifePlaceCoverage, lifePlaces } from "../simulation";
import type { EntityId, QuestionnairePhase, World } from "../simulation";
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

/**
 * The main menu.
 *
 * Our Civic Duty, and no tagline. Five controls, in the order the authority
 * names them.
 *
 * Quit is present and disabled, which is the honest state rather than a
 * missing button or a lie. There is no application shell here to quit, and the
 * copy beside it says what would have to exist for it to work without ever
 * mentioning a browser to a player.
 */
function TitleScreen({
  saves,
  savesUnavailable,
  problem,
  onNewGame,
  onContinue,
  onOpenSaves,
  onOpenOptions,
}: {
  readonly saves: readonly BrowserWorldSummary[];
  readonly savesUnavailable: boolean;
  readonly problem: string | null;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onOpenSaves: () => void;
  readonly onOpenOptions: () => void;
}) {
  const recent = saves[0];
  return (
    <main className="game-title" data-testid="title-screen">
      <h1>Our Civic Duty</h1>
      <div className="game-title-actions">
        <button type="button" data-testid="new-game" onClick={onNewGame}>
          New Game
        </button>
        <button
          type="button"
          data-testid="continue"
          onClick={onContinue}
          disabled={!recent}
        >
          Continue
          {recent ? (
            <small>
              {recent.playerName}, {recent.playerAge}
              {recent.residence ? ` · ${recent.residence.name}` : ""}
            </small>
          ) : null}
        </button>
        <button
          type="button"
          data-testid="open-saves"
          onClick={onOpenSaves}
          disabled={saves.length === 0}
        >
          Saved Games
          {saves.length > 0 ? <small>{saves.length} saved</small> : null}
        </button>
        <button
          type="button"
          data-testid="open-options"
          onClick={onOpenOptions}
        >
          Options
        </button>
        <button type="button" data-testid="quit" disabled>
          Quit
          <small>Not available in this build.</small>
        </button>
      </div>
      {savesUnavailable ? (
        <p className="game-note">
          Games cannot be stored here, so a life played now will not still be
          here later.
        </p>
      ) : null}
      {problem ? <p className="game-problem">{problem}</p> : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

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
  const places = lifePlaces();
  const coverage = lifePlaceCoverage();
  const [placeQuery, setPlaceQuery] = useState("");
  const matchingPlaces = useMemo(() => {
    const needle = placeQuery.trim().toLowerCase();
    if (needle.length === 0) return places;
    return places.filter((candidate) =>
      [
        candidate.displayName,
        candidate.withinName ?? "",
        // The formal jurisdiction name is searchable even though it is not
        // shown: somebody who types the name on their tax bill should find
        // the place they live.
        candidate.formalName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [places, placeQuery]);
  const [setup, setSetup] = useState<NewGameSetup>({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
  });
  const problems = newGameSetupProblems(setup);
  const place = places.find((candidate) => candidate.key === setup.placeKey);
  const officeAvailable =
    place?.capabilities.legislativeScenarioKey !== null &&
    setup.startAge >= LEGISLATIVE_OFFICE_MINIMUM_AGE;

  return (
    <main className="game-setup" data-testid="setup-screen">
      <h1>A new life</h1>

      <section>
        <h2>Choose a starting place</h2>
        {/*
          The Start Anywhere surface, as far as the accepted data honestly
          reaches. Searching and browsing is the interaction the feature will
          keep once a national corpus lands: what changes then is how many rows
          the provider returns, not this screen. Filtering a list of four is
          not much use today and is exactly the point — the shape is here, so
          the corpus is a data change rather than a redesign.
        */}
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
        <div className="game-choices" data-testid="place-choices">
          {matchingPlaces.map((candidate) => (
            <button
              key={candidate.key}
              type="button"
              className={
                candidate.key === setup.placeKey ? "is-chosen" : undefined
              }
              onClick={() =>
                setSetup((current) => ({
                  ...current,
                  placeKey: candidate.key,
                  startingLife:
                    candidate.capabilities.legislativeScenarioKey === null
                      ? "ordinary-life"
                      : current.startingLife,
                }))
              }
            >
              {candidate.displayName}
              <small>
                {candidate.withinName ? `${candidate.withinName} · ` : ""}
                {candidate.capabilities.legislativeScenarioKey
                  ? "A legislature you can work in"
                  : "Everyday life only, for now"}
              </small>
            </button>
          ))}
        </div>
        {matchingPlaces.length === 0 ? (
          <p className="game-note" data-testid="place-no-match">
            Nothing here matches that yet. {coverage.playerNote}
          </p>
        ) : (
          <p className="game-note" data-testid="place-coverage">
            These are the places a life can begin in today.{" "}
            {coverage.playerNote}
          </p>
        )}
      </section>

      <section>
        <h2>Your character</h2>
        <div className="game-fields">
          <label>
            First name
            <input
              type="text"
              value={setup.givenName ?? ""}
              placeholder="Leave blank to be given one"
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
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
              placeholder="Leave blank to be given one"
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
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
                setSetup((current) => ({
                  ...current,
                  startAge: Number(event.target.value),
                }))
              }
            />
          </label>
        </div>
      </section>

      <section>
        <h2>How you want to begin</h2>
        <div className="game-choices">
          <button
            type="button"
            className={
              setup.depth === "play-formative-years" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
                depth: "play-formative-years",
              }))
            }
          >
            Start in childhood
            <small>
              {setup.startAge < 18
                ? "Shape the early years yourself, one at a time."
                : "Only for a character under eighteen."}
            </small>
          </button>
          <button
            type="button"
            className={
              setup.depth === "summarize-earlier-life" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
                depth: "summarize-earlier-life",
              }))
            }
          >
            Begin later
            <small>The early years are already in the past.</small>
          </button>
        </div>
      </section>

      <section>
        <h2>Your starting path</h2>
        <div className="game-choices">
          <button
            type="button"
            className={
              setup.startingLife === "ordinary-life" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
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
              setSetup((current) => ({
                ...current,
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
      </section>

      <section>
        <h2>Who you live with</h2>
        <div className="game-choices" data-testid="household-choices">
          <button
            type="button"
            data-testid="lives-alone"
            className={
              setup.household === "lives-alone" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({ ...current, household: "lives-alone" }))
            }
          >
            Nobody
            <small>The character lives on their own.</small>
          </button>
          <button
            type="button"
            data-testid="shares-a-home"
            className={
              setup.household === "shares-a-home" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
                household: "shares-a-home",
              }))
            }
          >
            Somebody else
            <small>One other adult shares the household.</small>
          </button>
        </div>
        <p className="game-note">
          The game has no way to know this, so it asks rather than deciding. It
          matters because a week has to be carried by somebody.
        </p>
      </section>

      <section>
        <h2>Before the story begins</h2>
        <div className="game-choices" data-testid="calibration-choices">
          <button
            type="button"
            data-testid="calibration-short"
            className={
              setup.questionnaire === "short" ? "is-chosen" : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
                questionnaire: "short",
                priors: [],
              }))
            }
          >
            A short set
            <small>{questionnairePathNote("short")}</small>
          </button>
          <button
            type="button"
            data-testid="calibration-deep"
            className={setup.questionnaire === "deep" ? "is-chosen" : undefined}
            onClick={() =>
              setSetup((current) => ({
                ...current,
                questionnaire: "deep",
                priors: [],
              }))
            }
          >
            Full calibration
            <small>{questionnairePathNote("deep")}</small>
          </button>
          <button
            type="button"
            data-testid="calibration-skip"
            className={
              (setup.questionnaire ?? "skipped") === "skipped"
                ? "is-chosen"
                : undefined
            }
            onClick={() =>
              setSetup((current) => ({
                ...current,
                questionnaire: "skipped",
                priors: [],
              }))
            }
          >
            Start immediately
            <small>{questionnairePathNote("skipped")}</small>
          </button>
        </div>
        <p className="game-note" data-testid="calibration-note">
          These are situations, not a quiz. There are no right answers, and
          nothing you pick here becomes part of your character&rsquo;s history.
          What you actually do once the life starts counts for a great deal more
          than what you say now.
        </p>
      </section>

      {problems.length > 0 ? (
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
          disabled={problems.length > 0}
          onClick={() => onBegin(setup)}
        >
          Begin
        </button>
      </div>

      {/*
        Reproducibility, moved off the setup surface proper.
        A raw seed and a replay address are development tools, and the human
        playtest read them on the New Game screen as the game showing its
        working. They stay reachable — a bug report is worth much less without
        them — behind a collapsed Advanced disclosure, which is where the
        authority put them.
      */}
      <details className="game-dev" data-testid="setup-advanced">
        <summary>Advanced &mdash; reproducing this world</summary>
        <p>
          This world is generated from{" "}
          <code data-testid="setup-seed">{seed}</code>
          {seedOrigin === "replay"
            ? ", which was supplied to reproduce an earlier one."
            : ", drawn fresh for this session."}{" "}
          The seed on its own is not enough to rebuild it: the place, the age,
          how much of the earlier life is played and any names you typed all
          change what gets built. This address carries all of them.
        </p>
        <p>
          <code data-testid="setup-replay-link">
            {replayDescriptorUrl("", "/", setup)}
          </code>
        </p>
      </details>
    </main>
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
    <main className="game-setup" data-testid="questionnaire-screen">
      <h1>Before the story begins</h1>
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
    <main className="game-play" data-testid="play-screen">
      <header className="game-play-header">
        <PersonPortrait
          world={session.world}
          personId={session.personId}
          size="small"
          note={`${capabilities.age}${
            capabilities.place ? ` · ${capabilities.place.displayName}` : ""
          }`}
        />
        <div className="game-play-actions">
          {session.saveId === null && !savesUnavailable ? (
            <button type="button" data-testid="keep-world" onClick={onKeep}>
              Save this life
            </button>
          ) : null}
          <button type="button" data-testid="leave-game" onClick={onLeave}>
            Main menu
          </button>
        </div>
      </header>

      {session.unsavedSeed !== null ? (
        <p className="game-note" data-testid="unsaved-note">
          This life has not been saved yet.
        </p>
      ) : null}
      {notice ? <p className="game-note">{notice}</p> : null}
      {problem ? <p className="game-problem">{problem}</p> : null}

      <StoryView session={session} onWorldChange={onWorldChange} />
      {capabilities.formativeYears ? null : (
        <OrdinaryDayView session={session} onWorldChange={onWorldChange} />
      )}

      {capabilities.legislation && capabilities.legislativeScenarioKey ? (
        <section className="game-office" data-testid="office-section">
          <h2>The office</h2>
          <p>
            {capabilities.person.givenName} works for the{" "}
            {capabilities.workPlace?.displayName} legislature, so what is in
            front of the chamber is in front of them too.
          </p>
          <button
            type="button"
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
        </section>
      ) : null}
    </main>
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
    <section className="game-story" data-testid="story-section">
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

      {moment.scene.withPeople.length > 0 ? (
        <p className="game-note" data-testid="story-people">
          {moment.scene.withPeople.join(" and ")}{" "}
          {moment.scene.withPeople.length === 1 ? "is" : "are"} there.
        </p>
      ) : null}

      <div className="game-choices" data-testid="story-options">
        {moment.scene.options.map((option) => (
          <button
            key={option.key}
            type="button"
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
        onClick={() => setJournalOpen((open) => !open)}
      >
        {journalOpen ? "Close the journal" : "Journal"}
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
      {/*
        Every conversation this life can have, not merely the one at home. Which
        of them appear is decided by the world rather than by this screen.
      */}
      <PlayerConversations
        world={session.world}
        personId={session.personId}
        onWorldChange={onWorldChange}
      />
    </section>
  );
}
