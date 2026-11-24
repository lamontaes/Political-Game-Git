/**
 * A bill a committee's chair holds without a hearing keeps the chair's
 * reasons on the committee's record (pool item laws-end-to-end-proof), in a
 * world from buildBenchWorld in a place drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one). A member of the U.S. House drafts a bill
 * on each of Congress's filing questions, for and against; each goes to its
 * subject committee on its own day, and the chair of every one that was held
 * has the reasons on the record: where they stood on the bill and what their
 * temperament added toward a hearing, which together put the hold.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  billOf,
  committeeRecords,
  draftBill,
  FEDERAL_HOUSE,
  members,
  type CommitteeRecord,
} from "./modules/legislature";
import {
  floorDateOf,
  legislativeSessionsOf,
} from "./modules/world-legislating";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
/** How many of Congress's filing questions get a bill, each way. */
const QUESTIONS = 8;

it("a bill the chair held without a hearing keeps the chair's reasons", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "committee-chair-reasons");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    // Named before the build, so a world that fails to build still names its place.
    process.stdout.write(`committee-chair-reasons: ${where}\n`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // The day after the town opens, Congress's session is on the record.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const congress = legislativeSessionsOf(api).find(
      (s) => s.jurisdiction === "US" && s.adjournAt > core.date,
    );
    const sponsorId = members(api, FEDERAL_HOUSE).flatMap((t) =>
      t.personId && core.people.has(t.personId) ? [t.personId] : [],
    )[0];
    if (!congress?.filings.length || !sponsorId) {
      tried.push(
        `${where}: ${congress ? `${congress.filings.length} Congress filings` : "no Congress session"}, ${sponsorId ? "a House member who is a full person" : `${members(api, FEDERAL_HOUSE).length} House members, none a full person`}`,
      );
      continue;
    }
    const drafted = congress.filings.slice(0, QUESTIONS).flatMap((filing) =>
      [filing.direction, -filing.direction].map((value) =>
        draftBill(api, {
          bodyOfficeId: FEDERAL_HOUSE,
          sponsorId,
          provisions: [
            { kind: "policy-question", question: filing.question, value },
          ],
        }),
      ),
    );
    // Each bill's committee meets on its own day, ahead of the floor.
    for (let step = 0; step < 60; step += 1) {
      const dates = drafted
        .filter((b) => billOf(api, b.id).status === "drafted")
        .flatMap((b) => floorDateOf(api, b.id) ?? [])
        .sort();
      if (!dates.length) break;
      advanceCore(core, makeIsoDate(dates[0]!));
    }
    const records = drafted.flatMap(
      (b) =>
        committeeRecords(api, b.id).find((c) => c.chamber === FEDERAL_HOUSE) ??
        [],
    ) as readonly CommitteeRecord[];
    const held = records.filter((c) => !c.heard);
    tried.push(
      `${where}: ${records.length} committee records, ${held.length} held`,
    );
    if (!held.length) continue;
    for (const record of records) {
      const why = `${where}: ${record.id}`;
      expect(record.chairReasons, why).toBeDefined();
      const { position, hearingTrait } = record.chairReasons;
      expect(position.memberId, why).toBe(record.chairId);
      // The chair heard the bill exactly when the reasons sum to not against.
      expect(position.total + hearingTrait >= 0, why).toBe(record.heard);
    }
    for (const record of held) {
      const { position, hearingTrait } = record.chairReasons;
      expect(
        position.total + hearingTrait,
        `${where}: ${record.id}`,
      ).toBeLessThan(0);
    }
    const sample = held[0]!;
    console.log(
      `held bill reasons: ${where}; ${records.length} committee records, ${held.length} held; ${sample.id} (${sample.committee}) chair ${sample.chairId}: position ${sample.chairReasons.position.total.toFixed(3)} (views ${sample.chairReasons.position.views.toFixed(3)}, constituents ${sample.chairReasons.position.constituents.toFixed(3)}, sponsor ${sample.chairReasons.position.sponsor.toFixed(3)}, trait ${sample.chairReasons.position.trait.toFixed(3)}), hearing temperament ${sample.chairReasons.hearingTrait.toFixed(3)}`,
    );
    return;
  }
  throw new Error(
    `no drawn place held a bill in committee: ${tried.join("; ")}`,
  );
}, 1_800_000);
