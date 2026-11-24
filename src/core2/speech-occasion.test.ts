/**
 * A speech names what it was given at (pool item core-speech-heard-occasion):
 * in a year of a played world (a place drawn from all 56 and a seed, printed;
 * SPEECH_OCCASION_SEED replays a draw), each `speech.heard` record that has an
 * event behind it carries that event's record id and kind as facts, and the id
 * opens the record it names. Speeches from at least two different callers are
 * read, and a speech with no event behind it carries none.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID } from "./modules/campaigns";
import { MEETINGS_MODULE_ID } from "./modules/meetings";
import { PARTIES_MODULE_ID } from "./modules/parties";
import {
  SPEECH_HEARD,
  SPEECH_OCCASION_ID,
  SPEECH_OCCASION_KIND,
} from "./modules/speech";
import { coreAPI } from "./state";

const seed = process.env.SPEECH_OCCASION_SEED ?? randomBytes(8).toString("hex");

it(`each speech names the event it was given at, and the id opens it (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 3; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "speech-occasion");
    const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const speeches = [...core.durableLog.values()].filter(
      (row) => row.kind === SPEECH_HEARD,
    );
    const named = speeches.filter((row) => row.facts?.[SPEECH_OCCASION_ID]);
    const kinds = new Set(named.map((row) => row.facts![SPEECH_OCCASION_KIND]));
    if (kinds.size < 2) {
      tried.push(
        `${where}: ${speeches.length} speeches, occasion kinds ${[...kinds].join(", ") || "none"}`,
      );
      continue;
    }
    // The id opens a record: a logged event, or a row in the table of the
    // engine that keeps it (a remark, a party meeting, a campaign promise).
    const opens = (id: string): boolean => {
      if (core.durableLog.has(id as never)) return true;
      const row = (moduleId: string, name: string) =>
        core.modules.has(moduleId)
          ? api.moduleState(moduleId).table(name).get(id)
          : undefined;
      return (
        !!row(MEETINGS_MODULE_ID, "remarks") ||
        !!row(PARTIES_MODULE_ID, "meetings") ||
        !!row(CAMPAIGNS_MODULE_ID, "promises")
      );
    };
    const byKind = new Map<string, string>();
    for (const row of named) {
      const id = String(row.facts![SPEECH_OCCASION_ID]);
      const kind = String(row.facts![SPEECH_OCCASION_KIND]);
      expect(opens(id), `${where}: ${row.id} names ${kind} ${id}`).toBe(true);
      byKind.set(kind, row.id);
    }
    process.stdout.write(
      `${where}: ${speeches.length} speeches, ${named.length} with an occasion; ${[...byKind].map(([k, id]) => `${k} (e.g. ${id})`).join("; ")}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place gave speeches at two kinds of occasion (seed ${seed}):\n${tried.join("\n")}`,
  );
}, 900_000);
