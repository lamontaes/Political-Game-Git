import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { BUDGETS_MODULE_ID } from "../core2/modules/budgets";
import { BRIBE_OFFERED, considerBribe } from "../core2/modules/corruption";
import { coreAPI } from "../core2/state";
import { purposeScene } from "./purpose-scene";

// The one offering money says what they want (Words lead, Nov 14: "the
// person offering does not spell out the money or the deal, but the path
// must name what they want"). The offer record carries the favor and the
// thing itself; the scene reads it as `contract` (the award, by the work it
// pays for) or `bill`, and as `wanted` for lines either side shares. Pinned
// to one drawn place; the offer goes through the engine's own
// `considerBribe` with the subject the contracts engine writes
// (contracts.ts: `contract:<government>:<line>:<date>`).
setBookkeeping(false);
const place = drawPlace("bribe-wanted:0", "bribe-wanted-named");
const where = `${place.name} (${place.key}), draw bribe-wanted:0`;

describe("a bribe offer names what it wants", () => {
  it("names the contract award by the work it pays for, from the offer record", () => {
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const api = coreAPI(core);
    if (!director.ledger.people.has(playerId!)) director.watch(core, playerId!);
    const player = core.people.get(playerId!)!;
    const gov = api
      .moduleState(BUDGETS_MODULE_ID)
      .table("governments")
      .rows()[0] as unknown as { id: string };
    expect(gov, where).toBeTruthy();
    const subjectId = `contract:${gov.id}:highways:${core.date}`;
    const offerers = [...core.people.values()]
      .filter(
        (row) =>
          row.id !== playerId &&
          row.alive &&
          row.placeId === player.placeId &&
          row.liquidMinor > 0,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let crimeId: string | undefined;
    for (const offerer of offerers.slice(0, 40)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: playerId!,
        stakeMinor: offerer.liquidMinor * 1000,
        subjectId,
      });
      if (record?.offered) {
        crimeId = record.id;
        break;
      }
    }
    expect(crimeId, `${where}: no resident offered`).toBeTruthy();
    const event = core.durableLog.get(`${BRIBE_OFFERED}:${crimeId}`)!;
    expect(event.facts, where).toMatchObject({
      favor: "contract",
      contractId: subjectId,
      contractLine: "highways",
    });
    expect(event.facts.billId, where).toBeUndefined();

    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(playerId!)!
      .schedule.find((row) => row.momentId.includes(event.id));
    expect(entry, `${where}: no bribe-offer moment`).toBeTruthy();
    const scene = purposeScene(core, director, playerId!, entry!, {
      typeKey: "bribe-offer",
    });
    expect(scene?.kind, where).toBe("composed");
    if (scene?.kind !== "composed") return;
    const said = (key: string) =>
      scene.scene.facts.find((row) => row.key === key);
    expect(said("favor-contract"), where).toBeTruthy();
    expect(said("contract")?.text, where).toBe("the highways contract");
    expect(said("contract")?.recordIds, where).toContain(subjectId);
    expect(said("wanted")?.text, where).toBe("the highways contract");
    expect(said("favor-vote"), where).toBeFalsy();
    process.stdout.write(
      `BRIBE WANTED ${where}: ${said("wanted")?.text}; ${scene.scene.talk.state.text}\n`,
    );
  }, 240_000);
});
