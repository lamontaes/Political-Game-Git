// @vitest-environment node
/**
 * Asking someone to serve (brief J, Nov 14, 2026): a player running for
 * governor asks one of the people offered to run as their running mate, and
 * the person answers from their own record in a scene. Only the scene's
 * ending seats anyone. A no is kept with its reason and date and stands for
 * now (owner, Nov 14 05:17Z: "Yes, but ask again later"): asking again is
 * refused until the period passes or what the no rested on changes. "Choose
 * for me" names someone who would say yes, with no scene.
 *
 * Pinned places and seeds, in states whose law joins the ticket at filing.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { ModuleRow } from "../core2/module-data";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  runningMateOf,
  ticketOfficeContest,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import {
  askToServe,
  chooseRunningMateForMe,
  leanIfHedged,
  offeredRunningMates,
  serveAsk,
  ticketAsks,
  ticketStanding,
  type ServeAskRow,
} from "../core2/modules/serve-asks";
import { memberKey, members } from "../core2/modules/legislature";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

/**
 * The second answer of the person each place pins, a month after their no, as
 * each pinned place's record gives it. At Santa Rita (seed 8d04db587cd640d7)
 * Kyle Vazquez says yes: the first ask made them acquainted (the stranger
 * term goes) and the player's campaign has since raised money (the standing
 * term moves from -0.30 to -0.24); STAGED, the player's platform states
 * Kyle Vazquez's own side on the question they hold most strongly, so their question
 * term stays where it is whatever the world's stances do (re-pinned Nov 15:
 * once the country's view of each question joined every opening stance,
 * #9323, their question term fell and the second answer stayed no). At Santa
 * Rita (seed 3f1a9c2e7b6d4058)
 * Susan Guzman, whose own race is this year, says no again.
 */
const PLACES = [
  {
    key: "territory:GU:santa-rita",
    seed: "8d04db587cd640d7",
    asked: "Kyle Vazquez",
    later: "yes",
    sameSide: true,
  },
  {
    key: "territory:GU:santa-rita",
    seed: "3f1a9c2e7b6d4058",
    asked: "Susan Guzman",
    later: "no",
  },
] as const;

/**
 * A no that rests on the player's stated stance (Tonya Aguilar, "apart").
 * STAGED through the filing's platform, as a player states one: the player
 * states the side opposite theirs on the question they hold most strongly, so
 * what their no rests on is the player's word and not where the world's
 * stances happen to fall (re-pinned Nov 15: once the country's view of each
 * question joined every person's opening stance, #9323, their unstaged no
 * rested on the long shot instead).
 */
const CHANGED = {
  key: "territory:GU:yona",
  seed: "a7c3e9150b2f6d84",
  asked: "Tonya Aguilar",
} as const;

interface World {
  core: CoreState;
  director: Director;
  playerId: PersonId;
  filing: FilingRow;
  ticket: ContestRow;
  where: string;
}

