import {
  DEFAULT_ROOM_ID,
  refKey,
  type EntityRef,
  type PersonCategory,
} from "./data";

/**
 * The prototype's whole state machine.
 *
 * DEVELOPMENT-ONLY. Session-local, in memory, and gone when the tab closes.
 * There is no `localStorage`, no save write, no second World, and no clock that
 * runs: `PROTOTYPE_NOW` is fixed, so opening and reading any screen here cannot
 * move time. That is the accepted rule made structural — there is no action in
 * this reducer that could advance it even by accident.
 *
 * One reducer owns navigation for every surface. Each screen routes through
 * `open-entity` / `back` rather than keeping its own stack, which is what makes
 * Back behave the same after a pin, a scene person, a directory row, a journal
 * reference and a calendar entry.
 */

export type PinSize = "tiny" | "normal" | "expanded";

export type PeopleView = "categories" | "list";

export type MotionPreference = "system" | "reduce" | "allow";

/** A workspace or entity the player has navigated to. */
export type PrototypeView =
  | { readonly surface: "scene" }
  | { readonly surface: "people" }
  | { readonly surface: "calendar" }
  | { readonly surface: "personal" }
  | { readonly surface: "offices" }
  | { readonly surface: "journal" }
  | { readonly surface: "patch-notes" }
  | { readonly surface: "entity"; readonly ref: EntityRef };

export interface Pin {
  /** Stable key, derived from the reference it points at. */
  readonly key: string;
  readonly ref: EntityRef;
  readonly size: PinSize;
}

export interface PrototypeState {
  readonly screen: "title" | "shell";
  /** Title-level surfaces, which are a different system from in-game menus. */
  readonly titleOverlay: "none" | "saved-games" | "options" | "patch-notes";
  /** Last element is the current view. The base is always the scene. */
  readonly history: readonly PrototypeView[];
  readonly roomId: string;
  readonly navigation: "closed" | "primary" | "places" | "personal";
  /** The anchored person action menu, when one is open. */
  readonly actionMenuPersonId: string | null;
  /** The quick dossier riding next to the selected person. */
  readonly quickDossierPersonId: string | null;
  readonly pins: readonly Pin[];
  readonly activePinMenuKey: string | null;
  readonly peopleView: PeopleView;
  readonly peopleCategory: PersonCategory | "all";
  readonly peopleQuery: string;
  readonly defaultPinSize: PinSize;
  readonly motion: MotionPreference;
  /**
   * The first-entry preview explanation, shown until it is dismissed.
   *
   * U03-07: the owner missed the thin banner and reasonably expected New Game
   * to make a character and Talk to work. A quiet strip cannot carry that; a
   * card the player has to dismiss can, and once dismissed the persistent
   * marker goes back to being discreet.
   */
  readonly previewDismissed: boolean;
  /**
   * The developer inspector.
   *
   * Asset ids, plate state and prototype identity live here rather than in the
   * ordinary composition. They are still true and still one click away — they
   * are simply not part of a screen the owner is judging as a game screen.
   */
  readonly inspectorOpen: boolean;
  /** Announced to assistive technology after a navigation action. */
  readonly announcement: string;
}

export const INITIAL_STATE: PrototypeState = {
  screen: "title",
  titleOverlay: "none",
  history: [{ surface: "scene" }],
  roomId: DEFAULT_ROOM_ID,
  navigation: "closed",
  actionMenuPersonId: null,
  quickDossierPersonId: null,
  pins: [],
  activePinMenuKey: null,
  peopleView: "categories",
  peopleCategory: "all",
  peopleQuery: "",
  defaultPinSize: "normal",
  motion: "system",
  previewDismissed: false,
  inspectorOpen: false,
  announcement: "",
};

export type PrototypeAction =
  | { type: "enter-shell" }
  | { type: "return-to-title" }
  | {
      type: "open-title-overlay";
      overlay: "saved-games" | "options" | "patch-notes";
    }
  | { type: "close-title-overlay" }
  | { type: "toggle-navigation" }
  | { type: "open-nav-submenu"; submenu: "places" | "personal" }
  | { type: "open-nav-primary" }
  | { type: "close-navigation" }
  | { type: "go-to-surface"; surface: PrototypeView["surface"] }
  | { type: "go-to-scene" }
  | { type: "change-room"; roomId: string }
  | { type: "open-entity"; ref: EntityRef }
  | { type: "back" }
  | { type: "select-person"; personId: string }
  | { type: "close-action-menu" }
  | { type: "open-quick-dossier"; personId: string }
  | { type: "close-quick-dossier" }
  | { type: "toggle-pin"; ref: EntityRef }
  | { type: "unpin"; key: string }
  | { type: "set-pin-size"; key: string; size: PinSize }
  | { type: "move-pin"; key: string; direction: "up" | "down" }
  | { type: "reorder-pin"; key: string; toIndex: number }
  | { type: "toggle-pin-menu"; key: string }
  | { type: "set-people-view"; view: PeopleView }
  | { type: "set-people-category"; category: PersonCategory | "all" }
  | { type: "set-people-query"; query: string }
  | { type: "set-default-pin-size"; size: PinSize }
  | { type: "set-motion"; motion: MotionPreference }
  | { type: "dismiss-preview" }
  | { type: "toggle-inspector" }
  | { type: "escape" };

