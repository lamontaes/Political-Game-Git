/**
 * A bill that changes a law's amount amends the row in force and keeps its
 * terms: the SNAP maximum's table by household size, a tax's wage base, a
 * program's eligibility and indexing. Before the fix, a law-amount section
 * kept the amended row's terms only for one series, and only from a row its
 * own government filed: a Congress bill raising SNAP wrote a federal row with
 * no table, the benefit engine found none, and every household's benefit
 * stopped; a Social Security tax raise dropped the wage base, so every dollar
 * of pay was taxed. Bills go through dev mode's own vote route (the House, the
 * President's signature, the state's lower house), pinned to West Union, Ohio,
 * on a seed named for it.
 */
import { afterAll, describe, expect, it } from "vitest";
import { BenchPlayer } from "../bench/player";
import { DevMode } from "../bench/dev-mode";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import type { LawRowInput } from "./laws-starting";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { draftBill, type Provision } from "./modules/legislature";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";
import powers from "./data/legislature/series-powers.json";

const WEST_UNION = {
  name: "West Union, Ohio",
  key: "3984294",
  seed: "ilt-west-union",
};
const where = `${WEST_UNION.name} (${WEST_UNION.key}, seed ${WEST_UNION.seed})`;
/** What a law row records of the bill that wrote it, which an amendment writes anew. */
const RECORD = new Set([
  "enactedBy",
  "enactedByBill",
  "enactedSequence",
  "margin",
  "decidedBy",
  "decision",
  "repealedBy",
  "repealedByBill",
]);
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

function world() {
  const built = buildBenchWorld(WEST_UNION.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: WEST_UNION.key,
  });
  const api = coreAPI(built.core);
  const dev = new DevMode(
    built.core,
    built.director,
    new BenchPlayer(built.core, built.director),
    built.placeId,
  );
  return { core: built.core, api, dev };
}

/** The row in force at a level on the town's chain. */
function rowAt(api: CoreAPI, series: string, level: string) {
  return lawInForce(api, series).levels.find((l) => l.level === level)?.row;
}

/** The rows a bill wrote, by series. */
function rowsOf(api: CoreAPI, billId: string) {
  const rows = api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .rows() as unknown as LawRowInput[];
  return new Map(
    rows
      .filter((r) => r.terms?.enactedByBill === billId)
      .map((r) => [r.series, r] as const),
  );
}

/** A tenth more than today's amount, or one where it is zero. */
function raised(row: LawRowInput | undefined): Provision | null {
  if (!row || typeof row.value !== "number") return null;
  return {
    kind: "law-amount",
    series: row.series,
    value: row.value > 0 ? Math.round(row.value * 1.1 * 1000) / 1000 : 1,
    ...(row.unit ? { unit: row.unit } : {}),
  } as Provision;
}

/** Passes a bill at a body through dev mode's vote route, on the sections the body may enact. */
function pass(
  w: ReturnType<typeof world>,
  bodyId: string,
  provisions: Provision[],
) {
  const body = w.dev.lawmakingBodies().find((b) => b.id === bodyId)!;
  expect(body, `${bodyId} in ${where}`).toBeDefined();
  const draft = (sections: Provision[]) =>
    draftBill(w.api, {
      bodyOfficeId: body.id,
      sponsorId: body.members[0]!.key,
      provisions: sections,
    });
  const first = draft(provisions);
  const allowed = provisions.filter((_, i) => first.authority[i]?.allowed);
  const bill = first.status === "drafted" ? first : draft(allowed);
  expect(bill.status, `${bodyId} bill in ${where}`).toBe("drafted");
  w.dev.decideAt(bill.id, Math.round(body.members.length * 0.9), {
    sign: true,
    chairHears: true,
  });
  return { bill, sections: first.status === "drafted" ? provisions : allowed };
}

