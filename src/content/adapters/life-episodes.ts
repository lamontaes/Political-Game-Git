import { EPISODE_FAMILIES } from "../../simulation/episode-bank";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentFacet,
  type ContentFollowUp,
  type ContentItem,
  type ContentOption,
  type ContentRole,
  type ContentSlot,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.episodes";
const SOURCE_MODULE = "src/simulation/episode-bank.ts";

type EpisodeFamilyEntry = (typeof EPISODE_FAMILIES)[number];
type EpisodeStageEntry = EpisodeFamilyEntry["stages"][number];

/**
 * The authored episode families, one stage at a time.
 *
 * An episode family is a small tree: a narrative family, the roles it may bind,
 * and a set of stages, each of which is a single authored moment with its own
 * lines and its own options. The unit a reviewer actually reads is the stage,
 * so that is the item here — `family-key/stage-key` — and the family is carried
 * in the `family` field and a tag rather than collapsed away. Nothing across
 * stages is merged, so the staged shape the bank authored is not flattened into
 * one fake choice set.
 *
 * What a stage declares is what a stage writes down: its options, the roles its
 * family may bind, and the `{self}`/`{place}`/`{age}`/`{role:…}` slots its
 * lines expect. What it does not declare is undeclared with the reason: a
 * stage's requirements and the facts they read are predicates evaluated against
 * a world by `eligibleEpisodeBeats`, not a list of declarative prerequisites,
 * and restating them here would be a second copy of a rule free to drift from
 * the one that runs.
 */
export function lifeEpisodeBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Life episodes",
    description:
      "The authored adult narrative episodes, taken one stage at a time: each stage's lines, the choices it offers, and the roles its family may bind.",
    domain: "narrative",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: EPISODE_FAMILIES.flatMap((family) =>
      family.stages.map((stage) => toItem(family, stage)),
    ),
  };
}

function toItem(
  family: EpisodeFamilyEntry,
  stage: EpisodeStageEntry,
): ContentItem {
  const itemKey = `${family.key}/${stage.key}`;
  const summary = stage.lines.join(" ").trim() || humanize(stage.key);

  const roles: readonly ContentRole[] = family.roles.map((role) => ({
    key: role,
    description: `A role the ${humanize(family.key)} family may bind; a stage asks for the ones its lines and options need.`,
    required: false,
  }));

  const options: readonly ContentOption[] = stage.options.map((option) => ({
    key: option.key,
    label: option.label,
    description: option.description,
  }));

  return {
    id: contentItemId(BANK_ID, itemKey),
    bankId: BANK_ID,
    itemKey,
    title: `${humanize(family.key)} — ${humanize(stage.key)}`,
    summary,
    domain: "narrative",
    family: family.family,
    authority: "authored",
    status: "production",
    lifeStage: undeclared(
      "Episodes are not banded by life stage; a beat becomes eligible from its stage requirements against a world, evaluated by eligibleEpisodeBeats in src/simulation/life-episodes.ts.",
    ),
    roles: declared(roles),
    prerequisites: undeclared(
      "A stage's `requires` are episode requirements evaluated against a world by eligibleEpisodeBeats; they are a running rule, not a declarative prerequisite this index can restate without a second copy free to drift.",
    ),
    requiredFacts: undeclared(
      "The facts a stage reads are computed from world records by episodeFacts in src/simulation/life-episodes.ts; the bank stores no declarative fact requirements to read.",
    ),
    slots: declareSlots(stage),
    options:
      options.length > 0
        ? declared(options)
        : undeclared(
            "This stage offers no options of its own; it is a line the instance passes through.",
          ),
    followUps: declareFollowUps(stage),
    tags: [
      `episode-family:${family.key}`,
      `narrative-family:${family.family}`,
      `stakes:${stage.stakes}`,
      ...family.roles.map((role) => `role:${role}`),
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "EPISODE_FAMILIES",
      citation: family.authority.reference,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: `Authored for the game. Copy authority: ${family.authority.sourceDocument} — ${family.authority.reference}.`,
    },
  };
}

/**
 * The substitution slots a stage's authored text expects.
 *
 * Read straight off the lines, the option memory and the option copy — the four
 * slot forms the bank documents (`{self}`, `{place}`, `{age}`, `{role:<key>}`)
 * are literal tokens, so what the text asks to be filled in is knowable without
 * a world even though filling it in needs one.
 */
function declareSlots(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentSlot[]> {
  const texts = [
    ...stage.lines,
    ...stage.options.flatMap((option) => [
      option.label,
      option.description,
      option.memory,
    ]),
  ];
  const keys = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(/\{([^}]+)\}/g)) {
      const token = match[1];
      if (token) keys.add(token);
    }
  }
  if (keys.size === 0) {
    return undeclared(
      "This stage's lines and options carry no substitution slots.",
    );
  }
  return declared(
    [...keys].sort().map((key) => ({
      key,
      description: `A slot the authored copy fills from the bound scene; substituted against a world by substituteSlots.`,
    })),
  );
}

/** The stages this one advises may follow. Advisory and authored, so declared. */
function declareFollowUps(
  stage: EpisodeStageEntry,
): ContentFacet<readonly ContentFollowUp[]> {
  if (stage.mayLeadTo.length === 0) {
    return undeclared(
      "This stage advises no next stage; where an instance ends is decided by the family's exits and the world, not a named follow-up.",
    );
  }
  return declared(
    stage.mayLeadTo.map((next) => ({
      key: next,
      description: `The stage advises that ${humanize(next)} may follow. Advisory only: eligibility is computed from requirements, not from this list.`,
    })),
  );
}

function humanize(key: string): string {
  const words = key.replace(/[._/-]+/g, " ").trim();
  return words.length > 0
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : key;
}
