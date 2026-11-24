import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { officeActKits } from "../../src/core2/office-day-registry";
import { worldRecords } from "../../src/core2/snapshot";
import baseline from "./daily-register-baseline.json";

/**
 * Not everything every day, and summaries are automatic (owner, Nov 10;
 * .agents/rules/cadence-and-summaries.md). Every daily step an engine runs
 * (a module's or an office kit's onDay or onAfterDay) and every table a world
 * keeps (each core field, module table and world part, as dev mode's records
 * proof sees them) has a line in docs/design/daily-register.md. A daily step,
 * or a table of kind `grows`, is approved by name by the coordinator or the
 * CTO; only the entries main held on Nov 11 (daily-register-baseline.json)
 * may stay unapproved, and that list only shrinks.
 */

const ROOT = path.resolve(__dirname, "../..");
const REGISTER = "docs/design/daily-register.md";
const seed = process.env.DAILY_REGISTER_SEED ?? randomBytes(8).toString("hex");

type Entry = { id: string; section: "steps" | "tables"; cells: string[] };

/** The register's rows: a table line whose first cell is a backquoted id. */
export function registerEntries(markdown: string): Entry[] {
  let section: Entry["section"] | undefined;
  const out: Entry[] = [];
  for (const line of markdown.split("\n")) {
    if (/^##\s+Daily steps/i.test(line)) section = "steps";
    else if (/^##\s+Kept tables/i.test(line)) section = "tables";
    else if (/^##\s/.test(line)) section = undefined;
    const row = /^\|\s*`([^`]+)`\s*\|(.*)\|\s*$/.exec(line);
    if (!row || !section) continue;
    out.push({
      id: row[1]!,
      section,
      cells: row[2]!.split("|").map((cell) => cell.trim()),
    });
  }
  return out;
}

/** An entry is approved when its last cell names the coordinator or the CTO. */
export const approved = (entry: Entry): boolean =>
  /approved:\s*(Fable B|CTO)\b/i.test(entry.cells.at(-1) ?? "");

/** A table needs approval only when it grows with no fold. */
export const needsApproval = (entry: Entry): boolean =>
  entry.section === "steps" || /^grows\b/i.test(entry.cells[0] ?? "");

describe("the daily register", () => {
  const place = drawPlace(seed, "daily-register");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const steps: string[] = [];
  for (const module of core.modules.values()) {
    if (module.onDay) steps.push(`${module.id}.onDay`);
    if (module.onAfterDay) steps.push(`${module.id}.onAfterDay`);
  }
  for (const kit of officeActKits()) {
    if (kit.onDay) steps.push(`office-kit:${kit.id}.onDay`);
    if (kit.onAfterDay) steps.push(`office-kit:${kit.id}.onAfterDay`);
  }
  const records = worldRecords(core);
  const tables = [
    ...Object.keys(records.core).map((field) => `core.${field}`),
    ...[...core.modules.values()].flatMap((module) =>
      Object.keys(module.state?.tables ?? {}).map(
        (table) => `${module.id}.${table}`,
      ),
    ),
    ...Object.keys(records.parts).map((id) => `part.${id}`),
  ];
  const entries = registerEntries(
    readFileSync(path.join(ROOT, REGISTER), "utf8"),
  );
  const listed = new Map(entries.map((entry) => [entry.id, entry]));
  const where = `${place.name}, seed ${seed}`;

  it(`lists every daily step an engine runs (${where})`, () => {
    const missing = steps.filter((id) => listed.get(id)?.section !== "steps");
    expect(
      missing.map(
        (id) =>
          `| \`${id}\` | <cadence> | <what it does each day> | <why it must be daily> | <what the player sees> | <seconds a year> | <approved: Fable B or CTO, date, #pr> |`,
      ),
      `Add these lines under "Daily steps" in ${REGISTER} (skill cadence-and-summaries), or move the step onto its calendar date`,
    ).toEqual([]);
  });

  it(`lists every table a world keeps (${where})`, () => {
    const missing = tables.filter((id) => listed.get(id)?.section !== "tables");
    expect(
      missing.map(
        (id) =>
          `| \`${id}\` | <per thing, folds or grows> | <what one row is, or its fold and readers' windows> | <rows a year> | <approved, if it grows> |`,
      ),
      `Add these lines under "Kept tables" in ${REGISTER} (skill cadence-and-summaries)`,
    ).toEqual([]);
  });

  it("keeps no line for a step or table that is gone", () => {
    const present = new Set([...steps, ...tables]);
    const stale = entries
      .filter((entry) => !present.has(entry.id))
      .map((entry) => entry.id);
    expect(
      stale,
      `Remove these lines from ${REGISTER}, and their ids from tests/guards/daily-register-baseline.json`,
    ).toEqual([]);
  });

  it("approves every new daily step and growing table by name", () => {
    const held = new Set(baseline.unapproved);
    const unapproved = entries
      .filter((entry) => needsApproval(entry) && !approved(entry))
      .map((entry) => entry.id)
      .filter((id) => !held.has(id));
    expect(
      unapproved,
      "Move the step to its cadence or fold the table, or ask Fable B or the CTO to approve it by name on the pull request",
    ).toEqual([]);
  });

  it("holds the Nov 11 baseline only to entries still unapproved", () => {
    const still = new Set(
      entries
        .filter((entry) => needsApproval(entry) && !approved(entry))
        .map((entry) => entry.id),
    );
    expect(
      baseline.unapproved.filter((id) => !still.has(id)),
      "Delete these ids from tests/guards/daily-register-baseline.json: the list only shrinks",
    ).toEqual([]);
  });
});
