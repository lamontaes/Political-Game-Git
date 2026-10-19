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
    // A place with a town body to sit on: a council, a township board, or the
    // county board where the place is unincorporated. A territory with no
    // municipal body on record has none, so the draw goes on to the next.
    let found:
      | {
          world: ReturnType<typeof buildBenchWorld>;
          api: ReturnType<typeof coreAPI>;
          council: { id: string; kind: string };
          where: string;
        }
      | undefined;
    for (let i = 0; i < 10 && !found; i += 1) {
      const where = i ? drawPlace(`${seed}:${i}`, "seat-bill-text") : place;
      const world = buildBenchWorld(where.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: where.key,
      });
      const api = coreAPI(world.core);
      const offices = api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      const council = ["council", "township-board", "county-board"]
        .map((kind) => offices.find((o) => o.kind === kind))
        .find((o) => o !== undefined);
      if (council) found = { world, api, council, where: where.name };
    }
    expect(found, "a place with a town body").toBeTruthy();
    const { world, api, council } = found!;
    const level = council.kind === "county-board" ? "county" : "city";
    const member = members(api, council.id)[0]!;
    const question = Object.keys(POLICY_QUESTIONS).find(
      (q) => policyAuthority(api, q, level).allowed,
    )!;
    expect(question, "a question this body may act on").toBeTruthy();
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
