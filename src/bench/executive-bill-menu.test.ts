/**
 * A serving single-seat executive whose office has a "by-request" proposal right gets the
 * same draft menus a member gets, for the body that votes on their government's bills, and
 * sends a bill through `proposeAsExecutive` (the one engine): the member asked answers, and a
 * bill carried names the executive as its requester. Two drawn places with an elected
 * mayor, named with their seeds; places with no elected mayor are named and passed over.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "./../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { proposalRight, type BillRow } from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { isByRequest, seatAsk, seatView } from "./legislature";

const OFFICES = "core2-offices-v1";
const WANT = 2;

it("a mayor or governor with a proposal right gets a draft menu and asks a member", () => {
  setBookkeeping(false);
  const run = randomBytes(32).toString("hex");
  const passed: string[] = [];
  let proved = 0;
  for (let draw = 0; proved < WANT && draw < 12; draw++) {
    const place = drawPlace(run, `executive-bill-menu-${draw}`);
    const where = `${place.key} seed ${place.seed}`;
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
    const executive = terms.find((term) => {
      const office = offices.table("offices").get(term.officeId) as
        { kind: string; seats: number } | undefined;
      return (
        term.status === "serving" &&
        term.personId &&
        office &&
        office.seats < 2 &&
        office.kind !== "president" &&
        proposalRight(api, office.kind).mode === "by-request"
      );
    });
    if (!executive?.personId) {
      passed.push(`${where}: no elected executive with a proposal right`);
      continue;
    }
    const view = seatView(core, executive.personId);
    const exOffice = offices
      .table("offices")
      .get(executive.officeId) as unknown as {
      id: string;
      kind: string;
      jurisdiction: string;
    };
    const around = (
      offices
        .table("offices")
        .query("byJurisdiction", [exOffice.jurisdiction]) as unknown as {
        id: string;
        seats: number;
      }[]
    )
      .map((o) => `${o.id}:${o.seats}`)
      .join(",");
    const body = view.bodies.find((b) => "byRequest" in b && b.byRequest);
    expect(
      body,
      `${where}: an executive with a proposal right gets no menu (${exOffice.id} in ${exOffice.jurisdiction}; offices there: ${around}; all bodies: ${view.bodies.length})`,
    ).toBeDefined();
    const item = body!.menus.flatMap((menu) => menu.items)[0];
    expect(item, `${where}: the executive's menu is empty`).toBeDefined();
    expect(isByRequest(core, executive.personId, body!.officeId), where).toBe(
      true,
    );
    const result = seatAsk(core, executive.personId, {
      officeId: body!.officeId,
      ...(item!.series
        ? { series: item!.series }
        : item!.question
          ? { question: item!.question }
          : { line: item!.line }),
      value: item!.question ? 1 : 1,
    });
    expect(result.asked.name, `${where}: who was asked`).toBeTruthy();
    if (result.asked.carried) {
      const bill = api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .get(String(result.asked.billId)) as unknown as
        (BillRow & { requestedBy?: string }) | undefined;
      expect(bill?.requestedBy, `${where}: the bill names its requester`).toBe(
        executive.personId,
      );
    }
    proved += 1;
  }
  expect(
    proved,
    `fewer than ${WANT} places had an executive to prove; passed over: ${passed.join("; ")}`,
  ).toBe(WANT);
}, 900_000);
