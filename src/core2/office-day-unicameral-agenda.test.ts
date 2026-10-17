/**
 * A member of a nonpartisan unicameral legislature (it has a speaker and no
 * majority leader) can ask the speaker to put their bill on the floor, and the
 * request keeps the speaker's reasons. Random places from all 56 until one
 * seats a resident member of such a chamber.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { askLeaderForHearing } from "./office-day-state";
import { leaderOf, presidingOfficer } from "./modules/leadership";
import { townSeats } from "./modules/offices";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the speaker sets the agenda of a chamber with no majority leader", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 40; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "unicameral-agenda");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    tried.push(`${place.name} (${place.key})`);
    const seat = townSeats(api).find(
      (s) =>
        s.office.kind === "legislature-unicameral" &&
        s.holder?.personId &&
        world.core.people.has(s.holder.personId),
    );
    if (!seat) continue;
    const member = seat.holder!.personId!;
    const body = seatView(world.core, member).bodies.find(
      (row) => row.officeId === seat.office.id,
    );
    const question = seatView(world.core, member).questions[0];
    if (!body || !question) continue;
    const bill = seatAct(world.core, member, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
    if (bill.status !== "drafted") continue;
    const where = `${place.name}, seed ${seed}:${draw}, member ${member}`;
    expect(leaderOf(api, seat.office.id, "majority-leader"), where).toBeNull();
    const request = askLeaderForHearing(api, member, bill.id);
    expect(request.leaderId, where).toBe(presidingOfficer(api, seat.office.id));
    expect(Object.keys(request.reasons).length, where).toBeGreaterThan(0);
    return;
  }
  throw new Error(`No resident unicameral member found: ${tried.join("; ")}`);
}, 3_600_000);
