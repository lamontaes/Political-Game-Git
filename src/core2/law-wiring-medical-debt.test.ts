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
 * (a) A household with a seriously ill member is billed more than a healthy
 *     neighbor, members covered by a plan are billed less than uncovered
 *     ones, each payment is a journal entry that balances, from the
 *     household to the medical seller.
 * (b) A named low-income household carries a smaller medical-debt record
 *     with the expansion than in its twin: its adults' Medicaid coverage (the
 *     law reach's payment records) prices their bills at Medicaid's share,
 *     and the place-level expansion row is left out of its collections share
 *     so the expansion moves it once.
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

const SEED = process.env.MEDICAL_DEBT_SEED ?? randomBytes(20).toString("hex");
const EXPAND =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const TWIN_LINK = "medicaid-expansion-to-medical-debt";
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

/** Each journal entry the bills posted: its lines, by journal id. */
const posted = new Map<
  string,
  { source: string; lines: { accountId: string; deltaMinor: number }[] }
>();

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
        posted.set(input.id, {
          source: input.sourceRef.id,
          lines: input.postings.map((p) => ({
            accountId: p.accountId,
            deltaMinor: p.deltaMinor,
          })),
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
          const expanded = build();
          const twin = build();
          const enacted = enact(coreAPI(expanded));
          const repealed = repeal(coreAPI(twin));
          posted.clear();
          const withLaw = play(expanded);
          const without = play(twin);

          // (a) Bills follow health and coverage, by record.
          const all = [...withLaw, ...without];
          const ill = all
            .filter(
              (row) =>
                row.paidMinor > 0 &&
                row.journalIds.length > 0 &&
                row.members.some((m) => m.careNeed === 1),
            )
            .sort((a, b) => b.billMinor - a.billMinor)[0];
          const healthy = ill
            ? all
                .filter(
                  (row) =>
                    row.placeId === ill.placeId &&
                    row.date === ill.date &&
                    row.members.length === ill.members.length &&
                    row.paidMinor > 0 &&
                    row.journalIds.length > 0 &&
                    row.members.every((m) => m.careNeed === 0),
                )
                .sort((a, b) => b.billMinor - a.billMinor)[0]
            : undefined;
          if (!ill || !healthy) {
            passed.push(
              `${where}: ${ill ? "no healthy neighbor of the same size paid that month" : "no seriously ill member's household paid a bill"}`,
            );
            continue;
          }
          expect(
            ill.billMinor,
            `${where}: ${ill.id} against ${healthy.id}`,
          ).toBeGreaterThan(healthy.billMinor);
          // Each payment is one balanced entry from the household to the seller.
          for (const row of [ill, healthy])
            for (const id of row.journalIds) {
              const entry = posted.get(id);
              expect(entry, `${where}: ${id}`).toBeDefined();
              expect(
                entry!.lines.reduce((n, l) => n + l.deltaMinor, 0),
                `${where}: ${id} balances`,
              ).toBe(0);
            }
          for (const [id, entry] of posted)
            expect(
              entry.lines.reduce((n, l) => n + l.deltaMinor, 0),
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
          const api = coreAPI(expanded);
          const twinApi = coreAPI(twin);
          const lastOf = (rows: readonly MedicalBillRow[], id: string) =>
            rows.filter((row) => row.householdId === id).at(-1);
          const households = [
            ...new Set(without.map((row) => row.householdId)),
          ].filter((id) => expanded.households.has(id));
          const compared = households
            .map((id) => {
              const inTwin = medicalDebtOf(twinApi, id);
              const withIt = medicalDebtOf(api, id);
              return {
                id,
                twin: inTwin?.balanceMinor ?? 0,
                expanded: withIt?.balanceMinor ?? 0,
                twinDebt: inTwin,
                expandedDebt: withIt,
                twinRow: lastOf(without, id),
                expandedRow: lastOf(withLaw, id),
              };
            })
            .filter(
              (row) =>
                row.twin > 0 &&
                // Medicaid's members: an adult covered in the expansion world.
                row.expandedRow?.members.some((m) => m.plan === "medicaid") &&
                !row.twinRow?.members.some((m) => m.plan === "medicaid"),
            )
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
          expect(named.expandedRow!.ownRecordsFor).toContain(TWIN_LINK);
          expect(named.expandedRow!.webLinks).not.toContain(TWIN_LINK);
          const counted = billsOf(expanded).filter(
            (row) => row.counted && row.webLinks.includes(TWIN_LINK),
          );
          for (const row of counted.slice(0, 5))
            expect(row.collectionsShare, row.id).toBeLessThan(1);
          const covered = named.expandedRow!.members.filter(
            (m) => m.plan === "medicaid",
          );
          process.stdout.write(
            [
              `MEDICAL-DEBT (MEDICAL_DEBT_SEED=${SEED}) ${where}; expansion ${enacted} in one world, repealed in the twin (${repealed.join(", ") || "not held"}).`,
              `(a) ${ill.id} on ${ill.date}: billed ${ill.billMinor}, paid ${ill.paidMinor} (${ill.journalIds.join(", ")}), members ${ill.members.map((m) => `${m.personId} ${m.plan} need ${m.careNeed.toFixed(2)} ${m.billMinor}`).join("; ")}; healthy neighbor ${healthy.id}: billed ${healthy.billMinor}, paid ${healthy.paidMinor} (${healthy.journalIds.join(", ")}). Employer member ${employer!.c.personId} ${employer!.c.billMinor} against uncovered ${employer!.u.personId} ${employer!.u.billMinor}${medicaid ? `; Medicaid member ${medicaid.c.personId} ${medicaid.c.billMinor} against uncovered ${medicaid.u.personId} ${medicaid.u.billMinor}` : ""}. ${posted.size} medical journal entries, each balanced.`,
              `(b) ${named.id}: medical debt ${named.expanded} with the expansion (${named.expandedDebt?.id ?? "no record"}) against ${named.twin} in the twin (${named.twinDebt!.id}, first sent ${named.twinDebt!.chargedOffAt}, last ${named.twinDebt!.lastSentAt} ${named.twinDebt!.lastSentMinor} from ${named.twinDebt!.lastBillId}); Medicaid-covered members ${covered.map((m) => `${m.personId} ${m.billMinor}`).join(", ")}; twin bill ${named.twinRow!.billMinor} owed ${named.twinRow!.owed.reduce((n, o) => n + o.minor, 0)}, expanded bill ${named.expandedRow!.billMinor} owed ${named.expandedRow!.owed.reduce((n, o) => n + o.minor, 0)}; own records for ${named.expandedRow!.ownRecordsFor.join(", ")}. Counted rows reading the place row: ${counted.length}${counted[0] ? `, e.g. ${counted[0].id} share ${counted[0].collectionsShare.toFixed(4)} (${counted[0].webRecordId})` : ""}. Passed over: ${passed.join("; ") || "none"}`,
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
