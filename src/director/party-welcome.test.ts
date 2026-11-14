import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { joinParty, partiesHere, partyTie } from "../core2/modules/parties";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// Joining a party plays a welcome at the party's office with its leader
// (pool item play-party-joined-scene-at-the-office): the party-joined record stages
// the `party-welcome` scene, it is worded, and a reply writes a record.
// Pinned to the drawn places named below (fixed seed and tags).
const SEED = "c29-party-welcome";
const TAGS = ["a", "c", "d", "e"];

it.each(TAGS)(
  "joining a party plays the leader's welcome (%s)",
  (tag) => {
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
      `PARTY WELCOME ${where}: ${party!.name}\n${talk.narration.map((l) => `Narrator: ${l.text}`).join("\n")}\nleader: ${talk.state.text}\n${talk.tree.replies.map((r) => `  [${r.line.move}] ${r.line.text}`).join("\n")}\nreply record ${replyId}\n`,
    );
  },
  600_000,
);
