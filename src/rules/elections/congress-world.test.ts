import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  congressTurnoverYears,
  congressCyclePhases,
  congressOutcomeGroups,
} from "./turnover-phases";
import type { SeatOutcome } from "./congress-decision";
import { pastCandidatesBySeat } from "./past-candidates";
import { pastCandidatesBySeat as oldPastCandidatesBySeat } from "../../simulation/nominations/candidate-pool";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import { isPersonAliveAt } from "../../simulation/vitality-integrity";
import {
  congressSeats,
  seatTermWindow as oldTerm,
} from "../../simulation/living-world/congress-seats";
import * as oldTurnover from "../../simulation/living-world/congress-turnover";
import * as oldCandidates from "../../simulation/living-world/congress-candidates";
import { projectCongress } from "../../simulation/living-world/congress";
import { seatStartingCondition } from "../../simulation/world-setup/conditions";
import { senateSelectionRuleAt } from "../../simulation/governing/senate-selection";
import {
  seatedStateLegislators,
  jointAssemblyCandidates,
  jointAssemblyVote,
} from "../../simulation/governing/joint-assembly";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
} from "../../simulation/living-world/opening";
import { decideSeat, type CongressDecisionFacts } from "./congress-decision";
import { seatTermWindow } from "./congress-term";
const references = {
  "us-house": { referenceStart: "2025-01-03", years: 2 },
  "us-senate:1": { referenceStart: "2025-01-03", years: 6 },
  "us-senate:2": { referenceStart: "2021-01-03", years: 6 },
  "us-senate:3": { referenceStart: "2023-01-03", years: 6 },
};
const watchedPlace =
  Object.keys(STATES)[randomInt(Object.keys(STATES).length)]!;
