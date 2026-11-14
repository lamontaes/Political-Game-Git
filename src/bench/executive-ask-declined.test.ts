/**
 * An executive's bill that a member turns down: the no is kept with its reason and date as the
 * ask's own record, the screen reads the reason back, and the same member can be asked again
 * later, the earlier no read back with its date. Pinned to one named place (a draw of the fixed
 * run "8341-pin"): Ridgeville, Alabama, whose world also holds the D.C. mayor, who asks the
 * Council of the District of Columbia to raise the sales tax and is turned down. No random draw.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { declinedAsks, declineReason } from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { questionReasons } from "../english/question-names";
import { seatAsk, seatView } from "./legislature";

it("a declined ask is kept with its reason and date, and the same member can be asked again (Ridgeville, Alabama, the D.C. mayor)", () => {
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
  const term = (
    offices.table("terms").rows() as unknown as {
      personId?: string;
      officeId: string;
      status: string;
    }[]
  ).find(
    (row) =>
      row.officeId === "office:US-DC:mayor" &&
      row.status === "serving" &&
      row.personId,
  );
  expect(term?.personId, `${where}: a serving D.C. mayor`).toBeTruthy();
  const mayor = term!.personId!;
  core.playerId = mayor;
  const body = seatView(core, mayor).bodies.find(
    (b) => "byRequest" in b && b.byRequest,
  );
  expect(body, `${where}: the mayor's body`).toBeDefined();
  const ask = { officeId: body!.officeId, series: "sales-tax", value: 1 };

  const first = seatAsk(core, mayor, ask).asked;
  expect(first.carried, `${where}: the sales tax ask is turned down`).toBe(
    false,
  );
  expect(first.reason, `${where}: the no has its reason`).toBeTruthy();
  expect("earlier" in first, `${where}: nothing earlier to read back`).toBe(
    false,
  );
  const kept = declinedAsks(api, mayor, first.memberId, body!.officeId);
  expect(kept, `${where}: the no is kept`).toHaveLength(1);
  expect(declineReason(kept[0]!), where).toBe(first.reason);
  expect(kept[0]!.date, where).toBe(String(core.date));

  // A month later the same member is asked again: a fresh answer, the first no read back.
  api.state.date = makeLater(String(core.date));
  const again = seatAsk(core, mayor, ask).asked;
  expect(again.memberId, `${where}: the same member`).toBe(first.memberId);
  expect(again.earlier, `${where}: the earlier no with its date`).toEqual([
    String(kept[0]!.date),
  ]);
  expect(
    declinedAsks(api, mayor, first.memberId, body!.officeId),
    `${where}: both noes kept`,
  ).toHaveLength(2);
}, 180_000);

function makeLater(date: string): never {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10) as never;
}

it("a declined question says the member's own reason when the no is about what they believe (Monserrate, Puerto Rico, the D.C. mayor)", () => {
  setBookkeeping(false);
  const place = drawPlace("8341-pin", "p8");
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe("7253979");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const offices = coreAPI(core).moduleState("core2-offices-v1");
  const term = (
    offices.table("terms").rows() as unknown as {
      personId?: string;
      officeId: string;
      status: string;
    }[]
  ).find(
    (row) =>
      row.officeId === "office:US-DC:mayor" &&
      row.status === "serving" &&
      row.personId,
  );
  const mayor = term!.personId!;
  core.playerId = mayor;
  const body = seatView(core, mayor).bodies.find(
    (b) => "byRequest" in b && b.byRequest,
  );
  const question = "us-policy-positions:education.raise-teacher-minimum-salary";
  const asked = seatAsk(core, mayor, {
    officeId: body!.officeId,
    question,
    value: 1,
  }).asked;
  expect(asked.carried, `${where}: the ask is turned down`).toBe(false);
  expect(asked.reason, `${where}: the no has its reason`).toBeTruthy();
  const said = questionReasons(question, "against").reason;
  if (asked.reason === "views" && said)
    expect("reasonWords" in asked && asked.reasonWords, where).toBe(said);
  else expect("reasonWords" in asked, where).toBe(false);
}, 180_000);
