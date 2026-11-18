/**
 * A paper that exposes an official asks them for comment before it prints
 * (press.ts weighTip, runExposure; pool item
 * press-exposure-asks-for-comment-before-it-prints): the exposure is on the
 * record the day it is found, the story is not, nor is it on the wire; the
 * story prints on the paper's next print day (`runsOn`) and then goes on the
 * wire for the other outlets.
 *
 * Pinned to Gilbert, Iowa (1930630), seed reporters-call-1, where the town
 * paper's reporter digs and its owner runs a leaked bribe (the same staging
 * as src/director/scandal-call.test.ts). One world, two takers, so the
 * file runs in about a minute.
 */
import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  BRIBE_OFFERED,
  considerBribe,
  crimeRecord,
} from "./modules/corruption";
import {
  leakToReporter,
  outletsHere,
  PRESS_MODULE_ID,
  townOutlet,
} from "./modules/press";
import { NEWS_MODULE_ID } from "./modules/news";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const PLACE = "1930630";
const SEED = "reporters-call-1";

interface TipRow {
  readonly exposedId?: string | null;
  readonly runsOn?: string | null;
  readonly storyId?: string | null;
}

it("an exposure waits for comment and prints on the paper's next day (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const staff = new Set(outletsHere(api).flatMap((row) => row.reporterIds));
  const members = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((p) => seatView(core, p.id).bodies.length > 0);
  expect(members.length, "two resident members").toBeGreaterThan(1);
  const reporterId = townOutlet(api)!.reporterIds[0]!;
  const tips = api.moduleState(PRESS_MODULE_ID).table("tips");
  const wire = api.moduleState(PRESS_MODULE_ID).table("wire");

  /** The richest neighbor not on a paper's staff bribes this member, who takes it, and leaks it. */
  const exposeTaker = (memberId: PersonId) => {
    const member = core.people.get(memberId)!;
    const offerer = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== memberId &&
          p.placeId === member.placeId &&
          !staff.has(p.id) &&
          !members.some((m) => m.id === p.id),
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0]!;
    // The member drafts a bill; the bribe is for their vote on it.
    const seat = seatView(core, memberId);
    const body = seat.bodies[0]!;
    let bill = { id: "", status: "blocked" };
    // An executive's seat asks members rather than drafting: skip them.
    if ("byRequest" in body && body.byRequest) return null;
    for (const question of [...seat.questions].slice(0, 6)) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, memberId, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
    expect(bill.status).not.toBe("blocked");
    const offered = considerBribe(api, {
      offererId: offerer.id,
      officialId: memberId,
      stakeMinor: offerer.liquidMinor * 1000,
      subjectId: bill.id,
      pick: { offer: true },
    });
    // The player decides in the offer scene, and takes it there.
    if (!offered?.pending)
      return offered?.taken ? leak(offered.id, offerer.id) : null;
    api.emit({
      id: `scene.reply:held-test:${offered!.id}`,
      date: core.date,
      kind: "scene.reply",
      personIds: [memberId, offerer.id],
      placeId: member.placeId,
      facts: {
        typeKey: "bribe-offer",
        causeId: `${BRIBE_OFFERED}:${offered!.id}`,
        ending: "took-it",
      },
      source: { tag: "SOURCED", asOf: core.date, citation: "test" },
    });
    expect(crimeRecord(api, offered!.id)?.taken).toBe(true);
    return leak(offered!.id, offerer.id);
  };
  /** The offerer leaks the taken bribe to the town paper's reporter. */
  const leak = (crimeId: string, leakerId: string) => {
    const tip = leakToReporter(api, {
      leakerId,
      reporterId,
      crimeId,
    }) as TipRow & { dig: number | null; run: number | null };
    expect(tip.exposedId, `dig ${tip.dig} run ${tip.run}`).toBeTruthy();
    // On the record the day it is found; not in print.
    expect(core.durableLog.get(tip.exposedId!), "the exposure").toBeTruthy();
    const held = tips.get(crimeId) as unknown as TipRow;
    expect(held.storyId ?? null, "held for comment").toBeNull();
    // Nor on the wire, where the week's desk would print it first.
    expect(
      wire.get(tip.exposedId!),
      "not on the wire before it runs",
    ).toBeFalsy();
    expect(held.runsOn! > core.date, "runs on a later day").toBe(true);
    return { crimeId, runsOn: held.runsOn! };
  };

  // Two members each take a bribe in the offer scene, while the player
  // plays them. The player then plays the second, so the first is
  // unattended when the paper prints.
  const takers: { crimeId: string; runsOn: string }[] = [];
  for (const member of members) {
    if (takers.length === 2) break;
    core.playerId = member.id as PersonId;
    const taken = exposeTaker(member.id as PersonId);
    if (taken) takers.push(taken);
  }
  expect(takers.length, "two members who take a bribe").toBe(2);
  const [a, b] = takers as [
    { crimeId: string; runsOn: string },
    { crimeId: string; runsOn: string },
  ];
  advanceCore(core, a.runsOn > b.runsOn ? a.runsOn : b.runsOn);

  for (const [who, crimeId] of [
    ["unattended", a.crimeId],
    ["player", b.crimeId],
  ] as const) {
    const ran = tips.get(crimeId) as unknown as TipRow;
    expect(ran.storyId, `${who}: printed on its day`).toBeTruthy();
    // The story readers get (news.ts), on its day.
    const story = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .get(ran.storyId!) as unknown as
      { date: string; facts?: Record<string, string> } | undefined;
    expect(story?.date, `${who}: the story's day`).toBe(
      who === "unattended" ? a.runsOn : b.runsOn,
    );
    // In print, it is on the wire for the other outlets to carry.
    expect(
      wire.get(String(story?.facts?.sourceRecordId ?? "")),
      `${who}: on the wire once printed`,
    ).toBeTruthy();
    process.stdout.write(`HELD ${who} ${ran.storyId}\n`);
  }
}, 120_000);
