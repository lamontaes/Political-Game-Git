/**
 * Trouble at the polling place (owner, Nov 15; items
 * scene-trouble-at-the-polling-place and words-run-poll-problem-lines-are-
 * composed): a voter who goes to the polls and is not on the rolls meets a poll
 * worker, who says where the voter stands, read from the voting engine's one
 * registration read (`pollingStatus`). The talk is one scene of the scene
 * engine (`composeSceneTalk`, the `poll-problem` arc), worded only from the
 * bank. Where the state registers people at the polls the voter may press
 * "register here"; nothing is registered for them without that press. Where
 * it does not, the ballot is refused and the voting engine keeps the day's
 * record (`not-on-the-list`, with its reason in `pollDays`). Each reply is a
 * `scene.reply` record, as every scene's reply is. The scene is staged by the
 * visit (`polling-place.ts`), not by a moment, so it holds no cause of its own.
 */
import { applyCoreEvent, coreAPI } from "../core2/state";
import { type PollingStatus } from "../core2/modules/voting";
import { dwellingMovedIn } from "../core2/modules/housing";
import type { CoreState, PersonId } from "../core2/types";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
  type TreeReply,
} from "./scene-talk";
import { organizationName, spokenWhen } from "./words";
import type { Fact } from "../english/scene-talk-words";
import type { Ledger } from "./types";
import {
  leavePollingPlace,
  registerAtPollingPlace,
  turnAway,
  type PollingVisit,
} from "./polling-place";

/** The poll worker's scene: the `poll-problem` arc, cast by the records. */
const POLL_PROBLEM: PurposeType = {
  key: "polling-place",
  purpose: "poll-problem",
  asker: "workers",
  asked: "voter",
  tag: { key: "routine", endpoint: "political" },
};

/** One line of the scene as the polls show it. */
export interface PollLine {
  readonly speaker: "worker" | "you" | "narrator";
  readonly text: string;
  readonly sourceRecordIds: readonly string[];
}

/** What the voter may say now, and what pressing it does. */
export interface PollChoice {
  readonly index: number;
  readonly text: string;
  readonly move: string;
}

export interface PollTalk {
  readonly lines: readonly PollLine[];
  readonly choices: readonly PollChoice[];
  /** Set once the scene has ended: the ending reached. */
  readonly ending: string | null;
}

/** The facts the scene stands on, each citing the record it was read from. */
function pollFacts(
  core: Readonly<CoreState>,
  visit: PollingVisit,
  workerId: PersonId,
): Record<string, Fact> {
  const voterId = visit.record.personId;
  const voter = core.people.get(voterId)!;
  const status: PollingStatus = visit.standing;
  const from = [voterId, visit.record.id];
  const yes = (): Fact => ({ text: "yes", sourceRecordIds: from });
  const facts: Record<string, Fact> = {
    name: {
      text: `${voter.givenName} ${voter.familyName}`,
      sourceRecordIds: [voterId],
    },
    "poll-not-in-book": yes(),
  };
  if (status === "same-day") facts["poll-same-day"] = yes();
  if (status === "old-address") facts["poll-old-address"] = yes();
  if (status === "not-registered") facts["poll-not-registered"] = yes();
  if (status === "after-deadline") facts["poll-after-deadline"] = yes();
  // The voter has no other table to try: the engine casts votes only by the
  // registration it holds, so a voter with no registration has nowhere to go.
  if (status === "not-registered") facts["poll-nowhere"] = yes();
  // A voter who was on the rolls once (a move, a late form) can say the book
  // should hold them.
  if (status === "old-address" || status === "after-deadline")
    facts["poll-off-book"] = yes();
  if (
    voter.knownIds.has(workerId) ||
    core.people.get(workerId)?.knownIds.has(voterId)
  )
    facts["poll-acquainted"] = {
      text: core.people.get(workerId)?.givenName ?? "",
      sourceRecordIds: [workerId, voterId],
    };
  // Where the town's building is on record, the worker names it.
  const building = visit.pollingPlaceId
    ? [...core.organizations.values()].find(
        (o) =>
          o.placeId === voter.placeId &&
          o.classification === "service:municipal-government",
      )
    : undefined;
  if (building)
    facts["polling-place"] = {
      text: organizationName(building),
      sourceRecordIds: [building.id],
    };
  // When the voter moved, from the dwelling record the rolls compare against.
  if (status === "old-address") {
    const moved = dwellingMovedIn(
      coreAPI(core as CoreState),
      voter.householdId,
    );
    if (moved)
      facts["moved-when"] = {
        text: spokenWhen(moved, core.date),
        sourceRecordIds: [voter.householdId],
      };
  }
  return facts;
}

