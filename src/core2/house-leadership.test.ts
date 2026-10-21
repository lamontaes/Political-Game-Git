/**
 * The U.S. House is organized as the House, in the world the owner plays: the
 * bench world, a place and seed nobody chose, every module installed. A seat
 * in the home delegation is a seat in the whole chamber, so its leaders are
 * the chamber's speaker, floor leaders and whips, never a council president
 * of the one seat.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith, type PlayedWorld } from "./tooling/world-with";
import { FEDERAL_HOUSE } from "./modules/legislature";
import {
  LEADERSHIP_MODULE_ID,
  leaderOf,
  organize,
  presidingOfficer,
} from "./modules/leadership";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const seed =
  process.env.HOUSE_LEADERSHIP_SEED || randomBytes(8).toString("hex");
const hasDelegation = (w: PlayedWorld) =>
  townSeats(coreAPI(w.core)).some((s) => s.office.kind.startsWith("us-house"));
// A territory's delegate sits in no numbered House seat: draw until one does.
const { world, place } = worldWith(seed, "house-leadership", hasDelegation);
console.log(`house-leadership: ${place.name} (${place.key}), seed ${seed}`);
const api = coreAPI(world.core);

describe(`the House's leaders (${place.name}, seed ${seed})`, () => {
  it("are the chamber's speaker and floor leaders for a delegation seat too", () => {
    const delegation = townSeats(api).find((s) =>
      s.office.kind.startsWith("us-house"),
    )!;
    const body = delegation.office.id;
    const speaker = leaderOf(api, FEDERAL_HOUSE, "speaker");
    expect(speaker).not.toBeNull();
    expect(leaderOf(api, body, "speaker")).toBe(speaker);
    expect(presidingOfficer(api, body)).toBe(speaker);
    // No council president is written for the delegation's seat.
    expect(leaderOf(api, body, "council-president")).toBeNull();
    const posts = organize(api, body);
    expect(posts.every((p) => p.chamber === FEDERAL_HOUSE)).toBe(true);
    const keys = new Set(posts.map((p) => p.post));
    expect(keys.has("speaker")).toBe(true);
    expect(keys.has("council-president")).toBe(false);
    // The leadership module wrote nothing under the seat's own office id.
    const rows = api
      .moduleState(LEADERSHIP_MODULE_ID)
      .table("posts")
      .rows() as unknown as { chamber: string }[];
    expect(rows.some((r) => r.chamber === body)).toBe(false);
  });
});
