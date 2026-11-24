import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import {
  BRIBE_OFFERED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import {
  commentOn,
  leakToReporter,
  outletsHere,
  PRESS_EXPOSED,
  PRESS_MODULE_ID,
  townOutlet,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";
import { townResidentsByCash } from "../core2/resident-adults-test-kit";

// The scandal call says what the paper found (owner, Nov 15: "I've got a
// story about the water rates, and your name is in it... that's very
// ambiguous"). A member who is the player takes a bribe for their vote on a
// bill in the offer scene; the one who paid takes it to a reporter
// (press.ts leakToReporter); the paper runs it, and the reporter's call
// names who paid and the vote it bought. Pinned: Gilbert, Iowa (1930630),
// seed "reporters-call-1".
const PLACE = "1930630";
const SEED = "reporters-call-1";

/** The scene's talk as composed: its opening lines, its tree and the spots left unworded. */
interface Talk {
  narration: { text: string }[];
  open?: { text: string };
  state: { text: string };
  tree: TreeNode;
  gaps: string[];
}
/** The whole tree, as the player meets it: what is said, then "You say:"; a lie is marked. */
function played(talk: Talk): { said: string[]; shown: string[] } {
  const said: string[] = [];
  const shown: string[] = [];
  const walk = (node: TreeNode, depth: string): void => {
    for (const line of node.lines) {
      said.push(line.text);
      shown.push(`${depth}${line.text}`);
    }
    for (const branch of node.branches ?? []) {
      shown.push(`${depth}(${branch.label})`);
      walk(branch.node, `${depth}  `);
    }
    if (node.replies.length) shown.push(`${depth}You say:`);
    node.replies.forEach((reply, at) => {
      said.push(reply.line.text);
      const lie = reply.line.move === "lie" ? " (a lie)" : "";
      shown.push(`${depth}  ${at + 1}. ${reply.line.text}${lie}`);
      if (reply.next) walk(reply.next, `${depth}     `);
    });
    if (node.end?.close) shown.push(`${depth}${node.end.close.text}`);
  };
  for (const line of [...talk.narration, talk.open, talk.state])
    if (line) {
      said.push(line.text);
      shown.push(line.text);
    }
  walk(talk.tree, "");
  return { said, shown };
}

it("a scandal call names who paid and what for (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  expect(member, "a resident member of a body").toBeTruthy();
  const me = member!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill = { id: "", status: "blocked" };
  for (const question of [...seat.questions].slice(0, 6)) {
    if (bill.status !== "blocked") break;
    bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
  }
  expect(bill.status).not.toBe("blocked");
  // The richest neighbor who is not on the paper's staff offers.
  const staff = new Set(outletsHere(api).flatMap((row) => row.reporterIds));
  const offerer = townResidentsByCash(core, coreAPI(core)).filter(
    (p) =>
      p.alive &&
      p.id !== me &&
      p.placeId === member!.placeId &&
      !staff.has(p.id),
  )[0]!;
  const offered = considerBribe(api, {
    offererId: offerer.id,
    officialId: me,
    stakeMinor: offerer.liquidMinor * 1000,
    subjectId: bill.id,
    pick: { offer: true },
  });
  expect(offered?.pending).toBe(true);
  // The player takes it in the offer scene.
  api.emit({
    id: `scene.reply:exposed-test:${offered!.id}`,
    date: core.date,
    kind: "scene.reply",
    personIds: [me, offerer.id],
    placeId: member!.placeId,
    facts: {
      typeKey: "bribe-offer",
      causeId: `${BRIBE_OFFERED}:${offered!.id}`,
      ending: "took-it",
    },
    source: { tag: "SOURCED", asOf: core.date, citation: "test" },
  });
  expect(crimeRecord(api, offered!.id)?.taken).toBe(true);
  // The town paper's reporter, who covers the council.
  const reporterId = townOutlet(api)!.reporterIds[0]!;
  const tip = leakToReporter(api, {
    leakerId: offerer.id,
    reporterId,
    crimeId: offered!.id,
  });
  expect(tip.exposedId, `dig ${tip.dig} run ${tip.run}`).toBeTruthy();
  const exposedId = [...(core.logByKind.get(PRESS_EXPOSED) ?? [])].find((id) =>
    String(id).includes(offered!.id),
  );
  expect(exposedId).toBeTruthy();
  // The paper holds the story for the call: nothing is printed yet.
  const tips = api.moduleState(PRESS_MODULE_ID).table("tips");
  const held = tips.get(offered!.id) as unknown as Record<string, unknown>;
  expect(held.storyId, "held for comment").toBeFalsy();
  // The day is measured as play measures it for a player on the clock (the
  // leak here comes between days): the call is staged the day of the finding.
  director.stageOwnPress(core, me, String(exposedId));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(String(exposedId)) &&
        row.bindings.some((b) => b.typeKey === "scandal"),
    );
  expect(entry, "the exposure stages the scandal call").toBeTruthy();
  // The call comes the day of the finding; the story runs on the day the
  // exposure names, after it.
  const runsOn = String(core.durableLog.get(String(exposedId))?.facts?.runsOn);
  expect((entry as unknown as { date: string }).date < runsOn).toBe(true);
  process.stdout.write(
    `DAYS found ${core.durableLog.get(String(exposedId))?.date}, call ${(entry as unknown as { date: string }).date}, runs ${runsOn}\n`,
  );
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "scandal",
  });
  expect(result?.kind, JSON.stringify(result)).toBe("composed");
  if (result?.kind !== "composed") return;
  const facts = new Map(result.scene.facts.map((row) => [row.key, row.text]));
  for (const key of ["found-bribe", "briber", "wanted", "bill", "knows-truth"])
    expect(facts.has(key), key).toBe(true);
  expect(facts.get("briber")).toContain(offerer.givenName);
  const talk = (result.scene as unknown as { talk: Talk }).talk;
  // The reporter says who paid and the vote it bought.
  expect(talk.state.text).toContain(offerer.givenName);
  expect(talk.state.text).toContain(facts.get("bill")!);
  const { said, shown } = played(talk);
  process.stdout.write(
    `GAPS ${JSON.stringify(talk.gaps)}\nSCANDAL CALL\n${shown.join("\n")}\nEND CALL\n`,
  );
  // Nothing about minutes, a signature or a story with no subject.
  for (const text of said)
    expect(text).not.toMatch(/minutes|sign anything|a story about you/i);
  // After a lie, play reaches the outcome the records give: the reporter has
  // the papers, says so, and the player answers again (the page and the
  // reply record both walk it; story.ts shownNode, purpose-scene.ts
  // replyInScene).
  const lie = talk.tree.replies.find((r) => r.line.move === "lie")!;
  const reached = playedNode(lie.next!);
  expect(reached.lines.map((l) => l.text).join(" ")).toMatch(/papers/);
  expect(reached.replies.length).toBeGreaterThan(0);
  // The player owns it ("It's true. I was wrong, and I'll say so.", then "I
  // don't have a good answer for you."), a click at a time as play posts
  // them; the story runs on its day quoting their own answer.
  for (const path of [[0], [0, 0]])
    expect(
      replyInScene(core, director, me, entry!, path, { typeKey: "scandal" }),
    ).toBeTruthy();
  expect(tips.get(offered!.id)?.storyId, "not before its day").toBeFalsy();
  advanceCore(core, runsOn);
  const ran = tips.get(offered!.id) as unknown as Record<string, unknown>;
  expect(ran.storyId, "runs on its day").toBeTruthy();
  expect(commentOn(api, String(exposedId))?.quote).toBe(
    talk.tree.replies[0]!.line.text,
  );
  process.stdout.write(`RAN ${String(ran.storyId)}\n`);
}, 60_000);
