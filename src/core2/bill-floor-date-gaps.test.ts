/**
 * The two ways a kept floor date could still mislead (Account lead, Nov 15,
 * after the floor date was kept): a bill the chamber's leader refuses to put on
 * the floor, and a bill drafted while no legislature sits. Pinned at Holiday
 * Lakes, Texas, and at a Florida place whose legislature has not convened at the
 * start, seed aa11.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct } from "../bench/legislature";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { askLeaderForHearing } from "./office-day-state";
import { lawInForce } from "./modules/laws";
import { floorDateOf, memberKey, members, billOf } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const PLACE = "4834502"; // Holiday Lakes, Texas: its legislature is sitting at the start
const QUIET_PLACE = "1200075"; // a Florida place: its legislature convenes March 4, 2025
const SEED = "aa11";

const world = (placeKey = PLACE) => {
  const built = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(built.core);
  const seat = townSeats(api).find(
    (s) => s.office.kind === "legislature-lower" && s.holder?.personId,
  )!;
  return { core: built.core, api, seat };
};

const minimumWageBill = (
  core: ReturnType<typeof world>["core"],
  api: ReturnType<typeof world>["api"],
  sponsor: string,
  officeId: string,
  series = "minimum-wage",
  step = 100,
) => {
  const floor = lawInForce(api, series).value ?? 0;
  const bill = seatAct(core, sponsor, {
    kind: "draft",
    officeId,
    series,
    value: floor + step,
  }) as unknown as { id: string; status: string };
  expect(bill.status).not.toBe("blocked");
  return bill.id;
};

describe("a kept floor date never names a day the floor misses", () => {
  it("stops naming a date for a bill the leader refuses", () => {
    const { core, api, seat } = world();
    // A member the chamber's leader refuses, found by asking each in turn
    // (the leader's answer comes from party, ties and traits, never a roll).
    const passedOver: string[] = [];
    let refused: { sponsor: string; id: string } | null = null;
    for (const term of members(api, seat.office.id)) {
      const sponsor = memberKey(term);
      if (!core.people.get(sponsor)?.alive) continue;
      const id = minimumWageBill(core, api, sponsor, seat.office.id);
      const named = floorDateOf(api, id);
      expect(named, "a date is named the day it is drafted").toBeTruthy();
      const answer = askLeaderForHearing(api, sponsor, id, {
        schedule: false,
      });
      if (!answer.granted) {
        refused = { sponsor, id };
        break;
      }
      passedOver.push(sponsor);
    }
    expect(
      refused,
      `no member of the chamber was refused; granted: ${passedOver.join(", ")}`,
    ).not.toBe(null);
    expect(floorDateOf(api, refused!.id)).toBe(null);
  }, 240_000);

  it("keeps the date named for a bill drafted between sittings once the sitting opens", () => {
    const { core, api, seat } = world(QUIET_PLACE);
    // No legislature sits at the start; draft then, and play to the sitting.
    // The bill is a dollar on the minimum wage, as in the case above: its
    // committee meets on its own day ahead of the floor and reports or holds
    // it (ce2275bb), and a fifty-point sales tax (the bill this case drafted
    // until Nov 19: the floor's 6.948 percent plus 50) is one no committee
    // reports, so it died the day before its floor date and the case never
    // saw the floor take a bill up.
    const sponsor = seat.holder!.personId!;
    const id = minimumWageBill(core, api, sponsor, seat.office.id);
    expect(floorDateOf(api, id), "no sitting, so no date").toBe(null);
    advanceCore(core, "2025-03-01");
    // From the day the sitting names a date it holds until the floor takes the
    // bill up; the vote the floor then books is its own act (at most a week on).
    let named: string | null = null;
    let took: string | null = null;
    for (let n = 0; n < 90 && !took; n += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      if (billOf(api, id).status !== "drafted") {
        took = core.date;
        break;
      }
      const date = floorDateOf(api, id);
      if (date && !named) named = date;
      if (named && core.date < named)
        expect(date, `${core.date}: the date slid`).toBe(named);
    }
    expect(named, "the sitting names a date").toBeTruthy();
    // The leader put it on the calendar the day the sitting opened.
    expect(
      (billOf(api, id) as unknown as { floorOn?: string }).floorOn,
      "the calendar keeps the date named",
    ).toBe(named);
    expect(took, "the floor took the bill up").toBeTruthy();
    expect(billOf(api, id).status, "it was voted, not mooted").not.toBe(
      "failed",
    );
    expect(took! >= named!, `took up ${took}, named ${named}`).toBe(true);
    expect(took! <= addDays(makeIsoDate(named!), 7), `voted ${took}`).toBe(
      true,
    );
  }, 240_000);
});
