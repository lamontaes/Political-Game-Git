/**
 * The player's own ordinance makes the paper (governing brief, step 8: the
 * owner played a council member for six weeks and no story followed his
 * ordinance). In a played world of a place drawn from all 56, the player is
 * a member of a town body, sponsors an ordinance and it goes to a vote; within
 * three weeks a local outlet prints the vote (carried or failed), people in
 * town know the story, and those who read it bring it up with the player. A
 * local body's vote (the town's, or the county's that covers it) binds the
 * whole town, so the desk weighs it as a law in force (press-desk.ts
 * `involved`), and a reporter who files one of the body's votes that day files
 * the others, as a paper covers a meeting.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  draftBill,
  members,
  scheduleVote,
} from "../core2/modules/legislature";
import { newsKey, storyOfReadEvent } from "../core2/modules/news";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { bringItUp } from "../director/bring-it-up";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("the player's own ordinance is printed when the town body votes on it, and read", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(seed, `own-ordinance:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    // A seat on the town's or county's own body of several members, played.
    const seat = townSeats(api).find(
      (row) =>
        row.holder?.personId &&
        ["city", "county"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    );
    if (!seat) {
      tried.push(`${where}: no town body seat held by a person`);
      continue;
    }
    const me = seat.holder!.personId!;
    fillInPerson(core, me);
    new BenchPlayer(core, director).select(me);
    const policy = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: me,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    scheduleVote(api, bill.id);
    // The vote's own records: carried (the body's vote) or failed.
    const voteRecord = () =>
      [
        ...(core.logByKind.get("legislative-vote") ?? []),
        ...(core.logByKind.get("bill-failed") ?? []),
      ]
        .map((id) => core.durableLog.get(id as never)!)
        .filter((row) => row.facts?.billId === bill.id);
    for (let day = 0; day < 120 && !voteRecord().length; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const votes = voteRecord();
    if (!votes.length) {
      tried.push(`${where}: ${bill.id} never came to a vote`);
      continue;
    }
    const votedOn = votes[0]!.date;
    advanceCore(core, addDays(makeIsoDate(votedOn), 21));
    const ids = new Set(votes.map((row) => row.id));
    const printed = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        kind: string;
        facts: Record<string, unknown>;
      }[]
    ).filter(
      (story) =>
        story.kind === "press.printed" &&
        ids.has(String(story.facts.sourceRecordId)),
    );
    expect(
      printed.length,
      `${where}: ${[...ids].join(", ")} never printed`,
    ).toBeGreaterThan(0);
    let knowing = 0;
    for (const story of printed)
      for (const id of core.people.keys())
        if (api.knows(id, newsKey(story.id))) knowing += 1;
    expect(knowing, `${where}: nobody read ${printed[0]!.id}`).toBeGreaterThan(
      0,
    );
    // People who read it bring it up with the player: the story about the
    // player's own bill, by its outlet and topic, citing the story.
    const ids2 = new Set(printed.map((story) => story.id));
    const raised: string[] = [];
    for (const id of core.people.keys()) {
      if (id === me) continue;
      if (!printed.some((story) => api.knows(id, newsKey(story.id)))) continue;
      const brought = bringItUp(core, id as PersonId, me as PersonId);
      const storyId = brought ? storyOfReadEvent(brought.change.eventId) : null;
      if (storyId && ids2.has(storyId))
        raised.push(brought!.lines.map((line) => line.text).join(" "));
      if (raised.length >= 3) break;
    }
    expect(
      raised.length,
      `${where}: nobody who read ${printed[0]!.id} brought it up with the player`,
    ).toBeGreaterThan(0);
    // One who read it tells the player it was theirs and how it came out,
    // from the vote's own record ("your ordinance on transit failed").
    const failed = !votes.some(
      (row) =>
        row.kind === "legislative-vote" &&
        Number(row.facts?.yes) > Number(row.facts?.no),
    );
    const outcome = failed ? /(failed|didn't pass)/ : /passed/;
    expect(
      raised.some(
        (text) => /\byour (ordinance|bill)\b/.test(text) && outcome.test(text),
      ),
      `${where}: ${raised.join(" || ")}`,
    ).toBe(true);
    // The proof, by place, seed and record id (the runner keeps no console).
    appendFileSync(
      path.join(tmpdir(), "own-ordinance-proof.txt"),
      `${where}: ${bill.id} voted ${votedOn}; ${printed.length} stories (${printed[0]!.id}); ${knowing} people know them; raised: ${raised.join(" || ")}\n`,
    );
    return;
  }
  throw new Error(`no drawn place had a played vote: ${tried.join("; ")}`);
}, 1_200_000);
