/**
 * An executive whose county data says they preside over the board (a commission county's probate
 * judge) is the body's chair: their Your office offers the board's draft menus as a member's
 * does, no "asked" path, and a bill they draft names them as its sponsor and goes to a vote.
 * Pinned to one named place (a draw of the fixed run "8341-pin"): Ridgeville, Alabama, whose
 * county is Etowah. No random draw.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { holdVote, type BillRow } from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { isByRequest, seatAct, seatView } from "./legislature";

it("the probate judge who presides over the board drafts as its chair (Ridgeville, Alabama)", () => {
  setBookkeeping(false);
  const place = drawPlace("8341-pin", "p6");
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe("0164656");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const offices = api.moduleState("core2-offices-v1");
  const executiveOffice = offices
    .table("offices")
    .get("office:gus2025:122491:executive") as unknown as
    { kind: string; presidesOverBody?: boolean } | undefined;
  expect(executiveOffice?.kind, `${where}: the county executive office`).toBe(
    "county-executive",
  );
  expect(
    executiveOffice?.presidesOverBody,
    `${where}: the office row says the executive presides`,
  ).toBe(true);
  const term = (
    offices.table("terms").rows() as unknown as {
      personId?: string;
      officeId: string;
      status: string;
    }[]
  ).find(
    (row) =>
      row.officeId === "office:gus2025:122491:executive" &&
      row.status === "serving" &&
      row.personId,
  );
  expect(term?.personId, `${where}: a serving probate judge`).toBeTruthy();
  const judge = term!.personId!;
  const view = seatView(core, judge);
  const board = view.bodies.find(
    (b) => b.officeId === "office:gus2025:122491:board",
  );
  expect(board, `${where}: the judge gets the board's menus`).toBeDefined();
  expect("byRequest" in board! && board.byRequest, where).toBeFalsy();
  expect(isByRequest(core, judge, board!.officeId), where).toBe(false);
  const item = board!.menus.flatMap((menu) => menu.items)[0];
  expect(item, `${where}: the board's menu is empty`).toBeDefined();
  const bill = seatAct(core, judge, {
    kind: "draft",
    officeId: board!.officeId,
    ...(item!.series
      ? { series: item!.series }
      : item!.question
        ? { question: item!.question }
        : { line: item!.line }),
    value: 1,
  });
  const row = api
    .moduleState("core2-legislature-v1")
    .table("bills")
    .get(bill.id) as unknown as
    (BillRow & { requestedBy?: string }) | undefined;
  expect(row?.sponsorId, `${where}: the judge sponsors the bill`).toBe(judge);
  expect(row?.requestedBy, `${where}: no member was asked`).toBeUndefined();
  if (row!.status !== "blocked") {
    const voted = holdVote(api, bill.id);
    expect(String(voted.status), `${where}: the vote was held`).not.toBe(
      "drafted",
    );
  }
}, 180_000);
