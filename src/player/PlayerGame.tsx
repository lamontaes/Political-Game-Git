import {
  NATIVE_SAVE_EVENT,
  NATIVE_SESSION_QUERY_EVENT,
  type NativeSaveRequest,
  type NativeSessionQuery,
} from "./native-session-bridge";
import { CreatorAppearanceStep } from "./CreatorAppearanceStep";
import { LifeContinuationPanel } from "./LifeContinuationPanel";
import { RetireFromPlayAction } from "./RetireFromPlayAction";
import { PersonalGoalsPanel } from "./PersonalGoalsPanel";
import {
  READ_ONLY_REFUSAL,
  isObserving,
  observerReadingLens,
  playedLifeContinuation,
  shellReadOnly,
  shellViewpointPersonId,
  surfaceOpenWhileReadOnly,
} from "../presentation/life-continuation-shell";
import { retireFromPlay } from "../presentation/people-continuation";
import {
  applyCreatorAppearance,
  type CreatorAppearanceChoice,
} from "../presentation/creator-appearance-preview";
import { PRODUCTION_CHARACTER_LIBRARY } from "../presentation/visual-integration";
import { proseDate } from "../presentation/prose-dates";
import { projectLocationSurfaces } from "../presentation/location-surfaces";
import { locationReviewVisuals } from "../presentation/location-art-review";
import { PressWorkspace } from "./PressWorkspace";
import { ContentPackWorkspace } from "./ContentPackWorkspace";
import { resolveCreatorBirthday } from "../presentation/creator-full-birthday";
import { CreatorBirthdayFields } from "./CreatorBirthdayFields";
import { projectHometownPage } from "../presentation/creator-hometown-page";
import { previewCreatorNames } from "../presentation/creator-name-preview";
import {
  creatorBirthDate,
  creatorCharacterHint,
  creatorCharacterMissing,
  statedCreatorGender,
} from "../presentation/creator-character";
import {
  SavedAppearanceProvider,
  SavedRenderSnapshotsProvider,
  savedRenderSnapshots,
  SavedAppearanceControls,
} from "./SavedAppearance";
import { createOpeningLifeController } from "../presentation/opening-life";
import { OpeningLifeFlow } from "./opening-life/OpeningLifeFlow";
import { LifeScenePanel } from "./opening-life/LifeScenePanel";
import { PersonPortrait } from "./PersonPortrait";
import { useContentViewportCss } from "./overlay-viewport";
import {
  describeTimeCommandPreview,
  previewTimeCommand,
} from "../presentation/time-command";
import {
  createWorldChangeGuard,
  recordStaleWorldChange,
} from "../presentation/world-change-guard";
import {
  skipToLabel,
  stoppedEarlyLabel,
} from "../presentation/time-target-label";
import { authorityDecisions } from "../presentation/crisis-shell";
import { CrisisNoticesPanel } from "./CrisisNoticesPanel";
import { useCrisisStop } from "./use-crisis-stop";
import {
  TimeCommandProvider,
  useTimeCommand,
  useTimeCommandRunner,
} from "./time-command-runner";
import {
  conversationExchangeTurns,
  currentExchangeTurn,
} from "../presentation/scene-conversation";
import { travelTowardsPerson } from "../presentation/person-contact";
import { interruptionHandlers } from "../presentation/interruption-policy";
import { MunicipalWorkspace } from "./MunicipalWorkspace";
import { World39News } from "./World39News";
import { World39Journal } from "./World39Journal";
import { PlacesWorkspace } from "./PlacesWorkspace";
import { GovernmentBrowser } from "./politics/GovernmentBrowser";
import { PublicServicePanel } from "./politics/PublicServicePanel";
import { NewsDesk } from "./news/NewsDesk";
import "./controls/controls.css";
import { PinToggle } from "./controls/PinToggle";
import { PoliticsTabs, type PoliticsTab } from "./politics/PoliticsTabs";
import { issuesPlaceForSelection } from "../presentation/politics-government";
import {
  ISSUE_WITHHELD,
  politicsIssueAccess,
} from "../presentation/politics-issues";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import { resolveActivityVenueScene } from "../presentation/scene-venues";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import { applyExecutivePlayTransition } from "../presentation/executive-entry";
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
/* PEOPLE/PRESS seam mounts (CRUNCH47 B1/B2). */
import { ChildhoodMomentPanel } from "./ChildhoodMomentPanel";
import { ContactsPanel } from "./ContactsPanel";
import { PressSourceDesk } from "./PressSourceDesk";
import { RecallCardsPanel } from "./RecallCardsPanel";
import { CivilPersonnelPanel } from "./CivilPersonnelPanel";
import { JudicialOfficeWork } from "./JudicialOfficeWork";
import { judicialOfficeContexts } from "../simulation/judicial-office-work";
import { ExecutiveWorkWorkspace } from "./ExecutiveWorkWorkspace";
import { GoverningBriefing } from "./GoverningBriefing";
import { GoverningOfficeDesk } from "./GoverningOfficeDesk";
import { governingOfficeForPerson } from "../simulation/governing/state-governing";
import { CampaignLifePanel } from "./CampaignLifePanel";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  presentPeopleSentence,
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
import { queryHometownPopulationFacts } from "../presentation/place-hometown-population";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import {
  answerQuestionnaire,
  endQuestionnaireEarly,
  questionnaireContentNote,
  questionnaireScreenFor,
} from "../presentation/setup-questionnaire-flow";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";
import { projectToday, projectWorkRole } from "../presentation/day-overview";
import { projectHouseholdPapers } from "../presentation/household-papers";
import { projectDynamicSurfaces } from "../presentation/surface-projection";
import {
  resolvePlaySceneContext,
  resolveOpeningPlaySceneContext,
} from "../presentation/play-scene-context";
import { planLifeScenePeople } from "../presentation/life-scene-people";
import {
  artPreviewBanner,
  artPreviewIsShowingCandidateArt,
  artPreviewLibraries,
  artPreviewMode,
  previewDatabaseName,
  prepareCandidateOpeningWorld,
  setupForArtPreview,
  type ArtPreviewMode,
} from "../presentation/art-preview";
import { gameBuildProfile } from "../presentation/build-profile";
import { SceneBackdrop } from "./SceneBackdrop";
import { projectLivingSceneSurface } from "../presentation/living-scene-surfaces";
import { projectOrdinaryMeetingScene } from "../presentation/ordinary-meeting-scene";
import { PUBLIC_MEETING_ROOM_SCENE_ID } from "../presentation/scene-registry";
import { OrdinaryMeetingPanel } from "./OrdinaryMeetingPanel";
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
  lifePlaceCoverage,
  lifePlaceStateIdentities,
  lifePlaces,
  personName,
} from "../simulation";
import type { EntityId, QuestionnairePhase, World } from "../simulation";
import {
  openLegislativeWork,
  type LegislativeAssignment,
} from "../presentation/legislation-world";
import { openLegislativeBargaining } from "../presentation/legislative-bargaining-world";
import type { LegislativeBargainingSeat } from "../presentation/legislative-bargaining-brief";
import { MeasureFloorSurface } from "./MeasureFloorSurface";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { LegislationWorkspace } from "./LegislationWorkspace";
import { TransitWorkspace } from "./TransitWorkspace";
import { TaxWorkWorkspace } from "./TaxWorkWorkspace";
import { NationwideCandidacyWorkspace } from "./NationwideCandidacyWorkspace";
import { projectTransitWork } from "../presentation/transit-work";
import { DocketWorkspace } from "./DocketWorkspace";
import { OfficeOnboardingWorkspace } from "./OfficeOnboardingWorkspace";
import {
  docketBill,
  type DocketBill,
} from "../presentation/legislation-docket";
import {
  selectedDocketKey,
  selectDocketBill,
} from "../presentation/legislation-docket-selection";
import { measureById } from "../simulation";
import { measureGate } from "../simulation/legislation";
import { ConversationStarters, SceneConversation } from "./SceneConversation";
import { InvokerFocusReturn } from "./PersonSceneActionMenu";
import type { ConversationSubjectKey } from "../presentation/run-b-conversation-progress";
import { openConversationWith } from "../presentation/person-conversation-entry";
import {
  labelForRef,
  projectPersonDossier,
  type PersonDossier,
} from "../presentation/person-dossier";
import {
  activeView,
  canGoBack,
  EMPTY_JOURNAL,
  conversationSuspended,
  isPinned,
  type ShellAction,
  type ShellPin,
  type ShellRef,
  type ShellState,
} from "../presentation/shell-navigation";
import type { PoliticalMapFocus } from "../maps/PoliticalMap";
import { useShell } from "./useShell";
import {
  stateAgencyStartAvailableFor,
  STATE_AGENCY_START_MINIMUM_AGE,
} from "../simulation/civil-personnel-start";
import { ShellNav, type ShellDestination } from "./ShellNav";
import { ShellPinRail } from "./ShellPinRail";
import { WorldRecapPanel } from "./WorldRecapPanel";
import { useWorldRecap } from "./useWorldRecap";
import { WorldOrientationPanel } from "./WorldOrientationPanel";
import { WorldOrientationEntry } from "./WorldOrientationEntry";
import { useWorldOrientation } from "./useWorldOrientation";
import { PartyChapterSurface } from "./PartyChapterSurface";
import { PartyInitiativesPanel } from "./politics/PartyInitiativesPanel";
import {
  projectPartyChapter,
  projectPartyChapters,
  type PartyChapterView,
} from "../presentation/party-chapter-surface";
import {
  acceptChapterInvitation,
  joinPartyChapter,
  leavePartyChapter,
} from "../simulation";
import { declineVenueActivity } from "../presentation/scheduled-activity-choice";
import { attendChapterMeeting } from "../presentation/party-chapter-actions";
import { FullDossier, QuickDossier } from "./ShellDossier";
import type { PersonCardAnchor } from "./PersonCard";
import {
  CalendarWorkspaceSurface,
  CommitmentSurface,
  MeasureSurface,
  OptionsWorkspace,
  PatchNotesWorkspace,
  PeopleWorkspace,
  PersonalWorkspace,
  WorkWorkspace,
  WorkspaceFrame,
} from "./ShellWorkspaces";
import { GuideWorkspace } from "./GuideWorkspace";
import { GuideHelpProvider } from "./GuideTerm";
import { PlayerVersion } from "./PlayerVersion";
import { ReturnToTitleAction } from "./ReturnToTitleAction";
import {
  RETURN_TO_TITLE_REQUEST_EVENT,
  reportReturnToTitle,
  type ReturnToTitleRequest,
} from "./return-to-title-bridge";
import { PersonalRoutinePanel } from "./PersonalRoutinePanel";
import {
  SaveImportControl,
  SaveTransferControls,
} from "./SaveTransferControls";
import { PoliticsWorkspace } from "./ConstitutionalWorkspace";

/* The map carries its geometry; it loads only when a player opens it. */
const PoliticalMap = lazy(() => import("../maps/PoliticalMap"));

/*
 * The map recomputes pinned-seat highlights whenever its focus object changes,
 * so one focus is kept per pins array (the reducer replaces it only when the
 * pins change) instead of a fresh object on every render.
 */
const mapFocusByPins = new WeakMap<readonly ShellPin[], PoliticalMapFocus>();
function mapFocusForPins(pins: readonly ShellPin[]): PoliticalMapFocus {
  const cached = mapFocusByPins.get(pins);
  if (cached) return cached;
  const focus: PoliticalMapFocus = {
    personIds: pins.flatMap((pin) =>
      pin.ref.kind === "person" ? [pin.ref.id] : [],
    ),
  };
  mapFocusByPins.set(pins, focus);
  return focus;
}

/**
 * The game.
 *
 * One world, loaded or newly made, owned here and passed down. Nothing below
 * builds a second one. Which surfaces appear is decided by what the world says
 * the character's life is, not by which screen happens to exist.
 */

