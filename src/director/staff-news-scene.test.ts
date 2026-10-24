import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { servingStaffOf, staffOf } from "../core2/modules/staff";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A bill that loses a vote is bad news its sponsor hears from their own
// office. The legislature records the loss for the sponsor (bill-failed: held
// in committee or voted down on the floor), and the staff-news scene fires
// from it with one of the sponsor's aides bringing the news, about that bill.
// Places are drawn in turn until one has a watched sponsor with an aide whose
// bill lost.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;
const ATTEMPTS = 4;

it(`a bill that loses its vote is the sponsor's staff-news scene, about that bill (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "staff-news-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Every official on the town's ballot who is a full person.
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
    // The losses of watched sponsors with an aide who was hired before that
    // day and still serves.
    const losses = [...core.durableLog.values()].filter((row) => {
      if (row.kind !== "bill-failed") return false;
      const sponsorId = String(row.facts?.sponsorId);
      return (
        director.ledger.people.has(sponsorId as PersonId) &&
        servingStaffOf(api, sponsorId).some((aide) => aide.hiredOn < row.date)
      );
    });
    if (!losses.length) {
      tried.push(place.name);
      continue;
    }
    for (const loss of losses) {
      const sponsorId = String(loss.facts!.sponsorId) as PersonId;
      const here = `${where}: ${loss.id}`;
      const book = director.ledger.people.get(sponsorId)!;
      const entry = book.schedule.find((row) => row.momentId.includes(loss.id));
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "staff-news",
      );
      expect(binding, `${here}: no staff-news scene`).toBeTruthy();
      const aides = staffOf(api, sponsorId).map((row) => row.personId);
      const aide = binding!.roles.find((row) => row.role === "aide")!;
      expect(aide.personIds.length, here).toBe(1);
      expect(
        aides,
        `${here}: the aide is one of the sponsor's staff`,
      ).toContain(aide.personIds[0]);
      // The aide says the bill lost, in the lines that play, as ordinary
      // play says them, and the talk stands on the loss.
      const result = purposeScene(core, director, sponsorId, entry!);
      expect(result?.kind, here).toBe("composed");
      if (result?.kind !== "composed") continue;
      expect(result.scene.cause.id, here).toBe(loss.id);
      expect(
        result.scene.facts.find((row) => row.key === "bill-lost")?.recordIds,
        here,
      ).toContain(loss.id);
      const tally = `${loss.facts!.no} to ${loss.facts!.yes}`;
      const said = result.scene.talk.state.text;
      expect(said, here).toMatch(/lost|went down|voted down|out of committee/);
      // The bill and the count are the record's own.
      const bill = result.scene.facts.find((row) => row.key === "bill")!;
      expect(bill.recordIds, here).toContain(loss.id);
      expect(said, here).toContain(bill.text);
      expect(said, here).toContain(tally);
    }
    return;
  }
  throw new Error(
    `no watched sponsor with an aide lost a vote in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
