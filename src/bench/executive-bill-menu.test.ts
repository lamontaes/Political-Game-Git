/**
 * A serving single-seat executive whose office has a "by-request" proposal right gets the
 * same draft menus a member gets, for the body that votes on their government's bills, and
 * sends a bill through `proposeAsExecutive` (the one engine): the member asked answers, and a
 * bill carried names the executive as its requester. Pinned to two named places (draws of the
 * fixed run "8341-pin"): one with a mayor, a county executive and a governor, one with a mayor
 * and a governor. Each kind that place has is proved; nothing here depends on a random draw.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "./../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { proposalRight, type BillRow } from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { isByRequest, seatAsk, seatView } from "./legislature";

const OFFICES = "core2-offices-v1";
const RUN = "8341-pin";
const PLACES = [
  // Ridgeville, Alabama (0164656): mayor, county executive, governor.
  {
    purpose: "p6",
    key: "0164656",
    kinds: ["mayor", "county-executive", "governor"],
  },
  // Brogan, Oregon (4108600): mayor, governor.
  { purpose: "p0", key: "4108600", kinds: ["mayor", "governor"] },
];

for (const pinned of PLACES) {
  it(`executives with a proposal right get a draft menu and ask a member (${pinned.key})`, () => {
    setBookkeeping(false);
    const place = drawPlace(RUN, pinned.purpose);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    expect(place.key, `${where}: the pinned place moved`).toBe(pinned.key);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES);
    const terms = offices.table("terms").rows() as unknown as {
      personId?: string;
      officeId: string;
      status: string;
    }[];
    for (const kind of pinned.kinds) {
      const executive = terms.find((term) => {
        const office = offices.table("offices").get(term.officeId) as
          { kind: string; seats: number } | undefined;
        return (
          term.status === "serving" &&
          term.personId &&
          office &&
          office.seats < 2 &&
          office.kind === kind &&
          proposalRight(api, office.kind).mode === "by-request"
        );
      });
      expect(executive?.personId, `${where}: no serving ${kind}`).toBeTruthy();
      const view = seatView(core, executive!.personId!);
      const body = view.bodies.find((b) => "byRequest" in b && b.byRequest);
      expect(body, `${where}: a ${kind} gets no menu`).toBeDefined();
      const item = body!.menus.flatMap((menu) => menu.items)[0];
      expect(item, `${where}: the ${kind}'s menu is empty`).toBeDefined();
      expect(
        isByRequest(core, executive!.personId!, body!.officeId),
        where,
      ).toBe(true);
      const result = seatAsk(core, executive!.personId!, {
        officeId: body!.officeId,
        ...(item!.series
          ? { series: item!.series }
          : item!.question
            ? { question: item!.question }
            : { line: item!.line }),
        value: 1,
      });
      expect(result.asked.name, `${where}: who the ${kind} asked`).toBeTruthy();
      if (result.asked.carried) {
        const bill = api
          .moduleState("core2-legislature-v1")
          .table("bills")
          .get(String(result.asked.billId)) as unknown as
          (BillRow & { requestedBy?: string }) | undefined;
        expect(
          bill?.requestedBy,
          `${where}: the ${kind}'s bill names its requester`,
        ).toBe(executive!.personId);
      }
    }
  }, 120_000);
}