describe(`an amendment keeps the terms of the law it amends (${where})`, () => {
  it("a House SNAP raise keeps the table by household size and pays households; a Social Security tax raise keeps the wage base", () => {
    const w = world();
    const snap = rowAt(w.api, "snap-maximum", "federal")!;
    const ss = rowAt(w.api, "social-security-tax", "federal")!;
    expect(snap.terms?.byHouseholdSize, where).toBeDefined();
    expect(ss.terms?.wageBase, where).toBeDefined();
    const start = w.core.date;
    const { bill } = pass(w, "federal:us-house", [
      {
        kind: "law-amount",
        series: "snap-maximum",
        value: Math.round(snap.value! * 1.3),
        ...(snap.unit ? { unit: snap.unit } : {}),
      } as Provision,
      raised(ss)!,
    ]);
    w.dev.advance(addDays(makeIsoDate(start), 70));
    const wrote = rowsOf(w.api, bill.id);
    const snapRow = wrote.get("snap-maximum");
    const ssRow = wrote.get("social-security-tax");
    const tag = `${where}, bill ${bill.id}`;
    expect(snapRow?.terms?.byHouseholdSize, `${tag}: SNAP table`).toEqual(
      snap.terms!.byHouseholdSize,
    );
    expect(lawInForce(w.api, "snap-maximum").governing?.id, tag).toBe(
      snapRow!.id,
    );
    expect(ssRow?.terms?.wageBase, `${tag}: wage base`).toBe(
      ss.terms!.wageBase,
    );
    expect(ssRow?.terms?.enactedByBill, tag).toBe(bill.id);
    // Benefits paid under the raise: named households and a counted group.
    const paid = appliedOn(w.api, "snap-maximum").filter(
      (r) =>
        r.what === "snap-benefit-set" &&
        r.lawId === snapRow!.id &&
        r.lastOn > start &&
        r.amountMinor > 0,
    );
    expect(
      paid.filter((r) => r.target === "household").length,
      `${tag}: named households paid under the raise`,
    ).toBeGreaterThan(0);
    expect(
      paid.filter((r) => r.target === "group").reduce((n, r) => n + r.count, 0),
      `${tag}: counted people paid under the raise`,
    ).toBeGreaterThan(0);
  }, 120_000);

  it("every law-amount series Congress and the state may set keeps every term after a raise", () => {
    const w = world();
    const series = (powers as { series: Record<string, { levels: string[] }> })
      .series;
    const bodies = [
      { id: "federal:us-house", level: "federal" },
      {
        id: w.dev
          .lawmakingBodies()
          .find(
            (b) =>
              b.kind === "legislature-lower" ||
              b.kind === "legislature-unicameral",
          )!.id,
        level: "state",
      },
    ];
    const checked: string[] = [];
    for (const body of bodies) {
      const old = new Map(
        Object.entries(series)
          .filter(([, p]) => p.levels.includes(body.level))
          .map(([s]) => [s, rowAt(w.api, s, body.level)] as const)
          .filter(([, row]) => row?.terms),
      );
      const { bill, sections } = pass(
        w,
        body.id,
        [...old.values()].map(raised).filter((p): p is Provision => !!p),
      );
      w.dev.advance(addDays(makeIsoDate(w.core.date), 2));
      const wrote = rowsOf(w.api, bill.id);
      for (const section of sections) {
        const s = (section as { series: string }).series;
        const was = old.get(s)!;
        const now = wrote.get(s);
        const tag = `${where}: ${body.level} ${s}, bill ${bill.id}`;
        expect(now, tag).toBeDefined();
        const lost = Object.keys(was.terms!).filter(
          (k) =>
            !RECORD.has(k) &&
            !(k in now!.terms!) &&
            !(k === "schedules" && now!.terms!.system === "flat"),
        );
        expect(lost, `${tag} lost terms`).toEqual([]);
        expect(now!.terms!.enactedByBill, tag).toBe(bill.id);
        checked.push(`${body.level}:${s}`);
      }
    }
    console.log(
      `${where}: checked ${checked.length} series: ${checked.join(" ")}`,
    );
    expect(checked.length, where).toBeGreaterThan(10);
  }, 180_000);
});
