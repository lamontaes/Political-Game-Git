/**
 * Plays an official's meeting and prints where it is set and how it opens.
 * Part 1: Sheridan WY (5669845), seed 7, a year watching a legislator and a
 * county official; every scene type they were staged for, once each.
 * Part 2: Frankfort KY (2128900), the governor's briefing room, played as the
 * player governor to the day of FEMA disaster 4860.
 * Run: node --import tsx scripts/words/office-arrival-replay.ts > played-<sha8>.md
 */
import { execSync } from "node:child_process";
import { BenchPlayer } from "../../src/bench/player";
import { ordersDecide, ordersView } from "../../src/bench/office";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { memberKey } from "../../src/core2/modules/legislature";
import { OFFICES_MODULE_ID, townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { composeScene } from "../../src/director/scene";
import { purposeScene } from "../../src/director/purpose-scene";

const sha = execSync("git rev-parse HEAD").toString().trim();
console.log(`# Office arrivals, head ${sha}\n`);

// Part 1
{
  const { core, director } = buildBenchWorld("7", gameStartDate(), {
    twoLevel: true,
    placeKey: "5669845",
  });
  console.log("## Sheridan WY (5669845), seed 7, one year\n");
  const state = coreAPI(core).moduleState(OFFICES_MODULE_ID);
  const offices = state.table("offices").rows() as unknown as {
    id: string;
    kind: string;
  }[];
  const serving = (
    state.table("terms").rows() as unknown as {
      personId: string | null;
      officeId: string;
      status: string;
    }[]
  )
    .filter(
      (r) =>
        r.status === "serving" &&
        r.personId &&
        core.people.get(r.personId as PersonId)?.alive,
    )
    .map((r) => ({
      personId: r.personId as PersonId,
      kind: offices.find((o) => o.id === r.officeId)?.kind ?? "",
    }))
    .sort((a, b) => a.personId.localeCompare(b.personId));
  const watched = [
    ["legislator", serving.find((r) => r.kind === "legislature-lower")],
    ["county official", serving.find((r) => r.kind === "county-board")],
  ] as const;
  for (const [, row] of watched) director.watch(core, row!.personId);
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  for (const [label, row] of watched) {
    console.log(`### ${label} (${row!.kind}) ${row!.personId}\n`);
    const seen = new Set<string>();
    for (const entry of director.ledger.people.get(row!.personId)!.schedule) {
      const binding = entry.bindings[0];
      if (!binding) continue;
      const key = `${binding.typeKey}|${binding.setting.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const scene = composeScene(core, director, row!.personId, entry);
      console.log(
        `- ${binding.typeKey} (${binding.setting.kind} ${binding.setting.recordId}${(binding.setting as { seat?: boolean }).seat ? ", the seat" : ""}): ${scene?.narration[0]?.text ?? "(no narration)"}`,
      );
    }
    console.log("");
  }
}

// Part 2
{
  setBookkeeping(false);
  const PLACE = "2128900";
  const SEED =
    "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9";
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const governor = townSeats(api).find(
    (s) => s.office.kind === "governor",
  )!.holder;
  const player = new BenchPlayer(core, world.director);
  player.select(memberKey(governor));
  const hazards = () =>
    [...(core.logByKind.get("hazard.disaster") ?? [])].filter(
      (id) => core.durableLog.get(id)?.facts?.disasterNumber === "4860",
    );
  for (let guard = 0; guard < 400 && !hazards().length; guard += 1) {
    const packet = player.packet;
    if (player.pollingPlace) player.leavePolls();
    else if (packet?.kind === "stop") {
      for (const item of ordersView(core))
        ordersDecide(core, item.entryId, "decline");
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    } else if (packet?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else player.advance("day");
  }
  const playerId = player.personId!;
  if (!world.director.ledger.people.has(playerId))
    world.director.watch(core, playerId);
  const offered = core.durableLog.get(`emergency-offered:${hazards()[0]}`)!;
  let entry;
  for (let day = 0; day < 4 && !entry; day += 1) {
    entry = world.director.ledger.people
      .get(playerId)
      ?.schedule.find((row) => row.momentId.includes(offered.id));
    if (!entry) {
      if (player.packet?.kind === "stop") break;
      player.advance("day");
    }
  }
  console.log(`## Frankfort KY (${PLACE}), the governor's briefing room\n`);
  if (!entry) console.log("no scene staged");
  else {
    const binding = entry.bindings.find(
      (b) => b.typeKey === "emergency-briefing",
    )!;
    const scene = purposeScene(core, world.director, playerId, entry, {
      typeKey: "emergency-briefing",
    });
    const org = core.organizations.get(binding.setting.recordId);
    console.log(
      `- emergency-briefing (${binding.setting.kind} ${binding.setting.recordId}${org ? ` "${org.name}" ${org.kind}` : ""}, cause ${String(offered.facts?.officeId ?? "")}): ${scene?.kind === "composed" ? scene.scene.narration[0]?.text : JSON.stringify(scene)?.slice(0, 200)}`,
    );
  }
}
