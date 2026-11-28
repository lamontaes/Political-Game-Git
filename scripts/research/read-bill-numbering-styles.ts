/**
 * Reads the table in src/core2/data/legislature/bill-numbering-styles.json
 * back out of the recorded research: the verified enacted-bill samples for all
 * 50 states, the state legislature corpus's chamber names, and each chamber's
 * recorded starting number and numbering period where a source states them
 * (decisions OCD-LEG-NUM-001 and -002). The lock test compares the two, so the
 * data file cannot drift from its sources.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { StateBillNumberingStyle } from "../../src/core2/bill-numbering-style";
import {
  deriveStateBillNumberingStyle,
  type BillNumberingPeriodRow,
  type BillNumberingStartRow,
  type BillSampleRow,
  type ChamberNameRow,
} from "./bill-numbering-derivation";

const root = resolve(import.meta.dirname, "../..");
const SAMPLES = resolve(root, "data/research/bill-samples/state");
const CORPUS = resolve(root, "data/source/state-legislatures/corpus.json");
const STARTS = resolve(root, "data/research/bill-numbering-starts.json");

interface CorpusRecord {
  readonly stateName: string;
  readonly stateUsps: string;
  readonly chambers?: readonly {
    readonly chamberKey: string;
    readonly name?: { readonly state?: string; readonly value?: unknown };
  }[];
}

function slug(stateName: string): string {
  return stateName.toLowerCase().replace(/\s+/g, "-");
}

export function deriveAllStateStyles(): StateBillNumberingStyle[] {
  const corpus = JSON.parse(readFileSync(CORPUS, "utf8")) as CorpusRecord[];
  const files = new Set(readdirSync(SAMPLES));
  const { starts, periods } = JSON.parse(readFileSync(STARTS, "utf8")) as {
    readonly starts: readonly BillNumberingStartRow[];
    readonly periods: readonly BillNumberingPeriodRow[];
  };
  return corpus
    .map((record) => {
      const file = `${slug(record.stateName)}.json`;
      if (!files.has(file))
        throw new Error(`No recorded bill samples for ${record.stateName}.`);
      const samples = JSON.parse(
        readFileSync(resolve(SAMPLES, file), "utf8"),
      ) as BillSampleRow[];
      const names: ChamberNameRow[] = [];
      for (const chamber of record.chambers ?? []) {
        if (chamber.name?.state !== "KNOWN") continue;
        if (typeof chamber.name.value !== "string") continue;
        if (chamber.chamberKey === "legislature") continue;
        names.push({
          role: chamber.chamberKey === "senate" ? "upper" : "lower",
          name: chamber.name.value,
        });
      }
      return deriveStateBillNumberingStyle(
        `US-${record.stateUsps}`,
        samples.map((row) => ({
          bill_number: row.bill_number,
          session: row.session,
        })),
        names,
        starts,
        periods,
      );
    })
    .sort((a, b) => a.jurisdictionKey.localeCompare(b.jurisdictionKey));
}
