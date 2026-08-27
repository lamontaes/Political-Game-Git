import type { EntityId } from "../simulation";

export type RunDWorkspaceMode = "closed" | "calendar" | "work";

export interface RunDUiState {
  readonly mode: RunDWorkspaceMode;
  readonly selectedActivityId: EntityId | null;
  readonly feedback: string | null;
}

export type RunDUiAction =
  | { readonly type: "open-calendar"; readonly activityId?: EntityId }
  | { readonly type: "open-work" }
  | { readonly type: "close" }
  | { readonly type: "select-activity"; readonly activityId: EntityId }
  | { readonly type: "close-activity-detail" }
  | { readonly type: "set-feedback"; readonly message: string | null };

export function createRunDUiState(): RunDUiState {
  return { mode: "closed", selectedActivityId: null, feedback: null };
}

export function runDUiReducer(
  state: RunDUiState,
  action: RunDUiAction,
): RunDUiState {
  switch (action.type) {
    case "open-calendar":
      return {
        mode: "calendar",
        selectedActivityId: action.activityId ?? null,
        feedback: null,
      };
    case "open-work":
      return { mode: "work", selectedActivityId: null, feedback: null };
    case "close":
      return { mode: "closed", selectedActivityId: null, feedback: null };
    case "select-activity":
      return {
        ...state,
        selectedActivityId: action.activityId,
        feedback: null,
      };
    case "close-activity-detail":
      return { ...state, selectedActivityId: null, feedback: null };
    case "set-feedback":
      return { ...state, feedback: action.message };
  }
}
