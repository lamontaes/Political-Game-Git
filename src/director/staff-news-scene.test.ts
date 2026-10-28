import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import {
  hireReasons,
  hireStaff,
  servingStaffOf,
  staffCandidates,
  staffOf,
} from "../core2/modules/staff";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// A bill that loses a vote is bad news its sponsor hears from their own
// office. The legislature records the loss for the sponsor (bill-failed: held
// in committee or voted down on the floor), and the staff-news scene fires
// from it with one of the sponsor's aides bringing the news, about that bill.
// Places are drawn in turn until one has a watched sponsor with an aide whose
// bill lost; many places pass no such loss in the window (eight in a row in
// one CI run), so up to 24 are drawn. Most losses come early in the year, before an official's own
// review gets around to hiring, so each watched official with no aide hires
// one on the first day through the staff module's own hiring (the candidate
// its review ranks first), as the electoral test's candidates ask people to
// volunteer. Each loss is read within a week of it, as play reads the news on
// its day: a watched official keeps only their strongest moments older than
// the director's memory window, so a loss read months later may have folded.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 150;
const WEEK = 7;
const ATTEMPTS = 24;

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
    for (const officialId of [...director.ledger.people.keys()].sort()) {
      if (servingStaffOf(api, officialId).length) continue;
      const choice = staffCandidates(api, officialId)
        .map((row) => ({ ...row, score: hireReasons(row).score }))
        .sort(
          (a, b) => b.score - a.score || a.personId.localeCompare(b.personId),
        )[0];
      if (choice)
        hireStaff(
          api,
          { officialId, personId: choice.personId, role: "aide" },
          choice,
        );
    }
    const end = addDays(makeIsoDate(core.date), DAYS);
    const read = new Set<string>();
    // Losses whose own talk was composed and checked (a loss taken into the
    // day's sitting is talked of by that sitting's scene, so it does not count).
    let composed = 0;
    while (core.date < end) {
      advanceCore(
        core,
        [addDays(makeIsoDate(core.date), WEEK), end].sort()[0]!,
      );
      // The week's losses of watched sponsors with an aide who was hired
      // before that day and still serves.
      const losses = [...core.durableLog.values()].filter((row) => {
        if (row.kind !== "bill-failed" || read.has(row.id)) return false;
        const sponsorId = String(row.facts?.sponsorId);
        return (
          director.ledger.people.has(sponsorId as PersonId) &&
          servingStaffOf(api, sponsorId).some((aide) => aide.hiredOn < row.date)
        );
      });
      for (const loss of losses) {
        read.add(loss.id);
        const sponsorId = String(loss.facts!.sponsorId) as PersonId;
        const here = `${where}: ${loss.id}`;
        const book = director.ledger.people.get(sponsorId)!;
        const own = book.schedule.find((row) => row.momentId.includes(loss.id));
        // One sitting covers a day (scheduling.ts): a second loss the aide
        // brings that day is taken into the first one's scene, which cites it.
        const sitting = own?.bindings.some(
          (row) => row.typeKey === "staff-news",
        )
          ? undefined
          : book.schedule.find(
              (row) =>
                row.date === loss.date &&
                row.bindings.some(
                  (other) =>
                    other.typeKey === "staff-news" &&
                    other.joined?.some((row) => row.causeId === loss.id),
                ),
            );
        const entry = sitting ?? own;
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
        // The sitting's own loss is talked of when its turn comes.
        if (sitting) continue;
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
        expect(said, here).toMatch(
          /lost|went down|voted down|out of committee/,
        );
        // The bill and the count are the record's own.
        const bill = result.scene.facts.find((row) => row.key === "bill")!;
        expect(bill.recordIds, here).toContain(loss.id);
        expect(said, here).toContain(bill.text);
        expect(said, here).toContain(tally);
        composed += 1;
      }
    }
    if (composed) return;
    tried.push(place.name);
  }
  throw new Error(
    `no watched sponsor with an aide lost a vote in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
