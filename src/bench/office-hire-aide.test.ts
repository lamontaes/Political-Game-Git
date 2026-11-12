/**
 * The player's office screen lists the people the staff engine would weigh for
 * their staff, with its reasons, and Hire runs the engine's own `hireStaff`
 * (pool item play-officeholder-hires-aide). A place drawn from all 56;
 * GOLDEN_PATH_SEED pins one.
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "./world";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { servingStaffOf, staffOf } from "../core2/modules/staff";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { hireAide, officeView } from "./office";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`the office screen lists the staff engine's candidates for the player with reasons, and Hire seats one as an aide (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-hire-aide");
    const where = `${place.name} (${place.key}), run seed ${seed}:${attempt}, place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // A resident town officeholder with someone the staff engine would weigh is the player: the staff review skips the player, so none has an aide yet.
    let holder: string | undefined;
    for (const seat of townSeats(api)) {
      const id = seat.holder?.personId;
      if (!id || !core.people.get(id)?.alive) continue;
      core.playerId = id as PersonId;
      if (officeView(core, id).aides.candidates.length) {
        holder = id;
        break;
      }
    }
    if (!holder) {
      tried.push(`${where}: no officeholder has a candidate`);
      continue;
    }
    const before = officeView(core, holder).aides;
    expect(before.serving, `${where}: the player already has aides`).toEqual(
      [],
    );
    // Each candidate comes with the reasons the engine gives.
    for (const c of before.candidates) {
      expect(c.name, where).toBeTruthy();
      expect(Object.keys(c.reasons), `${where}: ${c.id}`).toEqual(
        expect.arrayContaining(["work", "reach", "workingAge"]),
      );
    }
    const chosen = before.candidates[0]!;
    const hired = hireAide(core, holder, chosen.id);
    // The staff table now shows that aide serving the player, by its record id.
    const row = staffOf(api, holder).find((r) => r.personId === chosen.id);
    expect(row, `${where}: no staff row for ${chosen.id}`).toBeTruthy();
    expect(hired.staffId, where).toBe(row!.id);
    expect(row!.role, where).toBe("aide");
    expect(
      servingStaffOf(api, holder).map((r) => r.personId),
      where,
    ).toContain(chosen.id);
    // The office screen reads it back, and the hired person is no longer a candidate.
    expect(
      hired.view.aides.serving.map((a) => a.id),
      where,
    ).toContain(chosen.id);
    expect(
      hired.view.aides.candidates.map((c) => c.id),
      where,
    ).not.toContain(chosen.id);
    // Someone the office does not list cannot be hired.
    expect(() => hireAide(core, holder, "person_not_listed"), where).toThrow(
      /Not someone this office could hire/,
    );
    return;
  }
  throw new Error(`no place offered a hire: ${tried.join("; ")}`);
}, 600_000);
