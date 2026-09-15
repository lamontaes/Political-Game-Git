/**
 * Office workflow preferences and standing vote instructions.
 *
 * These records bind a controlled person to an office work relationship. They
 * are a play/scheduling policy, not voting membership and not a floor vote.
 * Legislative transitions remain with the legislative writers.
 */

import { canonicalJson } from "./canonical-json";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  measureActions,
  measureAmendments,
  requireMeasure,
} from "./legislation";
import { currentMeasureProvisions } from "./legislative-politics";
import type {
  EntityId,
  OfficeBriefingInspectionRecord,
  OfficeBriefingItemKind,
  OfficeCaseworkWorkflowMode,
  OfficeVoteInstructionDisposition,
  OfficeVoteInstructionRecord,
  OfficeVotingWorkflowMode,
  OfficeWorkflowPreferenceRecord,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

const VOTING_MODES: readonly OfficeVotingWorkflowMode[] = [
  "review-batch",
  "prior-instructions-with-exceptions",
  "handle-individually",
];

const CASEWORK_MODES: readonly OfficeCaseworkWorkflowMode[] = [
  "player-handles-all",
  "staff-routine-player-exceptions",
  "staff-handles-and-briefs",
];

const INSTRUCTION_DISPOSITIONS: readonly OfficeVoteInstructionDisposition[] = [
  "yea",
  "nay",
  "present-not-voting",
];

export function officeWorkflowPreferences(
  world: World,
): readonly OfficeWorkflowPreferenceRecord[] {
  return world.history.officeWorkflowPreferences ?? [];
}

export function officeVoteInstructions(
  world: World,
): readonly OfficeVoteInstructionRecord[] {
  return world.history.officeVoteInstructions ?? [];
}

export function officeBriefingInspections(
  world: World,
): readonly OfficeBriefingInspectionRecord[] {
  return world.history.officeBriefingInspections ?? [];
}

export function currentOfficeWorkflowPreference(
  world: World,
  personId: EntityId,
  officeRelationshipId: EntityId,
): OfficeWorkflowPreferenceRecord | null {
  const superseded = new Set(
    officeWorkflowPreferences(world).flatMap((record) =>
      record.supersedesPreferenceId ? [record.supersedesPreferenceId] : [],
    ),
  );
  return (
    officeWorkflowPreferences(world)
      .filter(
        (record) =>
          record.personId === personId &&
          record.officeRelationshipId === officeRelationshipId &&
          !superseded.has(record.id),
      )
      .sort((left, right) => right.sequence - left.sequence)[0] ?? null
  );
}

export function currentOfficeVoteInstruction(
  world: World,
  personId: EntityId,
  officeRelationshipId: EntityId,
  measureId: EntityId,
): OfficeVoteInstructionRecord | null {
  return (
    officeVoteInstructions(world)
      .filter(
        (record) =>
          record.personId === personId &&
          record.officeRelationshipId === officeRelationshipId &&
          record.measureId === measureId,
      )
      .sort((left, right) => right.sequence - left.sequence)[0] ?? null
  );
}

/**
 * The exact bill text this instruction talks about. A later provision or
 * amendment is a different bill. A calendar or referral step is not.
 */
export function measureTextVersion(world: World, measureId: EntityId): string {
  requireMeasure(world, measureId);
  const provisions = currentMeasureProvisions(world, measureId).map(
    (record) => record.id,
  );
  const amendments = measureAmendments(world, measureId).map((record) => ({
    id: record.id,
    status: record.status,
  }));
  return canonicalJson({
    provisions,
    amendments,
  });
}

/** The last recorded procedural step, separate from the bill's text. */
export function measureProceduralStage(
  world: World,
  measureId: EntityId,
): {
  readonly lastActionId: EntityId | null;
  readonly lastActionKind: string | null;
} {
  requireMeasure(world, measureId);
  const lastAction = measureActions(world, measureId).at(-1);
  return {
    lastActionId: lastAction?.id ?? null,
    lastActionKind: lastAction?.kind ?? null,
  };
}

export type OfficeWorkflowWriteResult =
  | { readonly kind: "recorded"; readonly world: World }
  | {
      readonly kind: "refused";
      readonly reason: string;
      readonly world: World;
    };

export interface RecordOfficeWorkflowPreferenceInput {
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly votingMode: OfficeVotingWorkflowMode;
  readonly caseworkMode: OfficeCaseworkWorkflowMode;
}

export function recordOfficeWorkflowPreference(
  world: World,
  input: RecordOfficeWorkflowPreferenceInput,
): OfficeWorkflowWriteResult {
  if (!world.people[input.personId]) {
    return refused(
      world,
      "A preference cannot be recorded for a missing person.",
    );
  }
  const relationship = world.history.workRelationships.find(
    (entry) => entry.id === input.officeRelationshipId,
  );
  if (!relationship) {
    return refused(world, "No office relationship matches this preference.");
  }
  if (relationship.personId !== input.personId) {
    return refused(
      world,
      "An office preference must belong to the person who holds the office.",
    );
  }
  if (!VOTING_MODES.includes(input.votingMode)) {
    return refused(world, "That voting workflow is not a supported choice.");
  }
  if (!CASEWORK_MODES.includes(input.caseworkMode)) {
    return refused(world, "That casework workflow is not a supported choice.");
  }
  const current = currentOfficeWorkflowPreference(
    world,
    input.personId,
    input.officeRelationshipId,
  );
  if (
    current &&
    current.votingMode === input.votingMode &&
    current.caseworkMode === input.caseworkMode
  ) {
    return { kind: "recorded", world };
  }
  const stableKey = `office-workflow:${input.personId}:${input.officeRelationshipId}:${world.history.nextSequence}`;
  const record: OfficeWorkflowPreferenceRecord = {
    id: createStableId(
      "office-workflow-preference",
      `${world.id}:${stableKey}`,
    ),
    stableKey,
    sequence: world.history.nextSequence,
    personId: input.personId,
    officeRelationshipId: input.officeRelationshipId,
    votingMode: input.votingMode,
    caseworkMode: input.caseworkMode,
    recordedAt: makeIsoDate(world.currentDate),
    supersedesPreferenceId: current?.id ?? null,
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      officeWorkflowPreferences: [...officeWorkflowPreferences(world), record],
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next };
}

export interface RecordOfficeVoteInstructionInput {
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly chamberKey: string;
  readonly measureId: EntityId;
  readonly disposition: OfficeVoteInstructionDisposition;
}

export function recordOfficeVoteInstruction(
  world: World,
  input: RecordOfficeVoteInstructionInput,
): OfficeWorkflowWriteResult {
  if (!world.people[input.personId]) {
    return refused(world, "A vote instruction cannot name a missing person.");
  }
  const relationship = world.history.workRelationships.find(
    (entry) => entry.id === input.officeRelationshipId,
  );
  if (!relationship || relationship.personId !== input.personId) {
    return refused(
      world,
      "A vote instruction must bind the person who holds this office.",
    );
  }
  if (!INSTRUCTION_DISPOSITIONS.includes(input.disposition)) {
    return refused(world, "That vote instruction is not a supported choice.");
  }
  let measure;
  try {
    measure = requireMeasure(world, input.measureId);
  } catch {
    return refused(world, "That bill is not recorded in this World.");
  }
  const preference = currentOfficeWorkflowPreference(
    world,
    input.personId,
    input.officeRelationshipId,
  );
  if (!preference) {
    return refused(
      world,
      "Record how this office handles votes before leaving a standing instruction.",
    );
  }
  if (preference.votingMode === "handle-individually") {
    return refused(
      world,
      "This office handles votes one at a time, so a standing instruction is not recorded.",
    );
  }
  const version = measureTextVersion(world, measure.id);
  const existing = currentOfficeVoteInstruction(
    world,
    input.personId,
    input.officeRelationshipId,
    measure.id,
  );
  if (
    existing &&
    existing.measureTextVersion === version &&
    existing.disposition === input.disposition &&
    existing.chamberKey === input.chamberKey
  ) {
    return { kind: "recorded", world };
  }
  const stableKey = `office-vote-instruction:${input.personId}:${input.officeRelationshipId}:${measure.id}:${world.history.nextSequence}`;
  const record: OfficeVoteInstructionRecord = {
    id: createStableId("office-vote-instruction", `${world.id}:${stableKey}`),
    stableKey,
    sequence: world.history.nextSequence,
    personId: input.personId,
    officeRelationshipId: input.officeRelationshipId,
    chamberKey: input.chamberKey,
    measureId: measure.id,
    measureTextVersion: version,
    disposition: input.disposition,
    recordedAt: makeIsoDate(world.currentDate),
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      officeVoteInstructions: [...officeVoteInstructions(world), record],
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next };
}

export interface RecordOfficeBriefingInspectionInput {
  readonly personId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly measureId: EntityId;
  readonly itemKind: OfficeBriefingItemKind;
  readonly itemId: EntityId;
}

export function recordOfficeBriefingInspection(
  world: World,
  input: RecordOfficeBriefingInspectionInput,
): OfficeWorkflowWriteResult {
  if (!world.people[input.personId]) {
    return refused(
      world,
      "A briefing inspection cannot name a missing person.",
    );
  }
  const already = officeBriefingInspections(world).some(
    (record) =>
      record.personId === input.personId &&
      record.officeRelationshipId === input.officeRelationshipId &&
      record.measureId === input.measureId &&
      record.itemKind === input.itemKind &&
      record.itemId === input.itemId,
  );
  if (already) return { kind: "recorded", world };
  const stableKey = `office-briefing-inspection:${input.personId}:${input.officeRelationshipId}:${input.measureId}:${input.itemKind}:${input.itemId}`;
  if (
    officeBriefingInspections(world).some(
      (record) => record.stableKey === stableKey,
    )
  ) {
    return { kind: "recorded", world };
  }
  const record: OfficeBriefingInspectionRecord = {
    id: createStableId(
      "office-briefing-inspection",
      `${world.id}:${stableKey}`,
    ),
    stableKey,
    sequence: world.history.nextSequence,
    personId: input.personId,
    officeRelationshipId: input.officeRelationshipId,
    measureId: input.measureId,
    itemKind: input.itemKind,
    itemId: input.itemId,
    inspectedAt: makeIsoDate(world.currentDate),
  };
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      officeBriefingInspections: [...officeBriefingInspections(world), record],
    },
  };
  assertWorldIntegrity(next);
  return { kind: "recorded", world: next };
}

function refused(world: World, reason: string): OfficeWorkflowWriteResult {
  return { kind: "refused", reason, world };
}
