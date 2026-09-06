import { ORDINARY_LIFE_WORK_ITEMS } from "../../presentation/ordinary-life";
import type { OrdinaryLifeWorkItemDefinition } from "../../presentation/ordinary-life";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.ordinary-life";
const SOURCE_MODULE = "src/presentation/ordinary-life.ts";

/**
 * The week a character who does not work in a legislature actually has.
 *
 * Two items, deliberately unglamorous — and the bank that holds them declares
 * three things about each: a key, a title and a summary. That is the whole of
 * `OrdinaryLifeWorkItemDefinition`, and it is the whole of what this adapter
 * may report as declared.
 *
 * Everything else a reader might want to know about the ordinary week is real
 * and is somewhere else. The formative gate lives in `ordinaryLifeAvailableFor`,
 * which asks `formativeIntervalAt` against a world. Who the item is assigned
 * to, that it demands a decision rather than resolving itself, how many minutes
 * it takes, what it is focused on — all of that is written by `openOrdinaryLife`
 * at the moment it creates the work item, from a world, for a person. None of
 * it is declared by the bank.
 *
 * The index used to report all of it as though the bank had said it, and to
 * report a household-obligation conversation as a follow-up of both items —
 * a link that appears nowhere in this module at all, and that was simply false
 * of the public meeting. This is the same rule the formative situations are
 * held to: a procedural gate is named where it lives and reported undeclared
 * here, rather than restated as a declarative fact the source never wrote down.
 */
export function ordinaryLifeBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Ordinary life",
    description:
      "The two things an ordinary week puts in front of somebody: a household week that has to be covered, and a public meeting they can go to or skip.",
    domain: "life",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: ORDINARY_LIFE_WORK_ITEMS.map(toItem),
  };
}

function toItem(definition: OrdinaryLifeWorkItemDefinition): ContentItem {
  return {
    id: contentItemId(BANK_ID, definition.key),
    bankId: BANK_ID,
    itemKey: definition.key,
    title: definition.title,
    summary: definition.summary,
    domain: "life",
    family: "ordinary-week",
    authority: "authored",
    status: "production",
    lifeStages: undeclared(
      "ORDINARY_LIFE_WORK_ITEMS bands nothing. Whether the ordinary week is written at all is decided by ordinaryLifeAvailableFor, which asks formativeIntervalAt against a world in src/presentation/ordinary-life.ts.",
    ),
    roles: undeclared(
      "The authored item declares no role. openOrdinaryLife assigns the work item to the character it is writing it for, at the moment it writes it, from a world.",
    ),
    prerequisites: undeclared(
      "The gate is procedural: ordinaryLifeAvailableFor requires formativeIntervalAt to return null for this person in this world. The bank stores no declarative prerequisite to read, and restating the gate here would be a second copy of a rule free to drift from the one that runs.",
    ),
    requiredFacts: undeclared(
      "The authored item names no canonical fact. What openOrdinaryLife records about the work item — its player requirement, effort, focus, access and assignment — is written from a world at creation time rather than declared by the bank.",
    ),
    slots: undeclared(
      "Both titles and summaries are fixed authored strings with no substitution slots.",
    ),
    options: undeclared(
      "The week is opened as a work item; what can be done about it comes from the ordinary work-item and conversation surfaces rather than from this bank.",
    ),
    followUps: undeclared(
      "The authored item names nothing that follows it. The module contains no link from either work item to a conversation subject or to any other content, so there is none to report.",
    ),
    attributes: declared([
      {
        key: `stable-key:${definition.key}`,
        label: "Stable key",
        description: `The work item is written with the stable key ${definition.key}, which is how a save refers to it.`,
      },
    ]),
    unresolvedResearch: undeclared(
      "The ordinary week is authored for the game rather than compiled from an instrument, so it records no unresolved research.",
    ),
    tags: ["ordinary-life", "work-item"],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "ORDINARY_LIFE_WORK_ITEMS",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: "Authored so the normal content sample is not one transit bill.",
      sources: [],
    },
  };
}
