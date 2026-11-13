/**
 * A resident's public comment is told in the Journal as one paragraph (words
 * lead, Nov 13; W3's wordings): for or against the bill at its body's meeting,
 * how many others spoke the same way (else the other way, else nobody), and
 * that day's vote when the bill's own record ended it that day. The resident
 * signs up through the meetings engine's own `signUpToSpeak`; the office-day
 * act row is written in the shape `speakOnItem` keeps (the resident panel that
 * produces it in play is the Account lead's, not on main yet). In a place
 * drawn from all 56; replay with GOLDEN_PATH_SEED.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  bodyOf,
  draftBill,
  members,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { MEETINGS_MODULE_ID, signUpToSpeak } from "../core2/modules/meetings";
import { OFFICE_DAY_MODULE_ID } from "../core2/modules/office-day";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "./journal";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a resident's public comment is one paragraph: the stand, who agreed, the vote (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const drawn = drawPlace(seed, `journal-public-comment:${attempt}`);
      const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
      const { core, director, playerId } = buildBenchWorld(
        drawn.seed,
        gameStartDate(),
        { twoLevel: true, placeKey: drawn.key },
      );
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        (row) =>
          ["city", "county", "township"].includes(row.office.level) &&
          members(api, row.office.id).length > 1 &&
          !!bodyOf(api, row.office.id) &&
          !!row.holder?.personId,
      );
      const policy = seat
        ? billCatalog(api, seat.office.level === "county" ? "county" : "city")
            .flatMap((subject) =>
              subject.topics.flatMap((topic) => topic.policies),
            )
            .find(
              (row) => row.kind === "policy-question" && row.authority.allowed,
            )
        : undefined;
      if (!seat || !policy || !api.state.modules.has(MEETINGS_MODULE_ID)) {
        tried.push(`${where}: no town body with a bill it may take up`);
        continue;
      }
      const player = playerId as PersonId;
      director.watch(core, player);
      const bill = draftBill(api, {
        bodyOfficeId: seat.office.id,
        sponsorId: seat.holder!.personId,
        provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
      });
      // The resident speaks for it, through the engine's own sign-up; the
      // act row is kept as `speakOnItem` keeps it.
      const remark = signUpToSpeak(api, {
        billId: bill.id,
        personId: player,
        position: 1,
      });
      api
        .moduleState(OFFICE_DAY_MODULE_ID)
        .table("acts")
        .put({
          id: `office-act:speak:${remark.id}:${player}`,
          personId: player,
          kind: "speak",
          how: "did",
          date: core.date,
          recordId: remark.id,
          position: 1,
          detail: "for",
        } as never);
      scheduleVote(api, bill.id);
      for (let day = 0; day < 60 && !votesOn(api, bill.id).length; day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const lines = composeJournal(core, director, player).flatMap(
        (chapter) => chapter.lines,
      );
      const told = lines.find((line) =>
        line.sourceRecordIds.includes(remark.id),
      );
      expect(
        told?.text,
        `${where}: no paragraph tells ${remark.id}: ${lines.map((l) => l.text).join(" | ")}`,
      ).toBeDefined();
      // The stand, at the body's meeting; then who else spoke, one sentence.
      expect(told!.text, where).toMatch(
        /\b(?:spoke for|stood up for|spoke in favor of)\b/,
      );
      expect(told!.text, where).toMatch(/\bmeeting\b/);
      expect(told!.text, where).toMatch(
        /\b(?:spoke the same way|said what I said|took my side|spoke against me|took the other side|argued the other way|the way I did|the only one)\b/,
      );
      expect(told!.text, where).not.toMatch(/\{|\}|undefined/);
      process.stdout.write(
        `JOURNAL PUBLIC COMMENT ${where}: "${told!.text}" cites ${told!.sourceRecordIds.join(", ")}\n`,
      );
      return;
    }
    throw new Error(`no place to speak in: ${tried.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
