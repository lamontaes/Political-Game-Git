/**
 * Every aide of an official in a played world is on a treasury payroll, in
 * any place: a territory's state and federal offices have no job where they
 * sit to take a schedule from, so they follow the town's (pool item
 * gov-stopgap-staff-missing-engine). A place is drawn from all 56; set
 * STAFF_PAID_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { townSeats } from "./modules/offices";
import { staffOf } from "./modules/staff";

/** A post younger than this has had no payday: aides hired in the last month are not yet owed a record. */
const RECENT_POST_DAYS = 30;
const seed = process.env.STAFF_PAID_SEED ?? randomBytes(8).toString("hex");

function everyAidePaid(place: { name: string; key: string; seed: string }) {
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // The payroll journal entries that credit each account, by record id.
  const payroll = new Map<string, string[]>();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    if (entry.sourceRef.id.startsWith("work-payroll:"))
      for (const p of entry.postings)
        if (p.deltaMinor > 0)
          payroll.set(p.accountId, [
            ...(payroll.get(p.accountId) ?? []),
            entry.sourceRef.id,
          ]);
    return post(entry);
  };
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const aides = townSeats(api).flatMap((s) =>
    s.holder ? staffOf(api, s.holder.personId) : [],
  );
  expect(aides.length, where).toBeGreaterThan(0);
  const unpaid = aides.filter((a) => !a.jobId).map((a) => a.id);
  expect(unpaid, where).toEqual([]);
  // Each aide has a work commitment with a pay calendar, and has been paid.
  for (const aide of aides) {
    const commitments = [
      ...(core.work.commitmentsByPerson.get(aide.personId) ?? []),
    ].map((id) => core.work.commitments.get(id)!);
    const commitment = commitments.find((row) => row.jobId === aide.jobId);
    expect(commitment, `${where} ${aide.id} commitment`).toBeDefined();
    expect(
      core.work.payrollCalendarByCommitment.get(commitment!.id),
      `${where} ${aide.id} calendar`,
    ).toBeDefined();
    // A post that began in the last month has not reached a payday yet (the
    // president's aides are hired a month apart, and the run ends the day
    // after the last one starts: Mustang, Texas).
    if (daysBetween(commitment!.startsAt, core.date) < RECENT_POST_DAYS)
      continue;
    const paid = (payroll.get(api.accounts().main(aide.personId)) ?? []).filter(
      (id) => id.includes(`work-commitment:${aide.jobId}`),
    );
    expect(paid.length, `${where} ${aide.id} payroll record`).toBeGreaterThan(
      0,
    );
  }
}

it("an aide hired in a played world draws a government paycheck", () => {
  everyAidePaid(drawPlace(seed, "staff-paid"));
}, 900_000);

// A territory's workers are counted, so no recorded job there has a schedule
// to follow; its aides still draw a government paycheck.
it("every aide in Charlotte Amalie East, U.S. Virgin Islands, is on a payroll", () => {
  everyAidePaid({
    name: "Charlotte Amalie East",
    key: "territory:VI:charlotte-amalie-east",
    seed: "p3",
  });
}, 900_000);

// A town whose president's aide had no payroll record after 120 days (found by
// the merger on Oct 20): kept so the case stays in the suite.
it("every aide in Mustang, Texas, is on a payroll", () => {
  everyAidePaid({
    name: "Mustang",
    key: "4850184",
    seed: "b1b42a77246ea4d8022653a8c55b696ebb578c9c13812a0d171a91105844b7c2",
  });
}, 900_000);
