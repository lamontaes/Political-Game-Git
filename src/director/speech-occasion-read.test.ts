/**
 * The director reads what a heard speech was given at from the occasion the
 * speech record carries (SG-DIRECTOR-speech-occasion removed), never from the
 * shape of its record id. Pinned place and seed, a year of the played world:
 * every heard speech that names an occasion is told as one of the director's
 * occasions, a campaign act is a campaign stop and its act, a council remark
 * opens its own row, and a press attack is told as the press.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { CAMPAIGN_ACTS } from "../core2/modules/campaigns";
import {
  SPEECH_HEARD,
  SPEECH_OCCASION_ID,
  SPEECH_OCCASION_KIND,
} from "../core2/modules/people";
import { remarkOf } from "./remark";
import { speechAct, speechOccasion } from "./scheduling";

const SEED = "speech-occasion-read-pinned-1";

describe("a heard speech's occasion is read from its record", () => {
  it("tells each kind the record names, in a pinned place", () => {
    setBookkeeping(false);
    const place = drawPlace(SEED, "speech-occasion-read");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const speeches = [...core.durableLog.values()].filter(
      (row) => row.kind === SPEECH_HEARD && row.facts?.[SPEECH_OCCASION_KIND],
    );
    const at = `${place.name} (${place.key}), seed ${place.seed}`;
    const told = new Map<string, string>();
    for (const row of speeches) {
      const kind = String(row.facts![SPEECH_OCCASION_KIND]);
      const occasion = speechOccasion(core, row.id);
      expect(occasion, `${at}: ${row.id} (${kind})`).toBeTruthy();
      if ((CAMPAIGN_ACTS as readonly string[]).includes(kind)) {
        expect(occasion, row.id).toBe(
          kind === "debate" ? "debate" : "campaign",
        );
        expect(speechAct(core, row.id), row.id).toBe(kind);
      } else expect(speechAct(core, row.id), row.id).toBeUndefined();
      if (occasion === "remark") {
        const remark = remarkOf(core, row.id);
        expect(remark?.id, `${at}: ${row.id}`).toBe(
          String(row.facts![SPEECH_OCCASION_ID]),
        );
      } else expect(remarkOf(core, row.id), row.id).toBeNull();
      told.set(kind, occasion!);
    }
    process.stdout.write(
      `${at}: ${speeches.length} speeches; ${[...told].map(([k, o]) => `${k} -> ${o}`).join(", ")}\n`,
    );
    expect(told.size, `${at}: at least two kinds of occasion`).toBeGreaterThan(
      1,
    );
  }, 600_000);

  it("maps the kinds a producer writes that the played year may not reach (edge cases)", () => {
    const core = { durableLog: new Map() } as never as Parameters<
      typeof speechOccasion
    >[0];
    const log = (core as unknown as { durableLog: Map<string, unknown> })
      .durableLog;
    const cases: [string, string, string | undefined][] = [
      ["public-comment", "remark", undefined],
      ["testimony", "remark", undefined],
      ["committee-hearing", "hearing", undefined],
      ["attack", "press", undefined],
      ["town-hall", "campaign", "town-hall"],
      ["speech", "campaign", "speech"],
      ["debate", "debate", "debate"],
      ["state-of-the-city", "state-of-the-city", undefined],
    ];
    for (const [kind, occasion, act] of cases) {
      log.set(`speech:${kind}`, { facts: { [SPEECH_OCCASION_KIND]: kind } });
      expect(speechOccasion(core, `speech:${kind}`), kind).toBe(occasion);
      expect(speechAct(core, `speech:${kind}`), kind).toBe(act);
    }
    // A speech whose record names no occasion is told as none, whatever its id.
    log.set("speech:remark:x:y", { facts: {} });
    expect(speechOccasion(core, "speech:remark:x:y")).toBeUndefined();
    expect(speechAct(core, "speech:remark:x:y")).toBeUndefined();
  });
});
