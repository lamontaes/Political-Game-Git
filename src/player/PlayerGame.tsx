import { PressWorkspace } from "./PressWorkspace";
import {
  SavedAppearanceProvider,
  SavedRenderSnapshotsProvider,
  savedRenderSnapshots,
  SavedAppearanceControls,
} from "./SavedAppearance";
import { playerEconomicContextLines } from "../presentation/economic-context";
import { LifeScenePanel } from "./opening-life/LifeScenePanel";
import { createOpeningLifeController } from "../presentation/opening-life";
import { OpeningLifeFlow } from "./opening-life/OpeningLifeFlow";
import { MunicipalWorkspace } from "./MunicipalWorkspace";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import { resolveActivityVenueScene } from "../presentation/scene-venues";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { PublicInformationPanel } from "./PublicInformationPanel";
import { projectPublicInformationPanel } from "../presentation/public-information-adapters";
import { LifeStartTransition } from "./LifeStartTransition";
import { VenueActivityPanel } from "./VenueActivityPanel";
import { completedActivityHere } from "../presentation/scene-venues";
import {
  BrowserShellStateStore,
  type StoredShellState,
} from "../presentation/browser-shell-state";
import { LifePathsPanel } from "./LifePathsPanel";
import { CivilPersonnelPanel } from "./CivilPersonnelPanel";
import { JudicialOfficeWork } from "./JudicialOfficeWork";
import { judicialOfficeContexts } from "../simulation/judicial-office-work";
import { ExecutiveWorkWorkspace } from "./ExecutiveWorkWorkspace";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { synchronizeExecutiveInbox } from "../simulation/executive-work";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
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
import { projectDynamicSurfaces } from "../presentation/surface-projection";
import { resolveLifeScene } from "../presentation/life-scene";
import { planLifeScenePeople } from "../presentation/life-scene-people";
import { SceneBackdrop } from "./SceneBackdrop";
import {
  AmbientTableau,
  TitleScreen,
  resolvedTitlePresentation,
} from "./TitleScreen";
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
import { openLegislativeBargaining } from "../presentation/legislative-bargaining-world";
import type { LegislativeBargainingSeat } from "../presentation/legislative-bargaining-brief";
import { MeasureFloorSurface } from "./MeasureFloorSurface";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { LegislationWorkspace } from "./LegislationWorkspace";
import { DocketWorkspace } from "./DocketWorkspace";
import {
  docketBill,
  type DocketBill,
} from "../presentation/legislation-docket";
import { selectedDocketKey } from "../presentation/legislation-docket-selection";
import { measureById } from "../simulation";
import { PlayerConversation, PlayerConversations } from "./PlayerConversation";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
import { openConversationWith } from "../presentation/person-conversation-entry";
import {
  projectPersonDossier,
  type PersonDossier,
} from "../presentation/person-dossier";
import { CANONICAL_VERSION } from "../presentation/release-identity";
import {
  activeView,
  canGoBack,
  isPinned,
  type ShellAction,
  type ShellRef,
  type ShellState,
} from "../presentation/shell-navigation";
import { useShell } from "./useShell";
import { ShellNav, type ShellDestination } from "./ShellNav";
import { ShellPinRail } from "./ShellPinRail";
import { FullDossier, QuickDossier } from "./ShellDossier";
import {
  CalendarWorkspaceSurface,
  CommitmentSurface,
  JournalWorkspace,
  MeasureSurface,
  OptionsWorkspace,
  PatchNotesWorkspace,
  PeopleWorkspace,
  PersonalWorkspace,
  WorkWorkspace,
  WorkspaceFrame,
} from "./ShellWorkspaces";

/**
 * The game.
 *
 * One world, loaded or newly made, owned here and passed down. Nothing below
 * builds a second one. Which surfaces appear is decided by what the world says
 * the character's life is, not by which screen happens to exist.
 */

