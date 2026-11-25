/**
 * When a party asks a member to run, one of its seasoned officeholders in
 * town takes them under their wing (`takeUnderWing`, the candidacy engine's ask),
 * and the advice scene's cast reads that record (`partyMentor`), never a
 * guess at the moment of the scene (SG-WORDS-mentor-is-officeholder, removed).
 *
 * Drawn (drawn-place-tests): each draw is played to the day after its first
 * filing window opens, when the parties' asks are made through the candidacy
 * engine's own loop, and the test moves on, naming the place and why, until a
 * party's ask meets one of its seasoned officeholders in town. Old premise:
 * pinned to Denver, Pennsylvania (4218888, seed cb7367e1...), where by Nov 16
 * every partisan seat had filers of both parties on the window's first day,
 * so no party asked anyone (a party asks only where none of it has filed) and
 * the pin went red without a defect. Replay a run with PARTY_MENTOR_SEED.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
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

const seed = process.env.PARTY_MENTOR_SEED ?? randomBytes(8).toString("hex");
// About one place in four holds the case (an ask where the party has a seasoned
// officeholder in town); sixteen draws leave about a one in a hundred chance of none.
const DRAWS = 16;

describe("a party's ask pairs the member with a mentor", () => {
  it(`each asked member whose party holds a seasoned seat in town is taken under that officeholder's wing (seed ${seed})`, () => {
    setBookkeeping(false);
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const place = drawPlace(
        draw === 0 ? seed : `${seed}:${draw}`,
        "party-mentor",
      );
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const opens = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .map((contest) => filingWindowOpens(api, contest))
        .filter((date) => date > core.date)
        .sort()[0];
      if (!opens) {
        passed.push(`${where}: no filing window ahead`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(opens), 1));
      const asks = [...(core.logByKind.get(PARTY_ASKED_EVENT) ?? [])].map(
        (id) => core.durableLog.get(id as never)!,
      );
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
          expect(mentor, `${where}: ${ask.id}`).toBeNull();
          unpaired += 1;
          continue;
        }
        expect(seasoned, `${where}: ${ask.id}`).toContain(mentor);
        // The closest of them takes the member on, and they now know each other.
        const closest = Math.max(
          ...seasoned
            .filter((id) => id !== mentor)
            .map((id) => closenessBetween(core, askedId, id)),
          -Infinity,
        );
        expect(
          closenessBetween(core, askedId, mentor!),
          `${where}: ${ask.id}`,
        ).toBeGreaterThan(0);
        expect(
          closenessBetween(core, askedId, mentor!),
          `${where}: ${ask.id}`,
        ).toBeGreaterThanOrEqual(closest);
        expect(
          core.eventIds.has(
            `${PARTY_MENTORSHIP}:${partyId}:${askedId}:${mentor}`,
          ),
          `${where}: ${ask.id}`,
        ).toBe(true);
        // The advice scene's cast reads the same record.
        expect(partyMentor(core, ask), `${where}: ${ask.id}`).toEqual([mentor]);
        paired += 1;
      }
      if (!paired) {
        passed.push(
          `${where}: ${asks.length} asks by ${core.date}, ${unpaired} with no seasoned officeholder`,
        );
        continue;
      }
      process.stdout.write(
        `PARTY MENTOR ${where}: ${asks.length} asks by ${core.date}, ${paired} paired, ${unpaired} with no seasoned officeholder; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place paired an asked member with a mentor (seed ${seed}): ${passed.join("; ")}`,
    );
  }, 1_800_000);
});
