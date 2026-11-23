import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billStage, chooseOwnVote } from "./bill-stage";
import { DevMode } from "./dev-mode";
import { seatView } from "./legislature";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEGISLATURE_MODULE_ID, votesOn } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";

// Dev mode's Hold the vote never overwrites a vote the player pressed
// (Account lead, Nov 16: "dev mode must not overwrite a press the player
// made; it is a dev fault, still a fault"). The player chooses No on a
// colleague's bill with their own press (bill-stage.ts chooseOwnVote), then
// the dev card's Hold the vote runs the floor at its first margin, "Passes by
// 5" (dev-bill-card.mjs `decide({})`, DevMode.decideAt): the roll keeps the
// player's No and the other members fill the margin. Pinned where
// press-comment-after-vote.test.ts pins the colleague's no: Island Pond,
// Vermont (5035725), seed pr-44:0.
const SEED = "pr-44:0";
const KEY = "5035725";
const BILL_DAYS = 60;
const MARGIN = 5;

it(`dev mode's Hold the vote keeps the player's own No (${KEY}, seed ${SEED})`, () => {
  const place = drawPlace(SEED, "press-comment-context");
  expect(place.key).toBe(KEY);
  setBookkeeping(false);
  const { core, director, placeId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0)!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const body = seatView(core, me).bodies[0]!;
  const api = coreAPI(core);
  const bills = () =>
    api.moduleState(LEGISLATURE_MODULE_ID).table("bills").rows() as unknown as {
      id: string;
      sponsorId: string;
      bodyOfficeId: string;
    }[];
  let bill: { id: string } | undefined;
  for (let day = 0; day < BILL_DAYS && !bill; day++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    bill = bills().find(
      (row) =>
        row.bodyOfficeId === body.officeId &&
        row.sponsorId !== me &&
        billStage(core, row.id, me).yours.mayChoose,
    );
  }
  expect(
    bill,
    "a colleague's bill comes up for the player's vote",
  ).toBeTruthy();
  chooseOwnVote(core, bill!.id, "no", me);

  const dev = new DevMode(
    core,
    director,
    new BenchPlayer(core, director),
    placeId,
  );
  const { tallies } = dev.decideAt(bill!.id, MARGIN);
  const roll = votesOn(api, bill!.id) as readonly {
    memberId: string;
    vote: string;
    override?: boolean;
  }[];
  const mine = roll.find((row) => row.memberId === me && !row.override);
  process.stdout.write(
    `DEV HOLD ${place.name} (${place.key}), ${bill!.id}: ${roll
      .map((row) => `${row.memberId}=${row.vote}`)
      .join(", ")}; tallies ${JSON.stringify(tallies)}\n`,
  );
  expect(mine?.vote, "the player's own No stands").toBe("no");
  // The others fill the margin around it: every other member votes yes,
  // as far toward "passes by 5" as the board's seats allow.
  for (const row of roll)
    if (row.memberId !== me && !row.override) expect(row.vote).toBe("yes");
  expect(tallies[0]!.no).toBe(1);
}, 40_000);
