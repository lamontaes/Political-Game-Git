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
import { coreAPI, fillInPerson } from "../core2/state";
import { billTitleOf } from "../english/bill-names";
import { composeJournal } from "./journal";

// The officeholder's journal names a bill by its real name (owner, Oct 15):
// a council member who introduces a bill and votes on it reads both in "My
// life", each citing the record it came from.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

// A place with no local lawmaking body of its own (a territory's village) has
// nothing to introduce a bill in, so the next drawn place stands in; each
// place tried is named in the failure.
function openWorld() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const drawn = drawPlace(seed, `journal-bill-names:${attempt}`);
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    const api = coreAPI(world.core);
    const seat = townSeats(api).find(
      (row) =>
        row.holder?.personId &&
        // A body of several members that is the town's or county's own.
        ["city", "county"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    );
    tried.push(`${drawn.name} (${drawn.key})`);
    if (seat) return { world, api, seat, place: drawn };
  }
  throw new Error(`No lawmaking seat held by a person in ${tried.join(", ")}`);
}

it(`a member's journal tells the bill they introduced and their vote, by its real name, seed ${seed}`, () => {
  setBookkeeping(false);
  const { world, api, seat, place } = openWorld();
  const { core, director } = world;
  const memberId = seat!.holder!.personId!;
  // A member among the wider population is filled in as a full person.
  fillInPerson(core, memberId);
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
  // A watched person who is not the player forgets older moments, so the
  // journal is read the day the vote is on record.
  for (
    let day = 0;
    day < 120 &&
    !votesOn(api, bill.id).some((row) => row.memberId === memberId);
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const name = billTitleOf(billOf(api, bill.id))!.title;
  // A short title is a name and its form word, so a sentence says it with
  // its article: "I voted for the Bottle Deposit Act."
  const said = `the ${name}`;
  const cast = votesOn(api, bill.id).find((row) => row.memberId === memberId);
  const lines = composeJournal(core, director, memberId).flatMap(
    (chapter) => chapter.lines,
  );
  const introduced = lines.find(
    (line) => line.text.includes(name) && /introduced/i.test(line.text),
  );
  expect(introduced?.text, `${place.name} ${bill.id}`).toContain(
    `introduced ${said}`,
  );
  expect(
    introduced,
    `${place.name} ${bill.id}: no introduced line in ${lines.map((l) => l.text).join(" | ")}`,
  ).toBeDefined();
  expect(introduced!.sourceRecordIds).toContain(`office.introduced:${bill.id}`);
  console.log(
    `JOURNAL BILL ${place.name} (${place.key}), seed ${seed}, ${bill.id}: "${introduced!.text}" cites ${introduced!.sourceRecordIds.join(", ")}; vote ${cast?.vote}`,
  );
  if (cast && (cast.vote === "yes" || cast.vote === "no")) {
    const voted = lines.find(
      (line) => line.text.includes(name) && /voted/i.test(line.text),
    );
    expect(
      voted,
      `${bill.id}: no vote line in ${lines.map((l) => l.text).join(" | ")} (cast ${cast.vote}; ${core.durableLog.get(`office.voted:${bill.id}:${memberId}`) ? "event logged" : "no event"})`,
    ).toBeDefined();
    expect(voted!.text).toContain(
      `${cast.vote === "yes" ? "voted for" : "voted against"} ${said}.`,
    );
    expect(voted!.sourceRecordIds).toContain(
      `office.voted:${bill.id}:${memberId}`,
    );
    console.log(
      `JOURNAL BILL ${place.name}: "${voted!.text}" cites ${voted!.sourceRecordIds.join(", ")}`,
    );
  }
}, 600_000);
