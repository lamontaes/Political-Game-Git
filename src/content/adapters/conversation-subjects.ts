import {
  conversationCommitContract,
  conversationSubjectKeys,
} from "../../presentation/conversation-subjects";
import type { ConversationCommitContract } from "../../presentation/conversation-subjects";
import type {
  ConversationProgress,
  ConversationSubjectKey,
} from "../../presentation/run-b-conversation-progress";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
} from "../content-bank";

const BANK_ID: ContentBankId = "content.conversation-subjects";
const SOURCE_MODULE = "src/presentation/conversation-subjects.ts";

/**
 * What a conversation can be about.
 *
 * The subject's commit contract is the declarative part of a conversation
 * family: the canonical event type a turn writes, how the record tags it, the
 * setting in the record's own words, why the exchange is happening. All of
 * that is data on the contract, so all of it is read straight through.
 *
 * What a subject can *say* is not data. Intents come out of
 * `availableIntents`, which needs a world, a room and a state, and the
 * sentences a turn records are closures over those intents. There is no
 * enumerable list of them to index, and writing one here would be a second
 * list of intents that the running conversation would never consult. So the
 * options and the role requirements are reported undeclared, with the reason,
 * and making them declarative is a change to the conversation bank rather than
 * something this index may quietly do on its behalf.
 */
export function conversationSubjectBank(): ContentBank {
  return {
    id: BANK_ID,
    title: "Conversation subjects",
    description:
      "The families a conversation can be about, and the canonical vocabulary each one commits its turns in.",
    domain: "conversation",
    authority: "authored",
    status: "production",
    sourceModule: SOURCE_MODULE,
    items: conversationSubjectKeys().map(toItem),
  };
}

function toItem(subject: ConversationSubjectKey): ContentItem {
  const contract = contractFor(subject);
  return {
    id: contentItemId(BANK_ID, subject),
    bankId: BANK_ID,
    itemKey: subject,
    title: subject,
    summary: contract.socialContext,
    domain: "conversation",
    family: contract.contextTag,
    authority: "authored",
    status: "production",
    lifeStage: undeclared(
      "A conversation subject is offered by the room it belongs to, and the bank bands nothing by age.",
    ),
    roles: undeclared(
      "Named parts are asked for by a subject's own dialogue through conversationRole at the moment it speaks; the contract declares no role list.",
    ),
    prerequisites: declared([
      {
        key: `room:${contract.contextTag}`,
        description: `The room has to be one this subject belongs to; a turn is recorded as ${contract.contextTag}.`,
      },
    ]),
    requiredFacts: declared([
      {
        key: `event-type:${contract.eventType}`,
        description: `Every turn writes a canonical ${contract.eventType} event.`,
      },
      {
        key: `setting:${contract.setting}`,
        description: `The record describes the scene as: ${contract.setting}`,
      },
    ]),
    slots: undeclared(
      "Choice sentences are written by closures over a ConversationChoiceContext, so the bank exposes no enumerable slot list.",
    ),
    options: undeclared(
      "Available intents come from availableIntents(world, room, addressee, progress, …) and cannot be read without a world.",
    ),
    followUps: undeclared(
      "A subject advances its own bounded progress and does not name a following content item.",
    ),
    tags: [
      contract.contextTag,
      contract.subjectTag,
      ...contract.interactionTags,
    ],
    provenance: {
      sourceModule: SOURCE_MODULE,
      sourceSymbol: "conversationCommitContract",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: contract.motivation,
    },
  };
}

/**
 * The contract reads only `progress.subject`, and a subject key is the only
 * thing an index has. Constructing a whole plausible progress state to ask a
 * question about the family would mean inventing a state that no game ever had.
 */
function contractFor(
  subject: ConversationSubjectKey,
): ConversationCommitContract {
  return conversationCommitContract({ subject } as ConversationProgress);
}
