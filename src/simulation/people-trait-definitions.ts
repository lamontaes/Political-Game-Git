import { createPersonalityTendencyDefinition } from "../core2/mind-catalog";
import type { EntityId, PersonalityTendencyDefinition } from "./types";

import {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
  type PeopleTrait,
  type TraitValue,
} from "../core2/people-mind";
export {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
  type PeopleTrait,
  type TraitValue,
};

interface TraitShape {
  readonly label: string;
  readonly description: string;
  readonly low: { readonly key: string; readonly label: string };
  readonly high: { readonly key: string; readonly label: string };
}

export const TRAIT_SHAPES: Readonly<Record<PeopleTrait, TraitShape>> = {
  deliberation: {
    label: "Deliberation",
    description: "How much someone thinks a choice through before acting.",
    low: { key: "deliberative", label: "Thinks it through" },
    high: { key: "impulsive", label: "Acts on impulse" },
  },
  sociability: {
    label: "Sociability",
    description: "How readily someone reaches out to other people.",
    low: { key: "reserved", label: "Reserved" },
    high: { key: "outgoing", label: "Outgoing" },
  },
  conflict: {
    label: "Handling disagreement",
    description: "Whether someone smooths a disagreement over or presses it.",
    low: { key: "conciliatory", label: "Conciliatory" },
    high: { key: "confrontational", label: "Confrontational" },
  },
  reliability: {
    label: "Keeping commitments",
    description: "How consistently someone follows through on what they said.",
    // High is the dependable end, as every consumer reads it: a lean to
    // "high" asks for somebody who keeps what they said. The poles were the
    // wrong way round, which made those consumers read the opposite people
    // (Q47-004). The stored words are unchanged and still mean what they say,
    // so a saved "dependable" record still describes somebody who follows
    // through; only the internal sign it decodes to has been corrected.
    low: { key: "lets-things-slip", label: "Lets things slip" },
    high: { key: "dependable", label: "Follows through" },
  },
  risk: {
    label: "Risk",
    description: "How willing someone is to take a chance.",
    low: { key: "cautious", label: "Cautious" },
    high: { key: "risk-taking", label: "Takes chances" },
  },
};

export const BALANCED_TRAIT = {
  key: "balanced",
  label: "Neither, much",
} as const;

export function peopleTraitId(trait: PeopleTrait): EntityId {
  return peopleTraitDefinition(trait).id;
}

export function peopleTraitDefinition(
  trait: PeopleTrait,
): PersonalityTendencyDefinition {
  const shape = TRAIT_SHAPES[trait];
  return createPersonalityTendencyDefinition(
    `${PEOPLE_MIND_VERSION}:${trait}`,
    shape.label,
    `${shape.description} A fictional behavior tendency, not a measurement.`,
    [
      {
        key: shape.low.key,
        label: shape.low.label,
        description: `Leans ${shape.low.label.toLowerCase()}.`,
      },
      {
        key: BALANCED_TRAIT.key,
        label: BALANCED_TRAIT.label,
        description: "No marked lean either way.",
      },
      {
        key: shape.high.key,
        label: shape.high.label,
        description: `Leans ${shape.high.label.toLowerCase()}.`,
      },
    ],
  );
}

export function peopleTraitDefinitions(): readonly PersonalityTendencyDefinition[] {
  return PEOPLE_TRAITS.map(peopleTraitDefinition);
}
