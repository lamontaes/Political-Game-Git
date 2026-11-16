/**
 * Dev mode's "Who is named" trace (dev-views/who-named.ts; owner, Nov 16: what a session traces by
 * script, dev mode shows in the game) says, through the bench's own request handler, what the
 * narration says and why: the swearing-in's clerk named with "the city clerk" and the records it
 * came from, and the colleagues the player has sat with named alone with the met record. Pinned:
 * Hardinsburg, KY, drawn from seed 4276344481a2b078e70633cfee47d0caccb65f74:2, the player sworn
 * into a council seat the way a count seats a winner (`seatWinner`), as who-they-are.test.ts does.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
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
import { seatWinner, townSeats } from "../core2/modules/offices";
import type { PersonId } from "../core2/types";
import { relationFacts } from "../director/relation-facts";
import { composeScene } from "../director/scene";
import { handleDev } from "./dev-api";
import { buildBenchWorld } from "./world";

const SEED = "4276344481a2b078e70633cfee47d0caccb65f74:2";

interface Row {
  personId: string;
  name: string;
  said: string | null;
  kind: string | null;
  recordIds: string[];
  alone: string | null;
  metBy: string | null;
  metSource: { id: string; date: string } | null;
}

it(`dev mode's Who is named says the clerk's post and the colleagues' met record (Hardinsburg, Kentucky, seed ${SEED})`, async () => {
  setBookkeeping(false);
  const place = drawPlace(SEED, "who-they-are");
  const where = `${place.name} (${place.key}), seed ${SEED}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
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
    resultId: contest?.id ?? `who-named:${found.seat.id}`,
    title: found.office.title,
    winnerId: playerId,
    news: true,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 1));

  let answer: { status: number; value: unknown } | undefined;
  const handled = await handleDev(
    { method: "GET" } as IncomingMessage,
    new URL("http://bench/api/dev/who-named"),
    (status, value) => (answer = { status, value }),
    () => ({ core, director, placeId: world.placeId }),
  );
  expect(handled, `${where}: who-named was not handled`).toBe(true);
  expect(answer?.status, where).toBe(200);
  const { scenes } = answer!.value as {
    scenes: { momentId: string; typeKey: string; cast: Row[] }[];
  };
  const scene = scenes.find((row) => row.typeKey === "swearing-in");
  expect(scene, `${where}: no swearing-in listed`).toBeTruthy();

  // The clerk: what the trace says is what the narration says after the full name.
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find((row) => row.momentId === scene!.momentId)!;
  const binding = entry.bindings.find((row) => row.typeKey === "swearing-in")!;
  const [officiant] = binding.roles.find((row) => row.role === "officiant")!
    .personIds as PersonId[];
  const clerk = scene!.cast.find((row) => row.personId === officiant)!;
  expect(clerk, `${where}: the clerk is not in the trace`).toBeTruthy();
  expect(clerk.said, where).toBe("the city clerk");
  expect(clerk.kind, where).toBe("office");
  expect(clerk.alone, where).toBeNull();
  expect(clerk.recordIds.length, `${where}: no records`).toBeGreaterThan(0);
  const text = composeScene(core, director, playerId, entry)!
    .narration.map((line) => line.text)
    .join(" ");
  expect(text, where).toContain(`${clerk.name}, ${clerk.said}`);

  // The colleagues the player has met are named alone, with the arm and record that met them.
  const colleagues =
    binding.roles.find((row) => row.role === "colleagues")?.personIds ?? [];
  const met = colleagues.filter(
    (id) => relationFacts(core, id, playerId).metBefore,
  );
  expect(met.length, `${where}: no colleague met`).toBeGreaterThan(0);
  for (const id of met) {
    const row = scene!.cast.find((r) => r.personId === id)!;
    const facts = relationFacts(core, id, playerId);
    expect(row.alone, `${where}: ${id}`).toBe("met");
    expect(row.said, `${where}: ${id}`).toBeNull();
    expect(row.metBy, `${where}: ${id}`).toBe(facts.metBy);
    expect(row.metBy, `${where}: ${id}`).not.toBeNull();
  }
}, 45_000);
