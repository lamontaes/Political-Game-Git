/**
 * The narrator says who a person is the first time it names someone the
 * player has not met (owner, Nov 15, rule 136), from the one reader
 * (`whatTheyAre`), worded by the said-as reader. Pinned: Hardinsburg, KY,
 * drawn from seed 4276344481a2b078e70633cfee47d0caccb65f74:2, the player
 * sworn into a council seat the way a count seats a winner (`seatWinner`).
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import {
  seatWinner,
  servingTermsOf,
  townSeats,
} from "../core2/modules/offices";
import type { PersonId } from "../core2/types";
import { renderLine } from "../english/bank-line";
import { whatSaid } from "../english/said-as";
import { relationFacts } from "./relation-facts";
import { composeScene } from "./scene";
import type { ScheduleEntry } from "./scheduling";
import { whatTheyAre } from "./who-they-are";

const SEED = "4276344481a2b078e70633cfee47d0caccb65f74:2";

it("a name set off by the line itself or made possessive takes no appositive, and a closing comma never stands before the sentence's mark", () => {
  const facts = {
    name: {
      text: "Jose Salgado, the town clerk,",
      bare: "Jose Salgado",
      sourceRecordIds: ["person_a"],
    },
  };
  const say = (text: string) =>
    renderLine({
      seed: "s",
      surface: "scene",
      holderId: "person_b",
      bankKey: "test",
      version: "1",
      variants: [{ key: "v", text }],
      facts,
      momentKey: text,
      fallbackSourceId: "person_a",
    })?.text;
  expect(say("{{name}} is waiting downtown.")).toBe(
    "Jose Salgado, the town clerk, is waiting downtown.",
  );
  expect(say("You meet {{name}}.")).toBe(
    "You meet Jose Salgado, the town clerk.",
  );
  expect(say("Your phone lights up with {{name}}'s name.")).toBe(
    "Your phone lights up with Jose Salgado's name.",
  );
  expect(say("{{name}}, the police chief, asks for ten minutes.")).toBe(
    "Jose Salgado, the police chief, asks for ten minutes.",
  );
});

it(`the swearing-in names the clerk with what they are, once (Hardinsburg, Kentucky, seed ${SEED})`, () => {
  setBookkeeping(false);
  const place = drawPlace(SEED, "who-they-are");
  const where = `${place.name} (${place.key}), seed ${SEED}`;
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const found = townSeats(api).find((row) => row.office.kind === "council")!;
  expect(found, where).toBeTruthy();
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((row) => row.seatId === found.seat.id)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  const playerId = core.playerId!;
  const player = core.people.get(playerId)!;
  director.watch(core, playerId);
  seatWinner(api, {
    seatId: found.seat.id,
    officeId: found.office.id,
    personId: playerId,
    identity: {
      givenName: player.givenName,
      familyName: player.familyName,
      gender: "recorded",
      birthDate: player.birthDate,
      homeState: place.state,
    },
    party: null,
    endDate: null,
    reached: `elected ${core.date}`,
    resultId: contest?.id ?? `who-they-are:${found.seat.id}`,
    title: found.office.title,
    winnerId: playerId,
    news: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (row) =>
      book.momentsById.get(row.momentId)?.label === "cause:event:took-office",
  );
  expect(entry, where).toBeTruthy();
  const binding = entry!.bindings.find((row) => row.typeKey === "swearing-in")!;
  const [officiant] = binding.roles.find((row) => row.role === "officiant")!
    .personIds as PersonId[];
  const clerk = core.people.get(officiant!)!;

  // The clerk is two things on record: the city clerk (an appointed post) and
  // someone who lives in the town the player's new seat covers. What matters
  // in the scene is the post, so the post is said.
  expect(clerk.placeId, where).toBe(player.placeId);
  expect(
    servingTermsOf(api, playerId).some((term) => term.seatId === found.seat.id),
    where,
  ).toBe(true);
  const what = whatTheyAre(core, playerId, officiant!)!;
  expect(what.kind, where).toBe("office");
  const said = whatSaid(what)!;
  expect(said, where).toBe("the city clerk");

  // The narration says it after the full name, once, set off by commas.
  const scene = composeScene(core, director, playerId, entry as ScheduleEntry)!;
  const text = scene.narration.map((line) => line.text).join(" ");
  const full = `${clerk.givenName} ${clerk.familyName}, ${said}`;
  expect(text, where).toContain(full);
  expect(text.split(said).length - 1, where).toBe(1);
  expect(text, where).not.toMatch(/,\s*[.!?]/);

  // Family and the people the player has met get nothing: the name says enough.
  for (const id of core.households.get(player.householdId)?.memberIds ?? [])
    if (id !== playerId)
      expect(whatTheyAre(core, playerId, id), `${where}: ${id}`).toBeNull();
  for (const id of binding.roles.find((row) => row.role === "colleagues")
    ?.personIds ?? [])
    if (relationFacts(core, id, playerId).metBefore)
      expect(whatTheyAre(core, playerId, id), `${where}: ${id}`).toBeNull();
}, 45_000);
