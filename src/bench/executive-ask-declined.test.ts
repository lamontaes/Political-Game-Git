/**
 * An executive's bill that a member turns down: the no is kept with its true cause and date as
 * the ask's own record, the plate gives the reason a member would say aloud, and the same member
 * can be asked again later, the earlier no read back. The player is the executive: pinned to one
 * named place (a draw of the fixed run "8341-pin"), Ridgeville, Alabama, where the player is
 * the governor of Alabama. No random draw.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import {
  declinedAsks,
  declineReason,
  publicDeclineReason,
  type CarryRequest,
} from "../core2/modules/legislature";
import { buildBenchWorld } from "./world";
import { seatAsk, seatView } from "./legislature";

it("a declined ask is kept with its cause and date, the plate says the public reason, and the same member can be asked again (the governor of Ridgeville, Alabama's state)", () => {
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
      row.officeId === "office:US-AL:governor" &&
      row.status === "serving" &&
      row.personId,
  );
  expect(term?.personId, `${where}: a serving governor`).toBeTruthy();
  const governor = term!.personId!;
  // The world's player id is left alone, as in an Advanced start that steps into an office holder.
  const body = seatView(core, governor).bodies.find(
    (b) => "byRequest" in b && b.byRequest,
  );
  expect(body, `${where}: the governor's body`).toBeDefined();
  const ask = {
    officeId: body!.officeId,
    question: "us-policy-positions:housing-land-use.inclusionary-requirement",
    value: 1,
  };

  const first = seatAsk(core, governor, ask).asked;
  expect(first.carried, `${where}: the ask is turned down`).toBe(false);
  expect(first.reason, `${where}: the plate's reason`).toBe("party");
  expect(
    "pronouns" in first,
    `${where}: the member is spoken of from their record`,
  ).toBe(true);
  expect("earlier" in first, `${where}: nothing earlier to read back`).toBe(
    false,
  );
  const kept = declinedAsks(api, governor, first.memberId, body!.officeId);
  expect(kept, `${where}: the no is kept`).toHaveLength(1);
  expect(declineReason(kept[0]!), `${where}: the cause on the record`).toBe(
    "party",
  );
  expect(kept[0]!.date, where).toBe(String(core.date));

  // A month later the same member is asked again: a fresh answer, the first no read back.
  const date = new Date(`${String(core.date)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 30);
  api.state.date = date.toISOString().slice(0, 10) as never;
  const again = seatAsk(core, governor, ask).asked;
  expect(again.memberId, `${where}: the same member`).toBe(first.memberId);
  expect(again.earlier, `${where}: the earlier no with its date`).toEqual([
    String(kept[0]!.date),
  ]);
  expect(
    declinedAsks(api, governor, first.memberId, body!.officeId),
    `${where}: both noes kept`,
  ).toHaveLength(2);
}, 180_000);

it("a cause a member would not say aloud is given as a public reason and stays on the record", () => {
  const position = (over: Record<string, number>) =>
    ({
      views: 0,
      constituents: 0,
      sponsor: 0,
      deal: 0,
      lobby: 0,
      trait: 0,
      consistency: 0,
      bribe: 0,
      ...over,
    }) as unknown as CarryRequest["position"];
  const row = (over: Record<string, number>, standing = 0) => ({
    position: position(over),
    standing,
  });
  // The cause is what pulled hardest; the plate says what a member says.
  expect(declineReason(row({ deal: -3, views: -1 }))).toBe("deal");
  expect(publicDeclineReason(row({ deal: -3, views: -1 }))).toBe("views");
  expect(declineReason(row({ lobby: -3, constituents: -2 }))).toBe("lobby");
  expect(publicDeclineReason(row({ lobby: -3, constituents: -2 }))).toBe(
    "constituents",
  );
  // Nothing public pulled against it: how well the member knows the asker.
  expect(publicDeclineReason(row({ bribe: -4 }))).toBe("standing");
  expect(publicDeclineReason(row({}))).toBe("standing");
  // Causes a member does say stay as they are; sponsor and standing read as one.
  expect(publicDeclineReason(row({ trait: -1 }))).toBe("trait");
  expect(publicDeclineReason(row({ sponsor: -1 }))).toBe("standing");
});
