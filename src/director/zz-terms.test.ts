import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { corePlaceByKey } from "../core2/place-lookup";
import type { ModuleRow } from "../core2/module-data";
import { ELECTIONS_MODULE_ID, ballot, ticketOfficeContest, type ContestRow, type FilingRow } from "../core2/modules/elections";
import { offeredRunningMates, ticketStanding } from "../core2/modules/serve-asks";
it("terms", { timeout: 900_000 }, () => {
  setBookkeeping(false);
  const out: string[] = [];
  for (const [key, seed] of [["territory:GU:santa-rita", "11aa22bb33cc44dd"], ["territory:GU:yona", "a7c3e9150b2f6d84"]]) {
    const { core } = buildBenchWorld(seed, gameStartDate(), { twoLevel: true, placeKey: key });
    const api = coreAPI(core);
    const governor = (api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as ContestRow[]).filter((c) => !c.special && /:governor$/.test(c.officeId)).sort((a, b) => a.electionDate.localeCompare(b.electionDate))[0]!;
    const ticket = ticketOfficeContest(api, governor)!;
    const town = corePlaceByKey(key)?.context.jurisdiction.id;
    const player = [...core.people.values()].filter((p) => p.alive && p.placeId === town && p.tier !== "husk" && ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= 35).sort((a, b) => a.id.localeCompare(b.id))[0]!;
    core.playerId = player.id;
    const filing: FilingRow = { id: `filing:${governor.id}:${player.id}`, contestId: governor.id, personId: player.id, filedOn: core.date, filedWith: "x", platform: [], party: ballot(api, governor.id)[0]?.party ?? "Democratic", status: "on-ballot" };
    api.moduleState(ELECTIONS_MODULE_ID).table("filings").put(filing as unknown as ModuleRow);
    out.push(`${key} ${seed} player ${player.id} ${player.givenName} ${player.familyName}`);
    for (const c of offeredRunningMates(api, filing.id)!.choices) {
      const s = ticketStanding(api, filing, ticket, c.id)!;
      out.push(`  ${c.name} ${c.id} lean ${s.lean.toFixed(3)} reason ${s.reason} q ${s.grounds.question} terms ${Object.entries(s.terms).map(([k, v]) => `${k}=${(v as number).toFixed(3)}`).join(" ")}`);
    }
  }
  writeFileSync(process.env.OUT!, out.join("\n"));
});
