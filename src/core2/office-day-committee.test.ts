/**
 * A state legislator at their committee (pool item
 * office-committee-assignments-and-hearings-as-stops-and): the committee's
 * day, attended, tells the member where they sit (the record that seated the
 * committee) and what it heard that day (the hearing record: the bill, the
 * chair, the witnesses and the vote), each read from the engines' own records
 * in a generated world.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { committeeForSection } from "./legislature-committees";
import { lawHere } from "./modules/laws";
import { draftBill, holdCommittee } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  actOn,
  committeesOf,
  stateDay,
  stateOfficeOf,
} from "./office-day-state";
import { coreAPI } from "./state";

const DRAWS = 8;

it("a legislator at their committee reads the record that seated it and the hearing it held", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  const misses: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "office-committee");
    const where = `${place.name} [${place.key}], seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const answer = lawHere(api).find((row) => row.value !== null);
    if (!answer) {
      misses.push(`${where}: no law to amend`);
      continue;
    }
    const provision = {
      kind: "law-amount" as const,
      series: answer.series,
      value: answer.value! + 1,
    };
    const committee = committeeForSection(provision);
    const legislators = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    )
      .filter((t) => t.status === "serving" && t.personId)
      .flatMap((t) => {
        const office = stateOfficeOf(api, t.personId!);
        return office?.role === "legislator" &&
          committeesOf(api, office.officeId, office.personId).some(
            (c) => c.committee === committee,
          )
          ? [office]
          : [];
      });
    const member = legislators[0];
    if (!member) {
      misses.push(`${where}: nobody sits on the ${committee} committee`);
      continue;
    }
    // The first day in the next two years the member's calendar has this committee.
    const start = makeIsoDate(core.date);
    let day: string | null = null;
    for (let n = 1; n < 730 && !day; n += 1) {
      const date = addDays(start, n);
      if (
        stateDay(api, member, date).some(
          (e) =>
            e.kind === "committee" &&
            e.subject === `${member.officeId}:${committee}`,
        )
      )
        day = date;
    }
    if (!day) {
      misses.push(`${where}: the committee never meets`);
      continue;
    }
    advanceCore(core, day);
    const bill = draftBill(api, {
      bodyOfficeId: member.officeId,
      sponsorId: member.personId,
      provisions: [provision],
    });
    const hearing = holdCommittee(api, bill.id);
    if (!hearing) {
      misses.push(`${where}: the body has no committee stage`);
      continue;
    }
    const entry = stateDay(api, member, day).find(
      (e) =>
        e.kind === "committee" &&
        e.subject === `${member.officeId}:${committee}`,
    )!;
    const result = actOn(api, entry, { kind: "attend", attend: true });
    expect(result.recordIds, where).toContain(
      `${member.officeId}:${committee}`,
    );
    expect(result.recordIds, where).toContain(hearing.id);
    expect(result.reasons[`bill:${hearing.id}`], where).toBe(bill.id);
    expect(result.reasons[`chair:${hearing.id}`], where).toBe(hearing.chairId);
    expect(result.reasons[`witnesses:${hearing.id}`], where).toBe(
      hearing.witnesses.map((w) => w.personId).join(","),
    );
    expect(result.reasons[`vote:${hearing.id}`], where).toBe(
      `${hearing.yes}-${hearing.no}`,
    );
    console.log(
      `COMMITTEE ${where}: ${member.personId} at ${committee} on ${day}, ${hearing.id}`,
    );
    return;
  }
  expect.fail(`no draw reached a hearing in ${DRAWS}: ${misses.join("; ")}`);
}, 3_600_000);
