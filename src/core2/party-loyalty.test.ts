import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { setBookkeeping } from "./bookkeeping";
import { coreAPI } from "./state";
import {
  draftBill,
  holdVote,
  memberKey,
  members,
  votesOn,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import officials from "./data/officials/officials.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";

// Party loyalty in state chambers (pool item laws-party-loyalty): in a state
// drawn from all 56, the catalog's policy questions go to the state's
// chambers as bills and every member votes. On the votes that split the two
// parties (each party's majority on opposite sides), the members of a party
// vote with their party's majority at about the target rate. The target is
// the parameter's stated stand-in until the owner's own calibration input is
// run; nothing from that input is read or shipped here.
const seed = process.env.PARTY_LOYALTY_SEED ?? randomBytes(8).toString("hex");
const TARGET = { low: 0.85, high: 0.98 };

it("state-chamber members vote with their party on a party-splitting vote at about the target rate", (context) => {
  const place = drawPlace(seed, "party-loyalty");
  const where = `seed ${seed}, ${place.name} (${place.key})`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const chambers = (
    api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
      id: string;
      kind: string;
      jurisdiction: string;
      coversTown: boolean;
    }[]
  ).filter(
    (office) =>
      /^legislature-(lower|upper|unicameral)$/.test(office.kind) &&
      office.coversTown,
  );
  const questions = (
    catalog as unknown as {
      subjects: {
        topics: { policies?: { kind: string; question?: string }[] }[];
      }[];
    }
  ).subjects
    .flatMap((subject) => subject.topics.flatMap((t) => t.policies ?? []))
    .filter((row) => row.kind === "policy-question" && row.question)
    .map((row) => row.question!);
  const sponsor = [...core.people.keys()][0]!;
  let splits = 0;
  let unity = 0;
  let parties = 0;
  for (const chamber of chambers) {
    const seated = members(api, chamber.id);
    for (const question of questions) {
      const bill = draftBill(api, {
        bodyOfficeId: chamber.id,
        sponsorId: sponsor,
        provisions: [{ kind: "policy-question", question, value: 1 }],
      });
      holdVote(api, bill.id);
      const side = new Map<string, { yes: number; no: number }>();
      for (const vote of votesOn(api, bill.id)) {
        const party =
          seated.find((term) => memberKey(term) === vote.memberId)?.party ?? "";
        if (!party || (vote.vote !== "yes" && vote.vote !== "no")) continue;
        const row = side.get(party) ?? { yes: 0, no: 0 };
        row[vote.vote] += 1;
        side.set(party, row);
      }
      // The two largest parties, each with enough members to have a majority.
      const two = [...side.entries()]
        .filter(([, s]) => s.yes + s.no > 3)
        .sort(
          (a, b) =>
            b[1].yes + b[1].no - (a[1].yes + a[1].no) ||
            a[0].localeCompare(b[0]),
        )
        .slice(0, 2);
      if (two.length < 2) continue;
      const majority = two.map(([, s]) => (s.yes >= s.no ? "yes" : "no"));
      if (majority[0] === majority[1]) continue;
      splits += 1;
      two.forEach(([, s], at) => {
        unity += s[majority[at] as "yes" | "no"] / (s.yes + s.no);
        parties += 1;
      });
    }
  }
  if (splits < 5) {
    context.skip(`${where}: only ${splits} party-splitting votes.`);
    return;
  }
  const mean = unity / parties;
  expect(mean, `${where}: ${splits} splitting votes`).toBeGreaterThanOrEqual(
    TARGET.low,
  );
  expect(mean, `${where}: ${splits} splitting votes`).toBeLessThanOrEqual(
    TARGET.high,
  );
  // The parameter is in the table, tagged, and not a threshold.
  const row = (
    officials as unknown as {
      weights: Record<string, { value: number; tag: string; spread: number[] }>;
    }
  ).weights.statePartyLoyalty!;
  expect(row.tag).toBe("ESTIMATED");
  expect(row.value).toBeGreaterThanOrEqual(row.spread[0]!);
  expect(row.value).toBeLessThanOrEqual(row.spread[1]!);
}, 600_000);
