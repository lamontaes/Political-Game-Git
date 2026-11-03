/**
 * The records that read a law's web links in a played window, for the web
 * link of the law-wiring matrix (check.ts writes them, matrix.ts grades from
 * them). A web month row a link fired in is not a read where the engine that
 * reads its outcome leaves the link out (the town's households leave the
 * expansion's place-level medical-debt row out of their collections share),
 * so a link into the medical bills' outcome counts only where a bill record
 * read it: MedicalBillRow.webLinks names the links its collections share
 * read, and webRecordId the web month row it stood on.
 *
 * A link the bills carry instead of the web (links.json carriedBy: the
 * expansion's and the work requirement's coverage links, carried by the law
 * reach's coverage records the bills price) is cited by the bill records
 * that priced a member by it, with the member's coverage record ids.
 *
 * A place-level row a household leaves out because its own records carry
 * the law (a bill record's ownRecordsFor: the town's households, whose
 * Medicaid coverage the reach keeps by person id) is carried in the town by
 * those records: it is cited by the bill records that left it out and priced
 * a member at Medicaid's share, with the member's coverage record ids
 * (medical-bills.json personLevel.placeTwinCarriedBy says how).
 */
import { coverageSpellsNow, spellOn } from "../../src/core2/health-own";
import {
  ENDED_BY_REQUIREMENT,
  medicaidCoverageSpells,
  type CoverageSpell,
} from "../../src/core2/law-reach/group-b-money";
import {
  MEDICAL_DEBT_OUTCOME,
  type BilledMember,
  type MedicalBillRow,
} from "../../src/core2/medical-bills";
import bills from "../../src/core2/data/health/medical-bills.json" with { type: "json" };
import { COVERAGE_MODULE_ID } from "../../src/core2/modules/coverage";
import { OUTCOME_WEB_MODULE_ID } from "../../src/core2/modules/outcome-web";
import { coreAPI } from "../../src/core2/state";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import type { WebLinkRow } from "./catalog";

/** A bill record that read a link: its id, billed day and place, and the web month row its share stood on. */
export interface BillRead {
  readonly id: string;
  readonly date: string;
  readonly placeId: string;
  readonly webRecordId: string | null;
  readonly effect: number | null;
}

/** A bill record that priced a member by a carried link's records: the member and their coverage record ids. */
export interface CarriedRecord {
  readonly id: string;
  readonly date: string;
  readonly placeId: string;
  readonly personId: string;
  readonly recordIds: readonly string[];
}

/** What a world's bills showed of the links looked for, by link: how many records, and a few by id. */
export interface BillRecords {
  /** The links whose reads the bills record (their outcome is the bills'). */
  readonly recordedLinks: readonly string[];
  /** The carried links whose records the bills price by. */
  readonly carriedLinks: readonly string[];
  readonly reads: Record<string, { count: number; sample: BillRead[] }>;
  readonly carried: Record<string, { count: number; sample: CarriedRecord[] }>;
  /** A recorded link the town's own records carry instead of its place row: how, and the bill records that left the row out (older result files have none). */
  readonly own?: Record<
    string,
    { by: string; count: number; sample: CarriedRecord[] }
  >;
}

/** The place-level row a town household's own Medicaid records carry, and how (medical-bills.json). */
const OWN_CARRIED: Readonly<Record<string, string>> = {
  [bills.personLevel.placeTwin]: bills.personLevel.placeTwinCarriedBy,
};

/** The carried links the bills price a member by, and the coverage records that hold them. */
const BILL_CARRIED: Readonly<
  Record<
    string,
    {
      readonly member: (m: BilledMember) => boolean;
      readonly spells: (
        api: CoreAPI,
      ) => ReadonlyMap<string, readonly CoverageSpell[]> | null;
    }
  >
> = {
  // A member the expansion covers is billed at Medicaid's share.
  "medicaid-expansion-to-coverage": {
    member: (m) => m.plan === "medicaid",
    spells: (api) => coverageSpellsNow(api),
  },
  // A member whose coverage the requirement ends pays what it added.
  "work-requirement-to-coverage": {
    member: (m) => (m.requirementMinor ?? 0) > 0,
    spells: (api) => medicaidCoverageSpells(api, ENDED_BY_REQUIREMENT),
  },
};

const SAMPLE = 4;

