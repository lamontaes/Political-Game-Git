/**
 * A campaign gift or endorsement, public or seen by the player's circle, leaves the log after
 * `campaignRecordRetentionMonths`; a recent one, another kind's and any that
 * names the player stay (memory and long runs, Nov 8). A random place and seed
 * each run, named so a failure can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { queueCampaignRecord } from "./decision-detail";
import { retainLog } from "./state";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type { LogRecord } from "./types";

const seed = process.env.CAMPAIGN_RECORD_SEED ?? randomBytes(8).toString("hex");

describe(`campaign record retention (seed ${seed})`, () => {
  it("drops year-old gifts and endorsements, public or seen by the circle, only", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core;
    const [other] = [...core.people.keys()].filter(
      (id) => id !== core.playerId,
    );
    const row = (
      id: string,
      kind: string,
      date: string,
      personIds: string[],
    ): LogRecord =>
      ({
        id,
        date,
        kind,
        personIds,
        placeId: [...core.visiblePlaceIds][0] ?? "",
        source: { tag: "SOURCED", citation: "test", asOf: date },
        publicRecord: true,
        visibility: "public",
      }) as unknown as LogRecord;
    const today = core.date;
    const put = (r: LogRecord) => {
      core.durableLog.set(r.id, r);
      queueCampaignRecord(core, r.date, r.id);
    };
    put(row("gift-old", "campaign-gift", today, [other!]));
    put(row("endorsed-old", "campaign-endorsed", today, [other!]));
    put(row("gift-player", "campaign-gift", today, [core.playerId!]));
    // A gift the player's circle saw is kept by the log's own writer as a
    // circle row and a public record: it goes on the same year.
    const [friend] = [...core.focusPersonIds].filter(
      (id) => id !== core.playerId,
    );
    const witnessed = (id: string, date: string) =>
      retainLog(core, {
        ...row(id, "campaign-gift", date, [other!]),
        visibility: undefined,
        witnessIds: [friend ?? core.playerId!],
      } as unknown as LogRecord);
    witnessed("gift-circle-old", today);
    advanceCore(core, addDays(makeIsoDate(today), 330));
    put(row("gift-recent", "campaign-gift", core.date, [other!]));
    witnessed("gift-circle-recent", core.date);
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const where = world.place.displayName;
    expect(core.durableLog.has("gift-old"), where).toBe(false);
    expect(core.durableLog.has("endorsed-old"), where).toBe(false);
    expect(core.durableLog.has("gift-player"), where).toBe(true);
    expect(core.durableLog.has("gift-recent"), where).toBe(true);
    expect(
      core.durableLog.get("gift-circle-recent")?.visibility,
      `${where}: the circle's gift is kept as a circle row`,
    ).toBe("circle");
    expect(core.durableLog.has("gift-circle-old"), where).toBe(false);
  }, 600_000);
});
