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
 * - `cause-public`: the cause is one a town body decides (a policy question or
 *   a budget line), so a line may say it is taken to that body; an illness is
 *   not;
 * - `stand-with` or `stand-apart`: where the player stands on the cause's
 *   question or budget line, from their own views, against the way the cause
 *   wants it (`desiredChange`). An illness has no view to read;
 * - `title`: the office the player holds, as the seat's own record names it
 *   (the offices engine's town seats), for a line that addresses them by it.
 *
 * Read when the invitation is composed, never on a day tick.
 */
import { townLean } from "../core2/modules/campaigns";
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

/** What a budget line's topic begins with (drives.ts `driveIdentity`). */
const BUDGET_PREFIX = "budget-line:";

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
  const held = townSeats(coreAPI(core as CoreState)).find(
    (row) => row.holder?.personId === playerId,
  );
  if (held)
    facts.title = {
      text: held.office.title,
      sourceRecordIds: [held.office.id, playerId],
    };
  const { topic, desiredChange } = said;
  if (
    topic &&
    (topic.startsWith(BUDGET_PREFIX) || allQuestions().includes(topic))
  )
    facts["cause-public"] = { text: "yes", sourceRecordIds: [causeId] };
  const player = core.people.get(playerId);
  // Where the player stands on the question the cause presses.
  const way =
    desiredChange === "enact"
      ? P.one
      : desiredChange === "repeal"
        ? -P.one
        : P.zero;
  if (player && topic && way !== P.zero && facts["cause-public"]) {
    const leaning =
      way *
      viewOn(api, playerId, topic, leanOf(core.people, player, townLean(api)));
    if (leaning !== P.zero)
      facts[leaning > P.zero ? "stand-with" : "stand-apart"] = {
        text: leaning > P.zero ? "with" : "apart",
        sourceRecordIds: [causeId, playerId],
      };
  }
  return facts;
}