/** The scene for a visit, or null where the voter is on the rolls or no worker is on record to speak. */
function pollScene(core: Readonly<CoreState>, visit: PollingVisit) {
  if (visit.standing === "on") return null;
  const workerId = visit.pollWorkerIds[0];
  if (!workerId) return null;
  const result = composeSceneTalk(
    core,
    undefined,
    {
      askerId: workerId,
      askedId: visit.record.personId,
      causeId: visit.record.id,
    },
    POLL_PROBLEM,
    pollFacts(core, visit, workerId),
    {},
    { setupTold: false },
  );
  return result.kind === "composed" ? result.talk : null;
}

/** The node the voter has reached, following the replies they chose. */
function nodeAt(root: TreeNode, path: readonly number[]): TreeNode | null {
  let node: TreeNode | null = root;
  for (const step of path) node = node?.replies[step]?.next ?? null;
  return node;
}

const lineOf = (row: {
  role: string;
  text: string;
  slotRecordIds: readonly string[];
}): PollLine => ({
  speaker:
    row.role === "narrator"
      ? "narrator"
      : row.role === "asked"
        ? "you"
        : "worker",
  text: row.text,
  sourceRecordIds: row.slotRecordIds,
});

/**
 * The talk as it stands: the narration, the worker's news and every reply
 * chosen so far with its answer, then what the voter may say next. Null where
 * there is no scene to play (on the rolls, or no poll worker on record).
 */
export function pollProblemTalk(
  core: Readonly<CoreState>,
  visit: PollingVisit,
): PollTalk | null {
  const talk = pollScene(core, visit);
  if (!talk) return null;
  const path = visit.record.talkPath ?? [];
  const lines: PollLine[] = [
    ...talk.narration,
    ...(talk.open ? [talk.open] : []),
    ...talk.intro,
    talk.state,
    ...talk.tree.lines,
  ].map(lineOf);
  let node: TreeNode | null = talk.tree;
  for (const step of path) {
    const reply: TreeReply | undefined = node?.replies[step];
    if (!reply) break;
    lines.push(lineOf(reply.line));
    node = reply.next;
    for (const row of node?.lines ?? []) lines.push(lineOf(row));
    if (node?.end?.close) lines.push(lineOf(node.end.close));
  }
  const ending = node?.end?.ending?.id ?? null;
  return {
    lines,
    choices:
      node && !node.end
        ? node.replies.map((reply, index) => ({
            index,
            text: reply.line.text,
            move: reply.line.move,
          }))
        : [],
    ending,
  };
}

/**
 * The voter says a reply: it is kept as a `scene.reply` record, and where it
 * ends the scene the ending is carried out. "Register me here" (the ending
 * `registered`) is the voter's own press and registers them; any other
 * ending at a table that refused them turns them away (the voting engine
 * keeps the day's record), and one at a table that would have registered them
 * leaves the visit with no ballot.
 */
export function sayAtPolls(
  core: CoreState,
  ledger: Ledger,
  visit: PollingVisit,
  index: number,
): PollTalk {
  const talk = pollScene(core, visit);
  if (!talk) throw new Error("There is nothing to say at the polling place.");
  const path = visit.record.talkPath ?? [];
  const node = nodeAt(talk.tree, path);
  const reply = node?.replies[index];
  if (!node || node.end || !reply) throw new Error("Not an offered reply.");
  const nextPath = [...path, index];
  const ending = reply.next?.end?.ending;
  applyCoreEvent(core, {
    id: `scene-reply:polling-place:${visit.record.id}:${nextPath.join(".")}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [visit.record.personId, talk.askerId],
    placeId: core.people.get(visit.record.personId)!.placeId,
    facts: {
      typeKey: POLL_PROBLEM.key,
      causeId: visit.record.id,
      move: reply.line.move,
      line: reply.line.text,
      ...(ending ? { ending: ending.id, keeps: ending.keeps } : {}),
    },
    source: {
      tag: "SOURCED",
      citation: "Recorded scene: the reply the player chose to say.",
      asOf: core.date,
    },
  });
  ledger.pollingVisits.set(visit.record.id, {
    ...visit.record,
    talkPath: nextPath,
  });
  const kept = { ...visit, record: { ...visit.record, talkPath: nextPath } };
  // What the voter sees is read before the ending is carried out: once they
  // are registered the rolls hold them and the scene has nothing left to say.
  const said = pollProblemTalk(core, kept)!;
  if (ending?.id === "registered") registerAtPollingPlace(core, kept);
  else if (ending) {
    if (visit.standing === "same-day") leavePollingPlace(ledger, kept);
    else turnAway(core, ledger, kept);
  }
  return said;
}
