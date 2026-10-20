/**
 * A speech part about a vote the candidate cast cites the real count, in a
 * random place drawn from all 56: a council member sponsors a bill, the
 * council votes, the member files for an office, and the part that tells
 * their vote says how the chamber voted, as the vote rows count it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "../core2/bill-catalog";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import {
  billOf,
  draftBill,
  scheduleVote,
  votesOn,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { votesOf } from "../core2/modules/record";
import { coreAPI } from "../core2/state";
import { wordSpeechPart } from "./speech-part-words";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const ATTEMPTS = 8;

it(`a speech part about a cast vote says how the chamber voted (up to ${ATTEMPTS} drawn places from seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "speech-voices");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const seat = townSeats(api).find(
      (row) =>
        row.holder?.personId &&
        core.people.has(row.holder.personId) &&
        ["city", "county"].includes(row.office.level) &&
        row.office.kind === "council",
    );
    if (!seat) {
      tried.push(`${where}: no council seat held by a full person`);
      continue;
    }
    const memberId = seat.holder!.personId!;
    const policy = billCatalog(api, seat.office.level as "city" | "county")
      .flatMap((subject) => subject.topics.flatMap((topic) => topic.policies))
      .find((row) => row.kind === "policy-question" && row.authority.allowed);
    if (!policy) {
      tried.push(`${where}: no policy a council may act on`);
      continue;
    }
    const bill = draftBill(api, {
      bodyOfficeId: seat.office.id,
      sponsorId: memberId,
      provisions: [provisionFor({ policyId: policy.id, operation: "enact" })],
    });
    scheduleVote(api, bill.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const recorded = votesOf(api, memberId).filter(
      (row) => row.measureId === billOf(api, bill.id).number,
    );
    if (!recorded.length) {
      tried.push(`${where}: the member's vote was not recorded`);
      continue;
    }
    const contest = openContests(api).find((row) => {
      const result = fileCandidacy(api, {
        personId: memberId,
        contestId: row.id,
        platform: [],
      });
      return (
        result.status !== "refused" && result.filing.status === "on-ballot"
      );
    });
    if (!contest) {
      tried.push(`${where}: the member could not file`);
      continue;
    }
    const filingId = (
      api
        .moduleState("core2-elections-v1")
        .table("filings")
        .rows() as unknown as { id: string; personId: string }[]
    ).find((row) => row.personId === memberId)!.id;
    // The part that tells the member's vote on this bill, built from the vote
    // row itself (the speech offers only four parts a step, and the opening's
    // past votes, which are not bills with a roll call, rank beside it).
    const vote = recorded[0]!;
    const result = wordSpeechPart(api, {
      id: [filingId, "record", "vote", vote.stance.question, vote.id].join("|"),
      step: "body",
      move: "record",
      variant: "vote",
      moveKey: "record.vote",
      question: vote.stance.question,
      position: vote.stance.position,
      rivalFilingId: null,
      factIds: [filingId, vote.id],
      salience: 1,
    });
    expect(result.kind, `${where}: the vote part is not worded`).toBe("worded");
    const worded = result.kind === "worded" ? result.part.text : "";
    const rows = votesOn(api, bill.id).filter(
      (row) =>
        (row as unknown as { chamber?: string }).chamber === seat.office.id,
    );
    const yes = rows.filter((row) => row.vote === "yes").length;
    const no = rows.filter((row) => row.vote === "no").length;
    expect(worded, `${where}: ${yes} to ${no}`).toContain(`${yes} to ${no}`);
    return;
  }
  throw new Error(
    `no drawn place showed a vote part with its count: ${tried.join("; ")}`,
  );
}, 3_600_000);
