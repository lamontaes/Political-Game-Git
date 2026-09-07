import { EPISODE_FAMILIES } from "../../../src/simulation/episode-bank";
import { LIFE_CONTENT_92C_KERNELS } from "../../../src/simulation/life-content-92c";
import type {
  EpisodeFamily,
  EpisodeRequirement,
  EpisodeStage,
} from "../../../src/simulation/life-episodes";
import { contextRevisionOf, revisionOf } from "../anchors";
import { proseId, templateSlots } from "../ids";
import type { ProseGroundingRef, ProseRecord } from "../types";

/**
 * The episode banks, read as prose rather than as machinery.
 *
 * `EPISODE_FAMILIES` is the single registry the game itself selects from, and
 * it already composes `episode-bank.ts` with the PR #119 92C families. Reading
 * that one array is what keeps the reviewed bank and the played bank from
 * drifting: there is no second list here that could fall behind.
 *
 * Withholding is read, never inferred. PR #119 made it a first-class
 * `EpisodeRequirement` of kind `withheld` carrying its own reason, so a stage
 * that declares one is reported WITHHELD_BY_GROUNDING with that exact reason.
 * The corpus never decides that a stage *ought* to be reachable.
 */

const EPISODE_MODULE = "src/simulation/episode-bank.ts";
const NINETY_TWO_C_MODULE = "src/simulation/life-content-92c.ts";

/** Which file a family is authored in, so a reviewer opens the right one. */
function familyModule(familyKey: string): string {
  return NINETY_TWO_C_KEYS.has(familyKey)
    ? NINETY_TWO_C_MODULE
    : EPISODE_MODULE;
}

const NINETY_TWO_C_KEYS = new Set(
  LIFE_CONTENT_92C_KERNELS.map((kernel) => kernel.episodeKey),
);

const NINETY_TWO_C_STAGES = new Set(
  LIFE_CONTENT_92C_KERNELS.map(
    (kernel) => `${kernel.episodeKey}/${kernel.stageKey}`,
  ),
);

/** The declared reason a stage is held back, or null when it is not. */
export function withheldReason(stage: EpisodeStage): string | null {
  for (const requirement of stage.requires) {
    if (requirement.kind === "withheld") return requirement.reason;
  }
  return null;
}

/** Every requirement, restated as the fact it asks the world to establish. */
function groundingFor(stage: EpisodeStage): readonly ProseGroundingRef[] {
  const refs: ProseGroundingRef[] = stage.requires.map(
    (requirement: EpisodeRequirement): ProseGroundingRef => {
      switch (requirement.kind) {
        case "withheld":
          return {
            key: "withheld",
            description: requirement.reason,
            kind: "withheld",
          };
        case "fact":
          return {
            key: `fact:${requirement.fact}`,
            description: `The record establishes ${requirement.fact}.`,
            kind: "requirement",
          };
        case "absent":
          return {
            key: `absent:${requirement.fact}`,
            description: `The record does not establish ${requirement.fact}.`,
            kind: "requirement",
          };
        case "age-at-least":
          return {
            key: `age-at-least:${requirement.age}`,
            description: `The character is at least ${requirement.age}.`,
            kind: "age-gate",
          };
        case "age-below":
          return {
            key: `age-below:${requirement.age}`,
            description: `The character is under ${requirement.age}.`,
            kind: "age-gate",
          };
        case "role":
          return {
            key: `role:${requirement.role}`,
            description: `A canonical person fills the ${requirement.role} role.`,
            kind: "role",
          };
        case "role-age-at-least":
          return {
            key: `role:${requirement.role}`,
            description: `The bound ${requirement.role} is at least ${requirement.age}.`,
            kind: "role",
          };
        case "role-age-below":
          return {
            key: `role:${requirement.role}`,
            description: `The bound ${requirement.role} is under ${requirement.age}.`,
            kind: "role",
          };
        case "capability":
          return {
            key: `capability:${requirement.capability}`,
            description: `The record shows the character can ${requirement.capability}.`,
            kind: "requirement",
          };
        case "without-capability":
          return {
            key: `without-capability:${requirement.capability}`,
            description: `The record shows the character does not ${requirement.capability}.`,
            kind: "requirement",
          };
        case "after-stage":
          return {
            key: `after-stage:${requirement.stage}`,
            description: `This instance already played ${requirement.stage}.`,
            kind: "requirement",
          };
        case "without-stage":
          return {
            key: `without-stage:${requirement.stage}`,
            description: `This instance has not played ${requirement.stage}.`,
            kind: "requirement",
          };
        case "after-choice":
          return {
            key: `after-choice:${requirement.stage}:${requirement.option}`,
            description: `${requirement.stage} was answered ${requirement.option}.`,
            kind: "requirement",
          };
        case "without-choice":
          return {
            key: `without-choice:${requirement.stage}:${requirement.option}`,
            description: `${requirement.stage} was not answered ${requirement.option}.`,
            kind: "requirement",
          };
        case "days-since-stage":
          return {
            key: `days-since-stage:${requirement.stage}:${requirement.days}`,
            description: `At least ${requirement.days} days since ${requirement.stage}.`,
            kind: "requirement",
          };
      }
    },
  );
  if (refs.length === 0) {
    refs.push({
      key: "unconditional",
      description: "The bank declares no requirement for this stage.",
      kind: "undeclared",
    });
  }
  return refs;
}

