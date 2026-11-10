import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawInForce } from "../core2/modules/laws";
import {
  billOf,
  bodyOf,
  draftBill,
  members,
  scheduleVote,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI, fillInPerson } from "../core2/state";
import type { PersonId } from "../core2/types";
import { storyOfReadEvent } from "../core2/modules/news";
import { printedStoryOf } from "../core2/modules/press";
import { bringItUp } from "./bring-it-up";

// Golden path: pass an ordinance, the town changes, people bring it up. The
// player sits on the town's or county's body and sponsors a change to a law
// the body may set; the body votes; when it passes and takes effect, those who
// learned of it (by the news, a notice or a conversation) bring it up, and what
// they say must name the ordinance and how it touched them. This test prints
// every line in which someone brings up the player's ordinance, with record
// ids, and fails on a line that names no ordinance.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const ATTEMPTS = 6;
const CANDIDATES = [
  { policyId: "law:sales-tax", operation: "lower", delta: -0.5 },
  { policyId: "law:property-tax", operation: "lower", delta: -0.1 },
  { policyId: "law:minimum-wage", operation: "raise", delta: 100 },
  { policyId: "law:sales-tax", operation: "raise", delta: 0.5 },
] as const;

it(`people bring up the player's passed ordinance, naming it and how it touched them (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const place = drawPlace(seed, `bring-up-ordinance:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      for (const candidate of CANDIDATES) {
        const { core, director } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const api = coreAPI(core);
        const seat = townSeats(api).find(
          (row) =>
            row.holder?.personId &&
            ["city", "county"].includes(row.office.level) &&
            members(api, row.office.id).length > 1 &&
            bodyOf(api, row.office.id),
        );
        if (!seat) {
          tried.push(`${where}: no town body seat`);
          break;
        }
        const me = seat.holder!.personId! as PersonId;
        fillInPerson(core, me);
        new BenchPlayer(core, director).select(me);
        const policy = billCatalog(api, "city")
          .flatMap((subject) =>
            subject.topics.flatMap((topic) => topic.policies),
          )
          .find(
            (row) => row.id === candidate.policyId && row.authority.allowed,
          );
        if (!policy || !policy.operations.includes(candidate.operation)) {
          tried.push(`${where}: ${candidate.policyId} not the body's to set`);
          continue;
        }
        const base =
          lawInForce(api, policy.series!, makeIsoDate(core.date)).value ?? 0;
        const bill = draftBill(api, {
          bodyOfficeId: seat.office.id,
          sponsorId: me,
          provisions: [
            provisionFor({
              policyId: policy.id,
              operation: candidate.operation,
              amount: Math.round((base + candidate.delta) * 1000) / 1000,
            }),
          ],
        });
        scheduleVote(api, bill.id);
        for (let day = 0; day < 400; day += 1)
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
        if (billOf(api, bill.id)?.status === "failed") {
          tried.push(
            `${where}: ${candidate.policyId} ${candidate.operation} failed`,
          );
          continue;
        }
        const raised: string[] = [];
        // Everyone who has read something the press printed of it or of
        // another vote the player sat in on says what they read.
        const readers = [...core.people.values()].filter(
          (person) =>
            person.alive &&
            person.id !== me &&
            [...(core.knowledgeByPerson.get(person.id)?.keys() ?? [])].some(
              (key) => key.startsWith("news:printed:"),
            ),
        );
        for (const reader of readers) {
          const said = bringItUp(core, reader.id, me);
          if (!said) continue;
          const text = said.lines.map((line) => line.text).join(" ");
          const storyId = storyOfReadEvent(said.change.eventId);
          const wire = storyId
            ? printedStoryOf(api, storyId)?.wireId
            : undefined;
          const record = wire ? core.durableLog.get(wire as never) : undefined;
          const billId = String(record?.facts?.billId ?? "");
          const about = billId ? billOf(api, billId) : undefined;
          // "Your ordinance" is only ever the player's own bill, and says how
          // its vote came out as the vote's record does.
          if (/your (ordinance|bill|resolution)/i.test(text)) {
            expect(about?.sponsorId, `${where}: ${text}`).toBe(me);
            const passed =
              Number(record?.facts?.yes) > Number(record?.facts?.no);
            expect(
              /passed/.test(text) && !/didn't pass/.test(text),
              `${where}: ${text}`,
            ).toBe(record?.kind === "legislative-vote" && passed);
          }
          if (about?.sponsorId === me || record?.facts?.billId === bill.id)
            raised.push(
              `${text} [${said.lines.flatMap((line) => line.sourceRecordIds).join(", ")}]`,
            );
        }
        process.stdout.write(
          `BRING UP ${where}: ${bill.id} (${candidate.policyId} ${candidate.operation}), status ${billOf(api, bill.id)?.status}; ${readers.length} readers of the press\n${raised
            .slice(0, 8)
            .map((row) => `  ${row}`)
            .join("\n")}\n`,
        );
        expect(raised.length, `${where}: nobody brought it up`).toBeGreaterThan(
          0,
        );
        return;
      }
    }
    throw new Error(`no ordinance passed: ${tried.join("; ")} (seed ${seed})`);
  } finally {
    setBookkeeping(true);
  }
}, 3_600_000);
