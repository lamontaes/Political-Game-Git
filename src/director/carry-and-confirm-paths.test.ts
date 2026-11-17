/**
 * The ask to carry a bill and a sponsor's check on a promised vote, rewritten
 * from the records (Story lead, Nov 17; pool item
 * words-carry-bill-and-confirm-vote-rewritten-with-inserts), played in places
 * drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins one).
 *
 * Carry: a seated member is asked to carry a bill by someone they know
 * (`askToCarry`, the legislature's writer). The player's agree and decline each
 * say a stand (`about` and `stand-for`, `stand-against` or `no-stand`, cited to
 * the views engine's read of the player and the ask's record); on every path a
 * thank never answers a no. The answer is written through the scene's own
 * reply (`replyInScene`): a decline closes the ask, and the next ask by the
 * same person holds `declined-them-before` and the earlier bill's name; a yes
 * files the bill under the player with the asker as `requestedBy`, and the
 * next ask holds `carried-for-them-before` and its number.
 *
 * Confirm: a committee trade that reaches the floor (`vote-promise`) is the
 * member's `vote-confirmed` scene; the section traded for (`traded`) is read
 * from the bill's own accepted deal, and the member's yes writes the promise a
 * roll call settles (kind `vote`, the bill and the side the record carries).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  askToCarry,
  authorityFor,
  billOf,
  closedCarryAsks,
  draftBill,
  executiveOf,
  memberKey,
  members,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { personLean } from "../core2/campaign-views";
import { coreAPI } from "../core2/state";
import type { CoreEventInput, CoreState, PersonId } from "../core2/types";
import { spokenDesignation } from "../english/bill-names";
import { questionAbout } from "../english/question-names";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { carryAndConfirmFacts } from "./carry-and-confirm-facts";
import { PROMISE_FACT } from "./promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { ScheduleEntry } from "./scheduling";
import type { SceneTalkLine, TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
/** Places tried before giving up. */
const DRAWS = 6;
/** Days a trade is waited for in a place. */
const TRADE_DAYS = 90;

type BankPart = {
  key: string;
  text: string;
  author?: string;
  uses: {
    purpose?: string;
    step?: string;
    move?: string;
    requiresFacts?: string[];
  }[];
};
const bank = (sceneBank as unknown as { parts: BankPart[] }).parts;
const mine = bank.filter(
  (part) => part.author === "Story lead's builder, Sonnet",
);

/** Every path through the tree: the lines said in order, with the close. */
function paths(
  node: TreeNode,
  before: SceneTalkLine[] = [],
): SceneTalkLine[][] {
  const here = [...before, ...node.lines];
  const out: SceneTalkLine[][] = [];
  if (node.end) out.push(node.end.close ? [...here, node.end.close] : here);
  for (const branch of node.branches ?? [])
    out.push(...paths(branch.node, here));
  for (const reply of node.replies)
    if (reply.next) out.push(...paths(reply.next, [...here, reply.line]));
    else out.push([...here, reply.line]);
  return out;
}

/** The index path of replies that ends the scene on `ending`, or null. */
function pathTo(node: TreeNode, ending: string): number[] | null {
  for (const [index, reply] of node.replies.entries()) {
    if (reply.next?.end?.ending?.id === ending && !reply.next.branches)
      return [index];
    if (reply.next && !reply.next.branches) {
      const rest = pathTo(reply.next, ending);
      if (rest) return [index, ...rest];
    }
  }
  return null;
}

/** The player's replies that say no: a thank from the other side never follows one. */
const NO = new Set(["decline", "refuse", "withdraw"]);

/** On every path of a scene a thank never answers the player's no. */
function noThankAfterNo(
  all: SceneTalkLine[][],
  player: PersonId,
  where: string,
): void {
  for (const path of all) {
    const said = path
      .map(
        (l) =>
          `${l.speakerId === player ? "you" : "they"} ${l.move}: ${l.text}`,
      )
      .join(" / ");
    let last: SceneTalkLine | undefined;
    for (const line of path) {
      if (line.speakerId !== player && line.move === "thank")
        expect(
          last && last.speakerId === player && NO.has(last.move),
          `${where}: a thank right after a no: ${said}`,
        ).toBeFalsy();
      last = line;
    }
  }
}

