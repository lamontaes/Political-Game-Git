/**
 * What a neighbor's invitation to a cause may lean on (Story lead, Nov 17: the
 * join-cause rewrite), each read from the one record that holds it and set
 * only where it holds it, so a line that needs a fact the records do not give
 * never plays:
 *
 * - `meeting`, `body`, `meeting-when`, `item`: the next posted meeting of a
 *   town body the player may come to (meeting-facts.ts `nextMeetingFacts`,
 *   the read a friend's invitation shares). The ask is for that meeting,
 *   which the `attend` promise settles;
 * - `stand-with` or `stand-apart`: where the player stands on the cause's
 *   question, from their own views, against the way the cause wants it
 *   (`desiredChange`). Only a policy question has a view to read;
 * - `sitting-that-night`: the player holds a seat on a body that meets the
 *   same evening, from the office-day engine's own meeting dates.
 *
 * Read when the invitation is composed, never on a day tick.
 */
import { townLean } from "../core2/modules/campaigns";
import {
  nextMeetingDate,
  officeDayParameter,
  OFFICE_DAY_MODULE_ID,
  upcomingMeeting,
} from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonState } from "../core2/types";
import { allQuestions } from "../english/policy-names";
import type { Fact } from "../english/scene-talk-words";
import { nextMeetingFacts } from "./meeting-facts";

/** How far left or right a person leans (the campaign views' `personLean`, handed in so this file reaches no other engine's insides). */
type LeanOf = (
  people: CoreState["people"],
  person: Readonly<PersonState>,
  townLean: number,
) => number;

/** The situation type the invitation plays as. */
export const CAUSE_INVITE_TYPE = "cause-invite";

/** The shared cause's own fields, as the record carries them. */
export interface CauseSharedSaid {
  readonly topic?: string;
  readonly desiredChange?: string;
}

/** The day a meeting's id names (`meeting:<office id>:<day>`). */
const meetingDay = (id: string): string => id.slice(-"YYYY-MM-DD".length);

/**
 * The reads for the invitation `causeId`, for the player it is made to.
 */
export function causeInviteFacts(
  core: Readonly<CoreState>,
  causeId: string,
  said: CauseSharedSaid,
  leanOf: LeanOf,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const playerId = core.playerId;
  if (!playerId) return facts;
  Object.assign(facts, nextMeetingFacts(core));
  const api = coreAPI(core as CoreState);
  const { topic, desiredChange } = said;
  const player = core.people.get(playerId);
  // Where the player stands on the question the cause presses.
  const way =
    desiredChange === "enact"
      ? P.one
      : desiredChange === "repeal"
        ? -P.one
        : P.zero;
  if (player && topic && way !== P.zero && allQuestions().includes(topic)) {
    const leaning =
      way *
      viewOn(api, playerId, topic, leanOf(core.people, player, townLean(api)));
    if (leaning !== P.zero)
      facts[leaning > P.zero ? "stand-with" : "stand-apart"] = {
        text: leaning > P.zero ? "with" : "apart",
        sourceRecordIds: [causeId, playerId],
      };
  }
  // A seat of the player's on a body that meets the same evening as the
  // meeting asked about.
  const meeting = facts.meeting?.sourceRecordIds[P.zero];
  if (meeting && core.modules.has(OFFICE_DAY_MODULE_ID)) {
    const day = meetingDay(meeting);
    const evening = officeDayParameter("eveningMeetingMinute");
    const own = townSeats(api).find(
      (row) =>
        row.holder?.personId === playerId &&
        nextMeetingDate(api, row.office.id) === day &&
        (upcomingMeeting(api, row.office.id)?.rule.startMinute ?? P.zero) >=
          evening,
    );
    if (own)
      facts["sitting-that-night"] = {
        text: "yes",
        sourceRecordIds: [own.office.id, meeting],
      };
  }
  return facts;
}
