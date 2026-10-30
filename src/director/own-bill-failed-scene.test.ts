/**
 * When the player's own bill fails, someone brings it to them (governing
 * brief, step 8: the owner's council member heard nothing after his
 * ordinance failed). An officeholder's aide brings a lost vote
 * (`staff-news`); a council member keeps no aide, so a fellow member who
 * voted for the bill does. In a played world of a place drawn
 * from all 56, the player sits on a town body and sponsors an ordinance;
 * where it fails with another member voting for it, the director stages
 * that member bringing the news, citing the failure record.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
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
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

it("a fellow member who voted for the player's failed ordinance brings the news", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `own-bill-failed:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
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
    const failure = () =>
      [...(core.logByKind.get("bill-failed") ?? [])]
        .map((id) => core.durableLog.get(id as never)!)
        .find((row) => row.facts?.billId === bill.id);
    const settled = () =>
      failure() ??
      [...(core.logByKind.get("legislative-vote") ?? [])]
        .map((id) => core.durableLog.get(id as never)!)
        .find((row) => row.facts?.billId === bill.id);
    for (let day = 0; day < 120 && !settled(); day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const failed = failure();
    const allies = votesOn(api, bill.id).filter(
      (row) =>
        row.vote === "yes" &&
        row.memberId !== me &&
        core.people.get(row.memberId)?.alive,
    );
    if (!failed || !allies.length) {
      tried.push(
        `${where}: ${bill.id} ${failed ? "failed with nobody else for it" : "did not fail"}`,
      );
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(failed.date), 1));
    const book = director.ledger.people.get(me)!;
    const entry = book.schedule.find((row) => {
      const moment = book.momentsById.get(row.momentId);
      return moment?.causeId === failed.id;
    });
    const binding = entry?.bindings.find((row) => row.typeKey === "staff-news");
    expect(
      binding,
      `${where}: ${failed.id} staged ${entry?.bindings.map((row) => row.typeKey).join(", ") || "nothing"}`,
    ).toBeDefined();
    const bringer = binding!.roles.find((row) => row.role === "aide")!
      .personIds[0];
    expect(
      allies.map((row) => row.memberId),
      `${where}: ${bringer} did not vote for ${bill.id}`,
    ).toContain(bringer);
    // The proof, by place, seed and record id (the runner keeps no console).
    appendFileSync(
      path.join(tmpdir(), "own-bill-failed-proof.txt"),
      `${where}: ${failed.id} on ${failed.date}; staff-news brought by ${bringer}, who voted yes${entry!.interrupt ? "; it stops the day" : ""}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place failed the player's bill with an ally: ${tried.join("; ")}`,
  );
}, 1_500_000);
