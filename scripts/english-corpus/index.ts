/**
 * Every mined bank in the shape the story director and the English engine
 * read, in one place, so switching from the hand-written template banks is
 * one import:
 *
 *   import { MINED_WORDS } from "../../scripts/english-corpus";
 *   openConversation(core, playerId, otherId, { data: MINED_WORDS.conversation() });
 *   composeJournal(core, director, personId, { data: MINED_WORDS.journal });
 *   composeScene(core, director, personId, entry, MINED_WORDS.scene);
 *   bringItUp(core, speakerId, listenerId, MINED_WORDS.bringItUp);
 *   MINED_WORDS.openingSpeech.composeOpeningSpeech(packet, "state-of-the-union");
 *
 * OPUS-WORDS owns the banks and these adapters; OPUS-PEOPLE owns the engine.
 */
import { addressMoves, composeTurn } from "./address-bank";
import { conversationDataFromBank, pickBy } from "./conversation-bank";
import { filingWordsFromBank } from "./filing-bank";
import { journalDataFromBank } from "./journal-bank";
import { composeCounterVisit } from "./counter-bank";
import { composeNewsStory } from "./newscast-bank";
import { composeOpeningSpeech, openingSpeechKind } from "./opening-speech-bank";
import { bringDataFromBank, sceneWordsFromBank } from "./scene-bank";

export const MINED_WORDS = {
  /** One wording per answer choice, chosen by a stable key (a seed and the other person). */
  conversation: (key?: string) =>
    conversationDataFromBank(undefined, key ? pickBy(key) : undefined),
  journal: journalDataFromBank(),
  filingVisit: filingWordsFromBank(),
  scene: sceneWordsFromBank(),
  bringItUp: bringDataFromBank(),
  address: { addressMoves, composeTurn },
  /** The President's address that opens the game, section by section. */
  openingSpeech: { composeOpeningSpeech, openingSpeechKind },
  /** A story on TV and in the paper: the broadcast, the headline and the lede. */
  news: { composeNewsStory },
  /** A visit to an office counter to pay a fee, pick up a form or ask a question. */
  counter: { composeCounterVisit },
};
