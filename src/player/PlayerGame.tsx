import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BrowserSaveStore,
  type BrowserWorldSummary,
  type QuarantinedSave,
} from "../presentation/browser-world-repository";
import {
  chooseFormativeOption,
  letTimePass,
  projectFormativeYears,
} from "../presentation/formative-play";
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
  householdConversationRoom,
  openOrdinaryLife,
  passOrdinaryDays,
  projectOrdinaryDay,
} from "../presentation/ordinary-life";
import {
  availableConversationIntents,
  commitConversationTurn,
  conversationTopicLabel,
  createConversationSessionDescriptor,
  describeConversationBriefingContext,
  openingConversationBeat,
} from "../presentation/run-b-conversation";
import { createHouseholdObligationProgress } from "../presentation/run-b-conversation-progress";
import {
  conversationProgressFromHistory,
  recordedConversationIntents,
} from "../presentation/conversation-continuity";
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
import type { EntityId, World } from "../simulation";
import {
  openLegislativeWork,
  type LegislativeAssignment,
} from "../presentation/legislation-world";
import { LegislationWorkspace } from "./LegislationWorkspace";
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
  | { readonly kind: "saves" }
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
  const writing = useRef(false);

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
  // only after it has already changed here. What counts as already written is
  // the store's acknowledgement, not a hope recorded before the write — a
  // failed save used to move that marker anyway, so the retry never came.
  useEffect(() => {
    if (!session || !store || session.saveId === null) return;
    const saveId = session.saveId;
    if (store.acknowledgedSequence(saveId) === session.world.actionSequence) {
      return;
    }
    if (writing.current) return;
    writing.current = true;
    void store
      .save(session.world, saveId)
      .then((outcome) => {
        if (outcome.status === "saved") setProblem(null);
        return refreshSaves();
      })
      .catch(() => setProblem("This game could not be saved just now."))
      .finally(() => {
        writing.current = false;
      });
  }, [session, store, refreshSaves]);

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
        setProblem("This game could not be saved just now.");
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
    await store.remove(saveId);
    if (session?.saveId === saveId) {
      // The life on screen no longer has a slot. Nothing further is written to
      // it, rather than quietly bringing the deleted save back.
      setSession({
        ...session,
        saveId: null,
        unsavedSeed: session.unsavedSeed,
      });
    }
    await refreshSaves();
    setNotice("Deleted.");
  }

  /** Leaving waits for whatever is still being written before it lets go. */
  async function leaveGame() {
    if (store) await store.flush();
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
      />
    );
  }

  if (screen.kind === "setup") {
    return (
      <SetupScreen
        seed={sessionSeed.seed}
        seedOrigin={sessionSeed.origin}
        onBack={() => setScreen({ kind: "title" })}
        onBegin={(setup) => {
          try {
            const game = createNewGameWorld(setup);
            startPlaying(game.world, game.playerPersonId, setup.seed, null);
          } catch (error) {
            setProblem(
              error instanceof Error
                ? error.message
                : "That start did not work.",
            );
          }
        }}
        problem={problem}
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
        setSession((current) => (current ? { ...current, world } : current))
      }
      onKeep={() => void keepThisWorld()}
      onLeave={() => void leaveGame()}
      savesUnavailable={savesUnavailable}
    />
  );
}

/* -------------------------------------------------------------------------- */

