import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { billOf, bodyOf, draftBill } from "../core2/modules/legislature";
import { enactLaw, lawChain, lawInForce } from "../core2/modules/laws";
import { printStory } from "../core2/modules/news";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billTitleOf } from "../english/bill-names";
import { composeJournal } from "./journal";

// A resident who ties what they pay to a law they heard about writes it in
// their journal, naming the law by the bill that enacted it: "I found out
// the Free Fares for Riders Act changed what I pay." A state bill for a
// price law, enacted citing that bill, a story about it, and the town's
// households under it, in a place drawn from all 56.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const question =
  "us-policy-positions:transportation-infrastructure.fare-free-transit";

it(`a resident's journal names the law they learned changed what they pay, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const drawn = drawPlace(seed, `journal-law-effect:${attempt}`);
      const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
      const { core, director } = buildBenchWorld(drawn.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: drawn.key,
      });
      const api = coreAPI(core);
      // The state legislature the town's member sits in drafts the bill.
      const seat = townSeats(api).find(
        (row) =>
          row.office.level === "state" &&
          row.office.kind.startsWith("legislature-") &&
          row.holder?.personId &&
          bodyOf(api, row.office.id),
      );
      const policy = billCatalog(api, "state")
        .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
        .find((row) => row.id === `question:${question}`);
      if (!seat || !policy?.authority.allowed) {
        tried.push(`${where}: no state bill for the law`);
        continue;
      }
      const bill = draftBill(api, {
        bodyOfficeId: seat.office.id,
        sponsorId: seat.holder!.personId!,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
      const title = billTitleOf(billOf(api, bill.id))?.title;
      expect(title, `${where}: ${bill.id} has a name`).toBeDefined();
      const state = lawChain(api).levels.find((row) => row.level === "state");
      const law = state
        ? enactLaw(api, {
            jurisdiction: state.jurisdiction,
            level: "state",
            series: question,
            value: 1,
            effectiveDate: core.date,
            measureId: bill.id,
            citation: `Enacted by ${bill.id} in a generated town.`,
            terms: { enactedByBill: bill.id },
          })
        : undefined;
      // A town's own law on the question governs over the state's.
      const lawId = lawInForce(api, question).governing?.id;
      if (!law || lawId !== law.id) {
        tried.push(`${where}: the state's law does not govern the town`);
        continue;
      }
      const town = lawChain(api).townPlaceId;
      const residents = [...core.people.values()]
        .filter((p) => p.alive && p.placeId === town && p.tier !== "husk")
        .map((p) => p.id);
      for (const id of residents) director.watch(core, id);
      printStory(
        api,
        {
          id: `story:${lawId}`,
          kind: "press.printed",
          outletId: `outlet:${town}`,
          date: core.date,
          placeId: town,
          topic: question,
          desiredChange: "enact",
          facts: { lawId: lawId! },
        },
        residents,
      );
      // The day a learned effect is a moment of someone's, their journal is
      // read: a watched person who is not the player forgets older moments.
      let learned = 0;
      for (let day = 0; day < 90; day += 1) {
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const staged = [...core.durableLog.values()].filter((row) => {
          // Only this law's: another law learned the same day is its own line.
          if (
            row.kind !== "law.effect-learned" ||
            row.date !== core.date ||
            row.facts?.lawId !== lawId
          )
            return false;
          learned += 1;
          const book = director.ledger.people.get(row.personIds?.[0] ?? "");
          return [...(book?.momentsById.values() ?? [])].some(
            (moment) => moment.causeId === row.id,
          );
        });
        for (const event of staged) {
          const personId = event.personIds![0]!;
          const lines = composeJournal(core, director, personId).flatMap(
            (chapter) => chapter.lines,
          );
          const line = lines.find((row) =>
            row.sourceRecordIds.includes(String(event.id)),
          );
          expect(
            line,
            `${where}: no line cites ${String(event.id)} in ${personId}'s journal on ${core.date}: ${lines.map((row) => row.text).join(" | ") || "(empty)"}`,
          ).toBeDefined();
          expect(line!.text).toContain(`the ${title}`);
          expect(line!.sourceRecordIds).toEqual(
            expect.arrayContaining([String(event.id), lawId, bill.id]),
          );
          console.log(
            `JOURNAL LAW EFFECT ${where}: ${personId} "${line!.text}" cites ${line!.sourceRecordIds.join(", ")}`,
          );
          return;
        }
      }
      tried.push(`${where}: ${learned} learned the effect, no moment staged`);
    }
    throw new Error(`No learned effect became a moment: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
