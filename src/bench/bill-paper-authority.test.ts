import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import executivePowers from "../../data/research/executive/executive-powers-2026.json" with { type: "json" };
import powers from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { screenLine } from "../english/screen-words";
import { gameStartDate } from "../core2/game-start";
import { appointmentsIn, townForm } from "../core2/modules/executive";
import { lawChain } from "../core2/modules/laws";
import {
  bodyRow,
  memberKey,
  members,
  type BillRow,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { policyAuthority } from "../core2/policy-authority";
import { coreAPI } from "../core2/state";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// A town bill on a power the state has not settled carries the body's
// lawyer's warning on its paper (DECISION-REGISTER, "A law changes the record
// first", Sept 22: "When a city proposes a measure whose authority is
// disputed, the city attorney warns the player"). The warning counts only
// where the paper reads the bill's own authority row, by bill id; a settled
// power before the same body carries none. The done-when drafts a council
// bill, so the test takes the first of up to eight draws whose body is the
// town's own council (its body row makes the place's law); a county or
// township board's draw is kept only when no draw has a council. Before the
// council the lawyer is the town's City Attorney: the test reads the town's
// form of government in the research, and where the form has an attorney
// post, the executive engine must have seated someone in it and the line
// names that post's title. Before any other body, or where the form has no
// attorney post, the line is the body's lawyer by the body's name, and
// SG-GOV-body-lawyer-unrecorded is marked. The bench world, a place drawn
// from all 56 on a seed nobody chose; the disputed power comes from the draft
// menu or the powers catalog, read against the place's law records.
const seed =
  process.env.BILL_PAPER_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const place = drawPlace(seed, "bill-paper-authority");
const LEGISLATURE = "core2-legislature-v1";
const STOPGAP = "SG-GOV-body-lawyer-unrecorded";
const CITY_FORMS = executivePowers.local.city as Record<
  string,
  readonly { key: string; title: string }[]
>;

type Draw = { name: string; key: string; seed: string };
type Body = {
  id: string;
  kind: string;
  bodyName?: string;
  governmentName: string;
};

/** The draws in order: the printed seed's place, then seven more from it. */
function drawAt(i: number): Draw {
  return i
    ? drawPlace(`${seed}:${i}`, "bill-paper-authority")
    : { name: place.name, key: place.key, seed };
}

/**
 * One draw's world and its two candidate bodies: the town's own council
 * (a town seat whose body row makes the place's law) and, failing that, the
 * first county or township board; each with its first member, a disputed
 * power and a settled one, or the reason it has none.
 */
function readDraw(draw: Draw) {
  const world = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(world.core);
  const offices = api
    .moduleState("core2-offices-v1")
    .table("offices")
    .rows() as unknown as Body[];
  const councilIds = new Set(
    townSeats(api)
      .filter((s) => bodyRow(s.office.kind)?.law === "place")
      .map((s) => s.office.id),
  );
  const council = offices.find((o) => councilIds.has(o.id));
  const board = ["township-board", "county-board"]
    .map((kind) => offices.find((o) => o.kind === kind))
    .find((o) => o !== undefined);
  const powersBefore = (body: Body | undefined) => {
    if (!body) return { why: "no such body" } as const;
    const [first] = members(api, body.id);
    if (!first) return { why: `${body.id} has no member` } as const;
    // The body's level as the drafting engine reads it: its body row's.
    const level = bodyRow(body.kind)?.level;
    if (!level) return { why: `${body.kind} has no body row` } as const;
    // The powers the draft menu offers this body first, then every power the
    // catalog maps to a question, each read against the place's law.
    const menu = seatView(world.core, memberKey(first))
      .bodies.filter((b) => b.officeId === body.id)
      .flatMap((b) => b.menus)
      .flatMap((m) => m.items);
    const offered = new Set(
      menu.flatMap((item) => (item.question ? [item.question] : [])),
    );
    const questions = [
      ...new Set([...offered, ...Object.keys(powers.questions)]),
    ];
    const read = questions.map((question) => ({
      question,
      authority: policyAuthority(api, question, level),
    }));
    const disputed = read.filter((r) => r.authority.warning === "disputed");
    // A disputed power the body may still pass (a lawful challenge may
    // proceed) before one it is blocked on.
    const pick = disputed.find((r) => r.authority.allowed) ?? disputed[0];
    const settled = read.find(
      (r) => r.authority.warning === "none" && r.authority.allowed,
    );
    if (!pick) return { why: `${body.id} has no disputed power` } as const;
    if (!settled) return { why: `${body.id} has no settled power` } as const;
    return {
      body,
      sponsor: memberKey(first),
      disputed: pick.question,
      settled: settled.question,
      offered,
    } as const;
  };
  return {
    world,
    api,
    where: `${draw.name} (${draw.key}, seed ${draw.seed})`,
    council: powersBefore(council),
    board: powersBefore(board),
    hasCouncil: council !== undefined,
  };
}

describe(`a bill on a disputed power (${place.name}, seed ${seed})`, () => {
  it("carries the lawyer's warning on its authority row and its paper; a settled power carries none", () => {
    const tried: string[] = [];
    const councilWithout: string[] = [];
    let fallback: Draw | undefined;
    let drawn: ReturnType<typeof readDraw> | undefined;
    let isCouncil = false;
    for (let i = 0; i < 8; i += 1) {
      const draw = drawAt(i);
      const read = readDraw(draw);
      const note = `council: ${"why" in read.council ? read.council.why : "yes"}; board: ${"why" in read.board ? read.board.why : "yes"}`;
      tried.push(`${read.where} [${note}]`);
      if (!("why" in read.council)) {
        drawn = read;
        isCouncil = true;
        break;
      }
      if (read.hasCouncil) councilWithout.push(`${read.where} [${note}]`);
      if (!fallback && !("why" in read.board)) fallback = draw;
    }
    // The council case runs whenever any draw has a council; a council with
    // no disputed and settled pair is a failure, not a reason to fall back.
    expect(
      isCouncil || councilWithout.length === 0,
      `a town council in a draw, but no council case ran: ${councilWithout.join("; ")}`,
    ).toBe(true);
    if (!drawn && fallback) drawn = readDraw(fallback);
    const candidate = drawn
      ? isCouncil
        ? drawn.council
        : drawn.board
      : undefined;
    expect(
      candidate && !("why" in candidate),
      `a local body with a disputed and a settled power in: ${tried.join("; ")}`,
    ).toBe(true);
    const { world, api, where } = drawn!;
    const { body, sponsor, disputed, settled, offered } = candidate as Exclude<
      typeof candidate,
      undefined | { why: string }
    >;
    const bills = api.moduleState(LEGISLATURE).table("bills");

    // The bill on the disputed power, drafted from the member's seat.
    const drafted = seatAct(world.core, sponsor, {
      kind: "draft",
      officeId: body.id,
      question: disputed,
      value: 1,
    }) as { id: string };
    const row = bills.get(drafted.id) as unknown as BillRow;
    expect(row.authority[0]?.warning, `${drafted.id} ${disputed}`).toBe(
      "disputed",
    );
    const paper = billPaper(world.core, drafted.id);
    expect(paper.id).toBe(drafted.id);
    expect(paper.sections[0]?.authority?.warning, drafted.id).toBe("disputed");
    expect(paper.sections[0]?.authority?.reason, drafted.id).toBe(
      row.authority[0]?.reason,
    );

    // Who should be warning, read apart from the bill paper: before the
    // town's council, the attorney post the town's form of government has in
    // the research, which the executive engine must have seated at the
    // opening (an appointment in that post with a living holder).
    const name = body.bodyName ?? body.governmentName;
    const town = lawChain(api).townPlaceId;
    const form = isCouncil ? townForm(api) : null;
    const post = form
      ? (CITY_FORMS[form] ?? []).find((spec) => /-attorney$/.test(spec.key))
      : undefined;
    const seated = post
      ? appointmentsIn(api, town).find(
          (a) =>
            a.post === post.key &&
            a.holderId !== "" &&
            world.core.people.has(a.holderId),
        )
      : undefined;
    if (post)
      expect(
        seated,
        `${where}: town ${town}'s form "${form}" lists ${post.key} ("${post.title}") but no appointment holds it`,
      ).toBeDefined();
    if (seated) expect(seated.title, seated.id).toBe(post!.title);
    const expected = post
      ? screenLine("bill-paper", "bill-paper.authority.disputed", {
          lawyer: post.title.toLowerCase(),
          body: name,
        })
      : screenLine("bill-paper", "bill-paper.authority.disputed-body", {
          body: name,
        });
    const warning = paper.authorityWarning;
    expect(warning, `${drafted.id} ${seated?.id ?? "no attorney"}`).toBe(
      expected,
    );
    expect(world.core.stopgapHits.has(STOPGAP), drafted.id).toBe(!post);

    // A settled power before the same body: no warning on the row or paper.
    const plain = seatAct(world.core, sponsor, {
      kind: "draft",
      officeId: body.id,
      question: settled,
      value: 1,
    }) as { id: string };
    const plainRow = bills.get(plain.id) as unknown as BillRow;
    expect(plainRow.bodyOfficeId).toBe(row.bodyOfficeId);
    expect(plainRow.authority[0]?.warning, `${plain.id} ${settled}`).toBe(
      "none",
    );
    const plainPaper = billPaper(world.core, plain.id);
    expect(plainPaper.sections[0]?.authority?.warning, plain.id).toBe("none");
    expect(plainPaper.authorityWarning, plain.id).toBeNull();

    console.log(
      `bill-paper authority: case ${isCouncil ? "council (the town's City Attorney)" : `fallback ${body.kind} (no draw had a council)`}; ${where}; draws ${tried.join("; ")}; body ${body.id}; town ${town} form ${form ?? "n/a"}; lawyer ${seated ? `${seated.id} "${seated.title}" held by ${seated.holderId}` : `none (${STOPGAP})`}; disputed ${disputed} (${offered.has(disputed) ? "draft menu" : "powers catalog"}) -> ${drafted.id} (${row.status}, ${row.authority[0]?.reason}): "${warning}"; settled ${settled} (${offered.has(settled) ? "draft menu" : "powers catalog"}) -> ${plain.id} (${plainRow.status})`,
    );
  }, 900_000);
});
