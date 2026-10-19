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
import chamberLoyalty from "./data/officials/state-chamber-loyalty.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";

// Party loyalty in state chambers (pool item laws-party-loyalty): in a state
// drawn from all 56, the catalog's policy questions go to the state's
// chambers as bills and every member votes. On the votes that split the two
// parties (each party's majority on opposite sides), the members of a party
// vote with their party's majority at about the target rate. The target is
// the base weight; each chamber's own multiple (state-chamber-loyalty.json,
// from the chamber's party polarization) is read at the vote.
const seed = process.env.PARTY_LOYALTY_SEED ?? randomBytes(8).toString("hex");
// The target is the federal party-unity figure (about 0.90, CQ Vote Studies),
// 0.85 to 0.98 around it. One small chamber's unity swings by several points
// from its mix of members, so the band is read on the pooled unity of
// PLACES drawn places, never widened to fit a seed.
const TARGET = { low: 0.85, high: 0.98 };
const PLACES = 4;

// One drawn place: how many party-splitting votes its chambers gave and the
// unity of the two parties on them.
function measure(place: ReturnType<typeof drawPlace>) {
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
  return { splits, unity, parties };
}

it("state-chamber members vote with their party on a party-splitting vote at about the target rate", () => {
  // A place whose chambers give fewer than five party-splitting votes (a
  // one-party legislature) says little about loyalty, so the draw goes on to
  // the next place; the test fails, naming every place tried, if too few split.
  const tried: string[] = [];
  const used: string[] = [];
  let splits = 0;
  let unity = 0;
  let parties = 0;
  for (let attempt = 0; attempt < 16 && used.length < PLACES; attempt += 1) {
    const place = drawPlace(
      attempt ? `${seed}:${attempt}` : seed,
      "party-loyalty",
    );
    const where = `seed ${seed}${attempt ? `:${attempt}` : ""}, ${place.name} (${place.key})`;
    const one = measure(place);
    tried.push(`${where}: ${one.splits} splitting votes`);
    if (one.splits < 5) continue;
    used.push(where);
    splits += one.splits;
    unity += one.unity;
    parties += one.parties;
  }
  if (used.length < PLACES)
    throw new Error(
      `only ${used.length} of ${PLACES} places had five party-splitting votes: ${tried.join("; ")}`,
    );
  const mean = unity / parties;
  const where = `${used.join("; ")}: ${splits} splitting votes`;
  expect(mean, where).toBeGreaterThanOrEqual(TARGET.low);
  expect(mean, where).toBeLessThanOrEqual(TARGET.high);
  // The parameter is in the table, tagged, and not a threshold.
  const row = (
    officials as unknown as {
      weights: Record<string, { value: number; tag: string; spread: number[] }>;
    }
  ).weights.statePartyLoyalty!;
  expect(row.tag).toBe("ESTIMATED");
  expect(row.value).toBeGreaterThanOrEqual(row.spread[0]!);
  expect(row.value).toBeLessThanOrEqual(row.spread[1]!);
}, 1_800_000);

it("every state chamber has a calibrated multiple inside the parameter's spread, centered near one", () => {
  const chambers = Object.values(chamberLoyalty.chambers).flatMap((row) =>
    Object.values(row),
  );
  expect(chamberLoyalty.tag).toBe("ESTIMATED");
  expect(chambers.length).toBeGreaterThan(90);
  for (const value of chambers) {
    expect(value).toBeGreaterThanOrEqual(chamberLoyalty.spread[0]!);
    expect(value).toBeLessThanOrEqual(chamberLoyalty.spread[1]!);
  }
  const mean = chambers.reduce((a, b) => a + b, 0) / chambers.length;
  expect(mean).toBeGreaterThan(0.85);
  expect(mean).toBeLessThan(1.1);
});