/** A bench world whose player files for governor (a fixture: filing's own rules are the elections engine's tests). */
function world(place: {
  key: string;
  seed: string;
  /** The player is the first full member of the territory's legislature (they have held office). */
  legislator?: boolean;
}): World {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${corePlaceByKey(place.key)?.displayName ?? place.key} (${place.key}), seed ${place.seed}`;
  const governor = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => !c.special && /:governor$/.test(c.officeId))
    .sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0];
  expect(governor, where).toBeDefined();
  const ticket = ticketOfficeContest(api, governor!);
  expect(ticket, where).not.toBeNull();
  const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
  const sitting = place.legislator
    ? members(api, "office:US-GU:legislature-unicameral")
        .map(memberKey)
        .filter((id) => core.people.get(id as PersonId)?.alive)
        .sort()[0]
    : undefined;
  const player = sitting
    ? core.people.get(sitting as PersonId)!
    : [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.placeId === town &&
            p.tier !== "husk" &&
            ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 35,
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  core.playerId = player.id;
  core.focusPersonIds.add(player.id);
  director.watch(core, player.id);
  const filing: FilingRow = {
    id: `filing:${governor!.id}:${player.id}`,
    contestId: governor!.id,
    personId: player.id,
    filedOn: core.date,
    filedWith: "the territory's election commission",
    platform: [],
    party: ballot(api, governor!.id)[0]?.party ?? "Democratic",
    status: "on-ballot",
  };
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .put(filing as unknown as ModuleRow);
  return {
    core,
    director,
    playerId: player.id,
    filing,
    ticket: ticket!,
    where,
  };
}

/** Every end of a tree. */
const ends = (node: TreeNode): TreeNode[] => [
  ...(node.end ? [node] : []),
  ...node.replies.flatMap((reply) => (reply.next ? ends(reply.next) : [])),
];

/** Whether a bank piece is placed by a fact (or a fact family, "reason-"). */
function placedBy(key: string, fact: string): boolean {
  return (
    (
      sceneBank as unknown as {
        parts: { key: string; uses?: { requiresFacts?: string[] }[] }[];
      }
    ).parts
      .find((part) => part.key === key)
      ?.uses?.some((use) =>
        use.requiresFacts?.some((name) =>
          fact.endsWith("-") ? name.startsWith(fact) : name === fact,
        ),
      ) ?? false
  );
}

/**
 * The player asks one person; an hour passes on the clock; the scene the
 * director staged plays and the player takes the reply named (`thank`,
 * `accept`). Returns the lines as played and the ask's row after.
 */
function ask(w: World, personId: string, take: "thank" | "accept") {
  const api = coreAPI(w.core);
  const row = askToServe(api, {
    seat: "ticket",
    filingId: w.filing.id,
    personId,
  });
  advanceCore(w.core, addDays(makeIsoDate(w.core.date), 1));
  const book = w.director.ledger.people.get(w.playerId)!;
  const entry = book.schedule.find(
    (e) => book.momentsById.get(e.momentId)?.causeId === row.eventId,
  );
  expect(entry, `${w.where}: the ask staged no scene`).toBeDefined();
  const result = purposeScene(w.core, w.director, w.playerId, entry!);
  expect(result?.kind, `${w.where}: ${JSON.stringify(result)}`).toBe(
    "composed",
  );
  if (result?.kind !== "composed") throw new Error("not composed");
  const { scene } = result;
  expect(scene.purpose).toBe("ask-to-serve");
  expect(scene.playerAsks).toBe(true);
  expect(scene.askerId).toBe(personId);
  const first = scene.talk.tree.lines[0]!;
  // A stranger who would say yes asks the player one thing first where the
  // record gives the player two answers to it, and the player answers it
  // straight (brief J batch 2; the pinned cases below show which); everyone
  // else answers at once.
  const asksFirst = first.move === "ask";
  if (asksFirst)
    expect(!row.standing.grounds.knows && row.standing.lean > 0, w.where).toBe(
      true,
    );
  else
    expect(first.move, `${w.where}: lean ${row.standing.lean}`).toBe(
      row.standing.lean > 0 ? "agree" : "decline",
    );
  for (const node of ends(scene.talk.tree))
    expect(node.end?.ending?.id, w.where).toBeTruthy();
  const index = scene.talk.tree.replies.findIndex(
    (r) => r.line.move === (asksFirst ? "answer" : take),
  );
  expect(
    index,
    `${w.where}: no ${take} reply; lean ${row.standing.lean} ${JSON.stringify(row.standing.terms)} q ${row.standing.grounds.question}`,
  ).toBeGreaterThanOrEqual(0);
  const replyId = replyInScene(w.core, w.director, w.playerId, entry!, [index]);
  const reply = w.core.durableLog.get(replyId!)!;
  // As the player plays it: the replies offered under "You say:", each with
  // the answer it draws, and the one taken marked.
  const lines = [
    ...scene.talk.narration.map((l) => `Narrator: ${l.text}`),
    `${scene.talk.state.speaker}: ${scene.talk.state.text}`,
    `${first.speaker}: ${first.text}`,
    "You say:",
    ...scene.talk.tree.replies.flatMap((r, i) => [
      `  ${i + 1}. ${r.line.text}${i === index ? "  (taken)" : ""}`,
      ...(r.next?.lines.map((l) => `     ${l.speaker}: ${l.text}`) ?? []),
    ]),
  ];
  return {
    row,
    scene,
    reply,
    lines,
    after: serveAsk(api, row.id) as ServeAskRow | undefined,
  };
}

for (const place of PLACES)
  it(
    `asking a running mate plays as a scene; a no stands for now and is asked again a month on (${place.key}, seed ${place.seed})`,
    { timeout: 105_000 },
    () => {
      const w = world(place);
      const api = coreAPI(w.core);
      const offered = offeredRunningMates(api, w.filing.id)!;
      expect(offered.choices.length, w.where).toBeGreaterThanOrEqual(3);
      const standing = (id: string) =>
        ticketStanding(api, w.filing, w.ticket, id)!;
      // A player with no standing is still offered someone who would say yes.
      const yes = offered.choices.filter((c) => standing(c.id).lean > 0);
      expect(yes.length, `${w.where}: someone willing`).toBeGreaterThan(0);
      const out: string[] = [`SERVE ASK ${w.where}`];
      for (const c of offered.choices) {
        const s = standing(c.id);
        out.push(
          `  ${c.name}: ${s.lean.toFixed(2)} ${s.lean > 0 ? `yes (${s.yesReason})` : `no (${s.reason})`}`,
        );
      }
      // 1. A no from the person the place pins: kept with its reason and
      // date; the seat stays open.
      const no = offered.choices.find((c) => c.name === place.asked)!;
      expect(no, `${w.where}: ${place.asked} offered`).toBeDefined();
      if ("sameSide" in place) {
        const held = standing(no.id).grounds;
        w.filing = {
          ...w.filing,
          platform: [`${held.question}=${held.theirStance}`],
        };
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .put(w.filing as unknown as ModuleRow);
      }
      expect(
        standing(no.id).lean,
        `${w.where}: ${place.asked} unwilling`,
      ).toBeLessThanOrEqual(0);
      const first = ask(w, no.id, "accept");
      out.push(`-- a no (${first.row.standing.reason}):`, ...first.lines);
      expect(first.reply.facts?.ending, w.where).toBe("turned-down");
      expect(first.after?.answer, w.where).toBe("no");
      expect(first.after?.answeredOn, w.where).toBe(w.core.date);
      expect(
        runningMateOf(api, w.filing, w.ticket),
        `${w.where}: nobody seated on a no`,
      ).toBeNull();
      const listed = ticketAsks(api, w.filing.id).find(
        (a) => a.personId === no.id,
      );
      expect(listed?.declined?.reason, w.where).toBe(first.row.standing.reason);
      expect(listed?.mayAsk, w.where).toBe(false);
      // Asking again at once is refused.
      expect(() =>
        askToServe(api, {
          seat: "ticket",
          filingId: w.filing.id,
          personId: no.id,
        }),
      ).toThrow(/too soon/);
      // 2. A month on, the period has passed: asked again, they answer from
      // their record as it is now.
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 31));
      expect(
        ticketAsks(api, w.filing.id).find((a) => a.personId === no.id)?.mayAsk,
      ).toBe(true);
      const again = ask(w, no.id, place.later === "no" ? "accept" : "thank");
      const terms = (t: Readonly<Record<string, number>>) =>
        Object.entries(t)
          .filter(([, v]) => v !== 0)
          .map(([k, v]) => `${k} ${v.toFixed(2)}`)
          .join(", ");
      out.push(
        `-- asked again a month on (${again.row.standing.lean > 0 ? `yes, ${again.row.standing.yesReason}` : `no, ${again.row.standing.reason}`}):`,
        `   terms then: ${terms(first.row.standing.terms)}`,
        `   terms now:  ${terms(again.row.standing.terms)}`,
        ...again.lines,
      );
      // The second ask reads the first from the record (#9369): the opening
      // says they turned the player down once; a second no on the same
      // reason says nothing has changed for them, and is let go, never
      // pressed again.
      const factsAgain = new Set(again.scene.facts.map((row) => row.key));
      expect(factsAgain.has("asked-before"), w.where).toBe(true);
      expect(
        placedBy(again.scene.talk.narration[0]!.parts[0]!, "asked-before"),
        `${w.where}: ${again.scene.talk.narration[0]!.text}`,
      ).toBe(true);
      if (place.later === "no") {
        const answer = again.scene.talk.tree.lines[0]!;
        expect(
          placedBy(
            answer.parts[0]!,
            again.row.reasonBefore === again.row.standing.reason
              ? "nothing-moved"
              : "reason-",
          ),
          `${w.where}: ${answer.text}`,
        ).toBe(true);
        expect(
          again.scene.talk.tree.replies.map((reply) => reply.line.move),
          w.where,
        ).toEqual(["accept"]);
        expect(again.reply.facts?.ending, w.where).toBe("turned-down");
        expect(again.after?.answer, w.where).toBe("no");
        // A third ask a month later reads the second no the same way.
        advanceCore(w.core, addDays(makeIsoDate(w.core.date), 31));
        const third = ask(w, no.id, "accept");
        out.push("-- asked a third time a month on:", ...third.lines);
        expect(
          third.scene.facts.some((row) => row.key === "asked-before"),
          w.where,
        ).toBe(true);
        expect(
          third.scene.talk.tree.replies.map((reply) => reply.line.move),
          w.where,
        ).toEqual(["accept"]);
        // 3. A yes from someone willing: seated on the ticket, and the asks
        // for the seat are dropped (the table holds only open seats' asks).
        const pick = offeredRunningMates(api, w.filing.id)!.choices.find(
          (c) => standing(c.id).lean > 0,
        )!;
        const took = ask(w, pick.id, "thank");
        out.push(`-- a yes (${took.row.standing.yesReason}):`, ...took.lines);
        expect(took.reply.facts?.ending, w.where).toBe("serving");
        expect(runningMateOf(api, w.filing, w.ticket)?.personId, w.where).toBe(
          pick.id,
        );
        expect(
          took.after,
          `${w.where}: asks dropped once seated`,
        ).toBeUndefined();
      } else {
        // The yes says what changed since the no.
        expect(again.row.moved, w.where).not.toBeNull();
        expect(again.reply.facts?.ending, w.where).toBe("serving");
        expect(runningMateOf(api, w.filing, w.ticket)?.personId, w.where).toBe(
          no.id,
        );
        expect(
          again.after,
          `${w.where}: asks dropped once seated`,
        ).toBeUndefined();
      }
      process.stdout.write(out.join("\n") + "\n");
    },
  );

it(
  `a later yes after the player's stance moves to theirs, asked at once (${CHANGED.key}, seed ${CHANGED.seed})`,
  { timeout: 60_000 },
  () => {
    const w = world(CHANGED);
    const api = coreAPI(w.core);
    const offered = offeredRunningMates(api, w.filing.id)!;
    const standing = (id: string) =>
      ticketStanding(api, w.filing, w.ticket, id)!;
    const out: string[] = [`SERVE ASK CHANGE ${w.where}`];
    const no = offered.choices.find((c) => c.name === CHANGED.asked)!;
    expect(no, `${w.where}: ${CHANGED.asked} offered`).toBeDefined();
    const held = standing(no.id).grounds;
    w.filing = {
      ...w.filing,
      platform: [`${held.question}=${-held.theirStance}`],
    };
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put(w.filing as unknown as ModuleRow);
    expect(standing(no.id).lean, w.where).toBeLessThanOrEqual(0);
    expect(
      standing(no.id).reason,
      `${w.where}: a no that rests on the stance`,
    ).toBe("apart");
    const first = ask(w, no.id, "accept");
    out.push(`-- a no (${first.row.standing.reason}):`, ...first.lines);
    expect(first.after?.answer, w.where).toBe("no");
    const mayAsk = () =>
      ticketAsks(api, w.filing.id).find((a) => a.personId === no.id)?.mayAsk;
    expect(mayAsk(), w.where).toBe(false);
    // The player states the person's own stance on the question they care
    // most about: what the no rested on has changed, so the player may ask
    // again at once, and they answer from the record as it now is.
    const grounds = first.row.standing.grounds;
    w.filing = {
      ...w.filing,
      platform: [`${grounds.question}=${grounds.theirStance}`],
    };
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put(w.filing as unknown as ModuleRow);
    expect(mayAsk(), `${w.where}: the record changed`).toBe(true);
    expect(standing(no.id).lean, w.where).toBeGreaterThan(0);
    const again = ask(w, no.id, "thank");
    out.push(
      `-- asked again after the stance moved (yes, ${again.row.standing.yesReason}):`,
      ...again.lines,
    );
    expect(again.row.moved, w.where).toBe("agree");
    expect(again.reply.facts?.ending, w.where).toBe("serving");
    expect(runningMateOf(api, w.filing, w.ticket)?.personId, w.where).toBe(
      no.id,
    );
    process.stdout.write(out.join("\n") + "\n");
  },
);

