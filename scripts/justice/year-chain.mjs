/* global process, console */
// One year of the played world (the bench's world, every engine, two-level)
// on a seed nobody chose, then every justice case read back as its chain of
// record ids: the act, who knew, the complaint, the investigation's reasons,
// the charge, the verdict, the sentence, the seat vacated, the fine on the
// journal, the news story and the candidacy read.
// With --player-proposes, a town council member is the player and proposes,
// from their seat, raising the minimum wage by --raise cents (the golden
// path's "propose an ordinance"); the year then runs on the player clock,
// the character answering its own choices. Nothing else is forced.
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/justice/year-chain.mjs [--seed S] [--place KEY] [--player-proposes] [--raise 300]
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value_ = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { addDays, makeIsoDate } = await at("src/core2/kernel/dates.ts");
const { coreAPI } = await at("src/core2/state.ts");
const { justiceChains } = await at("src/core2/justice-chain.ts");
const { BenchPlayer } = await at("src/bench/player.ts");
const { seatAct } = await at("src/bench/legislature.ts");
const { lawHere } = await at("src/core2/modules/laws.ts");
const seed = value_(
  "--seed",
  (await import("node:crypto")).randomBytes(8).toString("hex"),
);
const placeKey = value_("--place", undefined);
console.error(`seed ${seed}${placeKey ? ` place ${placeKey}` : ""}`);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const core = world.core;
const end = new Date(`${core.date}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
const endIso = end.toISOString().slice(0, 10);
let proposal = null;
if (args.includes("--player-proposes")) {
  const api = coreAPI(core);
  const offices = api.moduleState("core2-offices-v1");
  // The town's council, else the county board (an unincorporated place's).
  const terms = offices.table("terms").rows();
  const bodies = ["council", "county-board"].flatMap((kind) =>
    offices
      .table("offices")
      .rows()
      .filter((o) => o.kind === kind && o.coversTown),
  );
  let council, member;
  for (const body of bodies) {
    member = terms
      .filter(
        (t) =>
          t.officeId === body.id &&
          t.status === "serving" &&
          t.personId &&
          core.people.get(t.personId)?.alive,
      )
      .sort((a, b) => a.personId.localeCompare(b.personId))[0];
    if (member) {
      council = body;
      break;
    }
  }
  if (!member) {
    console.log(
      JSON.stringify({ seed, place: world.place.key, proposal: "no member" }),
    );
    process.exit(0);
  }
  const wage = lawHere(api).find((row) => row.series === "minimum-wage");
  const value = (wage?.value ?? 0) + Number(value_("--raise", "300"));
  const bill = seatAct(core, member.personId, {
    kind: "draft",
    officeId: council.id,
    series: "minimum-wage",
    value,
  });
  const scheduled =
    bill.status === "blocked"
      ? null
      : seatAct(core, member.personId, { kind: "schedule", billId: bill.id });
  proposal = {
    playerId: member.personId,
    billId: bill.id,
    status: bill.status,
    authority: bill.authority,
    toMinorPerHour: value,
    vote: scheduled?.date ?? null,
  };
  if (!scheduled) {
    console.log(JSON.stringify({ seed, place: world.place.key, proposal }));
    process.exit(0);
  }
  const player = new BenchPlayer(core, world.director);
  player.select(member.personId);
  for (let guard = 0; guard < 20_000 && core.date < endIso; guard++)
    if (player.pollingPlace) player.leavePolls();
    else if (player.packet?.kind === "stop")
      player.resume({ kind: "stop", pauseId: player.packet.pauseId });
    else
      player.advance(
        "calendar",
        addDays(makeIsoDate(player.packet?.at.date ?? core.date), 30),
      );
} else
  while (core.date < endIso) {
    const next = new Date(`${core.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    advanceCore(core, next.toISOString().slice(0, 10));
  }
const api = coreAPI(core);
const crimes = api.moduleState("corruption").table("crimes").rows();
console.log(
  JSON.stringify(
    {
      seed,
      place: world.place.key,
      through: core.date,
      proposal,
      lobbyMeetings: api
        .moduleState("core2-interest-groups-v1")
        .table("meetings")
        .rows()
        .filter((m) => m.annualCostMinor > 0).length,
      bribesOffered: crimes.length,
      crimes,
      bribesTaken: crimes.filter((c) => c.taken).length,
      complaints: api
        .moduleState("core2-justice-v1")
        .table("complaints")
        .rows(),
      investigations: api
        .moduleState("core2-justice-v1")
        .table("investigations")
        .rows(),
      chains: justiceChains(api),
    },
    null,
    1,
  ),
);