type Screen =
  | { readonly kind: "title" }
  | {
      readonly kind: "setup";
      readonly draft?: NewGameSetup;
      readonly questionnaireComplete?: boolean;
    }
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
  /*
   * Development art preview. `import.meta.env.DEV` is replaced with a literal
   * `false` in a production build, so this whole branch is dead code the
   * bundler drops and no query string can reach candidate art in a shipped
   * game. See `src/presentation/art-preview.ts`.
   */
  const previewMode = useMemo(
    () =>
      artPreviewMode(window.location.search, {
        development: import.meta.env.DEV,
        profile: gameBuildProfile(),
      }),
    [],
  );
  /*
   * The shell's own per-slot state lives in the same database as the worlds,
   * in a different object store — and a wardrobe CHOICE is shell state, not
   * world state. Isolating only the world store therefore isolated the wrong
   * half: a candidate outfit picked in the preview was written straight into
   * the ordinary database under the ordinary slot id. Both take the mode's
   * name now, so opting into candidate pixels cannot reach a production save
   * through either door.
   */
  const shellStore = useMemo(
    () =>
      new BrowserShellStateStore({
        databaseName: previewDatabaseName(previewMode),
      }),
    [previewMode],
  );
  const store = useMemo(() => {
    try {
      // The preview keeps its lives in a physically separate database, so
      // opting into candidate pixels cannot edit a life played on production
      // art — a wardrobe choice made against a candidate outfit would land in
      // the ordinary save otherwise.
      return new BrowserSaveStore({
        databaseName: previewDatabaseName(previewMode),
      });
    } catch {
      return null;
    }
  }, [previewMode]);
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
  /*
   * GOVERNING time/continuity: a World change computed from an older World
   * must not replace a newer one. `committedWorld` is the World the rendered
   * controls were built from; once a change from it is accepted, only further
   * changes from that same base are accepted until the next render, so a
   * chained writer in one handler still lands, and a late or repeated
   * callback from an earlier render is dropped instead of rewinding or
   * repeating time.
   */
  const worldGuard = useRef(createWorldChangeGuard());
  useLayoutEffect(() => {
    worldGuard.current.rendered(session?.world ?? null);
  }, [session?.world]);
  /*
   * The content-viewport variables are written once at the root so the title,
   * the creator and the room all size against the same actual rectangle.
   */
  useContentViewportCss();
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

  /* The game's own control skins apply while the game is mounted. */
  useEffect(() => {
    document.body.classList.add("pg-game");
    return () => document.body.classList.remove("pg-game");
  }, []);

  const replayStarted = useRef(false);
  useEffect(() => {
    if (replaySetup === null || replayStarted.current) return;
    replayStarted.current = true;
    try {
      const game =
        createOpeningLifeController(replaySetup).finishTransition().game!;
      startPlaying(
        prepareCandidateOpeningWorld(game.world, replaySetup, previewMode),
        game.playerPersonId,
        replaySetup.seed,
        null,
      );
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

  const pendingAppearance = useRef<CreatorAppearanceChoice | null>(null);

  function startPlaying(
    world: World,
    personId: EntityId,
    seed: string | null,
    saveId: EntityId | null,
  ) {
    const selected = pendingAppearance.current;
    const prepared = applyCreatorAppearance(
      world,
      selected,
      artPreviewLibraries(previewMode)?.characters ??
        PRODUCTION_CHARACTER_LIBRARY,
    );
    pendingAppearance.current = null;
    setSession({
      // A world being observed, or a played life that ended before anything
      // followed it, has nobody whose week could be opened: loading such a
      // save must not write new work for the retired or dead character.
      world: shellReadOnly(prepared)
        ? prepared
        : openOrdinaryLife(prepared, personId),
      personId,
      unsavedSeed: seed,
      saveId,
    });
    setScreen({ kind: "playing" });
    setProblem(null);
  }

  useEffect(() => {
    const query = (event: Event) => {
      (event as NativeSessionQuery).detail?.respond(
        screen.kind === "playing" && session !== null,
      );
    };
    window.addEventListener(NATIVE_SESSION_QUERY_EVENT, query);
    return () => window.removeEventListener(NATIVE_SESSION_QUERY_EVENT, query);
  }, [screen.kind, session]);

  useEffect(() => {
    const query = (event: Event) => {
      const detail = (
        event as CustomEvent<{ respond: (idle: boolean) => void }>
      ).detail;
      detail?.respond(screen.kind === "title");
    };
    window.addEventListener("ocd:query-update-boundary", query);
    if (screen.kind === "title") window.ocdDesktop?.titleReady?.();
    return () => window.removeEventListener("ocd:query-update-boundary", query);
  }, [screen.kind]);

  const saveInFlight = useRef(false);
  async function keepThisWorld(shellState: StoredShellState): Promise<boolean> {
    if (!session || !store || saveInFlight.current) return false;
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
        return false;
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
      return shellSaved;
    } catch {
      setProblem("This game could not be saved just now.");
      return false;
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
      // An observed world opens read-only, seen as the last life played.
      const personId = world ? shellViewpointPersonId(world) : null;
      if (!world || personId === null) {
        setProblem("That saved game could not be opened.");
        return;
      }
      startPlaying(world, personId, null, saveId);
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
  async function leaveGame(discard = false): Promise<boolean> {
    if (discard && store && session?.saveId)
      await store.discardPending(session.saveId);
    if (store && !discard) {
      const flushed = await store.flush();
      if (flushed.status === "unsaved") {
        setProblem(
          `${flushed.reason} This life is still here — leaving now would lose what is not saved.`,
        );
        finishReturnToTitle("save-failed");
        await refreshSaves();
        return false;
      }
    }
    setSession(null);
    setScreen({ kind: "title" });
    setNotice(null);
    setProblem(null);
    finishReturnToTitle("title");
    await refreshSaves();
    return true;
  }

  // A Return to title in progress (Options or the desktop hub), so its
  // outcome can be reported once it is known.
  const returnToTitleRequest = useRef<ReturnToTitleRequest | null>(null);
  function finishReturnToTitle(
    outcome: Parameters<typeof reportReturnToTitle>[1],
  ) {
    const request = returnToTitleRequest.current;
    returnToTitleRequest.current = null;
    reportReturnToTitle(request, outcome);
  }

  useEffect(() => {
    if (screen.kind === "playing") return;
    const returnFromOpening = (event: Event) => {
      event.preventDefault();
      const hasDraft = ["setup", "questionnaire", "transition"].includes(
        screen.kind,
      );
      const leave =
        !hasDraft ||
        window.confirm(
          "Return to the title screen? Your unfinished character setup will be discarded. Your saved lives will be kept.",
        );
      if (leave) setScreen({ kind: "title" });
      reportReturnToTitle(
        { fromHub: true, leaving: leave },
        leave ? "title" : "cancelled",
      );
    };
    window.addEventListener(RETURN_TO_TITLE_REQUEST_EVENT, returnFromOpening);
    return () =>
      window.removeEventListener(
        RETURN_TO_TITLE_REQUEST_EVENT,
        returnFromOpening,
      );
  }, [screen.kind]);

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
            damaged={damaged}
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
      <AmbientTableau resolved={resolvedTitlePresentation(saves)} still>
        {() => (
          <LifeStartTransition
            onComplete={() => {
              try {
                const game = screen.controller.finishTransition().game!;
                startPlaying(
                  prepareCandidateOpeningWorld(
                    game.world,
                    screen.setup,
                    previewMode,
                  ),
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
      <AmbientTableau resolved={resolvedTitlePresentation(saves)} still>
        {() => (
          <SetupScreen
            seed={sessionSeed.seed}
            seedOrigin={sessionSeed.origin}
            previewMode={previewMode}
            initialSetup={screen.draft}
            questionnaireComplete={screen.questionnaireComplete}
            onBack={() => setScreen({ kind: "title" })}
            onBegin={(setup, appearance, questionsFinished) => {
              pendingAppearance.current = appearance;
              setProblem(null);
              // The calibration runs before the world is built, because its
              // answers are part of the setup the world is built from — not
              // because the world reads them. It never does: they go into the
              // world's non-diegetic corner and nowhere near a generator.
              if (!questionsFinished && questionnaireScreenFor(setup)) {
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
      <AmbientTableau resolved={resolvedTitlePresentation(saves)} still>
        {() => (
          <QuestionnaireScreenView
            setup={screen.setup}
            onAnswer={(choiceId) => {
              const next = answerQuestionnaire(screen.setup, choiceId);
              if (questionnaireScreenFor(next)) {
                setScreen({ kind: "questionnaire", setup: next });
                return;
              }
              setScreen({
                kind: "setup",
                draft: next,
                questionnaireComplete: true,
              });
            }}
            onFinishEarly={() =>
              setScreen({
                kind: "setup",
                draft: endQuestionnaireEarly(screen.setup),
                questionnaireComplete: true,
              })
            }
            onBack={() => setScreen({ kind: "setup", draft: screen.setup })}
          />
        )}
      </AmbientTableau>
    );
  }

  if (screen.kind === "saves") {
    return (
      <SavesScreen
        store={store}
        saves={saves}
        damaged={damaged}
        savesUnavailable={savesUnavailable}
        notice={notice}
        problem={problem}
        artProvenance={previewMode}
        onBack={() => setScreen({ kind: "title" })}
        onOpen={(saveId) => void loadSave(saveId)}
        onDelete={(saveId) => void deleteSave(saveId)}
        onTransferSettled={(nextNotice, nextProblem) => {
          setNotice(nextNotice);
          setProblem(nextProblem);
          void refreshSaves();
        }}
      />
    );
  }

  if (!session) {
    setScreen({ kind: "title" });
    return null;
  }

  return (
    <PlayingScreen
      shellStore={shellStore}
      session={session}
      notice={notice}
      problem={problem}
      onWorldChange={(world, base) => {
        // Nobody played, or a life that has ended: only the continuation
        // commands below may change this World.
        if (shellReadOnly(session.world)) {
          setNotice(READ_ONLY_REFUSAL);
          return;
        }
        if (base !== undefined && !worldGuard.current.admit(base)) {
          recordStaleWorldChange(base, world);
          return;
        }
        setSession((current) =>
          current
            ? // Opening is idempotent and gated on the character, so this is
              // how an ordinary week begins the moment it becomes theirs —
              // when a formative playthrough reaches eighteen — rather than
              // only at boot, which would leave a grown character with an
              // empty week until they reloaded.
              {
                ...current,
                world: applyExecutivePlayTransition(
                  current.world,
                  openOrdinaryLife(world, current.personId),
                ),
              }
            : current,
        );
      }}
      onControlChange={(world, base, change) => {
        if (!worldGuard.current.admit(base)) {
          recordStaleWorldChange(base, world);
          return;
        }
        // Computed here, not inside the state update, so a refusal throws
        // back to the command's caller (which says why) and nothing changes.
        const next =
          change.kind === "continued"
            ? applyExecutivePlayTransition(
                base,
                openOrdinaryLife(world, change.personId),
              )
            : world;
        setNotice(null);
        setSession((current) => {
          if (!current) return current;
          if (change.kind !== "continued") return { ...current, world: next };
          // The same World and save; only who is played has moved.
          return { ...current, personId: change.personId, world: next };
        });
      }}
      onKeep={keepThisWorld}
      onLeave={() => void leaveGame(true)}
      returnToTitleRequest={returnToTitleRequest}
      onSaveAndLeave={async (shellState) => {
        if (await keepThisWorld(shellState)) return leaveGame();
        finishReturnToTitle("save-failed");
        return false;
      }}
      onReturnToTitleCancelled={() => finishReturnToTitle("cancelled")}
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

function SetupScreen({
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
                    {fact.kind === "county"
                      ? fact.asOf
                        ? `${fact.text} · ${fact.asOf.slice(0, 4)}`
                        : fact.text
                      : fact.text}
                  </p>
                ))}
              {populationFacts.map((fact) => (
                <p
                  key={`${fact.kind}:${fact.text}:${fact.asOf}`}
                  className="game-hint"
                  data-testid="place-population"
                >
                  {fact.asOf
                    ? `${fact.text} · ${fact.geography} · ${fact.asOf}`
                    : fact.text}
                  {fact.attribution ? (
                    <span
                      className="creator-place-attribution"
                      data-testid="place-population-source"
                    >
                      {fact.attribution}
                    </span>
                  ) : null}
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
      className="game-title game-setup game-creator"
      data-testid="questionnaire-screen"
    >
      <h2>Who are you?</h2>
      {/*
            What these questions actually are, said once and plainly: they are
            about the player, they orient what the game offers, and they decide
            nothing about who the character becomes.
          */}
      <p className="game-note" data-testid="questionnaire-framing">
        These are imagined situations. Choose what you would do, or skip. These
        answers do not write your character’s biography.
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
          Review appearance
        </button>
      </div>
      {note ? <p className="game-note">{note}</p> : null}
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function SavesScreen({
  store,
  saves,
  damaged,
  savesUnavailable,
  notice,
  problem,
  artProvenance,
  onBack,
  onOpen,
  onDelete,
  onTransferSettled,
}: {
  readonly store: BrowserSaveStore | null;
  readonly saves: readonly BrowserWorldSummary[];
  readonly damaged: readonly QuarantinedSave[];
  readonly savesUnavailable: boolean;
  readonly notice: string | null;
  readonly problem: string | null;
  readonly artProvenance: "production" | "candidate-review";
  readonly onBack: () => void;
  readonly onOpen: (saveId: EntityId) => void;
  readonly onDelete: (saveId: EntityId) => void;
  readonly onTransferSettled: (
    notice: string | null,
    problem: string | null,
  ) => void;
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
      {problem ? (
        <p className="game-problem" role="alert">
          {problem}
        </p>
      ) : null}
      {saves.length === 0 && !savesUnavailable ? (
        <p className="game-note" data-testid="saves-empty">
          No lives are saved in this browser yet. You can import a saved life
          below.
        </p>
      ) : null}
      <ul>
        {saves.map((save) => (
          <li key={save.saveId} data-testid="save-entry">
            <div>
              <strong>{save.playerName}</strong>
              <span>
                {save.playerAge}
                {save.residence ? ` · ${save.residence.name}` : ""} ·{" "}
                {proseDate(save.currentMoment.date)}
              </span>
            </div>
            <div className="game-saves-actions">
              <button type="button" onClick={() => onOpen(save.saveId)}>
                Open
              </button>
              {store ? (
                <SaveTransferControls
                  store={store}
                  saveId={save.saveId}
                  playerName={save.playerName}
                  onSettled={onTransferSettled}
                  artProvenance={artProvenance}
                />
              ) : null}
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

      {store ? (
        <SaveImportControl
          store={store}
          onSettled={onTransferSettled}
          artProvenance={artProvenance}
        />
      ) : null}

      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function PlayingScreen({
  session: storedSession,
  notice,
  problem,
  onWorldChange: commitWorld,
  onControlChange,
  onKeep,
  onLeave,
  returnToTitleRequest,
  onSaveAndLeave,
  onReturnToTitleCancelled,
  savesUnavailable,
  shellStore,
}: {
  readonly session: Session;
  readonly notice: string | null;
  readonly problem: string | null;
  /** `base` is the World the change was computed from; see the root guard. */
  readonly onWorldChange: (world: World, base?: World) => void;
  /**
   * A continuation or retirement command's result, computed from `base`.
   * `continued` moves the session to the successor.
   */
  readonly onControlChange: (
    world: World,
    base: World,
    change:
      | { readonly kind: "continued"; readonly personId: EntityId }
      | { readonly kind: "observing" }
      | { readonly kind: "retired" },
  ) => void;
  readonly onKeep: (shellState: StoredShellState) => Promise<boolean>;
  readonly onLeave: () => void;
  /** Set while a Return to title (Options or desktop hub) is in progress. */
  readonly returnToTitleRequest: { current: ReturnToTitleRequest | null };
  /** "Save first" during a Return to title: save, then go to the title. */
  readonly onSaveAndLeave: (shellState: StoredShellState) => Promise<boolean>;
  readonly onReturnToTitleCancelled: () => void;
  readonly savesUnavailable: boolean;
  /**
   * The one shell-state store for this session.
   *
   * Threaded rather than rebuilt. `useShell` used to construct its own with no
   * database name, so the writer that actually persists pins, preferences, the
   * journal and wardrobe choices always wrote to the ordinary database — even
   * in the development art preview, and even though a correctly namespaced
   * store was sitting in `PlayerGame` being used for the explicit save. Two
   * stores for one set of records is how half of them ended up in the wrong
   * place; there is one now, and it comes from here.
   */
  readonly shellStore: BrowserShellStateStore;
}) {
  /*
   * A played life that ended, or a world watched with nobody played, leaves
   * the shell read-only. While observing, the reading surfaces see the world
   * through the last life played; that lens is never committed or saved.
   */
  const observing = isObserving(storedSession.world);
  const readOnly = useMemo(
    () => shellReadOnly(storedSession.world),
    [storedSession.world],
  );
  const continuation = useMemo(
    () => playedLifeContinuation(storedSession.world),
    [storedSession.world],
  );
  const session = useMemo<Session>(
    () =>
      storedSession.world.control.kind === "person"
        ? storedSession
        : {
            ...storedSession,
            world: observerReadingLens(storedSession.world),
          },
    [storedSession],
  );
  const capabilities = useMemo(
    () => resolvePlayerCapabilities(session.world),
    [session.world],
  );
  /*
   * Every writer below computes from `session.world` as rendered, so that is
   * the base each change is committed against.
   */
  const renderedWorld = session.world;
  const onWorldChange = useCallback(
    (world: World) => commitWorld(world, renderedWorld),
    [commitWorld, renderedWorld],
  );

  /*
   * Read here rather than threaded down from `PlayerGame`. It is a pure
   * function of the address and the build mode, so both readings agree by
   * construction, and passing it through every screen in between would put a
   * development-only concern in the signature of surfaces that have nothing to
   * do with art.
   */
  const previewMode = useMemo(
    () =>
      artPreviewMode(window.location.search, {
        development: import.meta.env.DEV,
        profile: gameBuildProfile(),
      }),
    [],
  );
  const artPreview = useMemo(
    () => artPreviewLibraries(previewMode),
    [previewMode],
  );
  const previewBanner = artPreviewBanner(previewMode);
  const previewShowsCandidateArt = artPreviewIsShowingCandidateArt(previewMode);

  /*
   * One shell for the whole life: what is open, how the player got there, and
   * which references they have kept. It owns navigation and nothing else — the
   * gameplay writers below are still the only things that change the world.
   */
  const [shell, dispatch] = useShell(session.world, session.saveId, shellStore);
  /* What changed since the player last caught up; a read, never a writer. */
  const recap = useWorldRecap(session.world, session.personId, shell);
  /*
   * The world introduction follows a new, not-yet-saved life until it is
   * finished or skipped. Loaded lives never see it pushed at them; it stays
   * available from News.
   */
  const orientation = useWorldOrientation(session.world, session.personId);
  const showOrientation =
    session.unsavedSeed !== null && !shell.progress.orientationSeen;

  const [assignment, setAssignment] = useState<LegislativeAssignment | null>(
    null,
  );
  const [floorSeat, setFloorSeat] = useState<LegislativeBargainingSeat | null>(
    null,
  );
  const [floorNote, setFloorNote] = useState<string | null>(null);
  /**
   * The conversation the player asked for, and who they are facing in it.
   *
   * It is still not a place — it is a thing happening in the room — but the
   * shell holds the record now, because the shell is what has to answer where
   * Back goes while it is waiting. The addressee travels with it, which is the
   * original repair: the recorded defect was a selected person being dropped on
   * the way to a generic surface. PT3: it is drawn in ONE place, the
   * conversation box in the room, whichever control started it.
   */
  const conversation = shell.conversation;
  /**
   * Whose Talk-to control the room should focus when a conversation closes.
   *
   * Back with a keyboard used to leave focus on the page body. The scene
   * panel does the focusing, because it owns the control and knows when it is
   * on screen; this is the request, cleared as soon as it is honored.
   */
  const [returnFocusTo, setReturnFocusTo] = useState<EntityId | null>(null);
  const [returnFocusPrefer, setReturnFocusPrefer] = useState<"scene" | "panel">(
    "scene",
  );
  const clearReturnFocus = useCallback(() => setReturnFocusTo(null), []);
  const continuingLifeShown = Boolean(
    completedActivityHere(session.world, session.personId),
  );
  useContentViewportCss();
  /*
   * A day or a week from the corner control, through the same clock the
   * calendar uses, with the same interruption preferences. The outcome is
   * said in the HUD so the player reads where time actually stopped and why.
   */
  const [passOutcome, setPassOutcome] = useState<string | null>(null);
  /*
   * Where the clicked scene person stands, kept with that person. A card
   * reached any other way, or for somebody else, has no anchor and uses the
   * consistent side placement.
   */
  const [cardAnchor, setCardAnchor] = useState<{
    readonly personId: EntityId;
    readonly rect: PersonCardAnchor;
  } | null>(null);
  useEffect(() => {
    setCardAnchor((current) =>
      current && current.personId !== shell.quickDossierPersonId
        ? null
        : current,
    );
  }, [shell.quickDossierPersonId]);
  /*
   * The one runner every time control on this screen submits through, so a
   * running command marks all of them busy at once.
   */
  const timeRunner = useTimeCommandRunner({
    world: session.world,
    personId: session.personId,
    interruptions: shell.preferences.interruptions,
    onWorldChange,
  });
  const { submit: submitTime } = timeRunner;
  /*
   * CRISIS raises decisions nobody else may make: disclosing an illness of
   * your own, a governor's federal request, a President's declaration or
   * international choice. A skip that passed one says so here and opens the
   * surface that holds the real decision, so it cannot be buried under the
   * routine outcome.
   */
  const crisisStop = useCrisisStop(session.world);
  const passDays = useCallback(
    (days: 1 | 7) => {
      crisisStop.watch();
      submitTime({ kind: "days", days }, (report) =>
        setPassOutcome(
          report.stoppedEarly && report.target
            ? `${stoppedEarlyLabel(report.target)} ${report.outcome}`
            : report.outcome,
        ),
      );
    },
    [crisisStop, submitTime],
  );
  const passTargets = useMemo(() => {
    const day = previewTimeCommand(session.world, session.personId, {
      kind: "days",
      days: 1,
    });
    const week = previewTimeCommand(session.world, session.personId, {
      kind: "days",
      days: 7,
    });
    return day && week
      ? { day: skipToLabel(day.target), week: skipToLabel(week.target) }
      : undefined;
  }, [session.world, session.personId]);

  const projectedMoment = useMemo(
    () => projectStoryMoment(session.world, session.personId),
    [session.world, session.personId],
  );

  const sceneVisuals = useMemo(
    () => locationReviewVisuals(Boolean(artPreview) && import.meta.env.DEV),
    [artPreview],
  );

  const playScene = useMemo(() => {
    const meeting = projectOrdinaryMeetingScene(
      session.world,
      session.personId,
    );
    if (meeting)
      return {
        purpose: "activity" as const,
        locationKey: meeting.location.locationKey,
        sceneId: PUBLIC_MEETING_ROOM_SCENE_ID,
        reason: "Recorded meeting entry or immediate aftermath.",
        placeLabel: meeting.location.label,
        presentPeople: meeting.actors.map((actor) => ({
          personId: actor.personId,
          name: actor.name,
          relationship: null,
          introduction: actor.role,
        })),
      };
    if (!continuingLifeShown)
      return resolveOpeningPlaySceneContext(
        session.world,
        session.personId,
        undefined,
        sceneVisuals,
      );
    const activity = completedActivityHere(session.world, session.personId);
    const venue =
      activity && municipalVenueForActivity(session.world, activity.id);
    if (activity && venue) {
      const resolved = resolveActivityVenueScene(
        session.world,
        session.personId,
        activity.id,
        venue,
      );
      return {
        purpose: "activity" as const,
        locationKey: activity.location.locationKey,
        sceneId: resolved.sceneId,
        reason: resolved.reason,
        placeLabel: activity.location.label,
        presentPeople: projectedMoment.scene.presentPeople.filter(
          (person) =>
            completedActivityHere(
              session.world,
              person.personId,
              activity.id,
            ) !== null,
        ),
      };
    }
    return resolvePlaySceneContext(
      session.world,
      session.personId,
      projectedMoment.scene,
      undefined,
      sceneVisuals,
    );
  }, [
    session.world,
    session.personId,
    projectedMoment,
    continuingLifeShown,
    sceneVisuals,
  ]);

  const sceneId = playScene.sceneId;
  const readableSurfaces = useMemo(() => {
    const news = projectLivingSceneSurface(session.world, session.personId, {
      kind: "news",
    });
    const records = new Map([
      ["living-room-television", news],
      ["coffee-table-papers", news],
    ]);
    const meeting = projectOrdinaryMeetingScene(
      session.world,
      session.personId,
    );
    if (meeting)
      records.set(
        "lectern-notes",
        projectLivingSceneSurface(
          session.world,
          session.personId,
          meeting.agendaSelection,
        ),
      );
    return records;
  }, [session.world, session.personId]);

  const surfaceProjection = useMemo(
    () =>
      projectLocationSurfaces(
        session.world,
        session.personId,
        sceneId,
        projectDynamicSurfaces(session.world, {
          jurisdictionId: capabilities.legislativeJurisdictionId,
          measureId: assignment?.measureId ?? null,
        }),
      ),
    [
      session.world,
      session.personId,
      sceneId,
      capabilities.legislativeJurisdictionId,
      assignment,
    ],
  );

  const moment = useMemo(
    () => ({
      ...projectedMoment,
      placeName: playScene.placeLabel ?? projectedMoment.placeName,
      scene: {
        ...projectedMoment.scene,
        presentPeople: playScene.presentPeople,
      },
    }),
    [projectedMoment, playScene],
  );

  const renderSnapshots = useMemo(
    () => savedRenderSnapshots(session.world, shell.personWardrobes),
    [session.world, shell.personWardrobes],
  );

  const scenePeople = useMemo(
    () =>
      planLifeScenePeople(
        session.world,
        moment.scene.presentPeople,
        sceneId,
        undefined,
        {
          wardrobeByPersonId: shell.personWardrobes,
          snapshotsByPersonId: renderSnapshots,
          ...(artPreview ? { artPreview } : {}),
        },
      ),
    [
      session.world,
      moment.scene.presentPeople,
      sceneId,
      shell.personWardrobes,
      renderSnapshots,
      artPreview,
    ],
  );

  const view = activeView(shell);
  const openSurface = view.surface;
  const previousSurface = useRef(openSurface);
  const newsPersonReturn = useRef<string | null>(null);
  /**
   * The term the Guide should open on when it was reached from inline help.
   *
   * Presentation only, and not kept: a player who walks into the Guide from
   * the menu next time gets the whole catalog rather than whatever word they
   * last looked up.
   */
  const [guideTermKey, setGuideTermKey] = useState<string | null>(null);
  useEffect(() => {
    /* Leaving the Guide forgets the lookup, so the menu opens the catalog. */
    if (openSurface !== "guide" && guideTermKey !== null) setGuideTermKey(null);
  }, [openSurface, guideTermKey]);
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
      } else if (previous !== "scene" && openSurface === "scene") {
        /*
         * Back in the room. If a conversation is waiting, the keyboard goes
         * to it — its next choice is the sensible place to be, and Escape
         * from there closes the conversation rather than nothing. Otherwise
         * the corner cluster, which is the room's one resting control. An
         * open continuation view comes before either: it is the choice left.
         */
        const talk = document.querySelector<HTMLElement>(
          '[data-testid="life-continuation-heading"], [data-testid="conversation-intents"] button, [data-testid="talk-back"]',
        );
        (
          talk ??
          document.querySelector<HTMLButtonElement>(
            '[data-testid="shell-nav-cluster"]',
          )
        )?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [openSurface]);

  /*
   * What Work holds for THIS life, said on the way in.
   *
   * "Offices / Work — Education, work and your current role" was the same line
   * for a ten-year-old, a shop assistant, a candidate and a member, so the menu
   * could not tell anybody whether what they were hunting for was behind it.
   * The hint is now built from what the Work surface will actually mount.
   */
  const holdsOffice =
    !capabilities.formativeYears &&
    (judicialOfficeContexts(session.world).length > 0 ||
      resolveExecutiveOffice(session.world) !== null ||
      // A governorship is a held office recorded against the office itself,
      // not an executive employment relationship, so it has to be asked for
      // by name or the menu sends an officeholder to Campaigns.
      governingOfficeForPerson(session.world, session.personId) !== null ||
      capabilities.legislation);
  const workHint = capabilities.formativeYears
    ? "School, and anything waiting on you"
    : [
        holdsOffice ? "your office" : null,
        capabilities.campaign ? "running for office" : null,
        "jobs and study",
      ]
        .filter((part): part is string => part !== null)
        .join(", ")
        .replace(/^./, (first) => first.toUpperCase());

  const destinations = useMemo<readonly ShellDestination[]>(() => {
    const entries: ShellDestination[] = [];
    const section = view.surface === "entity" ? undefined : view.section;
    /*
     * The accepted grouping. Every implemented route keeps a home: Today and
     * the calendar are one entry; People is one entry; Politics holds the
     * office, running for office, local government and the public budget;
     * Personal holds who you are, money, and ordinary jobs and study; Travel
     * is the places surface; Options carries the settings and this build's
     * notes. Nothing was dropped to make the list tidy.
     */
    entries.push({
      surface: "calendar",
      label: "Calendar",
      hint: "Today, what is next, and your time",
      testid: "nav-calendar",
      open: openSurface === "calendar" || openSurface === "day",
      group: "calendar",
    });
    entries.push({
      surface: "people",
      label: "People",
      hint: "Who you know, and how",
      testid: "elsewhere-people",
      open: openSurface === "people",
      group: "people",
    });
    /*
     * Politics is one hub (UI DECISION FOLLOW-THROUGH). Its tab strip reaches
     * the office, campaigns, government and local records, parties, and the
     * budget with transit and taxes, so the menu carries a single entry.
     */
    const politicsSurfaces: readonly string[] = [
      "government",
      "government-map",
      "municipal",
      "parties",
      "politics",
      "transit",
      "tax",
      "candidacy",
    ];
    entries.push(
      capabilities.formativeYears
        ? {
            surface: "government",
            label: "Politics",
            hint: "Who governs where you are, at every level",
            testid: "nav-politics",
            open: politicsSurfaces.includes(openSurface ?? ""),
            group: "politics",
          }
        : {
            // Politics opens on the office held, or on Campaigns without one.
            surface: "work",
            section: holdsOffice ? "office" : "campaign",
            label: "Politics",
            /*
             * The hint names what is behind this entry, not only the part of
             * it this character has reached yet.
             *
             * It used to be `workHint`, which is composed from the office, the
             * campaign and jobs, and drops the parts a character has no
             * capability for. A new player holds no office and has no
             * campaign, so it collapsed to its last part alone and the entry
             * read "Politics — Jobs and study", one press from the actual
             * "Jobs and study" entry, while being the only route to parties,
             * government, campaigns, local records, candidacy and the budget.
             * Found by walking an ordinary first day, not by reading the code.
             *
             * `workHint` still subtitles the "Your office and campaigns"
             * button on Today, where the label already names its subject, so
             * that one is left alone and this entry carries its own hint.
             */
            hint: [
              holdsOffice ? "your office" : null,
              capabilities.campaign ? "running for office" : null,
              "who governs, parties and the budget",
            ]
              .filter((part): part is string => part !== null)
              .join(", "),
            testid: "nav-politics",
            open:
              politicsSurfaces.includes(openSurface ?? "") ||
              (openSurface === "work" &&
                (section === "office" || section === "campaign")),
            group: "politics",
          },
    );
    entries.push({
      surface: "government-map",
      label: "Map",
      hint: "Places and government",
      testid: "nav-government-map",
      open: openSurface === "government-map",
      group: "politics",
    });
    entries.push({
      surface: "news",
      label: "News",
      hint: "Published public records",
      testid: "nav-news",
      open: openSurface === "news",
      group: "news",
    });
    entries.push({
      surface: "journal",
      label: "Journal",
      hint: "Chapters, and what is still open",
      testid: "nav-journal-entry",
      open: openSurface === "journal",
      group: "journal",
    });
    entries.push({
      surface: "personal",
      section: "identity",
      label: "Who you are",
      hint: "Identity, household, what you have done",
      testid: "nav-personal",
      open: openSurface === "personal" && section !== "finances",
      group: "personal",
    });
    entries.push({
      surface: "personal",
      section: "finances",
      label: "Money and property",
      hint: "Yours, the household\u2019s, the committee\u2019s",
      testid: "nav-finances",
      open: openSurface === "personal" && section === "finances",
      group: "personal",
    });
    entries.push({
      surface: "work",
      section: "jobs",
      label: capabilities.formativeYears ? "School" : "Jobs and study",
      hint: capabilities.formativeYears
        ? "School, and anything waiting on you"
        : "Offers, terms, study and hiring",
      testid: "nav-jobs",
      open:
        openSurface === "work" &&
        (section === "jobs" || capabilities.formativeYears),
      group: "personal",
    });
    entries.push({
      surface: "places",
      label: "Travel",
      hint: "Where you are, where you can go, and what is on there",
      testid: "nav-places",
      open: openSurface === "places",
      group: "travel",
    });
    entries.push({
      surface: "guide",
      label: "Guide",
      hint: "What the words on the other screens mean",
      testid: "nav-guide",
      open: openSurface === "guide",
      group: "options",
    });
    entries.push({
      surface: "options",
      label: "Options",
      hint: "Settings this game actually reads, and patch notes",
      testid: "nav-options",
      open: openSurface === "options" || openSurface === "patch-notes",
      group: "options",
    });
    if (!readOnly) return entries;
    // Nobody is played: only the reading surfaces stay, and Politics opens
    // on who governs rather than on an office or a campaign.
    return entries
      .map((entry) =>
        entry.group === "politics"
          ? {
              surface: "government" as const,
              label: "Politics",
              hint: "Who governs, at every level",
              testid: entry.testid,
              open: entry.open,
              group: entry.group,
            }
          : entry,
      )
      .filter((entry) => surfaceOpenWhileReadOnly(entry.surface));
  }, [
    capabilities.formativeYears,
    holdsOffice,
    workHint,
    openSurface,
    view,
    readOnly,
  ]);

  const openEntity = useCallback(
    (ref: ShellRef) => {
      if (openSurface === "news" && ref.kind === "person")
        newsPersonReturn.current = ref.id;
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
  const presentPersonIds = useMemo(
    () => moment.scene.presentPeople.map((person) => person.personId),
    [moment.scene.presentPeople],
  );
  /*
   * The line still on the table while the player is browsing elsewhere, for
   * the compact reminder. Read, never rewritten: the same record the box
   * itself draws from.
   */
  const pendingLine = useMemo(() => {
    if (!conversation) return null;
    const facing =
      conversation.addressee === "everyone" ? null : conversation.addressee;
    const turns = conversationExchangeTurns(
      session.world,
      session.personId,
      conversation.subject,
      facing,
    );
    const current = currentExchangeTurn(turns);
    const text = current?.reply?.trim() || current?.playerLine?.trim() || "";
    if (!text) return null;
    return text.length > 72 ? `${text.slice(0, 70)}…` : text;
  }, [conversation, session.world, session.personId]);
  /*
   * Asked once, and kept: the same answer drives the Talk control AND the
   * sentence beside it, so the two cannot disagree.
   */
  const inspectTalkEntry = selectedDossier
    ? openConversationWith(
        session.world,
        session.personId,
        selectedDossier.personId,
      )
    : null;

  /**
   * Starts the real conversation with exactly the person who was chosen, in
   * the room.
   *
   * Whatever surface the choice was made on — the person in the scene, their
   * record, the People list — the conversation itself happens in the one box
   * over the scene, so the workspace closes and the room comes forward.
   */
  const talkTo = useCallback(
    (
      personId: EntityId,
      subject?: ConversationSubjectKey,
      invoker: "scene" | "panel" = "scene",
    ) => {
      if (readOnly) return;
      const entry = openConversationWith(
        session.world,
        session.personId,
        personId,
      );
      if (entry.kind === "unavailable") return;
      setReturnFocusPrefer(invoker);
      dispatch({
        type: "set-conversation",
        subject: subject ?? entry.subject,
        addressee: personId,
      });
      dispatch({ type: "talk-in-scene", personId });
    },
    [session.world, session.personId, dispatch, readOnly],
  );

  /* A conversation cannot go on once nobody is played. */
  useEffect(() => {
    if (readOnly) dispatch({ type: "end-conversation" });
  }, [readOnly, dispatch]);

  /*
   * The continuation view. Over the room whenever the played life has ended
   * and nothing has been chosen; while observing, opened from the Observing
   * bar and put away again with Escape or Keep observing.
   */
  const [continuationOpen, setContinuationOpen] = useState(false);
  const observingButton = useRef<HTMLButtonElement>(null);
  const closeContinuation = useCallback(() => {
    setContinuationOpen(false);
    requestAnimationFrame(() => observingButton.current?.focus());
  }, []);
  const showContinuation =
    continuation !== null &&
    view.surface === "scene" &&
    (!observing || continuationOpen);

  const nativeSave = useRef(() => Promise.resolve(false));
  nativeSave.current = () =>
    onKeep({
      pins: shell.pins,
      preferences: shell.preferences,
      journal: shell.legacyJournal,
      journals: shell.journals,
      personWardrobes: shell.personWardrobes,
      progress: shell.progress,
    });
  useEffect(() => {
    const save = (event: Event) => {
      const request = event as NativeSaveRequest;
      if (typeof request.detail?.complete !== "function") return;
      event.preventDefault();
      void nativeSave
        .current()
        .then(request.detail.complete, () => request.detail.complete(false));
    };
    window.addEventListener(NATIVE_SAVE_EVENT, save);
    return () => window.removeEventListener(NATIVE_SAVE_EVENT, save);
  }, []);

  const needsLeaveConfirmation = true;
  const [savingToTitle, setSavingToTitle] = useState(false);
  useEffect(() => {
    if (!savingToTitle) return;
    const keepSaving = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener("keydown", keepSaving, true);
    return () => document.removeEventListener("keydown", keepSaving, true);
  }, [savingToTitle]);

  function leaveNow() {
    if (returnToTitleRequest.current) {
      returnToTitleRequest.current.leaving = true;
    }
    onLeave();
  }

  function beginReturnToTitle(fromHub: boolean) {
    if (returnToTitleRequest.current || savingToTitle) return;
    returnToTitleRequest.current = { fromHub, leaving: false };
    dispatch({ type: "ask-leave" });
  }

  async function saveAndReturnToTitle() {
    if (savingToTitle) return;
    const request = returnToTitleRequest.current;
    if (request) request.leaving = true;
    setSavingToTitle(true);
    try {
      const saved = await onSaveAndLeave({
        pins: shell.pins,
        preferences: shell.preferences,
        journal: shell.legacyJournal,
        journals: shell.journals,
        personWardrobes: shell.personWardrobes,
        progress: shell.progress,
      });
      if (!saved && request) {
        request.leaving = false;
        returnToTitleRequest.current = request;
      }
    } finally {
      setSavingToTitle(false);
    }
  }

  // The desktop hub asks through a DOM event; see return-to-title-bridge.
  const beginReturnToTitleRef = useRef(beginReturnToTitle);
  beginReturnToTitleRef.current = beginReturnToTitle;
  const leaveFlowOpen = shell.confirmingLeave;
  useEffect(() => {
    function onRequest(event: Event) {
      event.preventDefault();
      if (leaveFlowOpen || returnToTitleRequest.current) return;
      beginReturnToTitleRef.current(true);
    }
    window.addEventListener(RETURN_TO_TITLE_REQUEST_EVENT, onRequest);
    return () =>
      window.removeEventListener(RETURN_TO_TITLE_REQUEST_EVENT, onRequest);
  }, [leaveFlowOpen, returnToTitleRequest]);

  // Stay or Escape closes the question without leaving.
  const wasConfirmingLeave = useRef(leaveFlowOpen);
  useEffect(() => {
    const closed = wasConfirmingLeave.current && !leaveFlowOpen;
    wasConfirmingLeave.current = leaveFlowOpen;
    const request = returnToTitleRequest.current;
    if (closed && request && !request.leaving) onReturnToTitleCancelled();
  }, [leaveFlowOpen, returnToTitleRequest, onReturnToTitleCancelled]);

  const workspace = renderWorkspace({
    view,
    session,
    shell,
    dispatch,
    capabilities,
    assignment,
    floorNote,
    onWorldChange,
    openEntity,
    dossierFor,
    talkTo,
    openTheBill,
    goToTheFloor,
    goToTheFloorFor,
    workHint,
    readOnly,
    retireFromPlay: readOnly ? null : (
      <RetireFromPlayAction
        name={moment.personName}
        onRetire={() => {
          try {
            const next = retireFromPlay(storedSession.world, session.personId);
            onControlChange(next, storedSession.world, { kind: "retired" });
            dispatch({ type: "go-to-scene" });
            return null;
          } catch (error) {
            return error instanceof Error
              ? error.message
              : "This character could not be retired from play.";
          }
        }}
      />
    ),
    guideTermKey,
    onOpenGuideTerm: setGuideTermKey,
    returnToTitle: (
      <ReturnToTitleAction
        needsConfirmation={needsLeaveConfirmation}
        confirming={shell.confirmingLeave}
        onAskConfirmation={() => beginReturnToTitle(false)}
        onLeave={() => beginReturnToTitle(false)}
      />
    ),
  });

  return (
    <TimeCommandProvider runner={timeRunner}>
      <SavedAppearanceProvider value={shell.personWardrobes}>
        <SavedRenderSnapshotsProvider value={renderSnapshots}>
          <main
            className="life-shell"
            data-testid="play-screen"
            data-scene-id={sceneId ?? ""}
            data-scene-purpose={playScene.purpose}
          >
            <InvokerFocusReturn
              personId={conversation ? null : returnFocusTo}
              prefer={returnFocusPrefer}
              onDone={clearReturnFocus}
            />
            {/*
        THE ROOM IS THE SURFACE.

        The scene — with the generated household standing on its own anchors —
        is the whole surface, the current moment is a compact panel over it, the
        people this life has are a rail on the right, and everything else is a
        quiet cluster in the corner that grows as you reach for it.
      */}
            {previewBanner ? (
              /*
               * Said out loud, on the screen, for as long as the mode is on.
               * A preview that looked like the game would be worse than no
               * preview: somebody would screenshot unreleased art as if it had
               * been approved. `role="status"` so it is announced rather than
               * only seen.
               *
               * `data-candidate-art` carries the state the sentence describes,
               * so a test can ask whether the bank is actually being drawn
               * without pinning the wording. It reads "false" in every
               * checkout a machine can make, because the bank is owner-private
               * and absent from all of them.
               */
              <p
                className="art-preview-banner"
                role="status"
                data-testid="art-preview-banner"
                data-candidate-art={previewShowsCandidateArt ? "true" : "false"}
              >
                {previewBanner}
              </p>
            ) : null}
            <SceneBackdrop
              sceneId={sceneId}
              readableSurfaces={readableSurfaces}
              onOpenSurfaceEntity={openEntity}
              visualLibrary={sceneVisuals}
              people={scenePeople}
              surfaces={{
                ...surfaceProjection,
                facts: new Map(
                  [...surfaceProjection.facts].filter(
                    ([key, fact]) =>
                      key !== "headline" || fact.channel !== "published",
                  ),
                ),
              }}
              /*
               * UI9-03. The people in the room ARE the selection surface now.
               * The rail that used to sit above them filled itself from whoever
               * was present, which made it a second automatic roster nobody
               * asked for; the one rail that persists is the pin rail, and it
               * only ever holds what the player put there.
               */
              selectedPersonId={shell.quickDossierPersonId}
              onSelectPerson={(personId) => {
                const button = document.querySelector<HTMLElement>(
                  `[data-testid="scene-person-${personId}"]`,
                );
                const box = button?.getBoundingClientRect();
                setCardAnchor(
                  box
                    ? {
                        personId: personId as EntityId,
                        rect: {
                          left: box.left,
                          top: box.top,
                          width: box.width,
                          height: box.height,
                        },
                      }
                    : null,
                );
                dispatch({
                  type: "open-quick-dossier",
                  personId: personId as EntityId,
                });
              }}
            >
              {view.surface === "scene" &&
              !readOnly &&
              !showOrientation &&
              !conversation ? (
                <OrdinaryMeetingPanel
                  world={session.world}
                  personId={session.personId}
                  onWorldChange={onWorldChange}
                  onOpenEntity={openEntity}
                />
              ) : null}
              {view.surface === "scene" && !readOnly ? (
                <OpeningLifeFlow
                  key={`${session.world.id}:${session.personId}`}
                  /*
                    The room's own seam, wired at last. The moment is the
                    panel's body; the room offers it and the player opens it,
                    because a panel standing permanently over a full room
                    covers whoever is standing where it lands. A conversation
                    and the first orientation are full surfaces of their own,
                    so the moment is not offered underneath them.
                  */
                  pendingAvailable={!conversation && !showOrientation}
                  pendingOpen={shell.momentOpen}
                  pendingLife={
                    <StoryView
                      session={session}
                      moment={projectStoryMoment(
                        session.world,
                        session.personId,
                      )}
                      onWorldChange={onWorldChange}
                    />
                  }
                  onOpenPending={() => dispatch({ type: "open-moment" })}
                  onClosePending={() => dispatch({ type: "close-moment" })}
                  world={session.world}
                  playerPersonId={session.personId}
                  onWorldChange={onWorldChange}
                  transitionHandlers={createCampaignElectionTransitionRegistry()}
                  onTalkTo={(personId) => talkTo(personId, undefined, "panel")}
                  returnFocusTo={returnFocusTo}
                  onFocusReturned={() => setReturnFocusTo(null)}
                  foreground={
                    conversation && view.surface === "scene" ? (
                      <SceneConversation
                        key={conversation.subject}
                        world={session.world}
                        playerPersonId={session.personId}
                        subject={conversation.subject}
                        addressee={conversation.addressee}
                        onWorldChange={onWorldChange}
                        onChange={(next) =>
                          dispatch({ type: "set-conversation", ...next })
                        }
                        onBack={() => {
                          const facing = conversation.addressee;
                          dispatch({ type: "end-conversation" });
                          // Started from a record: Back returns to that record.
                          if (canGoBack(shell)) {
                            dispatch({ type: "back" });
                            requestAnimationFrame(() =>
                              document
                                .querySelector<HTMLElement>(
                                  ".pg-workspace-controls button",
                                )
                                ?.focus(),
                            );
                            return;
                          }
                          if (facing !== "everyone") setReturnFocusTo(facing);
                        }}
                        transitionHandlers={createCampaignElectionTransitionRegistry()}
                      />
                    ) : showOrientation ? (
                      <WorldOrientationPanel
                        world={session.world}
                        personId={session.personId}
                        view={orientation.view}
                        homeStateUsps={orientation.homeStateUsps}
                        regionalPlate={orientation.regionalPlate}
                        mode="first"
                        onClose={() => dispatch({ type: "finish-orientation" })}
                        onOpenPerson={(personId) =>
                          dispatch({ type: "open-quick-dossier", personId })
                        }
                      />
                    ) : null
                  }
                />
              ) : null}
            </SceneBackdrop>

            {selectedDossier ? (
              <QuickDossier
                world={session.world}
                playerId={session.personId}
                dossier={selectedDossier}
                anchor={
                  cardAnchor?.personId === selectedDossier.personId
                    ? cardAnchor.rect
                    : null
                }
                pinned={isPinned(shell, {
                  kind: "person",
                  id: selectedDossier.personId,
                })}
                onClose={() => dispatch({ type: "close-quick-dossier" })}
                onTogglePin={() =>
                  dispatch({
                    type: "toggle-pin",
                    ref: { kind: "person", id: selectedDossier.personId },
                  })
                }
                onOpenLink={openEntity}
                onOpenPerson={(personId) =>
                  dispatch({ type: "open-quick-dossier", personId })
                }
                {...(readOnly
                  ? {}
                  : { onTalk: () => talkTo(selectedDossier.personId) })}
                onMeet={() => dispatch({ type: "go-to-scene" })}
                onContact={() => {
                  dispatch({
                    type: "set-people-query",
                    query: selectedDossier.name,
                  });
                  dispatch({ type: "go-to-surface", surface: "people" });
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLElement>(
                        `[data-testid="contact-${selectedDossier.personId}"] button`,
                      )
                      ?.focus(),
                  );
                }}
                onTravel={() => {
                  if (readOnly) return;
                  const next = travelTowardsPerson(
                    session.world,
                    session.personId,
                    selectedDossier.personId,
                    {
                      presentPersonIds,
                      handlers: interruptionHandlers(
                        shell.preferences.interruptions,
                      ),
                    },
                  );
                  if (next !== session.world) {
                    onWorldChange(next);
                    dispatch({ type: "go-to-scene" });
                  }
                }}
                onFullRecord={() =>
                  openEntity({ kind: "person", id: selectedDossier.personId })
                }
                presentPersonIds={presentPersonIds}
                talkUnavailable={
                  readOnly
                    ? READ_ONLY_REFUSAL
                    : inspectTalkEntry?.kind === "unavailable"
                      ? inspectTalkEntry.reason
                      : null
                }
              />
            ) : null}

            {showContinuation && continuation ? (
              <LifeContinuationPanel
                world={storedSession.world}
                view={continuation}
                observing={observing}
                onCommit={(next, personId) => {
                  onControlChange(
                    next,
                    storedSession.world,
                    personId === null
                      ? { kind: "observing" }
                      : { kind: "continued", personId },
                  );
                  setContinuationOpen(false);
                  dispatch({ type: "go-to-scene" });
                }}
                onViewRecord={() =>
                  openEntity({
                    kind: "person",
                    id: continuation.recordPersonId,
                  })
                }
                {...(observing ? { onClose: closeContinuation } : {})}
              />
            ) : null}

            {observing ? (
              <div
                className="pg-observing"
                role="status"
                data-testid="observing-label"
              >
                <strong>Observing</strong>
                <span>Nobody is being played. You can look, not act.</span>
                {continuation && !showContinuation ? (
                  <button
                    ref={observingButton}
                    type="button"
                    className="ui-action ui-action--subtle"
                    data-testid="open-continuation"
                    onClick={() => {
                      setContinuationOpen(true);
                      dispatch({ type: "go-to-scene" });
                    }}
                  >
                    Who could be played next
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* The one answer to "is a line still waiting behind this?", read
                from the shell rather than re-derived here, so the offer and
                the reducer cannot disagree about whether there is one. */}
            {conversationSuspended(shell) && conversation ? (
              <button
                type="button"
                className="pg-talk-return"
                data-testid="conversation-return"
                onClick={() => dispatch({ type: "resume-conversation" })}
              >
                Return to conversation
                <small>
                  {conversation.addressee === "everyone"
                    ? "Everyone here"
                    : session.world.people[conversation.addressee]
                      ? personName(
                          session.world.people[conversation.addressee]!,
                        )
                      : "Someone"}
                  {pendingLine ? ` · ${pendingLine}` : ""}
                </small>
              </button>
            ) : null}

            {workspace}

            <div className="life-hud" data-testid="life-hud">
              {notice ? (
                <p className="life-hud-note" role="status">
                  {notice}
                </p>
              ) : null}
              {problem ? (
                <p
                  className="life-hud-note life-hud-note--problem"
                  role="status"
                >
                  {problem}
                </p>
              ) : null}
              {passOutcome ? (
                <p
                  className="life-hud-note life-hud-note--outcome"
                  role="status"
                  data-testid="pass-outcome"
                >
                  {passOutcome}
                  <button
                    type="button"
                    className="life-hud-dismiss"
                    aria-label="Dismiss"
                    onClick={() => setPassOutcome(null)}
                  >
                    ✕
                  </button>
                </p>
              ) : null}
              {crisisStop.stop ? (
                <p
                  className="life-hud-note life-hud-note--problem"
                  role="status"
                  data-testid="crisis-stop"
                >
                  {crisisStop.stop.sentence}
                  <button
                    type="button"
                    className="ui-action"
                    data-testid="crisis-stop-open"
                    onClick={() => {
                      crisisStop.clear();
                      dispatch(
                        crisisStop.stop?.target === "authority"
                          ? {
                              type: "go-to-surface",
                              surface: "work",
                              section: "office",
                            }
                          : { type: "go-to-surface", surface: "personal" },
                      );
                    }}
                  >
                    Go to it
                  </button>
                  <button
                    type="button"
                    className="life-hud-dismiss"
                    aria-label="Dismiss"
                    onClick={crisisStop.clear}
                  >
                    ✕
                  </button>
                </p>
              ) : null}
              {recap ? (
                <WorldRecapPanel
                  recap={recap}
                  onDismiss={(throughSequence) =>
                    dispatch({ type: "acknowledge-recap", throughSequence })
                  }
                  onOpenNews={() =>
                    dispatch({ type: "go-to-surface", surface: "news" })
                  }
                  onOpenPerson={(personId) =>
                    dispatch({ type: "open-quick-dossier", personId })
                  }
                />
              ) : null}
              {session.unsavedSeed !== null ? (
                <p className="sr-only" data-testid="unsaved-note">
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
            {!showOrientation || shell.confirmingLeave ? (
              <ShellNav
                state={shell}
                dispatch={dispatch}
                playerName={observing ? "Observing" : moment.personName}
                portrait={
                  !observing && session.world.people[session.personId] ? (
                    <PersonPortrait
                      world={session.world}
                      personId={session.personId}
                    />
                  ) : null
                }
                dateLabel={moment.dateLabel}
                placeName={moment.placeName}
                destinations={destinations}
                canSave={!savesUnavailable}
                unsaved={session.saveId === null}
                leaving={savingToTitle}
                leaveProblem={problem}
                onAskLeave={() => beginReturnToTitle(false)}
                onSave={() => {
                  const shellState = {
                    pins: shell.pins,
                    preferences: shell.preferences,
                    journal: shell.legacyJournal,
                    journals: shell.journals,
                    personWardrobes: shell.personWardrobes,
                    progress: shell.progress,
                  };
                  void onKeep(shellState);
                }}
                onSaveAndLeave={() => void saveAndReturnToTitle()}
                onLeave={leaveNow}
                {...(capabilities.formativeYears || readOnly
                  ? {}
                  : { onPassDays: passDays, passTargets })}
                passing={timeRunner.pending}
              />
            ) : null}

            <ShellPinRail
              world={session.world}
              state={shell}
              dispatch={dispatch}
              onOpen={openEntity}
            />

            <PlayerVersion />

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
    </TimeCommandProvider>
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
  onWorldChange,
  openEntity,
  dossierFor,
  talkTo,
  openTheBill,
  goToTheFloor,
  goToTheFloorFor,
  workHint,
  readOnly,
  retireFromPlay,
  guideTermKey,
  onOpenGuideTerm,
  returnToTitle,
}: {
  readonly view: ReturnType<typeof activeView>;
  readonly session: Session;
  readonly shell: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly capabilities: ReturnType<typeof resolvePlayerCapabilities>;
  readonly assignment: LegislativeAssignment | null;
  readonly floorNote: string | null;
  readonly onWorldChange: (world: World) => void;
  readonly openEntity: (ref: ShellRef) => void;
  readonly dossierFor: (personId: EntityId) => PersonDossier | null;
  readonly talkTo: (
    personId: EntityId,
    subject?: ConversationSubjectKey,
  ) => void;
  readonly openTheBill: () => void;
  readonly goToTheFloor: () => void;
  readonly goToTheFloorFor: (bill: DocketBill) => void;
  readonly workHint: string;
  /** Nobody is played, or the played life ended: reading surfaces only. */
  readonly readOnly: boolean;
  /** Options' Retire from play, or null when there is nobody to retire. */
  readonly retireFromPlay: ReactNode;
  /**
   * The term the Guide should open on, and how inline help asks for one.
   *
   * The shell owns this rather than the Guide, because inline help lives on
   * every other workspace and has to say which entry it meant before the
   * Guide is the open surface. It is presentation only and is not saved.
   */
  readonly guideTermKey: string | null;
  readonly onOpenGuideTerm: (semanticKey: string) => void;
  /** The in-game Options way back to the title screen. */
  readonly returnToTitle: ReactNode;
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
  /* Only a record this world has can be pinned; a missing one says so below. */
  const entityPinToggle = (ref: ShellRef, testid: string) => {
    const label = labelForRef(session.world, ref);
    if (label === null) return null;
    return (
      <p className="pg-entity-pin">
        <PinToggle
          pinned={pinnedRef(ref)}
          name={label}
          testid={testid}
          onToggle={() => togglePin(ref)}
        />
      </p>
    );
  };
  /*
   * A local party chapter. Each button is an explicit choice routed to W's
   * writers; opening the surface or its pin changes nothing. Going to a
   * meeting runs the ordinary journey and meeting time, then returns to the
   * room so the player is where the clock says they are.
   */
  const chapterSurface = (chapter: PartyChapterView) => (
    <PartyChapterSurface
      key={chapter.organizationId}
      chapter={chapter}
      contact={
        chapter.contact ? (
          <ContactsPanel
            world={session.world}
            personId={session.personId}
            contactEntry={chapter.contact}
            onWorldChange={onWorldChange}
          />
        ) : null
      }
      pinned={pinnedRef({ kind: "organization", id: chapter.organizationId })}
      onTogglePin={() =>
        togglePin({ kind: "organization", id: chapter.organizationId })
      }
      onOpenPerson={openPerson}
      onMeeting={(action, activityId) => {
        const next =
          action === "accept"
            ? acceptChapterInvitation(
                session.world,
                session.personId,
                activityId,
              )
            : action === "decline"
              ? declineVenueActivity(
                  session.world,
                  session.personId,
                  activityId,
                )
              : attendChapterMeeting(
                  session.world,
                  session.personId,
                  activityId,
                  createCampaignElectionTransitionRegistry(),
                );
        if (next === session.world) return;
        onWorldChange(next);
        if (action === "attend") dispatch({ type: "go-to-scene" });
      }}
      onJoin={() => {
        const next = joinPartyChapter(
          session.world,
          session.personId,
          chapter.organizationId,
        );
        if (next !== session.world) onWorldChange(next);
      }}
      onLeave={() => {
        const next = leavePartyChapter(
          session.world,
          session.personId,
          chapter.organizationId,
        );
        if (next !== session.world) onWorldChange(next);
      }}
    />
  );

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
      /*
       * An officeholder named here opens the same record they open anywhere
       * else. `openEntity` is the shell's one route to a person — it pushes
       * onto the shared history, so Back comes back HERE rather than to
       * wherever the player last was, and the record is the canonical dossier
       * rather than a second one built for this surface.
       */
      onOpenPerson={(personId) => openEntity({ kind: "person", id: personId })}
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

  /*
   * The Politics hub (UI DECISION FOLLOW-THROUGH): one tab strip over the
   * existing political surfaces. Tabs only navigate; every mechanism stays in
   * the surface that owns it.
   *
   * CRUNCH47 A1: a tab is a subroute of the hub, not a second place to come
   * back through. Menu entries still add a level; these replace the one the
   * hub already occupies, so one Back from any tab leaves the hub — and lands
   * on a conversation waiting in the room rather than on the tab passed
   * through on the way in.
   */
  const politicsTabs = (
    active: PoliticsTab,
    section?: "budget" | "transit" | "tax" | "overview" | "map" | "records",
  ) => {
    const goTo = (tab: PoliticsTab) => {
      if (tab === "office")
        dispatch({
          type: "go-to-subroute",
          surface: "work",
          section: "office",
        });
      else if (tab === "campaigns")
        dispatch({
          type: "go-to-subroute",
          surface: "work",
          section: "campaign",
        });
      else if (tab === "government")
        dispatch({ type: "go-to-subroute", surface: "government" });
      else if (tab === "parties")
        dispatch({ type: "go-to-subroute", surface: "parties" });
      else dispatch({ type: "go-to-subroute", surface: "politics" });
    };
    /*
     * Transit and tax configuration are an office's tools: offered only to a
     * life whose office can use them or that has such a record to follow.
     */
    const access =
      active === "issues"
        ? politicsIssueAccess(session.world, session.personId)
        : null;
    const subItems =
      active === "issues"
        ? [
            { key: "budget", label: "Budget and constitution" },
            ...(access?.transit || section === "transit"
              ? [{ key: "transit", label: "Transit" }]
              : []),
            ...(access?.tax || section === "tax"
              ? [{ key: "tax", label: "Taxes" }]
              : []),
          ]
        : active === "government"
          ? [
              { key: "overview", label: "Who governs" },
              { key: "map", label: "Map" },
              { key: "records", label: "Local meetings and records" },
            ]
          : [];
    return (
      <PoliticsTabs
        active={active}
        onSelect={goTo}
        hidden={
          capabilities.formativeYears || readOnly ? ["office", "campaigns"] : []
        }
        subItems={subItems.map((item) => ({
          ...item,
          current: item.key === section,
          testid: `politics-sub-${item.key}`,
        }))}
        onSelectSub={(key) => {
          const surface =
            key === "budget"
              ? "politics"
              : key === "records"
                ? "municipal"
                : key === "overview"
                  ? "government"
                  : key === "map"
                    ? "government-map"
                    : key === "transit"
                      ? "transit"
                      : "tax";
          dispatch({ type: "go-to-subroute", surface });
        }}
      />
    );
  };

  /*
   * Inline term help reaches every workspace from here.
   *
   * A surface that mentions an institutional word wraps it in `GuideTerm` and
   * needs nothing else: the shell owns the learned list, because it is a saved
   * presentation preference, and the shell owns navigation into the Guide.
   */
  const frame = (
    title: string,
    testid: string,
    body: ReactNode,
    kicker?: string,
  ) => (
    <WorkspaceFrame
      title={title}
      {...(shell.preferences.workspaceLayouts?.[testid]
        ? { layout: shell.preferences.workspaceLayouts[testid] }
        : {})}
      onLayoutChange={(layout) =>
        dispatch({ type: "set-workspace-layout", key: testid, layout })
      }
      {...(kicker === undefined ? {} : { kicker })}
      testid={testid}
      canGoBack={backable}
      onBack={back}
      onClose={close}
    >
      <GuideHelpProvider
        help={{
          learnedKeys: shell.preferences.learnedGuideTermKeys,
          setLearned: (semanticKey, learned) =>
            dispatch({ type: "set-guide-term-learned", semanticKey, learned }),
          openGuide: (semanticKey) => {
            onOpenGuideTerm(semanticKey);
            dispatch({ type: "go-to-surface", surface: "guide" });
          },
        }}
      >
        {body}
      </GuideHelpProvider>
    </WorkspaceFrame>
  );

  if (readOnly && !surfaceOpenWhileReadOnly(view.surface)) {
    return frame(
      "Not while observing",
      "read-only-workspace",
      <p className="game-note" data-testid="read-only-note">
        {READ_ONLY_REFUSAL}
      </p>,
    );
  }

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
            playerId={session.personId}
            dossier={dossier}
            pinned={pinnedRef({ kind: "person", id: dossier.personId })}
            onTogglePin={() =>
              togglePin({ kind: "person", id: dossier.personId })
            }
            onTalk={() => talkTo(dossier.personId)}
            onContact={() => {
              dispatch({ type: "set-people-query", query: dossier.name });
              dispatch({ type: "go-to-surface", surface: "people" });
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(
                    `[data-testid="contact-${dossier.personId}"] button`,
                  )
                  ?.focus(),
              );
            }}
            onMeet={() => dispatch({ type: "go-to-scene" })}
            talkUnavailable={entry.kind === "unavailable" ? entry.reason : null}
            onOpenLink={openEntity}
            onOpenPerson={(personId) =>
              openEntity({ kind: "person", id: personId })
            }
          />
        </>,
        "Record",
      );
    }
    if (view.ref.kind === "commitment") {
      return frame(
        "Commitment",
        "commitment-workspace",
        <>
          {entityPinToggle(view.ref, "commitment-pin")}
          <CommitmentSurface
            world={session.world}
            personId={session.personId}
            activityId={view.ref.id}
          />
        </>,
        "Calendar",
      );
    }
    if (view.ref.kind === "measure") {
      return frame(
        "Measure",
        "measure-workspace",
        <>
          {entityPinToggle(view.ref, "measure-pin")}
          <MeasureSurface
            world={session.world}
            personId={session.personId}
            measureId={view.ref.id}
          />
        </>,
        "Legislation",
      );
    }
    if (view.ref.kind === "organization") {
      const chapter = projectPartyChapter(
        session.world,
        session.personId,
        view.ref.id,
      );
      return frame(
        chapter?.name ?? "Unavailable",
        "chapter-workspace",
        chapter ? (
          chapterSurface(chapter)
        ) : (
          <p className="game-note" data-testid="organization-missing">
            This world has no record of that organization.
          </p>
        ),
        "Record",
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
    case "calendar":
      /*
       * Calendar opens on today: what is happening, what is next, what is
       * waiting, then the upcoming and ongoing entries with their actions,
       * with History and the interruption checklist a tab away. The old
       * "Today" surface is the first tab here rather than a second page.
       */
      return frame(
        "Calendar",
        "calendar-workspace",
        <CalendarWorkspaceSurface
          world={session.world}
          personId={session.personId}
          isPinnedRef={pinnedRef}
          onOpen={openEntity}
          onTogglePin={togglePin}
          onWorldChange={onWorldChange}
          interruptions={shell.preferences.interruptions}
          onInterruptionChange={(key, value) =>
            dispatch({ type: "set-interruption", key, value })
          }
          today={
            <TodayView
              session={session}
              onWorldChange={onWorldChange}
              workHint={workHint}
              embedded
              onOpenCommitment={(activityId) =>
                openEntity({ kind: "commitment", id: activityId })
              }
              onOpenPerson={(personId) =>
                openEntity({ kind: "person", id: personId })
              }
              /*
                The same link the standalone Today has, going the same place.
                This copy forced section: "office", so the one control landed
                on the whole Work record from Today and on the office half
                from the Calendar's Today — and a life with no office got the
                empty half, with its jobs and hiring hidden behind a tab.
              */
              onGoTo={(surface) => dispatch({ type: "go-to-surface", surface })}
            />
          }
        />,
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
          />
          {/*
            PEOPLE's two reading seams, on the surface People already means:
            who this life can reach and what is outstanding between them, and
            what they can be expected to remember. A recall card opens the
            person through the same `openEntity` everything else uses, so Back
            returns to the card.
          */}
          <ContactsPanel
            query={shell.peopleQuery}
            world={session.world}
            personId={session.personId}
            onWorldChange={onWorldChange}
          />
          <RecallCardsPanel
            world={session.world}
            personId={session.personId}
            onOpenEntity={openEntity}
          />
          {/*
            What this life can actually talk about, in the room it is in — as
            ways to START a conversation. They used to be every conversation
            drawn in full, one under another; choosing one now opens it in the
            conversation box in the room, the same box every other route
            opens.
          */}
          {!readOnly &&
            !completedActivityHere(session.world, session.personId) && (
              <ConversationStarters
                world={session.world}
                personId={session.personId}
                onStart={(personId, subject) => talkTo(personId, subject)}
              />
            )}
        </>,
      );

    case "personal":
      return frame(
        view.section === "finances" ? "Money and property" : "Who you are",
        "personal-workspace",
        <>
          {view.section !== "finances" && (
            <PersonalRoutinePanel
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
              onOpenEntity={openEntity}
              onTogglePin={togglePin}
              isPinned={pinnedRef}
            />
          )}
          <PersonalWorkspace
            world={session.world}
            personId={session.personId}
            {...(view.section ? { section: view.section } : {})}
            onOpenPerson={openPerson}
          />
          {view.section !== "finances" && (
            <>
              <PersonalGoalsPanel
                world={session.world}
                personId={session.personId}
                onWorldChange={onWorldChange}
                onOpportunity={(opportunity) => {
                  if (opportunity.kind === "talk" && opportunity.personId) {
                    talkTo(
                      opportunity.personId,
                      (opportunity.subject ?? undefined) as
                        ConversationSubjectKey | undefined,
                    );
                  } else if (opportunity.kind === "read-news") {
                    dispatch({ type: "go-to-surface", surface: "news" });
                  } else {
                    dispatch({
                      type: "go-to-surface",
                      surface: "work",
                      section: "campaign",
                    });
                  }
                }}
              />
              <CrisisNoticesPanel
                world={session.world}
                personId={session.personId}
                onWorldChange={onWorldChange}
                scope="personal"
              />
            </>
          )}
          <details data-testid="personal-life-choices">
            <summary>Your day, choices and pending favors</summary>
            {/*
              Childhood is part of the day, not a place to go, so it mounts
              inside this existing section rather than on a surface of its own.
              It draws nothing outside the formative years; the producer gates
              that, and no age logic is decided here.
            */}
            <ChildhoodMomentPanel
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
            />
            <LifeScenePanel
              world={session.world}
              playerPersonId={session.personId}
              onWorldChange={onWorldChange}
              onTalkTo={(personId) => talkTo(personId)}
              transitionHandlers={createCampaignElectionTransitionRegistry()}
              variant="workspace"
            />
          </details>
        </>,
      );

    case "places":
      return frame(
        "Places",
        "places-workspace",
        <PlacesWorkspace
          world={session.world}
          personId={session.personId}
          onWorldChange={onWorldChange}
          /*
           * The same routes everything else uses. `openEntity` is what the
           * dossier, the rail and the pin rail call, so a government or person
           * opened from Places lands on the canonical record and Back behaves
           * as it does everywhere — because it is one history, not a second
           * navigation stack inside a workspace.
           */
          onOpenEntity={(ref) => openEntity(ref)}
          onTogglePin={(ref) => togglePin(ref)}
          isPinned={pinnedRef}
          transitionHandlers={createCampaignElectionTransitionRegistry()}
        />,
      );

    case "municipal":
      return frame(
        "Local government",
        "municipal-workspace",
        <>
          {politicsTabs("government", "records")}
          {municipalSurface()}
        </>,
      );

    case "parties": {
      const chapters = projectPartyChapters(session.world, session.personId);
      return frame(
        "Local party chapters",
        "parties-workspace",
        <>
          {politicsTabs("parties")}
          {/*
            Party and community work reads as party business, so it sits at the
            top of Politics > Parties, above the chapters it is transacted with.
            The Campaigns surface mounts the same panel for a candidate who is
            already running; the two are never on screen together, because
            renderWorkspace draws one workspace at a time.
          */}
          <CampaignLifePanel
            world={session.world}
            personId={session.personId}
            onWorldChange={onWorldChange}
            transitionHandlers={createCampaignElectionTransitionRegistry()}
          />
          {chapters.length > 0 ? (
            <>{chapters.map(chapterSurface)}</>
          ) : (
            <p className="game-note" data-testid="parties-none">
              No local party chapters are recorded where you live.
            </p>
          )}
          <PartyInitiativesPanel
            world={session.world}
            personId={session.personId}
            onWorldChange={(next) => onWorldChange(next)}
          />
        </>,
      );
    }

    case "news":
      return frame(
        "News",
        "news-workspace",
        <NewsDesk
          world={session.world}
          context={
            view.section === "news-around"
              ? "around"
              : view.section === "news-directory"
                ? "directory"
                : view.section === "news-press"
                  ? "press"
                  : "read"
          }
          onContextChange={(context) =>
            dispatch({
              // A News context is a section of the News desk, not a level.
              type: "go-to-subroute",
              surface: "news",
              ...(context === "read"
                ? {}
                : { section: `news-${context}` as const }),
            })
          }
          mode={shell.preferences.newsMode}
          outletKey={shell.preferences.newsOutletKey}
          onModeChange={(newsMode) =>
            dispatch({ type: "set-reader-preferences", patch: { newsMode } })
          }
          onOutletChange={(newsOutletKey) =>
            dispatch({
              type: "set-reader-preferences",
              patch: { newsOutletKey },
            })
          }
          onOpenPerson={openPerson}
          around={
            <>
              <WorldOrientationEntry
                world={session.world}
                personId={session.personId}
                onOpenPerson={openPerson}
              />
              <World39News
                world={session.world}
                personId={session.personId}
                onOpenPerson={openPerson}
              />
            </>
          }
          directory={
            <PublicInformationPanel
              model={projectPublicInformationPanel(session.world)}
              onClose={back}
              showClose={false}
              onOpenPerson={openPerson}
              viewerPersonId={session.personId}
              followedOutletKeys={shell.preferences.followedNewsOutletKeys}
              onToggleOutletFollow={(outletKey) =>
                dispatch({ type: "toggle-news-outlet-follow", outletKey })
              }
            />
          }
          press={
            <>
              <PressWorkspace
                world={session.world}
                onWorldChange={onWorldChange}
                onOpenPerson={openPerson}
              />
              {/*
                Being a source is press-office business, so it mounts in this
                separate context and never on the News front page: reading the
                news and talking to a reporter are different things, and a
                disclosure control beside the headlines would blur them.
              */}
              <PressSourceDesk
                world={session.world}
                personId={session.personId}
                onWorldChange={onWorldChange}
              />
            </>
          }
        />,
      );

    case "government":
      return frame(
        "Government",
        "government-workspace",
        <>
          {politicsTabs("government", "overview")}
          <GovernmentBrowser
            world={session.world}
            personId={session.personId}
            place={shell.preferences.politicsPlace}
            scope={shell.preferences.governmentScope}
            onSelectionChange={(patch) =>
              dispatch({ type: "set-reader-preferences", patch })
            }
            onOpenPerson={(holderId) =>
              dispatch({ type: "open-quick-dossier", personId: holderId })
            }
            onOpenMeasure={(measureId) =>
              openEntity({ kind: "measure", id: measureId })
            }
          />
        </>,
        "Politics",
      );

    case "government-map":
      return frame(
        "Government map",
        "government-map-workspace",
        <>
          {politicsTabs("government", "map")}
          <Suspense
            fallback={
              <p className="game-note" role="status">
                Loading the map…
              </p>
            }
          >
            <PoliticalMap
              world={session.world}
              personId={session.personId}
              preferences={shell.preferences.map}
              onPreferencesChange={(preferences) =>
                dispatch({ type: "set-map-preferences", preferences })
              }
              onOpenPerson={(personId) =>
                dispatch({ type: "open-quick-dossier", personId })
              }
              onOpenMeasure={(measureId) =>
                openEntity({ kind: "measure", id: measureId })
              }
              focus={mapFocusForPins(shell.pins)}
            />
          </Suspense>
        </>,
        "Politics",
      );

    case "politics": {
      // Issues follows the place and level chosen in Government.
      const issuesPlace = issuesPlaceForSelection(
        session.world,
        session.personId,
        {
          place: shell.preferences.politicsPlace,
          scope: shell.preferences.governmentScope,
        },
      );
      return frame(
        "Politics",
        "politics-workspace",
        <>
          {politicsTabs("issues", "budget")}
          <p className="game-note" data-testid="politics-budget-scope">
            Public finances shown for {issuesPlace.label}. Change the place in
            Government.
          </p>
          {issuesPlace.note ? (
            <p className="game-note" role="status">
              {issuesPlace.note}
            </p>
          ) : null}
          {issuesPlace.jurisdictionId ? (
            <PublicServicePanel
              world={session.world}
              jurisdictionId={issuesPlace.jurisdictionId}
              placeLabel={issuesPlace.label}
            />
          ) : null}
          {(session.world.history.nationalElections ?? []).map((election) => (
            <NationalElectionResults
              key={election.id}
              world={session.world}
              electionId={election.id}
            />
          ))}
          {issuesPlace.jurisdictionId ? (
            <PoliticsWorkspace
              world={session.world}
              jurisdictionId={issuesPlace.jurisdictionId}
              personId={session.personId}
              onWorldChange={onWorldChange}
            />
          ) : null}
        </>,
        "Budget & economy",
      );
    }

    case "transit":
      return frame(
        "Transit service",
        "transit-workspace",
        <>
          {politicsTabs("issues", "transit")}
          {!politicsIssueAccess(session.world, session.personId).transit ? (
            <p className="game-note" data-testid="transit-withheld">
              {ISSUE_WITHHELD.transit}
            </p>
          ) : (
            <TransitWorkspace
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
              onOpenBill={(docketKey) => {
                const bill = projectTransitWork(
                  session.world,
                  session.personId,
                ).bills.find(
                  (entry) => entry.bill.docketKey === docketKey,
                )?.bill;
                if (!bill) return;
                if (capabilities.legislativeScenarioKey === bill.scenarioKey) {
                  onWorldChange(
                    selectDocketBill(
                      session.world,
                      bill.scenarioKey,
                      session.personId,
                      docketKey,
                    ),
                  );
                  dispatch({ type: "go-to-surface", surface: "work" });
                } else openEntity({ kind: "measure", id: bill.measureId });
              }}
            />
          )}
        </>,
        "Politics",
      );

    case "tax":
      return frame(
        "Taxes and public receipts",
        "tax-workspace",
        <>
          {politicsTabs("issues", "tax")}
          {politicsIssueAccess(session.world, session.personId).tax ? (
            <TaxWorkWorkspace
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
              onOpenMeasure={(measureId) =>
                openEntity({ kind: "measure", id: measureId })
              }
            />
          ) : (
            <p className="game-note" data-testid="tax-withheld">
              {ISSUE_WITHHELD.tax}
            </p>
          )}
        </>,
        "Politics",
      );

    case "journal":
      return frame(
        "Journal",
        "journal",
        <World39Journal
          view={shell.preferences.journalView}
          year={shell.preferences.journalYear}
          onViewChange={(journalView) =>
            dispatch({ type: "set-reader-preferences", patch: { journalView } })
          }
          onYearChange={(journalYear) =>
            dispatch({ type: "set-reader-preferences", patch: { journalYear } })
          }
          journal={shell.journals[session.personId] ?? EMPTY_JOURNAL}
          onJournalChange={(journal) =>
            dispatch({
              type: "set-journal",
              personId: session.personId,
              journal,
            })
          }
          world={session.world}
          personId={session.personId}
          onOpenPerson={openPerson}
        />,
      );

    case "guide":
      return frame(
        "Guide",
        "guide-workspace",
        <GuideWorkspace
          learnedKeys={shell.preferences.learnedGuideTermKeys}
          openKey={guideTermKey}
          onSetLearned={(semanticKey, learned) =>
            dispatch({ type: "set-guide-term-learned", semanticKey, learned })
          }
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
        <>
          <OptionsWorkspace
            state={shell}
            dispatch={dispatch}
            onOpenPatchNotes={() =>
              dispatch({ type: "go-to-surface", surface: "patch-notes" })
            }
          />
          <ContentPackWorkspace
            world={session.world}
            onWorldChange={onWorldChange}
          />
          {retireFromPlay}
          {returnToTitle}
        </>,
      );

    case "candidacy":
    case "work": {
      /*
       * Work, for every life, in one predictable order.
       *
       * This used to be four different screens depending on who the character
       * was — a judge got only the court, an executive only the inbox, a
       * member the office with study and jobs folded in, everybody else study
       * and jobs alone — while the campaign lived under the day for all of
       * them. A player could not know where anything was without knowing which
       * of those lives the game thought they were in. Now it says who they
       * are at work first, then the same sections in the same order: their
       * office when they hold one, running for office, jobs and study, and
       * hiring. Each section is the one canonical panel it always was; none of
       * them is mounted anywhere else.
       */
      const offices = judicialOfficeContexts(session.world);
      const executive = resolveExecutiveOffice(session.world);
      const legislative =
        offices.length === 0 &&
        !executive &&
        capabilities.legislation &&
        capabilities.legislativeScenarioKey !== null;
      /*
       * The member's office, exactly as it was: the working measure named, who
       * has it next, the docket, and the older assignment kept distinct.
       */
      const legislativeOffice = (legislativeScenarioKey: string): ReactNode => {
        const docketKey = selectedDocketKey(
          session.world,
          legislativeScenarioKey,
          session.personId,
        );
        const workingBill = docketKey
          ? docketBill(session.world, {
              scenarioKey: legislativeScenarioKey,
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
        /*
         * UI9-13, second half: who has it now.
         *
         * Naming the working measure told the player WHICH bill is theirs and
         * nothing about whether anything was waiting on them. The gate already
         * knows — it is the canonical answer to what controls this measure's
         * next step, and the bill workspace has been printing it as "who decides
         * next" all along, two clicks in behind "Look at what is moving". A
         * player standing in their office should not have to open the document
         * to learn that the committee has it and there is nothing for them to do
         * today.
         *
         * Read, never inferred: no phase is mapped to an actor here. What the
         * chamber's own rule pack calls the referral authority, the committee or
         * the leadership is what the office says.
         */
        const workingGate = workingBill
          ? measureGate(session.world, workingBill.measureId)
          : null;
        const assignmentName = assignment
          ? (measureById(session.world, assignment.measureId)?.shortTitle ??
            null)
          : null;
        const assignmentIsOther =
          assignment !== null &&
          workingBill !== null &&
          assignment.measureId !== workingBill.measureId;
        return (
          <>
            <p>
              {capabilities.person.givenName} works for the{" "}
              {capabilities.workPlace?.displayName} legislature, so what is in
              front of the chamber is in front of them too.
            </p>
            <OfficeOnboardingWorkspace
              world={session.world}
              playerPersonId={session.personId}
              selectedMeasureId={
                workingBill?.measureId ?? assignment?.measureId ?? null
              }
              onWorldChange={onLegislativeChange}
            />
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
            {workingGate ? (
              <p className="game-note" data-testid="active-measure-next">
                <span data-testid="active-measure-actor">
                  {workingGate.actorLabel}
                </span>
                {" has it next. "}
                {workingGate.description}
                {workingGate.thresholdLabel
                  ? ` It needs ${workingGate.thresholdLabel}.`
                  : ""}
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
                scenarioKey={legislativeScenarioKey}
                jurisdictionId={capabilities.legislativeJurisdictionId}
                onWorldChange={onLegislativeChange}
                onGoToFloor={goToTheFloorFor}
                floorNote={floorNote}
                proposalLayout={shell.preferences.proposalLayout}
                onProposalLayoutChange={(proposalLayout) =>
                  dispatch({
                    type: "set-reader-preferences",
                    patch: { proposalLayout },
                  })
                }
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
          </>
        );
      };
      const role = projectWorkRole(session.world, session.personId);
      /*
       * Politics holds the office and the campaign; Personal holds ordinary
       * jobs, study and hiring. Same canonical panels, mounted once each;
       * the section only decides which half of the one Work record opens.
       * Growing up has no office, so School is the whole of it. Politics
       * splits the office from the campaign: Your office holds the office
       * alone and Campaigns every campaign surface, so neither tab repeats
       * the other. An older saved "candidacy" view lands on Campaigns.
       */
      const half: "office" | "campaign" | "jobs" | "all" =
        capabilities.formativeYears
          ? "jobs"
          : view.surface === "candidacy"
            ? "campaign"
            : view.section === "office" ||
                view.section === "campaign" ||
                view.section === "jobs"
              ? view.section
              : "all";
      const sections: WorkSection[] = [];
      const officeHalf = half === "office" || half === "all";
      /*
       * A disaster request or an international choice belongs to whoever
       * actually holds the office being asked, so the section exists only
       * while one is pending. A resident reads the same emergency as a public
       * event under Who you are and is never shown a decision to make.
       */
      if (officeHalf && authorityDecisions(session.world).length > 0) {
        sections.push({
          key: "crisis",
          title: "Decisions only you can make",
          body: (
            <CrisisNoticesPanel
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
              scope="authority"
            />
          ),
        });
      }
      if (officeHalf && offices.length > 0) {
        sections.push({
          key: "office",
          title: "Your court",
          body: (
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
            </>
          ),
        });
      } else if (
        officeHalf &&
        (executive || governingOfficeForPerson(session.world, session.personId))
      ) {
        sections.push({
          key: "office",
          title: "Your office",
          body: (
            <>
              <GoverningBriefing
                world={session.world}
                personId={session.personId}
                onWorldChange={onWorldChange}
              />
              <GoverningOfficeDesk
                world={session.world}
                personId={session.personId}
                onWorldChange={onWorldChange}
              />
              {executive ? (
                <ExecutiveWorkWorkspace
                  world={session.world}
                  onWorldChange={onWorldChange}
                  onClose={close}
                  handlers={createCampaignElectionTransitionRegistry()}
                />
              ) : null}
            </>
          ),
        });
      } else if (
        officeHalf &&
        legislative &&
        capabilities.legislativeScenarioKey
      ) {
        sections.push({
          key: "office",
          title: "Your office",
          body: legislativeOffice(capabilities.legislativeScenarioKey),
        });
      }
      if (
        (half === "campaign" || half === "all") &&
        !capabilities.formativeYears
      ) {
        sections.push({
          key: "campaign",
          title: "Running for office",
          body: capabilities.campaign ? (
            <CampaignWorkspace
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
            />
          ) : (
            <p className="game-note" data-testid="no-campaign">
              {capabilities.withheld.find(
                (entry) => entry.surface === "campaign",
              )?.reason ?? ""}
            </p>
          ),
        });
      }
      if (half === "campaign") {
        sections.push({
          key: "statewide",
          title: "The state's top office",
          body: (
            <NationwideCandidacyWorkspace
              world={session.world}
              personId={session.personId}
              onWorldChange={onWorldChange}
              onOpenCampaign={() => {
                const heading = document.getElementById("pg-work-campaign");
                heading?.scrollIntoView({ block: "start" });
                heading?.focus();
              }}
            />
          ),
        });
      }
      if (half === "jobs" || half === "all") {
        sections.push({
          key: "paths",
          title: capabilities.formativeYears ? "School" : "Jobs and study",
          body: (
            <LifePathsPanel
              world={session.world}
              onWorldChange={onWorldChange}
              transitionHandlers={createCampaignElectionTransitionRegistry()}
              headed={false}
              showTimeControl={false}
            />
          ),
        });
        sections.push({
          key: "personnel",
          title: "Hiring",
          body: (
            <CivilPersonnelPanel
              world={session.world}
              onWorldChange={onWorldChange}
            />
          ),
        });
      }
      if (half === "office" && sections.length === 0) {
        sections.push({
          key: "office",
          title: "Your office",
          body: (
            <p className="game-note" data-testid="no-office">
              You hold no office in this life yet. Running for one is under
              Campaigns when the game supports it here.
            </p>
          ),
        });
      }
      return frame(
        half === "office"
          ? "Your office"
          : half === "campaign"
            ? "Campaigns"
            : half === "jobs"
              ? capabilities.formativeYears
                ? "School"
                : "Jobs and study"
              : "Work",
        half === "campaign"
          ? "candidacy-workspace"
          : offices.length > 0
            ? "judicial-office-section"
            : executive
              ? "executive-office-section"
              : legislative
                ? "office-section"
                : "personal-work-section",
        <>
          {half === "office" ? politicsTabs("office") : null}
          {half === "campaign" ? politicsTabs("campaigns") : null}
          <WorkLayout
            roleSentence={role.sentence}
            pending={
              half === "office" ? null : (
                <WorkWorkspace
                  world={session.world}
                  personId={session.personId}
                >
                  {null}
                </WorkWorkspace>
              )
            }
            sections={sections}
            timeControl={null}
          />
        </>,
        half === "campaign"
          ? "Politics"
          : offices.length > 0
            ? "Judicial office"
            : executive
              ? "Executive office"
              : legislative
                ? "Legislative office"
                : capabilities.formativeYears
                  ? "Growing up"
                  : undefined,
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
  moment,
  onWorldChange,
}: {
  readonly session: Session;
  readonly moment: StoryMoment;
  readonly onWorldChange: (world: World) => void;
}) {
  const [journalOpen, setJournalOpen] = useState(false);
  const runner = useTimeCommand({
    world: session.world,
    personId: session.personId,
    onWorldChange,
  });
  const quietPreview = useMemo(
    () =>
      previewTimeCommand(session.world, session.personId, {
        kind: "quiet-stretch",
      }),
    [session.world, session.personId],
  );
  const crisisStop = useCrisisStop(session.world);

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
        {/*
          The panel's own identity, under its own ids.

          These were story-who and story-when, which the corner cluster has
          carried since it became the shell's identity line (ShellNav.tsx).
          While the moment lived under Personal the two were never on screen
          together; in the room they are, and every proof asking for either id
          then matched two elements. The cluster keeps the names it had — it is
          the shell, and more specs mean it — and the panel takes its own.
        */}
        <h2 className="life-identity" data-testid="moment-who">
          <span className="life-identity-name">{moment.personName}</span>
          <span className="life-identity-age">{moment.age}</span>
        </h2>
        <p className="game-band" data-testid="moment-when">
          {moment.dateLabel}
          {moment.placeName ? ` · ${moment.placeName}` : ""}
        </p>
      </header>

      {/*
        What just happened here, inside the surface rather than in place of it.
        This used to return early and replace the whole story section, so after
        an activity the room's own narration and its choices were gone and
        every spec waiting for story-section waited for something that could
        not appear. The aftermath keeps its own id and sits above the moment.
      */}
      {completedActivityHere(session.world, session.personId) ? (
        <div data-testid="activity-aftermath">
          <VenueActivityPanel
            world={session.world}
            personId={session.personId}
            onWorldChange={onWorldChange}
          />
        </div>
      ) : null}

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
          {presentPeopleSentence(moment.scene.presentPeople)}
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
                  transitionHandlers:
                    createCampaignElectionTransitionRegistry(),
                  advanceDays: (world, days) =>
                    passOrdinaryDays(
                      world,
                      days,
                      createCampaignElectionTransitionRegistry(),
                    ),
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
            aria-disabled={runner.pending || undefined}
            aria-busy={runner.pending}
            onClick={() => {
              crisisStop.watch();
              runner.submit({ kind: "quiet-stretch" });
            }}
          >
            {moment.formativeYears ? "Let the year run on" : "Let time pass"}
            <small data-testid="story-let-time-pass-target">
              {moment.formativeYears || !quietPreview
                ? "Come back to it when something needs you."
                : `${describeTimeCommandPreview(quietPreview)}. Stops early for anything that needs you.`}
            </small>
          </button>
        )}
      </div>

      {crisisStop.stop ? (
        <p className="game-note" role="status" data-testid="story-crisis-stop">
          {crisisStop.stop.sentence}{" "}
          {crisisStop.stop.target === "authority"
            ? "It is waiting in your office."
            : "It is waiting under Who you are."}
        </p>
      ) : null}

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

/**
 * Today: what is happening, what is next, what is waiting, and the time.
 *
 * Reading this is free. The only controls on it that spend time are the ones
 * that say how much: carrying out what is planned (the activity's own
 * duration) and getting on with the day. Everything else is a link to the
 * destination that owns it — inspecting a commitment opens the calendar's
 * record of it, and work opens Work.
 */
function TodayView({
  session,
  onWorldChange,
  workHint,
  onOpenCommitment,
  onOpenPerson,
  onGoTo,
  embedded = false,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
  readonly workHint: string;
  readonly onOpenCommitment: (activityId: EntityId) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onGoTo: (surface: "work" | "calendar" | "places") => void;
  /** Inside the Calendar, which carries its own day controls and entries. */
  readonly embedded?: boolean;
}) {
  const today = useMemo(
    () => projectToday(session.world, session.personId),
    [session.world, session.personId],
  );
  /*
    The same list, with somewhere to go. "Waiting on you" used to be a stack
    of true sentences and no way to answer any of them, so a player read that
    an offer of work was waiting for their answer and then went looking for
    the screen that takes it. Every route below is read off the work item's
    own recorded focus; where the record has no route the sentence stays a
    sentence, which is the honest outcome rather than a button that guesses.
  */
  const papers = useMemo(
    () => projectHouseholdPapers(session.world, session.personId),
    [session.world, session.personId],
  );

  return (
    <section className="game-day pg-today" data-testid="ordinary-section">
      <p className="game-band" data-testid="day-date">
        {today.dateLabel} · {today.timeLabel}
        {today.placeName ? ` · ${today.placeName}` : ""}
      </p>

      <section className="pg-today-block" aria-labelledby="pg-today-now">
        <h3 id="pg-today-now">Now</h3>
        <p
          className="game-scene"
          data-testid={
            today.nowKind === "activity" ? "day-now-activity" : "day-opening"
          }
        >
          {today.now}
        </p>
        {today.nowKind === "scene" ? (
          <p className="game-note" data-testid="day-now-scene">
            It is waiting in the room. Close this to go back to it.
          </p>
        ) : null}
      </section>

      <section className="pg-today-block" aria-labelledby="pg-today-next">
        <h3 id="pg-today-next">Next</h3>
        {today.next ? (
          <button
            type="button"
            className="ui-action ui-action--subtle pg-today-link"
            data-testid="day-next"
            data-activity-id={today.next.activityId}
            onClick={() => onOpenCommitment(today.next!.activityId)}
          >
            {today.next.when} · {today.next.title}
            <small>{today.next.locationLabel} · Read it in the calendar</small>
          </button>
        ) : (
          <p className="game-note" data-testid="day-next-none">
            Nothing else of yours is on the calendar.
          </p>
        )}
      </section>

      {today.waiting.length > 0 ? (
        <section className="pg-today-block" aria-labelledby="pg-today-waiting">
          <h3 id="pg-today-waiting">Waiting on you</h3>
          <ul className="game-pending" data-testid="day-pending">
            {papers.map((paper) => {
              const destination = paper.destination;
              const route =
                destination.kind === "commitment"
                  ? {
                      hint: "Read it in the calendar",
                      go: () => onOpenCommitment(destination.activityId),
                    }
                  : destination.kind === "person"
                    ? {
                        hint: "Open the person this is with",
                        go: () => onOpenPerson(destination.personId),
                      }
                    : destination.kind === "surface"
                      ? {
                          hint: "Answer it where work is",
                          go: () => onGoTo(destination.surface),
                        }
                      : null;
              return (
                <li key={paper.key}>
                  {route ? (
                    <button
                      type="button"
                      className="ui-action ui-action--subtle pg-today-link"
                      data-testid={`day-pending-open-${paper.key}`}
                      onClick={route.go}
                    >
                      {paper.sentence}
                      <small>{route.hint}</small>
                    </button>
                  ) : (
                    /*
                      Answered here, with the time below, or carrying no route
                      the record can support. Either way there is nowhere to
                      send anybody, so it stays the sentence it already was
                      rather than becoming a button that guesses.
                    */
                    paper.sentence
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="pg-today-block" aria-labelledby="pg-today-time">
        <h3 id="pg-today-time">Use your time</h3>
        <VenueActivityPanel
          world={session.world}
          personId={session.personId}
          onWorldChange={onWorldChange}
        />
        {embedded ? null : (
          <PassDayControl session={session} onWorldChange={onWorldChange} />
        )}
      </section>

      <nav className="pg-today-links" aria-label="From today">
        <button
          type="button"
          className="ui-action ui-action--subtle"
          data-testid="day-open-work"
          onClick={() => onGoTo("work")}
        >
          Your office and campaigns
          <small>{workHint}</small>
        </button>
        {embedded ? null : (
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="day-open-calendar"
            onClick={() => onGoTo("calendar")}
          >
            Calendar
            <small>Everything that is scheduled</small>
          </button>
        )}
        <button
          type="button"
          className="ui-action ui-action--subtle"
          data-testid="day-open-places"
          onClick={() => onGoTo("places")}
        >
          Travel
          <small>Where you can go from here</small>
        </button>
      </nav>
    </section>
  );
}

/**
 * Moving on to tomorrow. The one control that waits, wherever it appears.
 *
 * It is on Today, and it is on Work, because the loop of a campaign or a job
 * is "act, then let the day end": sending somebody from the work they are
 * doing to another screen to end the day was the hunting the owner described.
 * It is the same canonical writer and the same words in both places.
 */
function PassDayControl({
  session,
  onWorldChange,
  withClock = false,
}: {
  readonly session: Session;
  readonly onWorldChange: (world: World) => void;
  /** Say what time it is beside the control, where nothing else on the page does. */
  readonly withClock?: boolean;
}) {
  const today = useMemo(
    () => (withClock ? projectToday(session.world, session.personId) : null),
    [withClock, session.world, session.personId],
  );
  const runner = useTimeCommand({
    world: session.world,
    personId: session.personId,
    onWorldChange,
  });
  const [outcome, setOutcome] = useState<string | null>(null);
  const target = useMemo(
    () =>
      previewTimeCommand(session.world, session.personId, {
        kind: "days",
        days: 1,
      }),
    [session.world, session.personId],
  );
  return (
    <div className="game-choices pg-pass-day">
      {today ? (
        <p className="game-band" data-testid="day-date">
          {today.dateLabel} · {today.timeLabel}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="pass-day"
        aria-disabled={runner.pending || undefined}
        aria-busy={runner.pending}
        onClick={() =>
          runner.submit({ kind: "days", days: 1 }, (report) =>
            setOutcome(
              report.stoppedEarly && report.target
                ? `${stoppedEarlyLabel(report.target)} ${report.outcome}`
                : report.outcome,
            ),
          )
        }
      >
        Get on with the day
        <small>
          {runner.pending
            ? "Time is passing…"
            : target
              ? `${skipToLabel(target.target)}. Stops early for anything protected.`
              : "Move to tomorrow."}
        </small>
      </button>
      {outcome && !runner.pending ? (
        <p
          className="game-note"
          role="status"
          data-testid="pass-day-outcome"
          style={{ whiteSpace: "pre-line" }}
        >
          {outcome}
        </p>
      ) : null}
    </div>
  );
}

interface WorkSection {
  readonly key:
    "office" | "campaign" | "statewide" | "paths" | "personnel" | "crisis";
  readonly title: string;
  readonly body: ReactNode;
}

/**
 * Work's one layout: who you are at work, where each section is, the sections.
 *
 * The jump list at the top is there because Work holds several long panels and
 * the thing a player wants is often the third one down. It moves focus to the
 * section's heading, so it works from the keyboard exactly as from a pointer,
 * and it reads nothing and changes nothing.
 */
function WorkLayout({
  roleSentence,
  pending,
  sections,
  timeControl,
}: {
  readonly roleSentence: string;
  /** What is waiting on the character, said right after who they are. */
  readonly pending: ReactNode;
  readonly sections: readonly WorkSection[];
  readonly timeControl: ReactNode;
}) {
  const jumpTo = (key: WorkSection["key"]) => {
    const heading = document.getElementById(`pg-work-${key}`);
    heading?.scrollIntoView({ block: "start" });
    heading?.focus();
  };
  return (
    <div className="pg-work" data-testid="work-layout">
      <p className="game-scene" data-testid="work-role">
        {roleSentence}
      </p>
      {pending}
      {sections.length > 1 ? (
        <nav className="pg-work-jump" aria-label="On this page">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              className="game-choice-chip"
              data-testid={`work-jump-${section.key}`}
              onClick={() => jumpTo(section.key)}
            >
              {section.title}
            </button>
          ))}
        </nav>
      ) : null}
      {timeControl}
      {sections.map((section) => (
        <section
          key={section.key}
          className="pg-work-section"
          aria-labelledby={`pg-work-${section.key}`}
          data-testid={`work-section-${section.key}`}
        >
          <h3 id={`pg-work-${section.key}`} tabIndex={-1}>
            {section.title}
          </h3>
          {section.body}
        </section>
      ))}
    </div>
  );
}
import { NationalElectionResults } from "./NationalElectionResults";
