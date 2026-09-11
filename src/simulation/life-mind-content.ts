import {
  createMindCatalog,
  createPersonalValueDefinition,
  createPersonalityTendencyDefinition,
} from "./mind-catalog";
import type { MindCatalog } from "./types";
import { canonicalJson } from "./canonical-json";

/** Authored fictional-life content, not a psychometric or empirical model. */
export const LIFE_MIND_CONTENT_VERSION = "opening-life-mind-v1";

const tendencies = [
  createPersonalityTendencyDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:conversation`,
    "Conversation approach",
    "An ordinary conversational preference that context and later experience can change.",
    [
      {
        key: "ask",
        label: "Ask first",
        description: "Prefers asking a question before offering advice.",
      },
      {
        key: "listen",
        label: "Listen first",
        description: "Prefers hearing the other person out.",
      },
      {
        key: "direct",
        label: "Speak directly",
        description: "Prefers stating a concern plainly.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:leisure`,
    "Leisure preference",
    "A preference for how to spend an available ordinary moment; never an obligation.",
    [
      {
        key: "familiar",
        label: "Something familiar",
        description: "Often chooses a familiar activity.",
      },
      {
        key: "explore",
        label: "Try something",
        description: "Often wants to try an unfamiliar activity.",
      },
      {
        key: "company",
        label: "Spend time together",
        description: "Often seeks company during free time.",
      },
    ],
  ),
];
const values = [
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:privacy`,
    "Privacy",
    "Having a say in what to share about one's own life.",
  ),
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:connection`,
    "Connection",
    "Making time for people one knows.",
  ),
  createPersonalValueDefinition(
    `${LIFE_MIND_CONTENT_VERSION}:learning`,
    "Learning",
    "Taking time to understand something unfamiliar.",
  ),
];

export const LIFE_MIND_IDS = {
  conversation: tendencies[0]!.id,
  leisure: tendencies[1]!.id,
  privacy: values[0]!.id,
  connection: values[1]!.id,
  learning: values[2]!.id,
} as const;

export function createLifeMindCatalog(): MindCatalog {
  return createMindCatalog({
    catalogVersion: "mind-catalog-v1",
    tendencies,
    values,
  });
}

/** Exact definitions, not a prefix loophole. Older empty saves remain valid. */
export function assertLifeMindContent(catalog: MindCatalog): void {
  const allowed = createLifeMindCatalog();
  for (const id of catalog.tendencyOrder) {
    if (
      canonicalJson(catalog.tendencies[id]) !==
      canonicalJson(allowed.tendencies[id])
    ) {
      throw new Error(`Unsupported production personality definition: ${id}`);
    }
  }
  for (const id of catalog.valueOrder) {
    if (
      canonicalJson(catalog.values[id]) !== canonicalJson(allowed.values[id])
    ) {
      throw new Error(`Unsupported production value definition: ${id}`);
    }
  }
}
