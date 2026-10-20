/**
 * Every mined bank in the shape the story director and the English engine
 * read, in one place, so switching from the hand-written template banks is
 * one import:
 *
 *   import { MINED_WORDS } from "../../scripts/english-corpus";
 *   composeJournal(core, director, personId, { data: MINED_WORDS.journal });
 *   composeScene(core, director, personId, entry, MINED_WORDS.scene);
 *   bringItUp(core, speakerId, listenerId, MINED_WORDS.bringItUp);
 *   MINED_WORDS.openingSpeech.composeOpeningSpeech(packet, "state-of-the-union");
 *
 * OPUS-WORDS owns the banks and these adapters; OPUS-PEOPLE owns the engine.
 */
import { addressMoves, composeTurn } from "./address-bank";
import { MINED_CONVERSATION } from "../../src/english/mined/conversation-bank";
import { filingWordsFromBank } from "../../src/english/mined/filing-bank";
import { journalDataFromBank } from "../../src/english/mined/journal-bank";
import { benchControlNames, stanceWords } from "./choice-names-bank";
import { composeCounterVisit } from "./counter-bank";
import { composeNewsStory } from "./newscast-bank";
import { composeOpeningSpeech, openingSpeechKind } from "./opening-speech-bank";
import {
  bringDataFromBank,
  sceneWordsFromBank,
} from "../../src/english/mined/scene-bank";

export const MINED_WORDS = {
  /** Every wording of every choice; the renderer's stable pick chooses one per moment. */
  conversation: () => MINED_CONVERSATION,
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
  /** The decision bench's button names, in its controls.json shape. */
  choiceNames: { benchControlNames, stanceWords },
};
