import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { chooseOwnVote } from "../bench/bill-stage";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";

// The reporter's call after the player votes yes, cast with the player's own
// press (bill-stage.ts chooseOwnVote), at a pinned place: Bagdad, Arizona
// (0405140), drawn as press-comment-context.test.ts draws, from seed
// yes-vote-6:0. The first resident member drafts a bill; the player is that
// member, or another member of the same board.
//
// Old premise (#9510): both plain answers after a yes vote ("I voted for it.
// I'd vote for it again." and "I support it. It's good for {place}.") are said
// here. New premise (Words lead, Nov 15): a "why" is answered by the largest
// reasons the roll holds, cited to the roll (`top-reason-*`). On their own
// bill the one part leaning yes is that the bill is theirs. As the next member
// of the board it is the people and their trust in the author; as the member
// after that, their own view and the people. "I voted for it. I'd vote for it
// again." is deleted because it gives no reason.
const CASES = [
  {
    who: "the bill's author",
    pick: 0,
    tops: ["top-reason-own-bill"],
    said: ["It's my bill. I believe in it."],
  },
  {
    who: "the next member",
    pick: 1,
    tops: ["top-reason-people", "top-reason-sponsor"],
    said: [
      "People here asked me for it. I listened.",
      "I trust the people who wrote it.",
    ],
  },
  {
    who: "the member after",
    pick: 2,
    tops: ["top-reason-own-view", "top-reason-people"],
    said: [
      "I voted for it because I believe in it.",
      "People here asked me for it. I listened.",
    ],
  },
] as const;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "press-interview",
) as unknown as PurposeType;
const FACETS = [
  "personality-v1:facet-friendly",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-hostile",
  "personality-v1:facet-persistent",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-sensitive",
];

it.each(CASES)(
  "after the player votes yes as $who, the reporter's call answers why with the reasons the roll holds (Bagdad AZ 0405140, seed yes-vote-6:0)",
  ({ pick, tops, said: wanted }) => {
    const place = drawPlace("yes-vote-6:0", "press-comment-context");
    expect(place.key).toBe("0405140");
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const members = [...core.people.values()]
      .filter((p) => p.alive && p.id.startsWith("person_"))
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((p) => seatView(core, p.id).bodies.length > 0);
    const author = members[0]!.id as PersonId;
    const seat = seatView(core, author);
    const body = seat.bodies[0]!;
    const me = members.filter(
      (p) => seatView(core, p.id).bodies[0]?.officeId === body.officeId,
    )[pick]!.id as PersonId;
    core.playerId = me;
    director.watch(core, me);
    let bill = { id: "", status: "blocked" };
    for (const question of [...seat.questions].slice(0, 4)) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, author, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
    expect(bill.status).not.toBe("blocked");
    chooseOwnVote(core, bill.id, "yes", me);
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    for (let day = 0; day < 120 && !core.durableLog.has(voteId); day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    expect(core.durableLog.has(voteId), "the vote is held").toBe(true);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(me)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(voteId) &&
          row.bindings.some((b) => b.typeKey === "press-interview"),
      );
    expect(entry, "the vote stages the reporter's call").toBeTruthy();
    const result = purposeScene(core, director, me, entry!, {
      typeKey: "press-interview",
    });
    expect(result?.kind).toBe("composed");
    if (result?.kind !== "composed") return;
    const { scene } = result;
    const keys = scene.facts.map((row) => row.key);
    expect(keys).toContain("voted-yes");
    expect(keys).toContain("acted");
    expect(keys.filter((key) => key.startsWith("top-reason-"))).toEqual(tops);
    const facts = Object.fromEntries(
      scene.facts.map((row) => [
        row.key,
        { text: row.text, sourceRecordIds: row.recordIds } as Fact,
      ]),
    );
    const all: string[] = [];
    const said = new Set<string>();
    for (const variant of ["", "friendly", "hostile"]) {
      const purpose = variant ? `press-comment.${variant}` : "press-comment";
      for (const level of [2, -2]) {
        const talk = composeSceneTalk(
          core,
          director,
          { askerId: scene.askerId, askedId: scene.askedId },
          { ...TYPE, purpose, family: "press-comment" } as PurposeType,
          facts,
          {
            askerTraits: Object.fromEntries(
              FACETS.map((id, k) => [id, k % 2 ? -level : level]),
            ),
          },
        );
        if (talk.kind !== "composed") continue;
        const lines = talk.talk.lines.map((row) => row.text);
        const walk = (node: typeof talk.talk.tree, depth: string): void => {
          for (const reply of node.replies) {
            lines.push(`${depth}You: ${reply.line.text}`);
            said.add(reply.line.text);
            if (reply.next) {
              lines.push(
                ...reply.next.lines.map((row) => `${depth}  ${row.text}`),
              );
              walk(reply.next, `${depth}    `);
            }
          }
        };
        walk(talk.talk.tree, "");
        all.push(`[${purpose}, traits ${level}]\n${lines.join("\n")}`);
      }
    }
    process.stdout.write(
      `PRESS AFTER YES ${place.name} (${place.key}), the player ${me}\n${all.join("\n")}\n`,
    );
    for (const text of said)
      expect(
        text,
        "no answer after a yes says the player voted no",
      ).not.toMatch(/I voted (no|against)/);
    for (const text of wanted) expect(said).toContain(text);
  },
  60_000,
);
