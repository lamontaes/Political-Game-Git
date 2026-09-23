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
const phases = new Map<string, number>();
for (const g of rows)
  phases.set(
    g.campaignPhase ?? "-",
    (phases.get(g.campaignPhase ?? "-") ?? 0) + 1,
  );
console.log(
  "campaign phase at the end:",
  [...phases].map(([k, v]) => `${k}=${v}`).join(", "),
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

// How alike childhoods are: which scene IDs children (under 18) were shown,
// across games. A scene every life gets is a shared template.
const childScenes = rows
  .map(
    (g) =>
      new Set(
        (
          (g as { scenes?: { age: number | null; situation: string | null }[] })
            .scenes ?? []
        )
          .filter((s) => s.age !== null && s.age < 18 && s.situation)
          .map((s) => s.situation!),
      ),
  )
  .filter((set) => set.size > 0);
if (childScenes.length > 1) {
  const reach = new Map<string, number>();
  for (const set of childScenes)
    for (const id of set) reach.set(id, (reach.get(id) ?? 0) + 1);
  let overlap = 0;
  let pairs = 0;
  for (let i = 0; i < childScenes.length; i++)
    for (let j = i + 1; j < childScenes.length; j++) {
      const a = childScenes[i]!;
      const b = childScenes[j]!;
      const shared = [...a].filter((id) => b.has(id)).length;
      overlap += shared / (a.size + b.size - shared);
      pairs += 1;
    }
  console.log("");
  console.log(
    `childhoods: ${childScenes.length} lives, ${reach.size} distinct scene IDs, mean pairwise overlap ${((overlap / pairs) * 100).toFixed(1)}% (Jaccard)`,
  );
  for (const [id, n] of [...reach].sort((a, b) => b[1] - a[1]).slice(0, 10))
    console.log(`    ${n}/${childScenes.length} lives: ${id}`);
}
