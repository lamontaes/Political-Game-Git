/**
 * Word of a rival's message is passed on only from a contest with a message
 * in the window, so the campaigns engine's day passes over a quiet contest's
 * filings by each contest's latest message date, kept beside the `messages`
 * rows (`latestMessageDates`), in a place drawn from all 56 on a seed nobody
 * chose (GOLDEN_PATH_SEED pins one).
 *
 * Bookkeeping is on here, so the day still reads every filing in full and
 * throws if one the kept dates call quiet had a message to pass on: a day
 * that runs is a day play would have passed on the same word. The kept dates
 * must equal the rows' when a fold removes a race's messages, when the
 * engine's tables are restored from a snapshot, and when a message is put
 * after a row was removed.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  latestMessageDates,
  openCampaigns,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-rival-word-kept:${Date.now()}`)
    .digest("hex");

interface MessageLike {
  readonly id: string;
  readonly contestId: string;
  readonly candidateId: string;
  readonly date: string;
}

/** A played-world slice: views, laws, offices, elections, campaigns, parties, the record and the press. */
function world(salt: string) {
  const place = drawPlace(runSeed, salt);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/**
 * Two rivals in a drawn world's first open contest two adults can file in,
 * and a candidate in another open contest, the richest who can, with a
 * reason (from the world's records) where none.
 */
function rivals(w: ReturnType<typeof world>) {
  const { api, core } = w;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  const filed = new Set<string>();
  const file = (contestId: string, count: number) => {
    const filings: FilingRow[] = [];
    for (const adult of adults) {
      if (filings.length === count) break;
      if (filed.has(adult.id)) continue;
      const result = fileCandidacy(api, {
        personId: adult.id,
        contestId,
        platform: [],
      });
      if (
        result.status === "refused" ||
        !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      )
        continue;
      filed.add(adult.id);
      filings.push(result.filing);
    }
    return filings;
  };
  const contests = openContests(api);
  for (const contest of contests) {
    const [speaker, hearer] = file(contest.id, 2);
    if (!speaker || !hearer) continue;
    for (const elsewhere of contests) {
      if (elsewhere.id === contest.id) continue;
      const [other] = file(elsewhere.id, 1);
      if (other) return { contest, speaker, hearer, other };
    }
    return "no other open contest an adult could file in";
  }
  return "no open contest two adults could file in";
}

describe("word of a rival's message, with each contest's latest message date kept", () => {
  it("follows the rows through a fold's removals, a restored snapshot and a message put after a removal", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const w = world(`rival-word-kept:${attempt}`);
      const { core, api, where } = w;
      const race = rivals(w);
      if (typeof race === "string") {
        tried.push(`${where}: ${race}`);
        continue;
      }
      const { contest, speaker, hearer, other } = race;
      const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
      const messages = campaigns.table("messages");
      const all = () => messages.rows() as unknown as MessageLike[];
      const ofContest = () =>
        messages.query("byContest", [contest.id]) as unknown as MessageLike[];
      const newestFirst = (a: MessageLike, b: MessageLike) =>
        b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      const day = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));
      // An evening of a candidate's doors, where the day offers one.
      const canvass = (filing: FilingRow) =>
        campaignDayChoices(api, filing.id, true).find(
          (c) => c.kind === "canvass",
        )?.available
          ? takeCampaignDayChoice(api, filing.id, "canvass", { world: true })
          : null;
      const heard = (messageId: string) =>
        campaigns.table("rivalWord").get(`${messageId}:${hearer.personId}`) !==
        undefined;
      // The kept dates are each contest's latest message date in the rows.
      const keptRight = (step: string) => {
        const rows: Record<string, string> = {};
        for (const row of all())
          if (!(row.contestId in rows) || row.date > rows[row.contestId]!)
            rows[row.contestId] = row.date;
        expect(
          Object.fromEntries(latestMessageDates(api)),
          `${where}: ${step}`,
        ).toEqual(rows);
      };

      keptRight("the first read");
      // The speaker's evening of doors, a message the hearer can hear of,
      // and one in another contest.
      canvass(speaker);
      canvass(other);
      const spoken = ofContest().find(
        (m) => m.candidateId === speaker.personId,
      );
      const elsewhere = all().find((m) => m.candidateId === other.personId);
      if (
        !spoken ||
        !elsewhere ||
        !core.people.get(hearer.personId)?.knownIds.size
      ) {
        tried.push(
          `${where}: ${!spoken ? "the speaker's doors met no one" : !elsewhere ? "the other contest's doors met no one" : "the hearer knows no one"}`,
        );
        continue;
      }
      keptRight("a message put");
      const saved = campaigns.snapshot();

      // A fold removes the race's messages.
      for (const message of ofContest()) messages.remove(message.id);
      expect(ofContest(), where).toHaveLength(0);
      keptRight("a race's messages removed");
      day();
      keptRight("a day after the removal");

      // Restored, the message is back, dated within the window, and the
      // hearer has not heard it: dates kept from the quiet contest would pass
      // the hearer over, and the day would throw.
      campaigns.restore(saved);
      expect(
        ofContest().map((m) => m.id),
        where,
      ).toContain(spoken.id);
      expect(heard(spoken.id), where).toBe(false);
      expect(() => day(), where).not.toThrow();
      keptRight("a day after the restore");

      // The other contest's newest row goes, then a message in the race is
      // put before anything reads the dates: those kept before the removal
      // are dropped, or the other contest would keep the removed row's date.
      const removed = all()
        .filter((m) => m.contestId === elsewhere.contestId)
        .sort(newestFirst)[0]!;
      messages.remove(removed.id);
      const before = messages.size;
      if (!canvass(speaker)) canvass(hearer);
      const put = messages.size - before;
      expect(put, `${where}: a message put after the removal`).toBe(1);
      keptRight("a message put after a removal");
      expect(() => day(), where).not.toThrow();
      keptRight("a day after that");
      process.stdout.write(
        `${JSON.stringify({
          where,
          contest: contest.id,
          spoken: spoken.id,
          heard: heard(spoken.id),
          removed: removed.id,
          putAfterRemoval: put,
        })}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a rival's message to hear in 8 draws (run seed ${runSeed}): ${tried.join("; ")}`,
    );
  }, 600_000);
});
