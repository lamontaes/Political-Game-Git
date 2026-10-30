import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import powers from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import billPaperBank from "../../data/english/parts/bill-paper.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { memberKey, members, type BillRow } from "../core2/modules/legislature";
import { policyAuthority } from "../core2/policy-authority";
import { coreAPI } from "../core2/state";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// A town bill on a power the state has not settled carries the body's
// lawyer's warning on its paper (DECISION-REGISTER, "A law changes the record
// first", Sept 22: "When a city proposes a measure whose authority is
// disputed, the city attorney warns the player"). The warning counts only
// where the paper reads the bill's own authority row, by bill id; a settled
// power before the same body carries none. The bench world, a place drawn
// from all 56 on a seed nobody chose; the disputed power comes from the draft
// menu or the powers catalog, read against the place's law records.
const seed =
  process.env.BILL_PAPER_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const place = drawPlace(seed, "bill-paper-authority");
const LEGISLATURE = "core2-legislature-v1";

/** Each bank line with its slots open, so a paper line is known to be the bank's. */
const BANK_LINES = billPaperBank.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
    ),
);

describe(`a bill on a disputed power (${place.name}, seed ${seed})`, () => {
  it("carries the lawyer's warning on its authority row and its paper; a settled power carries none", () => {
    const tried: string[] = [];
    let found:
      | {
          world: ReturnType<typeof buildBenchWorld>;
          api: ReturnType<typeof coreAPI>;
          body: {
            id: string;
            kind: string;
            bodyName?: string;
            governmentName: string;
          };
          where: string;
          sponsor: string;
          disputed: string;
          settled: string;
          offered: ReadonlySet<string>;
        }
      | undefined;
    for (let i = 0; i < 8 && !found; i += 1) {
      const draw = i
        ? drawPlace(`${seed}:${i}`, "bill-paper-authority")
        : { name: place.name, key: place.key, seed };
      tried.push(`${draw.name} (${draw.key}, seed ${draw.seed})`);
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const offices = api
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as {
        id: string;
        kind: string;
        bodyName?: string;
        governmentName: string;
      }[];
      const body = ["council", "township-board", "county-board"]
        .map((kind) => offices.find((o) => o.kind === kind))
        .find((o) => o !== undefined);
      if (!body) continue;
      const [first] = members(api, body.id);
      if (!first) continue;
      const level = body.kind === "county-board" ? "county" : "city";
      // The powers the draft menu offers this body first, then every power
      // the catalog maps to a question, each read against the place's law.
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
      if (!pick || !settled) continue;
      found = {
        world,
        api,
        body,
        where: `${draw.name} (${draw.key}, seed ${draw.seed})`,
        sponsor: memberKey(first),
        disputed: pick.question,
        settled: settled.question,
        offered,
      };
    }
    expect(
      found,
      `a local body with a disputed and a settled power in: ${tried.join("; ")}`,
    ).toBeTruthy();
    const { world, api, body, where, sponsor, disputed, settled, offered } =
      found!;
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
    // The warning is the English engine's line, naming the body as the
    // bill's enacting clause does.
    const warning = paper.authorityWarning ?? "";
    expect(
      BANK_LINES.some((line) => line.test(warning)),
      `${drafted.id} warning "${warning}" is a bill-paper bank line`,
    ).toBe(true);
    expect(warning, drafted.id).toContain(body.bodyName ?? body.governmentName);

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
      `bill-paper authority: ${where}; body ${body.id}; disputed ${disputed} (${offered.has(disputed) ? "draft menu" : "powers catalog"}) -> ${drafted.id} (${row.status}, ${row.authority[0]?.reason}): "${warning}"; settled ${settled} (${offered.has(settled) ? "draft menu" : "powers catalog"}) -> ${plain.id} (${plainRow.status})`,
    );
  }, 900_000);
});