type Screen =
  | { readonly kind: "title" }
  | { readonly kind: "setup"; readonly draft?: NewGameSetup }
  /**
   * The calibration, between choosing a life and starting one.
   *
   * It carries the setup rather than reading it back from the setup screen,
   * because the answers are part of the setup by the time the world is built —
   * and because a player who goes back and changes their age has not answered
   * a different questionnaire.
   */
  | { readonly kind: "questionnaire"; readonly setup: NewGameSetup }
  | { readonly kind: "patch-notes" }
  | { readonly kind: "saves" }
  | { readonly kind: "options" }
  | {
      readonly kind: "transition";
      readonly setup: NewGameSetup;
      readonly controller: ReturnType<typeof createOpeningLifeController>;
    }
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
  const shellStore = useMemo(() => new BrowserShellStateStore(), []);
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
      const game =
        createOpeningLifeController(replaySetup).finishTransition().game!;
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

  const saveInFlight = useRef(false);
  async function keepThisWorld(shellState: StoredShellState) {
    if (!session || !store || saveInFlight.current) return;
    saveInFlight.current = true;
    setNotice("Saving…");
    // A slot of its own, so keeping this life never lands on top of another
    // save of the same world.
    const saveId = session.saveId ?? store.newSaveId(session.world);
    try {
      // Persist presentation references first: a newly visible world slot must
      // already have its pins, even if the player reloads immediately afterward.
      const shellSaved = await shellStore.write(saveId, shellState);
      const outcome = await store.save(session.world, saveId);
      if (outcome.status !== "saved") {
        // A refused slot is not a broken browser, and saying so would send the
        // player looking for the wrong problem.
        setProblem(outcome.reason);
        return;
      }
      setSession((current) =>
        current?.world.id === session.world.id
          ? { ...current, unsavedSeed: null, saveId }
          : current,
      );
      setNotice(
        shellSaved
          ? "Saved."
          : "Your life was saved, but your pins and display preferences could not be kept.",
      );
      await refreshSaves();
    } catch {
      setProblem("This game could not be saved just now.");
    } finally {
      saveInFlight.current = false;
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

  /*
   * One room, held across the whole opening.
   *
   * The title, the creator and the questionnaire each used to mount their OWN
   * `AmbientTableau`. Those were different component types at the same place in
   * the tree, so a route change unmounted one and mounted the other: the plate
   * was released and re-acquired, the drift cycle restarted from zero, and the
   * cover transform was recomputed against a viewport that had just changed.
   * That is the black flash and the crop jump the owner play reported between
   * New Game and the creator.
   *
   * Each of the three now returns the SAME element type from this same
   * position, so React keeps one instance and one painted plate across all of
   * them. Only the panel in front of the room is swapped. The room is never
   * released, so there is no frame without it.
   */
  if (screen.kind === "title") {
    return (
      <AmbientTableau resolved={resolvedTitlePresentation(saves)}>
        {() => (
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
            onOpenPatchNotes={() => setScreen({ kind: "patch-notes" })}
          />
        )}
      </AmbientTableau>
    );
  }

  if (screen.kind === "patch-notes") {
    return (
      <AmbientTableau resolved={resolvedTitlePresentation(saves)}>
        {() => (
          <WorkspaceFrame
            title="Patch notes"
            testid="title-patch-notes-workspace"
            canGoBack={true}
            onBack={() => setScreen({ kind: "title" })}
            onClose={() => setScreen({ kind: "title" })}
          >
            <PatchNotesWorkspace />
          </WorkspaceFrame>
        )}
      </AmbientTableau>
    );
  }

  if (screen.kind === "options") {
    return <OptionsScreen onBack={() => setScreen({ kind: "title" })} />;
  }

  function beginLife(setup: NewGameSetup) {
    setScreen({
      kind: "transition",
      setup,
      controller: createOpeningLifeController(setup),
    });
  }

  if (screen.kind === "transition") {
    return (
      <AmbientTableau resolved={resolvedTitlePresentation(saves)}>
        {() => (
          <LifeStartTransition
            onComplete={() => {
              try {
                const game = screen.controller.finishTransition().game!;
                startPlaying(
                  game.world,
                  game.playerPersonId,
                  screen.setup.seed,
                  null,
                );
              } catch (error) {
                setProblem(
                  error instanceof Error
                    ? error.message
                    : "This life could not be started.",
                );
                setScreen({ kind: "setup", draft: screen.setup });
              }
            }}
          />
        )}
      </AmbientTableau>
    );
  }

  if (screen.kind === "setup") {
    return (
      <AmbientTableau resolved={resolvedTitlePresentation(saves)}>
        {() => (
          <SetupScreen
            seed={sessionSeed.seed}
            seedOrigin={sessionSeed.origin}
            initialSetup={screen.draft}
            onBack={() => setScreen({ kind: "title" })}
            onBegin={(setup) => {
              setProblem(null);
              // The calibration runs before the world is built, because its
              // answers are part of the setup the world is built from — not
              // because the world reads them. It never does: they go into the
              // world's non-diegetic corner and nowhere near a generator.
              if (questionnaireScreenFor(setup)) {
                setScreen({ kind: "questionnaire", setup });
                return;
              }
              beginLife(endQuestionnaireEarly(setup));
            }}
            problem={problem}
          />
        )}
      </AmbientTableau>
    );
  }

  if (screen.kind === "questionnaire") {
    return (
      <AmbientTableau resolved={resolvedTitlePresentation(saves)}>
        {() => (
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
            onBack={() => setScreen({ kind: "setup", draft: screen.setup })}
          />
        )}
      </AmbientTableau>
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
              {
                ...current,
                world: synchronizeExecutiveInbox(
                  openOrdinaryLife(world, current.personId),
                ),
              }
            : current,
        )
      }
      onKeep={(shellState) => void keepThisWorld(shellState)}
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
  lines.push(
    ...playerEconomicContextLines(
      place.key,
      place.context.initialMoment.date,
    ).map((item) => item.text),
  );
  return lines;
}

function SetupScreen({
  seed,
  seedOrigin,
  initialSetup,
  onBack,
  onBegin,
  problem,
}: {
  readonly seed: string;
  readonly seedOrigin: "fresh" | "replay";
  readonly initialSetup?: NewGameSetup;
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
  const [setup, setSetup] = useState<NewGameSetup>(
    initialSetup ?? {
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
    },
  );
  const custom = setup.startKind === "custom";
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
            <span className="creator-summary-value">{summaryText[step]}</span>
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
                    candidate.key === setup.placeKey ? "is-chosen" : undefined
                  }
                  onClick={() =>
                    setSetup((now) => ({
                      ...now,
                      placeKey: candidate.key,
                      startingLife:
                        candidate.capabilities.legislativeScenarioKey === null
                          ? "ordinary-life"
                          : now.startingLife,
                    }))
                  }
                >
                  {candidate.displayName}
                  {/*
                    A search for "Kentucky" returns the whole state AND cities
                    inside it. The owner play picked one meaning to get the
                    other, so the two are now labelled as the different kinds of
                    thing they are instead of as two similar-looking rows.
                  */}
                  <small data-place-scope={candidate.scope}>
                    {candidate.scope === "state"
                      ? "Statewide — not a hometown"
                      : candidate.scope === "county"
                        ? "County or county equivalent"
                        : (candidate.withinName ?? "")}
                  </small>
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
            <div className="creator-place-context" data-testid="place-context">
              {/*
                The exact place that becomes canonical, said before Begin. The
                owner play chose a state and was later told they lived in
                Lexington; whatever the answer is, it is on screen first.
              */}
              <p className="creator-place-name" data-testid="place-canonical">
                {place.displayName}
              </p>
              <p className="game-hint" data-testid="place-scope">
                {place.scope === "state"
                  ? "A whole state, chosen as the scope of this life."
                  : place.scope === "county"
                    ? "County or county equivalent. Your town is unspecified."
                    : "This is the exact place this life will be lived in."}
              </p>
              {placeContextLines(place).map((line) => (
                <p key={line} className="game-hint">
                  {line}
                </p>
              ))}
              <button
                type="button"
                className="game-creator-next"
                data-testid="creator-continue-place"
                onClick={() => advanceTo(custom ? "background" : "whoAreYou")}
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
                  ? `${place.displayName} has no legislature you can work in yet.`
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
            This is optional. A few questions help the game understand what
            matters to you, so the situations it puts in front of you land
            closer to home. The world remembers what you choose — some things
            fade, some echo back years later — but nothing here locks a path or
            decides who you become. You can skip it and let the game learn from
            how you actually play.
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
              Answer a Few Questions
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
              Explore More Questions
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
          The address below carries the place, the age and any names you typed
          as well, so it rebuilds the same world.
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
        These are about you, not your character. They help the game understand
        how you decide, so it can put the right kind of thing in front of you.
        Nothing here locks a path, and you can begin whenever you like.
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
  readonly onKeep: (shellState: StoredShellState) => void;
  readonly onLeave: () => void;
  readonly savesUnavailable: boolean;
}) {
  const capabilities = useMemo(
    () => resolvePlayerCapabilities(session.world),
    [session.world],
  );

  /*
   * One shell for the whole life: what is open, how the player got there, and
   * which references they have kept. It owns navigation and nothing else — the
   * gameplay writers below are still the only things that change the world.
   */
  const [shell, dispatch] = useShell(session.world, session.saveId);

  const [assignment, setAssignment] = useState<LegislativeAssignment | null>(
    null,
  );
  const [floorSeat, setFloorSeat] = useState<LegislativeBargainingSeat | null>(
    null,
  );
  const [floorNote, setFloorNote] = useState<string | null>(null);
  /**
   * The conversation the player asked for, and who they asked to speak to.
   *
   * Held beside the shell rather than inside it because it is not a place — it
   * is a thing happening with a person whose record is already open. The
   * addressee travels with it, which is the whole repair: the recorded defect
   * was a selected person being dropped on the way to a generic surface.
   */
  const [conversation, setConversation] = useState<{
    readonly personId: EntityId;
    readonly subject: ConversationSubjectKey;
  } | null>(null);

  const sceneId = useMemo(() => {
    const activity = completedActivityHere(session.world, session.personId);
    const venue =
      activity && municipalVenueForActivity(session.world, activity.id);
    if (activity && venue) {
      return resolveActivityVenueScene(
        session.world,
        session.personId,
        activity.id,
        venue,
      ).sceneId;
    }
    return resolveLifeScene(session.world, session.personId).sceneId;
  }, [session.world, session.personId]);

  const surfaceProjection = useMemo(
    () =>
      projectDynamicSurfaces(session.world, {
        jurisdictionId: capabilities.legislativeJurisdictionId,
        measureId: assignment?.measureId ?? null,
      }),
    [session.world, capabilities.legislativeJurisdictionId, assignment],
  );

  const moment = useMemo(() => {
    const projected = projectStoryMoment(session.world, session.personId);
    const activity = completedActivityHere(session.world, session.personId);
    return activity
      ? {
          ...projected,
          placeName: activity.location.label,
          scene: {
            ...projected.scene,
            presentPeople: projected.scene.presentPeople.filter(
              (person) =>
                completedActivityHere(
                  session.world,
                  person.personId,
                  activity.id,
                ) !== null,
            ),
          },
        }
      : projected;
  }, [session.world, session.personId]);

  const renderSnapshots = useMemo(
    () => savedRenderSnapshots(session.world, shell.personWardrobes),
    [session.world, shell.personWardrobes],
  );

  const scenePeople = useMemo(
    () =>
      planLifeScenePeople(
        session.world,
        completedActivityHere(session.world, session.personId)
          ? []
          : moment.scene.presentPeople,
        sceneId,
        undefined,
        {
          wardrobeByPersonId: shell.personWardrobes,
          snapshotsByPersonId: renderSnapshots,
        },
      ),
    [
      session.world,
      moment.scene.presentPeople,
      sceneId,
      shell.personWardrobes,
      renderSnapshots,
    ],
  );

  const view = activeView(shell);
  const openSurface = view.surface;
  const previousSurface = useRef(openSurface);
  const newsPersonReturn = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousSurface.current;
    previousSurface.current = openSurface;
    const frame = requestAnimationFrame(() => {
      if (openSurface === "news" && newsPersonReturn.current) {
        const buttons = document.querySelectorAll<HTMLButtonElement>(
          ".public-information-people button",
        );
        [...buttons]
          .find(
            (button) => button.dataset.personId === newsPersonReturn.current,
          )
          ?.focus();
      } else if (previous === "news" && openSurface === "scene") {
        document
          .querySelector<HTMLButtonElement>('[data-testid="shell-nav-cluster"]')
          ?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [openSurface]);

  const destinations = useMemo<readonly ShellDestination[]>(() => {
    const entries: ShellDestination[] = [];
    if (!capabilities.formativeYears) {
      entries.push({
        surface: "day",
        label: "The day",
        hint: "What is in front of you today",
        testid: "elsewhere-day",
        open: openSurface === "day",
      });
    }
    entries.push({
      surface: "people",
      label: "People / Friends",
      hint: "Family, friends, work, politics",
      testid: "elsewhere-people",
      open: openSurface === "people",
    });
    entries.push({
      surface: "calendar",
      label: "Calendar",
      hint: "Your commitments, and the chamber's",
      testid: "nav-calendar",
      open: openSurface === "calendar",
    });
    entries.push({
      surface: "work",
      label: "Offices / Work",
      hint: "Education, work and your current role",
      testid: "elsewhere-work",
      open: openSurface === "work",
    });
    entries.push({
      surface: "personal",
      label: "Personal",
      hint: "You, the household, money",
      testid: "nav-personal-entry",
      open: openSurface === "personal",
    });
    entries.push({
      surface: "life-scenes",
      label: "Life scenes",
      hint: "Return to your current scene and conversations",
      testid: "nav-life-scenes",
      open: openSurface === "life-scenes",
    });
    entries.push({
      surface: "municipal",
      label: "Local government",
      hint: "Public meetings and your municipal work",
      testid: "nav-municipal",
      open: openSurface === "municipal",
    });
    entries.push({
      surface: "news",
      label: "News",
      hint: "Published public records",
      testid: "nav-news",
      open: openSurface === "news",
    });
    entries.push({
      surface: "journal",
      label: "Journal",
      hint: "Chapters, and what is still open",
      testid: "nav-journal-entry",
      open: openSurface === "journal",
    });
    entries.push({
      surface: "options",
      label: "Options",
      hint: "Settings this game actually reads",
      testid: "nav-options",
      open: openSurface === "options",
    });
    entries.push({
      surface: "patch-notes",
      label: "Patch notes",
      hint: "What has changed, read from this build",
      testid: "nav-patch-notes",
      open: openSurface === "patch-notes",
    });
    return entries;
  }, [
    session.world,
    capabilities.formativeYears,
    capabilities.legislation,
    capabilities.legislativeScenarioKey,
    openSurface,
  ]);

  const openEntity = useCallback(
    (ref: ShellRef) => {
      if (openSurface === "news" && ref.kind === "person")
        newsPersonReturn.current = ref.id;
      setConversation(null);
      dispatch({ type: "open-entity", ref });
    },
    [dispatch, openSurface],
  );

  const dossierFor = useCallback(
    (personId: EntityId) =>
      projectPersonDossier(session.world, session.personId, personId, {
        presentNow: moment.scene.presentPeople.some(
          (person) => person.personId === personId,
        ),
        rightNow:
          moment.scene.presentPeople.find(
            (person) => person.personId === personId,
          ) === undefined
            ? null
            : "Here in the room with you.",
      }),
    [session.world, session.personId, moment.scene.presentPeople],
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
    try {
      const opened = openLegislativeWork(session.world, {
        scenarioKey,
        playerPersonId: session.personId,
        jurisdictionId,
      });
      setAssignment(opened.assignment);
      setFloorNote(null);
      if (opened.world !== session.world) onWorldChange(opened.world);
    } catch (error) {
      setFloorNote(
        error instanceof Error
          ? error.message
          : "This work is not available in the current world.",
      );
    }
  }

  /**
   * The members' room, from normal play.
   *
   * The entry asks the adapter one question — does this player currently have
   * a truthful bargaining context in their own world? — and either walks in or
   * says plainly why not.
   */
  function goToTheFloor() {
    if (!assignment) return;
    const entry = openLegislativeBargaining(session.world, {
      playerPersonId: session.personId,
    });
    if (entry.kind === "unavailable") {
      setFloorNote(entry.reason);
      return;
    }
    setFloorNote(null);
    if (entry.world !== session.world) onWorldChange(entry.world);
    setFloorSeat(entry.seat);
    dispatch({ type: "go-to-scene" });
  }

  function goToTheFloorFor(bill: DocketBill) {
    const entry = openLegislativeBargaining(session.world, {
      playerPersonId: session.personId,
      docketKey: bill.docketKey,
    });
    if (entry.kind === "unavailable") {
      setFloorNote(entry.reason);
      return;
    }
    setFloorNote(null);
    if (entry.world !== session.world) onWorldChange(entry.world);
    setFloorSeat(entry.seat);
    dispatch({ type: "go-to-scene" });
  }

  const selectedDossier =
    shell.quickDossierPersonId === null
      ? null
      : dossierFor(shell.quickDossierPersonId);
  const actionPerson =
    shell.actionMenuPersonId === null
      ? null
      : dossierFor(shell.actionMenuPersonId);

  /** Starts the real conversation with exactly the person who was chosen. */
  const talkTo = useCallback(
    (personId: EntityId) => {
      const entry = openConversationWith(
        session.world,
        session.personId,
        personId,
      );
      if (entry.kind === "unavailable") return;
      setConversation({ personId, subject: entry.subject });
    },
    [session.world, session.personId],
  );

  const workspace = renderWorkspace({
    view,
    session,
    shell,
    dispatch,
    capabilities,
    assignment,
    floorNote,
    conversation,
    onWorldChange,
    openEntity,
    dossierFor,
    talkTo,
    openTheBill,
    goToTheFloor,
    goToTheFloorFor,
    setConversation,
  });

  return (
    <SavedAppearanceProvider value={shell.personWardrobes}>
      <SavedRenderSnapshotsProvider value={renderSnapshots}>
        <main
          className="life-shell"
          data-testid="play-screen"
          data-scene-id={sceneId ?? ""}
        >
          {/*
        THE ROOM IS THE SURFACE.

        The scene — with the generated household standing on its own anchors —
        is the whole surface, the current moment is a compact panel over it, the
        people this life has are a rail on the right, and everything else is a
        quiet cluster in the corner that grows as you reach for it.
      */}
          <SceneBackdrop
            sceneId={sceneId}
            people={scenePeople}
            surfaces={surfaceProjection}
          >
            <OpeningLifeFlow
              key={session.world.id}
              world={session.world}
              playerPersonId={session.personId}
              alreadyIntroduced={session.saveId !== null}
              onWorldChange={onWorldChange}
              transitionHandlers={createCampaignElectionTransitionRegistry()}
              continuingLife={
                <StoryView session={session} onWorldChange={onWorldChange} />
              }
            />
          </SceneBackdrop>

          <LifePeopleRail moment={moment} shell={shell} dispatch={dispatch} />

          {/*
        The anchored action menu. One click on somebody opens it, and every
        entry on it carries that person's id — there is no route from here to a
        surface that has forgotten who was chosen.
      */}
          {actionPerson ? (
            <div
              className="pg-action-menu civic-glass"
              role="menu"
              aria-label={`${actionPerson.name} actions`}
              data-testid="person-action-menu"
              data-person-id={actionPerson.personId}
            >
              <p className="pg-action-menu-name">{actionPerson.name}</p>
              <button
                type="button"
                role="menuitem"
                data-testid="action-inspect"
                onClick={() =>
                  dispatch({
                    type: "open-quick-dossier",
                    personId: actionPerson.personId,
                  })
                }
              >
                Inspect
                <small>What you make of them</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="action-talk"
                disabled={
                  openConversationWith(
                    session.world,
                    session.personId,
                    actionPerson.personId,
                  ).kind === "unavailable"
                }
                onClick={() => {
                  openEntity({ kind: "person", id: actionPerson.personId });
                  talkTo(actionPerson.personId);
                }}
              >
                Talk
                <small>Say something to them</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="action-pin"
                onClick={() =>
                  dispatch({
                    type: "toggle-pin",
                    ref: { kind: "person", id: actionPerson.personId },
                  })
                }
              >
                {isPinned(shell, { kind: "person", id: actionPerson.personId })
                  ? "Unpin"
                  : "Pin"}
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="action-record"
                onClick={() =>
                  openEntity({ kind: "person", id: actionPerson.personId })
                }
              >
                Full record
              </button>
            </div>
          ) : null}

          {selectedDossier ? (
            <QuickDossier
              world={session.world}
              dossier={selectedDossier}
              pinned={isPinned(shell, {
                kind: "person",
                id: selectedDossier.personId,
              })}
              onClose={() => dispatch({ type: "close-quick-dossier" })}
              onOpenFull={() =>
                openEntity({ kind: "person", id: selectedDossier.personId })
              }
              onTogglePin={() =>
                dispatch({
                  type: "toggle-pin",
                  ref: { kind: "person", id: selectedDossier.personId },
                })
              }
              onOpenLink={openEntity}
            />
          ) : null}

          {workspace}

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
            {session.unsavedSeed !== null ? (
              <p className="life-hud-note" data-testid="unsaved-note">
                This life has not been saved yet.
              </p>
            ) : null}
            <p className="sr-only" role="status">
              {shell.announcement}
            </p>
          </div>

          {scenePeople
            .filter((person) => person.wardrobeRefusal)
            .map((person) => (
              <p
                key={person.personId}
                role="status"
                className="life-hud-note life-hud-note--problem"
              >
                {person.name}: {person.wardrobeRefusal}
              </p>
            ))}
          <ShellNav
            state={shell}
            dispatch={dispatch}
            playerName={moment.personName}
            dateLabel={moment.dateLabel}
            placeName={moment.placeName}
            destinations={destinations}
            canSave={!savesUnavailable}
            unsaved={session.saveId === null}
            onSave={() =>
              onKeep({
                pins: shell.pins,
                preferences: shell.preferences,
                journal: shell.journal,
                personWardrobes: shell.personWardrobes,
              })
            }
            onLeave={onLeave}
          />

          <ShellPinRail
            world={session.world}
            state={shell}
            dispatch={dispatch}
            onOpen={openEntity}
          />

          {/*
        The build's own version, quiet in the corner and read from the checkout
        rather than restated. Nothing on this route can change it.
      */}
          <p className="pg-version" data-testid="shell-version">
            v{CANONICAL_VERSION}
          </p>

          {floorSeat ? (
            <div
              className="production-floor-layer"
              data-testid="production-floor"
            >
              <button
                type="button"
                className="ui-action"
                data-testid="leave-floor"
                onClick={() => setFloorSeat(null)}
              >
                Put the bill down and go back
              </button>
              <MeasureFloorSurface
                world={session.world}
                seat={floorSeat}
                onWorldChange={onWorldChange}
              />
            </div>
          ) : null}
        </main>
      </SavedRenderSnapshotsProvider>
    </SavedAppearanceProvider>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Which workspace the history stack says is open, drawn in the one frame.
 *
 * Every destination shares this frame, so Back and the close X behave the same
 * everywhere and no screen keeps a navigation stack of its own. The frame is
 * absent entirely when the room is the current view, which is the default a
 * life opens on.
 */
function renderWorkspace({
  view,
  session,
  shell,
  dispatch,
  capabilities,
  assignment,
  floorNote,
  conversation,
  onWorldChange,
  openEntity,
  dossierFor,
  talkTo,
  openTheBill,
  goToTheFloor,
  goToTheFloorFor,
  setConversation,
}: {
  readonly view: ReturnType<typeof activeView>;
  readonly session: Session;
  readonly shell: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly capabilities: ReturnType<typeof resolvePlayerCapabilities>;
  readonly assignment: LegislativeAssignment | null;
  readonly floorNote: string | null;
  readonly conversation: {
    readonly personId: EntityId;
    readonly subject: ConversationSubjectKey;
  } | null;
  readonly onWorldChange: (world: World) => void;
  readonly openEntity: (ref: ShellRef) => void;
  readonly dossierFor: (personId: EntityId) => PersonDossier | null;
  readonly talkTo: (personId: EntityId) => void;
  readonly openTheBill: () => void;
  readonly goToTheFloor: () => void;
  readonly goToTheFloorFor: (bill: DocketBill) => void;
  readonly setConversation: (value: null) => void;
}): ReactNode {
  if (view.surface === "scene") return null;

  const back = () => dispatch({ type: "back" });
  const close = () => dispatch({ type: "go-to-scene" });
  const backable = canGoBack(shell);
  const openPerson = (personId: EntityId) =>
    openEntity({ kind: "person", id: personId });
  const onLegislativeChange = (next: World) =>
    onWorldChange(publishLegislativeTransition(session.world, next));
  const pinnedRef = (ref: ShellRef) => isPinned(shell, ref);
  const togglePin = (ref: ShellRef) => dispatch({ type: "toggle-pin", ref });

  /*
   * The local-government surface, shared by the menu route and by a pinned
   * government. One element, so a pin cannot drift into a second copy of this
   * screen with different wiring.
   */
  const municipalSurface = (openGovernmentKey?: string) => (
    <MunicipalWorkspace
      {...(openGovernmentKey ? { openGovernmentKey } : {})}
      isPinnedGovernment={(key) => pinnedRef({ kind: "government", id: key })}
      onTogglePinGovernment={(key) =>
        togglePin({ kind: "government", id: key })
      }
      world={session.world}
      onWorldChange={onWorldChange}
      transitionHandlers={createCampaignElectionTransitionRegistry()}
      renderVenue={(world, activityId, venue) => {
        const canonicalActivity = world.history.scheduledActivities.find(
          (entry) => entry.id === activityId,
        );
        if (!canonicalActivity) return null;
        const resolution = resolveActivityVenueScene(
          world,
          session.personId,
          canonicalActivity.id,
          venue,
        );
        if (!resolution.sceneId) return null;
        const activity = completedActivityHere(
          world,
          session.personId,
          canonicalActivity.id,
        );
        return (
          <p role="status" data-testid="municipal-current-venue">
            You have finished {activity?.title} at {activity?.location.label}.
            Close this workspace to return to the room.
          </p>
        );
      }}
    />
  );

  const frame = (
    title: string,
    testid: string,
    body: ReactNode,
    kicker?: string,
  ) => (
    <WorkspaceFrame
      title={title}
      {...(kicker === undefined ? {} : { kicker })}
      testid={testid}
      canGoBack={backable}
      onBack={back}
      onClose={close}
    >
      {body}
    </WorkspaceFrame>
  );

  if (view.surface === "entity") {
    if (view.ref.kind === "person") {
      const dossier = dossierFor(view.ref.id);
      if (!dossier) {
        return frame(
          "Unavailable",
          "person-workspace",
          <p className="game-note" data-testid="person-missing">
            This world has no record of that person.
          </p>,
        );
      }
      const entry = openConversationWith(
        session.world,
        session.personId,
        dossier.personId,
      );
      return frame(
        dossier.name,
        "person-workspace",
        <>
          <SavedAppearanceControls
            world={session.world}
            personId={dossier.personId}
            preference={shell.personWardrobes[dossier.personId]}
            onWorldChange={onWorldChange}
            onPreferenceChange={(preference) =>
              dispatch({ type: "set-person-wardrobe", preference })
            }
          />
          <FullDossier
            world={session.world}
            dossier={dossier}
            pinned={pinnedRef({ kind: "person", id: dossier.personId })}
            onTogglePin={() =>
              togglePin({ kind: "person", id: dossier.personId })
            }
            onTalk={() => talkTo(dossier.personId)}
            talkUnavailable={entry.kind === "unavailable" ? entry.reason : null}
            onOpenLink={openEntity}
          />
          {/*
            The conversation opens against the person whose record this is, with
            them already the addressee. Reading a dossier and speaking to
            somebody stay different acts: this appears only once the player asks
            for it.
          */}
          {conversation && conversation.personId === dossier.personId ? (
            <div data-testid="dossier-conversation">
              <button
                type="button"
                className="ui-action ui-action--subtle"
                data-testid="dossier-conversation-close"
                onClick={() => setConversation(null)}
              >
                Stop talking
              </button>
              <PlayerConversation
                world={session.world}
                personId={session.personId}
                subject={conversation.subject}
                initialAddressee={dossier.personId}
                onWorldChange={onWorldChange}
              />
            </div>
          ) : null}
        </>,
        "Record",
      );
    }
    if (view.ref.kind === "commitment") {
      return frame(
        "Commitment",
        "commitment-workspace",
        <CommitmentSurface
          world={session.world}
          personId={session.personId}
          activityId={view.ref.id}
        />,
        "Calendar",
      );
    }
    if (view.ref.kind === "measure") {
      return frame(
        "Measure",
        "measure-workspace",
        <MeasureSurface
          world={session.world}
          personId={session.personId}
          measureId={view.ref.id}
        />,
        "Legislation",
      );
    }
    /*
     * A pinned government reopens the local-government surface with that
     * government selected. Inspecting is all it does — no travel, no move, no
     * standing granted.
     */
    return frame(
      "Local government",
      "municipal-workspace",
      municipalSurface(view.ref.id),
    );
  }

  switch (view.surface) {
    case "day":
      return frame(
        "The day",
        "day-overlay",
        <>
          <OrdinaryDayView session={session} onWorldChange={onWorldChange} />
          {/*
            UI9-01. The day used to mount the education-and-work stack and the
            private personnel panel in full, and Work mounted the same two
            again. Inspecting the same panels under a second name is not a
            second thing to do, and it is most of why these menus read as
            overlapping. Work owns study and jobs; the day links into that same
            workspace rather than carrying a copy of it. Nothing is removed —
            every one of those controls is still there, in one place.
          */}
          <button
            type="button"
            className="ui-action"
            data-testid="day-open-work"
            onClick={() => dispatch({ type: "go-to-surface", surface: "work" })}
          >
            Education and work
            <small>Study, jobs and anything waiting on you</small>
          </button>
          {/*
            Politics is a thing an ordinary life can turn into, so this sits
            below the ordinary day rather than replacing it.
          */}
          {capabilities.campaign ? (
            <CampaignWorkspace
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
            />
          ) : capabilities.formativeYears ? null : (
            <p className="game-note" data-testid="no-campaign">
              {capabilities.withheld.find(
                (entry) => entry.surface === "campaign",
              )?.reason ?? ""}
            </p>
          )}
        </>,
      );

    case "people":
      return frame(
        "People",
        "people-overlay",
        <>
          <PeopleWorkspace
            world={session.world}
            personId={session.personId}
            state={shell}
            dispatch={dispatch}
            onOpenPerson={openPerson}
          />
          {/*
            What this life can actually talk about, in the room it is in. Kept
            here beside the directory because both answer "who is in this life",
            and opening one person's record is a click away above.
          */}
          {!completedActivityHere(session.world, session.personId) && (
            <PlayerConversations
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
            />
          )}
        </>,
      );

    case "calendar":
      return frame(
        "Calendar",
        "calendar-workspace",
        <CalendarWorkspaceSurface
          world={session.world}
          personId={session.personId}
          isPinnedRef={pinnedRef}
          onOpen={openEntity}
          onTogglePin={togglePin}
        />,
      );

    case "personal":
      return frame(
        view.section === "finances" ? "Money and property" : "Who you are",
        "personal-workspace",
        <PersonalWorkspace
          world={session.world}
          personId={session.personId}
          {...(view.section ? { section: view.section } : {})}
          onOpenPerson={openPerson}
        />,
      );

    case "life-scenes":
      return frame(
        "Life scenes",
        "life-scenes-workspace",
        <LifeScenePanel
          world={session.world}
          playerPersonId={session.personId}
          onWorldChange={onWorldChange}
          onContinue={close}
          transitionHandlers={createCampaignElectionTransitionRegistry()}
        />,
      );

    case "municipal":
      return frame(
        "Local government",
        "municipal-workspace",
        municipalSurface(),
      );

    case "news":
      return frame(
        "News",
        "news-workspace",
        <>
          <PressWorkspace
            world={session.world}
            onWorldChange={onWorldChange}
            onOpenPerson={openPerson}
          />
          <PublicInformationPanel
            model={projectPublicInformationPanel(session.world)}
            onClose={back}
            onOpenPerson={openPerson}
          />
        </>,
      );

    case "journal":
      return frame(
        "Journal",
        "journal",
        <JournalWorkspace
          journal={shell.journal}
          onJournalChange={(journal) =>
            dispatch({ type: "set-journal", journal })
          }
          world={session.world}
          personId={session.personId}
          onOpenPerson={openPerson}
        />,
      );

    case "patch-notes":
      return frame(
        "Patch notes",
        "patch-notes-workspace",
        <PatchNotesWorkspace />,
      );

    case "options":
      return frame(
        "Options",
        "options-workspace",
        <OptionsWorkspace state={shell} dispatch={dispatch} />,
      );

    case "work": {
      const offices = judicialOfficeContexts(session.world);
      if (offices.length > 0)
        return frame(
          "Office work",
          "judicial-office-section",
          <>
            {offices.map((office) => (
              <JudicialOfficeWork
                key={office.workRelationshipId}
                world={session.world}
                courtOrganizationId={office.courtOrganizationId}
                onWorldChange={onWorldChange}
                onPerson={openPerson}
                transitionHandlers={createCampaignElectionTransitionRegistry()}
              />
            ))}
          </>,
        );
      if (resolveExecutiveOffice(session.world))
        return frame(
          "Executive work",
          "executive-office-section",
          <ExecutiveWorkWorkspace
            world={session.world}
            onWorldChange={(next) =>
              onWorldChange(synchronizeExecutiveInbox(next))
            }
            onClose={close}
            handlers={createCampaignElectionTransitionRegistry()}
          />,
        );
      if (!capabilities.legislation || !capabilities.legislativeScenarioKey) {
        return frame(
          "Education and work",
          "personal-work-section",
          <>
            <LifePathsPanel
              world={session.world}
              onWorldChange={onWorldChange}
              transitionHandlers={createCampaignElectionTransitionRegistry()}
            />
            <CivilPersonnelPanel
              world={session.world}
              onWorldChange={onWorldChange}
            />
          </>,
        );
      }
      const docketKey = selectedDocketKey(
        session.world,
        capabilities.legislativeScenarioKey,
        session.personId,
      );
      const workingBill = docketKey
        ? docketBill(session.world, {
            scenarioKey: capabilities.legislativeScenarioKey,
            playerPersonId: session.personId,
            docketKey,
          })
        : null;
      /*
       * UI9-13: one working measure, said out loud.
       *
       * Two selections could sit on this surface at once — the docket
       * selection the player made, and whatever the older "look at what is
       * moving" assignment had opened — each with its own pin control, both
       * presented as equals. The owner's report from that state was "This is
       * not my bill." Neither selection is removed and nothing is relabelled
       * as theirs: the docket selection is named as the one being worked on,
       * and an assignment pointing at a DIFFERENT measure is named separately
       * as the other document it is, so the two can never be read as one.
       */
      const workingName = workingBill
        ? (measureById(session.world, workingBill.measureId)?.shortTitle ??
          null)
        : null;
      const assignmentName = assignment
        ? (measureById(session.world, assignment.measureId)?.shortTitle ?? null)
        : null;
      const assignmentIsOther =
        assignment !== null &&
        workingBill !== null &&
        assignment.measureId !== workingBill.measureId;
      return frame(
        "The office",
        "office-section",
        <WorkWorkspace world={session.world} personId={session.personId}>
          <p>
            {capabilities.person.givenName} works for the{" "}
            {capabilities.workPlace?.displayName} legislature, so what is in
            front of the chamber is in front of them too.
          </p>
          {workingBill ? (
            <p
              className="game-band"
              data-testid="active-measure"
              data-measure-id={workingBill.measureId}
            >
              Working on:{" "}
              {workingName ?? "a measure this world no longer holds"}
            </p>
          ) : null}
          {assignmentIsOther ? (
            <p className="game-note" data-testid="other-measure-open">
              Also open, and not the one you are working on:{" "}
              {assignmentName ?? "another measure"}.
            </p>
          ) : null}
          <button
            type="button"
            className="ui-action"
            data-testid="open-legislation"
            onClick={openTheBill}
          >
            {assignment ? "Close the bill" : "Look at what is moving"}
          </button>
          {floorNote && !assignment ? (
            <p role="status" data-testid="work-unavailable">
              {floorNote}
            </p>
          ) : null}
          {capabilities.legislativeJurisdictionId ? (
            <DocketWorkspace
              world={session.world}
              playerPersonId={session.personId}
              scenarioKey={capabilities.legislativeScenarioKey}
              jurisdictionId={capabilities.legislativeJurisdictionId}
              onWorldChange={onLegislativeChange}
              onGoToFloor={goToTheFloorFor}
              floorNote={floorNote}
            />
          ) : null}
          {workingBill && (
            <button
              type="button"
              className="ui-action"
              data-testid="pin-docket-measure"
              data-measure-id={workingBill.measureId}
              aria-pressed={pinnedRef({
                kind: "measure",
                id: workingBill.measureId,
              })}
              onClick={() =>
                togglePin({ kind: "measure", id: workingBill.measureId })
              }
            >
              {pinnedRef({ kind: "measure", id: workingBill.measureId })
                ? `Unpin ${workingName ?? "the measure you are working on"}`
                : `Pin ${workingName ?? "the measure you are working on"}`}
            </button>
          )}
          {assignment ? (
            <>
              <button
                type="button"
                className="ui-action"
                data-testid="open-floor"
                onClick={goToTheFloor}
              >
                Go to the members&rsquo; room
              </button>
              <button
                type="button"
                className="ui-action ui-action--rail"
                aria-pressed={pinnedRef({
                  kind: "measure",
                  id: assignment.measureId,
                })}
                data-testid="pin-measure"
                onClick={() =>
                  togglePin({ kind: "measure", id: assignment.measureId })
                }
              >
                {pinnedRef({ kind: "measure", id: assignment.measureId })
                  ? `Unpin ${assignmentName ?? "this bill"}`
                  : `Pin ${assignmentName ?? "this bill"}`}
              </button>
              {floorNote ? (
                <p data-testid="floor-withheld">{floorNote}</p>
              ) : null}
              <LegislationWorkspace
                world={session.world}
                assignment={assignment}
                onWorldChange={onLegislativeChange}
              />
            </>
          ) : null}
        </WorkWorkspace>,
      );
    }

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */

/**
 * The persistent People rail.
 *
 * Who is in this moment and who has been through the life recently, kept on the
 * right of the room rather than hidden behind a button. Selecting anybody opens
 * the anchored action menu FOR THAT PERSON — the id travels, which is the
 * defect this rail was at the centre of, and the pin beside them is the shell's
 * real saved reference rather than a star that only changes its own colour.
 */
function LifePeopleRail({
  moment,
  shell,
  dispatch,
}: {
  readonly moment: StoryMoment;
  readonly shell: ShellState;
  readonly dispatch: (action: ShellAction) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  type RailPerson = {
    readonly personId: EntityId;
    readonly name: string;
    readonly relationship: string | null;
    readonly present: boolean;
  };
  /*
   * Only the people actually in the room.
   *
   * This used to be the whole standing cast: everyone present, then the entire
   * generated household, then anyone the life kept returning to. That made a
   * second, automatic, permanent roster sitting above the pin rail — two lists
   * of people in two corners, one of which the player never asked for. The
   * owner's note was that the pins and the people should not be separate, and
   * that these people should not be there.
   *
   * So the rail is now what is true of the moment: who is here. Everyone the
   * player knows is browsable in People, and anyone they want kept to hand goes
   * on the pin rail deliberately, which is the one rail that persists. Present
   * people stay selectable by their real ids, which is what the action menu,
   * the dossier and the conversation routes all need.
   */
  const people: RailPerson[] = moment.scene.presentPeople.map((person) => ({
    personId: person.personId,
    name: person.name,
    relationship: person.relationship,
    present: true,
  }));

  if (people.length === 0) return null;

  return (
    <aside
      className={`life-rail${collapsed ? " life-rail--collapsed" : ""}`}
      data-testid="people-rail"
      aria-label="People in the room"
    >
      <button
        type="button"
        className="life-rail-toggle"
        data-testid="people-rail-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <span className="life-rail-title">In the room</span>
        <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed ? (
        <ul className="life-rail-list">
          {people.map((person) => {
            const ref: ShellRef = { kind: "person", id: person.personId };
            const pinned = isPinned(shell, ref);
            return (
              <li key={person.personId} className="life-rail-item">
                <button
                  type="button"
                  className="life-pin"
                  data-testid={`rail-person-${person.personId}`}
                  data-present={person.present ? "true" : "false"}
                  aria-haspopup="menu"
                  aria-expanded={shell.actionMenuPersonId === person.personId}
                  onClick={() =>
                    dispatch({
                      type: "select-person",
                      personId: person.personId,
                    })
                  }
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
                {/*
                  A real pin, not a star that toggles its own colour. Pinning
                  keeps the reference on the rail across every navigation and
                  across a reload, and it says nothing about where they are.
                */}
                <button
                  type="button"
                  className="life-pin-hold"
                  data-testid={`rail-pin-${person.personId}`}
                  aria-pressed={pinned}
                  aria-label={
                    pinned ? `Unpin ${person.name}` : `Pin ${person.name}`
                  }
                  onClick={() => dispatch({ type: "toggle-pin", ref })}
                >
                  {pinned ? "★" : "☆"}
                </button>
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

  if (completedActivityHere(session.world, session.personId))
    return (
      <section
        className="game-story life-moment"
        data-testid="activity-aftermath"
      >
        <VenueActivityPanel
          world={session.world}
          personId={session.personId}
          onWorldChange={onWorldChange}
        />
      </section>
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
      {!completedActivityHere(session.world, session.personId) && (
        <p className="game-scene" data-testid="day-opening">
          {day.opening}
        </p>
      )}
      {day.pending.length > 0 ? (
        <ul className="game-pending" data-testid="day-pending">
          {day.pending.map((thing) => (
            <li key={thing.key}>{thing.sentence}</li>
          ))}
        </ul>
      ) : null}
      <VenueActivityPanel
        world={session.world}
        personId={session.personId}
        onWorldChange={onWorldChange}
      />
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
