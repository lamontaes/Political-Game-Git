import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { joinParty, partiesHere, partyTie } from "../core2/modules/parties";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
} from "../core2/modules/elections";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// Joining a party plays a welcome at the party's office with its leader
// (pool item play-party-joined-scene-at-the-office): the party-joined record stages
// the `party-welcome` scene, it is worded, and a reply writes a record.
// Pinned to the drawn places named below (fixed seed and tags).
const SEED = "c29-party-welcome";
const TAGS = ["a", "c", "d", "e"];
const RACE_TAG = "a";

function welcome(tag: string, withRace: boolean) {
  {
    setBookkeeping(false);
    const place = drawPlace(SEED, `party-welcome:${tag}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    // A leader who lives in the player's own house does not come to the
    // party office to welcome them, so the party is one whose leader lives apart.
    const home = new Set(
      core.households.get(core.people.get(playerId)!.householdId)?.memberIds,
    );
    const party = partiesHere(api).find(
      (row) => row.leaderId && !home.has(row.leaderId),
    );
    expect(party, `${where}: a party with a leader`).toBeTruthy();
    core.focusPersonIds.add(playerId);
    director.watch(core, playerId);
    let raceTitle = "";
    if (withRace) {
      // Stage one local race through the game's own filing path: the first
      // local contest to open, a resident of the party filing for it under
      // the party's name, before the player joins.
      const contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .filter(
          (row) =>
            ["city", "township", "county"].includes(row.level) &&
            row.filingOpens &&
            row.filingOpens >= core.date,
        )
        .sort((a, b) => a.filingOpens!.localeCompare(b.filingOpens!))[0];
      expect(contest, `${where}: a local contest to stage`).toBeDefined();
      advanceToRaceFiling(core, contest!);
      raceTitle = contest!.title.toLowerCase();
      const filer = [...core.people.values()].find(
        (row) =>
          row.alive &&
          row.id !== playerId &&
          row.placeId === core.people.get(playerId)!.placeId &&
          row.id !== party!.leaderId &&
          fileCandidacy(api, {
            personId: row.id,
            contestId: contest!.id,
            platform: [],
            party: party!.name,
          }).status !== "refused",
      );
      expect(filer, `${where}: a resident filed for it`).toBeDefined();
    }
    // Not on the opening day, which can hold a scene of its own already.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    joinParty(api, playerId, party!.id);
    expect(partyTie(api, playerId)?.partyId, where).toBe(party!.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const book = director.ledger.people.get(playerId)!;
    const entry = book.schedule.find((row) =>
      row.bindings.some((binding) => binding.typeKey === "party-welcome"),
    );
    expect(
      entry,
      `${where}: no welcome staged: ${JSON.stringify(book.schedule.filter((row) => row.momentId.includes("party-joined")).map((row) => ({ at: row.date, outcome: row.outcome, bindings: row.bindings.length })))}`,
    ).toBeDefined();
    const result = purposeScene(core, director, playerId, entry!, {
      typeKey: "party-welcome",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") return;
    const { talk } = result.scene;
    expect(talk.askerId, where).toBe(party!.leaderId);
    expect(result.scene.cause.id, where).toContain("party-joined:");
    expect(talk.narration.length, where).toBeGreaterThan(0);
    expect(talk.tree.replies.length, where).toBeGreaterThanOrEqual(2);
    // Each answer the player can give is met with the leader's own line; the
    // question is answered from what the party holds or runs here.
    const ask = talk.tree.replies.findIndex(
      (reply) => reply.line.move === "ask",
    );
    expect(ask, `${where}: a question is offered`).toBeGreaterThanOrEqual(0);
    for (const reply of talk.tree.replies)
      expect(
        reply.next?.lines.length,
        `${where}: the leader answers "${reply.line.text}"`,
      ).toBeGreaterThan(0);
    const answer = talk.tree.replies[ask]!.next!.lines[0]!.text;
    // Where the town's own government is filed at the state level (DC), the
    // party that holds its mayor's office says it holds a seat.
    if (place.name.startsWith("Washington") && !withRace)
      expect(answer, `${where}: the party holds the mayor's seat`).not.toMatch(
        /hold a seat here|hold anything/,
      );
    expect(answer, `${where}: no unfilled slot`).not.toMatch(/[{}]/);
    // The party's candidate is on the ballot, and the leader answers from the
    // race or from a seat the party holds (both are in the record).
    if (withRace)
      expect(answer, `${where}: the answer reads the record`).toMatch(
        new RegExp(`${raceTitle}|a seat on|'s office`),
      );
    const yes = talk.tree.replies.findIndex(
      (reply) => reply.line.move === "agree" || reply.line.move === "promise",
    );
    expect(yes, where).toBeGreaterThanOrEqual(0);
    const replyId = replyInScene(core, director, playerId, entry!, [yes], {
      typeKey: "party-welcome",
    });
    expect(replyId, where).toBeTruthy();
    expect(core.eventIds.has(replyId!), where).toBe(true);
    process.stdout.write(
      `PARTY WELCOME ${where}: ${party!.name}\n${talk.narration.map((l) => `Narrator: ${l.text}`).join("\n")}\nleader: ${talk.state.text}\n${talk.tree.replies.map((r) => `  [${r.line.move}] ${r.line.text}\n      leader: ${r.next?.lines.map((l) => l.text).join(" / ")}`).join("\n")}\nreply record ${replyId}\n`,
    );
  }
}

it.each(TAGS)(
  "joining a party plays the leader's welcome (%s)",
  (tag) => welcome(tag, false),
  600_000,
);

// A party with a candidate in a local race says so: the race is staged through
// the game's own filing at a named place and fixed seed.
it(
  "the leader points to the party's candidate in a local race",
  () => welcome(RACE_TAG, true),
  600_000,
);