function currentView(state: PrototypeState): PrototypeView {
  return state.history[state.history.length - 1] ?? { surface: "scene" };
}

export function activeView(state: PrototypeState): PrototypeView {
  return currentView(state);
}

/** True when Back has somewhere to go. */
export function canGoBack(state: PrototypeState): boolean {
  return state.history.length > 1;
}

/**
 * Closes every transient layer.
 *
 * Navigating deliberately dismisses the anchored menu, the quick dossier, the
 * nav flyout and any pin menu, because those are all attached to a place the
 * player has just left. Pins themselves are untouched: a pin is a persistent
 * user choice, not a transient layer, and it survives every navigation in the
 * session.
 */
function settled(state: PrototypeState): PrototypeState {
  return {
    ...state,
    navigation: "closed",
    actionMenuPersonId: null,
    quickDossierPersonId: null,
    activePinMenuKey: null,
  };
}

function pushView(state: PrototypeState, view: PrototypeView): PrototypeState {
  const current = currentView(state);
  if (
    current.surface === view.surface &&
    (current.surface !== "entity" ||
      (view.surface === "entity" && refKey(current.ref) === refKey(view.ref)))
  ) {
    return settled(state);
  }
  return {
    ...settled(state),
    history: [...state.history, view],
  };
}

export function prototypeReducer(
  state: PrototypeState,
  action: PrototypeAction,
): PrototypeState {
  switch (action.type) {
    case "enter-shell":
      return {
        ...settled(state),
        screen: "shell",
        titleOverlay: "none",
        history: [{ surface: "scene" }],
        announcement: "Entered the prototype scene shell.",
      };

    case "return-to-title":
      return {
        ...settled(state),
        screen: "title",
        titleOverlay: "none",
        history: [{ surface: "scene" }],
        announcement: "Returned to the title screen.",
      };

    case "open-title-overlay":
      return { ...state, titleOverlay: action.overlay };

    case "close-title-overlay":
      return { ...state, titleOverlay: "none" };

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
        announcement: "Back in the scene.",
      };

    case "go-to-surface": {
      if (action.surface === "scene") {
        return prototypeReducer(state, { type: "go-to-scene" });
      }
      if (action.surface === "entity") return settled(state);
      return {
        ...pushView(state, { surface: action.surface }),
        announcement: `Opened ${action.surface}.`,
      };
    }

    case "change-room":
      return {
        ...settled(state),
        roomId: action.roomId,
        history: [{ surface: "scene" }],
        announcement: "Changed prototype room.",
      };

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
      const existing = state.pins.find((pin) => pin.key === key);
      if (existing) {
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
          { key, ref: action.ref, size: state.defaultPinSize },
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
     * Choosing a size closes that pin's menu, and only that pin's menu.
     *
     * This restores the older accepted rule. A size is a one-shot choice, so
     * leaving the menu standing after it made the rail feel unresponsive —
     * whereas Move up / Move down are repeated, so those deliberately leave the
     * menu open below.
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
     * Drag-to-reorder lands here.
     *
     * The pin is identified by key rather than by its old index, because the
     * drag started before this dispatch and the list must not depend on the
     * caller having tracked indices correctly across a pointer gesture. A key
     * that no longer exists is a no-op rather than a reorder of the wrong pin.
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
      return { ...state, peopleView: action.view };

    case "set-people-category":
      return { ...state, peopleCategory: action.category };

    case "set-people-query":
      return { ...state, peopleQuery: action.query };

    case "set-default-pin-size":
      return { ...state, defaultPinSize: action.size };

    case "set-motion":
      return { ...state, motion: action.motion };

    case "dismiss-preview":
      return { ...state, previewDismissed: true };

    case "toggle-inspector":
      return { ...state, inspectorOpen: !state.inspectorOpen };

    /**
     * Escape closes the highest active transient layer, and only that one.
     *
     * The order below is the visual stacking order, so Escape always undoes the
     * most recent thing the player opened rather than dropping them out of the
     * prototype. Escape at the base of the scene does nothing on purpose: there
     * is no layer left to close, and closing the game would be a surprise.
     */
    case "escape": {
      if (!state.previewDismissed) {
        return { ...state, previewDismissed: true };
      }
      if (state.inspectorOpen) {
        return { ...state, inspectorOpen: false };
      }
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
      /*
       * A title-level overlay is closed by Escape wherever it was opened from.
       * Options and Patch notes are both reachable from inside the shell, and
       * scoping this to the title screen left them stranded there — Escape did
       * nothing, or worse, walked the workspace history behind the overlay.
       */
      if (state.titleOverlay !== "none") {
        return { ...state, titleOverlay: "none" };
      }
      if (state.screen === "shell" && canGoBack(state)) {
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

export function isPinned(state: PrototypeState, ref: EntityRef): boolean {
  const key = refKey(ref);
  return state.pins.some((pin) => pin.key === key);
}
