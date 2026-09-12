import type { PersonWardrobePreference } from "./person-visual-selection";
import type { EntityId } from "../simulation";

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
  | { readonly kind: "government"; readonly id: string };

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
  | "news"
  | "places"
  | "municipal"
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
export type ShellSection = "identity" | "finances";

export type ShellView =
  | { readonly surface: ShellSurface; readonly section?: ShellSection }
  | { readonly surface: "entity"; readonly ref: ShellRef };

export type PinSize = "tiny" | "normal" | "expanded";

export type PeopleView = "web" | "categories" | "list";

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
}

export const DEFAULT_PREFERENCES: ShellPreferences = {
  peopleView: "web",
  defaultPinSize: "normal",
  followedNewsOutletKeys: [],
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

export interface ShellState {
  /** Last element is the current view. The base is always the scene. */
  readonly history: readonly ShellView[];
  readonly navigation: "closed" | "primary" | "personal";
  /** The anchored action menu beside somebody in the room. */
  readonly actionMenuPersonId: EntityId | null;
  /** The quick dossier riding beside the person it describes. */
  readonly quickDossierPersonId: EntityId | null;
  readonly pins: readonly ShellPin[];
  readonly activePinMenuKey: string | null;
  readonly peopleCategory: string;
  readonly peopleQuery: string;
  readonly preferences: ShellPreferences;
  readonly personWardrobes: Readonly<Record<string, PersonWardrobePreference>>;
  readonly journal: PrivateJournal;
  /** Announced to assistive technology after a navigation action. */
  readonly announcement: string;
}

export const INITIAL_SHELL_STATE: ShellState = {
  history: [{ surface: "scene" }],
  navigation: "closed",
  actionMenuPersonId: null,
  quickDossierPersonId: null,
  pins: [],
  activePinMenuKey: null,
  peopleCategory: "all",
  peopleQuery: "",
  preferences: DEFAULT_PREFERENCES,
  announcement: "",
  personWardrobes: {},
  journal: EMPTY_JOURNAL,
};

export type ShellAction =
  | {
      readonly type: "set-person-wardrobe";
      readonly preference: PersonWardrobePreference;
    }
  | { readonly type: "set-journal"; readonly journal: PrivateJournal }
  | { readonly type: "toggle-navigation" }
  | { readonly type: "open-nav-submenu"; readonly submenu: "personal" }
  | { readonly type: "open-nav-primary" }
  | { readonly type: "close-navigation" }
  | {
      readonly type: "go-to-surface";
      readonly surface: ShellSurface;
      readonly section?: ShellSection;
    }
  | { readonly type: "go-to-scene" }
  | { readonly type: "open-entity"; readonly ref: ShellRef }
  | { readonly type: "back" }
  | { readonly type: "select-person"; readonly personId: EntityId }
  | { readonly type: "close-action-menu" }
  | { readonly type: "open-quick-dossier"; readonly personId: EntityId }
  | { readonly type: "close-quick-dossier" }
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
    }
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
    actionMenuPersonId: null,
    quickDossierPersonId: null,
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

export function shellReducer(
  state: ShellState,
  action: ShellAction,
): ShellState {
  switch (action.type) {
    case "toggle-navigation":
      return {
        ...state,
        navigation: state.navigation === "closed" ? "primary" : "closed",
        actionMenuPersonId: null,
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
     * Selecting somebody in the room carries WHO. The recorded defect was a
     * rail that emitted a person and a parent that threw the id away and opened
     * a generic surface; the id is the whole point of the action, so it travels
     * in the action and lands in the state.
     */
    case "select-person":
      return {
        ...state,
        navigation: "closed",
        activePinMenuKey: null,
        actionMenuPersonId:
          state.actionMenuPersonId === action.personId ? null : action.personId,
      };

    case "close-action-menu":
      return { ...state, actionMenuPersonId: null };

    case "open-quick-dossier":
      return {
        ...state,
        actionMenuPersonId: null,
        quickDossierPersonId: action.personId,
      };

    case "close-quick-dossier":
      return { ...state, quickDossierPersonId: null };

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
        actionMenuPersonId: null,
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
      };

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
      if (state.activePinMenuKey) {
        return { ...state, activePinMenuKey: null };
      }
      if (state.actionMenuPersonId) {
        return { ...state, actionMenuPersonId: null };
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
