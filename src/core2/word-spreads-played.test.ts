/**
 * Word of what you did spreads from the people who saw it (CTO, Nov 17, 06:18Z): in a
 * played world, the player speaks against a local outlet (the game's own call,
 * `attackOutlet`). The outlet's people, who took it as an attack, each weigh telling it
 * with the speech's own choice; a teller reaches their household and closest ties, and
 * each hearer who believes them learns who told them (`heardFrom`) and holds a
 * `word.retold` record naming the act. On main nobody who was not there ever heard of it.
 * The test draws places from all 56 and waits, a week at a time, for a teller; it names
 * the places it passed over. Set WORD_SEED to replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { attackOutlet, PRESS_MODULE_ID, type OutletRow } from "./modules/press";
import {
  heardFrom,
  retellingsOf,
  WORD_EVENT,
  WORD_RETOLD,
} from "./modules/speech";
import { coreAPI } from "./state";

const seed = process.env.WORD_SEED ?? randomBytes(8).toString("hex");

it("word of the player's attack on an outlet reaches people who were not there, through those who took it", () => {
  setBookkeeping(false);
  const passed: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(`${seed}:${String(draw)}`, "word-spreads");
    const where = `${place.name}, ${place.state} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const player = core.people.get(core.playerId!)!;
    const outlets = (
      api
        .moduleState(PRESS_MODULE_ID)
        .table("outlets")
        .rows() as unknown as OutletRow[]
    )
      .filter(
        (row) =>
          row.tier !== "national" &&
          row.placeId === player.placeId &&
          [row.ownerId, row.headId, ...row.reporterIds].some(
            (id) => id && core.people.get(id)?.alive,
          ),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!outlets.length) {
      passed.push(`${where}: no local outlet with people`);
      continue;
    }
    // The player's own household hears the speech; the outlet's people take it as an attack.
    const audience = (
      core.households.get(player.householdId)?.memberIds ?? []
    ).filter((id) => id !== player.id);
    for (let week = 0; week < 6; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      const outlet = outlets[week % outlets.length]!;
      const speechId = attackOutlet(api, {
        speakerId: player.id,
        outletId: outlet.id,
        audienceIds: audience,
      });
      const actId = `press.attacked:${speechId}`;
      const rows = retellingsOf(api, actId);
      const staff = new Set(
        [outlet.ownerId, outlet.headId, ...outlet.reporterIds].filter(
          (id): id is string => !!id,
        ),
      );
      // Everyone who weighed it was one of the outlet's people.
      for (const row of rows)
        expect(staff.has(row.listenerId), `${where}: ${row.listenerId}`).toBe(
          true,
        );
      const told = rows.filter((row) => row.toIds.length);
      if (!told.length) continue;
      let checked = 0;
      for (const row of told)
        for (const hearer of row.toIds) {
          const said = `${where}, ${actId}: ${row.listenerId} told ${hearer}`;
          // Not there: neither the speaker, the room nor the outlet's people.
          expect(hearer, said).not.toBe(player.id);
          expect(audience.includes(hearer) || staff.has(hearer), said).toBe(
            false,
          );
          expect(heardFrom(api, hearer, actId), said).toBe(row.listenerId);
          checked += 1;
        }
      const record = core.durableLog.get(
        `${actId}:word:${told[0]!.listenerId}`,
      );
      // The player is the one it is about, not a teller or hearer, so the
      // record is kept only where the world keeps everyone's; read it when it is.
      if (record) {
        expect(record.kind, where).toBe(WORD_RETOLD);
        expect(
          (JSON.parse(record.facts![WORD_EVENT]!) as { id: string }).id,
          where,
        ).toBe(actId);
      }
      process.stderr.write(
        `${where}: ${core.date}, ${actId}: ${String(rows.length)} of the outlet's people weighed it, ${String(told.length)} told it, ${String(checked)} people who were not there heard it from them${passed.length ? `; passed over: ${passed.join("; ")}` : ""}\n`,
      );
      expect(checked, where).toBeGreaterThan(0);
      return;
    }
    passed.push(`${where}: no one of the outlet's people told it in six weeks`);
  }
  throw new Error(`No teller in four drawn places: ${passed.join("; ")}`);
}, 2_400_000);