/** Keep a few records, one per place first, so the sample shows the places that read. */
function keep<T extends { placeId: string }>(
  into: { count: number; sample: T[] },
  item: T,
): void {
  into.count += 1;
  if (into.sample.length >= SAMPLE) {
    const seen = new Set(into.sample.map((s) => s.placeId));
    if (seen.has(item.placeId)) return;
    const twice = into.sample.findIndex(
      (s, i) => into.sample.findIndex((t) => t.placeId === s.placeId) !== i,
    );
    if (twice < 0) return;
    into.sample.splice(twice, 1);
  }
  into.sample.push(item);
}

/** A collector of the bill records that read or carry these links, fed each step of a played window. */
export function billRecords(links: readonly WebLinkRow[]): {
  readonly collect: (core: CoreState) => void;
  readonly result: () => BillRecords;
} {
  const recordedLinks = links
    .filter((l) => l.to === MEDICAL_DEBT_OUTCOME && !l.carriedBy)
    .map((l) => l.key);
  const carriedLinks = links
    .filter((l) => l.carriedBy && BILL_CARRIED[l.key])
    .map((l) => l.key);
  const recorded = new Set(recordedLinks);
  const reads: BillRecords["reads"] = {};
  const carried: BillRecords["carried"] = {};
  for (const link of recordedLinks) reads[link] = { count: 0, sample: [] };
  for (const link of carriedLinks) carried[link] = { count: 0, sample: [] };
  const own: NonNullable<BillRecords["own"]> = {};
  for (const link of recordedLinks)
    if (OWN_CARRIED[link])
      own[link] = { by: OWN_CARRIED[link]!, count: 0, sample: [] };
  const ownLinks = Object.keys(own);
  // The bills keep each household's latest month: a step reads the months
  // billed since the last step.
  let seen = "";
  return {
    collect(core) {
      if (!recordedLinks.length && !carriedLinks.length) return;
      if (!core.modules.has(COVERAGE_MODULE_ID)) return;
      const api = coreAPI(core);
      const fresh = (
        api
          .moduleState(COVERAGE_MODULE_ID)
          .table("medicalBills")
          .rows() as unknown as MedicalBillRow[]
      ).filter((row) => row.date > seen);
      if (!fresh.length) return;
      for (const row of fresh) if (row.date > seen) seen = row.date;
      const months = core.modules.has(OUTCOME_WEB_MODULE_ID)
        ? api.moduleState(OUTCOME_WEB_MODULE_ID).table("months")
        : null;
      for (const row of fresh)
        for (const link of row.webLinks) {
          if (!recorded.has(link)) continue;
          const month = row.webRecordId
            ? (months?.get(row.webRecordId) as unknown as
                { effects?: Record<string, number> } | undefined)
            : undefined;
          keep(reads[link]!, {
            id: row.id,
            date: row.date,
            placeId: row.placeId,
            webRecordId: row.webRecordId,
            effect: month?.effects?.[link] ?? null,
          });
        }
      if (ownLinks.length) {
        const spells = coverageSpellsNow(api);
        for (const row of fresh)
          for (const link of ownLinks) {
            if (!row.ownRecordsFor.includes(link)) continue;
            for (const m of row.members) {
              if (m.plan !== "medicaid") continue;
              keep(own[link]!, {
                id: row.id,
                date: row.date,
                placeId: row.placeId,
                personId: m.personId,
                recordIds:
                  spellOn(spells?.get(m.personId), row.date)?.recordIds ?? [],
              });
            }
          }
      }
      for (const link of carriedLinks) {
        const rule = BILL_CARRIED[link]!;
        const spells = rule.spells(api);
        for (const row of fresh)
          for (const m of row.members) {
            if (!rule.member(m)) continue;
            keep(carried[link]!, {
              id: row.id,
              date: row.date,
              placeId: row.placeId,
              personId: m.personId,
              recordIds:
                spellOn(spells?.get(m.personId), row.date)?.recordIds ?? [],
            });
          }
      }
    },
    result: () => ({ recordedLinks, carriedLinks, reads, carried, own }),
  };
}

/** One law's part of a world's bill records (the control world collects every law's links at once). */
export function recordsFor(
  records: BillRecords | undefined,
  links: readonly WebLinkRow[],
): BillRecords | undefined {
  if (!records) return undefined;
  const keys = new Set(links.map((l) => l.key));
  const pick = <T>(rows: Record<string, T>) =>
    Object.fromEntries(Object.entries(rows).filter(([k]) => keys.has(k)));
  return {
    recordedLinks: records.recordedLinks.filter((k) => keys.has(k)),
    carriedLinks: records.carriedLinks.filter((k) => keys.has(k)),
    reads: pick(records.reads),
    carried: pick(records.carried),
    own: pick(records.own ?? {}),
  };
}
