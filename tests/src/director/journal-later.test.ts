// @vitest-environment node
/**
 * A Journal entry is told looking back (owner, Nov 24, page 1: "if in 30
 * years you become a huge healthcare guy, then the journal entry could
 * update... Little did I know"). The packet each entry's lines are worded
 * from carries what the person's later records say, with their ids
 * (`later-office`, `later-topic`, `later-same-point`, `later-years`), read
 * only from records dated after the entry and up to the page's last day.
 *
 * HAND-STAGED: the player takes a state legislative seat the way a custom
 * start as a sitting officeholder does (seatPlayerInStateOffice, the same
 * call the dev start makes), and sponsors one bill through the legislature's
 * own draftBill. Every entry told before that day is a first-year entry
 * from the person's past; the Journal is then composed through the
 * game's own composeJournal. A bill that cannot be drafted at the drawn place
 * is reported and the office is still proven.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../../../src/bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import { billCatalog, provisionFor } from "../../../src/core2/bill-catalog";
import { gameStartDate } from "../../../src/core2/game-start";
import { advanceCore } from "../../../src/core2/life";
import { addDays, makeIsoDate } from "../../../src/core2/kernel/dates";
import { draftBill } from "../../../src/core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../../../src/core2/modules/offices";
import { seatPlayerInStateOffice } from "../../../src/core2/office-day-state";
import { coreAPI } from "../../../src/core2/state";
import type { PersonId } from "../../../src/core2/types";
import type { Fact, wordJournalLine } from "../../../src/english/journal-words";
import { topicInSentence } from "../../../src/english/policy-names";
import { composeJournal } from "../../../src/director/journal";
import {
  laterRecordsOf,
  officePhrase,
} from "../../../src/director/journal-later";

const packets: Record<string, Fact>[] = [];

vi.mock("../../../src/english/journal-words", async (original) => {
  const real = await original<{ wordJournalLine: typeof wordJournalLine }>();
  return {
    ...real,
    wordJournalLine: (request: Parameters<typeof wordJournalLine>[0]) => {
      packets.push(request.facts);
      return real.wordJournalLine(request);
    },
  };
});

let previous = true;
beforeAll(() => {
  previous = setBookkeeping(false);
});
afterAll(() => {
  setBookkeeping(previous);
});

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`journal-later:${Date.now()}`).digest("hex");

it(
  "a first-year entry's packet carries the office and the bill the person took up later, by record id",
  { timeout: 600_000 * Number(process.env.JOURNAL_LATER_YEARS ?? 1) },
  () => {
    const place = drawPlace(runSeed, "journal-later");
    const where = `${place.name} (${place.key}), seed ${place.seed}, run seed ${runSeed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const player = core.playerId! as PersonId;
    const before = addDays(makeIsoDate(core.date), -1);

    // Nothing came after the past yet: no entry carries a later fact (the
    // Journal is told, so the check is not an empty one).
    director.watch(core, player);
    composeJournal(core, director, player);
    expect(
      packets.length,
      `${where}: entries told before the seat`,
    ).toBeGreaterThan(0);
    expect(
      packets.flatMap((facts) =>
        Object.keys(facts).filter((key) => key.startsWith("later-")),
      ),
      `${where}: before the seat`,
    ).toEqual([]);
    expect(laterRecordsOf(core, player, core.date)(before), where).toEqual({});

    // The player takes a legislative seat, and sponsors a bill in it.
    const held = seatPlayerInStateOffice(api, {
      personId: player,
      role: "legislator",
    });
    // A year of the game's own days pass (JOURNAL_LATER_YEARS plays more, ten
    // for the pool item's proof), then the bill is sponsored.
    const years = Number(process.env.JOURNAL_LATER_YEARS ?? 1);
    advanceCore(core, addDays(makeIsoDate(core.date), 365 * years + 5));
    let billId: string | undefined;
    let question: string | undefined;
    try {
      const policy = billCatalog(api, "state")
        .flatMap((section) => section.topics.flatMap((t) => t.policies))
        .find(
          (p) =>
            p.authority.allowed &&
            !!topicInSentence(p.series ?? p.question ?? ""),
        );
      if (policy) {
        const op = policy.operations.includes("enact")
          ? "enact"
          : policy.operations.includes("raise")
            ? "raise"
            : policy.operations[0]!;
        const amount =
          policy.kind === "policy-question"
            ? undefined
            : (policy.inForce ?? 1) * 1.1 + 1;
        const bill = draftBill(api, {
          bodyOfficeId: held.officeId,
          sponsorId: player,
          provisions: [
            provisionFor({
              policyId: policy.id,
              operation: op,
              ...(amount !== undefined ? { amount } : {}),
            }),
          ],
        });
        billId = bill.id;
        question = policy.series ?? policy.question;
      }
    } catch (error) {
      process.stdout.write(
        `${where}: no bill drafted (${(error as Error).message})\n`,
      );
    }

    // The reader: a first-year entry (dated before the seat) gets the later
    // office with the term and office ids; an entry dated after gets none.
    const read = laterRecordsOf(core, player, core.date);
    const first = read(before, question);
    expect(first["later-office"], where).toBeDefined();
    expect(first["later-office"]!.sourceRecordIds, where).toEqual(
      expect.arrayContaining([held.termId, held.officeId]),
    );
    expect(first["later-office"]!.text.length, where).toBeGreaterThan(0);
    if (billId) {
      expect(first["later-topic"], where).toBeDefined();
      expect(first["later-topic"]!.sourceRecordIds, where).toContain(billId);
      if (question)
        expect(first["later-same-point"]!.sourceRecordIds, where).toEqual([
          billId,
        ]);
    }
    expect(read(core.date), `${where}: nothing after today`).toEqual({});

    // The Journal's own packets: composing it again, entries from the past
    // are worded from packets that carry the later facts, each citing a real
    // record of the person's.
    packets.length = 0;
    composeJournal(core, director, player);
    const withLater = packets.filter((facts) => facts["later-office"]);
    expect(
      withLater.length,
      `${where}: packets with a later office`,
    ).toBeGreaterThan(0);
    // Over many years the person may hold more than one office: an entry
    // after the first term reads the next one it came before. Every packet
    // cites one of the person's own terms, and the entries from before the
    // seat cite the seat's.
    const termIds = new Set(
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("byPerson", [player]) as unknown as { id: string }[]
      ).map((row) => row.id),
    );
    for (const facts of withLater)
      expect(
        termIds.has(facts["later-office"]!.sourceRecordIds[0]!),
        `${where}: ${facts["later-office"]!.sourceRecordIds.join(", ")}`,
      ).toBe(true);
    expect(
      withLater.some((facts) =>
        facts["later-office"]!.sourceRecordIds.includes(held.termId),
      ),
      `${where}: an entry from before the seat cites the seat`,
    ).toBe(true);

    // The years between the entry and the latest record are said in whole
    // years, from the same ids: the bill came a year and more after the entry.
    if (billId)
      expect(first["later-years"]!.sourceRecordIds, where).toEqual(
        expect.arrayContaining([billId]),
      );
    else
      expect(
        first["later-years"],
        `${where}: no bill, the seat is the latest`,
      ).toBeUndefined();
    process.stdout.write(
      `${where}: later-office ${first["later-office"]!.text} (${held.termId}); bill ${billId ?? "none"}; ${withLater.length} packets\n`,
    );
    expect(officePhrase({ title: "Mayor", seats: 1 })).toBe("Mayor");
    expect(officePhrase({ title: "Council member", seats: 5 })).toBe(
      "a Council member",
    );
    expect(officePhrase({ title: "Alderman", seats: 4 })).toBe("an Alderman");
  },
);