describe("elections: private congressional seat decision through native turnover", () => {
  it.each(Object.keys(STATES))(
    "matches real recorded winners from the %s generated world",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-congress:${place}`,
        offices: ["congress"],
      }).world;
      const day = makeIsoDate("2026-11-03"),
        start = makeIsoDate("2027-01-03");
      const clocked = {
        ...base,
        currentDate: day,
        currentMoment: simulationMomentAtLocalTime({
          date: day,
          minuteOfDay: 0,
          timeZone: base.currentMoment.timeZone,
        }),
      };
      const before = projectCongress(clocked)!;
      const seats = [...before.house.seats, ...before.senate.seats];
      const world = oldTurnover.applyCongressTurnover(
        makeIsoDate("2026-11-02"),
        clocked,
      );
      const results = world.history.events.find(
        (event) =>
          event.type === oldTurnover.CONGRESS_RESULTS_EVENT &&
          event.occurredAt === day,
      )!;
      expect(results).toBeDefined();
      if (place === watchedPlace)
        writeFileSync(
          join(tmpdir(), "rules2-elections-watch.json"),
          JSON.stringify({
            place,
            seed: world.seed,
            worldId: world.id,
            resultId: results.id,
            resultDate: results.occurredAt,
            winnerCount: results.participants.length,
            branch: "pool/P14-elections",
            source: "native applyCongressTurnover vs pure seat decisions",
            model: "GPT-6 (Codex)",
            effort:
              "exact configured effort unavailable; repository default medium",
            recordedAt: new Date().toISOString(),
          }),
        );
      const phase = congressCyclePhases(
        makeIsoDate("2026-11-02"),
        day,
        2026,
        45,
      );
      expect(
        congressTurnoverYears(makeIsoDate("2026-11-02"), day, true),
      ).toContain(2026);
      expect(phase.election).toBe(!!results);
      expect(results.tags).toContain(`term-start:${phase.newStart}`);
      expect(phase.seating).toBe(false);
      const decisions: SeatOutcome[] = [];
      const slateSeats: string[] = [];
      const generationKeys = new Map(
        world.personOrder.map((id) => [id, world.people[id]?.generationKey]),
      );
      const pool = pastCandidatesBySeat(
        generationKeys,
        world.personOrder,
        oldCandidates.CONGRESS_CANDIDATE_VERSION,
      );
      expect(pool).toEqual(
        oldPastCandidatesBySeat(
          world,
          oldCandidates.CONGRESS_CANDIDATE_VERSION,
        ),
      );
      expect(pool.size).toBeGreaterThan(0);
      const people = new Map(Object.entries(world.people));
      const alive = new Set(
        world.personOrder.filter((id) =>
          isPersonAliveAt(world, id, {
            asOfDate: day,
            historySequenceExclusive: world.history.nextSequence,
          }),
        ),
      );
      for (const seat of congressSeats()) {
        for (const on of [
          makeIsoDate("2024-01-02"),
          day,
          start,
          makeIsoDate("2033-01-04"),
        ])
          expect(seatTermWindow(seat, on, references)).toEqual(
            oldTerm(seat, on),
          );
        if (oldTerm(seat, day).endExclusive !== start) continue;
        const prior = seats.find(
          (row) => row.seatKey === seat.seatKey,
        )!.occupant;
        const record =
          prior.kind === "member"
            ? base.history.events.find(
                (event) => event.id === prior.member.termId,
              )
            : prior.kind === "vacancy"
              ? base.history.events.find((event) => event.id === prior.eventId)
              : undefined;
        const contest = oldTurnover.recordedSeatContest(world, seat, day);
        const condition = seatStartingCondition(world, seat.seatKey);
        const intent = oldTurnover.seatCandidacyIntent(
          world,
          seat.seatKey,
          2026,
        );
        const legislatureChooses =
          seat.chamberKey === "us-senate" &&
          senateSelectionRuleAt(world, day).method === "state-legislature";
        const members =
          legislatureChooses && !contest
            ? seatedStateLegislators(world, seat.stateUsps)
            : null;
        const incumbent =
          record?.type === SEAT_TENURE_EVENT
            ? record.participants.find((p) => p.role === "focus:subject")
                ?.personId
            : undefined;
        const recordedParty =
          record?.tags
            .find((tag) => tag.startsWith(SEAT_PARTY_TAG))
            ?.slice(SEAT_PARTY_TAG.length) ?? null;
        const vote = members
          ? jointAssemblyVote(world, {
              stableKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:joint-assembly:${day}`,
              members,
              candidates: jointAssemblyCandidates(
                members,
                incumbent &&
                  alive.has(incumbent) &&
                  intent !== false &&
                  recordedParty
                  ? { personId: incumbent, party: recordedParty }
                  : null,
              ),
            })
          : null;
        const facts: CongressDecisionFacts = {
          writerVersion: LIVING_WORLD_WRITER_VERSION,
          people,
          alive,
          legislatureChooses,
          contest,
          contestResult: contest
            ? (world.history.electionContestResults!.find(
                (result) => result.contestId === contest.id,
              ) ?? null)
            : null,
          condition,
          intent,
          members,
          legislatureVote: vote,
          candidates: oldCandidates.congressGeneralCandidates(
            world,
            seat.seatKey,
            2026,
          ),
          slate: oldCandidates.congressCandidateSlate(
            world,
            seat.seatKey,
            2026,
          ),
          controlledPersonId:
            world.control.kind === "person" ? world.control.personId : null,
        };
        const outcome = decideSeat(facts, seat, record, 2026, start);
        if (outcome) decisions.push(outcome);
        if (facts.slate) slateSeats.push(seat.seatKey);
        const saved = results.participants.find((participant) =>
          participant.detail?.startsWith(`${seat.seatKey}|`),
        );
        if (!outcome || outcome.deadlocked) {
          expect(saved).toBeUndefined();
          continue;
        }
        expect(saved).toBeDefined();
        expect(saved!.detail).toBe(
          [
            seat.seatKey,
            outcome.party,
            outcome.caucus,
            outcome.incumbentPersonId ? "returning" : "new",
            outcome.serviceSince,
          ].join("|"),
        );
        if (outcome.recordedWinnerPersonId ?? outcome.incumbentPersonId)
          expect(saved!.personId).toBe(
            outcome.recordedWinnerPersonId ?? outcome.incumbentPersonId,
          );
      }
      const groups = congressOutcomeGroups(decisions, slateSeats);
      expect(groups.outcomes).toHaveLength(results.participants.length);
      expect(results.tags.filter((tag) => tag.startsWith("unfilled:"))).toEqual(
        groups.unfilled.map((key) => `unfilled:${key}`).sort(),
      );
      expect(
        results.tags.filter((tag) => tag.startsWith("deadlocked:")),
      ).toEqual(
        groups.deadlocked
          .map((outcome) => `deadlocked:${outcome.seat.seatKey}`)
          .sort(),
      );
    },
  );
});
