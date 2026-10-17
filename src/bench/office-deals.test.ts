/**
 * Negotiating from play: the office panel lists the colleagues who vote on the
 * player's bill with the deal set for each, the player sets one, and when they
 * talk the colleague decides it from their own position and the bill's record
 * keeps the deal (golden path step 7). A random place from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { draftBill, billOf } from "../core2/modules/legislature";
import { officeActsOf, officeHost } from "../core2/modules/office-day";
import {
  OFFICES_MODULE_ID,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { officeActHandlers } from "../core2/office-day-acts";
import { seatView } from "./legislature";
import { colleagueDeal, officeView } from "./office";
import controls from "./data/controls.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("sets a deal for a colleague on the office panel, and the talk offers it and keeps it on the bill", () => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-deals");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${seed}:${attempt}, place seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const terms = (seatId: string) =>
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
    // A resident officeholder on a body with colleagues drafts a bill the body may pass.
    let sponsor: string | undefined;
    let bill: ReturnType<typeof draftBill> | undefined;
    for (const { seat } of townSeats(api)) {
      const holder = terms(seat.id)[0]?.personId;
      const body = holder ? seatView(core, holder).bodies[0] : undefined;
      if (!holder || !body || body.members.length < 2) continue;
      for (const question of seatView(core, holder).questions) {
        const drafted = draftBill(api, {
          bodyOfficeId: body.officeId,
          sponsorId: holder,
          provisions: [{ kind: "policy-question", question, value: 1 }],
        });
        if (drafted.status === "drafted") {
          sponsor = holder;
          bill = drafted;
          break;
        }
      }
      if (bill) break;
    }
    if (!sponsor || !bill) continue;

    const listed = officeView(core, sponsor).deals.find(
      (row) => row.billId === bill.id,
    );
    expect(listed, where).toBeTruthy();
    expect(listed!.colleagues.length, where).toBeGreaterThan(0);
    expect(
      listed!.colleagues.every((row) => row.deal === null),
      where,
    ).toBe(true);
    // Every deal has a control name.
    for (const deal of ["none", "favor", "back-their-item"])
      expect(
        (controls.deals as Record<string, string>)[deal],
        deal,
      ).toBeTruthy();

    const colleague = listed!.colleagues[0]!.key;
    expect(
      () => colleagueDeal(core, sponsor, colleague, "bribe"),
      where,
    ).toThrow();
    expect(
      () => colleagueDeal(core, sponsor, "someone-else", "favor"),
      where,
    ).toThrow();
    const set = colleagueDeal(core, sponsor, colleague, "favor");
    expect(
      set.deals
        .find((row) => row.billId === bill.id)!
        .colleagues.find((c) => c.key === colleague)!.deal,
      where,
    ).toBe("favor");

    // Talking to the colleague offers the deal; their own position decides it.
    officeActHandlers(officeHost)["talk-to-colleague"](api, sponsor, {
      targetId: colleague,
    } as never);
    const after = billOf(api, bill.id)!;
    const dealt = after.deals.filter((d) => d.memberId === colleague);
    expect(dealt.length, `the deal is on the bill: ${where}`).toBe(1);
    expect(dealt[0]!.kind, where).toBe("favor");
    expect(["accepted", "declined"], where).toContain(dealt[0]!.status);
    expect(
      officeActsOf(api, sponsor).some(
        (row) => row.kind === "talk-to-colleague",
      ),
      where,
    ).toBe(true);

    // Setting none takes the deal back off the panel.
    const cleared = colleagueDeal(core, sponsor, colleague, "none");
    expect(
      cleared.deals
        .find((row) => row.billId === bill.id)!
        .colleagues.find((c) => c.key === colleague)!.deal,
      where,
    ).toBeNull();
    return;
  }
  throw new Error(
    `No drawn town had an officeholder who could draft in 8 draws; ${seed}`,
  );
}, 1_800_000);
