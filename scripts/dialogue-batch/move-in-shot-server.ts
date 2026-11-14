/**
 * The bench, plus one staging route on BENCH_PORT+1: POST /stage makes the
 * player and the nearest single adult in town a dating couple near the top of
 * their climb, as the partnerships writer makes one, so the engine's own
 * monthly review asks the move-in question. For a screenshot of the scene.
 */
import { createServer } from "node:http";
import "../../src/bench/server";
import { benchWorld } from "../../src/bench/handler";
import { moduleState } from "../../src/core2/module-state";
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";

const port = Number(process.env.BENCH_PORT ?? 3000) + 1;
createServer((_req, res) => {
  try {
    const { core } = benchWorld();
    const me = core.playerId! as PersonId;
    const player = core.people.get(me)!;
    if (ageOnDate(makeIsoDate(player.birthDate), makeIsoDate(core.date)) < 18) {
      const born = makeIsoDate(player.birthDate);
      res.end(JSON.stringify({ adultOn: `${Number(born.slice(0, 4)) + 18}${born.slice(4)}` }));
      return;
    }
    const partnered = new Set<string>();
    for (const l of core.familyLinks.values())
      if (l.kind === "partner") for (const id of l.personIds) partnered.add(id);
    const other = [...core.people.values()]
      .filter(
        (r) =>
          r.alive &&
          r.tier !== "husk" &&
          r.id !== me &&
          r.householdId !== player.householdId &&
          r.placeId === player.placeId &&
          !partnered.has(r.id) &&
          !player.familyIds.has(r.id) &&
          ageOnDate(makeIsoDate(r.birthDate), makeIsoDate(core.date)) >= 18 &&
          r.looks?.gender !== player.looks?.gender,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    coreAPI(core).setPartnersV1({
      personIds: [me, other.id],
      together: true,
      source: { tag: "SOURCED", asOf: core.date, citation: "The partnerships writer." },
      facts: { union: "dating" },
    });
    const link = [...core.familyLinks.values()].find(
      (r) => r.kind === "partner" && r.personIds.includes(me),
    )!;
    moduleState(core, "partnerships")
      .table("couples")
      .put({ id: link.id, stage: "dating", since: core.date, progress: 0.999 } as never);
    res.end(JSON.stringify({ date: core.date, other: `${other.givenName} ${other.familyName}`, link: link.id }));
  } catch (error) {
    res.statusCode = 400;
    res.end(String(error));
  }
}).listen(port);
