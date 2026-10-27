/**
 * Which screens each law shows on (wiring-audit: "wired is not seen"; pool
 * item laws-matrix-row-names-its-screen). One world from buildBenchWorld in a
 * place drawn from all 56 plays a stretch of days, then every law in the
 * catalog is looked for through the bench's own screen views, the same
 * functions the play page's routes answer with: Politics → Issues
 * (governmentView), Politics → Budgets (budgetView), Politics → Your office
 * for a sitting local and state member (seatView), Calendar (calendarItems)
 * and News (the stories the player heard and the town's public record). Each
 * screen that shows a law names the record it read. matrix.ts carries the
 * result on every row.
 *
 *   node --import tsx scripts/law-wiring/screens.ts [--seeds <text>,<text>] [--days 180] [--out docs/reports/law-wiring-screens.json]
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { drawPlace } from "../core2-year/place";
import { budgetView } from "../../src/bench/budget";
import { calendarItems, heardItems, newsItems } from "../../src/bench/calendar";
import { governmentView } from "../../src/bench/government";
import { seatView } from "../../src/bench/legislature";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { allLaws, type LawEntry } from "./catalog";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** A screen that shows a law, by the play page's title, and the record it read. */
export interface Seen {
  readonly screen: string;
  readonly evidence: string;
}

/** One played world the screens were read in. */
export interface PlaceRead {
  readonly place: { key: string; name: string; seed: string };
  readonly runSeed: string;
  readonly from: string;
  readonly through: string;
  readonly player: string;
  readonly members: Readonly<Record<string, string>>;
  readonly shown: number;
}

export interface ScreensRun {
  readonly about: string;
  readonly places: readonly PlaceRead[];
  /** Each law's screens in any of the places, each with the record it read there. */
  readonly laws: Readonly<Record<string, readonly Seen[]>>;
}

/** The policy key a screen's row names for a law: its question, series or budget line. */
function keysOf(law: LawEntry): { series: string | null; line: string | null } {
  if (law.kind === "budget-line")
    return { series: null, line: law.key.slice("budget-line:".length) };
  return { series: law.series ?? law.key, line: null };
}

/** A sitting member of a body of two or more seats, at each level group, who is a full person. */
function sittingMembers(core: CoreState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { office, holder } of townSeats(coreAPI(core))) {
    const group =
      office.level === "state" || office.level === "federal"
        ? office.level
        : "local";
    const personId = holder?.personId;
    if (out[group] || !personId || !core.people.has(personId)) continue;
    if (seatView(core, personId).bodies.length) out[group] = personId;
  }
  return out;
}

export function lawScreens(
  core: CoreState,
  player: string,
  members: Readonly<Record<string, string>>,
) {
  const laws = new Map<string, Seen[]>();
  const seen = (key: string, screen: string, evidence: string) => {
    const list = laws.get(key) ?? [];
    if (!list.some((row) => row.screen === screen))
      list.push({ screen, evidence });
    laws.set(key, list);
  };
  const all = allLaws();
  const bySeries = new Map<string, LawEntry>();
  const byLine = new Map<string, LawEntry>();
  for (const law of all) {
    const { series, line } = keysOf(law);
    if (series) bySeries.set(series, law);
    if (line) byLine.set(line, law);
  }

  // Politics → Issues: every law in force here, each level's row.
  for (const law of governmentView(core, player).law) {
    const entry = bySeries.get(law.series);
    const row = law.levels.find((level) => level.row)?.row;
    if (entry && row) seen(entry.key, "Politics → Issues", row.id);
  }
  // Politics → Budgets: each government's latest budget, line by line.
  for (const gov of budgetView(core, player).governments)
    for (const row of gov.latest?.spending ?? []) {
      const entry = byLine.get(row.line);
      if (entry)
        seen(
          entry.key,
          "Politics → Budgets",
          `${gov.id} fiscal year ${gov.latest!.fiscalYear}: ${row.line}`,
        );
    }
  // Politics → Your office: the bills a sitting member can draft.
  for (const [group, personId] of Object.entries(members))
    for (const body of seatView(core, personId).bodies)
      for (const menu of body.menus)
        for (const item of menu.items) {
          const entry = item.line
            ? byLine.get(item.line)
            : bySeries.get(item.question ?? item.series ?? "");
          if (entry)
            seen(
              entry.key,
              "Politics → Your office",
              `${group} member ${personId}, ${body.officeId}, menu ${menu.id}`,
            );
        }
  // Calendar: a law waiting on its effective date.
  for (const item of calendarItems(core, player))
    if (item.kind === "law-takes-effect") {
      const entry = bySeries.get(item.title);
      if (entry) seen(entry.key, "Calendar", item.recordId);
    }
  // News: the stories the player heard and the town's public record.
  for (const row of [
    ...heardItems(core, player),
    ...newsItems(core).filter((item) => item.visibility === "public"),
  ]) {
    const facts = (row.facts ?? {}) as Record<string, unknown>;
    for (const value of Object.values(facts)) {
      if (typeof value !== "string") continue;
      const entry = bySeries.get(value) ?? byLine.get(value);
      if (entry) seen(entry.key, "News", row.id);
    }
  }
  return Object.fromEntries(
    all.map((law) => [law.key, laws.get(law.key) ?? []] as const),
  );
}

