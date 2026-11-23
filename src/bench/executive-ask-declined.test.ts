/**
 * An executive's bill that a member turns down: the no is kept with its true cause and date as
 * the ask's own record, the plate gives the reason a member would say aloud, and the same member
 * can be asked again later, the earlier no read back. Each drawn place supplies its own
 * governor, chamber and member whose party weighs most against carrying the bill.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { campaignParameter } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import {
  declinedAsks,
  declineReason,
  LEGISLATURE_MODULE_ID,
  likelyCarriers,
  publicDeclineReason,
  type CarryRequest,
  type Provision,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { buildBenchWorld } from "./world";
import { seatAsk, seatView } from "./legislature";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const attempts = 8;

/** The raw reasons establish a party refusal before the public reason is read. */
function partyWeighedMost(position: CarryRequest["position"]): boolean {
  const party = position.party ?? 0;
  return (
    party <
    Math.min(
      0,
      position.views,
      position.constituents,
      position.sponsor,
      position.deal,
      position.lobby,
      position.wing ?? 0,
      position.ambition ?? 0,
      position.press ?? 0,
      position.trait,
      position.consistency,
      position.bribe,
      position.reply ?? 0,
    )
  );
}

it(`a declined ask is kept with its cause and date, the plate says the public reason, and the same member can be asked again (seed ${seed}) (just like today: needs the state's real laws)`, () => {
  const bookkeeping = setBookkeeping(false);
  try {
    const passed: string[] = [];
    for (let draw = 0; draw < attempts; draw += 1) {
      // Keep the draw purpose so the old Ridgeville run can still be replayed.
      const place = drawPlace(draw === 0 ? seed : `${seed}:${draw}`, "p6");
      const where = `${place.name} (${place.key}), replay ${seed}, draw ${draw}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        settings: { history: "today" },
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const governor = townSeats(api).find(
        (row) => row.office.kind === "governor",
      )?.holder?.personId;
      if (!governor) {
        passed.push(`${where} on ${core.date}: no serving governor`);
        continue;
      }
      // An Advanced start steps into the office without changing the world's player id.
      const body = seatView(core, governor).bodies.find(
        (row) => "byRequest" in row && row.byRequest,
      );
      if (!body) {
        passed.push(
          `${where} on ${core.date}: no body that hears the governor's bills`,
        );
        continue;
      }
      const section = {
        kind: "policy-question",
        question:
          "us-policy-positions:housing-land-use.inclusionary-requirement",
        value: 1,
      } satisfies Provision;
      const standing = campaignParameter("carryStandingWeight");
      const candidates = likelyCarriers(api, body.officeId, [section]).filter(
        ({ total }) => total + standing <= 0,
      );
      const asks = api.moduleState(LEGISLATURE_MODULE_ID).table("carryAsks");
      for (const candidate of candidates) {
        const ask = {
          officeId: body.officeId,
          question: section.question,
          value: section.value,
          memberId: candidate.key,
        };
        const first = seatAsk(core, governor, ask).asked;
        const recorded = asks.get(first.askId) as unknown as
          CarryRequest | undefined;
        expect(
          recorded,
          `${where}: the ask is on the member's record`,
        ).toBeDefined();
        if (!partyWeighedMost(recorded!.position)) continue;

        expect(first.carried, `${where}: the ask is turned down`).toBe(false);
        expect(first.reason, `${where}: the plate's reason`).toBe("party");
        expect(
          "pronouns" in first,
          `${where}: the member is spoken of from their record`,
        ).toBe(true);
        expect(
          "earlier" in first,
          `${where}: nothing earlier to read back`,
        ).toBe(false);
        const kept = declinedAsks(api, governor, first.memberId, body.officeId);
        expect(kept, `${where}: the no is kept`).toHaveLength(1);
        expect(
          declineReason(kept[0]!),
          `${where}: the cause on the record`,
        ).toBe("party");
        expect(kept[0]!.date, where).toBe(String(core.date));

        // A month later the same member is asked again, with the first no read back.
        const date = new Date(`${String(core.date)}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + 30);
        api.state.date = date.toISOString().slice(0, 10) as never;
        const again = seatAsk(core, governor, ask).asked;
        expect(again.memberId, `${where}: the same member`).toBe(
          first.memberId,
        );
        expect(again.earlier, `${where}: the earlier no with its date`).toEqual(
          [String(kept[0]!.date)],
        );
        expect(
          declinedAsks(api, governor, first.memberId, body.officeId),
          `${where}: both noes kept`,
        ).toHaveLength(2);
        process.stdout.write(
          `EXECUTIVE REFUSAL ${where}: ${first.askId} on ${kept[0]!.date}, ${again.askId} on ${core.date}; party in the record and on the plate. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      passed.push(
        `${where} on ${core.date}: party was never the strongest reason to refuse among ${candidates.length} members expected to decline`,
      );
    }
    expect.fail(`No drawn place had a party refusal: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(bookkeeping);
  }
}, 180_000);

it("a cause a member would not say aloud is given as a public reason and stays on the record (just like today: needs the state's real laws)", () => {
  const position = (over: Record<string, number>) =>
    ({
      views: 0,
      constituents: 0,
      sponsor: 0,
      deal: 0,
      lobby: 0,
      trait: 0,
      consistency: 0,
      bribe: 0,
      ...over,
    }) as unknown as CarryRequest["position"];
  const row = (over: Record<string, number>, standing = 0) => ({
    position: position(over),
    standing,
  });
  // The cause is what pulled hardest; the plate says what a member says.
  expect(declineReason(row({ deal: -3, views: -1 }))).toBe("deal");
  expect(publicDeclineReason(row({ deal: -3, views: -1 }))).toBe("views");
  expect(declineReason(row({ lobby: -3, constituents: -2 }))).toBe("lobby");
  expect(publicDeclineReason(row({ lobby: -3, constituents: -2 }))).toBe(
    "constituents",
  );
  // Nothing public pulled against it: how well the member knows the asker.
  expect(publicDeclineReason(row({ bribe: -4 }))).toBe("standing");
  expect(publicDeclineReason(row({}))).toBe("standing");
  // Causes a member does say stay as they are; sponsor and standing read as one.
  expect(publicDeclineReason(row({ trait: -1 }))).toBe("trait");
  expect(publicDeclineReason(row({ sponsor: -1 }))).toBe("standing");
});
