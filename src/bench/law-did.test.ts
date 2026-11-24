/**
 * What this law did (play-what-this-law-did-page), in played worlds: a local
 * body passes a property tax rise through the real legislature, the world runs
 * to the first collections, and the law page's view (`lawDid`) shows exactly
 * what the core's one reach reader (`lawReach`, the one dev mode's reach reads)
 * holds: every person it names and every sum. The view writes no record. Then
 * a second bill lowers the rate again; after it takes over, the first law's
 * reach is still readable, the page says when it was replaced, and each person
 * it named carries the day it stopped for them.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { townSeats } from "../core2/modules/offices";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import {
  bodyOf,
  castChairHearing,
  castMemberVote,
  chambersOf,
  draftBill,
  executiveDecision,
  holdVote,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { lawChain, LAWS_MODULE_ID } from "../core2/modules/laws";
import { lawReach } from "../core2/law-reach/applied";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";
import { drawPlace } from "../../scripts/core2-year/place";
import { lawDid } from "./law-did";

const seed = process.env.LAW_DID_SEED || randomBytes(8).toString("hex");
const LOCAL = new Set(["city", "town", "village", "township", "borough"]);
/** Places the test proves it in, and the most it draws to find them (a drawn place may have no town body). */
const PLACES = 2;
const DRAWS = 10;

/** Every module table's rows, as text: what a view must leave as it found it. */
function snapshot(core: CoreState): string {
  const api = coreAPI(core);
  return [...core.modules.keys()]
    .flatMap((id) =>
      Object.keys(core.modules.get(id)?.state?.tables ?? {}).map(
        (name) =>
          `${id}/${name}:${JSON.stringify(api.moduleState(id).table(name).rows())}`,
      ),
    )
    .join("\n");
}

function pass(
  core: CoreState,
  seat: { officeId: string; sponsor: string },
  policyId: string,
  operation: string,
  amount: number,
) {
  const api = coreAPI(core);
  const bill = draftBill(api, {
    bodyOfficeId: seat.officeId,
    sponsorId: seat.sponsor,
    provisions: [
      provisionFor({ policyId, operation: operation as never, amount }),
    ],
  });
  // Dev mode's force, as its bill card does it: every member yes, the chair hears it, the executive signs.
  for (const chamber of chambersOf(api, bill)) {
    for (const m of members(api, chamber))
      castMemberVote(api, bill.id, memberKey(m), "yes");
    castChairHearing(api, bill.id, chamber, true);
  }
  executiveDecision(api, bill.id, true);
  let held = holdVote(api, bill.id);
  if (held.status === "awaiting-signature")
    held = executiveDecision(api, bill.id, true);
  return held;
}

const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

describe(`what this law did, on the law page (seed ${seed})`, () => {
  it("shows whom a property tax reached, by record, and keeps it after it is replaced", () => {
    const proved: string[] = [];
    const skipped: string[] = [];
    for (let at = 0; at < DRAWS && proved.length < PLACES; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "law-did");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const seatRow = townSeats(api).find(
        (r) =>
          LOCAL.has(r.office.level) &&
          r.holder?.personId &&
          bodyOf(api, r.office.id),
      );
      const policy = seatRow
        ? billCatalog(api, seatRow.office.level as never)
            .flatMap((s) => s.topics.flatMap((t) => t.policies))
            .find(
              (p) =>
                p.series === "property-tax" &&
                p.authority.allowed &&
                p.operations.includes("raise") &&
                p.operations.includes("lower") &&
                typeof p.inForce === "number",
            )
        : undefined;
      if (!seatRow || !policy) {
        skipped.push(`${where}: no town body that may set the property tax`);
        continue;
      }
      const seat = {
        officeId: seatRow.office.id,
        sponsor: seatRow.holder!.personId!,
      };
      const was = policy.inForce as number;
      const raised = pass(core, seat, policy.id, "raise", was * 1.5);
      expect(raised.status, where).toBe("enacted");
      const law = (
        api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as {
          id: string;
          series: string;
          effectiveDate: string;
          terms?: { enactedByBill?: string };
        }[]
      ).find((row) => row.terms?.enactedByBill === raised.id);
      expect(law, `${where}: the bill's law row`).toBeTruthy();
      // To the law's day, then a collection's worth of days.
      advanceCore(core, makeIsoDate(law!.effectiveDate));
      run(core, 45);
      const town = lawChain(api).townPlaceId;
      const before = snapshot(core);
      const page = lawDid(core, "property-tax");
      expect(snapshot(core), `${where}: the view wrote a record`).toBe(before);
      const shown = page.find((d) => d.lawId === law!.id);
      expect(shown, `${where}: the page lists the law ${law!.id}`).toBeTruthy();
      const reach = lawReach(api, law!.id, town);
      console.log(
        `law-did: ${where}: ${law!.id} reached ${reach.fullPeopleInTown} here ($${reach.amountInTownMinor / 100}), ${reach.fullPeopleElsewhere} elsewhere ($${reach.amountElsewhereMinor / 100}), ${reach.counted} counted ($${reach.amountCountedMinor / 100})`,
      );
      expect(
        reach.records,
        `${where}: the law reached someone`,
      ).toBeGreaterThan(0);
      // The page holds what the reach holds, nothing more.
      expect(shown!.records, where).toBe(reach.records);
      expect(shown!.fullInTown, where).toEqual({
        people: reach.fullPeopleInTown,
        amountMinor: reach.amountInTownMinor,
      });
      expect(shown!.fullElsewhere, where).toEqual({
        people: reach.fullPeopleElsewhere,
        amountMinor: reach.amountElsewhereMinor,
      });
      expect(shown!.counted, where).toEqual({
        people: reach.counted,
        amountMinor: reach.amountCountedMinor,
      });
      const byId = new Map(reach.people.map((p) => [p.personId, p]));
      for (const named of shown!.named) {
        const held = byId.get(named.personId);
        expect(
          held,
          `${where}: ${named.personId} is not in the reach`,
        ).toBeTruthy();
        expect(named.amountMinor, `${where}: ${named.personId}`).toBe(
          held!.amountMinor,
        );
        expect(named.name, `${where}: ${named.personId}`).not.toBe("");
      }
      expect(shown!.replacedOn, where).toBeNull();

      // The rate goes back; once the new law takes over, the old one's reach stays and says when it stopped.
      const lowered = pass(core, seat, policy.id, "lower", was);
      expect(lowered.status, where).toBe("enacted");
      run(core, 75);
      const after = lawDid(core, "property-tax").find(
        (d) => d.lawId === law!.id,
      );
      expect(after, where).toBeTruthy();
      expect(
        after!.records,
        `${where}: the replaced law's reach is still readable`,
      ).toBeGreaterThanOrEqual(reach.records);
      expect(
        after!.replacedOn,
        `${where}: the page says when it stopped`,
      ).not.toBeNull();
      expect(
        after!.named.every((p) => p.endedOn !== null),
        `${where}: each person it named stopped`,
      ).toBe(true);
      proved.push(where);
    }
    console.log(`law-did: proved in ${proved.join("; ")}`);
    if (skipped.length) console.log(`law-did: skipped ${skipped.join("; ")}`);
    expect(
      proved.length,
      `places proved (skipped: ${skipped.join("; ")})`,
    ).toBe(PLACES);
  }, 3_600_000);
});
