import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";

// A central bank governor whom the president names and the Senate confirms
// has an appointment scene that opens with the president announcing it
// (owner, Oct 15: scenes fire from recorded causes). The cause is the
// board's appointment record. The appointee is watched the day they are
// named, so the director measures them.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

// A nominee the Senate does not confirm leaves the member in place until one
// is (`central-bank-appointments.ts`), so a place where the nomination stalls
// through the run has no appointment to see: the test draws on, up to eight
// places, and names each one it passed over.
it(`a confirmed governor has an appointment scene opened by the president (seed ${seed})`, () => {
  const passedOver: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "appointment-scenes");
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const api = coreAPI(core);
    // The appointee is a full person made the day the seat is filled: watch
    // each appointment's person as the record is written.
    const emit = api.emit.bind(api);
    const emitted = new Map<string, { kind: string; personIds: string[] }>();
    api.emit = (event) => {
      if (event.kind === "economy.board-appointment") {
        emitted.set(event.id, event);
        for (const id of event.personIds) director.watch(core, id);
      }
      return emit(event);
    };
    // The first governor term to end after the opening ends on January 31, 2026.
    advanceCore(core, addDays(makeIsoDate(core.date), 420));
    const where = `${place.name}, seed ${seed}:${draw}`;
    if (!emitted.size) {
      passedOver.push(`${where} (no nominee confirmed)`);
      continue;
    }
    const scenes = [...director.ledger.people].flatMap(([personId, book]) =>
      book.schedule
        .filter((row) => row.momentId.includes("economy.board-appointment:"))
        .flatMap((row) =>
          row.bindings
            .filter((bound) => bound.typeKey === "appointment")
            .map((binding) => ({ personId, row, binding })),
        ),
    );
    expect(
      scenes.length,
      `${where}: a governor's appointment is a scene`,
    ).toBeGreaterThan(0);
    for (const { personId, row, binding } of scenes) {
      const moment = director.ledger.people
        .get(personId)!
        .momentsById.get(row.momentId)!;
      const here = `${where}, ${personId}, ${moment.causeId}`;
      const record = emitted.get(moment.causeId);
      expect(record?.kind, here).toBe("economy.board-appointment");
      expect(record?.personIds, here).toContain(personId);
      // The president, serving when the seat is filled, announces it.
      const appointer =
        binding.roles.find((r) => r.role === "appointer")?.personIds ?? [];
      expect(appointer.length, here).toBe(1);
      expect(appointer[0], here).not.toBe(personId);
      expect(
        binding.roles.find((r) => r.role === "appointee")?.personIds,
        here,
      ).toContain(personId);
    }
    return;
  }
  throw new Error(
    `No governor was confirmed in eight places: ${passedOver.join("; ")}`,
  );
}, 3_600_000);
