import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  bodyOf,
  draftBill,
  LEGISLATURE_MODULE_ID,
  members,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { SPEECH_MODULE_ID } from "../core2/modules/speech";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { emptyNewsLine } from "./ui/news-board.mjs";
import controls from "./data/controls.json";
import { buildBenchWorld } from "./world";

// A study committee's forming and its report, as the press prints them
// (words-press-study-committee-stories-unworded). A played year forms a study
// committee only when a bill fails narrowly with its opponents less sure than
// its backers, which most drawn years never do, and its report comes months
// later. So the bill is drafted through the engine and the study's row and
// events are written the way the legislature engine writes them
// (legislature.ts referToStudy and reportStudy): an edge proof of the words,
// with each case the words must keep apart (a lean that changed or did not, a
// report the chair gave or a member gave). The played-world proof is
// docs/seen/words-w3-news-study/lines.md.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DEVELOPER = /[{}_]|\b[a-z]+:[a-z]/;

describe("study committee stories", () => {
  it("words a study's forming and report from its own record, and says a change only when the lean changed", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "printed-study");
      const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        (row) =>
          row.holder?.personId &&
          ["city", "county"].includes(row.office.level) &&
          members(api, row.office.id).length >= 3 &&
          bodyOf(api, row.office.id),
      );
      const policy = billCatalog(api, "city")
        .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
        .find((row) => row.kind === "policy-question" && row.authority.allowed);
      if (!seat || !policy) {
        tried.push(`${where}: no town body of three with a question to put`);
        continue;
      }
      const sponsor = seat.holder!.personId!;
      const bill = draftBill(api, {
        bodyOfficeId: seat.office.id,
        sponsorId: sponsor,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
      const others = members(api, seat.office.id)
        .map((term) => term.personId)
        .filter((id): id is string => !!id && id !== sponsor);
      const memberIds = [sponsor, ...others].slice(0, 5);
      const day = makeIsoDate(core.date);
      const studies = api.moduleState(LEGISLATURE_MODULE_ID).table("studies");
      const speeches = api.moduleState(SPEECH_MODULE_ID).table("addresses");
      const word = (kind: string, id: string, facts: object) => {
        api.emit({
          id,
          date: day,
          kind,
          personIds: [sponsor],
          placeId: core.people.get(sponsor)!.placeId,
          source: { tag: "SOURCED", citation: "Test.", asOf: day },
          publicRecord: true,
          news: true,
          facts: { billId: bill.id, number: bill.number, ...facts },
        });
        const told = wordPrintedStory(core, {
          id: `printed:test:${id}`,
          kind: "press.printed",
          date: core.date,
          facts: { sourceRecordId: id },
        } as never);
        return told
          ? {
              ...told,
              text: [
                ...new Set([
                  told.headline,
                  told.lede,
                  ...(told.paragraphs ?? []),
                ]),
              ]
                .filter(Boolean)
                .join(" "),
            }
          : null;
      };
      const study = (name: string, startedAt: number, report?: object) => {
        const id = `study:${bill.id}:${name}`;
        studies.put({
          id,
          billId: bill.id,
          bodyOfficeId: seat.office.id,
          topic: policy.id,
          chairId: sponsor,
          memberIds,
          formedOn: day,
          sunsetOn: addDays(day, 180),
          startedAt: Object.fromEntries(memberIds.map((m) => [m, startedAt])),
          ...(report ? { report } : {}),
        } as never);
        return id;
      };
      const lines: string[] = [];

      // Formed: the chair, the count and the date it reports, citing the study.
      const formedId = study("formed", -1);
      const formed = word("study-formed", `study-formed:${formedId}`, {
        studyId: formedId,
      });
      expect(formed, `${where}: study-formed is not worded`).toBeTruthy();
      expect(formed!.headline, where).toBeTruthy();
      expect(formed!.sourceRecordIds, where).toContain(formedId);
      expect(formed!.text, where).not.toMatch(DEVELOPER);
      lines.push(`study-formed: ${formed!.text}`);

      // Reported: each case the words must keep apart.
      const cases = [
        // [name, lean at forming, finding, direction, who gave it, headline, chair line]
        [
          "held-against",
          -1,
          -0.5,
          "against",
          sponsor,
          /comes out against/,
          /gave the findings/,
        ],
        [
          "turned-for",
          -1,
          0.5,
          "for",
          others[0]!,
          /now favors/,
          /chaired the committee/,
        ],
        [
          "held-for",
          1,
          0.5,
          "for",
          sponsor,
          /comes out for/,
          /gave the findings/,
        ],
        [
          "turned-against",
          1,
          -0.5,
          "against",
          others[0]!,
          /turns against/,
          /chaired the committee/,
        ],
      ] as const;
      for (const [
        name,
        startedAt,
        finding,
        direction,
        speaker,
        headline,
        chair,
      ] of cases) {
        const speechId = `speech:test:${name}`;
        speeches.put({
          id: speechId,
          speakerId: speaker,
          date: day,
          topic: policy.id,
        } as never);
        const id = study(name, startedAt, { on: day, finding, speechId });
        const told = word("study-reported", `study-reported:${id}`, {
          studyId: id,
          direction,
        });
        expect(told, `${where}: ${name} is not worded`).toBeTruthy();
        expect(told!.sourceRecordIds, `${where}: ${name}`).toContain(id);
        expect(told!.headline, `${where}: ${name}`).toMatch(headline);
        expect(told!.text, `${where}: ${name}`).toMatch(chair);
        expect(told!.text, `${where}: ${name}`).not.toMatch(DEVELOPER);
        // "Now favors" and "turns against" print only after the lean changed sign.
        if (startedAt > 0 === finding > 0)
          expect(told!.text, `${where}: ${name}`).not.toMatch(
            /now favors|turns against/,
          );
        lines.push(`${name}: ${told!.text}`);
      }
      // A finding of exactly zero leans neither way and is not printed.
      const evenId = study("even", -1, { on: day, finding: 0, speechId: null });
      expect(
        word("study-reported", `study-reported:${evenId}`, {
          studyId: evenId,
          direction: "against",
        }),
        `${where}: an even finding was printed`,
      ).toBeNull();

      if (tried.length)
        process.stdout.write(`PASSED OVER ${tried.join("; ")}\n`);
      process.stdout.write(`PRINTED STUDY ${where}\n  ${lines.join("\n  ")}\n`);
      return;
    }
    throw new Error(`No drawn place had a town body: ${tried.join("; ")}`);
  }, 600_000);

  it("says why an empty News page is empty, by what the player follows", () => {
    const labels = controls.news;
    const followed = { name: "KUNB-TV", why: "follows" };
    const notFollowed = { name: "KWDV-TV", why: "local" };
    // Follows nothing anywhere: the same line on every tab.
    expect(emptyNewsLine(followed, false, labels)).toBe(labels.followsNone);
    expect(emptyNewsLine(notFollowed, false, labels)).toBe(labels.followsNone);
    // Follows this outlet, and it has nothing yet: named.
    expect(emptyNewsLine(followed, true, labels)).toBe(
      "Nothing from KUNB-TV yet.",
    );
    // An outlet not followed, or the desk of stories no outlet printed.
    expect(emptyNewsLine(notFollowed, true, labels)).toBe(labels.nothingYet);
    expect(emptyNewsLine({ name: labels.title }, true, labels)).toBe(
      labels.nothingYet,
    );
    expect(
      new Set([labels.followsNone, labels.nothingYet, labels.printedNothing])
        .size,
    ).toBe(3);
  });
});
