/**
 * What the paper prints of the official's answer (press.ts keepComment,
 * CALL_COMMENT, runExposure; src/bench/printed-words.ts printedFacts): the
 * reporter's call before the run day ends on the record, in a denial, a lie
 * or no comment, and the story prints that; with no call it prints no
 * comment line. Set PLAYED_OUT to a path to write the printed stories.
 *
 * Pinned to Gilbert, Iowa (1930630), seed reporters-call-1, where the town
 * paper's reporter digs and its owner runs a leaked bribe (the same staging
 * as src/director/scandal-call.test.ts). One world, six takers; the
 * file runs in about thirty seconds.
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
import { wordPrintedStory } from "../bench/archive-words";
import { writeFileSync } from "node:fs";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const PLACE = "1930630";
const SEED = "reporters-call-1";

interface TipRow {
  readonly exposedId?: string | null;
  readonly runsOn?: string | null;
  readonly storyId?: string | null;
  readonly comment?: string;
}

const CASES = [
  {
    name: "admitted (call ends on the record)",
    comment: "admitted",
    ending: "on-the-record",
    line: "Yes, I did it. I'm sorry, and I'll tell you what I'm doing about it.",
  },
  {
    name: "denied (call ends in a printed denial)",
    comment: "denied",
    ending: "denial-printed",
    line: "That isn't what happened. Show me what you have.",
  },
  {
    name: "denied (call ends in a printed lie)",
    comment: "denied",
    ending: "lie-printed",
    line: "That never crossed my desk.",
  },
  {
    name: "declined (call ends in no comment)",
    comment: "declined",
    ending: "no-comment",
    line: "No comment at this time.",
  },
  {
    name: "no call, the player",
    comment: "declined",
    ending: null,
    line: null,
  },
  { name: "no call, unattended", comment: null, ending: null, line: null },
] as const;

it("an exposure story prints what the official said on the call: admitted, denied, declined, or nothing without a call (Gilbert IA, seed reporters-call-1)", () => {
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
    .filter((p) => seatView(core, p.id).bodies.length > 0)
    .filter((p) => {
      const b = seatView(core, p.id).bodies[0]!;
      return !("byRequest" in b && b.byRequest);
    });
  const reporterId = townOutlet(api)!.reporterIds[0]!;
  const tips = api.moduleState(PRESS_MODULE_ID).table("tips");
  const out: string[] = [];
  const done: {
    name: string;
    crimeId: string;
    who: string;
    case: (typeof CASES)[number];
  }[] = [];
  let k = 0;
  for (const c of CASES) {
    let got: { crimeId: string; exposedId: string; who: string } | null = null;
    for (let tries = 0; tries < members.length * 2 && !got; tries++) {
      const member = members[k++ % members.length]!;
      core.playerId = member.id as PersonId;
      const offerer = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            p.id !== member.id &&
            p.placeId === member.placeId &&
            !staff.has(p.id) &&
            !members.some((m) => m.id === p.id),
        )
        .sort(
          (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
        )[k % 5]!;
      const seat = seatView(core, member.id);
      const body = seat.bodies[0]!;
      let bill = { id: "", status: "blocked" };
      for (const question of [...seat.questions].slice(0, 6)) {
        if (bill.status !== "blocked") break;
        bill = seatAct(core, member.id, {
          kind: "draft",
          officeId: body.officeId,
          question,
          value: 1,
        }) as { id: string; status: string };
      }
      if (bill.status === "blocked") continue;
      const offered = considerBribe(api, {
        offererId: offerer.id,
        officialId: member.id,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId: bill.id,
        pick: { offer: true },
      });
      if (!offered) continue;
      if (offered.pending)
        api.emit({
          id: `scene.reply:played:${offered.id}`,
          date: core.date,
          kind: "scene.reply",
          personIds: [member.id, offerer.id],
          placeId: member.placeId,
          facts: {
            typeKey: "bribe-offer",
            causeId: `${BRIBE_OFFERED}:${offered.id}`,
            ending: "took-it",
          },
          source: { tag: "SOURCED", asOf: core.date, citation: "played file" },
        });
      if (!crimeRecord(api, offered.id)?.taken) continue;
      const tip = leakToReporter(api, {
        leakerId: offerer.id,
        reporterId,
        crimeId: offered.id,
      }) as { exposedId?: string | null };
      if (!tip.exposedId) continue;
      got = { crimeId: offered.id, exposedId: tip.exposedId, who: member.id };
    }
    expect(got, c.name).toBeTruthy();
    if (c.ending) {
      // The player takes the reporter's call the day the paper finds it, and
      // ends it with this reply (purpose-scene.ts writes the same event).
      api.emit({
        id: `scene.reply:played-call:${got!.exposedId}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [got!.who, reporterId],
        placeId: core.people.get(got!.who as PersonId)!.placeId,
        facts: {
          typeKey: "scandal",
          causeId: got!.exposedId,
          ending: c.ending,
          line: c.line!,
        },
        source: { tag: "SOURCED", asOf: core.date, citation: "played file" },
      });
    }
    done.push({ name: c.name, crimeId: got!.crimeId, who: got!.who, case: c });
  }
  // The last is played by the player at print time; every other is unattended
  // when it prints, but those with a call keep the call's comment.
  const player = done.find((d) => d.name === "no call, the player")!;
  core.playerId = player.who as PersonId;
  const unattended = done.find((d) => d.name === "no call, unattended")!;
  expect(unattended.who).not.toBe(player.who);
  const last = done
    .map((d) => (tips.get(d.crimeId) as unknown as TipRow).runsOn!)
    .sort()
    .at(-1)!;
  advanceCore(core, last);
  for (const d of done) {
    const ran = tips.get(d.crimeId) as unknown as TipRow;
    const story = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .get(ran.storyId!) as never;
    const worded = wordPrintedStory(core, story);
    // The story carries the call's outcome; the paper prints what was said
    // on the record, a denial or a lie, and a decline as a decline.
    if (d.case.comment) expect(ran.comment, d.name).toBe(d.case.comment);
    else
      expect(["admitted", "declined", "denied"], d.name).toContain(ran.comment);
    const text = (worded?.paragraphs ?? []).join(" ");
    if (d.case.ending && d.case.comment !== "declined")
      expect(text, d.name).toContain(d.case.line!);
    if (d.case.ending === "no-comment")
      expect(text, d.name).not.toContain(d.case.line!);
    out.push(
      `## ${d.name}`,
      "",
      `Comment fact on the story: ${ran.comment}. Printed ${(story as { date: string }).date} by ${worded?.outlet?.name ?? "?"}.`,
      "",
      `**${worded?.headline ?? "(no headline)"}**`,
      "",
      ...(worded?.paragraphs ?? [worded?.lede ?? "(no words)"]).map(
        (p) => `> ${p}`,
      ),
      "",
    );
  }
  if (process.env.PLAYED_OUT)
    writeFileSync(process.env.PLAYED_OUT, out.join("\n"));
}, 300_000);
