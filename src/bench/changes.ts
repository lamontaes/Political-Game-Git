// "What changed": each law that took effect while you played, and who in town
// it reached, from the law-reach records. Read-only.
import { coreAPI } from "../core2/state";
import { reachedBy } from "../core2/law-reach/host";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
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
  return [...(core.logByKind.get("law-took-effect") ?? [])]
    .map((id) => core.durableLog.get(id)!)
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
          name: person
            ? `${person.givenName} ${person.familyName}`
            : row.personId,
          what: row.what,
        };
      });
      // An amount (a wage, a tax rate) shows what it was before.
      const earlier = core.modules.has(LAWS_MODULE_ID)
        ? (
            coreAPI(core)
              .moduleState(LAWS_MODULE_ID)
              .table("laws")
              .query("bySeries", [
                facts.jurisdiction ?? null,
                facts.series ?? null,
              ]) as unknown as LawRowInput[]
          )
            .filter((law) => law.effectiveDate < row.date)
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0]
        : undefined;
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
