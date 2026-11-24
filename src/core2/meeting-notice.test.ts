// @vitest-environment node
/**
 * A place's public-notice law holds a late-posted bill to the next meeting. In
 * a drawn town two worlds of one seed are the same but for the state's
 * meeting-notice-hours law: with the law lax the bill is on the body's next
 * meeting, and with the law asking for more notice than is left the same bill,
 * drafted the same day, waits for the meeting after. The calendar entry keeps
 * the posting day, the notice hours and the law that set them, by record id.
 * A drawn place and seed, printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { daysBetweenText } from "./kernel/dates";
import {
  bodyOf,
  LEGISLATURE_MODULE_ID,
  draftBill,
  members,
  nextSittingOf,
  scheduleVote,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed = process.env.MEETING_NOTICE_SEED ?? randomBytes(8).toString("hex");
const SERIES = "meeting-notice-hours";

function setNotice(core: ReturnType<typeof world>["core"], hours: number) {
  const api = coreAPI(core);
  for (const level of lawChain(api).levels)
    if (level.level === "state")
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: "state",
        series: SERIES,
        value: hours,
        unit: "hours",
        effectiveDate: core.date,
        measureId: `fixture:meeting-notice:${hours}`,
        citation: "Controlled law case: the state's public-notice hours.",
      });
}

const world = (placeSeed: string, placeKey: string) =>
  buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });

it("a bill posted with less notice than the law asks waits for the meeting after", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `meeting-notice:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const lax = world(place.seed, place.key);
    const strict = world(place.seed, place.key);
    const pick = (w: ReturnType<typeof world>) => {
      const api = coreAPI(w.core);
      return townSeats(api).find(
        (row) =>
          row.holder?.personId &&
          ["city", "county"].includes(row.office.level) &&
          members(api, row.office.id).length > 1 &&
          bodyOf(api, row.office.id),
      );
    };
    const seat = pick(lax);
    const seatStrict = pick(strict);
    if (!seat || !seatStrict || seat.office.id !== seatStrict.office.id) {
      tried.push(`${where}: no town body seat`);
      continue;
    }
    const apiLax = coreAPI(lax.core);
    const apiStrict = coreAPI(strict.core);
    const first = nextSittingOf(apiLax, seat.office.id);
    if (!first) {
      tried.push(`${where}: the body has no next meeting`);
      continue;
    }
    // Asks for a day more notice than the days left before the meeting.
    const left = daysBetweenText(lax.core.date, first.date);
    const hours = 24 * (left + 1);
    setNotice(lax.core, 0);
    setNotice(strict.core, hours);
    const policy = billCatalog(apiLax, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
    if (!policy) {
      tried.push(`${where}: no ordinance the body may draft`);
      continue;
    }
    const sponsor = seat.holder!.personId!;
    const draft = (api: ReturnType<typeof coreAPI>) =>
      draftBill(api, {
        bodyOfficeId: seat.office.id,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
    const billLax = draft(apiLax);
    const billStrict = draft(apiStrict);
    const dateLax = scheduleVote(apiLax, billLax.id);
    const dateStrict = scheduleVote(apiStrict, billStrict.id);
    const entry = (api: ReturnType<typeof coreAPI>, id: string) =>
      api.moduleCalendar(LEGISLATURE_MODULE_ID).get(`meeting:${id}`);
    const recordsLax = entry(apiLax, billLax.id)?.sourceRecordIds ?? [];
    const recordsStrict =
      entry(apiStrict, billStrict.id)?.sourceRecordIds ?? [];
    process.stdout.write(
      `MEETING-NOTICE ${where}: ${seat.office.id}; meeting ${first.date}, ${left} days left; bill ${billLax.id} on ${dateLax} with no notice law, bill ${billStrict.id} on ${dateStrict} with ${hours} hours asked; entry ${JSON.stringify(recordsStrict)}\n`,
    );
    expect(dateLax, where).toBe(first.date);
    expect(
      dateStrict > first.date,
      `${where}: waits for the meeting after`,
    ).toBe(true);
    expect(recordsLax, "no law, no notice record").toEqual([billLax.id]);
    expect(recordsStrict, where).toEqual(
      expect.arrayContaining([
        billStrict.id,
        `posted:${strict.core.date}`,
        `notice-hours:${hours}`,
        "waited-for-notice",
      ]),
    );
    expect(
      recordsStrict.some((id) => id.startsWith("notice-law:")),
      "the law that set the hours is named",
    ).toBe(true);
    return;
  }
  throw new Error(`no town body to test: ${tried.join("; ")}`);
}, 1_800_000);

it("under a place's own state number, a bill posted inside the notice window waits and one posted outside does not", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  let outside: string | undefined;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const place = drawPlace(seed, `meeting-notice-own:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const w = world(place.seed, place.key);
    const api = coreAPI(w.core);
    const seat = townSeats(api).find(
      (row) =>
        row.holder?.personId &&
        ["city", "county"].includes(row.office.level) &&
        members(api, row.office.id).length > 1 &&
        bodyOf(api, row.office.id),
    );
    const first = seat ? nextSittingOf(api, seat.office.id) : null;
    const law = lawInForce(api, SERIES);
    const hours = law.value ?? 0;
    if (!seat || !first || !(hours > 0)) {
      tried.push(`${where}: no town body, meeting or notice law`);
      continue;
    }
    const left = daysBetweenText(w.core.date, first.date);
    const policy = billCatalog(api, "city")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
    if (!policy) {
      tried.push(`${where}: no ordinance the body may draft`);
      continue;
    }
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: seat.holder!.personId!,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    const date = scheduleVote(api, bill.id);
    const records =
      api.moduleCalendar(LEGISLATURE_MODULE_ID).get(`meeting:${bill.id}`)
        ?.sourceRecordIds ?? [];
    const insideWindow = 24 * left < hours;
    process.stdout.write(
      `MEETING-NOTICE-OWN ${where}: ${law.governing?.id} asks ${hours} hours; meeting ${first.date} (${left} days); bill ${bill.id} on ${date}; ${insideWindow ? "inside the window, waits" : "outside the window, stays"}; entry ${JSON.stringify(records)}\n`,
    );
    expect(records, where).toContain(`notice-hours:${hours}`);
    expect(records.includes("waited-for-notice"), where).toBe(insideWindow);
    expect(date > first.date, where).toBe(insideWindow);
    if (insideWindow) return;
    outside = where;
  }
  // No drawn town had a meeting inside its window today; the outside case held.
  expect(outside, `no town checked: ${tried.join("; ")}`).toBeTruthy();
}, 1_800_000);
