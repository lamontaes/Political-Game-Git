import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  billOf,
  draftBill,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { bodyOf, members } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billTitleOf } from "../english/bill-names";
import { composeJournal } from "./journal";

// The officeholder's journal names a bill by its real name (owner, Oct 15):
// a council member who introduces a bill and votes on it reads both in "My
// life", each citing the record it came from.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "journal-office");

it(`a member's journal tells the bill they introduced and their vote, by its real name, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (row) =>
      row.holder?.personId &&
      core.people.has(row.holder.personId) &&
      // A body of several members that is the town's or county's own.
      ["city", "county"].includes(row.office.level) &&
      members(api, row.office.id).length > 1 &&
      bodyOf(api, row.office.id),
  );
  expect(seat, "a lawmaking seat held by a full person").toBeDefined();
  const memberId = seat!.holder!.personId!;
  director.watch(core, memberId);
  const policy = billCatalog(api, "city")
    .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
    .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
  const bill = draftBill(api, {
    bodyOfficeId: seat!.office.id,
    sponsorId: memberId,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  scheduleVote(api, bill.id);
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const name = billTitleOf(billOf(api, bill.id))!.title;
  const cast = votesOn(api, bill.id).find((row) => row.memberId === memberId);
  const lines = composeJournal(core, director, memberId).flatMap(
    (chapter) => chapter.lines,
  );
  const introduced = lines.find(
    (line) => line.text.includes(name) && /introduced/i.test(line.text),
  );
  expect(
    introduced,
    `${bill.id}: no introduced line in ${lines.map((l) => l.text).join(" | ")}`,
  ).toBeDefined();
  expect(introduced!.sourceRecordIds).toContain(`office.introduced:${bill.id}`);
  if (cast && (cast.vote === "yes" || cast.vote === "no")) {
    const voted = lines.find(
      (line) => line.text.includes(name) && /voted/i.test(line.text),
    );
    expect(voted, `${bill.id}: no vote line`).toBeDefined();
    expect(voted!.text).toMatch(
      cast.vote === "yes" ? /voted for/ : /voted against/,
    );
    expect(voted!.sourceRecordIds).toContain(
      `office.voted:${bill.id}:${memberId}`,
    );
  }
}, 600_000);
