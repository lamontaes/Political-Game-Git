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
import { billTitleOf, spokenDesignation } from "../english/bill-names";
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
  // Every member who holds a seat is filled in and watched, so whichever of
  // them the engine records voting yes or no tells it in their journal.
  const voters = members(api, seat!.office.id)
    .map((term) => term.personId)
    .filter((id): id is string => !!id);
  for (const id of new Set([memberId, ...voters])) {
    fillInPerson(core, id);
    director.watch(core, id);
  }
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
    !votesOn(api, bill.id).some(
      (row) => row.vote === "yes" || row.vote === "no",
    );
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const row = billOf(api, bill.id)!;
  const name = billTitleOf(row)!.title;
  // The number a scene about the bill says, then the title with its
  // article, so the journal ties to the scene: "I voted for Ordinance
  // 2025-3, the Bottle Deposit Ordinance."
  const number = spokenDesignation(row.number, row.form.kind);
  const said = `${number}, the ${name}`;
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
  // The vote as the engine recorded it: a member who voted yes or no, by
  // their own reasons, is required; their journal tells it by the bill's name.
  const voter = votesOn(api, bill.id).find(
    (row) => row.vote === "yes" || row.vote === "no",
  );
  expect(
    voter,
    `${place.name} (${place.key}) seed ${seed} ${bill.id}: no member voted yes or no (${votesOn(
      api,
      bill.id,
    )
      .map((row) => `${row.memberId} ${row.vote}`)
      .join(", ")})`,
  ).toBeDefined();
  const voterLines = composeJournal(core, director, voter!.memberId).flatMap(
    (chapter) => chapter.lines,
  );
  const voted = voterLines.find(
    (line) => line.text.includes(name) && /voted/i.test(line.text),
  );
  expect(
    voted,
    `${bill.id}: no vote line for ${voter!.memberId} in ${voterLines.map((l) => l.text).join(" | ")}`,
  ).toBeDefined();
  expect(voted!.text).toContain(
    `${voter!.vote === "yes" ? "voted for" : "voted against"} ${said}.`,
  );
  expect(voted!.sourceRecordIds).toContain(
    `office.voted:${bill.id}:${voter!.memberId}`,
  );
  console.log(
    `JOURNAL BILL ${place.name}: ${voter!.memberId} "${voted!.text}" cites ${voted!.sourceRecordIds.join(", ")}`,
  );
}, 600_000);
