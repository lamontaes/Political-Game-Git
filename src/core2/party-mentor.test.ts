/**
 * When a party asks a member to run, one of its seasoned officeholders in
 * town takes them under their wing (`takeUnderWing`, the candidacy engine's ask),
 * and the advice scene's cast reads that record (`partyMentor`), never a
 * guess at the moment of the scene (SG-WORDS-mentor-is-officeholder, removed).
 *
 * Pinned: Denver, Pennsylvania (4218888) with the world seed the party-ask
 * test pins there, played to the day after the first filing window opens,
 * when the parties' asks are made through the candidacy engine's own loop.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { partyMentor } from "../director/circumstance";
import { setBookkeeping } from "./bookkeeping";
import { closenessBetween } from "./closeness";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import {
  PARTY_MENTORSHIP,
  partyMentorOf,
  seasonedOfficeholders,
  PARTY_ASKED_EVENT,
  filingWindowOpens,
} from "./modules/candidacy";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

describe("a party's ask pairs the member with a mentor", () => {
  it("Denver, Pennsylvania: each asked member whose party holds a seasoned seat in town is taken under that officeholder's wing", () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(
      "cb7367e16ac115d8c9de7ee1f3ef34040bcd1591dacc1099b2a30884ef004eee",
      gameStartDate(),
      { twoLevel: true, placeKey: "4218888" },
    );
    const api = coreAPI(core);
    const opens = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .map((contest) => filingWindowOpens(api, contest))
      .filter((date) => date > core.date)
      .sort()[0]!;
    advanceCore(core, addDays(makeIsoDate(opens), 1));
    const asks = [...(core.logByKind.get(PARTY_ASKED_EVENT) ?? [])].map((id) =>
      core.durableLog.get(id as never)!,
    );
    expect(asks.length, `asks by ${core.date}`).toBeGreaterThan(0);
    let paired = 0;
    let unpaired = 0;
    for (const ask of asks) {
      const askedId = ask.personIds[0] as PersonId;
      const partyId = String(ask.facts!.partyId);
      const person = core.people.get(askedId);
      if (!person) continue;
      const mentor = partyMentorOf(api, askedId, partyId);
      const seasoned = seasonedOfficeholders(api, partyId, person.placeId)
        .map((held) => held.id)
        .filter((id) => id !== askedId);
      if (!seasoned.length) {
        // No one of the party has held a seat here a year: no mentor.
        expect(mentor, ask.id).toBeNull();
        unpaired += 1;
        continue;
      }
      expect(seasoned, ask.id).toContain(mentor);
      // The closest of them takes the member on, and they now know each other.
      const closest = Math.max(
        ...seasoned
          .filter((id) => id !== mentor)
          .map((id) => closenessBetween(core, askedId, id)),
        -Infinity,
      );
      expect(closenessBetween(core, askedId, mentor!), ask.id).toBeGreaterThan(
        0,
      );
      expect(
        closenessBetween(core, askedId, mentor!),
        ask.id,
      ).toBeGreaterThanOrEqual(closest);
      expect(
        core.eventIds.has(
          `${PARTY_MENTORSHIP}:${partyId}:${askedId}:${mentor}`,
        ),
        ask.id,
      ).toBe(true);
      // The advice scene's cast reads the same record.
      expect(partyMentor(core, ask), ask.id).toEqual([mentor]);
      paired += 1;
    }
    process.stdout.write(
      `PARTY MENTOR Denver PA: ${asks.length} asks by ${core.date}, ${paired} paired, ${unpaired} with no seasoned officeholder\n`,
    );
    expect(paired, "asks paired with a mentor").toBeGreaterThan(0);
  }, 300_000);
});
