/**
 * A household settled with a lawyer under the right-to-counsel law is told in
 * writing (SG-GOV-REACH-A-eviction-cases), in a played year: the law is in
 * force from the first day, a full household falls behind on rent, the city
 * pays a lawyer, the hearing reaches a repayment plan in place of a judgment,
 * and the household's oldest adult holds a view of the law that cites the
 * settlement notice. Places are drawn in turn from a seed nobody chose until
 * one has such a household (EVICTION_NOTICE_DRAW="seed|label" pins one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { stancesOf } from "./modules/views";
import { coreAPI } from "./state";

const seed = process.env.EVICTION_NOTICE_SEED ?? randomBytes(8).toString("hex");
const RIGHT_TO_COUNSEL =
  "us-policy-positions:housing-land-use.right-to-counsel-in-eviction";

describe("a settlement under the right to counsel is a notice", () => {
  it("tells the household's oldest adult, who holds a view of the law citing it", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const pinned = process.env.EVICTION_NOTICE_DRAW?.split("|");
      const place = pinned
        ? drawPlace(pinned[0]!, pinned[1]!)
        : drawPlace(`${seed}:${attempt}`, "eviction-notice");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      tried.push(where);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      for (const level of lawChain(api).levels)
        enactLaw(api, {
          ...level,
          series: RIGHT_TO_COUNSEL,
          value: 1,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: `notice-counsel-${level.level}`,
          citation: "Right to counsel in force from the first day",
        });
      for (let day = 0; day < 365; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const settled = (
        api.moduleState("housing").table("cases").rows() as unknown as {
          id: string;
          householdId: string;
          stage: string;
          counted?: boolean;
          counselLawId?: string | null;
          settledAt?: string;
        }[]
      ).filter(
        (row) =>
          !row.counted &&
          row.counselLawId &&
          row.settledAt &&
          core.households.has(row.householdId),
      );
      if (!settled.length) continue;
      for (const row of settled) {
        const house = core.households.get(row.householdId)!;
        const held = house.memberIds
          .map((id) =>
            stancesOf(api, id).find((st) => st.topic === RIGHT_TO_COUNSEL),
          )
          .filter((st) => st !== undefined);
        expect(held.length, `${where}: ${row.id} nobody was told`).toBe(1);
        expect(held[0]!.desiredChange, where).toBe("enact");
        expect(
          held[0]!.causes.some((c) =>
            String(c.learnedFrom).startsWith(
              `event:housing.settlement-notice:${row.id}:`,
            ),
          ),
          `${where}: ${row.id} ${JSON.stringify(held[0])} settledAt ${row.settledAt}`,
        ).toBe(true);
      }
      return;
    }
    throw new Error(
      `no drawn town settled a full household: ${tried.join("; ")}`,
    );
  }, 3_000_000);
});
