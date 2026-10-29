/**
 * Every mined bank in the shape the story director and the English engine
 * read, in one place, so switching from the hand-written template banks is
 * one import:
 *
 *   import { MINED_WORDS } from "../../scripts/english-corpus";
 *   composeJournal(core, director, personId, { words: MINED_WORDS.journal });
 *   composeScene(core, director, personId, entry, MINED_WORDS.scene);
 *   bringItUp(core, speakerId, listenerId, MINED_WORDS.bringItUp);
 *   MINED_WORDS.openingSpeech.openingMove("inaugural", "plain", "close");
 *
 * OPUS-WORDS owns the banks and these adapters; OPUS-PEOPLE owns the engine.
 */
import { MINED_CONVERSATION } from "../../src/english/mined/conversation-bank";
import { journalDataFromBank } from "../../src/english/mined/journal-bank";
import { benchControlNames, stanceWords } from "./choice-names-bank";
import { composeNewsStory } from "./newscast-bank";
import { openingMove } from "./opening-speech-bank";
import {
  bringWordsFromBank,
  sceneWordsFromBank,
} from "../../src/english/mined/scene-bank";

export const MINED_WORDS = {
  /** Every wording of every choice; the renderer's stable pick chooses one per moment. */
  conversation: () => MINED_CONVERSATION,
  journal: journalDataFromBank(),
  scene: sceneWordsFromBank(),
  bringItUp: { words: bringWordsFromBank() },
  /** The pieces of the President's address that opens the game, one role at a time. */
  openingSpeech: { openingMove },
  /** A story on TV and in the paper: the broadcast, the headline and the lede. */
  news: { composeNewsStory },
  /** The decision bench's button names, in its controls.json shape. */
  choiceNames: { benchControlNames, stanceWords },
};
