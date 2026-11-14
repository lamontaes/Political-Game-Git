// @vitest-environment node
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { officeActsOf } from "../core2/modules/office-day";
import { coreAPI } from "../core2/state";
import { leaveHoldsToCharacter } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// A sitting mayor the player does not steer spends free days on the office,
// not only on rest (pool item gov-mayor-never-gives-yearly-address-or-town-hall).
// Pinned to two small towns that failed before the fix: rest won 133 of 141
// free days at both, and the acts table held no town hall, interview or
// department-head meeting.
const PINNED = [
  { at: "mayor-acts-1:1", name: "Edmore, North Dakota" },
  { at: "mayor-acts-1:2", name: "Matawan, New Jersey" },
];

describe.each(PINNED)("a mayor's free days ($name)", ({ at, name }) => {
  it("takes up the office's work on the schedule its intervals set", () => {
    setBookkeeping(false);
    const place = drawPlace(at, "mayor-acts");
    expect(place.name).toContain(name.split(",")[0]);
    const w = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(w.core);
    const seat = townSeats(api).find(
      (r) =>
        r.office.kind === "mayor" &&
        r.holder?.personId &&
        w.core.people.has(r.holder.personId),
    )!;
    const mayor = seat.holder!.personId!;
    const player = new BenchPlayer(w.core, w.director);
    player.select(mayor);
    let result: ReturnType<typeof player.advance> = player.advance("week");
    for (let g = 0, weeks = 1; weeks < 20 && g < 5000; g++) {
      if (player.pollingPlace) player.leavePolls();
      if (result.packet.kind === "complete") {
        result = player.advance("week");
        weeks++;
        continue;
      }
      leaveHoldsToCharacter(w.core, result.packet.controlledPersonId);
      result = {
        ...result,
        ...player.resume({
          kind: "stop",
          pauseId: result.packet.pauseId,
        }),
      };
    }
    const kinds = new Map<string, number>();
    for (const row of officeActsOf(api, mayor))
      kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + 1);
    const total = [...kinds.values()].reduce((a, b) => a + b, 0);
    const note = `${place.name}: ${JSON.stringify([...kinds])}`;
    expect(kinds.get("office-hours") ?? 0, note).toBeGreaterThan(0);
    expect(kinds.get("meet-department-head") ?? 0, note).toBeGreaterThan(0);
    expect(kinds.size, note).toBeGreaterThanOrEqual(4);
    // No one act is the whole office: the cadence follows the intervals.
    for (const [kind, n] of kinds)
      expect(n / total, `${kind}: ${note}`).toBeLessThan(0.7);
  }, 300000);
});
