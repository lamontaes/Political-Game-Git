import type { RunCSelectionId } from "./run-c-working-document";

export type RunCDocumentPanel = "none" | "analysis" | "compare";

export interface RunCDocumentUiState {
  readonly mode: "closed" | "open";
  readonly annotationsVisible: boolean;
  readonly selectedSelectionId: RunCSelectionId | null;
  readonly actionMenuOpen: boolean;
  readonly panel: RunCDocumentPanel;
}

export type RunCDocumentUiAction =
  | { readonly type: "open" }
  | { readonly type: "close" }
  | {
      readonly type: "select-phrase";
      readonly selectionId: RunCSelectionId;
    }
  | { readonly type: "dismiss-action-menu" }
  | { readonly type: "toggle-annotations" }
  | { readonly type: "open-analysis" }
  | { readonly type: "open-compare" }
  | { readonly type: "close-panel" };

export function createRunCDocumentUiState(): RunCDocumentUiState {
  return {
    mode: "closed",
    annotationsVisible: true,
    selectedSelectionId: null,
    actionMenuOpen: false,
    panel: "none",
  };
}

export function runCDocumentUiReducer(
  state: RunCDocumentUiState,
  action: RunCDocumentUiAction,
): RunCDocumentUiState {
  switch (action.type) {
    case "open":
      return { ...state, mode: "open" };
    case "close":
      return createRunCDocumentUiState();
    case "select-phrase":
      return state.mode === "open"
        ? {
            ...state,
            selectedSelectionId: action.selectionId,
            actionMenuOpen: true,
            panel: "none",
          }
        : state;
    case "dismiss-action-menu":
      return { ...state, actionMenuOpen: false };
    case "toggle-annotations":
      return state.mode === "open"
        ? { ...state, annotationsVisible: !state.annotationsVisible }
        : state;
    case "open-analysis":
      return state.mode === "open"
        ? { ...state, panel: "analysis", actionMenuOpen: false }
        : state;
    case "open-compare":
      return state.mode === "open"
        ? { ...state, panel: "compare", actionMenuOpen: false }
        : state;
    case "close-panel":
      return { ...state, panel: "none" };
  }
}
