/**
 * Plays the player's own asks whole in drawn places: Ask out to someone who
 * is seeing someone, to the nearest-age single cold, and again after time
 * together; Propose on the first day of dating and after a while living
 * together. Each answer is decided by the partnerships engine and staged by
 * the director on the player's clock; this writes the talk tree each plays.
 * Run: node --import tsx scripts/dialogue-batch/ask-answer-play.ts <seed> <out.md> [draws] [first draw]
 * (one process holds every world it builds: run a long replay a draw per process).
 */
import { writeFileSync } from "node:fs";
import { BenchPlayer } from "../../src/bench/player";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { closenessBetween } from "../../src/core2/closeness";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { moduleState } from "../../src/core2/module-state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  askOut,
  canAsk,
  FAMILY_ASKED_OUT,
  FAMILY_MOVE_IN_ASKED,
  FAMILY_PROPOSAL_ANSWERED,
  propose,
} from "../../src/core2/modules/partnerships";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const [seed, out, drawsArg, firstArg] = process.argv.slice(2) as [
  string,
  string,
  string?,
  string?,
];
const draws = Number(drawsArg ?? 3);
const first = Number(firstArg ?? 0);
setBookkeeping(false);
const lines: string[] = [];
const say = (s: string) => lines.push(s);
const adult = (core: CoreState, born: string) =>
  ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
/** The reply path whose talk ends on this named ending. */
function pathTo(node: TreeNode, ending: string): number[] | null {
  for (const [at, reply] of node.replies.entries()) {
    if (reply.next?.end?.ending?.id === ending) return [at];
    const deeper = reply.next ? pathTo(reply.next, ending) : null;
    if (deeper) return [at, ...deeper];
  }
  return null;
}

