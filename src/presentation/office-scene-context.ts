import type { EntityId, World } from "../simulation/types";
import type { ConversationRoomContext } from "./run-b-conversation";

export const RUN_A_FIXTURE_STATE_NAMES = [
  "normal",
  "person-menu",
  "dossier",
  "civic-learning",
  "mixed-pins",
  "navigation",
  "submenu",
] as const;
export type RunAFixtureStateName = (typeof RUN_A_FIXTURE_STATE_NAMES)[number];

export interface RunAScenePersonContext {
  readonly personId: EntityId;
  readonly title: string;
  readonly role: string;
  readonly qualitativeRead: string;
  readonly inferredRead: string;
  readonly workingHabit?: string;
}

export interface RunAFixture {
  readonly world: World;
  readonly playerPersonId: EntityId;
  readonly scenePerson: RunAScenePersonContext;
  readonly officeEventId: EntityId;
  readonly locationDisplayName: string;
  readonly locationLabel: string;
  readonly presentationTime: string;
}

export function parseRunAFixtureState(
  value: string | null | undefined,
): RunAFixtureStateName {
  return RUN_A_FIXTURE_STATE_NAMES.includes(value as RunAFixtureStateName)
    ? (value as RunAFixtureStateName)
    : "normal";
}

export type RunBSceneAnchorId = "primary-desk-chair" | "left-guest-chair";
export type RunBScenePersonVariant = "primary" | "guest";
export interface RunBScenePersonContext extends RunAScenePersonContext {
  readonly anchorId: RunBSceneAnchorId;
  readonly visualVariant: RunBScenePersonVariant;
}
export interface RunBFixture extends RunAFixture {
  readonly scenePeople: readonly [
    RunBScenePersonContext,
    RunBScenePersonContext,
  ];
  readonly roomContext: ConversationRoomContext;
  readonly privateCapableRoomContext: ConversationRoomContext;
}
