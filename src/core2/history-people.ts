import opening from "./data/history/opening.json" with { type: "json" };
import { makeIsoDate } from "../simulation/dates";
import { buildDeepPast, DEFAULT_DEEP_PAST_DATA } from "./deep-past";
import { P } from "./parameters";
import { PRE_START_VERSION, type HistoryModule } from "./history-contract";
import type { CoreInput } from "./types";

/** Reuse supplied cohort, kin and job-start builders; never choose life outcomes. */
export function buildRecentLifeHistory(
  input: CoreInput,
  fromInclusive = opening.fromInclusive,
): CoreInput {
  return buildDeepPast(input, {
    fromInclusive,
    data: {
      ...DEFAULT_DEEP_PAST_DATA,
      throughExclusive: input.startedAt,
      eras: [],
    },
  });
}

/** Index existing producer facts once; each coarse step reads only its month. */
export function recentLifeHistoryModule(
  input: CoreInput,
  fromInclusive = opening.fromInclusive,
): HistoryModule {
  const months = new Map<
    string,
    { personId: string; factId: string; date: string; kind: string }[]
  >();
  for (const person of input.people) {
    for (const fact of person.pastFacts ?? []) {
      const date = makeIsoDate(fact.date);
      if (date < fromInclusive || date >= input.startedAt) continue;
      if (date < person.birthDate) {
        // A parent's own dated family record may predate this child's birth.
        // It is supplied context, not an event experienced by this child.
        continue;
      }
      const month = date.slice(P.zero, "YYYY-MM".length);
      const rows = months.get(month) ?? [];
      rows.push({
        personId: person.id,
        factId: fact.id,
        date,
        kind: fact.kind,
      });
      months.set(month, rows);
    }
  }
  return {
    id: "history-people",
    state: {
      schemaVersion: P.one,
      tables: {
        events: {
          indexes: {
            byPerson: { fields: ["personId"] },
            byMonth: { fields: ["month"] },
          },
          validate(row) {
            if (
              typeof row.date !== "string" ||
              typeof row.factId !== "string" ||
              typeof row.personId !== "string" ||
              row.date < fromInclusive ||
              row.date >= input.startedAt
            )
              throw new Error("Invalid recent-life record.");
            makeIsoDate(row.date);
          },
        },
      },
    },
    preStart: {
      version: PRE_START_VERSION,
      phase: "people",
      tier: "monthly",
      step(api, interval) {
        const month = interval.fromInclusive.slice(P.zero, "YYYY-MM".length);
        const table = api.moduleState("history-people").table("events");
        for (const row of months.get(month) ?? []) {
          if (
            row.date < interval.fromInclusive ||
            row.date >= interval.throughExclusive
          )
            continue;
          table.put({
            id: `${row.personId}:${row.factId}`,
            ...row,
            month,
            basis: "supplied-opening-builder-fact",
            economyConsistency: "opening-snapshot-only-until-M1-engine-passes",
          });
        }
      },
    },
  };
}
