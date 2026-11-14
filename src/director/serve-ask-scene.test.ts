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
  offeredRunningMates,
  serveAsk,
  ticketAsks,
  ticketStanding,
  type ServeAskRow,
} from "../core2/modules/serve-asks";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

/**
 * The second answer of the person each place pins, a month after their no, as
 * each pinned place's record gives it. At Santa Rita (seed 8d04db587cd640d7)
 * Kyle Vazquez says yes: the first ask made them acquainted (the stranger
 * term goes) and the player's campaign has since raised money (the standing
 * term moves from -0.30 to -0.24). At Santa Rita (seed 3f1a9c2e7b6d4058)
 * Susan Guzman, whose own race is this year, says no again.
 */
const PLACES = [
  {
    key: "territory:GU:santa-rita",
    seed: "8d04db587cd640d7",
    asked: "Kyle Vazquez",
    later: "yes",
  },
  {
    key: "territory:GU:santa-rita",
    seed: "3f1a9c2e7b6d4058",
    asked: "Susan Guzman",
    later: "no",
  },
] as const;

/** A no that rests on the player's stated stance (Tonya Aguilar, "apart"). */
const CHANGED = { key: "territory:GU:yona", seed: "a7c3e9150b2f6d84" } as const;

interface World {
  core: CoreState;
  director: Director;
  playerId: PersonId;
  filing: FilingRow;
  ticket: ContestRow;
  where: string;
}

/** A bench world whose player files for governor (a fixture: filing's own rules are the elections engine's tests). */
function world(place: { key: string; seed: string }): World {
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
  const player = [...core.people.values()]
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
  expect(first.move, `${w.where}: lean ${row.standing.lean}`).toBe(
    row.standing.lean > 0 ? "agree" : "decline",
  );
  for (const node of ends(scene.talk.tree))
    expect(node.end?.ending?.id, w.where).toBeTruthy();
  const index = scene.talk.tree.replies.findIndex((r) => r.line.move === take);
  expect(index, `${w.where}: no ${take} reply`).toBeGreaterThanOrEqual(0);
  const replyId = replyInScene(w.core, w.director, w.playerId, entry!, [index]);
  const reply = w.core.durableLog.get(replyId!)!;
  const chosen = scene.talk.tree.replies[index]!;
  const lines = [
    ...scene.talk.narration.map((l) => `Narrator: ${l.text}`),
    `${scene.talk.state.speaker}: ${scene.talk.state.text}`,
    `${first.speaker}: ${first.text}`,
    `${chosen.line.speaker}: ${chosen.line.text}`,
    ...(chosen.next?.lines.map((l) => `${l.speaker}: ${l.text}`) ?? []),
  ];
  return {
    row,
    reply,
    lines,
    after: serveAsk(api, row.id) as ServeAskRow | undefined,
  };
}

for (const place of PLACES)
  it(
    `asking a running mate plays as a scene; a no stands for now and is asked again a month on (${place.key}, seed ${place.seed})`,
    { timeout: 600_000 },
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
      if (place.later === "no") {
        expect(again.reply.facts?.ending, w.where).toBe("turned-down");
        expect(again.after?.answer, w.where).toBe("no");
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
  { timeout: 600_000 },
  () => {
    const w = world(CHANGED);
    const api = coreAPI(w.core);
    const offered = offeredRunningMates(api, w.filing.id)!;
    const standing = (id: string) =>
      ticketStanding(api, w.filing, w.ticket, id)!;
    const out: string[] = [`SERVE ASK CHANGE ${w.where}`];
    const no = offered.choices.find(
      (c) => standing(c.id).lean <= 0 && standing(c.id).reason === "apart",
    )!;
    expect(no, `${w.where}: a no that rests on the stance`).toBeDefined();
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
  { timeout: 600_000 },
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
