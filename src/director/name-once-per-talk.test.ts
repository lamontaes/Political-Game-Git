import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { ENCOUNTERS } from "../core2/encounters";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import {
  acceptJobOffer,
  JOBS_MODULE_ID,
  jobOffersFor,
} from "../core2/modules/jobs";
import { openConversation, say } from "./conversation";

// One rule for a name in a talk (rule 105; item
// words-one-rule-for-how-often-a-name-is-said-in-a-talk): the other person
// says the player's first name at most once in one talk, whichever bank the
// line comes from. Pinned place and seed: Kingston (place key 3238100), world
// seed "c1" (Account lead, Nov 15).
const PLACE_KEY = "3238100";
const SEED = "c1";

it("the other person says the player's name once in a talk (Kingston, seed c1)", () => {
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(SEED, "2025-01-20", {
    twoLevel: true,
    placeKey: PLACE_KEY,
  });
  const me = playerId as PersonId;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  // The player holds a job, so the other person can ask and give back their
  // own work (the jobs module's staged offer, accepted through its own call).
  const api = coreAPI(core);
  const positions = api.moduleState(JOBS_MODULE_ID).table("positions");
  const open = (
    positions.rows() as {
      id: string;
      status: string;
      organizationId: string;
      title: string;
      hourlyMinor: number;
    }[]
  ).find((row) => row.status === "open");
  if (open) {
    const id = `job-offer:${open.id}:${me}`;
    positions.put({ ...open, offeredTo: me, offerId: id } as never);
    api
      .moduleState(JOBS_MODULE_ID)
      .table("offers")
      .put({
        id,
        personId: me,
        positionId: open.id,
        organizationId: open.organizationId,
        offeredBy: me,
        title: open.title,
        hourlyMinor: open.hourlyMinor,
        fit: 1,
        offeredAt: core.date,
        deadline: core.date,
        status: "pending",
      } as never);
    for (const offer of jobOffersFor(api, me))
      if (offer.status === "pending") acceptJobOffer(api, offer.id);
  }
  const mine = core.people.get(me)!.householdId;
  const others = [...core.people.values()]
    .filter(
      (row) => row.alive && row.tier !== "husk" && row.householdId !== mine,
    )
    .slice(0, 150);
  for (const other of others)
    coreAPI(core).meet(me, other.id as PersonId, {
      placeId: other.householdId,
      sourceId: `name-once:${other.id}`,
      cause: ENCOUNTERS.causes.metOnVisit,
      hours: 2,
    });
  advanceCore(core, addDays(makeIsoDate(core.date), 4));
  const name = new RegExp(`\\b${core.people.get(me)!.givenName}\\b`, "i");
  let talks = 0;
  const twice: string[] = [];
  for (const other of others) {
    const talk = openConversation(core, me, other.id as PersonId, {
      director,
      minuteOfDay: 11 * 60,
    });
    for (let turn = 0; turn < 14 && talk.choices.length; turn += 1)
      say(
        core,
        talk,
        talk.choices[(turn + others.indexOf(other)) % talk.choices.length]!.key,
      );
    const theirs = talk.lines.filter(
      (line) => line.speakerId === other.id && name.test(line.text),
    );
    talks += 1;
    if (theirs.length > 1)
      twice.push(theirs.map((line) => line.text).join(" | "));
  }
  expect(talks).toBeGreaterThan(0);
  expect(twice).toEqual([]);
}, 120_000);
