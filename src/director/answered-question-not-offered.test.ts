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

// One rule for a question the talk already answered (item
// words-everyday-talk-asks-the-same-question): a reply that asks for what an
// earlier line already said, by either of them, is not offered ("... 18
// years now." then "How many years have you put in there?"). Pinned place and
// seed: Onton (place key 2158116), world seed "c2" (Account lead, Nov 15).
const PLACE_KEY = "2158116";
const SEED = "c2";
const SAID_YEARS = /\b\d+ years?\b/i;
const ASKS_YEARS = /\b(?:how many years|how long)\b/i;
// Where they work told a second time, with the name stood in by "work".
const TOLD_TWICE =
  /\b(?:work(?:s|ing)? (?:over at |at |for |with )|I'm (?:over at |at |with )|^At )work\b/i;

it("a question whose answer the talk already said is not offered (Onton, seed c2)", () => {
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
  let said = 0;
  const asked: string[] = [];
  const twice: string[] = [];
  for (const other of others) {
    const talk = openConversation(core, me, other.id as PersonId, {
      director,
      minuteOfDay: 11 * 60,
    });
    for (let turn = 0; turn < 14 && talk.choices.length; turn += 1) {
      if (talk.lines.some((line) => SAID_YEARS.test(line.text))) {
        said += 1;
        for (const choice of talk.choices)
          if (ASKS_YEARS.test(choice.text)) asked.push(choice.text);
      }
      for (const line of talk.lines)
        if (line.speakerId === other.id && TOLD_TWICE.test(line.text))
          twice.push(line.text);
      say(
        core,
        talk,
        talk.choices[(turn + others.indexOf(other)) % talk.choices.length]!.key,
      );
    }
  }
  expect(said, "turns after the years were said").toBeGreaterThan(0);
  expect(asked).toEqual([]);
  expect(twice).toEqual([]);
}, 120_000);
