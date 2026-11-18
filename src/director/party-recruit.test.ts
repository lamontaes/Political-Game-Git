import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  PARTY_ASKED_EVENT,
  decisionOf,
  filingWindowOpens,
} from "../core2/modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { partiesHere, partyTie } from "../core2/modules/parties";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// The Pendergast approach (owner, Oct 14 and Oct 25): a party with no one
// filed for a partisan seat asks one of its members to run. In a drawn town,
// played up to two years, every ask is checked against the records it stands
// on: the chair who asks leads the party, the one asked files under its label,
// and the party had no one filed for the seat. The one asked weighs running
// with the ask among their reasons, citing it, and the scene the ask stages
// composes: the chair asks for the seat by name. A yes said in that scene is
// the decision to run, and the filing follows. The day before a seat's filing
// opens, the members each party would ask are followed as play follows the
// people around the player (in its circle, watched by the director), so an
// ask is a kept record in a life the director watches.
//
// Drawn (CTO, Nov 17: tests draw their place; it was pinned to
// Breathedsville, Maryland): up to four places drawn from all 56, each played
// until a party has asked and a yes has been said, and named when no party
// asks anyone. A party asks only members who know its chair, and the chair
// opens knowing the members who come to its meetings
// (parties-opening-chair-knows-no-members). GOLDEN_PATH_SEED replays one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const OPENING = gameStartDate();
const MONTHS = 24;

interface Ask {
  readonly recordId: string;
  readonly date: string;
  readonly askedId: PersonId;
  readonly chairId: PersonId;
  readonly partyName: string;
  readonly contestId: string;
  readonly office: string;
}

function filingsOf(core: CoreState, contestId: string): FilingRow[] {
  return coreAPI(core)
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byContest", [contestId]) as unknown as FilingRow[];
}

