// "What changed": each law that took effect while you played, and who in town
// it reached, from the law-reach records. Read-only.
import { fullNameOf } from "../english/plain-words.mjs";
import { historyOf } from "../core2/past";
import { coreAPI } from "../core2/state";
import { reachedBy } from "../core2/law-reach/host";
import { LAW_STATUTE, LAWS_MODULE_ID } from "../core2/modules/laws";
import type { LawRowInput } from "../core2/laws-starting";
import type { CoreState } from "../core2/types";

// Engineering page size for the names shown per law, not a model value.
const NAMED = 4;

/** Laws a body enacted that haven't taken effect yet: each with the date it will. */
function enactedAhead(core: CoreState) {
  if (!core.modules.has(LAWS_MODULE_ID)) return [];
  return (
    coreAPI(core)
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as (LawRowInput & {
      terms?: { enactedBy?: string };
    })[]
  )
    .filter((law) => law.terms?.enactedBy && law.effectiveDate > core.date)
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .map((law) => ({
      id: law.id,
      date: law.effectiveDate,
      series: law.series,
      level: law.level,
      jurisdiction: law.jurisdiction,
      value: String(law.value),
      unit: law.unit ?? null,
      measure: law.terms!.enactedBy!,
    }));
}

export function lawChanges(core: CoreState, personId: string) {
  return { ahead: enactedAhead(core), took: lawsTook(core, personId) };
}

function lawsTook(core: CoreState, personId: string) {
  const api = coreAPI(core);
  // A series' law rows as the laws engine's history tells them (`law.statute`),
  // each opened by its id, read once a series.
  const table = core.modules.has(LAWS_MODULE_ID)
    ? api.moduleState(LAWS_MODULE_ID).table("laws")
    : undefined;
  const statutes = new Map<string, LawRowInput[]>();
  const statutesOf = (series: string): LawRowInput[] => {
    if (!table || !series) return [];
    let rows = statutes.get(series);
    if (!rows) {
      rows = historyOf(
        core,
        { nation: true },
        { kinds: [LAW_STATUTE], about: series },
      )
        .filter((event) => event.facts?.series === series)
        .flatMap((event) => {
          const law = table.get(event.facts?.lawId ?? "") as unknown as
            LawRowInput | undefined;
          return law ? [law] : [];
        });
      statutes.set(series, rows);
    }
    return rows;
  };
  return historyOf(
    core,
    { nation: true },
    { kinds: ["law-took-effect"], from: "played" },
  )
    .map((event) => core.durableLog.get(event.id as never)!)
    .filter(Boolean)
    .reverse()
    .map((row) => {
      const facts = (row as { facts?: Record<string, string> }).facts ?? {};
      const reached =
        facts.series && facts.lawId
          ? reachedBy(api, facts.series, facts.lawId)
          : [];
      const names = reached.slice(0, NAMED).map((row) => {
        const person = core.people.get(row.personId);
        return {
          personId: row.personId,
          name: person ? fullNameOf(person) : row.personId,
          what: row.what,
        };
      });
      // An amount (a wage, a tax rate) shows what it was before: the series'
      // law in the same jurisdiction that governed from the latest day before.
      const earlier = statutesOf(facts.series ?? "")
        .filter(
          (law) =>
            law.jurisdiction === facts.jurisdiction &&
            law.effectiveDate < row.date,
        )
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      return {
        id: row.id,
        was: earlier ? String(earlier.value) : null,
        unit: earlier?.unit ?? null,
        date: row.date,
        series: facts.series ?? "",
        level: facts.level ?? "",
        jurisdiction: facts.jurisdiction ?? "",
        value: facts.value ?? "",
        reached: reached.length,
        names,
        you:
          reached.find((effect) => effect.personId === personId)?.what ?? null,
      };
    });
}
