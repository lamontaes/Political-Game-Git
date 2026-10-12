/**
 * Laws in force: which law applies to each person, business and place at every
 * level, from the start date's real law.
 *
 * At the opening the module loads the real law of every level that covers the
 * town (federal, state, county areas, the place) and puts each later phase on
 * its calendar. On a phase's date it records "law took effect" as a public
 * record; for a minimum wage, every job in the town paying under the new floor
 * is raised to it that day. Later engines read law through `lawInForce`.
 */
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, Source } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  lawChainForPlace,
  startingLawRows,
  type LawChain,
  type LawRowInput,
} from "../laws-starting";
import {
  inForceOn,
  resolveLawInForce,
  type EnactedAuthority,
  type LawInForceAnswer,
} from "../laws-in-force";

export const LAWS_MODULE_ID = "core2-laws-v1";
const CHAIN_ID = "chain";

export const LAWS_MODULE: CoreModule = {
  id: LAWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      laws: {
        indexes: {
          bySeries: { fields: ["jurisdiction", "series"] },
          bySeriesOnly: { fields: ["series"] },
        },
      },
      chain: {},
      /** Laws passed in play (M3 writes them); empty at the opening. */
      enactments: {
        indexes: { bySeries: { fields: ["series"] } },
      },
      /** Each raise the minimum wage made, for the worker's record. */
      raises: {
        indexes: { byPerson: { fields: ["personId"] } },
      },
    },
  },
  onCalendarWork: lawTookEffect,
};

function sourceOf(row: LawRowInput, asOf: string): Source {
  const citation = Array.isArray(row.source)
    ? row.source.join(" ; ")
    : (row.source as string);
  return row.estimate
    ? { tag: "ESTIMATED", citation, asOf, estimatedFrom: citation }
    : { tag: "SOURCED", citation, asOf };
}

/** Register the module on a core and load the town's starting law. */
export function openLaws(core: CoreState): LawChain {
  if (!core.modules.has(LAWS_MODULE_ID)) registerModule(core, LAWS_MODULE);
  const api = coreAPI(core);
  const placeKey = api.state.placeMetadata.placeKey;
  if (!placeKey) throw new Error("Laws need the town's place key.");
  const chain = lawChainForPlace(placeKey);
  const state = api.moduleState(LAWS_MODULE_ID);
  state.table("chain").put({ id: CHAIN_ID, ...chain } as unknown as ModuleRow);
  const calendar = api.moduleCalendar(LAWS_MODULE_ID);
  const today = api.state.date;
  for (const row of startingLawRows(chain)) {
    state.table("laws").put(row as unknown as ModuleRow);
    if (row.effectiveDate > today)
      calendar.schedule({
        key: `effect:${row.id}`,
        date: row.effectiveDate,
        kind: "law-takes-effect",
        source: sourceOf(row, row.retrieved > today ? today : row.retrieved),
        sourceRecordIds: [row.id],
      });
  }
  return chain;
}

export function lawChain(api: CoreAPI): LawChain {
  const chain = api.moduleState(LAWS_MODULE_ID).table("chain").get(CHAIN_ID);
  if (!chain) throw new Error("Laws are not open in this world.");
  return chain as unknown as LawChain;
}

function seriesRows(api: CoreAPI, series: string): readonly LawRowInput[] {
  return api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .query("bySeriesOnly", [series]) as unknown as readonly LawRowInput[];
}

/** The law on a series for the town, on a date (today by default), at every level. */
export function lawInForce(
  api: CoreAPI,
  series: string,
  date: string = api.state.date,
): LawInForceAnswer {
  const chain = lawChain(api);
  return resolveLawInForce({
    series,
    chain,
    date,
    rows: seriesRows(api, series),
    authorityRows: seriesRows(api, "local-minimum-wage-authority"),
    enactedAuthority: api
      .moduleState(LAWS_MODULE_ID)
      .table("enactments")
      .query("bySeries", [
        "local-minimum-wage-authority",
      ]) as unknown as readonly EnactedAuthority[],
    localAverage: seriesRows(api, "local-sales-tax-average"),
  });
}

/**
 * An enacted law: a new dated row at its level, read by `lawInForce` from its
 * effective date like any starting row, and put on the calendar so it takes
 * effect as a public record (and raises pay, for a minimum wage).
 */
