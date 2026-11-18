/**
 * A room's resident can meet a partner, and the partner lives outside the
 * room (owner, Nov 14 night: no new stopgaps, so no resident is shut out of
 * partnering). Pinned: Storrs, Connecticut (0973980), the dorm town, one
 * played world. A full resident of a room has the pull to partner staged
 * through the module's own table at its full value, and the next monthly
 * review makes the partner: a household of their own, never a third person in
 * the room, the couple dating until the resident leaves the room.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { inGroupQuarters } from "./modules/moves";
import { movingOrder, PARTNERSHIPS_MODULE_ID } from "./modules/partnerships";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const SEED = "storrs-room-partner";

describe("a room resident's partner", { timeout: 600_000 }, () => {
  it("lives outside the room, in a home of their own, with the couple dating", () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: "0973980",
    });
    const api = coreAPI(core);
    const today = makeIsoDate(core.date);
    const resident = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.id !== core.playerId &&
          inGroupQuarters(core, row) &&
          ageOnDate(makeIsoDate(row.birthDate), today) >= 18 &&
          (row.looks?.gender === "female" || row.looks?.gender === "male") &&
          ![...core.familyLinks.values()].some(
            (link) =>
              link.kind === "partner" && link.personIds.includes(row.id),
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(resident, "a full resident of a room at Storrs").toBeDefined();
    // Nobody they know is a fit, so the partner comes from the wider population.
    resident!.knownIds.clear();
    const room = resident!.householdId;
    const before = core.households.get(room)!.memberIds.length;
    api
      .moduleState(PARTNERSHIPS_MODULE_ID)
      .table("pulls")
      .put({ id: resident!.id, toward: "partner", value: 1 } as never);
    advanceCore(core, addDays(core.date, 62));
    const link = [...core.familyLinks.values()].find(
      (row) => row.kind === "partner" && row.personIds.includes(resident!.id),
    );
    expect(link, "the resident met a partner").toBeDefined();
    const partnerId = link!.personIds.find(
      (id) => id !== resident!.id,
    ) as PersonId;
    const partner = core.people.get(partnerId)!;
    expect(partner.householdId).not.toBe(room);
    expect(core.households.get(partner.householdId)?.quarters).toBeUndefined();
    expect(core.households.get(room)!.memberIds).not.toContain(partnerId);
    expect(core.households.get(room)!.memberIds.length).toBeLessThanOrEqual(
      before,
    );
    expect(partner.placeId).toBe(resident!.placeId);
    // While the resident lives in a room nobody is asked to move in and
    // nobody moves, whoever's yes it would be, so a yes is never given and
    // then undone.
    expect(movingOrder(api, resident!, partner)).toBeUndefined();
    expect(movingOrder(api, partner, resident!, resident!.id)).toBeUndefined();
    expect(movingOrder(api, resident!, partner, partner.id)).toBeUndefined();
  });
});
