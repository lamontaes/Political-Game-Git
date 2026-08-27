import type { EntityId, IsoDate } from "../simulation";
import { RUN_A_CIVIC_CONCEPT_ID } from "./run-a-learning";
import type { RunAFixtureStateName } from "./run-a-fixture";

export const RUN_A_PIN_IDS = ["briefing", "person", "district-notes"] as const;
export type RunAPinId = (typeof RUN_A_PIN_IDS)[number];
export type RunAPinSize = "tiny" | "normal" | "expanded";
export type RunAOverlay = "none" | "person-actions" | "dossier" | "civic";
export type RunANavigation = "closed" | "primary" | "submenu";

export interface RunAUiState {
  readonly simulationDate: IsoDate;
  readonly simulationActionSequence: number;
  readonly selectedPersonId: EntityId | null;
  readonly overlay: RunAOverlay;
  readonly navigation: RunANavigation;
  readonly manualPinSizes: Readonly<Partial<Record<RunAPinId, RunAPinSize>>>;
  readonly automaticPinSizes: Readonly<Record<RunAPinId, RunAPinSize>>;
  readonly learnedConceptIds: readonly string[];
}

export type RunAUiAction =
  | { readonly type: "select-person"; readonly personId: EntityId }
  | { readonly type: "inspect-person" }
  | { readonly type: "dismiss-overlay" }
  | { readonly type: "toggle-navigation" }
  | { readonly type: "open-submenu" }
  | { readonly type: "close-navigation" }
  | { readonly type: "open-civic-learning" }
  | { readonly type: "mark-concept-learned"; readonly conceptId: string }
  | {
      readonly type: "set-pin-size";
      readonly pinId: RunAPinId;
      readonly size: RunAPinSize;
    }
  | {
      readonly type: "set-automatic-pin-size";
      readonly pinId: RunAPinId;
      readonly size: RunAPinSize;
    };

export interface RunAUiStateInput {
  readonly simulationDate: IsoDate;
  readonly simulationActionSequence: number;
  readonly scenePersonId: EntityId;
  readonly fixtureState: RunAFixtureStateName;
  readonly learnedConceptIds?: readonly string[];
}

export function createRunAUiState(input: RunAUiStateInput): RunAUiState {
  const overlay: RunAOverlay =
    input.fixtureState === "person-menu"
      ? "person-actions"
      : input.fixtureState === "dossier"
        ? "dossier"
        : input.fixtureState === "civic-learning"
          ? "civic"
          : "none";
  const navigation: RunANavigation =
    input.fixtureState === "submenu"
      ? "submenu"
      : input.fixtureState === "navigation"
        ? "primary"
        : "closed";

  return {
    simulationDate: input.simulationDate,
    simulationActionSequence: input.simulationActionSequence,
    selectedPersonId:
      overlay === "person-actions" || overlay === "dossier"
        ? input.scenePersonId
        : null,
    overlay,
    navigation,
    manualPinSizes:
      input.fixtureState === "mixed-pins"
        ? { "district-notes": "expanded" }
        : {},
    automaticPinSizes: {
      briefing: "normal",
      person: "tiny",
      "district-notes": "tiny",
    },
    learnedConceptIds: [...new Set(input.learnedConceptIds ?? [])].sort(),
  };
}

export function resolveRunAPinSize(
  state: RunAUiState,
  pinId: RunAPinId,
): RunAPinSize {
  return state.manualPinSizes[pinId] ?? state.automaticPinSizes[pinId];
}

export function nextRunAPinSize(size: RunAPinSize): RunAPinSize {
  if (size === "tiny") return "normal";
  if (size === "normal") return "expanded";
  return "tiny";
}

export function runAUiReducer(
  state: RunAUiState,
  action: RunAUiAction,
): RunAUiState {
  switch (action.type) {
    case "select-person":
      return {
        ...state,
        selectedPersonId: action.personId,
        overlay: "person-actions",
      };
    case "inspect-person":
      return state.selectedPersonId ? { ...state, overlay: "dossier" } : state;
    case "dismiss-overlay":
      return { ...state, overlay: "none", selectedPersonId: null };
    case "toggle-navigation":
      return {
        ...state,
        navigation: state.navigation === "closed" ? "primary" : "closed",
      };
    case "open-submenu":
      return { ...state, navigation: "submenu" };
    case "close-navigation":
      return { ...state, navigation: "closed" };
    case "open-civic-learning":
      return {
        ...state,
        overlay: "civic",
        selectedPersonId: null,
        navigation: "closed",
      };
    case "mark-concept-learned":
      if (action.conceptId !== RUN_A_CIVIC_CONCEPT_ID) {
        return state;
      }
      return {
        ...state,
        overlay: "none",
        learnedConceptIds: [
          ...new Set([...state.learnedConceptIds, action.conceptId]),
        ].sort(),
      };
    case "set-pin-size":
      return {
        ...state,
        manualPinSizes: {
          ...state.manualPinSizes,
          [action.pinId]: action.size,
        },
      };
    case "set-automatic-pin-size":
      return {
        ...state,
        automaticPinSizes: {
          ...state.automaticPinSizes,
          [action.pinId]: action.size,
        },
      };
  }
}
