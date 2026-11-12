/**
 * A phase-in weighed once (pool item gov-phase-in-weighed-once): a member of
 * a town's lawmaking body weighs a minimum wage raised in two dated steps as
 * they weigh the same raise drafted as one section, because both end at the
 * same amount against the law in force. Before, each dated step counted the
 * member's views and their district's interest on the question again.
 *
 * The bench world, in a place drawn from all 56 on a seed nobody chose
 * (GOLDEN_PATH_SEED pins the draw, GOLDEN_PATH_PLACE_KEY the place). A draw
 * whose state gives its places no wage power is passed over: such a bill is
 * blocked before its vote. Then the body votes the two-step bill on its
 * members' own reasons, and each member's record names the question once.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawInForce } from "./modules/laws";
import {
  draftBill,
  holdVote,
  memberKey,
  memberPosition,
  members,
  provisionStance,
  type MemberPosition,
  type Provision,
} from "./modules/legislature";
import { votesOf } from "./modules/people";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const pinned = process.env.GOLDEN_PATH_PLACE_KEY;
const SERIES = "minimum-wage";
const BODIES = ["council", "township-board", "county-board"];
const DRAWS = 200;
const BUILDS = 6;
/** The starting law on whether a state lets its places set a wage floor. */
const localWage = (
  JSON.parse(
    readFileSync(
      "data/research/laws/starting-law-2026/labor-workforce.json",
      "utf8",
    ),
  ) as {
    questions: Record<string, { answers: Record<string, { answer: string }> }>;
  }
).questions["us-policy-positions:labor-workforce.local-minimum-wage-authority"]!
  .answers;

/** Every part of a position that a bill's questions move. */
const PARTS = [
  "views",
  "openingViews",
  "constituents",
  "lobby",
  "consistency",
  "trait",
  "total",
] as const satisfies readonly (keyof MemberPosition)[];

it(`a member weighs a raise in two dated steps once, as the same raise in one section (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    let builds = 0;
    for (let draw = 0; draw < DRAWS && builds < BUILDS; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "phase-in-position");
      const key = pinned ?? place.key;
      if (!pinned && localWage[place.state]?.answer !== "yes") continue;
      builds += 1;
      const where = `${pinned ? key : `${place.name} (${key})`}, seed ${seed} draw ${draw}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: key,
      });
      const api = coreAPI(core);
      const offices = api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      // A body of at least three, sponsored by a member who is a full person.
      const body = BODIES.flatMap((kind) =>
        offices.filter((o) => o.kind === kind),
      )
        .map((office) => ({ office, terms: members(api, office.id) }))
        .find(
          ({ terms }) =>
            terms.length >= 3 &&
            terms.some((t) => t.personId && core.people.has(t.personId)),
        );
      if (!body) {
        tried.push(`${where}: no body of three with a full-person member`);
        if (pinned) break;
        continue;
      }
      const sponsor = body.terms.find(
        (t) => t.personId && core.people.has(t.personId),
      )!.personId!;
      // The same raise, two dollars over the highest floor on record for
      // either date: once as one section on the later date, once as two
      // dated steps of a dollar each.
      const today = makeIsoDate(core.date);
      const dates = [addDays(today, 90), addDays(today, 150)] as const;
      const base = Math.max(
        ...[today, ...dates].map((d) => lawInForce(api, SERIES, d).value ?? 0),
      );
      const section = (value: number, effectiveDate: string): Provision => ({
        kind: "law-amount",
        series: SERIES,
        value,
        effectiveDate,
      });
      const one = draftBill(api, {
        bodyOfficeId: body.office.id,
        sponsorId: sponsor,
        provisions: [section(base + 200, dates[1])],
      });
      const two = draftBill(api, {
        bodyOfficeId: body.office.id,
        sponsorId: sponsor,
        provisions: [
          section(base + 100, dates[0]),
          section(base + 200, dates[1]),
        ],
      });
      if (two.status !== "drafted") {
        tried.push(`${where}: ${two.id} ${two.status}`);
        if (pinned) break;
        continue;
      }
      const stance = provisionStance(api, one.provisions[0]!);
      expect(stance, `${where}: ${one.id} changes no question`).not.toBeNull();
      // Every member, by id, weighs the two bills alike, part by part.
      const keys = body.terms.map(memberKey);
      let moved = 0;
      for (const member of keys) {
        const a = memberPosition(api, one.id, member);
        const b = memberPosition(api, two.id, member);
        for (const part of PARTS)
          expect(
            b[part] ?? 0,
            `${where}: ${member} ${part} on ${two.id} against ${one.id}`,
          ).toBeCloseTo(a[part] ?? 0, 9);
        if (Math.abs(a.views) + Math.abs(a.constituents) > 0) moved += 1;
      }
      // Not a vacuous match: the question moves at least one member.
      expect(
        moved,
        `${where}: no member's views or district read`,
      ).toBeGreaterThan(0);
      // The body votes the two-step bill; each member who voted holds one
      // record on the question, its side the vote's on the whole change.
      const voted = holdVote(api, two.id);
      let records = 0;
      for (const member of keys) {
        const vote = (
          api
            .moduleState("core2-legislature-v1")
            .table("votes")
            .get(`vote:${two.id}:${member}`) as unknown as
            { vote: string } | undefined
        )?.vote;
        if (vote !== "yes" && vote !== "no") continue;
        // A deal may add a member's own section on another question before
        // the vote (their own record for it); the raise's question is
        // recorded once.
        const rows = votesOf(api, member).filter(
          (v) => v.billId === two.id && v.stance.question === stance!.question,
        );
        expect(
          rows.length,
          `${where}: ${member} records on ${two.id}'s ${stance!.question}`,
        ).toBe(1);
        expect(rows[0]!.stance.position).toBe(
          vote === "yes" ? stance!.position : -stance!.position,
        );
        records += 1;
      }
      if (records === 0) {
        tried.push(
          `${where}: ${two.id} ${voted.status} with no recorded votes`,
        );
        if (pinned) break;
        continue;
      }
      console.log(
        `phase-in weighed once: ${where}; ${body.office.id}, ${keys.length} members weigh ${two.id} (two steps) as ${one.id} (one section); ${records} vote records on ${stance!.question}, bill ${voted.status}`,
      );
      return;
    }
    throw new Error(
      `No drawn place drafted and voted both bills: ${tried.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
