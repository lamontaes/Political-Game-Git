import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  CAMPAIGNS_MODULE_ID,
  ENDORSEMENT_ASKED_EVENT,
  endorsementsOf,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { filingClerkFor } from "../core2/modules/filing-clerk";
import { lawChain } from "../core2/modules/laws";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";

// A candidate's campaign asks the people closest to them for an endorsement
// each turn; the player was skipped. Now the player is asked in a scene
// (endorsement-ask), the endorsement row says "asked" until their reply, and
// the reply writes the yes or the no.
// Pinned (owner ruling: a test names its place and world seed from data, and
// never draws at run time): Loving, New Mexico (3544420), the seed the
// carried donor-ask test names.
const PLACE = {
  key: "3544420",
  name: "Loving, New Mexico",
  seed: "d1ef254b96157871fa107765d9300048c2d5d9e252b59d2ae19b810ed8cc83be",
};
const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;

function world() {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(PLACE.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE.key,
  });
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  const open = () =>
    [...openContests(api)].sort(
      (a, b) =>
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    );
  for (let day = 0; !open().length && day < 365; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const race = open()[0] as ContestRow | undefined;
  const clerkId = race ? filingClerkFor(api, race.id)?.personId : undefined;
  const town = lawChain(api).townPlaceId;
  // The first adult the player knows (their circle, by id) who files.
  const circle = [...new Set([...player.familyIds, ...player.knownIds])]
    .sort()
    .map((id) => core.people.get(id))
    .filter(
      (p) =>
        p &&
        p.alive &&
        p.id !== clerkId &&
        p.placeId === town &&
        ageOnDate(p.birthDate, core.date) >= 18,
    );
  const candidate = race
    ? circle.find((p) =>
        ["petitioning", "on-ballot"].includes(
          fileCandidacy(api, {
            personId: p!.id,
            contestId: race.id,
            platform: [],
          }).status ?? "",
        ),
      )
    : undefined;
  if (!race || !candidate)
    throw new Error(`${where}: no one the player knows filed for a race`);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((row) => row.personId === candidate.id)!;
  return { core, director, api, race, filing, candidate, playerId };
}

it(`a candidate's campaign asks the player to endorse, and the reply writes the row (${PLACE.name})`, () => {
  const { core, director, api, race, filing, candidate, playerId } = world();
  const rowId = `endorsement:${filing.id}:${playerId}`;
  // Campaign days pass until the candidate's turn has asked the player.
  for (
    let day = 0;
    day < 60 &&
    !endorsementsOf(api, filing.id).some((row) => row.speakerId === playerId);
    day += 1
  )
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const row = endorsementsOf(api, filing.id).find(
    (r) => r.speakerId === playerId,
  );
  expect(
    row,
    `${where}: the player was never asked (${filing.id})`,
  ).toBeTruthy();
  expect(row!.id).toBe(rowId);
  expect(row!.answer).toBe("asked");
  expect(row!.askerId).toBe(candidate.id);
  const asked = [...core.durableLog.values()].find(
    (r) =>
      r.kind === ENDORSEMENT_ASKED_EVENT && r.facts?.endorsementId === rowId,
  );
  expect(asked, `${where}: no endorsement-asked record`).toBeTruthy();
  expect(asked!.personIds).toEqual([candidate.id, playerId]);
  // Nobody answered for the player: no yes is public.
  expect(
    [...core.durableLog.values()].some(
      (r) => r.kind === "campaign-endorsed" && r.facts?.speakerId === playerId,
    ),
  ).toBe(false);

  // The scene: the candidate comes to the player; the player's yes endorses.
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (e) => book.momentsById.get(e.momentId)?.causeId === asked!.id,
  );
  expect(entry, `${where}: no scene staged from ${asked!.id}`).toBeTruthy();
  expect(entry!.bindings.some((b) => b.typeKey === "endorsement-ask")).toBe(
    true,
  );
  const result = purposeScene(core, director, playerId, entry!, {
    typeKey: "endorsement-ask",
  });
  expect(result?.kind, JSON.stringify(result)).toBe("composed");
  if (result?.kind !== "composed") return;
  const moves = result.scene.talk.tree.replies.map((r) => r.line.move);
  console.log(
    `ENDORSEMENT ASK ${where}: "${result.scene.talk.state.text}" replies ${moves.join(", ")}`,
  );
  expect(moves).toContain("agree");
  expect(moves).toContain("decline");
  expect(moves).toContain("stall");
  const reply = replyInScene(
    core,
    director,
    playerId,
    entry!,
    [moves.indexOf("agree")],
    { typeKey: "endorsement-ask" },
  );
  expect(reply, `${where}: the yes wrote no reply record`).toBeTruthy();
  const after = endorsementsOf(api, filing.id).find(
    (r) => r.speakerId === playerId,
  )!;
  expect(after.answer).toBe("yes");
  expect(
    [...core.durableLog.values()].some(
      (r) => r.kind === "campaign-endorsed" && r.facts?.endorsementId === rowId,
    ),
  ).toBe(true);
  void CAMPAIGNS_MODULE_ID;
  void race;
}, 600_000);