it(`a party with no one filed for a seat asks a member to run, seed ${seed}`, () => {
  setBookkeeping(false);
  const told: string[] = [];
  const tried: string[] = [];
  let answered = "";
  try {
    for (let i = 0; i < DRAWS && !(told.length && answered); i += 1) {
      const place = drawPlace(`${seed}:${i}`, "party-recruit");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core, director } = buildBenchWorld(place.seed, OPENING, {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const asks: Ask[] = [];
      // Each ask as it is made, checked against the records of that day.
      api.subscribeEvents(
        "party-recruit-test",
        [PARTY_ASKED_EVENT],
        (_, event) => {
          const facts = event.facts as Record<string, string>;
          const ask: Ask = {
            recordId: event.id,
            date: event.date,
            askedId: facts.askedId as PersonId,
            chairId: facts.chairId as PersonId,
            partyName: facts.party!,
            contestId: facts.contestId!,
            office: facts.office!,
          };
          const said = `${where}: ${ask.recordId}`;
          const party = partiesHere(api).find(
            (row) => row.id === facts.partyId,
          );
          expect(party?.leaderId, said).toBe(ask.chairId);
          expect(partyTie(api, ask.askedId)?.partyId, said).toBe(party?.id);
          expect(event.personIds, said).toEqual([ask.askedId, ask.chairId]);
          const contest = api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .get(ask.contestId) as unknown as ContestRow | undefined;
          expect(contest?.title, said).toBe(ask.office);
          expect(contest!.filingDeadline >= event.date, said).toBe(true);
          // Nobody was filed under the party's label for the seat.
          expect(
            filingsOf(core, ask.contestId).some(
              (row) =>
                row.party?.toLowerCase() === ask.partyName.toLowerCase() &&
                row.personId !== ask.askedId,
            ),
            said,
          ).toBe(false);
          asks.push(ask);
        },
      );
      const contests = () =>
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[];
      const end = addDays(makeIsoDate(core.date), MONTHS * 30);
      const watched = new Set<string>();
      // The day each member's last ask staged its scene: the same scene is
      // not staged again for them within the month.
      const staged = new Map<string, string>();
      let checked = 0;
      while (core.date < end && !(told.length && answered)) {
        // Follow every party member, the day before a seat's filing opens;
        // else play on a month. partyProspects cannot name them that day: a
        // member is not yet eligible to file before the window opens.
        const tomorrow = addDays(makeIsoDate(core.date), 1);
        if (
          contests().some(
            (contest) => filingWindowOpens(api, contest) === tomorrow,
          )
        )
          for (const person of core.people.values())
            if (person.alive && partyTie(api, person.id)?.tie === "party") {
              core.focusPersonIds.add(person.id);
              director.watch(core, person.id);
              watched.add(person.id);
            }
        const next = contests()
          .map((contest) =>
            addDays(makeIsoDate(filingWindowOpens(api, contest)), -1),
          )
          .filter((date) => date > core.date)
          .sort()[0];
        const month = addDays(makeIsoDate(core.date), 30);
        advanceCore(core, next && next < month ? next : month);
        for (; checked < asks.length; checked += 1) {
          const ask = asks[checked]!;
          const said = `${where}: ${ask.recordId}`;
          // The one asked weighed running with the ask as a reason, citing it.
          const decision = decisionOf(api, ask.contestId, ask.askedId);
          expect(decision?.reasons.partyAsked, said).toBeGreaterThan(0);
          expect(decision?.sourceIds, said).toContain(ask.recordId);
          if (decision?.run) {
            const filing = filingsOf(core, ask.contestId).find(
              (row) => row.personId === ask.askedId,
            );
            expect(filing?.party?.toLowerCase(), said).toBe(
              ask.partyName.toLowerCase(),
            );
          }
          // The ask stages its scene for a member who was followed, at home
          // the day it is made, and stops that day as their own filing would;
          // the chair asks for the seat.
          if (!watched.has(ask.askedId)) continue;
          const book = director.ledger.people.get(ask.askedId);
          const entry = book?.schedule.find(
            (row) =>
              book.momentsById.get(row.momentId)?.causeId === ask.recordId &&
              row.bindings.some(
                (binding) => binding.typeKey === "party-recruit",
              ),
          );
          const last = staged.get(ask.askedId);
          if (!entry && last && addDays(makeIsoDate(last), 30) > ask.date)
            continue;
          expect(entry, `no scene for the ask: ${said}`).toBeDefined();
          expect(entry!.outcome, said).toBe("scene-now");
          staged.set(ask.askedId, ask.date);
          const result = purposeScene(core, director, ask.askedId, entry!, {
            typeKey: "party-recruit",
          });
          expect(result?.kind, said).toBe("composed");
          if (result?.kind !== "composed") continue;
          const { talk } = result.scene;
          expect(talk.askerId, said).toBe(ask.chairId);
          expect(result.scene.cause.id, said).toBe(ask.recordId);
          // A single office is said by its title in lower case (seat-said).
          expect(talk.state.text.toLowerCase(), said).toContain(
            ask.office.toLowerCase(),
          );
          expectUpToFourDifferent(
            talk.tree.replies.map((reply) => reply.line),
            said,
          );
          told.push(
            `${said} (${ask.partyName}, ${decision?.run ? "ran" : "stayed out"}): "${talk.state.text}" / ${talk.tree.replies.map((reply) => `"${reply.line.text}"`).join(", ")}`,
          );
          // A yes said in the scene is the decision to run, and the filing
          // follows, for someone who had stayed out.
          if (answered || decision?.run) continue;
          const yes = talk.tree.replies.findIndex(
            (reply) => reply.line.move === "agree",
          );
          expect(yes, said).toBeGreaterThanOrEqual(0);
          const replyId = replyInScene(core, director, ask.askedId, entry!, [
            yes,
          ]);
          expect(replyId, said).toBeTruthy();
          const after = decisionOf(api, ask.contestId, ask.askedId);
          expect(after?.run, said).toBe(true);
          expect(after?.sourceIds, said).toEqual(
            expect.arrayContaining([ask.recordId, replyId]),
          );
          const filing = filingsOf(core, ask.contestId).find(
            (row) => row.personId === ask.askedId,
          );
          expect(filing?.party?.toLowerCase(), said).toBe(
            ask.partyName.toLowerCase(),
          );
          answered = `${said}: "${talk.tree.replies[yes]!.line.text}" (${replyId}) filed ${filing!.id}`;
        }
      }
      if (!told.length)
        tried.push(`${where}: no party asked anyone in ${MONTHS} months`);
    }
    expect(told.length, tried.join("; ")).toBeGreaterThan(0);
    expect(
      answered,
      `no one asked had stayed out; ${tried.join("; ")}`,
    ).not.toBe("");
    console.log(`PARTY ASKS\n${told.join("\n")}\nANSWERED\n${answered}`);
  } finally {
    setBookkeeping(true);
  }
}, 1_200_000);