function record(input: {
  readonly family: EpisodeFamily;
  readonly stage: EpisodeStage;
  readonly field: string;
  readonly surface: ProseRecord["surface"];
  readonly text: string;
}): ProseRecord {
  const { family, stage, field, surface, text } = input;
  const stableKey = `${family.key}/${stage.key}`;
  const held = withheldReason(stage);
  const slots = templateSlots(text);
  const grounding = groundingFor(stage);
  return {
    id: proseId({ domain: "life", bank: "episode", stableKey, field }),
    domain: "life",
    bank: "episode",
    stableKey,
    field,
    surface,
    sourcePath: familyModule(family.key),
    sourceSymbol: `EPISODE_FAMILIES/${family.key}/${stage.key}`,
    text,
    realization: slots.length > 0 ? "templated" : "static",
    slots,
    reachability: held ? "WITHHELD_BY_GROUNDING" : "PLAYER_REACHABLE",
    reachabilityReason:
      held ??
      "The stage declares only ordinary requirements; play reaches it when they hold.",
    grounding,
    provenance: {
      sourceDocument: family.authority.sourceDocument,
      reference: family.authority.reference,
      family: family.family,
      wave: NINETY_TWO_C_STAGES.has(stableKey) ? "92C" : "pre-92C",
    },
    tags: [
      `family:${family.family}`,
      `stakes:${stage.stakes}`,
      ...(held ? ["withheld"] : []),
    ],
    textRevision: revisionOf(text),
    contextRevision: contextRevisionOf(grounding),
  };
}

export function episodeProseRecords(): readonly ProseRecord[] {
  const records: ProseRecord[] = [];
  for (const family of EPISODE_FAMILIES) {
    for (const stage of family.stages) {
      stage.lines.forEach((line, index) => {
        records.push({
          ...record({
            family,
            stage,
            field: `line:${index}`,
            surface: "scene-line",
            text: line,
          }),
        });
      });
      for (const option of stage.options) {
        records.push(
          record({
            family,
            stage,
            field: `option:${option.key}:label`,
            surface: "option-label",
            text: option.label,
          }),
          record({
            family,
            stage,
            field: `option:${option.key}:description`,
            surface: "option-description",
            text: option.description,
          }),
          record({
            family,
            stage,
            field: `option:${option.key}:memory`,
            surface: "option-memory",
            text: option.memory,
          }),
        );
      }
    }
  }
  return records;
}
