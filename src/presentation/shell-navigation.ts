import type { PersonWardrobePreference } from "./person-visual-selection";
import type { EntityId } from "../simulation";
import type { GovernmentPlace, GovernmentScope } from "./politics-government";
import type { ConversationAddressee } from "./run-b-conversation";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";

/**
 * The shared shell: what is open, how you got there, and how you get back.
 *
 * One reducer owns navigation for every destination on the normal route. Each
 * surface routes through `open-entity` / `back` rather than keeping a stack of
 * its own, which is what makes Back behave identically after a pin, a person in
 * the room, a directory row, a journal reference and a calendar entry. The
 * prototype proved the shape; this is the production one, and it deliberately
 * carries none of the prototype's data, rooms or fixed clock.
 *
 * Nothing here can move time. There is no action in this reducer that touches
 * the World at all: navigating, reading and opening menus are pure, and the
 * only things that change a world are the gameplay writers the screens call
 * directly. That is the accepted rule made structural rather than promised.
 */

/** A canonical entity a pin or a link can point at. */
export type ShellRef =
  | { readonly kind: "person"; readonly id: EntityId }
  /** A scheduled activity in the player's own calendar. */
  | { readonly kind: "commitment"; readonly id: EntityId }
  /** A measure before a chamber. */
  | { readonly kind: "measure"; readonly id: EntityId }
  /**
   * A governing organization the player can reopen.
   *
   * This is the ORGANIZATION, not the ground it sits on. "Lexington" the place
   * and the Lexington-Fayette Urban County Government are different things, and
   * a shortcut that blurred them would be the first step towards a pin that
   * quietly implies residence. Reopening one of these selects that government
   * on the municipal surface and does nothing else: it does not move the
   * player, change where they live, grant a role, or travel anywhere.
   *
   * The id is the government's own key rather than an `EntityId`, because a
   * government key is what `municipalGovernmentByKey` actually resolves. A
   * separate geographic place pin is deliberately NOT added: there is no place
   * surface for one to open, and a reference type with nothing to resolve to
   * would be a promise the game cannot keep.
   */
  | { readonly kind: "government"; readonly id: string }
  /**
   * An organization the player has met, such as a local party chapter.
   *
   * Reopening one shows that organization's public face and the player's own
   * invitations from it. Opening it does not travel there, join it, accept an
   * invitation or attend a meeting; those stay explicit actions on the
   * surface. A meeting on the calendar is still pinned as a commitment.
   */
  | { readonly kind: "organization"; readonly id: EntityId };

