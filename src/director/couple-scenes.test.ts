import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { FAMILY_ENGAGED, FAMILY_MARRIED } from "../core2/modules/partnerships";
import { purposeScene } from "./purpose-scene";
import { SITUATION_LIBRARY } from "./scheduling";

// The player's own couple records stage their scenes (Lives, Nov 8, 2026):
// `family.partnered` (union dating) is a date, `family.engaged` a proposal,
// `family.married` the wedding celebration and `family.separated` a breakup,
// each worded from the banks. The records here are written by the
// partnerships engine's own writer; the played-year proof, with the engine
// itself writing them, is scripts/dialogue-batch/couple-scenes.ts.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);

describe("a player's own couple records stage their scenes", () => {
  it("stages a date, a proposal, a wedding and a breakup from the records", () => {
    let found:
      | {
          where: string;
          built: ReturnType<typeof buildBenchWorld>;
          other: PersonId;
        }
      | undefined;
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8 && !found; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "couple-scenes");
      const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
      const built = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core, playerId } = built;
      // The player starts at the turn of 18; a year on they are an adult.
      advanceCore(core, addDays(makeIsoDate(core.date), 366));
      const player = core.people.get(playerId!)!;
      const partnered = new Set<string>();
      for (const link of core.familyLinks.values())
        if (link.kind === "partner")
          for (const id of link.personIds) partnered.add(id);
      const adult = (born: string) =>
        ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
      const other = [...core.people.values()].find(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== player.id &&
          !partnered.has(row.id) &&
          !player.familyIds.has(row.id) &&
          adult(row.birthDate),
      );
      if (adult(player.birthDate) && other)
        found = { where, built, other: other.id };
      else tried.push(where);
    }
    expect(found, `no adult player in: ${tried.join("; ")}`).toBeTruthy();
    const { where, built, other: otherId } = found!;
    const { core, director, playerId } = built;
    const api = coreAPI(core);
    const player = core.people.get(playerId!)!;
    const other = core.people.get(otherId)!;
    if (!director.ledger.people.has(playerId!)) director.watch(core, playerId!);
    const source = {
      tag: "SOURCED" as const,
      asOf: core.date,
      citation: "A couple record written by the partnerships writer.",
    };
    // A player already partnered at the start parts first, so the records
    // below are the ones the stages read.
    const held = [...core.familyLinks.values()].find(
      (link) => link.kind === "partner" && link.personIds.includes(player.id),
    );
    if (held)
      api.setPartnersV1({
        personIds: held.personIds as [PersonId, PersonId],
        together: false,
        source,
      });
    const ids: [PersonId, PersonId] = [player.id, other.id];
    const gap = SITUATION_LIBRARY.scheduling.repeatDays + 1;
    const stage = (kind: string, write: () => void, type: string) => {
      advanceCore(core, addDays(makeIsoDate(core.date), gap));
      write();
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const book = director.ledger.people.get(playerId!)!;
      const entry = book.schedule.find(
        (row) =>
          row.momentId.includes(kind) &&
          row.bindings.some((bound) => bound.typeKey === type),
      );
      expect(entry, `${where}: ${kind} stages no ${type}`).toBeTruthy();
      if (type === "celebration") return;
      const scene = purposeScene(core, director, playerId!, entry!);
      expect(scene?.kind, `${where}: ${type} is worded`).toBe("composed");
    };
    stage(
      "family.partnered",
      () =>
        api.setPartnersV1({
          personIds: ids,
          together: true,
          source,
          facts: { union: "dating" },
        }),
      "date",
    );
    const emit = (kind: string, union: string) =>
      api.emit({
        id: `${kind}:${ids.join(":")}:${core.date}`,
        date: core.date,
        kind,
        personIds: ids,
        placeId: player.placeId,
        publicRecord: false,
        source,
        facts: { union },
      });
    stage(FAMILY_ENGAGED, () => emit(FAMILY_ENGAGED, "engaged"), "proposal");
    stage(FAMILY_MARRIED, () => emit(FAMILY_MARRIED, "married"), "celebration");
    stage(
      "family.separated",
      () =>
        api.setPartnersV1({
          personIds: ids,
          together: false,
          source,
          facts: { union: "married", ended: "divorce" },
        }),
      "breakup",
    );
  }, 300_000);
});