for (let draw = first; draw < first + draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "ask-answer-play");
  say(
    `\n## ${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`,
  );
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  while (!adult(core, core.people.get(me)!.birthDate))
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  director.watch(core, me);
  const bench = new BenchPlayer(core, director);
  bench.select(me);
  bench.advance("day");
  const api = coreAPI(core);
  // The answer stops the day: let it go, as the player does after the talk.
  const nextDay = () => {
    const was = core.date;
    for (let i = 0; i < 20 && core.date === was; i += 1) {
      // An election day on the way: the player leaves the polls unvoted.
      if (bench.pollingPlace) bench.leavePolls();
      const open = bench.packet;
      if (open && open.kind !== "complete" && open.kind !== "choice")
        bench.resume({ kind: "stop", pauseId: open.pauseId } as never);
      else bench.advance("day");
    }
  };

  const player = core.people.get(me)!;
  const partnered = new Set<string>();
  for (const l of core.familyLinks.values())
    if (l.kind === "partner") for (const id of l.personIds) partnered.add(id);
  const singles = [...core.people.values()]
    .filter(
      (r) =>
        r.alive &&
        r.tier !== "husk" &&
        r.id !== me &&
        r.placeId === player.placeId &&
        r.householdId !== player.householdId &&
        !partnered.has(r.id) &&
        !player.familyIds.has(r.id) &&
        adult(core, r.birthDate),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const play = (
    kind: string,
    typeKey: string,
    otherId: string,
    title: string,
  ) => {
    const book = director.ledger.people.get(me)!;
    // The newest ask's record: its count is the last part of its id.
    const count = (id: string) => Number(id.split(":").at(-1));
    const latest = [...core.durableLog.values()]
      .filter((r) => r.id.startsWith(`${kind}:${me}:${otherId}:`))
      .map((r) => r.id)
      .sort((a, b) => count(b) - count(a))[0];
    const entry = book.schedule.find(
      (row) =>
        book.momentsById.get(row.momentId)?.causeId === latest &&
        row.bindings.some((b) => b.typeKey === typeKey),
    );
    say(`\n### ${title}`);
    if (!entry) {
      const any = book.schedule.find(
        (row) => book.momentsById.get(row.momentId)?.causeId === latest,
      );
      return say(
        `no scene on the player's book for ${latest}: ${JSON.stringify(any ? { outcome: any.outcome, bindings: any.bindings.map((b) => b.typeKey) } : null)}`,
      );
    }
    const cause = core.durableLog.get(
      book.momentsById.get(entry.momentId)!.causeId,
    );
    say(
      `cause ${cause?.id}; answer ${cause?.facts?.answer}${cause?.facts?.reason ? `, reason ${cause.facts.reason}` : ""}; outcome ${entry.outcome}`,
    );
    const res = purposeScene(core, director, me, entry, { typeKey });
    if (res?.kind !== "composed")
      return say(`not composed: ${JSON.stringify(res)}`);
    const talk = res.scene.talk;
    const them = core.people.get(otherId)!.givenName;
    const who = (l: SceneTalkLine) => (l.role === "asked" ? "You" : them);
    for (const l of talk.narration) say(`Narration: ${l.text}`);
    if (talk.open) say(`${them}: ${talk.open.text}`);
    say(`${them}: ${talk.state.text}  _[${talk.state.bearing ?? "-"}]_`);
    const flat = (n: TreeNode, ind: string) => {
      for (const l of n.lines)
        say(`${ind}${who(l)}: ${l.text}  _[${l.move}; ${l.bearing ?? "-"}]_`);
      if (n.end?.close)
        say(`${ind}${who(n.end.close)}: ${n.end.close.text}  _[close]_`);
      if (n.end)
        say(
          `${ind}**end: ${n.end.outcome}${n.end.ending ? " / " + n.end.ending.label : ""}**`,
        );
      for (const r of n.replies) {
        say(`${ind}- You (${r.line.move}): ${r.line.text}`);
        if (r.next) flat(r.next, ind + "  ");
      }
    };
    flat(talk.tree, "");
  };

  // 1. Someone the player knows who is seeing someone else.
  const [taken, theirs] = [...singles].sort(
    (a, b) =>
      closenessBetween(core, me, b.id) - closenessBetween(core, me, a.id) ||
      a.id.localeCompare(b.id),
  );
  if (taken && theirs) {
    api.setPartnersV1({
      personIds: [taken.id, theirs.id],
      together: true,
      source: {
        tag: "SOURCED",
        asOf: core.date,
        citation: "The partnerships writer.",
      },
      facts: { union: "dating" },
    });
    askOut(api, me, taken.id);
    play(
      FAMILY_ASKED_OUT,
      "asked-out",
      taken.id,
      "Ask out: someone seeing someone",
    );
  }
  const born = player.birthDate;
  // 1b. The single farthest from the player in age, asked cold: the no an
  // age gap gives.
  const far = singles
    .filter((r) => r.id !== taken?.id && r.id !== theirs?.id)
    .sort(
      (a, b) =>
        Math.abs(Date.parse(b.birthDate) - Date.parse(born)) -
          Math.abs(Date.parse(a.birthDate) - Date.parse(born)) ||
        a.id.localeCompare(b.id),
    )[0];
  if (far && canAsk(api, me, far.id, "ask-out").open) {
    askOut(api, me, far.id);
    play(
      FAMILY_ASKED_OUT,
      "asked-out",
      far.id,
      "Ask out: the single farthest in age, cold",
    );
  }
  // 2. The nearest-age single, asked cold; then again after evenings together.
  const other = singles
    .filter((r) => r.id !== taken?.id && r.id !== theirs?.id)
    .sort(
      (a, b) =>
        Math.abs(Date.parse(a.birthDate) - Date.parse(born)) -
          Math.abs(Date.parse(b.birthDate) - Date.parse(born)) ||
        a.id.localeCompare(b.id),
    )[0];
  if (!other) continue;
  const cold = askOut(api, me, other.id);
  play(
    FAMILY_ASKED_OUT,
    "asked-out",
    other.id,
    "Ask out: the nearest-age single, cold",
  );
  if (cold.answer === "no") {
    say(`closeness before ${closenessBetween(core, other.id, me).toFixed(2)}`);
    for (let evening = 0; evening < 20; evening += 1) {
      api.relationship(me, other.id, "friend" as never, 3, undefined, {
        cause: "visit",
      });
      if (canAsk(api, me, other.id, "ask-out").open) break;
    }
    // Another day: an answer given today stands for the day.
    nextDay();
    if (canAsk(api, me, other.id, "ask-out").open) {
      askOut(api, me, other.id);
      play(
        FAMILY_ASKED_OUT,
        "asked-out",
        other.id,
        "Ask out: the same single, after evenings together",
      );
    } else
      say(
        `\n### Ask out again: still closed after twenty evenings (${canAsk(api, me, other.id, "ask-out").reason}; closeness ${closenessBetween(core, me, other.id).toFixed(2)} and back ${closenessBetween(core, other.id, me).toFixed(2)})`,
      );
  }
  const link = [...core.familyLinks.values()].find(
    (r) => r.kind === "partner" && r.personIds.includes(me),
  );
  if (!link) continue;
  // 3. Propose on the first day of dating, then after living together a while.
  propose(api, me, other.id);
  play(
    FAMILY_PROPOSAL_ANSWERED,
    "proposal-answered",
    other.id,
    "Propose: the first day of dating",
  );
  // 4. Then the couple goes on as a played couple does, nothing set by hand:
  // an evening together each week, the partnerships engine's own monthly
  // climb, the partner's ask to live together answered yes in its scene, and
  // a proposal each month once they live together, until one is answered yes.
  const couples = moduleState(core, "partnerships").table("couples");
  const stage = () =>
    (couples.get(link.id) as { stage: string } | undefined)?.stage;
  const tie = () =>
    core.relationships.get(
      me < other.id ? `${me}:${other.id}` : `${other.id}:${me}`,
    )?.kind ?? ("friend" as never);
  const book = director.ledger.people.get(me)!;
  let married = false;
  for (let month = 0; month < 40 && !married && stage(); month += 1) {
    for (let day = 0; day < 28; day += 1) {
      if (day % 7 === 0)
        api.relationship(me, other.id, tie(), 3, undefined, {
          cause: "visit",
        });
      nextDay();
      if (stage() !== "move-in-asked") continue;
      const entry = book.schedule.find(
        (row) =>
          book.momentsById
            .get(row.momentId)
            ?.causeId.startsWith(`${FAMILY_MOVE_IN_ASKED}:`) &&
          row.bindings.some((bound) => bound.typeKey === "move-in"),
      );
      const scene = entry
        ? purposeScene(core, director, me, entry, { typeKey: "move-in" })
        : null;
      const path =
        scene?.kind === "composed"
          ? pathTo(scene.scene.talk.tree, "said-yes")
          : null;
      if (!entry || !path) {
        say(`\n### Asked to move in on ${core.date}: no reply says yes`);
        break;
      }
      replyInScene(core, director, me, entry, path, { typeKey: "move-in" });
      say(
        `\n### Asked to move in on ${core.date}; said yes in the scene: ${stage()}`,
      );
    }
    if (stage() !== "living-together") continue;
    if (!canAsk(api, me, other.id, "propose").open) continue;
    const answer = propose(api, me, other.id);
    play(
      FAMILY_PROPOSAL_ANSWERED,
      "proposal-answered",
      other.id,
      `Propose: living together, ${core.date}`,
    );
    married = answer.answer === "yes";
  }
  if (!married)
    say(
      `\n### No yes to a proposal by ${core.date}: the couple's stage is ${stage() ?? "gone (they parted)"}`,
    );
}
writeFileSync(out, lines.join("\n") + "\n");
