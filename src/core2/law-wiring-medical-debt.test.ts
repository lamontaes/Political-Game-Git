/**
 * Medical bills and medical debt in a played world (world-medical-spending-
 * categories, health-medical-debt-record): a place drawn from all 56 on a
 * seed nobody chose, the bench world with every module installed, built
 * twice from the same seed. In one the Medicaid expansion is in force at
 * every level of the town's chain; in its twin it is repealed. Each month the
 * coverage engine bills every household of the places whose money the world
 * keeps by its members' coverage and health records, and the household pays
 * from what it holds; a bill unpaid past the 120-day wait goes to collections
 * as a medical-debt record on the household's books.
 *
 * (a) In the drawn town, a household whose member has a serious illness under
 *     way (a health case with an onset event, care need one) pays more for
 *     the month than a healthy household of the same size and plans, both
 *     paid in full by journal entries; members covered by a plan are billed
 *     less than uncovered ones; and every payment is a balanced journal entry
 *     from the household's members' main accounts to the main account of the
 *     medical seller its row names, one of the town's when it has any.
 * (b) A named low-income household carries a smaller medical-debt record
 *     with the expansion than in its twin, where the twin never held the
 *     expansion in the played window: in a month when a member held Medicaid
 *     coverage in the expansion world (their own coverage records, by person
 *     id) and none in the twin, its bill was lower, and the place-level
 *     expansion row was left out of its collections share. The law reach pays
 *     no one for the coverage, so the bill is the expansion's one path into
 *     the household's money. A counted household in the town is priced at
 *     Medicaid's share the same way, by its members' own coverage records.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coverageSpellsNow, spellOn } from "./health-own";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoverageSpell } from "./law-reach/group-b-money";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { outsideAccountOf } from "./modules/budgets";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { medicalDebtOf } from "./modules/credit";
import { healthReport } from "./modules/health";
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
/** Months played: the first unpaid bills pass the 120-day wait in the fifth. */
const MONTHS = 8;
const TRIES = 6;

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);

/** The expansion's rows at each level of the town's chain, oldest first. */
function expansionRows(api: CoreAPI) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.map(({ level, jurisdiction }) => ({
    level,
    jurisdiction,
    rows: [
      ...(laws.query("bySeries", [
        jurisdiction,
        EXPAND,
      ]) as unknown as LawRowInput[]),
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)),
  }));
}

/** Each level of the town's chain whose latest row, whatever its date, says yes. */
function levelsHoldingYes(api: CoreAPI) {
  return expansionRows(api).flatMap(({ level, jurisdiction, rows }) => {
    const latest = rows.at(-1);
    return latest?.value === 1
      ? [{ level, jurisdiction, effectiveDate: latest.effectiveDate }]
      : [];
  });
}

/**
 * The expansion's rows in force on some day of [from, to] that say yes, at
 * any level of the chain: the row in force on `from` and every row taking
 * effect after it, up to `to`.
 */
