/** Groups findings across games by signature: how many games, where, which persona. */
import { readFileSync } from "node:fs";
import type { GameResult } from "./driver";

const file = process.argv[2]!;
const rows = readFileSync(file, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as GameResult);
const groups = new Map<
  string,
  {
    kind: string;
    signature: string;
    games: Set<string>;
    states: Set<string>;
    personas: Set<string>;
    example: GameResult["findings"][number];
    exampleGame: string;
  }
>();
for (const game of rows)
  for (const f of game.findings ?? []) {
    const key = `${f.kind}|${f.signature}`;
    const g = groups.get(key) ?? {
      kind: f.kind,
      signature: f.signature,
      games: new Set(),
      states: new Set(),
      personas: new Set(),
      example: f,
      exampleGame: `${game.spec.placeName}, ${game.spec.usps} (${game.spec.persona}, age ${game.spec.startAge}, seed ${game.spec.seed})`,
    };
    g.games.add(game.spec.id);
    g.states.add(game.spec.usps);
    g.personas.add(game.spec.persona);
    groups.set(key, g);
  }
const ended = new Map<string, number>();
for (const g of rows) ended.set(g.ended, (ended.get(g.ended) ?? 0) + 1);
const years = rows.reduce(
  (s, g) =>
    s +
    (g.endDate && g.startDate
      ? (Date.parse(g.endDate) - Date.parse(g.startDate)) / 3.156e10
      : 0),
  0,
);
console.log(
  `games ${rows.length}; simulated years ${years.toFixed(1)}; states ${new Set(rows.map((r) => r.spec.usps)).size}; generations>1: ${rows.filter((r) => r.generationsPlayed > 1).length}; filed: ${rows.filter((r) => r.offices?.length).length}`,
);
console.log("ended:", [...ended].map(([k, v]) => `${k}=${v}`).join(", "));
const actions = new Map<string, number>();
for (const g of rows)
  for (const [k, v] of Object.entries(g.actions ?? {}))
    actions.set(k, (actions.get(k) ?? 0) + v);
console.log(
  "actions:",
  [...actions]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(", "),
);
console.log("");
for (const g of [...groups.values()].sort(
  (a, b) => b.games.size - a.games.size,
)) {
  console.log(
    `[${g.kind}] ${g.games.size} games, ${g.states.size} states (${[...g.personas].join("/")}): ${g.signature}`,
  );
  console.log(
    `    e.g. ${g.exampleGame} on ${g.example.date} after ${g.example.action}`,
  );
  if (process.argv.includes("--detail"))
    console.log(
      `    ${g.example.detail.split("\n").slice(0, 6).join("\n    ")}`,
    );
}
