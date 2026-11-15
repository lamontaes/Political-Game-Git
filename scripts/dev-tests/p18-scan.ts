import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { familyFactsOf } from "../../src/core2/closeness";
setBookkeeping(false);
for (let i = 1; i <= 30; i++) {
  const seed = `scan-${i}`;
  const w = buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: "3972242" });
  const { core } = w; const me = w.playerId!;
  const p = core.people.get(me as any)!;
  const rows = [...(core.households.get(p.householdId)?.memberIds ?? [])].filter((x) => x !== me).map((x) => {
    const o = core.people.get(x as any)!;
    return `${o.givenName}:${familyFactsOf(p).get(x as any)?.relation ?? familyFactsOf(o).get(me as any)?.relation ?? "other"}:${(o.traits["people-mind-v1:risk"] ?? "na")}`;
  });
  console.log(seed, rows.join(" "));
}