it("every line of the rewrite that says what a bill is about is placed by the fact that makes it true", () => {
  expect(mine.length).toBeGreaterThan(50);
  for (const part of mine) {
    for (const use of part.uses) {
      const needs = use.requiresFacts ?? [];
      // A slot is read from its own fact: the line needs it.
      for (const slot of [
        "about",
        "traded",
        "earlier-ask",
        "vetoed-by",
        "your-bill",
      ])
        if (part.text.includes(`{${slot}}`))
          expect(needs, `${part.key} says {${slot}}`).toContain(
            slot === "your-bill" ? "your-bill-waits" : slot,
          );
      // The player's agree, decline or withdraw that says what they think of the
      // question says it from a stand the views engine holds (or an override's
      // own reason), never from nothing.
      if (
        use.step === "reply" &&
        ["agree", "decline", "refuse", "withdraw"].includes(use.move ?? "") &&
        part.text.includes("{about}") &&
        /\b(?:I'm (?:for|against)|haven't made up my mind)\b/.test(part.text)
      )
        expect(
          needs.some((n) =>
            ["stand-for", "stand-against", "no-stand"].includes(n),
          ),
          `${part.key}: a stand said with no stand behind it`,
        ).toBe(true);
    }
  }
});

it(`an ask to carry a bill leans on the player's stand, the asker's last ask and the player's own bill, and the answer is written back (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "carry-and-confirm-paths");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    if (council.length < 3) {
      tried.push(`${where}: ${council.length} seated council members`);
      continue;
    }
    const body = council[0]!.office.id;
    const me = council[0]!.holder!.personId as PersonId;
    const questions = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).filter(
      (p) => authorityFor(api, p).allowed && questionAbout(p.question!),
    );
    const seated = new Set(council.map((s) => s.holder?.personId));
    const [asker] = [...core.people.values()]
      .filter((p) => p.alive && !seated.has(p.id) && p.tier !== "husk")
      .sort(
        (a, b) => b.knownIds.size - a.knownIds.size || a.id.localeCompare(b.id),
      );
    if (questions.length < 4 || !asker) {
      tried.push(`${where}: ${questions.length} questions, asker ${!!asker}`);
      continue;
    }
    (core as CoreState as unknown as { playerId: string }).playerId = me;
    core.focusPersonIds.add(me);
    director.watch(core, me);
    // The player has a bill of their own waiting, so the bargain reads.
    const own = draftBill(api, {
      bodyOfficeId: body,
      sponsorId: me,
      provisions: [questions[3]!],
    });
    const stage = (askId: string, head: string) => {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const entry = director.ledger.people
        .get(me)
        ?.schedule.find(
          (row) =>
            row.momentId.includes(askId) &&
            row.bindings.some((b) => b.typeKey === "bill-carry"),
        );
      expect(
        entry,
        `${where}: ${head}: a bill-carry scene staged from ${askId}`,
      ).toBeDefined();
      const result = purposeScene(core, director, me, entry!, {
        typeKey: "bill-carry",
      });
      expect(result?.kind, `${where}: ${head}`).toBe("composed");
      if (result?.kind !== "composed") throw new Error("unreachable");
      return { entry: entry as ScheduleEntry, scene: result.scene };
    };
    const ask = (index: number) =>
      askToCarry(api, {
        askerId: asker.id,
        memberId: me,
        bodyOfficeId: body,
        provisions: [questions[index]!],
      });

    // 1. The first ask: the player's stand is said from the views engine's read,
    // cited to the ask's record and the player; the player's own bill waits.
    const first = ask(0);
    const one = stage(`carry-asked:${first.id}`, "first ask");
    const facts = new Map(one.scene.facts.map((f) => [f.key, f]));
    const stands = ["stand-for", "stand-against", "no-stand"].filter((k) =>
      facts.has(k),
    );
    expect(stands, `${where}: exactly one stand`).toHaveLength(1);
    expect(facts.get("about")?.text, where).toBe(
      questionAbout(questions[0]!.question!),
    );
    for (const key of ["about", stands[0]!])
      expect(facts.get(key)?.recordIds, `${where}: ${key} is cited`).toEqual(
        expect.arrayContaining([`carry-asked:${first.id}`, me]),
      );
    expect(facts.get("your-bill-waits")?.recordIds, where).toContain(own.id);
    noThankAfterNo(paths(one.scene.talk.tree), me, where);

    // 2. A decline closes the ask: written through the scene's own reply.
    const declinePath = pathTo(one.scene.talk.tree, "declined");
    expect(
      declinePath,
      `${where}: the tree reaches a declined ending`,
    ).not.toBeNull();
    const declined = replyInScene(core, director, me, one.entry, declinePath!, {
      typeKey: "bill-carry",
    });
    expect(declined, `${where}: the decline is recorded`).not.toBeNull();
    expect(core.durableLog.get(declined!)?.facts?.ending, where).toBe(
      "declined",
    );
    expect(
      closedCarryAsks(api, asker.id, me).map((r) => [r.id, r.carried]),
      where,
    ).toEqual([[first.id, false]]);

    // 3. The next ask by the same person remembers the decline and names the bill.
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const second = ask(1);
    const two = stage(`carry-asked:${second.id}`, "second ask");
    const f2 = new Map(two.scene.facts.map((f) => [f.key, f]));
    expect(f2.has("declined-them-before"), where).toBe(true);
    expect(f2.get("earlier-ask")?.text, where).toMatch(/^the .+/);
    expect(f2.get("earlier-ask")?.recordIds, where).toContain(first.id);
    noThankAfterNo(paths(two.scene.talk.tree), me, where);

    // 4. A yes files the bill under the player, the asker its requester.
    const yesPath = pathTo(two.scene.talk.tree, "carrying");
    expect(
      yesPath,
      `${where}: the tree reaches a carrying ending`,
    ).not.toBeNull();
    replyInScene(core, director, me, two.entry, yesPath!, {
      typeKey: "bill-carry",
    });
    const closed = closedCarryAsks(api, asker.id, me).at(-1)!;
    expect([closed.id, closed.carried], where).toEqual([second.id, true]);
    const filed = billOf(api, closed.billId!);
    expect(
      [filed.sponsorId, (filed as { requestedBy?: string }).requestedBy],
      where,
    ).toEqual([me, asker.id]);

    // 5. The ask after that remembers the bill it carried, by number.
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const third = ask(2);
    const three = stage(`carry-asked:${third.id}`, "third ask");
    const f3 = new Map(three.scene.facts.map((f) => [f.key, f]));
    expect(f3.has("carried-for-them-before"), where).toBe(true);
    expect(f3.get("earlier-ask")?.text, where).toBe(
      spokenDesignation(filed.number, filed.form.kind),
    );

    // The count read from an override record's tally, whose chamber id holds
    // colons: one short is `margin-one`, two short is not (an edge-case fixture
    // on a real bill: the record itself is written by the legislature in play).
    const governor = executiveOf(api, body).term;
    const said = (short: number) => ({
      billId: filed.id,
      chamber: body,
      tallies: `${body}:${10 - short}/10/15`,
      executiveId: governor ? memberKey(governor) : "",
    });
    const edge = (short: number) =>
      carryAndConfirmFacts(
        core,
        `veto-override:${filed.id}`,
        "veto-override",
        said(short),
        asker.id as PersonId,
        me,
        personLean,
        () => null,
      );
    expect(edge(1)["margin-one"], where).toBeDefined();
    expect(edge(2)["margin-one"], where).toBeUndefined();
    expect(edge(1).override, where).toBeDefined();

    process.stdout.write(
      `CARRY PATHS ${where}: stands ${stands[0]}, ${one.scene.talk.tree.replies.length} first replies; earlier ${f2.get("earlier-ask")?.text} / ${f3.get("earlier-ask")?.text}\n`,
    );
    return;
  }
  throw new Error(
    `No place gave a council of three with four questions and an asker in ${DRAWS} draws:\n${tried.join("\n")}`,
  );
}, 600_000);

it(`a committee trade that reaches the floor is the member's vote-confirmed scene, naming the section traded for, and a yes writes the promise a roll call settles (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "carry-and-confirm-trade");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const bodies = townSeats(api)
      .filter(
        (row) =>
          row.office.level === "state" &&
          members(api, row.office.id).map(memberKey).length > 4,
      )
      .map((row) => row.office);
    const body = [...new Map(bodies.map((o) => [o.id, o])).values()].find((o) =>
      o.id.endsWith("-lower"),
    );
    if (!body) {
      tried.push(`${where}: no state lower house`);
      continue;
    }
    const seated = members(api, body.id)
      .map(memberKey)
      .filter((id) => core.people.get(id)?.alive)
      .sort();
    for (const id of seated) {
      core.focusPersonIds.add(id as PersonId);
      director.watch(core, id as PersonId);
    }
    const questions = seatView(core, seated[0]!).questions;
    questions.slice(0, 20).forEach((question, index) => {
      try {
        draftBill(api, {
          bodyOfficeId: body.id,
          sponsorId: seated[1 + (index % (seated.length - 1))]!,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
      } catch {
        // A question the body cannot pass is skipped.
      }
    });
    const trades: CoreEventInput[] = [];
    api.subscribeEvents("carry-and-confirm-trade", ["vote-promise"], (_, e) => {
      trades.push(e);
    });
    for (let day = 1; day <= TRADE_DAYS; day += 1) {
      advanceCore(core, addDays(makeIsoDate(gameStartDate()), day));
      for (const trade of trades) {
        const member = String(trade.facts?.memberId) as PersonId;
        const entry = director.ledger.people
          .get(member)
          ?.schedule.find(
            (row) =>
              row.momentId.includes(trade.id) &&
              row.bindings.some((b) => b.typeKey === "vote-confirmed"),
          );
        if (!entry) continue;
        const result = purposeScene(core, director, member, entry, {
          typeKey: "vote-confirmed",
        });
        if (result?.kind !== "composed") continue;
        const { scene } = result;
        const facts = new Map(scene.facts.map((f) => [f.key, f]));
        const bill = billOf(api, String(trade.facts?.billId));
        const deal = bill.deals.find(
          (d) =>
            d.kind === "trade-amendment" &&
            d.memberId === member &&
            d.date === trade.facts?.traded,
        );
        const section = bill.provisions.find(
          (p) =>
            deal?.terms === `add ${p.question} ${p.value > 0 ? "yes" : "no"}`,
        );
        expect(
          section,
          `${where}: ${trade.id}: the deal names a section of the bill`,
        ).toBeDefined();
        expect(facts.get("traded")?.text, `${where}: ${trade.id}`).toBe(
          questionAbout(section!.question!),
        );
        expect(facts.get("traded")?.recordIds, where).toEqual(
          expect.arrayContaining([trade.id, bill.id]),
        );
        expect(facts.has("your-promise"), where).toBe(true);
        expect(
          trade.facts?.side,
          `${where}: the trade record carries the side`,
        ).toBe("yes");
        // The yes is the record the promises engine settles by the bill's roll.
        const yes = pathTo(scene.talk.tree, "vote-given");
        expect(yes, `${where}: the tree reaches vote-given`).not.toBeNull();
        const reply = replyInScene(core, director, member, entry, yes!, {
          typeKey: "vote-confirmed",
        });
        expect(reply, where).not.toBeNull();
        const written = core.durableLog.get(reply!)?.facts ?? {};
        expect(
          [
            written[PROMISE_FACT],
            written["promise-billId"],
            written["promise-side"],
          ],
          `${where}: ${reply}`,
        ).toEqual(["vote", bill.id, "yes"]);
        noThankAfterNo(paths(scene.talk.tree), member, where);
        process.stdout.write(
          `CONFIRM PATHS ${where}: ${trade.id}; traded ${facts.get("traded")?.text}; promise ${reply}\n`,
        );
        return;
      }
    }
    tried.push(
      `${where}: no trade with a watched member in ${TRADE_DAYS} days (${trades.length} trades)`,
    );
  }
  throw new Error(
    `No committee trade reached a watched member in ${DRAWS} places:\n${tried.join("\n")}`,
  );
}, 900_000);
