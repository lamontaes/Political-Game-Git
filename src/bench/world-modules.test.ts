/**
 * Guard: every finished engine under src/core2/modules runs in the world the
 * player gets. A module object (`*_MODULE`, `*Module`, `create*Module`) or an
 * `open*` call exported there must be installed by `buildBenchWorld` (its
 * own file, the people engines in `peopleModules`, the economy's
 * `WORLD_MODULES`, or the core's own list in `createLifeCore`), or be listed
 * below with the reason it isn't. A module whose file has an `open*` call is
 * installed by that call (it registers the module and puts its work on the
 * calendar), so the call itself must be made.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..");
const MODULES = join(ROOT, "src/core2/modules");
const INSTALLERS = [
  "src/bench/world.ts",
  "src/director/play-modules.ts",
  "src/core2/modules/world.ts",
  "src/core2/life.ts",
];

/** Exported entries that aren't installers, with the reason. */
const EXEMPT: Readonly<Record<string, string>> = {
  openNextCycle:
    "voting's own step after an election (the seat's next contest), not an installer",
  openNextContest:
    "elections' own step once a seat's contest is decided, not an installer",
  openContests:
    "a query (contests whose filing is open today), not an installer",
  openRegional:
    "the macro engine opens the regions itself when it starts (MACRO_MODULE)",
};

const ENTRY =
  /^export (?:const|function) (\w+_MODULE|\w+Module|open[A-Z]\w*|create\w*Module)\b/gm;

const withoutComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const installerSource = INSTALLERS.map((path) =>
  withoutComments(readFileSync(join(ROOT, path), "utf8")),
).join("\n");
const referenced = (name: string) =>
  new RegExp(`\\b${name}\\b`).test(installerSource);

const files = readdirSync(MODULES)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .sort()
  .map((name) => ({
    name,
    entries: [...readFileSync(join(MODULES, name), "utf8").matchAll(ENTRY)].map(
      (match) => match[1]!,
    ),
  }))
  .filter((file) => file.entries.length > 0);

describe("every finished module runs in the played world", () => {
  it("finds the modules", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("$name is installed by buildBenchWorld", ({ entries }) => {
    const live = entries.filter((entry) => !EXEMPT[entry]);
    // A file whose every entry is exempt has nothing to install.
    if (!live.length) {
      expect(entries.every((entry) => EXEMPT[entry])).toBe(true);
      return;
    }
    const opens = live.filter((entry) => entry.startsWith("open"));
    // A file with an open call is installed by making that call.
    const missing = opens.length
      ? opens.filter((entry) => !referenced(entry))
      : live.some(referenced)
        ? []
        : live;
    expect(
      missing,
      `not installed and not exempt: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("names no exemption that no longer exists", () => {
    const all = new Set(files.flatMap((file) => file.entries));
    expect(Object.keys(EXEMPT).filter((name) => !all.has(name))).toEqual([]);
  });
});