export function enactLaw(
  api: CoreAPI,
  input: {
    readonly jurisdiction: string;
    readonly level: LawRowInput["level"];
    readonly series: string;
    readonly value: number;
    readonly unit?: string;
    readonly effectiveDate: string;
    readonly measureId: string;
    readonly citation: string;
    readonly terms?: Readonly<Record<string, unknown>>;
  },
): LawRowInput {
  const row: LawRowInput = {
    id: `law:${input.jurisdiction}:${input.level}:${input.series}:general:${input.effectiveDate}:${input.measureId}`,
    jurisdiction: input.jurisdiction,
    level: input.level,
    series: input.series,
    tier: "general",
    value: input.value,
    effectiveDate: input.effectiveDate,
    endDate: null,
    source: input.citation,
    retrieved: api.state.date,
    estimate: false,
    ...(input.unit ? { unit: input.unit } : {}),
    terms: { ...(input.terms ?? {}), enactedBy: input.measureId },
  };
  api
    .moduleState(LAWS_MODULE_ID)
    .table("laws")
    .put(row as unknown as ModuleRow);
  if (input.effectiveDate > api.state.date)
    api.moduleCalendar(LAWS_MODULE_ID).schedule({
      key: `effect:${row.id}`,
      date: input.effectiveDate,
      kind: "law-takes-effect",
      source: {
        tag: "SOURCED",
        citation: input.citation,
        asOf: api.state.date,
      },
      sourceRecordIds: [row.id],
    });
  return row;
}

/** Every tracked series for the town on a date: the bench's "law here" view. */
export function lawHere(
  api: CoreAPI,
  date: string = api.state.date,
): readonly LawInForceAnswer[] {
  return [
    "minimum-wage",
    "income-tax",
    "sales-tax",
    "property-tax",
    "snap-maximum",
    "unemployment-weekly-maximum",
    "medicaid-match",
  ].map((series) => lawInForce(api, series, date));
}

function lawTookEffect(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind !== "law-takes-effect") return;
  const id = work.sourceRecordIds[0]!;
  const row = api.moduleState(LAWS_MODULE_ID).table("laws").get(id) as
    LawRowInput | undefined;
  if (!row || !inForceOn(row, api.state.date)) return;
  const town = lawChain(api).townPlaceId;
  api.emit({
    id: `law-took-effect:${row.id}`,
    date: api.state.date,
    kind: "law-took-effect",
    personIds: [],
    placeId: town,
    source: work.source,
    publicRecord: true,
    news: true,
    facts: {
      lawId: row.id,
      series: row.series,
      level: row.level,
      jurisdiction: row.jurisdiction,
      tier: row.tier,
      value: String(row.value),
      unit: row.unit ?? "",
    },
  });
  if (row.series === "minimum-wage") raiseToFloor(api, work.source);
}

/**
 * Raise every job in the town paying under the minimum wage now in force.
 * Jobs at an employer outside the town's chain keep their own law.
 */
function raiseToFloor(api: CoreAPI, source: Source): void {
  const answer = lawInForce(api, "minimum-wage");
  const floor = answer.value;
  if (floor === null || !answer.governing) return;
  const core = api.state as CoreState;
  const town = core.visiblePlaceIds;
  const raises = api.moduleState(LAWS_MODULE_ID).table("raises");
  for (const commitment of core.work.commitments.values()) {
    if (commitment.hourlyMinor >= floor) continue;
    if (commitment.endsAt !== undefined && commitment.endsAt <= core.date)
      continue;
    const employer = core.organizations.get(commitment.organizationId);
    if (!employer || (town.size && !town.has(employer.placeId))) continue;
    // stopgapId: SG-GOV-wage-floor-rate-write
    api.stopgap("SG-GOV-wage-floor-rate-write");
    core.work.commitments.set(commitment.id, {
      ...commitment,
      hourlyMinor: floor,
    });
    raises.put({
      id: `raise:${commitment.id}:${core.date}`,
      personId: commitment.personId,
      jobId: commitment.jobId,
      date: core.date,
      fromMinor: commitment.hourlyMinor,
      toMinor: floor,
      lawId: answer.governing.id,
    });
    api.emit({
      id: `minimum-wage-raise:${commitment.id}:${core.date}`,
      date: core.date,
      kind: "pay-raised-to-minimum-wage",
      personIds: [commitment.personId],
      placeId: employer.placeId,
      source,
      facts: {
        jobId: commitment.jobId,
        fromMinor: String(commitment.hourlyMinor),
        toMinor: String(floor),
        lawId: answer.governing.id,
      },
    });
  }
}
