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
 * Two items, deliberately unglamorous, and both of them gated on the same
 * thing: the formative interval has to have ended. That gate is not a second
 * age rule invented for the ordinary week — `ordinaryLifeAvailableFor` reads
 * the engine's own formative interval — so the prerequisite below names the
 * contract rather than restating an age.
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
    lifeStage: declared("after-formative"),
    roles: declared([
      {
        key: "responsible-person",
        description:
          "The character themselves; both items are written to them and assigned to them.",
        required: true,
      },
    ]),
    prerequisites: declared([
      {
        key: "formative-interval:ended",
        description:
          "ordinaryLifeAvailableFor requires formativeIntervalAt to return null, so the ordinary week is never written for a character still inside the formative years.",
      },
    ]),
    requiredFacts: declared([
      {
        key: "player-requirement:decision",
        description:
          "The item is opened as a work item requiring a decision from the player, not a task that resolves itself.",
      },
    ]),
    slots: undeclared(
      "Both titles and summaries are fixed authored strings with no substitution slots.",
    ),
    options: undeclared(
      "The week is opened as a work item; what can be done about it comes from the ordinary work-item and conversation surfaces rather than from this bank.",
    ),
    followUps: declared([
      {
        key: "conversation:household-obligation",
        description:
          "Covering the week is what the household-obligation conversation subject is about.",
      },
    ]),
    tags: ["ordinary-life", "work-item", "life-stage:after-formative"],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "ORDINARY_LIFE_WORK_ITEMS",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: "Authored so the normal content sample is not one transit bill.",
    },
  };
}
