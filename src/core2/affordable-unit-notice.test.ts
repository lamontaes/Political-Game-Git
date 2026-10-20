/**
 * A household placed in a set-aside unit under the inclusionary law is told in
 * writing (SG-GOV-REACH-A-affordable-units), in a played year: the law is in
 * force from the first day, builders set units aside, a full household moves
 * into one at a rent below the building's asking rent, and its oldest adult
 * holds a view of the law that cites the notice of a set-aside unit. Places
 * are drawn in turn from a seed nobody chose until one has such a household
 * (AFFORDABLE_NOTICE_DRAW="seed|label" pins one).
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

const seed =
  process.env.AFFORDABLE_NOTICE_SEED ?? randomBytes(8).toString("hex");
const INCLUSIONARY =
  "us-policy-positions:housing-land-use.inclusionary-requirement";

describe("a set-aside unit is a notice", () => {
  it("tells the household's oldest adult, who holds a view of the law citing it", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const pinned = process.env.AFFORDABLE_NOTICE_DRAW?.split("|");
      const place = pinned
        ? drawPlace(pinned[0]!, pinned[1]!)
        : drawPlace(`${seed}:${attempt}`, "affordable-notice");
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
          series: INCLUSIONARY,
          value: 1,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: `notice-inclusionary-${level.level}`,
          citation: "Inclusionary requirement in force from the first day",
        });
      for (let day = 0; day < 365; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const placed = (
        api.moduleState("housing").table("affordable").rows() as unknown as {
          id: string;
          householdId: string;
          projectId: string;
          rentMinor: number;
        }[]
      ).filter((row) => core.households.has(row.householdId));
      if (!placed.length) continue;
      for (const row of placed) {
        const house = core.households.get(row.householdId)!;
        const held = house.memberIds
          .map((id) =>
            stancesOf(api, id).find((st) => st.topic === INCLUSIONARY),
          )
          .filter((st) => st !== undefined);
        expect(held.length, `${where}: ${row.id} nobody was told`).toBe(1);
        expect(held[0]!.desiredChange, where).toBe("enact");
        expect(
          held[0]!.causes.some((c) =>
            String(c.learnedFrom).includes(
              `housing.affordable-unit-notice:${row.projectId}:`,
            ),
          ),
          `${where}: ${row.id}`,
        ).toBe(true);
      }
      return;
    }
    throw new Error(
      `no drawn town placed a full household in a set-aside unit: ${tried.join("; ")}`,
    );
  }, 3_000_000);
});
