/**
 * The address an executive office gives once its holder is sworn in (owner,
 * Oct 29: "depending on what your office is, you'll give a speech"). It is
 * recorded through the speech engine like every speech (`deliverSpeech`, the
 * one place a speech is recorded as heard), never by a second speech writer:
 * the people named in the room hear it, the views engine moves those it
 * persuades and each listener may retell it at home. The words are the English
 * engine's; this holds no sentence.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { SPEECH_MODULE_ID, deliverSpeech } from "../core2/modules/speech";
import { questionTo } from "../english/question-names";
import { P } from "../core2/parameters";
import { standsOf } from "./speech-builder";
import { swornOffice } from "./swearing-in";

/** What a swearing-in's endings keep on the scene's reply record. */
export const OATH_KEEPS = "oath";
export const ADDRESS_KEEPS = "address";
/** The move whose reply argues the speaker's own stand in the address. */
const ARGUES_MOVE = "tell";
/** What the address is called in its record id, which names the occasion. */
const INAUGURAL = "inaugural";

/**
 * The stand the speaker argues in an address: their strongest recorded view
 * that the English engine can name, the way the speech builder offers it.
 */
export function inauguralStand(
  core: Readonly<CoreState>,
  speakerId: PersonId,
): {
  readonly question: string;
  readonly desiredChange: "enact" | "repeal";
  /** The stand as a verb phrase after "to": "raise the minimum wage". */
  readonly to: string;
} | null {
  for (const stand of standsOf(core, speakerId)) {
    const to = questionTo(stand.question);
    if (to)
      return {
        question: stand.question,
        desiredChange: stand.view > P.zero ? "enact" : "repeal",
        to,
      };
  }
  return null;
}

/**
 * The address an executive office gives once sworn in, recorded through the
 * speech engine like every speech: the people named in the room hear it, the
 * views engine moves those it persuades and each listener may retell it at
 * home. The speaker argues their own stand where the reply they chose did;
 * otherwise it is a speech of welcome that moves no one's view. Said once for
 * the seat and the day. Null where the office gives none or the world keeps no
 * speech engine.
 * stopgapId: SG-WORDS-swearing-in-address-in-scene
 */
export function giveInauguralAddress(
  core: CoreState,
  input: {
    readonly speakerId: PersonId;
    readonly causeId: string;
    readonly audienceIds: readonly PersonId[];
    /** The move of the reply that ended the scene. */
    readonly move: string;
  },
): string | null {
  const sworn = swornOffice(core, input.causeId);
  const api = coreAPI(core);
  if (!sworn?.givesAddress || !api.state.modules.has(SPEECH_MODULE_ID))
    return null;
  const id = `speech:${INAUGURAL}:${sworn.seatId}:${sworn.date}`;
  if (core.eventIds.has(id)) return id;
  const stand =
    input.move === ARGUES_MOVE
      ? inauguralStand(core, input.speakerId)
      : null;
  deliverSpeech(api, {
    id,
    speakerId: input.speakerId,
    placeId: sworn.placeId,
    topic: stand?.question ?? "",
    desiredChange: stand?.desiredChange ?? "",
    audienceIds: input.audienceIds.filter(
      (audience) =>
        audience !== input.speakerId &&
        core.people.get(audience)?.alive === true,
    ),
  });
  return id;
}
