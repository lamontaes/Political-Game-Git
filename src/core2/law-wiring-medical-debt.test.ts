/**
 * Medical bills and medical debt in a played world (world-medical-spending-
 * categories, health-medical-debt-record): a place drawn from all 56 on a
 * seed nobody chose, the bench world with every module installed, built
 * twice from the same seed. In one the Medicaid expansion is in force at
 * every level of the town's chain; in its twin it is repealed. Each month the
 * coverage engine bills every household by its members' coverage and health
 * records and the household pays from what it holds; a bill unpaid past the
 * 120-day wait goes to collections as a medical-debt record on the
 * household's books.
 *
 * (a) A member whose health record asks for care is billed more than a
 *     healthy member on the same plan, members covered by a plan are billed
 *     less than uncovered ones, and every payment is a journal entry that
 *     balances, from the household to the medical seller.
 * (b) A named low-income household carries a smaller medical-debt record
 *     with the expansion than in its twin: its adults' Medicaid coverage (the
 *     law reach's payment records, more months of it than in the twin)
 *     prices their bills at Medicaid's share, and the place-level expansion
 *     row is left out of its collections share so the expansion moves it
 *     once.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { medicalDebtOf } from "./modules/credit";
import { enactLaw, lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import bills from "./data/health/medical-bills.json" with { type: "json" };

const SEED = process.env.MEDICAL_DEBT_SEED ?? randomBytes(20).toString("hex");
const EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const TWIN_LINK = "medicaid-expansion-to-medical-debt";
const BASE_SHARE = bills.parameters.medicalCollectionsBaseShare.value;
/** Months played: the first unpaid bills pass the 120-day wait in the fifth. */
const MONTHS = 8;
const TRIES = 4;

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** Each level of the town's chain whose latest row, whatever its date, says yes. */
function levelsHoldingYes(api: CoreAPI) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.flatMap(({ level, jurisdiction }) => {
    const latest = [
      ...(laws.query("bySeries", [
        jurisdiction,
        EXPAND,
      ]) as unknown as LawRowInput[]),
    ].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1
      ? [{ level, jurisdiction, effectiveDate: latest.effectiveDate }]
      : [];
  });
}

/** The expansion in force from tomorrow at the state (else the nearest level that may hold it). */
function enact(api: CoreAPI): string {
  if (levelsHoldingYes(api).length) return "already in force";
  for (const level of ["state", "city", "county", "federal"] as const) {
    const at = lawChain(api).levels.find((l) => l.level === level);
    if (!at) continue;
    return enactLaw(api, {
      jurisdiction: at.jurisdiction,
      level,
      series: EXPAND,
      value: 1,
      effectiveDate: tomorrow(api),
      measureId: "medical-debt-test-enact",
      citation: "Medical debt test: the expansion enacted",
    }).id;
  }
  throw new Error("no level of the chain can enact the expansion");
}

/** The expansion repealed at every level that holds it, now or by a bill already passed. */
function repeal(api: CoreAPI): string[] {
  return levelsHoldingYes(api).map(({ level, jurisdiction, effectiveDate }) => {
    const day =
      effectiveDate > api.state.date
        ? addDays(makeIsoDate(effectiveDate), 1)
        : tomorrow(api);
    return enactLaw(api, {
      jurisdiction,
      level,
      series: EXPAND,
      value: 0,
      effectiveDate: day,
      measureId: "medical-debt-test-repeal",
      citation: "Medical debt test: the expansion repealed in the twin",
    }).id;
  });
}

const billsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];

/** Every full household's bill row each month, as it stood after the 1st. */
function play(core: CoreState): MedicalBillRow[] {
  const seen: MedicalBillRow[] = [];
  for (let month = 0; month < MONTHS; month += 1) {
    const day = makeIsoDate(core.date);
    const next = addDays(makeIsoDate(`${day.slice(0, 7)}-02`), 31);
    advanceCore(core, makeIsoDate(`${next.slice(0, 7)}-02`));
    seen.push(
      ...billsOf(core).filter(
        (row) => !row.counted && row.date === `${core.date.slice(0, 7)}-01`,
      ),
    );
  }
  return seen;
}

