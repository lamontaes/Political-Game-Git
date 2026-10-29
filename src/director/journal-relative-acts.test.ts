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
  bodyOf,
  draftBill,
  members,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

// A relative's office act is theirs (words-journal-relative-office-acts-told-
// as-own): a council member's household reads the bill the member introduced
// and the member's vote as the member's, or not at all; the first person
// stands only on the reader's own record. Fails on main, where a row with no
// other-person line fell back to the reader's own ("I introduced ...").
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

// A seat on a lawmaking body whose holder shares a home with another adult.
function openWorld() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const drawn = drawPlace(seed, `journal-relative-acts:${attempt}`);
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    const api = coreAPI(world.core);
    for (const seat of townSeats(api)) {
      const holder = seat.holder?.personId;
      if (
        !holder ||
        !["city", "county"].includes(seat.office.level) ||
        members(api, seat.office.id).length <= 1 ||
        !bodyOf(api, seat.office.id)
      )
        continue;
      fillInPerson(world.core, holder);
      const home = world.core.people.get(holder as PersonId)?.householdId;
      const relatives = [...world.core.people.values()].filter(
        (person) =>
          person.id !== holder &&
          person.alive &&
          home &&
          person.householdId === home,
      );
      if (relatives.length)
        return { world, api, seat, place: drawn, holder, relatives };
    }
    tried.push(`${drawn.name} (${drawn.key})`);
  }
  throw new Error(
    `No lawmaking seat whose holder lives with someone in ${tried.join(", ")}`,
  );
}

it(`a member's household never tells the member's bill or vote as their own, seed ${seed}`, () => {
  setBookkeeping(false);
  const { world, api, seat, place, holder, relatives } = openWorld();
  const { core, director } = world;
  director.watch(core, holder as PersonId);
  for (const person of relatives) director.watch(core, person.id);
  // A month at home first, so the household's ties to the member are on the
  // books when the bill comes: an act reaches a relative through that tie.
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  const policy = billCatalog(api, "city")
    .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
    .find((row) => row.kind === "policy-question" && row.authority.allowed)!;
  const bill = draftBill(api, {
    bodyOfficeId: seat.office.id,
    sponsorId: holder,
    provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
  });
  scheduleVote(api, bill.id);
  for (
    let day = 0;
    day < 120 &&
    !votesOn(api, bill.id).some(
      (row) => row.memberId === holder && ["yes", "no"].includes(row.vote),
    );
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const acts = new Set([
    `office.introduced:${bill.id}`,
    `office.voted:${bill.id}:${holder}`,
  ]);
  const where = `${place.name} (${place.key}), seed ${seed}, ${bill.id}`;
  // The member's own journal still tells the bill in the first person.
  const own = composeJournal(core, director, holder as PersonId)
    .flatMap((chapter) => chapter.lines)
    .find((line) => line.sourceRecordIds.some((id) => acts.has(id)));
  expect(own?.text, `${where}: the member's own line`).toMatch(/^I /);
  let told = 0;
  for (const person of relatives) {
    const lines = composeJournal(core, director, person.id).flatMap(
      (chapter) => chapter.lines,
    );
    for (const line of lines.filter((row) =>
      row.sourceRecordIds.some((id) => acts.has(id)),
    )) {
      told += 1;
      expect(
        line.text,
        `${where}: ${person.id} cites ${line.sourceRecordIds.join(", ")}`,
      ).not.toMatch(/\bI (?:introduced|voted|proposed|sponsored)\b/);
      console.log(`${where}: ${person.id} reads "${line.text}"`);
    }
  }
  // A relative whose book holds the act (they learned of it through their
  // tie to the member) reads it, as the member's: "My mother introduced ...".
  const heard = relatives.filter((person) =>
    (director.ledger.people.get(person.id)?.moments ?? []).some((moment) =>
      acts.has(moment.causeId),
    ),
  ).length;
  if (heard)
    expect(
      told,
      `${where}: ${heard} relatives heard, none tells it`,
    ).toBeGreaterThan(0);
  console.log(
    `${where}: ${relatives.length} relatives watched, ${heard} heard of the acts, ${told} lines tell the member's acts; member reads "${own?.text}"`,
  );
}, 600_000);
