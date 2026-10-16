import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { memberKey, members } from "../core2/modules/legislature";
import { policyAuthority } from "../core2/policy-authority";
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { coreAPI } from "../core2/state";
import { seatAct } from "./legislature";
import { buildBenchWorld } from "./world";

// A bill the player drafts from their seat comes back worded from its record:
// title, a numbered section with the body's enacting words, and the date it
// takes effect (owner, Oct 14, 2026: bill text is real; a local measure has
// its own form). The bench world, a place drawn from all 56 on a seed nobody
// chose.
const seed = process.env.SEAT_BILL_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "seat-bill-text");

describe(`a drafted bill on paper (${place.name}, seed ${seed})`, () => {
  it("reads as an ordinance with its sections and effective date", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    const offices = api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const council = offices.find((o) =>
      ["council", "township-board"].includes(o.kind),
    )!;
    expect(council, `${place.name}: a town body`).toBeTruthy();
    const member = members(api, council.id)[0]!;
    const question = Object.keys(POLICY_QUESTIONS).find(
      (q) => policyAuthority(api, q, "city").allowed,
    )!;
    expect(question, "a question a town may act on").toBeTruthy();
    const bill = seatAct(world.core, memberKey(member), {
      kind: "draft",
      officeId: council.id,
      question,
      value: 1,
    });
    expect(bill.text.length, bill.id).toBeGreaterThanOrEqual(3);
    expect(bill.text[0]).toMatch(/^An ordinance to /);
    expect(bill.text[1]).toMatch(/^Section 1\. Be it ordained/);
    expect(bill.text.at(-1)).toMatch(/^This ordinance takes effect/);
    expect(bill.text.join(" ")).not.toMatch(/[{}]|undefined|NaN/);
  }, 600_000);
});