/** One world: a place drawn from all 56 on the run seed, played, then read. */
function readPlace(runSeed: string, days: number) {
  const place = drawPlace(runSeed, "law-screens");
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = built;
  const player = built.playerId ?? built.residents[0]!.id;
  const from = makeIsoDate(core.date);
  advanceCore(core, addDays(from, days));
  const members = sittingMembers(core);
  const laws = lawScreens(core, player, members);
  const read: PlaceRead = {
    place: { key: place.key, name: place.name, seed: place.seed },
    runSeed,
    from,
    through: makeIsoDate(core.date),
    player,
    members,
    shown: Object.values(laws).filter((list) => list.length).length,
  };
  return { read, laws };
}

function main() {
  setBookkeeping(false);
  const seeds = (arg("seeds") ?? randomBytes(8).toString("hex")).split(",");
  const days = Number(arg("days") ?? 180);
  const out = arg("out") ?? "docs/reports/law-wiring-screens.json";
  const places: PlaceRead[] = [];
  const laws: Record<string, Seen[]> = {};
  // One world at a time, each let go before the next is built.
  for (const runSeed of seeds) {
    const { read, laws: here } = readPlace(runSeed, days);
    places.push(read);
    for (const [key, list] of Object.entries(here)) {
      const all = (laws[key] ??= []);
      for (const row of list)
        if (!all.some((s) => s.screen === row.screen))
          all.push({
            screen: row.screen,
            evidence: `${read.place.name}: ${row.evidence}`,
          });
    }
    console.log(
      `${read.place.name} (${read.place.key}), run seed ${runSeed}, ${read.from} to ${read.through}: ${read.shown} of ${Object.keys(here).length} laws shown on a screen; members ${JSON.stringify(read.members)}`,
    );
  }
  const run: ScreensRun = {
    about:
      "Which screens each law shows on, read through the bench's own screen views after a stretch of play in each drawn place (scripts/law-wiring/screens.ts).",
    places,
    laws,
  };
  writeFileSync(out, `${JSON.stringify(run, null, 2)}\n`);
  const byScreen = new Map<string, number>();
  for (const list of Object.values(laws))
    for (const row of list)
      byScreen.set(row.screen, (byScreen.get(row.screen) ?? 0) + 1);
  console.log(
    `Together: ${Object.values(laws).filter((list) => list.length).length} of ${Object.keys(laws).length} laws shown on a screen`,
  );
  for (const [screen, count] of byScreen) console.log(`  ${screen}: ${count}`);
  console.log(
    `  on no screen: ${Object.entries(laws)
      .filter(([, list]) => !list.length)
      .map(([key]) => key)
      .join(", ")}`,
  );
}

if (process.argv[1]?.endsWith("screens.ts")) main();