function heldYes(api: CoreAPI, from: string, to: string): LawRowInput[] {
  return expansionRows(api).flatMap(({ rows }) => {
    const before = rows.filter((r) => r.effectiveDate <= from).at(-1);
    const during = rows.filter(
      (r) => r.effectiveDate > from && r.effectiveDate <= to,
    );
    return [...(before ? [before] : []), ...during].filter(
      (r) => r.value === 1,
    );
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

/**
 * The expansion repealed at every level that holds it, now or by a bill
 * already passed: the repeal rows, and the last day one takes effect.
 */
function repeal(api: CoreAPI): { ids: string[]; lastDay: string } {
  let lastDay: string = tomorrow(api);
  const ids = levelsHoldingYes(api).map(
    ({ level, jurisdiction, effectiveDate }) => {
      const day =
        effectiveDate > api.state.date
          ? addDays(makeIsoDate(effectiveDate), 1)
          : tomorrow(api);
      if (day > lastDay) lastDay = day;
      return enactLaw(api, {
        jurisdiction,
        level,
        series: EXPAND,
        value: 0,
        effectiveDate: day,
        measureId: "medical-debt-test-repeal",
        citation: "Medical debt test: the expansion repealed in the twin",
      }).id;
    },
  );
  return { ids, lastDay };
}

const billsOf = (core: CoreState) =>
  coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];

/** The town's sellers of medical care, as the bills choose among them. */
function townSellers(api: CoreAPI, town: string): Set<string> {
  const core = api.state as CoreState;
  const kinds = new Set(bills.medicalSellerClassifications);
  return new Set(
    [...core.organizations.values()]
      .filter(
        (org) =>
          org.placeId === town &&
          kinds.has(org.classification ?? "") &&
          !core.finance.businesses.get(org.id)?.closedAt &&
          core.cashJournal.residualAccountByOwner.has(org.id),
      )
      .map((org) => org.id),
  );
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

/**
 * Every bill row of each month as it stood after the 1st (full and counted),
 * with the health cases under way that day (their onset event, by billed day
 * and person); each full household's payment in the drawn town is read
 * against the journal the month it was made, while its members and seller
 * still stand.
 */
function play(
  core: CoreState,
  where: string,
): {
  rows: MedicalBillRow[];
  outside: MedicalBillRow | null;
  onsets: Map<string, string>;
  checked: number;
} {
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const rows: MedicalBillRow[] = [];
  let outside: MedicalBillRow | null = null;
  const onsets = new Map<string, string>();
  let checked = 0;
  for (let month = 0; month < MONTHS; month += 1) {
    const day = makeIsoDate(core.date);
    const next = addDays(makeIsoDate(`${day.slice(0, 7)}-02`), 31);
    advanceCore(core, makeIsoDate(`${next.slice(0, 7)}-02`));
    const billed = `${core.date.slice(0, 7)}-01`;
    const thisMonth = billsOf(core).filter((row) => row.date === billed);
    // The town's rows are kept (two worlds' every household-month do not
    // fit the heap), and one row elsewhere that reads the place row.
    rows.push(...thisMonth.filter((row) => row.placeId === town));
    outside ??=
      thisMonth.find(
        (row) => row.placeId !== town && row.webLinks.includes(TWIN_LINK),
      ) ?? null;
    for (const c of healthReport(core).cases)
      if (c.onsetEventId) onsets.set(`${billed}|${c.personId}`, c.onsetEventId);
    const sellers = townSellers(api, town);
    const outsideAccount = outsideAccountOf(api);
    for (const row of thisMonth) {
      if (row.counted || row.placeId !== town || row.paidMinor <= 0) continue;
      const at = `${where}: ${row.id} on ${row.date}`;
      expect(row.journalIds.length, at).toBeGreaterThan(0);
      // The household's own seller: the town's, where it has one, else the
      // outside account.
      expect(
        sellers.size
          ? sellers.has(row.sellerId ?? "")
          : row.sellerId === outsideAccount,
        `${at}: seller ${row.sellerId} (the town's: ${[...sellers].join(", ") || "none"})`,
      ).toBe(true);
      const sellerAccount = api.accounts().main(row.sellerId!);
      const memberAccounts = new Set(
        row.members.map((m) =>
          core.cashJournal.residualAccountByOwner.get(m.personId),
        ),
      );
      let moved = 0;
      for (const id of row.journalIds) {
        const entry = posted.get(`${playing}|${id}`);
        expect(entry, `${at}: ${id}`).toBeDefined();
        expect(entry!.source, id).toContain(row.householdId);
        expect(entry!.sum, `${at}: ${id} balances`).toBe(0);
        for (const line of entry!.lines!)
          if (line.deltaMinor > 0) {
            expect(line.accountId, `${at}: ${id} pays the seller`).toBe(
              sellerAccount,
            );
            moved += line.deltaMinor;
          } else if (line.deltaMinor < 0)
            expect(
              memberAccounts.has(line.accountId),
              `${at}: ${id} draws on ${line.accountId}, a member's main account`,
            ).toBe(true);
      }
      expect(moved, `${at} paid`).toBe(row.paidMinor);
      checked += 1;
    }
  }
  return { rows, outside, onsets, checked };
}

/** The sorted plans of a row's members, for comparing like households. */
const plansOf = (row: MedicalBillRow) =>
  row.members
    .map((m) => m.plan)
    .sort()
    .join(",");

describe("medical bills and medical debt in a played world", () => {
  it("the expansion's medical-debt link is researched and runs from the law", () => {
    const row = WEB_LINKS.find((link) => link.key === TWIN_LINK)!;
    expect(row.from).toBe(`law:${EXPAND}`);
    expect(row.to).toBe("finance.medical-debt-in-collections");
    expect(row.size).toBeLessThan(0);
  });

  it(
    `bills follow coverage and health, and the expansion shrinks a low-income household's medical debt (MEDICAL_DEBT_SEED=${SEED})`,
    { timeout: 3_600_000 },
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
          const build = () =>
            buildBenchWorld(drawn.seed, gameStartDate(), {
              twoLevel: true,
              placeKey: drawn.key,
            }).core;
          // One world at a time, keeping only what the checks read, so the
          // two worlds are never held at once.
          posted.clear();
          let town = "";
          const where = () =>
            `${drawn.name}, ${drawn.state} (${drawn.key}, town ${town}), world seed ${drawn.seed}`;
          const run = (world: "expanded" | "twin") => {
            const core = build();
            const api = coreAPI(core);
            town = lawChain(api).townPlaceId;
            const start = api.state.date;
            const repealed = world === "twin" ? repeal(api) : null;
            const change =
              world === "expanded" ? enact(api) : repealed!.ids.join(", ");
            playing = world;
            const played = play(core, where());
            const end = api.state.date;
            // The twin's own lawmakers may enact the expansion again in the
            // window: its law rows say whether it ever held it.
            const held = repealed
              ? heldYes(api, repealed.lastDay, end).map(
                  (r) => `${r.id} from ${r.effectiveDate}`,
                )
              : [];
            const debts = new Map(
              [...core.households.keys()].map((id) => [
                id,
                medicalDebtOf(api, id),
              ]),
            );
            // The billed residents' own coverage stretches, by person id.
            const spells = new Map<string, readonly CoverageSpell[]>();
            const stretches = coverageSpellsNow(api);
            for (const row of played.rows)
              for (const m of row.members) {
                const list = stretches?.get(m.personId);
                if (list) spells.set(m.personId, list);
              }
            return { ...played, change, debts, held, spells, start, end };
          };
          const withExpansion = run("expanded");
          const inTwin = run("twin");
          const worldOf = new Map<MedicalBillRow, "expanded" | "twin">([
            ...withExpansion.rows.map((row) => [row, "expanded"] as const),
            ...inTwin.rows.map((row) => [row, "twin"] as const),
          ]);
          const onsetOf = (row: MedicalBillRow, personId: string) =>
            (worldOf.get(row) === "expanded"
              ? withExpansion.onsets
              : inTwin.onsets
            ).get(`${row.date}|${personId}`);
          const all = [...withExpansion.rows, ...inTwin.rows];
          const full = all.filter(
            (row) => !row.counted && row.placeId === town,
          );

          // (a) A household with a member whose serious illness is under way
          // (care need one, a health case with an onset event) against a
          // healthy household (every member's care need none) of the same
          // size and plans, the same world and month, both in the drawn
          // town, both owing nothing before and paying the month's bill in
          // full by journal entries.
          const paidInFull = full.filter(
            (row) =>
              row.journalIds.length > 0 &&
              row.askedMinor === row.billMinor &&
              row.paidMinor === row.billMinor &&
              row.paidMinor > 0,
          );
          const likeOf = (row: MedicalBillRow) =>
            `${worldOf.get(row)}|${row.date}|${row.members.length}|${plansOf(row)}`;
          const healthy = new Map<string, MedicalBillRow>();
          for (const row of paidInFull)
            if (
              row.members.every((m) => m.careNeed === 0) &&
              row.billMinor > (healthy.get(likeOf(row))?.billMinor ?? -1)
            )
              healthy.set(likeOf(row), row);
          const illRow = paidInFull.find(
            (row) =>
              healthy.has(likeOf(row)) &&
              row.members.some(
                (m) => m.careNeed === 1 && onsetOf(row, m.personId),
              ),
          );
          if (!illRow) {
            passed.push(
              `${where()}: no town household with a serious illness under way paid its month in full beside a healthy household of the same size and plans (${full.filter((row) => row.members.some((m) => m.careNeed === 1)).length} town household-months with one)`,
            );
            continue;
          }
          const ill = illRow.members.find(
            (m) => m.careNeed === 1 && onsetOf(illRow, m.personId),
          )!;
          const well = healthy.get(likeOf(illRow))!;
          expect(
            illRow.paidMinor,
            `${where()}: ${illRow.id} (${ill.personId} ill) against ${well.id} on ${illRow.date}`,
          ).toBeGreaterThan(well.paidMinor);
          expect(
            withExpansion.checked + inTwin.checked,
            `${where()}: town payments read against the journal`,
          ).toBeGreaterThan(0);
          for (const [id, entry] of posted)
            expect(
              entry.sum,
              `${where()}: ${id} (${entry.source}) balances`,
            ).toBe(0);
          // Covered members are billed less than uncovered ones, at the same
          // care need, in town households of the same size.
          const memberBills = full.flatMap((row) =>
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
                  worldOf.get(m.row) === worldOf.get(c.row) &&
                  m.row.date === c.row.date,
              );
              if (u) return { c, u };
            }
            return undefined;
          };
          const employer = pair("employer");
          expect(
            employer,
            `${where()}: an employer-covered and an uncovered member`,
          ).toBeDefined();
          expect(employer!.c.billMinor).toBeLessThan(employer!.u.billMinor);
          const medicaid = pair("medicaid");
          if (medicaid)
            expect(medicaid.c.billMinor).toBeLessThan(medicaid.u.billMinor);

          // (b) The twin must not have held the expansion in the window.
          if (inTwin.held.length) {
            passed.push(
              `${where()}: the twin held the expansion in the played window (${inTwin.held.join("; ")})`,
            );
            continue;
          }
          // A town household's months when, in the expansion world, a member
          // held Medicaid coverage and, in the twin, none did, with every
          // member's care need the same in both and every other member on
          // the same plan, so only the expansion's coverage differs.
          const twinRows = new Map(
            inTwin.rows
              .filter((row) => !row.counted)
              .map((row) => [`${row.householdId}|${row.date}`, row]),
          );
          const months = withExpansion.rows
            .filter(
              (row) =>
                !row.counted &&
                row.placeId === town &&
                row.members.some((m) => m.plan === "medicaid"),
            )
            .flatMap((row) => {
              const twin = twinRows.get(`${row.householdId}|${row.date}`);
              if (!twin || twin.members.some((m) => m.plan === "medicaid"))
                return [];
              const there = new Map(twin.members.map((m) => [m.personId, m]));
              const same =
                twin.members.length === row.members.length &&
                row.members.every(
                  (m) =>
                    there.get(m.personId)?.careNeed === m.careNeed &&
                    (m.plan === "medicaid" ||
                      there.get(m.personId)?.plan === m.plan),
                );
              return same ? [{ expanded: row, twin }] : [];
            });
          const gap = (c: {
            expandedDebt?: { balanceMinor: number };
            twinDebt?: { balanceMinor: number };
          }) =>
            (c.twinDebt?.balanceMinor ?? 0) -
            (c.expandedDebt?.balanceMinor ?? 0);
          const compared = [
            ...new Set(months.map((m) => m.expanded.householdId)),
          ]
            .map((id) => ({
              id,
              month: months.find((m) => m.expanded.householdId === id)!,
              expandedDebt: withExpansion.debts.get(id),
              twinDebt: inTwin.debts.get(id),
            }))
            .filter((c) => (c.twinDebt?.balanceMinor ?? 0) > 0)
            .sort((a, b) => gap(b) - gap(a));
          const named = compared[0];
          if (!named) {
            passed.push(
              `${where()}: no town household with Medicaid coverage only in the expansion world carried medical debt in the twin (${months.length} household-months compared)`,
            );
            continue;
          }
          const { expanded, twin } = named.month;
          const at = `${where()}: ${named.id} on ${expanded.date}`;
          // That month its bill is lower with the expansion, by bill record.
          expect(
            expanded.billMinor,
            `${at}: ${expanded.id} against the twin's ${twin.id}`,
          ).toBeLessThan(twin.billMinor);
          // The coverage it read is the members' own: each Medicaid member
          // holds a stretch of coverage on the billed day.
          const covered = expanded.members.filter((m) => m.plan === "medicaid");
          for (const m of covered)
            expect(
              spellOn(withExpansion.spells.get(m.personId), expanded.date),
              `${at}: ${m.personId}'s coverage records`,
            ).toBeDefined();
          // The place row is left out of its share: its own records carry it.
          expect(expanded.ownRecordsFor, at).toContain(TWIN_LINK);
          expect(expanded.webLinks, at).not.toContain(TWIN_LINK);
          // Its medical debt is smaller with the expansion.
          expect(named.expandedDebt?.balanceMinor ?? 0, at).toBeLessThan(
            named.twinDebt!.balanceMinor,
          );
          // A counted household in the town meets the expansion the same
          // way: a member priced at Medicaid's share by their own coverage
          // record, the place row left out, every month of both worlds.
          const countedTown = all.filter(
            (row) => row.counted && row.placeId === town,
          );
          for (const row of countedTown)
            expect(
              row.webLinks,
              `${where()}: ${row.id} on ${row.date}`,
            ).not.toContain(TWIN_LINK);
          const countedMedicaid = withExpansion.rows.find(
            (row) =>
              row.counted &&
              row.placeId === town &&
              row.members.some(
                (m) =>
                  m.plan === "medicaid" &&
                  spellOn(withExpansion.spells.get(m.personId), row.date),
              ),
          );
          if (!countedMedicaid) {
            passed.push(
              `${where()}: no counted household in the town held Medicaid coverage in the expansion world (${countedTown.length} counted town household-months)`,
            );
            continue;
          }
          expect(countedMedicaid.ownRecordsFor).toContain(TWIN_LINK);
          const countedMember = countedMedicaid.members.find(
            (m) =>
              m.plan === "medicaid" &&
              spellOn(
                withExpansion.spells.get(m.personId),
                countedMedicaid.date,
              ),
          )!;
          const recordsOf = (personId: string, date: string) =>
            spellOn(withExpansion.spells.get(personId), date)!.recordIds.join(
              " ",
            );
          const outside = withExpansion.outside ?? inTwin.outside;
          process.stdout.write(
            [
              `MEDICAL-DEBT (MEDICAL_DEBT_SEED=${SEED}) ${where()}; expansion ${withExpansion.change} in one world, repealed in the twin (${inTwin.change || "not held"}); played ${withExpansion.start} to ${withExpansion.end}; the twin held it on no day of the window.`,
              `(a) ${worldOf.get(illRow)} world, ${illRow.date}: ${illRow.id} paid ${illRow.paidMinor} by ${illRow.journalIds.join(", ")} to ${illRow.sellerId}; its member ${ill.personId} (${ill.plan}, care need ${ill.careNeed}, health case onset ${onsetOf(illRow, ill.personId)}) billed ${ill.billMinor}. Healthy ${well.id} paid ${well.paidMinor} by ${well.journalIds.join(", ")} to ${well.sellerId} (care needs ${well.members.map((m) => m.careNeed).join(", ")}; plans ${plansOf(well)}). Employer member ${employer!.c.personId} ${employer!.c.billMinor} against uncovered ${employer!.u.personId} ${employer!.u.billMinor}${medicaid ? `; Medicaid member ${medicaid.c.personId} ${medicaid.c.billMinor} against uncovered ${medicaid.u.personId} ${medicaid.u.billMinor}` : ""}. ${withExpansion.checked + inTwin.checked} town household payments read line by line (members' main accounts to the seller's); ${posted.size} medical journal entries, each balanced.`,
              `(b) ${named.id}: medical debt ${named.expandedDebt?.balanceMinor ?? 0} with the expansion (${named.expandedDebt?.id ?? "no record"}) against ${named.twinDebt!.balanceMinor} in the twin (${named.twinDebt!.id}, first sent ${named.twinDebt!.chargedOffAt}, last ${named.twinDebt!.lastSentAt} ${named.twinDebt!.lastSentMinor} from ${named.twinDebt!.lastBillId}). On ${expanded.date} ${expanded.id} billed ${expanded.billMinor} with the expansion (Medicaid members ${covered.map((m) => `${m.personId} ${m.billMinor}, coverage records ${recordsOf(m.personId, expanded.date)}`).join("; ")}) against ${twin.billMinor} in the twin (plans ${plansOf(twin)}); own records for ${expanded.ownRecordsFor.join(", ")}, web links ${expanded.webLinks.join(", ") || "none"}. Counted: ${countedMedicaid.id} on ${countedMedicaid.date}, member ${countedMember.personId} at Medicaid's share billed ${countedMember.billMinor} (coverage records ${recordsOf(countedMember.personId, countedMedicaid.date)}), own records for ${countedMedicaid.ownRecordsFor.join(", ")}; ${countedTown.length} counted town household-months, none reading the place row${outside ? `; outside the town ${outside.id} (${outside.placeId}) reads it, share ${outside.collectionsShare} (${outside.webRecordId})` : ""}. Passed over: ${passed.join("; ") || "none"}`,
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
