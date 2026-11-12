/**
 * What a law did (play-what-this-law-did-page): for one series, each law row
 * passed in play on the town's chain (a bill's, or dev mode's), newest first,
 * with whom it reached as the engines recorded it. It reads the core's one
 * reader over every store that records a law applied to someone (`lawReach`,
 * law-reach/applied.ts), the same one dev mode's reach and trace read, so the
 * page and dev mode cannot differ. Full people are named with the money the
 * law moved for each; people still in the counts are a count and a sum, by
 * the same rule (one model, two tiers). A row a later row replaced (a repeal,
 * a new rate) carries the day it stopped, and each person the day it stopped
 * for them. A view: it writes nothing.
 */
import type { CoreState } from "../core2/types";
import { coreAPI } from "../core2/state";
import { lawReach } from "../core2/law-reach/applied";
import {
  lawChain,
  LAWS_MODULE_ID,
  type LawRowInput,
} from "../core2/modules/laws";

/** The full people a page names under one law, the most money first (a list length, not a model value). */
const NAMED = 8;

export interface LawDidPerson {
  readonly personId: string;
  readonly name: string;
  readonly inTown: boolean;
  readonly amountMinor: number;
  readonly endedOn: string | null;
}

export interface LawDid {
  /** The law row's id: the record the page is read from. */
  readonly lawId: string;
  readonly level: string;
  readonly value: number | null;
  readonly unit: string;
  readonly effectiveDate: string;
  /** The day a later row on the same level took over (a repeal or a new value), or null while it governs. */
  readonly replacedOn: string | null;
  readonly repeal: boolean;
  /** The bill that enacted it, when a bill did. */
  readonly billId: string | null;
  readonly records: number;
  readonly fullInTown: {
    readonly people: number;
    readonly amountMinor: number;
  };
  readonly fullElsewhere: {
    readonly people: number;
    readonly amountMinor: number;
  };
  readonly counted: { readonly people: number; readonly amountMinor: number };
  readonly named: readonly LawDidPerson[];
}

/** Each law row passed in play on `series` here, newest first, with whom it reached. */
export function lawDid(core: CoreState, series: string): readonly LawDid[] {
  const api = coreAPI(core);
  if (!core.modules.has(LAWS_MODULE_ID)) return [];
  const chain = lawChain(api);
  const here = new Set(chain.levels.map((l) => l.jurisdiction));
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .query("bySeriesOnly", [series]) as unknown as LawRowInput[]
  ).filter(
    (row) =>
      here.has(row.jurisdiction) &&
      // Passed in play: a bill's row, or any row dated from the opening on.
      (row.terms?.enactedByBill !== undefined ||
        row.effectiveDate >= core.startedAt),
  );
  // The next row on the same level and jurisdiction replaces it the day that row takes effect.
  const replacedOn = (row: LawRowInput) =>
    (
      api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .query("bySeries", [
          row.jurisdiction,
          series,
        ]) as unknown as LawRowInput[]
    )
      .filter(
        (other) =>
          other.id !== row.id &&
          other.level === row.level &&
          other.effectiveDate > row.effectiveDate &&
          other.effectiveDate <= core.date,
      )
      .map((other) => other.effectiveDate)
      .sort()[0] ?? null;
  const nameOf = (id: string) => {
    const person = core.people.get(id);
    return person ? `${person.givenName} ${person.familyName}` : "";
  };
  return rows
    .slice()
    .sort(
      (a, b) =>
        b.effectiveDate.localeCompare(a.effectiveDate) ||
        b.id.localeCompare(a.id),
    )
    .map((row) => {
      const reach = lawReach(api, row.id, chain.townPlaceId);
      return {
        lawId: row.id,
        level: row.level,
        value: row.value,
        unit: row.unit ?? "",
        effectiveDate: row.effectiveDate,
        replacedOn: replacedOn(row),
        repeal: row.terms?.repeal === true,
        billId:
          typeof row.terms?.enactedByBill === "string"
            ? row.terms.enactedByBill
            : null,
        records: reach.records,
        fullInTown: {
          people: reach.fullPeopleInTown,
          amountMinor: reach.amountInTownMinor,
        },
        fullElsewhere: {
          people: reach.fullPeopleElsewhere,
          amountMinor: reach.amountElsewhereMinor,
        },
        counted: {
          people: reach.counted,
          amountMinor: reach.amountCountedMinor,
        },
        named: reach.people.slice(0, NAMED).map((p) => ({
          personId: p.personId,
          name: nameOf(p.personId),
          inTown: p.inTown,
          amountMinor: p.amountMinor,
          endedOn: p.endedOn,
        })),
      };
    });
}
