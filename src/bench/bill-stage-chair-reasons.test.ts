/**
 * A bill its committee's chair would not hear says why on its page, in the words a governor's
 * reasons at the desk are said in (Account lead, Nov 15). Pinned at the Texas place of the lie
 * search, seed 8647-mason, a state senator drafting on day one: the housing bill is held by the
 * Senate environment-less housing chair on the first committee day, the gas bill is heard.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  memberKey,
  members,
  billOf,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import controls from "./data/controls.json" with { type: "json" };
import { billStage } from "./bill-stage";
import { seatAct } from "./legislature";

const PLACE = "4846968";
const SEED = "8647-mason";
const HELD =
  "us-policy-positions:housing-land-use.right-to-counsel-in-eviction";
const HEARD = "us-policy-positions:environment-energy.ban-new-gas-hookups";

describe("the bill page says why a chair held a bill", () => {
  it("lists the chair's own reasons for a held bill and none for a heard one", () => {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const seat = townSeats(api).find(
      (r) =>
        r.office.level === "state" &&
        bodyOf(api, r.office.id) &&
        members(api, r.office.id).length >= 3 &&
        members(api, r.office.id).every((t) => t.personId),
    )!;
    const ids = members(api, seat.office.id).map(memberKey).sort();
    for (const id of ids) fillInPerson(core, id);
    const draft = (ix: number, question: string) =>
      (
        seatAct(core, ids[ix]!, {
          kind: "draft",
          officeId: seat.office.id,
          question,
        }) as unknown as { id: string }
      ).id;
    const held = draft(15, HELD);
    const heard = draft(4, HEARD);
    while (core.date < "2025-02-14")
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const reasonWords = controls.billStage.reasons as Record<string, string>;

    const heldRow = billStage(core, held, ids[15]).committees[0]!;
    expect(heldRow.heard).toBe(false);
    expect(billOf(api, held).status).toBe("failed");
    expect(heldRow.chairReasons.length).toBeGreaterThan(0);
    for (const reason of heldRow.chairReasons)
      expect(reasonWords[reason.reason], reason.reason).toBeTruthy();
    // A chair holds a bill when what pulled for it does not outweigh what pulled against.
    const net = heldRow.chairReasons.reduce((sum, r) => sum + r.magnitude, 0);
    expect(net).toBeLessThan(0);
    expect(heldRow.chairReasons[0]!.side).toBe("against");

    const heardRow = billStage(core, heard, ids[4]).committees[0]!;
    expect(heardRow.heard).toBe(true);
    expect(heardRow.chairReasons).toEqual([]);
  }, 400_000);
});