/**
 * Each journal entry the bills posted, by world and journal id: what its
 * lines sum to, and the lines of a full household's payment (a counted
 * place's entry has a line for every group, so only its sum is kept).
 */
const posted = new Map<
  string,
  {
    source: string;
    sum: number;
    lines?: { accountId: string; deltaMinor: number }[];
  }
>();
/** The world being played, so the two worlds' journal ids do not collide. */
let playing = "";

describe("medical bills and medical debt in a played world", () => {
  it("the expansion's medical-debt link is researched and runs from the law", () => {
    const row = WEB_LINKS.find((link) => link.key === TWIN_LINK)!;
    expect(row.from).toBe(`law:${EXPAND}`);
    expect(row.to).toBe("finance.medical-debt-in-collections");
    expect(row.size).toBeLessThan(0);
  });

  it(
    `bills follow coverage and health, and the expansion shrinks a low-income household's medical debt (MEDICAL_DEBT_SEED=${SEED})`,
    { timeout: 2_400_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      setJournalTrace((input) => {
        if (!input.sourceRef.id.startsWith("medical:")) return;
        const counted = input.sourceRef.id.startsWith("medical:counted:");
        posted.set(`${playing}|${input.id}`, {
          source: input.sourceRef.id,
          sum: input.postings.reduce((n, p) => n + p.deltaMinor, 0),
          ...(counted
            ? {}
            : {
                lines: input.postings.map((p) => ({
                  accountId: p.accountId,
                  deltaMinor: p.deltaMinor,
                })),
              }),
        });
      });
      const passed: string[] = [];
      try {
        for (let attempt = 0; attempt < TRIES; attempt += 1) {
          const drawn = drawPlace(SEED, `law-wiring-medical-debt:${attempt}`);
          const where = `${drawn.name}, ${drawn.state} (${drawn.key}), world seed ${drawn.seed}`;
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          // One world at a time, keeping only what the checks read, so the
          // two worlds are never held at once.
          posted.clear();
          const run = (world: "expanded" | "twin") => {
            const core = build();
            const api = coreAPI(core);
            const change =
              world === "expanded" ? enact(api) : repeal(api).join(", ");
            playing = world;
            const rows = play(core);
            const counted = billsOf(core)
              .filter((row) => row.counted && row.webLinks.includes(TWIN_LINK))
              .slice(0, 5);
            const debts = new Map(
              [...core.households.keys()].map((id) => [
                id,
                medicalDebtOf(api, id),
              ]),
            );
            return { rows, change, counted, debts };
          };
          const withExpansion = run("expanded");
          const inTwin = run("twin");
          const enacted = withExpansion.change;
          const repealed = inTwin.change;
          const withLaw = withExpansion.rows;
          const without = inTwin.rows;

          // (a) Bills follow health and coverage, by record: the member whose
          // health record asks the most care (a serious illness under way
          // first, else a held condition's share, the same rule) is billed
          // more than a member on the same plan whose record asks none, in a
          // household of the same size, place and month in the same world.
          // A small town may have no serious illness under way in the months
          // played.
          const all = [...withLaw, ...without];
          const worldOf = new Map<MedicalBillRow, "expanded" | "twin">([
            ...withLaw.map((row) => [row, "expanded"] as const),
            ...without.map((row) => [row, "twin"] as const),
          ]);
          const billed = all.flatMap((row) =>
            row.members.map((m) => ({ ...m, size: row.members.length, row })),
          );
          type Billed = (typeof billed)[number];
          const peerKey = (m: Billed) =>
            `${worldOf.get(m.row)}|${m.row.placeId}|${m.row.date}|${m.plan}|${m.size}`;
          const healthyPeer = new Map<string, Billed>();
          for (const m of billed)
            if (
              m.careNeed === 0 &&
              m.billMinor > (healthyPeer.get(peerKey(m))?.billMinor ?? -1)
            )
              healthyPeer.set(peerKey(m), m);
          const ill = billed
            .filter((m) => m.careNeed > 0 && healthyPeer.has(peerKey(m)))
            .sort(
              (a, b) => b.careNeed - a.careNeed || b.billMinor - a.billMinor,
            )[0];
          const healthy = ill ? healthyPeer.get(peerKey(ill)) : undefined;
          if (!ill || !healthy) {
            passed.push(
              `${where}: no member whose health asked for care had a healthy member on the same plan in a household of the same size that month`,
            );
            continue;
          }
          expect(
            ill.billMinor,
            `${where}: ${ill.personId} of ${ill.row.id} on ${ill.row.date} against ${healthy.personId} of ${healthy.row.id}`,
          ).toBeGreaterThan(healthy.billMinor);
          // Each payment is one balanced entry from the household to the
          // seller, for the amount the bill row says it paid: every full
          // household's payment, both worlds, every month played.
          const paying = all.filter((row) => row.paidMinor > 0);
          expect(paying.length, `${where}: payments`).toBeGreaterThan(0);
          for (const row of paying) {
            const at = `${where}: ${row.id} on ${row.date}`;
            expect(row.journalIds.length, at).toBeGreaterThan(0);
            let moved = 0;
            for (const id of row.journalIds) {
              const entry = posted.get(`${worldOf.get(row)}|${id}`);
              expect(entry, `${where}: ${id}`).toBeDefined();
              expect(entry!.source, id).toContain(row.householdId);
              expect(entry!.sum, `${where}: ${id} balances`).toBe(0);
              moved += entry!.lines!.reduce(
                (n, l) => n + Math.max(0, l.deltaMinor),
                0,
              );
            }
            expect(moved, `${at} paid`).toBe(row.paidMinor);
          }
          for (const [id, entry] of posted)
            expect(
              entry.sum,
              `${where}: ${id} (${entry.source}) balances`,
            ).toBe(0);
          // Covered members are billed less than uncovered ones, at the same
          // care need, in households of the same size in the same place.
          const memberBills = all.flatMap((row) =>
            row.members
              .filter((m) => m.careNeed === 0)
              .map((m) => ({ ...m, size: row.members.length, row })),
          );
          const pair = (covered: "employer" | "medicaid") => {
            for (const c of memberBills.filter((m) => m.plan === covered)) {
              const u = memberBills.find(
                (m) =>
                  m.plan === "none" &&
                  m.size === c.size &&
                  m.row.placeId === c.row.placeId &&
                  m.row.date === c.row.date,
              );
              if (u) return { c, u };
            }
            return undefined;
          };
          const employer = pair("employer");
          expect(
            employer,
            `${where}: an employer-covered and an uncovered member`,
          ).toBeDefined();
          expect(employer!.c.billMinor).toBeLessThan(employer!.u.billMinor);
          const medicaid = pair("medicaid");
          if (medicaid)
            expect(medicaid.c.billMinor).toBeLessThan(medicaid.u.billMinor);

          // (b) A named low-income household's medical debt, both worlds.
          // Covered by the expansion: more of its members' months on Medicaid
          // in the expansion world than in the twin, over every month played
          // (each world's own lawmakers and incomes move coverage too, so the
          // last month alone can miss it). Its rows are the latest month a
          // member was covered, and the twin's row for the same month.
          const medicaidMonths = (rows: readonly MedicalBillRow[]) => {
            const out = new Map<string, number>();
            for (const row of rows)
              out.set(
                row.householdId,
                (out.get(row.householdId) ?? 0) +
                  row.members.filter((m) => m.plan === "medicaid").length,
              );
            return out;
          };
          const monthsWith = medicaidMonths(withLaw);
          const monthsWithout = medicaidMonths(without);
          const households = [
            ...new Set(without.map((row) => row.householdId)),
          ].filter((id) => withExpansion.debts.has(id));
          const compared = households
            .filter(
              (id) =>
                (inTwin.debts.get(id)?.balanceMinor ?? 0) > 0 &&
                (monthsWith.get(id) ?? 0) > (monthsWithout.get(id) ?? 0),
            )
            .map((id) => {
              const twinDebt = inTwin.debts.get(id);
              const withIt = withExpansion.debts.get(id);
              const expandedRow = withLaw
                .filter(
                  (row) =>
                    row.householdId === id &&
                    row.members.some((m) => m.plan === "medicaid"),
                )
                .at(-1)!;
              return {
                id,
                twin: twinDebt?.balanceMinor ?? 0,
                expanded: withIt?.balanceMinor ?? 0,
                twinDebt,
                expandedDebt: withIt,
                monthsWith: monthsWith.get(id) ?? 0,
                monthsWithout: monthsWithout.get(id) ?? 0,
                expandedRow,
                twinRow: without.find(
                  (row) =>
                    row.householdId === id && row.date === expandedRow.date,
                ),
              };
            })
            .sort((a, b) => b.twin - b.expanded - (a.twin - a.expanded));
          const named = compared[0];
          if (!named) {
            passed.push(
              `${where}: no named household covered by the expansion carried medical debt in the twin (${households.length} households compared)`,
            );
            continue;
          }
          expect(named.expanded, `${where}: ${named.id}`).toBeLessThan(
            named.twin,
          );
          // The expansion moves it once: its own coverage, not the place row.
          expect(named.expandedRow.ownRecordsFor).toContain(TWIN_LINK);
          expect(named.expandedRow.webLinks).not.toContain(TWIN_LINK);
          // A counted household has no Medicaid record of its own: where the
          // web moves the place row (the repeal, after the link's lag, or an
          // enactment), its share sent to collections moves off the base.
          const counted = [...withExpansion.counted, ...inTwin.counted];
          for (const row of counted.slice(0, 5))
            expect(row.collectionsShare, row.id).not.toBe(BASE_SHARE);
          const covered = named.expandedRow.members.filter(
            (m) => m.plan === "medicaid",
          );
          process.stdout.write(
            [
              `MEDICAL-DEBT (MEDICAL_DEBT_SEED=${SEED}) ${where}; expansion ${enacted} in one world, repealed in the twin (${repealed || "not held"}).`,
              `(a) ${worldOf.get(ill.row)} world, ${ill.row.date}: member ${ill.personId} of ${ill.row.id} (${ill.plan}, care need ${ill.careNeed.toFixed(2)}) billed ${ill.billMinor} against ${healthy.personId} of ${healthy.row.id} (${healthy.plan}, none) billed ${healthy.billMinor}. Employer member ${employer!.c.personId} ${employer!.c.billMinor} against uncovered ${employer!.u.personId} ${employer!.u.billMinor}${medicaid ? `; Medicaid member ${medicaid.c.personId} ${medicaid.c.billMinor} against uncovered ${medicaid.u.personId} ${medicaid.u.billMinor}` : ""}. ${paying.length} household payments, each its journal entries for what its row says it paid (e.g. ${paying[0]!.id} on ${paying[0]!.date} paid ${paying[0]!.paidMinor} by ${paying[0]!.journalIds.join(", ")}); ${posted.size} medical journal entries, each balanced.`,
              `(b) ${named.id}: medical debt ${named.expanded} with the expansion (${named.expandedDebt?.id ?? "no record"}) against ${named.twin} in the twin (${named.twinDebt!.id}, first sent ${named.twinDebt!.chargedOffAt}, last ${named.twinDebt!.lastSentAt} ${named.twinDebt!.lastSentMinor} from ${named.twinDebt!.lastBillId}); Medicaid member-months ${named.monthsWith} with the expansion against ${named.monthsWithout} in the twin; on ${named.expandedRow.date} Medicaid-covered members ${covered.map((m) => `${m.personId} ${m.billMinor}`).join(", ")}, expanded bill ${named.expandedRow.billMinor} owed ${named.expandedRow.owed.reduce((n, o) => n + o.minor, 0)}, twin bill ${named.twinRow?.billMinor ?? "none"} owed ${named.twinRow?.owed.reduce((n, o) => n + o.minor, 0) ?? "none"}; own records for ${named.expandedRow.ownRecordsFor.join(", ")}. Counted rows reading the place row: ${counted.length}${counted[0] ? `, e.g. ${counted[0].id} share ${counted[0].collectionsShare.toFixed(4)} (${counted[0].webRecordId})` : ""}. Passed over: ${passed.join("; ") || "none"}`,
            ].join("\n") + "\n",
          );
          return;
        }
        throw new Error(
          `No drawn place showed both parts: ${passed.join("; ")}`,
        );
      } finally {
        setJournalTrace(null);
        setBookkeeping(bookkeeping);
      }
    },
  );
});