it(
  `Choose for me names someone willing, never the one who said no (${PLACES[1].key}, seed ${PLACES[1].seed})`,
  { timeout: 60_000 },
  () => {
    const w = world(PLACES[1]);
    const api = coreAPI(w.core);
    const offered = offeredRunningMates(api, w.filing.id)!;
    const standing = (id: string) =>
      ticketStanding(api, w.filing, w.ticket, id)!;
    const no = [...offered.choices].sort(
      (a, b) => standing(a.id).lean - standing(b.id).lean,
    )[0]!;
    expect(ask(w, no.id, "accept").after?.answer, w.where).toBe("no");
    chooseRunningMateForMe(api, w.filing.id);
    const mate = runningMateOf(api, w.filing, w.ticket)!;
    expect(mate.personId, w.where).not.toBe(no.id);
    expect(standing(mate.personId).lean, w.where).toBeGreaterThan(0);
    // The seat is filled, so the asks for it are dropped.
    expect(
      ticketAsks(api, w.filing.id).filter((a) => a.declined),
      w.where,
    ).toEqual([]);
  },
);

/**
 * A stranger who would say yes asks the player one thing first, chosen by
 * their reason for the yes (Words lead, Nov 14 16:30Z): the player's answers
 * come from the record, and a hedge on their own question is weighed as no
 * stance. A dodge is offered only when it costs them something they feel
 * (Words lead, Nov 14 21:35Z): where the player's platform says nothing
 * either way on the asked person's question, leaving it unsaid costs nothing,
 * so no dodge is offered, and with one answer left there is no choice to
 * make: they say yes at once (`answer: null`). Each case pins a place, a seed
 * and the person asked. Re-pinned Nov 15 (old: seed 11aa22bb33cc44dd, Mary
 * Conway, the town's first adult as the player): once the country's view of
 * each question joined every opening stance (#9323), Mary Conway's yes turned
 * to a no; the case is now STAGED, a player who sits in the legislature (the
 * standing a held office gives) with a platform silent on the question.
 */