export function refKey(ref: ShellRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function sameRef(left: ShellRef, right: ShellRef): boolean {
  return left.kind === right.kind && left.id === right.id;
}

export type ShellSurface =
  | "scene"
  /** The ordinary day, and the campaign when this life has one. */
  | "day"
  | "people"
  | "calendar"
  | "personal"
  | "work"
  | "politics"
  /** Public government by place, level and branch (Politics hub). */
  | "government"
  | "transit"
  | "tax"
  /** Who governs home, and standing for the state's executive office. */
  | "candidacy"
  | "news"
  | "places"
  | "municipal"
  /** The home area's local party chapters. Looking is not joining. */
  | "parties"
  | "journal"
  | "patch-notes"
  | "options";

/**
 * A named part of a surface a destination can land on.
 *
 * Two menu entries that dispatch the identical view are two names for one
 * click, which is what "Who you are" and "Money and property" were: both went
 * to `personal` with nothing to say which half the player asked for. A section
 * is how a second entry can be a real destination without becoming a second
 * page with its own copy of the record.
 */
export type ShellSection =
  | "identity"
  | "finances"
  /** Politics: the office held. */
  | "office"
  /** Politics: running for office, every campaign surface in one place. */
  | "campaign"
  /** Personal: ordinary jobs, study and hiring. */
  | "jobs"
  /** News: reading comes first; these are its other contexts. */
  | "news-around"
  | "news-directory"
  | "news-press";

export type ShellView =
  | { readonly surface: ShellSurface; readonly section?: ShellSection }
  | { readonly surface: "entity"; readonly ref: ShellRef };

export type PinSize = "tiny" | "normal" | "expanded";

export type PeopleView = "web" | "categories" | "list";

/**
 * Reader layouts (UI DECISION FOLLOW-THROUGH). Presentation only: none of these
 * changes the World, a draft or a publication.
 * - proposalLayout: "auto" is side-by-side when there is room and one page
 *   when there is not; "compare" and "read" are the player's explicit choice.
 * - newsMode: the mixed front page or one publication's front page.
 * - journalView / journalYear: Chapters or Years, and an optional year filter.
 */
export type ProposalLayout = "auto" | "compare" | "read";
export type NewsMode = "front" | "publication";
export type JournalView = "chapters" | "years";

export type ReaderPreferences = Pick<
  ShellPreferences,
  | "proposalLayout"
  | "newsMode"
  | "newsOutletKey"
  | "journalView"
  | "journalYear"
  | "politicsPlace"
  | "governmentScope"
>;

export interface ShellPin {
  /** Stable, derived from the reference. A pin is its target, not a row. */
  readonly key: string;
  readonly ref: ShellRef;
  readonly size: PinSize;
}

/**
 * The preferences that survive the session.
 *
 * Deliberately small: every one of these has a visible consumer on this route.
 * A preference with nothing reading it is a lie about what the game supports.
 */
export interface ShellPreferences {
  readonly peopleView: PeopleView;
  readonly defaultPinSize: PinSize;
  /** Interface-only outlet follows, scoped to this saved life. */
  readonly followedNewsOutletKeys: readonly string[];
  /**
   * What a day or week skip stops for. Read by the advance policy adapter
   * (`interruption-policy.ts`), which is the only place these are consumed.
   */
  readonly interruptions: InterruptionPreferences;
  readonly proposalLayout: ProposalLayout;
  readonly newsMode: NewsMode;
  /** The publication the News reader opens on in publication mode. */
  readonly newsOutletKey: string | null;
  readonly journalView: JournalView;
  /** A four-digit year the Journal is filtered to, or null for all years. */
  readonly journalYear: string | null;
  /**
   * The place and level chosen in Politics → Government. Issues and budget
   * follows the same selection, so the two tabs never disagree about where.
   */
  readonly politicsPlace: GovernmentPlace;
  readonly governmentScope: GovernmentScope;
}

/**
 * The on-demand interruption checklist.
 *
 * Each entry names one supported category with a real consumer on the existing
 * clock. A confirmed commitment, a journey and anything that needs the
 * player's own decision always stop a skip; they are not preferences.
 */
export interface InterruptionPreferences {
  /** Stop before each ordinary work shift instead of letting routine run it. */
  readonly stopForWorkShifts: boolean;
  /** Stop when a tentative hold comes due instead of letting it lapse. */
  readonly stopForTentativeHolds: boolean;
}

export const DEFAULT_INTERRUPTIONS: InterruptionPreferences = {
  stopForWorkShifts: false,
  stopForTentativeHolds: false,
};

export const DEFAULT_PREFERENCES: ShellPreferences = {
  peopleView: "web",
  defaultPinSize: "normal",
  followedNewsOutletKeys: [],
  interruptions: DEFAULT_INTERRUPTIONS,
  proposalLayout: "auto",
  newsMode: "front",
  newsOutletKey: null,
  journalView: "chapters",
  journalYear: null,
  politicsPlace: "here",
  governmentScope: "local",
};

/** Private player writing, never simulation facts or NPC knowledge. */
export interface JournalNote {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly group: string;
  readonly personId: EntityId | null;
  readonly eventKey: string | null;
}
export interface PrivateJournal {
  readonly ambition: string;
  readonly notes: readonly JournalNote[];
}
export const EMPTY_JOURNAL: PrivateJournal = { ambition: "", notes: [] };

/**
 * What this player has already been shown, kept per saved life.
 *
 * Interface consumption, never world truth: finishing the introduction or
 * dismissing a recap moves nothing in the World, and reopening either one
 * reads the same saved facts again. The frontier is a World history sequence,
 * so "since you last looked" means records appended after it, not a date guess.
 */
export interface InterfaceProgress {
  /** The world introduction was finished or skipped for this life. */
  readonly orientationSeen: boolean;
  /**
   * History sequence the player has caught up to. Null until this life is
   * first read, when it is set to the world's current sequence, so an old life
   * never opens with its whole past presented as news.
   */
  readonly recapFrontier: number | null;
}

export const INITIAL_INTERFACE_PROGRESS: InterfaceProgress = {
  orientationSeen: false,
  recapFrontier: null,
};

/** A record written before progress existed belongs to a life already under way. */
export const LEGACY_INTERFACE_PROGRESS: InterfaceProgress = {
  orientationSeen: true,
  recapFrontier: null,
};

export type ShellNavigationLevel =
  "closed" | "primary" | "personal" | "politics";

/**
 * The conversation on the table, wherever the player has browsed to since.
 *
 * A conversation is not a place, so it is not a history level; it is a thing
 * happening in the room, and the room IS a history level. Holding the record
 * here rather than beside the shell is what lets one reducer answer "what does
 * Back mean now?" truthfully: while a browsing workspace is open over the room,
 * the conversation is SUSPENDED, and the level Back returns to is the room with
 * this line still waiting on it.
 *
 * It deliberately carries no world state. The addressee and the subject are
 * what the player chose; the beat, the choices and whether Listen means
 * anything are projected from the World every time the box draws, so a
 * suspended conversation cannot go stale and cannot be a second copy of the
 * transcript. Nothing here is saved: it belongs to this sitting, and the World
 * it happens in already records what was actually said.
 */
export interface ShellConversation {
  readonly subject: ConversationSubjectKey;
  /** Who the player is facing. A request; the projection corrects it. */
  readonly addressee: ConversationAddressee;
}

export interface ShellState {
  /** Last element is the current view. The base is always the scene. */
  readonly history: readonly ShellView[];
  /** The conversation waiting in the room, or null when there is none. */
  readonly conversation: ShellConversation | null;
  readonly navigation: ShellNavigationLevel;
  /**
   * The one person card. Whoever was opened last — from the room, a name, the
   * People web, a list row or a pin — replaces whoever was there before.
   */
  readonly quickDossierPersonId: EntityId | null;
  /** The "save before quitting?" question, while it is being asked. */
  readonly confirmingLeave: boolean;
  readonly pins: readonly ShellPin[];
  readonly activePinMenuKey: string | null;
  readonly peopleCategory: string;
  readonly peopleQuery: string;
  readonly preferences: ShellPreferences;
  readonly personWardrobes: Readonly<Record<string, PersonWardrobePreference>>;
  readonly journal: PrivateJournal;
  readonly progress: InterfaceProgress;
  /** Announced to assistive technology after a navigation action. */
  readonly announcement: string;
}

export const INITIAL_SHELL_STATE: ShellState = {
  history: [{ surface: "scene" }],
  conversation: null,
  navigation: "closed",
  quickDossierPersonId: null,
  confirmingLeave: false,
  pins: [],
  activePinMenuKey: null,
  peopleCategory: "all",
  peopleQuery: "",
  preferences: DEFAULT_PREFERENCES,
  announcement: "",
  personWardrobes: {},
  journal: EMPTY_JOURNAL,
  progress: INITIAL_INTERFACE_PROGRESS,
};

export type ShellAction =
  | {
      readonly type: "set-person-wardrobe";
      readonly preference: PersonWardrobePreference;
    }
  | { readonly type: "set-journal"; readonly journal: PrivateJournal }
  | { readonly type: "toggle-navigation" }
  | {
      readonly type: "open-nav-submenu";
      readonly submenu: "personal" | "politics";
    }
  | { readonly type: "open-nav-primary" }
  | { readonly type: "close-navigation" }
  | {
      readonly type: "go-to-surface";
      readonly surface: ShellSurface;
      readonly section?: ShellSection;
    }
  /**
   * A tab or section INSIDE the workspace already open.
   *
   * Top-level navigation changes which workspace is open, so it adds a level
   * and Back returns to where the player came from. A tab strip within one
   * workspace is not a second place: it replaces the subroute. Without this,
   * Politics → Issues and budget was two levels deep, one Back landed on the
   * tab the player passed through rather than on the room, and a conversation
   * waiting there took two presses to get back to.
   */
  | {
      readonly type: "go-to-subroute";
      readonly surface: ShellSurface;
      readonly section?: ShellSection;
    }
  | { readonly type: "go-to-scene" }
  /** The player chose somebody to talk to, and what about. */
  | {
      readonly type: "set-conversation";
      readonly subject: ConversationSubjectKey;
      readonly addressee: ConversationAddressee;
    }
  /** The conversation is over: said goodbye, walked off, or closed the box. */
  | { readonly type: "end-conversation" }
  /**
   * Back to the line still waiting, from wherever the player browsed to.
   *
   * Unlike `go-to-scene` this keeps the levels BELOW the room it returns to,
   * so a conversation started from the People list still has that list under
   * it afterwards. With nothing to resume it does nothing.
   */
  | { readonly type: "resume-conversation" }
  /**
   * A conversation starts in the room. Unlike `go-to-scene`, the way there is
   * kept, so Back after the conversation returns to the person it started from.
   */
  | { readonly type: "talk-in-scene"; readonly personId: EntityId }
  | { readonly type: "open-entity"; readonly ref: ShellRef }
  | { readonly type: "back" }
  | { readonly type: "open-quick-dossier"; readonly personId: EntityId }
  | { readonly type: "close-quick-dossier" }
  | { readonly type: "ask-leave" }
  | { readonly type: "cancel-leave" }
  | {
      readonly type: "set-interruption";
      readonly key: keyof InterruptionPreferences;
      readonly value: boolean;
    }
  | { readonly type: "toggle-pin"; readonly ref: ShellRef }
  | { readonly type: "unpin"; readonly key: string }
  | {
      readonly type: "set-pin-size";
      readonly key: string;
      readonly size: PinSize;
    }
  | {
      readonly type: "move-pin";
      readonly key: string;
      readonly direction: "up" | "down";
    }
  | {
      readonly type: "reorder-pin";
      readonly key: string;
      readonly toIndex: number;
    }
  | { readonly type: "toggle-pin-menu"; readonly key: string }
  | { readonly type: "set-people-view"; readonly view: PeopleView }
  | {
      readonly type: "set-reader-preferences";
      readonly patch: Partial<ReaderPreferences>;
    }
  | { readonly type: "set-people-category"; readonly category: string }
  | { readonly type: "set-people-query"; readonly query: string }
  | { readonly type: "set-default-pin-size"; readonly size: PinSize }
  | { readonly type: "toggle-news-outlet-follow"; readonly outletKey: string }
  /** Restores pins and preferences read back from storage. */
  | {
      readonly type: "restore";
      readonly personWardrobes?: Readonly<
        Record<string, PersonWardrobePreference>
      >;
      readonly journal?: PrivateJournal;
      readonly pins: readonly ShellPin[];
      readonly preferences: ShellPreferences;
      readonly progress?: InterfaceProgress;
    }
  /** The world introduction was finished or skipped. */
  | { readonly type: "finish-orientation" }
  /** Sets the recap frontier for a life read for the first time. */
  | { readonly type: "start-recap-frontier"; readonly sequence: number }
  /** The player dismissed a recap that covered records through this sequence. */
  | { readonly type: "acknowledge-recap"; readonly throughSequence: number }
  /** Drops pins whose target this world no longer has. */
  | { readonly type: "prune-pins"; readonly keep: readonly string[] }
  | { readonly type: "escape" };

function currentView(state: ShellState): ShellView {
  return state.history[state.history.length - 1] ?? { surface: "scene" };
}

export function activeView(state: ShellState): ShellView {
  return currentView(state);
}

export function canGoBack(state: ShellState): boolean {
  return state.history.length > 1;
}

export function isPinned(state: ShellState, ref: ShellRef): boolean {
  const key = refKey(ref);
  return state.pins.some((pin) => pin.key === key);
}

/**
 * Closes every transient layer.
 *
 * Navigating dismisses the anchored menu, the quick dossier, the flyout and any
 * pin menu, because each of those is attached to a place the player has just
 * left. Pins are untouched: a pin is a saved reference the player chose, not a
 * layer, and it survives every navigation and every reload.
 */
function settled(state: ShellState): ShellState {
  return {
    ...state,
    navigation: "closed",
    quickDossierPersonId: null,
    confirmingLeave: false,
    activePinMenuKey: null,
  };
}

function viewSection(view: ShellView): ShellSection | undefined {
  return view.surface === "entity" ? undefined : view.section;
}

function pushView(state: ShellState, view: ShellView): ShellState {
  const current = currentView(state);
  const same =
    current.surface === view.surface &&
    (current.surface !== "entity"
      ? viewSection(current) === viewSection(view)
      : view.surface === "entity" && sameRef(current.ref, view.ref));
  if (same) return settled(state);
  return { ...settled(state), history: [...state.history, view] };
}

/**
 * The level the workspace itself occupies, below any drilldown over it.
 *
 * A person, measure or project opened from a list is a level of its own, which
 * is how Back from one returns to the list it came from. A tab pressed while
 * such a record is open is still a tab of the workspace underneath, so the
 * search walks down past the drilldowns to the level the tabs belong to. The
 * room at the base is never one of them.
 */
function workspaceLevel(state: ShellState): number {
  let index = state.history.length - 1;
  while (index > 0 && state.history[index]?.surface === "entity") index -= 1;
  return index;
}

/** Replaces the open workspace's subroute instead of stacking a second one. */
function replaceView(state: ShellState, view: ShellView): ShellState {
  const index = workspaceLevel(state);
  const level = state.history[index];
  if (index === 0 || !level || level.surface === "entity") {
    // No workspace is open to have a subroute; the room's base never moves.
    return pushView(state, view);
  }
  /*
   * A ROOM is never a subroute's level either, and not only the one at the
   * base. A conversation started from a list puts a second room on top of the
   * way there, and that room is the level the waiting line belongs to;
   * replacing it would leave Back stepping straight over the room the player
   * is owed. No control in the room dispatches a subroute today, so this keeps
   * that an invariant of the reducer rather than a property of which buttons
   * happen to be mounted.
   */
  if (level.surface === "scene") return pushView(state, view);
  const same =
    level.surface === view.surface &&
    viewSection(level) === viewSection(view) &&
    index === state.history.length - 1;
  if (same) return settled(state);
  return {
    ...settled(state),
    history: [...state.history.slice(0, index), view],
  };
}

/**
 * Whether a conversation is waiting behind whatever the player is reading.
 *
 * Derived, never stored: the conversation is suspended exactly when one is
 * held and the room is not the current view. Two flags that could disagree
 * about the same fact is how a "Return to conversation" button ends up
 * offering a conversation that is already on screen.
 */
export function conversationSuspended(state: ShellState): boolean {
  return state.conversation !== null && activeView(state).surface !== "scene";
}

export function shellReducer(
  state: ShellState,
  action: ShellAction,
): ShellState {
  switch (action.type) {
    case "toggle-navigation":
      return {
        ...state,
        navigation: state.navigation === "closed" ? "primary" : "closed",
        confirmingLeave: false,
        activePinMenuKey: null,
      };

    case "open-nav-submenu":
      return { ...state, navigation: action.submenu };

    case "open-nav-primary":
      return { ...state, navigation: "primary" };

    case "close-navigation":
      return { ...state, navigation: "closed" };

    case "go-to-scene":
      return {
        ...settled(state),
        history: [{ surface: "scene" }],
        announcement: "Back in the room.",
      };

    /*
     * The room goes on top of the history rather than replacing it. Talking
     * from the person card over a workspace also keeps that person's record
     * underneath, because the card itself is a layer and not a place Back can
     * return to. Talking from the room settles the history on the room alone.
     */
    case "talk-in-scene": {
      const current = currentView(state);
      if (current.surface === "scene") {
        // The room is where this conversation started; an older way here
        // (a record talked from earlier) is not where its Back should lead.
        return {
          ...settled(state),
          history: [{ surface: "scene" }],
          announcement: "Back in the room.",
        };
      }
      const record: ShellView = {
        surface: "entity",
        ref: { kind: "person", id: action.personId },
      };
      const fromCard =
        state.quickDossierPersonId === action.personId &&
        !(current.surface === "entity" && sameRef(current.ref, record.ref));
      const withRecord = fromCard ? pushView(state, record) : settled(state);
      return {
        ...withRecord,
        history: [...withRecord.history, { surface: "scene" }],
        announcement: "Back in the room.",
      };
    }

    case "go-to-surface": {
      if (action.surface === "scene") {
        return shellReducer(state, { type: "go-to-scene" });
      }
      return {
        ...pushView(state, {
          surface: action.surface,
          ...(action.section ? { section: action.section } : {}),
        }),
        announcement: `Opened ${action.section ?? action.surface}.`,
      };
    }

    case "go-to-subroute": {
      if (action.surface === "scene") {
        return shellReducer(state, { type: "go-to-scene" });
      }
      return {
        ...replaceView(state, {
          surface: action.surface,
          ...(action.section ? { section: action.section } : {}),
        }),
        announcement: `Opened ${action.section ?? action.surface}.`,
      };
    }

    case "set-conversation":
      return {
        ...state,
        conversation: {
          subject: action.subject,
          addressee: action.addressee,
        },
      };

    case "end-conversation":
      if (!state.conversation) return state;
      return { ...state, conversation: null };

    /*
     * Returning is a Back to the room this conversation is waiting in, not a
     * reset to the room. Everything the player walked through to get here is
     * still under it, so the next Back leaves the conversation the same way it
     * would have before they went browsing.
     */
    case "resume-conversation": {
      if (!state.conversation) return state;
      let index = state.history.length - 1;
      while (index > 0 && state.history[index]?.surface !== "scene") index -= 1;
      if (index === state.history.length - 1) return settled(state);
      return {
        ...settled(state),
        history: state.history.slice(0, index + 1),
        announcement: "Back in the room.",
      };
    }

    case "open-entity":
      return {
        ...pushView(state, { surface: "entity", ref: action.ref }),
        announcement: `Opened ${action.ref.kind}.`,
      };

    case "back": {
      if (!canGoBack(state)) return settled(state);
      return {
        ...settled(state),
        history: state.history.slice(0, -1),
        announcement: "Went back.",
      };
    }

    /*
     * Opening somebody carries WHO. The id travels in the action and lands in
     * the state, and whoever was on the card before is replaced: one card, not
     * a stack of close buttons. The menu and any pin menu close because the
     * player has just pointed at something else.
     */
    case "open-quick-dossier":
      return {
        ...state,
        navigation: "closed",
        activePinMenuKey: null,
        confirmingLeave: false,
        quickDossierPersonId: action.personId,
      };

    case "close-quick-dossier":
      return { ...state, quickDossierPersonId: null };

    /* The question replaces the menu; one thing to answer, not two open. */
    case "ask-leave":
      return {
        ...state,
        navigation: "closed",
        confirmingLeave: true,
        activePinMenuKey: null,
      };

    case "cancel-leave":
      return { ...state, confirmingLeave: false };

    case "set-interruption":
      if (state.preferences.interruptions[action.key] === action.value)
        return state;
      return {
        ...state,
        preferences: {
          ...state.preferences,
          interruptions: {
            ...state.preferences.interruptions,
            [action.key]: action.value,
          },
        },
        announcement: action.value
          ? "A skip will stop for this."
          : "A skip will no longer stop for this.",
      };

    case "toggle-pin": {
      const key = refKey(action.ref);
      if (state.pins.some((pin) => pin.key === key)) {
        return {
          ...state,
          pins: state.pins.filter((pin) => pin.key !== key),
          activePinMenuKey:
            state.activePinMenuKey === key ? null : state.activePinMenuKey,
          announcement: "Unpinned.",
        };
      }
      return {
        ...state,
        pins: [
          ...state.pins,
          { key, ref: action.ref, size: state.preferences.defaultPinSize },
        ],
        announcement: "Pinned.",
      };
    }

    case "unpin":
      return {
        ...state,
        pins: state.pins.filter((pin) => pin.key !== action.key),
        activePinMenuKey:
          state.activePinMenuKey === action.key ? null : state.activePinMenuKey,
        announcement: "Unpinned.",
      };

    /*
     * Choosing a size closes that pin's menu, and only that pin's menu. A size
     * is a one-shot choice, so a menu left standing after it reads as an
     * unresponsive control — whereas Move up and Move down are repeated, and
     * deliberately leave the menu open below.
     */
    case "set-pin-size":
      return {
        ...state,
        pins: state.pins.map((pin) =>
          pin.key === action.key ? { ...pin, size: action.size } : pin,
        ),
        activePinMenuKey:
          state.activePinMenuKey === action.key ? null : state.activePinMenuKey,
        announcement: `Pin size set to ${action.size}.`,
      };

    case "move-pin": {
      const index = state.pins.findIndex((pin) => pin.key === action.key);
      if (index < 0) return state;
      const target = action.direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= state.pins.length) return state;
      const pins = [...state.pins];
      const moving = pins[index];
      const displaced = pins[target];
      if (!moving || !displaced) return state;
      pins[target] = moving;
      pins[index] = displaced;
      return { ...state, pins, announcement: "Reordered pins." };
    }

    /*
     * Drag-to-reorder lands here, identified by key rather than by its old
     * index: the gesture began before this dispatch, and the list must not
     * depend on a pointer handler having tracked indices correctly across it. A
     * key that no longer exists is a no-op, never a reorder of the wrong pin.
     */
    case "reorder-pin": {
      const index = state.pins.findIndex((pin) => pin.key === action.key);
      if (index < 0) return state;
      const target = Math.max(
        0,
        Math.min(state.pins.length - 1, action.toIndex),
      );
      if (target === index) return state;
      const pins = [...state.pins];
      const [moving] = pins.splice(index, 1);
      if (!moving) return state;
      pins.splice(target, 0, moving);
      return { ...state, pins, announcement: "Reordered pins." };
    }

    case "toggle-pin-menu":
      return {
        ...state,
        activePinMenuKey:
          state.activePinMenuKey === action.key ? null : action.key,
      };

    case "set-people-view":
      return {
        ...state,
        preferences: { ...state.preferences, peopleView: action.view },
      };

    case "set-people-category":
      return { ...state, peopleCategory: action.category };

    case "set-people-query":
      return { ...state, peopleQuery: action.query };

    case "set-reader-preferences": {
      const patch = Object.fromEntries(
        Object.entries(action.patch).filter(([, value]) => value !== undefined),
      ) as Partial<ReaderPreferences>;
      return {
        ...state,
        preferences: { ...state.preferences, ...patch },
      };
    }

    case "set-default-pin-size":
      return {
        ...state,
        preferences: { ...state.preferences, defaultPinSize: action.size },
      };

    case "toggle-news-outlet-follow": {
      const outletKey = action.outletKey.trim();
      if (!outletKey) return state;
      const followed =
        state.preferences.followedNewsOutletKeys.includes(outletKey);
      return {
        ...state,
        preferences: {
          ...state.preferences,
          followedNewsOutletKeys: followed
            ? state.preferences.followedNewsOutletKeys.filter(
                (candidate) => candidate !== outletKey,
              )
            : [...state.preferences.followedNewsOutletKeys, outletKey],
        },
        announcement: followed ? "Outlet unfollowed." : "Outlet followed.",
      };
    }

    case "set-person-wardrobe":
      return {
        ...state,
        personWardrobes: {
          ...state.personWardrobes,
          [action.preference.personId]: action.preference,
        },
      };
    case "set-journal":
      return { ...state, journal: action.journal };
    case "restore":
      return {
        ...state,
        pins: action.pins,
        preferences: action.preferences,
        journal: action.journal ?? EMPTY_JOURNAL,
        personWardrobes: action.personWardrobes ?? {},
        progress: action.progress ?? LEGACY_INTERFACE_PROGRESS,
      };

    case "finish-orientation":
      if (state.progress.orientationSeen) return state;
      return {
        ...state,
        progress: { ...state.progress, orientationSeen: true },
      };

    case "start-recap-frontier":
      if (state.progress.recapFrontier !== null) return state;
      return {
        ...state,
        progress: { ...state.progress, recapFrontier: action.sequence },
      };

    /*
     * Monotone on purpose. A second dismissal of the same recap, or a stale
     * one arriving after a newer one, must not move the frontier backwards and
     * re-present what the player already dismissed.
     */
    case "acknowledge-recap": {
      const current = state.progress.recapFrontier ?? 0;
      if (action.throughSequence <= current) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          recapFrontier: action.throughSequence,
        },
      };
    }

    /*
     * A pin points at a canonical entity. Loading a world that never had that
     * entity — a different life in another slot — must not leave a rail of rows
     * that cannot be opened, so the shell hands back the keys it could resolve
     * and everything else goes.
     */
    case "prune-pins": {
      const keep = new Set(action.keep);
      if (state.pins.every((pin) => keep.has(pin.key))) return state;
      return {
        ...state,
        pins: state.pins.filter((pin) => keep.has(pin.key)),
        activePinMenuKey: null,
      };
    }

    /**
     * Escape closes the highest active transient layer, and only that one.
     *
     * The order is the visual stacking order, so Escape undoes the most recent
     * thing the player opened rather than dropping them out of the game. At the
     * base of the room it does nothing, on purpose: there is no layer left, and
     * leaving the life would be a surprise.
     */
    case "escape": {
      if (state.confirmingLeave) {
        return { ...state, confirmingLeave: false };
      }
      if (state.activePinMenuKey) {
        return { ...state, activePinMenuKey: null };
      }
      if (state.quickDossierPersonId) {
        return { ...state, quickDossierPersonId: null };
      }
      if (state.navigation !== "closed") {
        return { ...state, navigation: "closed" };
      }
      if (canGoBack(state)) {
        return {
          ...settled(state),
          history: state.history.slice(0, -1),
          announcement: "Closed workspace.",
        };
      }
      return state;
    }
  }
}
