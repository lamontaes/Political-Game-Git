/* eslint-disable @typescript-eslint/no-explicit-any */
// The town's own seats as the game opens them: tsx town-body.ts <name prefix> <state key>
import { createHash } from "node:crypto";
import { placeLocalities } from "../../src/core2/places";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
setBookkeeping(false);
const [arg = "Manchester", state = "US-CT"] = process.argv.slice(2);
const row = [...placeLocalities(state)].find((r) =>
  r.displayName.startsWith(arg),
);
if (!row) throw new Error(`No ${arg} in ${state}`);
const seed = createHash("sha256").update(`${arg}:body`).digest("hex");
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: row.key,
});
const api = coreAPI(w.core);
const offices = api
  .moduleState(OFFICES_MODULE_ID)
  .table("offices")
  .rows() as any[];
console.log(
  row.displayName,
  "offices:",
  offices
    .filter((o) =>
      /local|municipal|town/i.test(`${o.level} ${o.family} ${o.id}`),
    )
    .map(
      (o) =>
        `${o.name ?? o.title} (seats ${o.seats ?? "?"}, ${o.bodyName ?? ""})`,
    )
    .join("; "),
);
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as any[];
console.log(
  "contests:",
  contests
    .filter((c) => c.level === "local")
    .map((c) => c.title)
    .join("; "),
);