const ASKS_FIRST: {
  key: string;
  seed: string;
  legislator?: boolean;
  /** STAGED: the player's platform says nothing either way on the asked person's question. */
  unsaid?: boolean;
  asked: string;
  question: string;
  reply: string;
  answer: string | null;
}[] = [
  {
    key: "territory:GU:santa-rita",
    seed: "8d04db587cd640d7",
    asked: "Shawn Miles",
    question: "ask",
    reply: "answer",
    answer: "agree",
  },
  {
    key: "territory:GU:santa-rita",
    seed: "11aa22bb33cc44dd",
    legislator: true,
    unsaid: true,
    asked: "Samantha Warner",
    question: "agree",
    reply: "deflect",
    answer: null,
  },
  {
    key: "territory:GU:yona",
    seed: "c0ffee1234567890",
    asked: "Elliott Tate",
    question: "ask",
    reply: "deflect",
    answer: "decline",
  },
];

for (const place of ASKS_FIRST)
  it(
    `a stranger asks one thing first and answers the player's ${place.reply} (${place.key}, seed ${place.seed})`,
    { timeout: 55_000 },
    () => {
      const w = world(place);
      const api = coreAPI(w.core);
      const offered = offeredRunningMates(api, w.filing.id)!;
      const pick = offered.choices.find((c) => c.name === place.asked);
      expect(pick, `${w.where}: ${place.asked} offered`).toBeDefined();
      if (place.unsaid) {
        const question = ticketStanding(api, w.filing, w.ticket, pick!.id)!
          .grounds.question;
        w.filing = { ...w.filing, platform: [`${question}=0`] };
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .put(w.filing as unknown as ModuleRow);
      }
      const row = askToServe(api, {
        seat: "ticket",
        filingId: w.filing.id,
        personId: pick!.id,
      });
      expect(row.standing.grounds.knows, w.where).toBe(false);
      expect(row.standing.lean, w.where).toBeGreaterThan(0);
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 1));
      const book = w.director.ledger.people.get(w.playerId)!;
      const entry = book.schedule.find(
        (e) => book.momentsById.get(e.momentId)?.causeId === row.eventId,
      );
      expect(entry, `${w.where}: the ask staged no scene`).toBeDefined();
      const result = purposeScene(w.core, w.director, w.playerId, entry!);
      if (result?.kind !== "composed")
        throw new Error(`${w.where}: ${JSON.stringify(result)}`);
      const tree = result.scene.talk.tree;
      expect(tree.lines[0]?.move, w.where).toBe(place.question);
      if (place.answer === null) {
        expect(
          tree.replies.map((r) => r.line.move),
          `${w.where}: a ${place.reply} that costs nothing`,
        ).not.toContain(place.reply);
        expect(leanIfHedged(row), w.where).toBe(row.standing.lean);
        process.stdout.write(
          [
            `SERVE ASKS FIRST ${w.where} (no ${place.reply} offered)`,
            `  lean ${row.standing.lean.toFixed(4)} (question ${(row.standing.terms.question ?? 0).toFixed(4)}); after a dodge ${leanIfHedged(row).toFixed(4)}`,
            `${tree.lines[0]!.speaker}: ${tree.lines[0]!.text}`,
            ...tree.replies.map(
              (r) => `  (choice) ${r.line.speaker}: ${r.line.text}`,
            ),
          ].join("\n") + "\n",
        );
        return;
      }
      expect(tree.replies.length, w.where).toBeGreaterThanOrEqual(2);
      const index = tree.replies.findIndex((r) => r.line.move === place.reply);
      expect(index, `${w.where}: no ${place.reply}`).toBeGreaterThanOrEqual(0);
      const chosen = tree.replies[index]!;
      expect(chosen.next?.lines[0]?.move, w.where).toBe(place.answer);
      process.stdout.write(
        [
          `SERVE ASKS FIRST ${w.where}`,
          // What a dodge weighs: the question term read with the player's
          // stance unsaid, in place of the stance on their record.
          `  lean ${row.standing.lean.toFixed(4)} (question ${(row.standing.terms.question ?? 0).toFixed(4)}); after a dodge ${leanIfHedged(row).toFixed(4)}`,
          ...result.scene.talk.narration.map((l) => `Narrator: ${l.text}`),
          `${result.scene.talk.state.speaker}: ${result.scene.talk.state.text}`,
          `${tree.lines[0]!.speaker}: ${tree.lines[0]!.text}`,
          ...tree.replies.map(
            (r) => `  (choice) ${r.line.speaker}: ${r.line.text}`,
          ),
          `${chosen.line.speaker}: ${chosen.line.text}`,
          ...(chosen.next?.lines.map((l) => `${l.speaker}: ${l.text}`) ?? []),
        ].join("\n") + "\n",
      );
      replyInScene(w.core, w.director, w.playerId, entry!, [index]);
      const after = serveAsk(api, row.id);
      // A yes seats them and the ask is dropped; a no is kept.
      if (place.answer === "agree") expect(after, w.where).toBeUndefined();
      else expect(after?.answer, w.where).toBe("no");
    },
  );