function TitleScreen({
  saves,
  savesUnavailable,
  problem,
  onNewGame,
  onContinue,
  onOpenSaves,
}: {
  readonly saves: readonly BrowserWorldSummary[];
  readonly savesUnavailable: boolean;
  readonly problem: string | null;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onOpenSaves: () => void;
}) {
  const recent = saves[0];
  return (
    <main className="game-title" data-testid="title-screen">
      <h1>Political Game</h1>
      <p className="game-title-line">A life, and the places it can reach.</p>
      <div className="game-title-actions">
        <button type="button" data-testid="new-game" onClick={onNewGame}>
          New game
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
          Saved games
          {saves.length > 0 ? <small>{saves.length} saved</small> : null}
        </button>
      </div>
      {savesUnavailable ? (
        <p className="game-note">
          This browser will not let the game store anything, so a game played
          here will not still be here later.
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
        <h2>Where</h2>
        <div className="game-choices" data-testid="place-choices">
          {places.map((candidate) => (
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
                {candidate.capabilities.legislativeScenarioKey
                  ? "Legislative procedure available"
                  : "No legislative procedure yet"}
              </small>
            </button>
          ))}
        </div>
        <p className="game-note" data-testid="place-coverage">
          These are the places a life can begin in today. {coverage.playerNote}
        </p>
      </section>

      <section>
        <h2>Who</h2>
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
            Age at the start
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
        <h2>How much to play</h2>
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
            Play the growing-up years
            <small>
              {setup.startAge < 18
                ? "Decide them one at a time from here."
                : "Only available for a character under eighteen."}
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
            Start with the earlier years behind you
            <small>They go on the record without being played.</small>
          </button>
        </div>
      </section>

      <section>
        <h2>Doing what</h2>
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
            An ordinary life
            <small>No office, no legislature.</small>
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
            Working in a legislative office
            <small>
              {place?.capabilities.legislativeScenarioKey === null
                ? `No sourced procedure for ${place.displayName} yet.`
                : setup.startAge < LEGISLATIVE_OFFICE_MINIMUM_AGE
                  ? `Needs a character of at least ${LEGISLATIVE_OFFICE_MINIMUM_AGE}.`
                  : "Staff to a state legislature."}
            </small>
          </button>
        </div>
      </section>

      <section>
        <h2>Who else is at home</h2>
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

      <details className="game-dev">
        <summary>Reproducing this world</summary>
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
                  <button
                    type="button"
                    data-testid="delete-damaged"
                    onClick={() => onDelete(entry.saveId as EntityId)}
                  >
                    Remove it
                  </button>
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
          {session.unsavedSeed !== null && !savesUnavailable ? (
            <button type="button" data-testid="keep-world" onClick={onKeep}>
              Keep this life
            </button>
          ) : null}
          <button type="button" data-testid="leave-game" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      {session.unsavedSeed !== null ? (
        <p className="game-note" data-testid="unsaved-note">
          This life has not been kept yet. Nothing is stored until you keep it.
        </p>
      ) : null}
      {notice ? <p className="game-note">{notice}</p> : null}
      {problem ? <p className="game-problem">{problem}</p> : null}

      {capabilities.formativeYears ? (
        <FormativeYearsView session={session} onWorldChange={onWorldChange} />
      ) : (
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
      ) : capabilities.formativeYears ? null : (
        // Worth saying to an adult, who might reasonably expect a workplace.
        // Not worth saying to a child, who obviously has no legislature.
        <p className="game-note" data-testid="no-legislation">
          {capabilities.withheld.find(
            (entry) => entry.surface === "legislation",
          )?.reason ?? ""}
        </p>
      )}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function FormativeYearsView({
  session,
  onWorldChange,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
}) {
  const years = useMemo(
    () => projectFormativeYears(session.world, session.personId),
    [session.world, session.personId],
  );

  return (
    <section className="game-formative" data-testid="formative-section">
      {years.scene ? (
        <>
          <p className="game-band" data-testid="formative-band">
            {years.scene.bandLabel} · {years.scene.age}
          </p>
          <p className="game-scene" data-testid="formative-prose">
            {years.scene.prose}
          </p>
          {years.scene.withPersonName ? (
            <p className="game-note">{years.scene.withPersonName} is there.</p>
          ) : null}
          <div className="game-choices" data-testid="formative-options">
            {years.scene.options.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  onWorldChange(
                    chooseFormativeOption(session.world, {
                      personId: session.personId,
                      situationKey: years.scene!.situationKey,
                      optionKey: option.key,
                      withPersonId: years.scene!.withPersonId,
                    }),
                  )
                }
              >
                {option.label}
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="game-scene">
            Nothing this year that anyone would tell a story about.
          </p>
          <div className="game-choices">
            <button
              type="button"
              data-testid="let-time-pass"
              onClick={() =>
                onWorldChange(letTimePass(session.world, session.personId))
              }
            >
              Let the year go by
              <small>Some of them do.</small>
            </button>
          </div>
        </>
      )}

      {years.memories.length > 0 ? (
        <div className="game-memories" data-testid="formative-memories">
          <h2>What you remember</h2>
          <ol>
            {years.memories.map((memory, index) => (
              <li key={`${memory.formedAt}:${index}`}>
                <span>{memory.ageAtTime}</span>
                {memory.summary}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

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
      {day.companionName ? (
        <HouseholdConversation
          session={session}
          onWorldChange={onWorldChange}
        />
      ) : null}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Talking at home.
 *
 * Runs on the same conversation engine the office uses — same room, same
 * hearing rules, same commitment semantics — with a different subject in front
 * of it. The options below are the household subject's own; none of the
 * office's casework ever appears here.
 */
function HouseholdConversation({
  session,
  onWorldChange,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
}) {
  // Derived from canonical history rather than remembered here. Closing this
  // screen and reopening it — or saving, reloading and continuing — used to
  // put the player back at turn one of a conversation the world had already
  // recorded them finishing.
  const progress = useMemo(
    () =>
      conversationProgressFromHistory(
        session.world,
        session.personId,
        "household-obligation",
      ) ?? createHouseholdObligationProgress(),
    [session.world, session.personId],
  );
  // Turn ordinals start at one; the engine treats zero as a mistake. The turn
  // this is on comes from what the world has recorded, not from a counter that
  // resets when the component does.
  const turn =
    recordedConversationIntents(
      session.world,
      session.personId,
      "household-obligation",
    ).length + 1;
  const [said, setSaid] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<string | null>(null);

  const room = useMemo(
    () => householdConversationRoom(session.world, session.personId),
    [session.world, session.personId],
  );
  if (!room) return null;
  const addressee = room.eligibleAddresseePersonIds[0]!;
  const intents = availableConversationIntents(
    session.world,
    room,
    addressee,
    progress,
  );
  const beat = openingConversationBeat(
    session.world,
    room,
    addressee,
    progress,
  );

  return (
    <div className="game-conversation" data-testid="household-conversation">
      <p className="game-band" data-testid="conversation-topic">
        {conversationTopicLabel(progress)}
      </p>
      <p className="game-note" data-testid="conversation-briefing">
        {describeConversationBriefingContext(session.world, room, progress)}
      </p>
      <p className="game-scene" data-testid="conversation-beat">
        {said ?? beat.dialogue}
      </p>
      {trouble ? <p className="game-problem">{trouble}</p> : null}
      {intents.length > 0 ? (
        <div className="game-choices" data-testid="conversation-intents">
          {intents.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                try {
                  const result = commitConversationTurn(session.world, {
                    session: createConversationSessionDescriptor(
                      session.world,
                      room,
                    ),
                    room,
                    progress,
                    turnOrdinal: turn,
                    addressee,
                    audibility: "normal",
                    intent: option.key,
                  });
                  onWorldChange(result.world);
                  setSaid(result.presentation.beat?.dialogue ?? null);
                  setTrouble(null);
                } catch (error) {
                  setTrouble(
                    error instanceof Error
                      ? error.message
                      : "That did not come out right.",
                  );
                }
              }}
            >
              {option.label}
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="game-note" data-testid="conversation-closed">
          That is settled for now.
        </p>
      )}
    </div>
  );
}
